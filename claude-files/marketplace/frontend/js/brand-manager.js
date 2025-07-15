// Brand Management System for Teneo Marketplace
// Handles dynamic brand switching and theme application

class BrandManager {
    constructor() {
        this.currentBrand = 'default';
        this.brandConfig = null;
        this.brandCatalog = null;
        this.defaultBooksData = null;
        this.init();
    }

    async init() {
        // Check for brand parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const brandParam = urlParams.get('brand');
        
        if (brandParam) {
            await this.loadBrand(brandParam);
        } else {
            // Load default brand
            this.currentBrand = 'default';
            await this.loadDefaultData();
        }
        
        this.applyBrandTheme();
        this.updateBrandContent();
        
        // Apply template-based theme if template processor is available
        if (window.templateProcessor) {
            await window.templateProcessor.applyTemplateTheme(this.currentBrand);
        }
    }

    async loadBrand(brandId) {
        try {
            console.log(`Loading brand: ${brandId}`);
            
            // Load brand configuration
            const configResponse = await fetch(`/brands/${brandId}/config.json`);
            if (!configResponse.ok) {
                throw new Error(`Failed to load brand config: ${configResponse.status}`);
            }
            this.brandConfig = await configResponse.json();
            
            // Load brand catalog
            const catalogResponse = await fetch(`/brands/${brandId}/catalog.json`);
            if (!catalogResponse.ok) {
                throw new Error(`Failed to load brand catalog: ${catalogResponse.status}`);
            }
            this.brandCatalog = await catalogResponse.json();
            
            this.currentBrand = brandId;
            console.log(`Brand ${brandId} loaded successfully`);
            
        } catch (error) {
            console.error('Error loading brand:', error);
            // Fallback to default
            await this.loadDefaultData();
            this.currentBrand = 'default';
        }
    }

    async loadDefaultData() {
        // Load default books from API
        try {
            const response = await fetch(window.API_CONFIG.buildURL(window.API_CONFIG.ENDPOINTS.BOOKS));
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.defaultBooksData = result.data;
                }
            }
        } catch (error) {
            console.error('Error loading default books:', error);
        }
    }

    applyBrandTheme() {
        const body = document.body;
        
        // Remove existing brand theme classes
        body.classList.remove('true-earth-theme', 'wealth-wise-theme', 'teneo-theme');
        
        if (this.currentBrand !== 'default' && this.brandConfig) {
            // Add brand-specific theme class
            body.classList.add(`${this.currentBrand}-theme`);
            
            // Load brand-specific CSS
            this.loadBrandCSS();
            
            // Apply brand colors to CSS variables
            this.applyBrandColors();
        } else if (this.currentBrand === 'default') {
            // Apply default brand theme using template processor
            this.applyDefaultTheme();
        }
    }

    loadBrandCSS() {
        const brandCSSPath = `/brands/${this.currentBrand}/css/theme.css`;
        
        // Check if CSS is already loaded
        const existingLink = document.querySelector(`link[href="${brandCSSPath}"]`);
        if (existingLink) return;
        
        // Create and append CSS link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = brandCSSPath;
        link.onload = () => console.log(`Brand CSS loaded: ${brandCSSPath}`);
        link.onerror = () => console.error(`Failed to load brand CSS: ${brandCSSPath}`);
        document.head.appendChild(link);
    }

    applyBrandColors() {
        if (!this.brandConfig || !this.brandConfig.theme) return;
        
        const theme = this.brandConfig.theme;
        const root = document.documentElement;
        
        // Apply theme colors to CSS custom properties
        Object.entries(theme).forEach(([key, value]) => {
            if (typeof value === 'string' && value.startsWith('#')) {
                // Convert camelCase to kebab-case for CSS variables
                const cssVar = '--brand-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
                root.style.setProperty(cssVar, value);
            }
        });
    }

    updateBrandContent() {
        if (this.currentBrand === 'default') {
            this.updateDefaultContent();
        } else {
            this.updateBrandedContent();
        }
    }

    updateDefaultContent() {
        // Update with default Teneo Books content
        this.updateTitle('Teneo Book Marketplace');
        this.updateLogo('Teneo Books');
        this.updateHeroContent(
            'Discover Your Next Great Read',
            'Open source book marketplace connecting readers and sellers'
        );
    }

    updateBrandedContent() {
        if (!this.brandConfig) return;
        
        // Update page title
        this.updateTitle(this.brandConfig.seo.title);
        
        // Update logo
        this.updateLogo(`${this.brandConfig.logo} ${this.brandConfig.name}`);
        
        // Update hero content
        this.updateHeroContent(
            this.brandConfig.copy.heroTitle,
            this.brandConfig.copy.heroSubtitle
        );
        
        // Add urgency banner if enabled
        if (this.brandConfig.features.urgency) {
            this.addUrgencyBanner(this.brandConfig.copy.urgencyText);
        }
        
        // Update navigation
        this.updateNavigation();
    }

    updateTitle(title) {
        document.title = title;
        
        // Update meta description
        if (this.brandConfig && this.brandConfig.seo.description) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = this.brandConfig.seo.description;
        }
    }

    updateLogo(logoText) {
        const logoElement = document.querySelector('.logo');
        if (logoElement) {
            logoElement.textContent = logoText;
        }
    }

    updateHeroContent(title, subtitle) {
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            heroTitle.textContent = title;
        }
        
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) {
            heroSubtitle.textContent = subtitle;
        }
    }

    addUrgencyBanner(urgencyText) {
        // Check if banner already exists
        if (document.querySelector('.urgency-banner')) return;
        
        const banner = document.createElement('div');
        banner.className = 'urgency-banner';
        banner.textContent = urgencyText;
        
        // Insert after header
        const header = document.querySelector('.header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(banner, header.nextSibling);
        }
    }

    updateNavigation() {
        if (!this.brandConfig) return;
        
        const nav = document.querySelector('.nav');
        if (!nav) return;
        
        // Add brand-specific navigation items
        const aboutLink = nav.querySelector('a[href*="about"]');
        if (aboutLink) {
            aboutLink.href = `/brands/${this.currentBrand}/pages/about.html`;
        }
        
        // Add free gift link if enabled
        if (this.brandConfig.features.freeGift) {
            const freeGiftLink = document.createElement('a');
            freeGiftLink.href = `/brands/${this.currentBrand}/pages/free-gift.html`;
            freeGiftLink.className = 'nav-link';
            freeGiftLink.textContent = 'Free Gift';
            freeGiftLink.style.color = this.brandConfig.theme.accentColor || '#d4af37';
            nav.appendChild(freeGiftLink);
        }
    }

    getBooksData() {
        if (this.currentBrand === 'default') {
            return this.defaultBooksData || [];
        } else if (this.brandCatalog) {
            return this.brandCatalog.books || [];
        }
        return [];
    }

    getCollections() {
        if (this.brandCatalog && this.brandCatalog.collections) {
            return this.brandCatalog.collections;
        }
        return [];
    }

    getFreeGift() {
        if (this.brandCatalog && this.brandCatalog.freeGift) {
            return this.brandCatalog.freeGift;
        }
        return null;
    }

    // Brand switching functionality
    switchBrand(brandId) {
        const url = new URL(window.location);
        if (brandId === 'default') {
            url.searchParams.delete('brand');
        } else {
            url.searchParams.set('brand', brandId);
        }
        window.location.href = url.toString();
    }

    // Create brand selector dropdown
    createBrandSelector() {
        const selector = document.createElement('select');
        selector.className = 'brand-selector';
        selector.style.cssText = `
            background: var(--bg-secondary, #161b22);
            color: var(--text-primary, #f0f6fc);
            border: 1px solid var(--border-color, #30363d);
            border-radius: 6px;
            padding: 0.5rem;
            font-size: 0.9rem;
            cursor: pointer;
        `;
        
        // Add options
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = 'Teneo Books (Default)';
        defaultOption.selected = this.currentBrand === 'default';
        selector.appendChild(defaultOption);
        
        const trueEarthOption = document.createElement('option');
        trueEarthOption.value = 'true-earth';
        trueEarthOption.textContent = '🌍 True Earth Publications';
        trueEarthOption.selected = this.currentBrand === 'true-earth';
        selector.appendChild(trueEarthOption);
        
        const wealthWiseOption = document.createElement('option');
        wealthWiseOption.value = 'wealth-wise';
        wealthWiseOption.textContent = '💰 WealthWise';
        wealthWiseOption.selected = this.currentBrand === 'wealth-wise';
        selector.appendChild(wealthWiseOption);
        
        const teneoOption = document.createElement('option');
        teneoOption.value = 'teneo';
        teneoOption.textContent = '🚀 Teneo';
        teneoOption.selected = this.currentBrand === 'teneo';
        selector.appendChild(teneoOption);
        
        // Add change handler
        selector.addEventListener('change', (e) => {
            this.switchBrand(e.target.value);
        });
        
        return selector;
    }

    // Utility method to check if a brand feature is enabled
    isFeatureEnabled(feature) {
        return this.brandConfig && this.brandConfig.features && this.brandConfig.features[feature];
    }

    // Apply default brand theme using template variables
    async applyDefaultTheme() {
        try {
            if (window.templateProcessor) {
                const variables = await window.templateProcessor.loadBrandVariables('default');
                window.templateProcessor.applyCSSVariables(variables);
                window.templateProcessor.updatePageContent(variables);
            }
        } catch (error) {
            console.error('Error applying default theme:', error);
        }
    }

    // Load brand variables for template processing
    async loadBrandVariables(brandId) {
        if (window.templateProcessor) {
            return await window.templateProcessor.loadBrandVariables(brandId);
        }
        return {};
    }

    // Generate brand website using templates
    async generateBrandWebsite(brandId, templateNames = ['base.html']) {
        if (window.templateProcessor) {
            return await window.templateProcessor.generateBrandWebsite(brandId, templateNames);
        }
        throw new Error('Template processor not available');
    }

    // Get brand-specific configuration value
    getConfig(path) {
        if (!this.brandConfig) return null;
        
        const pathArray = path.split('.');
        let current = this.brandConfig;
        
        for (const key of pathArray) {
            if (current && current[key] !== undefined) {
                current = current[key];
            } else {
                return null;
            }
        }
        
        return current;
    }
}

// Global brand manager instance
let brandManager;

// Initialize brand manager when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    brandManager = new BrandManager();
    
    // Make brand manager globally available
    window.brandManager = brandManager;
    
    // Add brand selector to header (optional)
    const header = document.querySelector('.header .container');
    if (header) {
        const selector = brandManager.createBrandSelector();
        selector.style.marginLeft = 'auto';
        header.appendChild(selector);
    }
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrandManager;
}