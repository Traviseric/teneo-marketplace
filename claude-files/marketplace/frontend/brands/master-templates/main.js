// main.js - Conversion Tracking & Utility Functions

// ==========================================
// ANALYTICS & TRACKING
// ==========================================

/**
 * Initialize all tracking pixels and analytics
 */
function initializeTracking() {
    // Get config from URL parameters or default
    const config = window.brandConfig || {};
    
    // Google Analytics 4
    if (config.ANALYTICS_ID && config.ANALYTICS_ID !== 'G-XXXXXXXXXX') {
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', config.ANALYTICS_ID);
        
        console.log('✅ Google Analytics initialized');
    }
    
    // Facebook Pixel
    if (config.FACEBOOK_PIXEL_ID && config.FACEBOOK_PIXEL_ID !== 'YOUR_PIXEL_ID') {
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', config.FACEBOOK_PIXEL_ID);
        fbq('track', 'PageView');
        
        console.log('✅ Facebook Pixel initialized');
    }
}

/**
 * Track conversion events
 * @param {string} eventName - The event to track
 * @param {object} eventData - Additional event data
 */
function trackConversion(eventName, eventData = {}) {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
            ...eventData,
            'event_category': 'conversion',
            'event_label': window.location.pathname
        });
    }
    
    // Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, eventData);
    }
    
    console.log(`📊 Tracked: ${eventName}`, eventData);
}

// ==========================================
// FORM HANDLING
// ==========================================

/**
 * Handle all form submissions
 */
function initializeForms() {
    // Email capture forms
    document.querySelectorAll('form[data-capture="email"]').forEach(form => {
        form.addEventListener('submit', handleEmailCapture);
    });
    
    // Purchase forms
    document.querySelectorAll('form[data-capture="purchase"]').forEach(form => {
        form.addEventListener('submit', handlePurchase);
    });
}

/**
 * Handle email capture form submission
 * @param {Event} e - Form submit event
 */
async function handleEmailCapture(e) {
    e.preventDefault();
    
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Update button state
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    try {
        // Track the lead
        trackConversion('Lead', {
            value: 1.0,
            currency: 'USD',
            content_name: 'email_capture'
        });
        
        // Submit to form handler
        const response = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            // Redirect to thank you page
            window.location.href = '/thank-you.html';
        } else {
            throw new Error('Form submission failed');
        }
        
    } catch (error) {
        console.error('Form error:', error);
        alert('Sorry, there was an error. Please try again.');
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// ==========================================
// E-COMMERCE FUNCTIONS
// ==========================================

/**
 * Add item to cart
 * @param {object} product - Product details
 */
function addToCart(product) {
    // Get existing cart or create new
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    // Save cart
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart UI
    updateCartUI();
    
    // Track event
    trackConversion('add_to_cart', {
        currency: 'USD',
        value: parseFloat(product.price),
        items: [{
            item_id: product.id,
            item_name: product.title,
            price: parseFloat(product.price),
            quantity: 1
        }]
    });
    
    // Show confirmation
    showNotification(`${product.title} added to cart!`);
}

/**
 * Update cart UI elements
 */
function updateCartUI() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Update all cart count elements
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = cartCount;
    });
}

/**
 * Quick buy function for Gumroad
 * @param {string} gumroadId - Gumroad product ID
 */
function quickBuy(gumroadId) {
    if (typeof Gumroad !== 'undefined') {
        Gumroad.openOverlay(gumroadId);
        
        // Track initiate checkout
        trackConversion('InitiateCheckout', {
            content_type: 'product',
            content_ids: [gumroadId]
        });
    } else {
        window.location.href = `https://gum.co/${gumroadId}`;
    }
}

// ==========================================
// UI UTILITIES
// ==========================================

/**
 * Show notification toast
 * @param {string} message - Notification message
 * @param {string} type - success, error, info
 */
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transform transition-all duration-500`;
    
    // Set color based on type
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
    };
    
    notification.classList.add(colors[type] || colors.success);
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('translate-y-0');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

/**
 * Smooth scroll to element
 * @param {string} selector - CSS selector
 */
function smoothScrollTo(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href !== '#') {
                smoothScrollTo(href);
            }
        });
    });
}

// ==========================================
// EXIT INTENT POPUP
// ==========================================

let exitIntentShown = false;

/**
 * Initialize exit intent detection
 */
function initializeExitIntent() {
    document.addEventListener('mouseout', (e) => {
        // Only trigger if mouse leaves through the top
        if (!exitIntentShown && e.clientY <= 0) {
            exitIntentShown = true;
            showExitPopup();
        }
    });
}

/**
 * Show exit intent popup
 */
function showExitPopup() {
    const popup = document.getElementById('exitPopup');
    if (popup) {
        popup.classList.remove('hidden');
        trackConversion('ExitIntentShown');
    }
}

// ==========================================
// COUNTDOWN TIMER
// ==========================================

/**
 * Initialize countdown timers
 */
function initializeCountdowns() {
    document.querySelectorAll('[data-countdown]').forEach(element => {
        const endTime = new Date(element.dataset.countdown).getTime();
        
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = endTime - now;
            
            if (distance < 0) {
                clearInterval(timer);
                element.textContent = 'EXPIRED';
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            element.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }, 1000);
    });
}

// ==========================================
// SOCIAL PROOF NOTIFICATIONS
// ==========================================

/**
 * Show random purchase notifications
 */
function initializeSocialProof() {
    const notifications = [
        { name: 'John from Texas', book: 'The Success Mindset', time: '2 minutes ago' },
        { name: 'Sarah from NYC', book: 'Scale Your Business', time: '5 minutes ago' },
        { name: 'Mike from London', book: 'Elite Performance', time: '12 minutes ago' },
        { name: 'Emma from Sydney', book: 'Success Bundle', time: '18 minutes ago' },
        { name: 'David from Toronto', book: 'Business Growth', time: '25 minutes ago' }
    ];
    
    // Show notification every 30-60 seconds
    setInterval(() => {
        const random = notifications[Math.floor(Math.random() * notifications.length)];
        showSocialProofNotification(random);
    }, 30000 + Math.random() * 30000);
}

/**
 * Show social proof notification
 * @param {object} data - Notification data
 */
function showSocialProofNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 left-4 bg-white rounded-lg shadow-xl p-4 flex items-center space-x-3 max-w-sm transform transition-all duration-500 translate-y-full';
    
    notification.innerHTML = `
        <div class="flex-shrink-0">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <i class="fas fa-shopping-cart text-green-600"></i>
            </div>
        </div>
        <div class="flex-1">
            <p class="text-sm font-semibold">${data.name}</p>
            <p class="text-xs text-gray-600">Purchased "${data.book}"</p>
            <p class="text-xs text-gray-400">${data.time}</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-y-full');
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-y-full');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// ==========================================
// INITIALIZE EVERYTHING
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing brand website...');
    
    // Core initialization
    initializeTracking();
    initializeForms();
    initializeSmoothScroll();
    updateCartUI();
    
    // Optional features (check if elements exist)
    if (document.querySelector('[data-countdown]')) {
        initializeCountdowns();
    }
    
    if (document.querySelector('[data-social-proof]')) {
        initializeSocialProof();
    }
    
    // Exit intent (only on desktop)
    if (window.innerWidth > 768) {
        initializeExitIntent();
    }
    
    console.log('✅ Website initialized successfully!');
});

// ==========================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ==========================================

window.BrandUtils = {
    trackConversion,
    addToCart,
    quickBuy,
    showNotification,
    smoothScrollTo
};