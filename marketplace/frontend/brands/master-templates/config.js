// Complete Brand Configuration System
const brandConfig = {
    // ==========================================
    // BRAND IDENTITY
    // ==========================================
    BRAND_NAME: "EliteMinds Publishing",
    TAGLINE: "Transform Your Expertise Into Authority",
    META_DESCRIPTION: "Professional books that establish your authority and grow your business",
    
    // Brand Colors (just change these!)
    PRIMARY_COLOR: "#1E40AF",    // Main brand color
    ACCENT_COLOR: "#F59E0B",      // CTA buttons, highlights
    TEXT_COLOR: "#111827",        // Body text
    BG_COLOR: "#FFFFFF",          // Background
    SECONDARY_BG: "#F3F4F6",      // Alternate sections
    
    // Typography
    FONT_MAIN: "'Inter', sans-serif",
    FONT_HEADING: "'Poppins', sans-serif",
    
    // ==========================================
    // HOMEPAGE CONTENT (index.html)
    // ==========================================
    // Hero Section
    HERO_HEADLINE: "Your Knowledge Deserves a Bigger Stage",
    HERO_SUBHEADLINE: "We transform your expertise into professionally published books that attract clients and build authority",
    BUTTON_TEXT: "Get Your Free Publishing Guide",
    
    // Trust Indicators
    TRUST_1: "30-Day Guarantee",
    TRUST_2: "10,000+ Readers",
    TRUST_3: "4.9/5 Rating",
    
    // Features
    FEATURES_HEADLINE: "Why Industry Leaders Choose Us",
    FEATURE_1_ICON: "fas fa-rocket",
    FEATURE_1_TITLE: "Published in 30 Days",
    FEATURE_1_DESC: "From idea to published book on Amazon in just 30 days",
    
    FEATURE_2_ICON: "fas fa-crown",
    FEATURE_2_TITLE: "Authority Positioning", 
    FEATURE_2_DESC: "Books designed to establish you as the go-to expert",
    
    FEATURE_3_ICON: "fas fa-chart-line",
    FEATURE_3_TITLE: "Revenue Focused",
    FEATURE_3_DESC: "Books that generate leads and grow your business",
    
    // Sample Books for Homepage
    BOOKS_HEADLINE: "Published Success Stories",
    BOOK_1_TITLE: "The CEO's Guide to Digital Transformation",
    BOOK_1_DESC: "How modern leaders navigate technology change",
    BOOK_1_PRICE: "19.99",
    BOOK_1_COVER: "images/book-1-cover.jpg",
    BOOK_1_LINK: "https://amazon.com/book1",
    
    // Testimonials
    TESTIMONIAL_1_TEXT: "This book tripled my consulting leads in 60 days. Best investment I've made.",
    TESTIMONIAL_1_NAME: "Sarah Chen",
    TESTIMONIAL_1_ROLE: "CEO, TechForward Consulting",
    TESTIMONIAL_1_IMAGE: "images/testimonial-1.jpg",
    
    // Homepage CTA
    CTA_HEADLINE: "Ready to Become a Published Author?",
    CTA_SUBHEADLINE: "Join 500+ experts who've transformed their business with a book",
    CTA_BUTTON_TEXT: "Start Your Book Today",
    CTA_LINK: "https://calendly.com/your-link",
    
    // ==========================================
    // LIBRARY PAGE CONTENT (library.html)
    // ==========================================
    LIBRARY_HEADLINE: "Transform Your Life Through Reading",
    LIBRARY_SUBHEADLINE: "Instant downloads, beautiful hardcovers, and life-changing insights",
    LIBRARY_TAGLINE: "Transformative Books for Growth",
    LIBRARY_META_DESC: "Browse our collection of books designed to transform your life and business",
    
    // Categories
    CATEGORY_1: "Mindset",
    CATEGORY_2: "Business", 
    CATEGORY_3: "Health",
    
    // Book 1 - Complete Details
    BOOK_1_TITLE: "The Hidden Triggers of Elite Performance",
    BOOK_1_AUTHOR: "Dr. Sarah Chen",
    BOOK_1_DESC: "Unlock the psychological patterns that separate high achievers from everyone else",
    BOOK_1_LONG_DESC: "This transformative book reveals the hidden psychological patterns that separate high achievers from everyone else. Based on 10 years of research, you'll discover the exact mental frameworks that create extraordinary results.",
    BOOK_1_PRICE: "19.99",
    BOOK_1_ORIGINAL: "29.99",
    BOOK_1_HARDCOVER_PRICE: "34.99",
    BOOK_1_BUNDLE_PRICE: "44.99",
    BOOK_1_COVER: "images/book-1-cover.jpg",
    BOOK_1_BADGE: "Bestseller",
    BOOK_1_RATING: "4.8",
    BOOK_1_REVIEWS: "127",
    BOOK_1_GUMROAD_ID: "elite-performance",
    BOOK_1_LULU_URL: "https://www.lulu.com/shop/your-book",
    
    // Book 2 - Complete Details
    BOOK_2_TITLE: "Scale Your Business to 7 Figures",
    BOOK_2_AUTHOR: "Marcus Johnson",
    BOOK_2_DESC: "Proven strategies for exponential business growth",
    BOOK_2_LONG_DESC: "Learn the proven strategies that have helped hundreds of entrepreneurs scale their businesses to 7 figures and beyond. This practical guide gives you the exact playbook for exponential growth.",
    BOOK_2_PRICE: "24.99",
    BOOK_2_ORIGINAL: "34.99",
    BOOK_2_HARDCOVER_PRICE: "39.99",
    BOOK_2_BUNDLE_PRICE: "54.99",
    BOOK_2_COVER: "images/book-2-cover.jpg",
    BOOK_2_BADGE: "New Release",
    BOOK_2_RATING: "4.9",
    BOOK_2_REVIEWS: "89",
    BOOK_2_GUMROAD_ID: "scale-business",
    BOOK_2_LULU_URL: "https://www.lulu.com/shop/scale-business",
    
    // Bundle 1
    BUNDLE_1_NAME: "Success Bundle",
    BUNDLE_1_TITLE: "The Complete Success Library",
    BUNDLE_1_DESC: "Everything you need to transform your life and business",
    BUNDLE_1_BOOKS: "3 Books",
    BUNDLE_1_BADGE: "Save 40%",
    BUNDLE_1_ITEM_1: "The Hidden Triggers of Elite Performance",
    BUNDLE_1_ITEM_2: "Scale Your Business to 7 Figures",
    BUNDLE_1_ITEM_3: "Peak Performance Habits",
    BUNDLE_1_BONUS: "BONUS: Complete Workbook Collection",
    BUNDLE_1_PRICE: "49.99",
    BUNDLE_1_ORIGINAL: "84.99",
    BUNDLE_1_SAVINGS: "35",
    BUNDLE_1_GUMROAD_ID: "success-bundle",
    
    // ==========================================
    // THANK YOU PAGE (thank-you.html)
    // ==========================================
    THANK_YOU_HEADLINE: "Success! Check Your Email",
    THANK_YOU_SUBHEADLINE: "Your free guide is on its way to your inbox",
    NEXT_STEPS_TITLE: "Here's what happens next:",
    STEP_1: "Check your email for your free guide (arrives in 1-2 minutes)",
    STEP_2: "Whitelist our email address to ensure you receive all updates",
    STEP_3: "Watch for exclusive tips and special offers in your inbox",
    
    // Welcome Offer
    OFFER_TITLE: "🎁 Exclusive Welcome Offer",
    OFFER_TEXT: "As a new subscriber, get 30% off any book in our library",
    OFFER_CODE: "WELCOME30",
    OFFER_CTA: "Browse Our Books",
    
    // Support
    SUPPORT_TEXT: "Didn't receive your email?",
    SUPPORT_EMAIL: "support@eliteminds.com",
    SUPPORT_LINK_TEXT: "Contact us",
    SOCIAL_PROOF: "Join 10,000+ readers transforming their lives",
    
    // ==========================================
    // PURCHASE SUCCESS PAGE (purchase-success.html)
    // ==========================================
    PURCHASE_HEADLINE: "Order Complete!",
    PURCHASE_SUBHEADLINE: "Thank you for your purchase",
    ORDER_DETAILS_TITLE: "Order Details",
    
    // Download Section
    DOWNLOAD_TITLE: "Digital Download Instructions",
    DOWNLOAD_TEXT: "Your download link has been sent to your email address. You can also download your files directly:",
    DOWNLOAD_BUTTON: "Download Your Files",
    
    // Shipping Section
    SHIPPING_TITLE: "Shipping Information",
    SHIPPING_TEXT: "Your hardcover book will be printed and shipped within 3-5 business days. You'll receive tracking information via email once your order ships.",
    
    // What's Next
    NEXT_TITLE: "What's Next?",
    NEXT_1_TITLE: "Check Your Email",
    NEXT_1_TEXT: "We've sent your receipt and download links",
    NEXT_2_TITLE: "Start Reading",
    NEXT_2_TEXT: "Download your book and begin your journey",
    NEXT_3_TITLE: "Join Our Community",
    NEXT_3_TEXT: "Connect with other readers in our private group",
    
    // Cross-sell
    CROSSSELL_TITLE: "📚 Complete Your Collection",
    CROSSSELL_TEXT: "Readers who bought this book also love:",
    CROSSSELL_1_TITLE: "Advanced Strategies",
    CROSSSELL_1_DESC: "Take your skills to the next level",
    CROSSSELL_2_TITLE: "Complete Bundle",
    CROSSSELL_2_DESC: "Save 40% on our full collection",
    
    // Footer Actions
    CONTINUE_SHOPPING: "Continue Shopping",
    NEED_HELP: "Need Help?",
    MY_ACCOUNT: "My Account",
    SECURE_CHECKOUT: "Secure Checkout",
    GUARANTEE: "30-Day Guarantee",
    SUPPORT: "24/7 Support",
    
    // ==========================================
    // FOOTER & COMMON ELEMENTS
    // ==========================================
    FOOTER_TAGLINE: "Transforming expertise into published authority since 2020",
    
    // Social Media
    SOCIAL_FACEBOOK: "https://facebook.com/eliteminds",
    SOCIAL_TWITTER: "https://twitter.com/eliteminds",
    SOCIAL_INSTAGRAM: "https://instagram.com/eliteminds",
    
    // ==========================================
    // TECHNICAL SETTINGS
    // ==========================================
    // Analytics
    ANALYTICS_ID: "G-XXXXXXXXXX",
    FACEBOOK_PIXEL_ID: "YOUR_PIXEL_ID",
    CONVERSION_ID: "signup",
    
    // Form Action (ConvertKit, ActiveCampaign, etc)
    FORM_ACTION: "https://formspree.io/f/YOUR_FORM_ID",
    
    // Email Settings
    SUPPORT_EMAIL: "support@eliteminds.com",
    
    // Announcement Bar (Optional)
    ANNOUNCEMENT_TEXT: "🚀 Limited Time: 20% Off All Books - Use Code SAVE20"
};

// ==========================================
// TEMPLATE PROCESSING SYSTEM
// ==========================================

/**
 * Process template and replace all variables
 * @param {string} htmlContent - The HTML template content
 * @param {object} config - The brand configuration object
 * @returns {string} - Processed HTML with variables replaced
 */
function processTemplate(htmlContent, config) {
    let processed = htmlContent;
    
    // Replace all {{VARIABLE|default}} patterns
    Object.keys(config).forEach(key => {
        const regex = new RegExp(`{{${key}\\|?[^}]*}}`, 'g');
        processed = processed.replace(regex, config[key]);
    });
    
    // Clean up any remaining variables (use defaults)
    processed = processed.replace(/{{([^|]+)\|([^}]+)}}/g, '$2');
    
    // Remove any unmatched variables
    processed = processed.replace(/{{[^}]+}}/g, '');
    
    return processed;
}

/**
 * Generate customized HTML for a brand
 * @param {object} brandConfig - The brand configuration
 * @param {string} templateName - Which template to process
 */
async function generateBrandWebsite(brandConfig, templateName = 'index.html') {
    try {
        // Fetch the template
        const response = await fetch(templateName);
        const template = await response.text();
        
        // Process with config
        const customized = processTemplate(template, brandConfig);
        
        // Option 1: Download the file
        downloadHTML(customized, `${brandConfig.BRAND_NAME.toLowerCase().replace(/\s/g, '-')}-${templateName}`);
        
        // Option 2: Display in console
        console.log(`✅ ${templateName} generated successfully!`);
        
        // Option 3: Copy to clipboard
        navigator.clipboard.writeText(customized).then(() => {
            console.log('📋 HTML copied to clipboard!');
        });
        
    } catch (error) {
        console.error('Error generating website:', error);
    }
}

/**
 * Download HTML content as a file
 * @param {string} content - The HTML content
 * @param {string} filename - The filename to save as
 */
function downloadHTML(content, filename) {
    const blob = new Blob([content], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

/**
 * Generate all templates for a brand at once
 * @param {object} config - The brand configuration
 */
async function generateAllTemplates(config) {
    const templates = [
        'index.html',
        'library.html',
        'thank-you.html',
        'purchase-success.html'
    ];
    
    for (const template of templates) {
        await generateBrandWebsite(config, template);
        // Add delay to prevent overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('🎉 All templates generated successfully!');
}

// ==========================================
// QUICK BRAND GENERATOR
// ==========================================

/**
 * Quick function to create a new brand config
 * @param {object} quickConfig - Basic brand details
 * @returns {object} - Full brand configuration
 */
function createBrandConfig(quickConfig) {
    // Start with the default config
    const newConfig = { ...brandConfig };
    
    // Override with quick config values
    Object.keys(quickConfig).forEach(key => {
        newConfig[key] = quickConfig[key];
    });
    
    return newConfig;
}

// Example usage:
// const myNewBrand = createBrandConfig({
//     BRAND_NAME: "Success Books",
//     PRIMARY_COLOR: "#059669",
//     ACCENT_COLOR: "#DC2626",
//     HERO_HEADLINE: "Unlock Your Full Potential"
// });
// generateAllTemplates(myNewBrand);

// ==========================================
// EXPORT FOR USE
// ==========================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        brandConfig,
        processTemplate,
        generateBrandWebsite,
        generateAllTemplates,
        createBrandConfig
    };
}