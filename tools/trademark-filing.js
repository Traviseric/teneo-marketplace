#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");

const COLORS = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

function color(text, tone) {
    const code = COLORS[tone] || "";
    return `${code}${text}${COLORS.reset}`;
}

function usage() {
    const command = `node tools/trademark-filing.js [options]

Options:
  --mark <id>         Mark id from legal/trademarks.registry.json
  --registry <path>   Registry file path (default: legal/trademarks.registry.json)
  --outdir <path>     Output folder root (default from registry, fallback legal/trademark-dossiers)
  --date <YYYY-MM-DD> Override packet date
  --report            Print docket report only (no files written)
  --dry-run           Validate and print what would be generated
  --help              Show this message

Examples:
  node tools/trademark-filing.js --mark openbazaar-ai-wordmark
  node tools/trademark-filing.js --report
`;
    process.stdout.write(command);
}

function parseArgs(argv) {
    const args = {
        mark: null,
        registry: "legal/trademarks.registry.json",
        outdir: null,
        date: null,
        report: false,
        dryRun: false,
        help: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === "--mark") {
            args.mark = argv[i + 1];
            i += 1;
        } else if (token === "--registry") {
            args.registry = argv[i + 1];
            i += 1;
        } else if (token === "--outdir") {
            args.outdir = argv[i + 1];
            i += 1;
        } else if (token === "--date") {
            args.date = argv[i + 1];
            i += 1;
        } else if (token === "--report") {
            args.report = true;
        } else if (token === "--dry-run") {
            args.dryRun = true;
        } else if (token === "--help" || token === "-h") {
            args.help = true;
        } else {
            throw new Error(`Unknown argument: ${token}`);
        }
    }

    return args;
}

function isDateLiteral(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toLocalDateStamp(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function addMonths(dateString, months) {
    if (!isDateLiteral(dateString)) {
        return null;
    }
    const [y, m, d] = dateString.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + months);
    return toLocalDateStamp(date);
}

function pick(obj, pointer, fallback = null) {
    const parts = pointer.split(".");
    let cursor = obj;
    for (const part of parts) {
        if (cursor == null || typeof cursor !== "object" || !(part in cursor)) {
            return fallback;
        }
        cursor = cursor[part];
    }
    return cursor == null ? fallback : cursor;
}

function valueIsMissing(value) {
    if (value == null) {
        return true;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" || /^todo$/i.test(trimmed) || /^tbd$/i.test(trimmed);
    }
    return false;
}

function requiredFieldPointers(mark) {
    const required = [
        "id",
        "brand",
        "mark_text",
        "mark_type",
        "owner.legal_name",
        "owner.entity_type",
        "owner.state_or_country",
        "owner.email",
        "owner.address_1",
        "owner.city",
        "owner.state",
        "owner.postal_code",
        "contacts.correspondence_email",
        "filing.basis",
        "filing.application_type"
    ];

    const classes = pick(mark, "filing.classes", []);
    if (Array.isArray(classes) && classes.length > 0) {
        classes.forEach((entry, idx) => {
            required.push(`filing.classes.${idx}.class_number`);
            required.push(`filing.classes.${idx}.goods_services`);
        });
    } else {
        required.push("filing.classes");
    }

    const basis = pick(mark, "filing.basis", "").toLowerCase();
    if (basis === "1(a)") {
        required.push("filing.first_use_anywhere");
        required.push("filing.first_use_in_commerce");
    }

    return required;
}

function validateMark(mark) {
    const missing = [];
    const required = requiredFieldPointers(mark);
    required.forEach((pointer) => {
        const value = pick(mark, pointer, null);
        if (valueIsMissing(value)) {
            missing.push(pointer);
        }
    });
    return missing;
}

function sanitizeName(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildTeasIntake(mark, dateStamp) {
    return {
        generated_at: new Date().toISOString(),
        packet_date: dateStamp,
        disclaimer: "Prepared for internal legal ops. Human legal review and manual TEAS submission are required.",
        mark: {
            id: mark.id,
            brand: mark.brand,
            text: mark.mark_text,
            type: mark.mark_type
        },
        owner: mark.owner,
        filing: mark.filing,
        correspondence: mark.contacts || {},
        evidence: mark.evidence || {},
        monitoring: mark.monitoring || {},
        status: mark.status || {}
    };
}

function buildGoodsServices(mark) {
    const classes = pick(mark, "filing.classes", []);
    const rows = classes.map((entry) => `## Class ${entry.class_number}\n${entry.goods_services}`);
    return `# Goods and Services Draft

Mark: ${mark.mark_text}
Jurisdiction: ${mark.jurisdiction || "US"}
Application Type: ${pick(mark, "filing.application_type", "TEAS Plus")}
Filing Basis: ${pick(mark, "filing.basis", "1(b)")}

${rows.join("\n\n")}

## Notes
- Keep wording aligned to USPTO ID Manual for TEAS Plus.
- Remove any service you are not using within 12 months.
- Confirm Class 36 only if you directly provide regulated payment services.
`;
}

function buildSubmissionChecklist(mark, missingFields) {
    const basis = pick(mark, "filing.basis", "1(b)");
    const items = [
        "[ ] Confirm owner legal entity and address are final.",
        "[ ] Confirm correspondence email used for all USPTO notices.",
        "[ ] Confirm goods/services text matches current product scope.",
        "[ ] Confirm class selection and government fees.",
        "[ ] Run knockout search for conflicting marks before filing.",
        "[ ] Legal review complete and approved.",
        "[ ] Submit in TEAS and store serial number in registry."
    ];

    if (basis.toLowerCase() === "1(a)") {
        items.push("[ ] Add verified dates of first use anywhere and in commerce.");
        items.push("[ ] Attach specimen showing mark in real commercial use.");
    } else {
        items.push("[ ] Confirm intent-to-use declaration is accurate.");
        items.push("[ ] Plan Statement of Use evidence capture workflow.");
    }

    const unresolved = missingFields.length === 0
        ? "- None."
        : missingFields.map((field) => `- [ ] ${field}`).join("\n");

    return `# Submission Checklist

Mark: ${mark.mark_text}
Target Filing Date: ${pick(mark, "status.target_filing_date", "Not set")}
Pipeline Stage: ${pick(mark, "status.pipeline_stage", "draft")}

## Filing Steps
${items.join("\n")}

## Missing Required Data
${unresolved}

## After Filing
- [ ] Save USPTO serial number in \`legal/trademarks.registry.json\`.
- [ ] Add office action and deadline dates as they arrive.
- [ ] Turn on watch alerts for confusingly similar marks/domains.
`;
}

function buildSpecimenChecklist(mark) {
    const basis = pick(mark, "filing.basis", "1(b)").toLowerCase();
    const evidencePaths = pick(mark, "evidence.specimen_paths", []);
    const evidenceLines = Array.isArray(evidencePaths) && evidencePaths.length > 0
        ? evidencePaths.map((entry) => `- ${entry}`).join("\n")
        : "- No evidence paths configured.";

    if (basis === "1(a)") {
        return `# Specimen Checklist

Filing Basis: 1(a) - Use in commerce

- [ ] Website screenshot showing the mark with a clear point of sale.
- [ ] Checkout or order form screenshot with the mark visible.
- [ ] Transaction evidence (invoice/receipt) proving interstate commerce.
- [ ] Date and URL metadata recorded for every screenshot.

## Existing Evidence Paths
${evidenceLines}
`;
    }

    return `# Specimen Checklist

Filing Basis: 1(b) - Intent to use

Specimen is not required at initial filing. Prepare now for Statement of Use:
- [ ] Dated website screenshot showing the mark with purchasing flow.
- [ ] Signed invoice or transaction receipt under the mark.
- [ ] Product/service page that ties the mark to listed classes.
- [ ] Archive source files and metadata in repository for legal records.

## Existing Evidence Paths
${evidenceLines}

## Statement of Use Trigger
- File Statement of Use within 6 months of Notice of Allowance.
- If needed, request extension every 6 months (up to 5 extensions).
`;
}

function buildDeadlineCalendar(mark) {
    const basis = pick(mark, "filing.basis", "1(b)").toLowerCase();
    const stage = pick(mark, "status.pipeline_stage", "draft");
    const targetFilingDate = pick(mark, "status.target_filing_date", null);
    const noaDate = pick(mark, "status.notice_of_allowance_date", null);
    const registrationDate = pick(mark, "status.registration_date", null);
    const officeActionDate = pick(mark, "status.office_action_issued_date", null);

    const lines = [];
    lines.push(`# Trademark Deadline Calendar`);
    lines.push("");
    lines.push(`Mark: ${mark.mark_text}`);
    lines.push(`Pipeline Stage: ${stage}`);
    lines.push("");
    lines.push("## Timeline");

    if (isDateLiteral(targetFilingDate)) {
        lines.push(`- Target filing date: ${targetFilingDate}`);
    } else {
        lines.push("- Target filing date: Not set");
    }

    if (isDateLiteral(officeActionDate)) {
        const primaryDue = addMonths(officeActionDate, 3);
        const extendedDue = addMonths(officeActionDate, 6);
        lines.push(`- Office Action issued: ${officeActionDate}`);
        lines.push(`- Office Action response due (standard): ${primaryDue}`);
        lines.push(`- Office Action response due (with extension fee): ${extendedDue}`);
    } else {
        lines.push("- Office Action date: Not recorded");
    }

    if (basis === "1(b)") {
        if (isDateLiteral(noaDate)) {
            lines.push(`- Notice of Allowance date: ${noaDate}`);
            for (let i = 1; i <= 6; i += 1) {
                const due = addMonths(noaDate, i * 6);
                const label = i === 1
                    ? "Statement of Use due"
                    : `Extension ${i - 1} period end`;
                lines.push(`- ${label}: ${due}`);
            }
        } else {
            lines.push("- Notice of Allowance date: Not recorded");
            lines.push("- Statement of Use: due 6 months after NOA (date unknown until NOA issues).");
        }
    } else {
        lines.push("- Basis is 1(a); Statement of Use is not required.");
    }

    if (isDateLiteral(registrationDate)) {
        lines.push("");
        lines.push("## Maintenance Windows");
        lines.push(`- Registration date: ${registrationDate}`);
        lines.push(`- Section 8/15 window opens: ${addMonths(registrationDate, 60)}`);
        lines.push(`- Section 8/15 window closes: ${addMonths(registrationDate, 72)}`);
        lines.push(`- First Section 9 renewal due: ${addMonths(registrationDate, 120)}`);
    } else {
        lines.push("");
        lines.push("## Maintenance Windows");
        lines.push("- Registration date not set yet.");
    }

    return `${lines.join("\n")}\n`;
}

function buildEnforcementPlaybook(mark) {
    const watchTerms = pick(mark, "monitoring.watch_terms", []);
    const domains = pick(mark, "monitoring.high_risk_domains", []);

    const watchTermLines = Array.isArray(watchTerms) && watchTerms.length > 0
        ? watchTerms.map((term) => `- ${term}`).join("\n")
        : "- No watch terms configured.";
    const domainLines = Array.isArray(domains) && domains.length > 0
        ? domains.map((term) => `- ${term}`).join("\n")
        : "- No high-risk domains configured.";

    return `# Enforcement Playbook

Mark: ${mark.mark_text}

## Policy
- Protect users from scams and impersonation.
- Allow fair, descriptive references by community members.
- Escalate only when confusion, fraud, or reputational harm is likely.

## Monitoring Targets
### Watch terms
${watchTermLines}

### High-risk domains
${domainLines}

## Escalation Ladder
1. Friendly clarification notice.
2. Formal cease-and-desist notice.
3. Platform/domain registrar takedown request.
4. Litigation for persistent, harmful infringement.

## Evidence to Save for Every Incident
- Dated screenshots and URLs.
- WHOIS/domain ownership records.
- Customer confusion reports.
- Revenue diversion evidence (if any).
`;
}

function buildPacketSummary(mark, missing, outputPath, dateStamp) {
    return {
        mark_id: mark.id,
        brand: mark.brand,
        mark_text: mark.mark_text,
        packet_date: dateStamp,
        pipeline_stage: pick(mark, "status.pipeline_stage", "draft"),
        target_filing_date: pick(mark, "status.target_filing_date", null),
        filing_basis: pick(mark, "filing.basis", "1(b)"),
        class_count: Array.isArray(pick(mark, "filing.classes", [])) ? pick(mark, "filing.classes", []).length : 0,
        missing_required_fields: missing,
        output_path: outputPath
    };
}

async function writeJson(filePath, value) {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
    await fs.writeFile(filePath, value, "utf8");
}

async function loadRegistry(filePath) {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
}

function selectMarks(registry, markId) {
    const marks = Array.isArray(registry.marks) ? registry.marks : [];
    if (markId) {
        const match = marks.find((entry) => entry.id === markId);
        if (!match) {
            throw new Error(`Mark '${markId}' was not found in registry.`);
        }
        return [match];
    }

    const ready = marks.filter((entry) => {
        const stage = pick(entry, "status.pipeline_stage", "");
        return stage === "draft_ready" || stage === "ready_for_filing";
    });
    return ready.length > 0 ? ready : marks;
}

function buildReport(mark, missing) {
    const target = pick(mark, "status.target_filing_date", "Not set");
    const stage = pick(mark, "status.pipeline_stage", "draft");
    const classes = pick(mark, "filing.classes", []);
    const classList = Array.isArray(classes)
        ? classes.map((entry) => entry.class_number).join(", ")
        : "none";
    return {
        id: mark.id,
        mark: mark.mark_text,
        stage,
        target_filing_date: target,
        classes: classList,
        missing_required_fields: missing.length
    };
}

async function main() {
    let args;
    try {
        args = parseArgs(process.argv.slice(2));
    } catch (error) {
        process.stderr.write(color(`${error.message}\n`, "red"));
        usage();
        process.exitCode = 1;
        return;
    }

    if (args.help) {
        usage();
        return;
    }

    if (args.date && !isDateLiteral(args.date)) {
        process.stderr.write(color("Invalid --date format. Use YYYY-MM-DD.\n", "red"));
        process.exitCode = 1;
        return;
    }

    const registryPath = path.resolve(process.cwd(), args.registry);
    const dateStamp = args.date || toLocalDateStamp(new Date());

    let registry;
    try {
        registry = await loadRegistry(registryPath);
    } catch (error) {
        process.stderr.write(color(`Failed to read registry: ${registryPath}\n`, "red"));
        process.stderr.write(color(`${error.message}\n`, "red"));
        process.exitCode = 1;
        return;
    }

    const marks = selectMarks(registry, args.mark);
    if (marks.length === 0) {
        process.stdout.write(color("No marks selected.\n", "yellow"));
        return;
    }

    const outputRoot = path.resolve(
        process.cwd(),
        args.outdir || registry.default_output_dir || "legal/trademark-dossiers"
    );

    const reportRows = [];

    for (const mark of marks) {
        const missing = validateMark(mark);
        reportRows.push(buildReport(mark, missing));

        if (args.report) {
            continue;
        }

        const packetPath = path.join(outputRoot, sanitizeName(mark.id), dateStamp);
        const intake = buildTeasIntake(mark, dateStamp);
        const summary = buildPacketSummary(mark, missing, packetPath, dateStamp);

        if (!args.dryRun) {
            await fs.mkdir(packetPath, { recursive: true });

            await writeJson(path.join(packetPath, "teas-intake.json"), intake);
            await writeJson(path.join(packetPath, "packet-summary.json"), summary);
            await writeText(path.join(packetPath, "goods-services.md"), buildGoodsServices(mark));
            await writeText(path.join(packetPath, "submission-checklist.md"), buildSubmissionChecklist(mark, missing));
            await writeText(path.join(packetPath, "specimen-checklist.md"), buildSpecimenChecklist(mark));
            await writeText(path.join(packetPath, "deadline-calendar.md"), buildDeadlineCalendar(mark));
            await writeText(path.join(packetPath, "enforcement-playbook.md"), buildEnforcementPlaybook(mark));
        }

        const missingMsg = missing.length === 0
            ? color("0 missing fields", "green")
            : color(`${missing.length} missing fields`, "yellow");
        process.stdout.write(`${color("Prepared", "cyan")} ${mark.id} -> ${packetPath} (${missingMsg})\n`);
    }

    if (reportRows.length > 0) {
        process.stdout.write("\nDocket report:\n");
        reportRows.forEach((row) => {
            process.stdout.write(
                `- ${row.id}: ${row.mark} | stage=${row.stage} | target=${row.target_filing_date} | classes=${row.classes} | missing=${row.missing_required_fields}\n`
            );
        });
    }

    if (args.report) {
        process.stdout.write("\nReport mode only. No files were written.\n");
    } else if (args.dryRun) {
        process.stdout.write("\nDry-run mode only. No files were written.\n");
    } else {
        process.stdout.write("\nPacket generation complete.\n");
    }
}

main().catch((error) => {
    process.stderr.write(color(`${error.stack || error.message}\n`, "red"));
    process.exitCode = 1;
});
