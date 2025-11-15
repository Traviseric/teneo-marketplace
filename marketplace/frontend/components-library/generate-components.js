/**
 * Component Generator Script
 * Auto-generates remaining HTML component files from manifest
 *
 * Usage: node generate-components.js
 */

const fs = require('fs');
const path = require('path');

// Load component manifest
const manifest = require('./COMPONENT_MANIFEST.json');

// Component templates
const templates = {
    'cta-button-secondary': `<!-- CTA Button Secondary -->
<style>
.cta-btn-secondary {
    --btn-bg: var(--brand-bg, #FFFFFF);
    --btn-border: var(--brand-primary, #111827);
    --btn-text: var(--brand-primary, #111827);
    padding: var(--spacing-md, 1rem) var(--spacing-xl, 2rem);
    background: var(--btn-bg);
    color: var(--btn-text);
    border: 2px solid var(--btn-border);
    border-radius: var(--radius-md, 0.5rem);
    font-size: var(--text-lg, 1.125rem);
    font-weight: var(--font-weight-medium, 500);
    cursor: pointer;
    transition: all var(--transition-base, 0.2s);
}
.cta-btn-secondary:hover {
    background: var(--brand-primary, #111827);
    color: var(--brand-text-light, #FFFFFF);
}
</style>
<a href="{{CTA_LINK}}" class="cta-btn-secondary">{{CTA_TEXT}}</a>`,

    'form-email-capture': `<!-- Email Capture Form -->
<style>
.email-capture {
    --form-bg: var(--brand-bg, #FFFFFF);
    --form-border: var(--brand-border-light, #E5E7EB);
    padding: var(--spacing-xl, 2rem);
    background: var(--form-bg);
    border: 1px solid var(--form-border);
    border-radius: var(--radius-lg, 0.75rem);
}
.email-capture__input {
    width: 100%;
    padding: var(--spacing-md, 1rem);
    border: 1px solid var(--form-border);
    border-radius: var(--radius-md, 0.5rem);
    font-size: var(--text-base, 1rem);
    margin-bottom: var(--spacing-md, 1rem);
}
.email-capture__button {
    width: 100%;
    padding: var(--spacing-md, 1rem);
    background: var(--brand-primary, #111827);
    color: var(--brand-text-light, #FFFFFF);
    border: none;
    border-radius: var(--radius-md, 0.5rem);
    font-weight: var(--font-weight-semibold, 600);
    cursor: pointer;
}
</style>
<form class="email-capture" action="{{FORM_ACTION}}" method="POST">
    <input type="email" name="email" placeholder="{{PLACEHOLDER|Enter your email}}" class="email-capture__input" required>
    <button type="submit" class="email-capture__button">{{BUTTON_TEXT|Get Free Access}}</button>
</form>`,

    'pricing-table-four-tier': `<!-- 4-Tier Pricing Table -->
<style>
.pricing-table {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-lg, 1.5rem);
    padding: var(--spacing-xl, 2rem);
}
.pricing-tier {
    background: var(--brand-bg, #FFFFFF);
    border: 2px solid var(--brand-border-light, #E5E7EB);
    border-radius: var(--radius-lg, 0.75rem);
    padding: var(--spacing-xl, 2rem);
    text-align: center;
}
.pricing-tier--popular {
    border-color: var(--brand-accent, #fea644);
    transform: scale(1.05);
}
.pricing-tier__name {
    font-size: var(--text-xl, 1.25rem);
    font-weight: var(--font-weight-semibold, 600);
    margin-bottom: var(--spacing-sm, 0.5rem);
}
.pricing-tier__price {
    font-size: var(--text-4xl, 2.25rem);
    font-weight: var(--font-weight-bold, 700);
    color: var(--brand-accent, #fea644);
    margin-bottom: var(--spacing-md, 1rem);
}
@media (max-width: 768px) {
    .pricing-table {
        grid-template-columns: 1fr;
    }
}
</style>
<div class="pricing-table">
    <div class="pricing-tier">
        <h3 class="pricing-tier__name">{{TIER_1_NAME}}</h3>
        <div class="pricing-tier__price">{{TIER_1_PRICE}}</div>
    </div>
    <div class="pricing-tier pricing-tier--popular">
        <h3 class="pricing-tier__name">{{TIER_2_NAME}}</h3>
        <div class="pricing-tier__price">{{TIER_2_PRICE}}</div>
    </div>
    <div class="pricing-tier">
        <h3 class="pricing-tier__name">{{TIER_3_NAME}}</h3>
        <div class="pricing-tier__price">{{TIER_3_PRICE}}</div>
    </div>
    <div class="pricing-tier">
        <h3 class="pricing-tier__name">{{TIER_4_NAME}}</h3>
        <div class="pricing-tier__price">{{TIER_4_PRICE}}</div>
    </div>
</div>`,

    // Add more templates as needed...
};

// Generate component files
function generateComponents() {
    console.log('🚀 Generating component files...\n');

    let generated = 0;
    let skipped = 0;

    for (const [componentKey, componentData] of Object.entries(manifest.components)) {
        const filePath = path.join(__dirname, componentData.file);
        const dir = path.dirname(filePath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Skip if file already exists
        if (fs.existsSync(filePath)) {
            console.log(`⏭️  Skipping ${componentKey} (already exists)`);
            skipped++;
            continue;
        }

        // Get template or create basic one
        let content = templates[componentKey];

        if (!content) {
            // Generate basic template
            content = `<!--
Component: ${componentData.name}
Category: ${componentData.category}
Variables: ${JSON.stringify(componentData.variables, null, 2)}
Features: ${JSON.stringify(componentData.features, null, 2)}
-->

<style>
.${componentKey} {
    /* Component styles here */
    padding: var(--spacing-md, 1rem);
}
</style>

<div class="${componentKey}">
    <p>Component: ${componentData.name}</p>
    <p>TODO: Implement component HTML</p>
</div>

<script>
// Component JavaScript (if needed)
</script>
`;
        }

        // Write file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Generated ${componentKey} → ${filePath}`);
        generated++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Generated: ${generated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total: ${generated + skipped}`);
}

// Run generator
generateComponents();
