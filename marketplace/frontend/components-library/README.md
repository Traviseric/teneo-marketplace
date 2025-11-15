# Teneo Component Library

**Modular, Copy-Paste, Brand-Customizable Landing Page Components**

---

## 📁 Structure

```
components-library/
├── COMPONENT_MANIFEST.json         # Component registry & metadata
├── README.md                        # This file
├── _base/
│   ├── variables.css                # Global CSS variables (colors, fonts, spacing)
│   ├── reset.css                    # CSS reset
│   └── utilities.css                # Utility classes
├── heroes/
│   ├── hero-vsl.html                # Video Sales Letter hero
│   ├── hero-revolutionary.html      # Dark, dramatic hero
│   ├── hero-brand-builder.html      # Brand builder hero
│   ├── hero-book-focused.html       # Book sales page hero
│   └── hero-dream-outcome.html      # AI ebook hero
├── ctas/
│   ├── cta-button-primary.html
│   ├── cta-button-secondary.html
│   ├── cta-section-full.html
│   ├── cta-sticky-bar.html
│   └── cta-four-path.html
├── forms/
│   ├── form-email-capture.html
│   ├── form-multi-step-wizard.html
│   └── form-brand-builder.html
├── pricing/
│   ├── pricing-table-four-tier.html
│   ├── value-stack-comparison.html
│   └── price-box-single.html
├── product/
│   ├── book-card.html
│   ├── book-grid-filterable.html
│   ├── territory-card.html
│   └── territory-grid.html
├── interactive/
│   ├── modal-exit-intent.html
│   ├── modal-oto.html
│   ├── countdown-timer.html
│   ├── expandable-list.html
│   ├── faq-accordion.html
│   └── video-player.html
├── conversion/
│   ├── objection-destruction.html
│   ├── guarantee-box.html
│   └── urgency-banner.html
├── content/
│   ├── benefits-grid.html
│   ├── transformation-journey.html
│   └── checklist-section.html
├── social-proof/
│   ├── testimonial-card.html
│   ├── testimonial-grid.html
│   └── victories-section.html
└── templates/
    ├── book-sales-page-full.html    # Complete templates
    ├── sovereignty-revolution-full.html
    ├── vsl-funnel-full.html
    └── brand-builder-full.html
```

---

## 🎨 How Components Work

### 1. Each Component is Self-Contained

Every `.html` file contains:
- **HTML structure**
- **CSS styles** (scoped using BEM or unique classes)
- **JavaScript** (if needed, inline)
- **CSS Variables** for brand customization

**Example structure:**
```html
<!-- Component: hero-vsl.html -->
<style>
    /* Component-specific variables */
    .hero-vsl {
        --hero-bg: var(--brand-primary, #1e3f54);
        --hero-accent: var(--brand-accent, #fea644);
        --hero-text: var(--brand-text-light, #ffffff);
    }

    /* Component styles */
    .hero-vsl {
        background: var(--hero-bg);
        color: var(--hero-text);
        padding: 4rem 2rem;
    }

    .hero-vsl__headline {
        font-size: 3rem;
        font-weight: 700;
        margin-bottom: 1rem;
    }

    .hero-vsl__cta {
        background: var(--hero-accent);
        padding: 1rem 2rem;
        border-radius: 0.5rem;
    }
</style>

<section class="hero-vsl">
    <div class="hero-vsl__container">
        <h1 class="hero-vsl__headline">{{HEADLINE}}</h1>
        <p class="hero-vsl__subheadline">{{SUBHEADLINE}}</p>
        <div class="hero-vsl__video">
            <iframe src="{{VIDEO_URL}}"></iframe>
        </div>
        <a href="{{CTA_LINK}}" class="hero-vsl__cta">{{CTA_TEXT}}</a>
    </div>
</section>

<script>
    // Component-specific JS (if needed)
</script>
```

---

## 🔧 Brand Customization System

### Method 1: CSS Variables (Recommended)

**Create a brand theme file:**

```css
/* brand-themes/teneo-brand.css */
:root {
    --brand-primary: #1e3f54;
    --brand-accent: #fea644;
    --brand-text: #111827;
    --brand-text-light: #ffffff;
    --brand-bg: #ffffff;
    --brand-bg-secondary: #f8f9fa;
    --brand-font-main: 'Inter', sans-serif;
    --brand-font-heading: 'Inter', sans-serif;
}
```

```css
/* brand-themes/information-asymmetry-brand.css */
:root {
    --brand-primary: #0A0A0A;
    --brand-accent: #FF3B30;
    --brand-text: #1C1C1E;
    --brand-text-light: #FFFFFF;
    --brand-bg: #FFFFFF;
    --brand-bg-secondary: #F3F4F6;
    --brand-font-main: system-ui, sans-serif;
    --brand-font-heading: system-ui, sans-serif;
}
```

**Usage:**
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="components-library/_base/variables.css">
    <link rel="stylesheet" href="components-library/_base/reset.css">

    <!-- Swap this line to change brand -->
    <link rel="stylesheet" href="brand-themes/teneo-brand.css">
    <!-- OR -->
    <!-- <link rel="stylesheet" href="brand-themes/information-asymmetry-brand.css"> -->
</head>
<body>
    <!-- Components automatically use brand colors -->
    <!-- Copy component HTML here -->
</body>
</html>
```

### Method 2: Template Variables (Alternative)

Each component uses `{{VARIABLE}}` syntax:

```html
<style>
    .hero {
        background: {{PRIMARY_COLOR|#111827}};
        color: {{TEXT_COLOR|#ffffff}};
    }
</style>
```

Replace with actual values using a template processor or find/replace.

---

## 📋 Component Usage Guide

### Step 1: Choose Your Components

Browse `COMPONENT_MANIFEST.json` or folders to find components you need.

### Step 2: Copy Component HTML

Copy the entire `.html` file content (includes HTML + CSS + JS).

### Step 3: Set Brand Theme

**Option A:** Link to your brand CSS theme
```html
<link rel="stylesheet" href="brand-themes/your-brand.css">
```

**Option B:** Replace `{{VARIABLES}}` with actual values
```bash
# Use template processor or find/replace
{{PRIMARY_COLOR}} → #1e3f54
{{BRAND_NAME}} → Your Brand Name
{{HEADLINE}} → Your Actual Headline
```

### Step 4: Customize Content

Fill in your content variables:
- Headlines
- Copy
- Images
- CTAs
- Links

### Step 5: Combine into Page

Stack components vertically to build complete landing pages.

---

## 🎯 Example: Building a Book Sales Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Book Sales Page</title>

    <!-- Base styles -->
    <link rel="stylesheet" href="components-library/_base/variables.css">
    <link rel="stylesheet" href="components-library/_base/reset.css">

    <!-- Brand theme -->
    <link rel="stylesheet" href="brand-themes/my-brand.css">
</head>
<body>

    <!-- Hero Section -->
    <!-- COPY FROM: components-library/heroes/hero-book-focused.html -->
    <section class="hero-book">
        <!-- Component HTML here -->
    </section>

    <!-- Benefits Grid -->
    <!-- COPY FROM: components-library/content/benefits-grid.html -->
    <section class="benefits">
        <!-- Component HTML here -->
    </section>

    <!-- Testimonials -->
    <!-- COPY FROM: components-library/social-proof/testimonial-grid.html -->
    <section class="testimonials">
        <!-- Component HTML here -->
    </section>

    <!-- FAQ -->
    <!-- COPY FROM: components-library/interactive/faq-accordion.html -->
    <section class="faq">
        <!-- Component HTML here -->
    </section>

    <!-- CTA -->
    <!-- COPY FROM: components-library/ctas/cta-section-full.html -->
    <section class="cta-final">
        <!-- Component HTML here -->
    </section>

</body>
</html>
```

---

## 🔄 Quick Brand Swap

To create a new brand variation:

1. **Duplicate a brand theme file:**
   ```bash
   cp brand-themes/teneo-brand.css brand-themes/new-brand.css
   ```

2. **Change CSS variables:**
   ```css
   :root {
       --brand-primary: #YOUR_COLOR;
       --brand-accent: #YOUR_ACCENT;
       /* etc */
   }
   ```

3. **Swap theme link in HTML:**
   ```html
   <link rel="stylesheet" href="brand-themes/new-brand.css">
   ```

4. **All components automatically update!** ✨

---

## 📦 Pre-Built Templates

Full landing page templates in `/templates/`:

- **book-sales-page-full.html** - Complete book sales page (9 components)
- **sovereignty-revolution-full.html** - Publisher funnel (11 components)
- **vsl-funnel-full.html** - Video sales letter (7 components)
- **brand-builder-full.html** - Brand creation funnel (8 components)

Each template:
- ✅ Already assembled components
- ✅ Uses CSS variable theming
- ✅ Has all {{VARIABLES}} marked
- ✅ Ready to customize

---

## 🎨 Creating New Components

### Component Checklist:

1. **Use BEM naming** (block__element--modifier)
2. **Scope styles** to component class
3. **Use CSS variables** for all colors, fonts, spacing
4. **Default values** in variable definitions
5. **Self-contained** (no external dependencies)
6. **Document variables** at top of file
7. **Mobile responsive** (mobile-first)
8. **Add to manifest** when complete

### Component Template:

```html
<!--
Component Name: component-name
Category: category-name
Variables:
- {{VAR_1}}: Description
- {{VAR_2}}: Description
Features:
- Feature 1
- Feature 2
-->

<style>
    /* Component Variables */
    .component-name {
        --comp-primary: var(--brand-primary, #default);
        --comp-accent: var(--brand-accent, #default);
        --comp-spacing: var(--spacing-md, 2rem);
    }

    /* Component Styles */
    .component-name {
        /* styles */
    }

    .component-name__element {
        /* styles */
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
        .component-name {
            /* mobile styles */
        }
    }
</style>

<section class="component-name">
    <div class="component-name__container">
        <!-- Component HTML -->
        <h2>{{HEADLINE}}</h2>
        <p>{{DESCRIPTION}}</p>
    </div>
</section>

<script>
    // Component JS (if needed)
    // Keep it scoped to this component
</script>
```

---

## 🚀 Integration with Marketplace

### Automatic Brand Config Loading

Components can auto-load brand config from marketplace brand system:

```javascript
// Load brand config
async function loadBrandConfig(brandId) {
    const response = await fetch(`/brands/${brandId}/config.json`);
    const config = await response.json();

    // Apply theme
    document.documentElement.style.setProperty('--brand-primary', config.theme.primaryColor);
    document.documentElement.style.setProperty('--brand-accent', config.theme.accentColor);
    // etc...
}

// Usage
loadBrandConfig('teneo');
```

### Dynamic Component Rendering

```javascript
// Render component with data
function renderComponent(componentName, data) {
    // Load component HTML
    const template = await fetch(`/components-library/${componentName}.html`).then(r => r.text());

    // Replace variables
    let rendered = template;
    for (const [key, value] of Object.entries(data)) {
        rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return rendered;
}

// Usage
const heroHtml = renderComponent('heroes/hero-vsl', {
    HEADLINE: 'Published Author in 10 Minutes',
    SUBHEADLINE: 'AI writes your book while you watch',
    VIDEO_URL: 'https://youtube.com/embed/xyz',
    CTA_TEXT: 'Start Now',
    CTA_LINK: '/get-started'
});
```

---

## 📊 Component Reusability Matrix

| Component | Used In | Style Variants | Complexity |
|-----------|---------|----------------|------------|
| hero-vsl | 10-Min Author, Webinar | 2 | Low |
| hero-revolutionary | Sovereignty | 1 | Low |
| territory-card | Sovereignty | 1 | High |
| pricing-table-four-tier | All funnels | 3 | Medium |
| modal-exit-intent | All funnels | 2 | Medium |
| countdown-timer | Tripwire, Urgency | 1 | Medium |
| expandable-list | Territory, Books | 1 | Medium |
| objection-destruction | Sovereignty, AI Ebook | 1 | Low |

---

## 🔐 Best Practices

### Do's ✅
- Use CSS variables for all theming
- Keep components self-contained
- Document all variables
- Make mobile-responsive by default
- Use semantic HTML
- Add ARIA labels for accessibility
- Track analytics events
- Version your components

### Don'ts ❌
- Don't use external CSS frameworks (no Bootstrap, Tailwind dependencies)
- Don't hardcode colors/fonts
- Don't use IDs for styling (use classes)
- Don't create tight coupling between components
- Don't use inline styles (except for CSS variables)
- Don't forget to document

---

## 🛠️ Tools & Utilities

### Coming Soon:
- **Component Builder** - Visual editor for creating new components
- **Theme Generator** - Auto-generate brand themes from colors
- **Template Assembler** - Drag-drop page builder
- **Variable Replacer** - Bulk find/replace for {{VARIABLES}}
- **Export Tool** - Export to static HTML, React, Vue

---

## 📚 Learn More

- [Component Manifest](./COMPONENT_MANIFEST.json) - Full component registry
- [Funnel Documentation](../../../teneo-production/docs/marketing/funnels/) - Funnel strategies
- [Brand Config Guide](../brands/README.md) - Brand system docs

---

**Questions? Issues? Improvements?**

This is an open, evolving system. Add new components, improve existing ones, and share your variations!
