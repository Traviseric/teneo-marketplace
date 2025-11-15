# OrchestratorOS Integration Guide
## Connecting AI Brand Generation to Marketplace Deployment

This guide shows how to use the **OrchestratorOS** AI agents to automate brand creation in the Teneo Marketplace.

---

## Overview

**Two Systems Working Together:**

```
┌──────────────────────────────────────┐
│    ORCHESTRATOROS                    │
│    (AI Brand Generation)             │
├──────────────────────────────────────┤
│ • Brand Strategist Agent             │
│ • Book Creation Agent                │
│ • Design Agent                       │
│ • Integration Agent                  │
│ • Deployment Agent                   │
│                                      │
│ OUTPUT: BRAND_CONFIG.json            │
└────────────┬─────────────────────────┘
             │
             ↓ import-orchestrator-brand.js
             │
┌────────────┴─────────────────────────┐
│    TENEO MARKETPLACE                 │
│    (Book Store Platform)             │
├──────────────────────────────────────┤
│ • Receives AI-generated configs      │
│ • Creates brand directory structure  │
│ • Deploys live marketplace           │
│                                      │
│ OUTPUT: Live brand at /store.html    │
└──────────────────────────────────────┘
```

---

## Prerequisites

1. **Orchestrator installed** at `D:\Travis Eric\TE Code\orchestrator`
2. **Marketplace installed** at `D:\Travis Eric\TE Code\teneo-marketplace`
3. **Python 3.8+** for orchestrator
4. **Node.js 16+** for marketplace

---

## Step-by-Step Workflow

### Step 1: Generate Brand with OrchestratorOS

Navigate to the orchestrator directory and run the Brand Strategist Agent:

```bash
cd "D:\Travis Eric\TE Code\orchestrator"

# Run the brand strategist agent
python src/orchestrator/marketplace/agents/brand_strategist_agent.py
```

**What This Does:**
- Generates 3 brand name options
- Creates 2 color palette options
- Writes hero headline, subheadline, CTA copy
- Generates features list, social proof, FAQ
- Saves complete config to `marketplace_coordination/BRAND_CONFIG.json`

**Expected Output:**
```
[BRAND_STRATEGIST] Starting brand strategy creation...
[BRAND_STRATEGIST] Generating brand names...
[BRAND_STRATEGIST] Generating color palettes...
[BRAND_STRATEGIST] Generating landing page copy...
[BRAND_STRATEGIST] Brand strategy creation complete!
  - Brand Name: Quantum Youth Publishing
  - Quality Score: 8.2/10
[BRAND_STRATEGIST] Brand config saved to marketplace_coordination/BRAND_CONFIG.json
```

---

### Step 2: Review AI-Generated Brand Strategy

Open the generated config and review the AI's work:

```bash
cat marketplace_coordination/BRAND_CONFIG.json
```

**Example Output:**
```json
{
  "BRAND_NAME": "Quantum Youth Publishing",
  "brand_name_alternatives": [
    {
      "name": "Insight Books",
      "rationale": "Simple, memorable, broad appeal"
    },
    {
      "name": "Mind Spark Press",
      "rationale": "Evokes inspiration and intellectual curiosity"
    }
  ],

  "PRIMARY_COLOR": "#4F46E5",
  "ACCENT_COLOR": "#F59E0B",

  "HERO_HEADLINE": "Science That Makes Sense",
  "HERO_SUBHEADLINE": "Complex topics explained for curious minds",
  "BUTTON_TEXT": "Explore Books",

  "brand_voice": "conversational, inspiring, evidence-based",
  "features": [
    {
      "title": "Evidence-Based Content",
      "description": "Every fact backed by peer-reviewed research"
    }
  ],

  "quality_score": 8.2,
  "requires_human_review": true
}
```

**Human Decision Point:**
- ✅ Accept the brand as-is
- ✏️ Edit brand name (pick alternative)
- 🎨 Adjust colors
- 📝 Tweak copy

For now, let's accept it and continue.

---

### Step 3: Import Brand into Marketplace

Navigate to the marketplace and run the import script:

```bash
cd "D:\Travis Eric\TE Code\teneo-marketplace"

# Import the orchestrator-generated brand
node scripts/import-orchestrator-brand.js
```

**What This Does:**
1. Reads `orchestrator/marketplace_coordination/BRAND_CONFIG.json`
2. Converts orchestrator format → marketplace format
3. Creates brand directory: `marketplace/frontend/brands/quantum_youth_publishing/`
4. Generates three files:
   - `config.json` - Brand configuration
   - `catalog.json` - Book listings (placeholder for now)
   - `variables.json` - Landing page variables

**Expected Output:**
```
🚀 OrchestratorOS → Marketplace Brand Import

Reading orchestrator config from:
  D:\Travis Eric\TE Code\orchestrator\marketplace_coordination\BRAND_CONFIG.json

Creating brand in marketplace...

✓ Created brand directory: marketplace/frontend/brands/quantum_youth_publishing
✓ Created config.json
✓ Created catalog.json
✓ Created variables.json

============================================================
BRAND IMPORT COMPLETE
============================================================

Brand Name: Quantum Youth Publishing
Brand ID: quantum_youth_publishing
Quality Score: 8.2/10

Colors:
  Primary: #4F46E5
  Accent: #F59E0B

Location: marketplace/frontend/brands/quantum_youth_publishing/

Files Created:
  ✓ config.json
  ✓ catalog.json
  ✓ variables.json

Next Steps:
  1. Run orchestrator Book Creation Agent to generate books
  2. Import books: node scripts/import-orchestrator-books.js quantum_youth_publishing
  3. Start marketplace: npm start
  4. Visit: http://localhost:3001/store.html?brand=quantum_youth_publishing

============================================================
```

---

### Step 4: Verify Brand in Marketplace

Start the marketplace server and view the brand:

```bash
# Start marketplace (if not already running)
npm start

# Open browser to:
# http://localhost:3001/store.html?brand=quantum_youth_publishing
```

**You Should See:**
- Hero section with "Science That Makes Sense" headline
- Subheadline: "Complex topics explained for curious minds"
- Colors: Indigo primary (#4F46E5), Amber accent (#F59E0B)
- "Explore Books" CTA button
- Placeholder book (waiting for Book Creation Agent)

---

### Step 5: Generate Books (Future - Book Creation Agent)

Once the Book Creation Agent is built in orchestrator:

```bash
cd "D:\Travis Eric\TE Code\orchestrator"

# Generate books for this brand
python src/orchestrator/marketplace/agents/book_creation_agent.py \
  --brand quantum_youth_publishing \
  --count 10
```

This will:
- Generate 10 book outlines
- Write book content using AI
- Create book covers with DALL-E
- Save to `marketplace_coordination/BOOKS/`

Then import to marketplace:

```bash
cd "D:\Travis Eric\TE Code\teneo-marketplace"

# Import AI-generated books
node scripts/import-orchestrator-books.js quantum_youth_publishing
```

---

## File Mappings

### Orchestrator → Marketplace

| Orchestrator Field | Marketplace File | Marketplace Field |
|-------------------|------------------|-------------------|
| `BRAND_NAME` | `config.json` | `name` |
| `PRIMARY_COLOR` | `config.json` | `themeColor` |
| `ACCENT_COLOR` | `config.json` | `accentColor` |
| `HERO_HEADLINE` | `variables.json` | `heroHeadline` |
| `HERO_SUBHEADLINE` | `variables.json` | `heroSubheadline` |
| `BUTTON_TEXT` | `variables.json` | `ctaButtonText` |
| `features` | `variables.json` | `features` |
| `social_proof` | `variables.json` | `socialProof` |
| `faq` | `variables.json` | `faq` |
| `brand_voice` | `config.json` | `brand_voice` |
| `brand_guidelines` | `config.json` | `brand_guidelines` |
| `quality_score` | `config.json` | `orchestrator_quality_score` |

---

## Custom Brand Tasks

### Customize Brand Before Import

If you want to customize the orchestrator's output before importing:

1. **Edit the generated config:**
```bash
cd "D:\Travis Eric\TE Code\orchestrator"
code marketplace_coordination/BRAND_CONFIG.json
```

2. **Make your changes:**
```json
{
  "BRAND_NAME": "My Custom Brand Name",  // ← Edit this
  "PRIMARY_COLOR": "#2563EB",            // ← Change colors
  "HERO_HEADLINE": "My Custom Headline", // ← Update copy
  ...
}
```

3. **Import the customized version:**
```bash
cd "D:\Travis Eric\TE Code\teneo-marketplace"
node scripts/import-orchestrator-brand.js
```

---

### Import from Custom Location

If you generated the brand config elsewhere:

```bash
node scripts/import-orchestrator-brand.js \
  --config path/to/custom/BRAND_CONFIG.json
```

---

### Multiple Brands

Generate and import multiple brands:

```bash
# Generate first brand
cd "D:\Travis Eric\TE Code\orchestrator"
python src/orchestrator/marketplace/agents/brand_strategist_agent.py

# Import it
cd "D:\Travis Eric\TE Code\teneo-marketplace"
node scripts/import-orchestrator-brand.js

# Save the config to a custom location for later reference
cp marketplace/frontend/brands/quantum_youth_publishing/config.json \
   saved_brands/quantum_youth_publishing.json

# Generate second brand (orchestrator overwrites BRAND_CONFIG.json)
cd "D:\Travis Eric\TE Code\orchestrator"
python src/orchestrator/marketplace/agents/brand_strategist_agent.py

# Import second brand
cd "D:\Travis Eric\TE Code\teneo-marketplace"
node scripts/import-orchestrator-brand.js
```

---

## Advanced: Programmatic Integration

### Node.js Integration

Use the import functions programmatically:

```javascript
const importBrand = require('./scripts/import-orchestrator-brand');

// Generate brand ID from name
const brandId = importBrand.generateBrandId("Quantum Youth Publishing");
// → "quantum_youth_publishing"

// Load orchestrator config
const orchestratorConfig = require('../orchestrator/marketplace_coordination/BRAND_CONFIG.json');

// Convert to marketplace format
const marketplaceConfig = importBrand.generateMarketplaceConfig(orchestratorConfig);
const marketplaceCatalog = importBrand.generateMarketplaceCatalog(orchestratorConfig);
const marketplaceVariables = importBrand.generateMarketplaceVariables(orchestratorConfig);

// Save to custom location
fs.writeFileSync(
  `custom/brands/${brandId}/config.json`,
  JSON.stringify(marketplaceConfig, null, 2)
);
```

---

### Python Integration (from orchestrator)

Call marketplace import directly from orchestrator:

```python
import subprocess
import os

def deploy_to_marketplace(brand_config_path: str) -> str:
    """
    Deploy orchestrator brand to marketplace.

    Returns brand ID of created brand.
    """
    marketplace_dir = os.path.join(os.path.dirname(__file__), '../../../teneo-marketplace')

    result = subprocess.run(
        ['node', 'scripts/import-orchestrator-brand.js', '--config', brand_config_path],
        cwd=marketplace_dir,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise Exception(f"Marketplace import failed: {result.stderr}")

    # Extract brand ID from output
    # (Look for "Brand ID: quantum_youth_publishing")
    for line in result.stdout.split('\n'):
        if 'Brand ID:' in line:
            brand_id = line.split('Brand ID:')[1].strip()
            return brand_id

    raise Exception("Could not determine brand ID")
```

Usage in orchestrator agents:

```python
from src.orchestrator.marketplace.agents.brand_strategist_agent import BrandStrategistAgent
from src.orchestrator.utils.marketplace_deployer import deploy_to_marketplace

# Generate brand strategy
agent = BrandStrategistAgent()
brand_config = agent.execute(task)

# Deploy to marketplace automatically
brand_id = deploy_to_marketplace('marketplace_coordination/BRAND_CONFIG.json')

print(f"Brand deployed! Visit http://localhost:3001/store.html?brand={brand_id}")
```

---

## Troubleshooting

### "BRAND_CONFIG.json not found"

**Problem:** Import script can't find orchestrator output

**Solution:**
```bash
# Verify orchestrator generated the config
ls "D:\Travis Eric\TE Code\orchestrator\marketplace_coordination\BRAND_CONFIG.json"

# If missing, run the brand strategist again
cd "D:\Travis Eric\TE Code\orchestrator"
python src/orchestrator/marketplace/agents/brand_strategist_agent.py
```

---

### "Brand directory already exists"

**Problem:** You're trying to import a brand that already exists

**Solution:**
1. Answer `y` to overwrite when prompted
2. Or manually delete the existing brand:
```bash
rm -rf "marketplace/frontend/brands/quantum_youth_publishing"
node scripts/import-orchestrator-brand.js
```

---

### Brand shows placeholder books

**Problem:** No books generated yet

**Solution:**
This is expected! The Book Creation Agent hasn't been built yet. For now:

1. **Wait for Book Creation Agent** (Phase 4 of roadmap)
2. **Or manually add books** to `catalog.json`:

```json
{
  "books": [
    {
      "id": "book_001",
      "title": "Quantum Physics for Teens",
      "author": "AI Generated",
      "price": 14.99,
      "description": "Understanding the quantum world without the complexity",
      "tags": ["physics", "science"],
      "featured": true
    }
  ]
}
```

---

## Next Steps

1. **Test the integration:**
   ```bash
   # Terminal 1: Generate brand
   cd "D:\Travis Eric\TE Code\orchestrator"
   python src/orchestrator/marketplace/agents/brand_strategist_agent.py

   # Terminal 2: Import to marketplace
   cd "D:\Travis Eric\TE Code\teneo-marketplace"
   node scripts/import-orchestrator-brand.js
   npm start
   ```

2. **Build Book Creation Agent** (see `orchestrator/docs/development/MARKETPLACE_AUTOMATION_ARCHITECTURE.md`)

3. **Create import-orchestrator-books.js** script to import generated books

4. **Build full automation pipeline** where orchestrator calls marketplace APIs directly

---

## Architecture Reference

For complete architecture documentation, see:
- **Orchestrator Architecture:** `D:\Travis Eric\TE Code\orchestrator\docs\development\MARKETPLACE_AUTOMATION_ARCHITECTURE.md`
- **Automation Roadmap:** `D:\Travis Eric\TE Code\teneo-marketplace\docs\BRAND_AUTOMATION_ROADMAP.md`
- **Implementation Guide:** `D:\Travis Eric\TE Code\orchestrator\MARKETPLACE_AUTOMATION_IMPLEMENTATION.md`

---

## The Vision

```
You (Human):
  "I want a science book brand for teenagers"

Orchestrator (AI):
  → Generates brand strategy
  → Creates 10 book outlines
  → Writes 10 complete books
  → Designs 10 book covers
  → Generates marketing copy

You (Human):
  → Review quality (30 minutes)
  → Approve deployment

Marketplace:
  → Receives AI-generated brand
  → Deploys live store
  → Accepts payments
  → Delivers books

Result: Professional book marketplace in 5 hours instead of 80 hours.
```

**The orchestrator is your AI team. The marketplace is your storefront. This integration makes them work together seamlessly.**

---

**Last Updated:** November 14, 2024
**Maintained by:** Travis Eric
