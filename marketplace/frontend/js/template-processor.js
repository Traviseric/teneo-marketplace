// Template Processing System for Teneo Marketplace
// Integrates master templates with brand-specific variables

class TemplateProcessor {
    constructor() {
        this.templatesCache = new Map();
        this.variablesCache = new Map();
    }

    /**
     * Process template with brand variables
     * @param {string} templatePath - Path to template file
     * @param {object} variables - Brand variables object
     * @returns {string} - Processed HTML
     */
    async processTemplate(templatePath, variables) {
        try {
            // Get template content
            const templateContent = await this.loadTemplate(templatePath);
            
            // Process variables
            const processedHTML = this.replaceVariables(templateContent, variables);
            
            return processedHTML;
        } catch (error) {
            console.error('Error processing template:', error);
            throw error;
        }
    }

    /**
     * Load template from file or cache
     * @param {string} templatePath - Path to template
     * @returns {string} - Template content
     */
    async loadTemplate(templatePath) {
        // Check cache first
        if (this.templatesCache.has(templatePath)) {
            return this.templatesCache.get(templatePath);
        }

        try {
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error(`Failed to load template: ${response.status}`);
            }
            
            const content = await response.text();
            this.templatesCache.set(templatePath, content);
            return content;
        } catch (error) {
            console.error(`Error loading template ${templatePath}:`, error);
            throw error;
        }
    }

    /**
     * Load brand variables from JSON file
     * @param {string} brandId - Brand identifier
     * @returns {object} - Brand variables
     */
    async loadBrandVariables(brandId) {
        const cacheKey = `variables-${brandId}`;
        
        // Check cache first
        if (this.variablesCache.has(cacheKey)) {
            return this.variablesCache.get(cacheKey);
        }

        try {
            const variablesPath = `/brands/${brandId}/variables.json`;
            const response = await fetch(variablesPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load variables for brand ${brandId}`);
            }
            
            const variables = await response.json();
            this.variablesCache.set(cacheKey, variables);
            return variables;
        } catch (error) {
            console.error(`Error loading variables for brand ${brandId}:`, error);
            // Return empty object as fallback
            return {};
        }
    }

    /**
     * Replace template variables with actual values
     * @param {string} template - Template content with {{VARIABLES}}
     * @param {object} variables - Object with variable values
     * @returns {string} - Processed template
     */
    replaceVariables(template, variables) {
        let processed = template;

        // Process each variable in the template
        Object.keys(variables).forEach(key => {
            const value = variables[key];
            
            // Handle {{VARIABLE|default}} pattern
            const regexWithDefault = new RegExp(`{{${key}\\|([^}]*?)}}`, 'g');
            processed = processed.replace(regexWithDefault, value || '$1');
            
            // Handle simple {{VARIABLE}} pattern
            const regexSimple = new RegExp(`{{${key}}}`, 'g');
            processed = processed.replace(regexSimple, value || '');
        });

        // Clean up any remaining variables with defaults
        processed = processed.replace(/{{([^|]+)\|([^}]+)}}/g, '$2');
        
        // Remove any unmatched variables
        processed = processed.replace(/{{[^}]+}}/g, '');

        return processed;
    }

    /**
     * Generate a complete brand website using templates
     * @param {string} brandId - Brand identifier
     * @param {Array} templateNames - Array of template names to generate
     * @returns {object} - Map of template names to processed HTML
     */
    async generateBrandWebsite(brandId, templateNames = ['base.html']) {
        try {
            // Load brand variables
            const variables = await this.loadBrandVariables(brandId);
            
            const generatedPages = new Map();
            
            // Process each template
            for (const templateName of templateNames) {
                const templatePath = `/templates/${templateName}`;
                const processedHTML = await this.processTemplate(templatePath, variables);
                generatedPages.set(templateName, processedHTML);
            }
            
            return generatedPages;
        } catch (error) {
            console.error('Error generating brand website:', error);
            throw error;
        }
    }

    /**
     * Apply template-based theme to current page
     * @param {string} brandId - Brand identifier
     */
    async applyTemplateTheme(brandId) {
        try {
            const variables = await this.loadBrandVariables(brandId);
            
            // Apply CSS variables from brand config
            this.applyCSSVariables(variables);
            
            // Update page content with brand variables
            this.updatePageContent(variables);
            
        } catch (error) {
            console.error('Error applying template theme:', error);
        }
    }

    /**
     * Apply CSS variables from brand configuration
     * @param {object} variables - Brand variables
     */
    applyCSSVariables(variables) {
        const root = document.documentElement;
        
        // Map brand variables to CSS custom properties
        const cssVariableMap = {
            'PRIMARY_COLOR': '--primary-color',
            'ACCENT_COLOR': '--accent-color',
            'TEXT_COLOR': '--text-color',
            'BG_COLOR': '--bg-color',
            'SECONDARY_BG': '--secondary-bg',
            'FONT_MAIN': '--font-main',
            'FONT_HEADING': '--font-heading'
        };
        
        Object.entries(cssVariableMap).forEach(([varKey, cssVar]) => {
            if (variables[varKey]) {
                root.style.setProperty(cssVar, variables[varKey]);
            }
        });
    }

    /**
     * Update page content with brand variables
     * @param {object} variables - Brand variables
     */
    updatePageContent(variables) {
        // Update page title
        if (variables.BRAND_NAME && variables.TAGLINE) {
            document.title = `${variables.BRAND_NAME} - ${variables.TAGLINE}`;
        }
        
        // Update meta description
        if (variables.META_DESCRIPTION) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = 'description';
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = variables.META_DESCRIPTION;
        }
        
        // Update common elements
        this.updateElementsBySelector('.brand-name', variables.BRAND_NAME);
        this.updateElementsBySelector('.brand-tagline', variables.TAGLINE);
        this.updateElementsBySelector('.hero-headline', variables.HERO_HEADLINE);
        this.updateElementsBySelector('.hero-subheadline', variables.HERO_SUBHEADLINE);
        this.updateElementsBySelector('.cta-button', variables.BUTTON_TEXT);
    }

    /**
     * Update elements by CSS selector
     * @param {string} selector - CSS selector
     * @param {string} content - New content
     */
    updateElementsBySelector(selector, content) {
        if (!content) return;
        
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (element.tagName.toLowerCase() === 'input') {
                element.value = content;
            } else {
                element.textContent = content;
            }
        });
    }

    /**
     * Create template variables object from existing brand config
     * @param {object} brandConfig - Existing brand configuration
     * @returns {object} - Template variables object
     */
    createVariablesFromConfig(brandConfig) {
        const variables = {};
        
        // Map common config properties to template variables
        if (brandConfig.name) variables.BRAND_NAME = brandConfig.name;
        if (brandConfig.tagline) variables.TAGLINE = brandConfig.tagline;
        if (brandConfig.description) variables.META_DESCRIPTION = brandConfig.description;
        
        // Map theme colors
        if (brandConfig.theme) {
            const theme = brandConfig.theme;
            if (theme.primaryColor) variables.PRIMARY_COLOR = theme.primaryColor;
            if (theme.accentColor) variables.ACCENT_COLOR = theme.accentColor;
            if (theme.textColor) variables.TEXT_COLOR = theme.textColor;
            if (theme.backgroundColor) variables.BG_COLOR = theme.backgroundColor;
            if (theme.fontFamily) variables.FONT_MAIN = theme.fontFamily;
            if (theme.headingFont) variables.FONT_HEADING = theme.headingFont;
        }
        
        // Map copy/content
        if (brandConfig.copy) {
            const copy = brandConfig.copy;
            if (copy.heroTitle) variables.HERO_HEADLINE = copy.heroTitle;
            if (copy.heroSubtitle) variables.HERO_SUBHEADLINE = copy.heroSubtitle;
            if (copy.ctaButton) variables.BUTTON_TEXT = copy.ctaButton;
        }
        
        return variables;
    }

    /**
     * Generate and download processed template
     * @param {string} brandId - Brand identifier
     * @param {string} templateName - Template to generate
     * @param {string} filename - Output filename
     */
    async downloadProcessedTemplate(brandId, templateName = 'base.html', filename = null) {
        try {
            const variables = await this.loadBrandVariables(brandId);
            const templatePath = `/templates/${templateName}`;
            const processedHTML = await this.processTemplate(templatePath, variables);
            
            // Create download
            const blob = new Blob([processedHTML], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `${brandId}-${templateName}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error downloading template:', error);
        }
    }

    /**
     * Clear template and variables cache
     */
    clearCache() {
        this.templatesCache.clear();
        this.variablesCache.clear();
    }

    /**
     * Preview template with variables in new window
     * @param {string} brandId - Brand identifier  
     * @param {string} templateName - Template to preview
     */
    async previewTemplate(brandId, templateName = 'base.html') {
        try {
            const variables = await this.loadBrandVariables(brandId);
            const templatePath = `/templates/${templateName}`;
            const processedHTML = await this.processTemplate(templatePath, variables);
            
            // Open in new window
            const previewWindow = window.open('', '_blank');
            previewWindow.document.write(processedHTML);
            previewWindow.document.close();
            
        } catch (error) {
            console.error('Error previewing template:', error);
        }
    }
}

// Global template processor instance
let templateProcessor;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    templateProcessor = new TemplateProcessor();
    window.templateProcessor = templateProcessor;
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateProcessor;
}