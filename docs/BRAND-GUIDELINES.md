# OpenBazaar.ai: Brand Guidelines & Aesthetic

## The Concept: "Advanced Ancient Architecture"
The overarching identity for OpenBazaar.ai is built around a single foundational metaphor: **an ancient, hyper-advanced marketplace civilization built from impossible stone technology, rediscovered for the modern digital era.**

This bridges the gap between the concept of a decentralized protocol (which feels "ancient and foundational" like a bazaar) and the underlying cryptography (which feels "hyper-advanced" and futuristic).

### The Primary Aesthetic
- **Environment:** A royal Persian bazaar / open-air coastal desert ruins.
- **Surfaces:** Pure, pristine white Italian marble and warm, washed sand/linen.
- **Accents:** Celestial Blue and Turquoise geometric tilework, accented by warm brushed brass and gold metals.
- **Tone:** Clinical, exact, expensive, massive in scale, bathed in cinematic volumetric daylight.

## The Color Palette (CSS Variables)
The UI is built entirely upon this exact color schema mapping back to the physical materials of the brand:

```css
:root {
  /* The Core Brand (Skylight & Tiles) */
  --brand: #0ea5e9;        /* Celestial Blue (Light / Vibrant) */
  --brand-light: #22d3ee;  /* Turquoise Shimmer */
  --brand-dark: #0284c7;   /* Deep Vault Blue */

  /* Metals & Confidence */
  --green: #059669;        /* Trusted Green (Success States) */
  --yellow: #b45309;       /* Warm Brass / Polished Gold (Warning/Accent) */
  --purple: #1e3a8a;       /* Lapis Lazuli */

  /* The Environment (Marble & Stone) */
  --bg: #ffffff;           /* Polished White Italian Marble (Background) */
  --bg-elevated: #fafafa;  /* Clean Shimmering Stone */
  --surface: #e2e8f0;      /* Silver Metal Accent */

  /* The Typography (Onyx & Silver) */
  --text: #0f172a;         /* Deep Onyx / Charcoal */
  --text-secondary: #475569; /* Burnished Silver */
}
```

## Typography
To contrast the hyper-clean pixel perfection, we lean into classical rendering for Display text, mimicking the ancient architectural vibe:
- **Display Fonts (Headers/Logos):** `Cinzel`, `Playfair Display`, `serif`
- **Sans Fonts (UI/Body Data):** `Plus Jakarta Sans`, `Inter`, `sans-serif`

## Foundational Brand Assets
*(These assets are stored natively in the `/openbazaar-site/assets/` directory)*

### The Hero Image (`royal-bazaar-hero.png`)
A wide-angle, highly detailed shot of a shimmering white marble marketplace with massive turquoise and celestial blue tiled geometric vaults. The floor is pristine, reflecting soft skylight.

### The Icon / Web Favicon (`favicon.png` & `royal-logo.png`)
A minimalist, Apple-tier geometric vector abstraction. A perfect Persian geometric star pattern floating on pure white, rendered in celestial blue and polished gold—serving as both the primary desktop favicon and the main nav logo.

### The Builders Merch Tee
A heavyweight sand-colored cotton t-shirt with a sky-blue blueprint of the ancient marketplace drafted on the back. Driven entirely via Headless Printful REST pipelines built into the primary site architecture.

## Implementation Rules
1. **Never use standard flat tech shadows.** All elevated surfaces should cast a faint, atmospheric turquoise reflection (`rgba(14, 165, 233, 0.05)`), simulating environmental skylight.
2. **Never clutter.** Treat the UI like an empty, pristine museum gallery. Let the white space and the marble backgrounds breath. 
3. **No tech buzzwords.** Use heavy, physical, architectural metaphors in the copy.
