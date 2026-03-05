const fs = require('fs');

const cssPath = 'openbazaar-site/style.css';
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Root Variables
css = css.replace(/:root\s*\{[\s\S]*?\/\*\s*Typography\s*\*\//, `:root {
  /* Brand Colors */
  --brand: #2563eb;
  --brand-light: #60a5fa;
  --brand-dark: #1d4ed8;
  --green: #059669;
  --green-dark: #047857;
  --purple: #7c3aed;
  --yellow: #d97706;
  --red: #dc2626;

  /* Surfaces */
  --bg: #ffffff;
  --bg-elevated: #fafafa;
  --bg-card: #ffffff;
  --bg-card-hover: #f8fafc;
  --surface: #f1f5f9;

  /* Text */
  --text: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;

  /* Borders */
  --border: rgba(15, 23, 42, 0.08);
  --border-subtle: rgba(15, 23, 42, 0.04);

  /* Typography */`);

// Typography fonts
css = css.replace(/--font-display:\s*'Space Grotesk'/, `--font-display: 'Outfit'`);

// 2. Nav background
css = css.replace(/background:\s*rgba\(10,\s*10,\s*15,\s*0\.8\);/, `background: rgba(255, 255, 255, 0.8);`);

// 3. Grid background
css = css.replace(/rgba\(99,\s*102,\s*241,\s*0\.03\)/g, `rgba(15, 23, 42, 0.02)`);

// 4. Hero glow opacities and colors
css = css.replace(/opacity:\s*0\.4;/g, `opacity: 0.1;`);
// Change the body background from dark to light
css = css.replace(/--brand-light\)/g, `--brand-dark)`); // invert for text gradient
css = css.replace(/linear-gradient\(135deg, var\(--text\) 0%, var\(--brand-dark\) 100%\)/g, `linear-gradient(135deg, var(--text) 0%, #3b82f6 100%)`); // text gradient

// Fix tags
css = css.replace(/color:\s*var\(--brand-light\);/g, `color: var(--brand-dark);`);
css = css.replace(/color:\s*var\(--yellow\);/g, `color: #b45309;`); /* darker yellow for contrast */
css = css.replace(/color:\s*var\(--green\);/g, `color: var(--green-dark);`);
css = css.replace(/color:\s*var\(--purple\);/g, `color: #6d28d9;`);

// Node center and buttons text
css = css.replace(/color:\s*rgba\(99,\s*102,\s*241,\s*0\.08\);/g, `color: rgba(37, 99, 235, 0.05);`);
css = css.replace(/rgba\(99,\s*102,\s*241,\s*0\.1\)/g, `rgba(37, 99, 235, 0.1)`);
css = css.replace(/rgba\(99,\s*102,\s*241,\s*0\.15\)/g, `rgba(37, 99, 235, 0.1)`);

// Adjust box shadows
css = css.replace(/box-shadow:\s*0\s*20px\s*60px[^;]*;/g, `box-shadow: 0 20px 60px rgba(15, 23, 42, 0.04);`);
css = css.replace(/box-shadow:\s*0\s*20px\s*80px[^;]*;/g, `box-shadow: 0 20px 80px rgba(15, 23, 42, 0.04);`);
css = css.replace(/box-shadow:\s*0\s*12px\s*40px[^;]*;/g, `box-shadow: 0 12px 40px rgba(15, 23, 42, 0.04);`);
css = css.replace(/box-shadow:\s*0\s*4px\s*20px[^;]*;/g, `box-shadow: 0 4px 20px rgba(37, 99, 235, 0.2);`);
css = css.replace(/box-shadow:\s*0\s*0\s*20px[^;]*;/g, `box-shadow: 0 0 40px rgba(37, 99, 235, 0.1);`);

// Invert skip link color
css = css.replace(/background:\s*var\(--brand\);\s*color:\s*white;/g, `background: var(--brand); color: white;`);

// Dark sections need to have their backgrounds lightened, but maybe they should just use the elevated light bg we set
// .section-dark uses var(--bg-elevated) which we just changed to #fafafa.

fs.writeFileSync(cssPath, css);

const htmlPath = 'openbazaar-site/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Update font family to Outfit instead of Space Grotesk
html = html.replace(/family=Space\+Grotesk:wght@500;600;700/g, 'family=Outfit:wght@400;500;600;700');

// Make tags and trust logos look better on light bg
html = html.replace(/<span class="trust-logo">⚡ Lightning<\/span>/g, `<span class="trust-logo" style="color:#0f172a;font-weight:600;">⚡ Lightning</span>`);
html = html.replace(/<span class="trust-logo">🔷 ArxMint<\/span>/g, `<span class="trust-logo" style="color:#0f172a;font-weight:600;">🔷 ArxMint</span>`);
html = html.replace(/<span class="trust-logo">💳 Stripe<\/span>/g, `<span class="trust-logo" style="color:#0f172a;font-weight:600;">💳 Stripe</span>`);
html = html.replace(/<span class="trust-logo">🟣 Nostr<\/span>/g, `<span class="trust-logo" style="color:#0f172a;font-weight:600;">🟣 Nostr</span>`);
html = html.replace(/<span class="trust-logo">🌐 IPFS<\/span>/g, `<span class="trust-logo" style="color:#0f172a;font-weight:600;">🌐 IPFS</span>`);

fs.writeFileSync(htmlPath, html);
console.log("Theme successfully ported to Light Mode / Clinical Boutique aesthetic.");
