/**
 * Import Service
 * Handles CSV-based migrations from Gumroad, Mailchimp, ConvertKit, etc.
 */

const crypto = require('crypto');

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of objects using the header row as keys.
 * Handles quoted fields with embedded commas and newlines.
 */
function parseCsv(content) {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rows = splitCsvRows(lines);
    if (rows.length === 0) return [];

    const headers = parseRow(rows[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const result = [];

    for (let i = 1; i < rows.length; i++) {
        const raw = rows[i].trim();
        if (!raw) continue;
        const values = parseRow(raw);
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = (values[idx] || '').trim();
        });
        result.push(obj);
    }

    return result;
}

/**
 * Split CSV content into rows, respecting quoted fields that may contain newlines.
 */
function splitCsvRows(content) {
    const rows = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        if (ch === '"') {
            if (inQuotes && content[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
                current += ch;
            }
        } else if (ch === '\n' && !inQuotes) {
            rows.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) rows.push(current);
    return rows;
}

/**
 * Parse a single CSV row into an array of field values, handling quoted fields.
 */
function parseRow(row) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current);
    return fields;
}

// ─── Email validation ─────────────────────────────────────────────────────────

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Slug generation ──────────────────────────────────────────────────────────

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

// ─── Gumroad CSV Import ───────────────────────────────────────────────────────

/**
 * Parse a Gumroad products CSV export and convert to OpenBazaar catalog format.
 *
 * Gumroad CSV columns (typical export):
 *   name, description, price, url, custom_permalink, published,
 *   tags, sales_count, revenue, currency, ...
 *
 * Price: Gumroad stores in cents (integer). "Pay what you want" rows may have
 * a price of "0" or "+". We default PWYW to 0 and mark as flexible.
 *
 * @param {string} csvContent  - raw CSV string from Gumroad export
 * @param {string} brandId     - the brand slug (used to deduplicate ids)
 * @returns {{ products: object[], imported: number, skipped: number, errors: string[] }}
 */
function importGumroadCsv(csvContent, brandId) {
    const rows = parseCsv(csvContent);
    const products = [];
    const errors = [];
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // 1-based, +1 for header

        // Resolve name from common column variants
        const name = (row.name || row.product_name || row.title || '').trim();
        if (!name) {
            errors.push(`Row ${rowNum}: missing name — skipped`);
            skipped++;
            continue;
        }

        // Resolve price
        const rawPrice = (row.price || '0').replace(/[^0-9.+]/g, '');
        let priceDollars;
        let isFlexible = false;

        if (!rawPrice || rawPrice === '+') {
            // Pay what you want
            isFlexible = true;
            priceDollars = 0;
        } else {
            const parsed = parseFloat(rawPrice);
            if (isNaN(parsed)) {
                errors.push(`Row ${rowNum}: invalid price "${row.price}" — skipped`);
                skipped++;
                continue;
            }
            // Gumroad exports price in cents when > 100 and looks like an integer,
            // or in dollars when it has a decimal. Heuristic: if no decimal and > 100 => cents.
            if (!String(rawPrice).includes('.') && parsed > 100) {
                priceDollars = parsed / 100;
            } else {
                priceDollars = parsed;
            }
        }

        const description = (row.description || row.product_description || '').trim();
        const published = (row.published || 'true').toLowerCase();
        const isPublished = published === 'true' || published === '1' || published === 'yes';

        const id = slugify(name) || `product-${crypto.randomBytes(4).toString('hex')}`;

        const product = {
            id,
            title: name,
            description,
            price: parseFloat(priceDollars.toFixed(2)),
            type: 'digital',
            published: isPublished,
            source: 'gumroad-import',
        };

        if (isFlexible) {
            product.flexible_pricing = true;
            product.min_price = 0;
        }

        if (row.url || row.product_url) {
            product.gumroad_url = (row.url || row.product_url).trim();
        }

        if (row.tags) {
            product.tags = row.tags.split(/[|,;]/).map(t => t.trim()).filter(Boolean);
        }

        products.push(product);
    }

    return {
        products,
        imported: products.length,
        skipped,
        errors,
    };
}

// ─── Email List CSV Import ────────────────────────────────────────────────────

/**
 * Parse and import an email list CSV into the subscribers table.
 *
 * Supported column names (case-insensitive, underscored):
 *   email, first_name, last_name, name, status, tags
 *
 * Compatible with Mailchimp ("Email Address", "First Name", "Last Name", "Status"),
 * ConvertKit ("Email", "First Name", ...) and generic CSVs.
 *
 * @param {string}   csvContent  - raw CSV
 * @param {object}   db          - sqlite3 db instance
 * @param {string}   [listName]  - optional label stored in source field
 * @returns {Promise<{ imported: number, skipped: number, duplicates: number, errors: string[] }>}
 */
async function importEmailListCsv(csvContent, db, listName) {
    const rows = parseCsv(csvContent);
    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors = [];

    const source = listName ? `csv-import:${listName}` : 'csv-import';

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;

        // Resolve email from common column name variants
        const email = (
            row.email ||
            row.email_address ||
            row['e-mail'] ||
            row['e-mail_address'] ||
            ''
        ).trim().toLowerCase();

        if (!email) {
            errors.push(`Row ${rowNum}: missing email — skipped`);
            skipped++;
            continue;
        }

        if (!isValidEmail(email)) {
            errors.push(`Row ${rowNum}: invalid email "${email}" — skipped`);
            skipped++;
            continue;
        }

        // Skip unsubscribed / bounced contacts
        const status = (row.status || row.subscription_status || 'active').toLowerCase();
        if (status === 'unsubscribed' || status === 'bounced' || status === 'complained' || status === 'cleaned') {
            skipped++;
            continue;
        }

        // Resolve name
        const firstName = (row.first_name || row.firstname || '').trim();
        const lastName = (row.last_name || row.lastname || '').trim();
        const fullName = (row.name || row.full_name || `${firstName} ${lastName}`).trim() || null;

        const unsubscribeToken = crypto.randomBytes(32).toString('hex');

        try {
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT OR IGNORE INTO subscribers
                     (email, name, source, status, confirmed, unsubscribe_token)
                     VALUES (?, ?, ?, 'active', 1, ?)`,
                    [email, fullName, source, unsubscribeToken],
                    function (err) {
                        if (err) return reject(err);
                        if (this.changes === 0) {
                            duplicates++;
                        } else {
                            imported++;
                        }
                        resolve();
                    }
                );
            });
        } catch (err) {
            errors.push(`Row ${rowNum}: DB error for "${email}" — ${err.message}`);
            skipped++;
        }
    }

    return { imported, skipped, duplicates, errors };
}

module.exports = {
    importGumroadCsv,
    importEmailListCsv,
};
