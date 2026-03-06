// OpenBazaar.ai — Main Script

// ─── Mobile Nav Toggle ───
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  const isOpen = navLinks.classList.contains('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile nav on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

// ─── Scroll Animations ───
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-up');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.step-card, .feature-card, .agent-card, .gig-preview').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  observer.observe(el);
});

// ─── Nav Background on Scroll ───
const nav = document.getElementById('nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (scrollY > 100) {
    nav.style.borderBottomColor = 'rgba(99, 102, 241, 0.15)';
  } else {
    nav.style.borderBottomColor = 'rgba(255, 255, 255, 0.06)';
  }
  lastScroll = scrollY;
}, { passive: true });

// ─── Fetch Network Stats ───
async function loadNetworkStats() {
  try {
    const res = await fetch('/api/network/stats');
    if (!res.ok) throw new Error('Network stats unavailable');
    const data = await res.json();
    const nodeEl = document.getElementById('nodeCount');
    const prodEl = document.getElementById('productCount');
    const txEl = document.getElementById('txCount');
    if (nodeEl) nodeEl.textContent = data.nodes || '4';
    if (prodEl) prodEl.textContent = data.products || '120+';
    if (txEl) txEl.textContent = data.transactions || '1.2K';
  } catch {
    // Show N/A when network data is unavailable
    const nodeEl = document.getElementById('nodeCount');
    const prodEl = document.getElementById('productCount');
    const txEl = document.getElementById('txCount');
    if (nodeEl) { nodeEl.textContent = 'N/A'; nodeEl.title = 'Network data unavailable'; }
    if (prodEl) { prodEl.textContent = 'N/A'; prodEl.title = 'Network data unavailable'; }
    if (txEl) { txEl.textContent = 'N/A'; txEl.title = 'Network data unavailable'; }
  }
}

loadNetworkStats();

// ─── Copy Install Command ───
function copyInstall() {
  const cmd = 'git clone https://github.com/traviseric/openbazaar-ai && npm start';
  const btn = document.getElementById('copy-install-btn');
  navigator.clipboard.writeText(cmd).then(() => {
    if (btn) {
      btn.textContent = 'Copied!';
      btn.style.color = '#10b981';
      btn.setAttribute('aria-label', 'Copied!');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.style.color = '';
        btn.setAttribute('aria-label', 'Copy install command');
      }, 2000);
    }
  });
}

// ─── Smooth Scroll for Anchor Links ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ─── Dogfooding Store Checkout Logic (Lulu/Printful Headless) ───
function handleDogfoodCheckout(itemConfig) {
  const btn = document.getElementById(itemConfig.btnId);
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';

    const userEmail = prompt('Enter your email to receive order updates:');
    if (!userEmail) {
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    try {
      const res = await fetch('/api/checkout-mixed/create-mixed-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          items: [
            {
              id: itemConfig.id,
              title: itemConfig.title,
              author: 'OpenBazaar.ai',
              format: itemConfig.format,
              price: itemConfig.price,
              quantity: 1
            }
          ]
        })
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to initiate checkout.');
        btn.disabled = false;
        btn.textContent = originalText;
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to payment gateway.');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// Attach checkout events
handleDogfoodCheckout({
  btnId: 'buyHandbookBtn',
  id: 'network-state-handbook',
  title: 'The Network State Handbook',
  format: 'print_trade',
  price: 24.00
});

// For demonstration, hooking tee and mug to same endpoint, assuming backend formats map
handleDogfoodCheckout({
  btnId: 'buyTeeBtn',
  id: 'builders-heavy-tee',
  title: '"Builders Only" Heavyweight Tee',
  format: 'print_apparel', // hypothetical Printful mapped format
  price: 35.00
});

handleDogfoodCheckout({
  btnId: 'buyMugBtn',
  id: 'protocol-mug',
  title: 'The Protocol Mug',
  format: 'print_merch',
  price: 18.00
});
