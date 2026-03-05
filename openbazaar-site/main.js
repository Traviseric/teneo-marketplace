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
    // Fallback to placeholder values
    const nodeEl = document.getElementById('nodeCount');
    const prodEl = document.getElementById('productCount');
    const txEl = document.getElementById('txCount');
    if (nodeEl) nodeEl.textContent = '4';
    if (prodEl) prodEl.textContent = '120+';
    if (txEl) txEl.textContent = '1.2K';
  }
}

loadNetworkStats();

// ─── Copy Button Feedback ───
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.textContent = 'Copied!';
    btn.style.color = '#10b981';
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.style.color = '';
    }, 2000);
  });
});

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
