// Funnel Builder - Core Logic
// Integrates with template-processor.js for variable replacement

class FunnelBuilder {
  constructor() {
    this.selectedTemplate = null;
    this.variables = {};
    this.context = null;
    this.autoSaveInterval = null;
    this.templateProcessor = null;
    this.aiPrompts = null;

    this.init();
  }

  async init() {
    console.log('Initializing Funnel Builder...');

    // Initialize template processor
    if (typeof TemplateProcessor !== 'undefined') {
      this.templateProcessor = new TemplateProcessor();
    }

    // Load AI prompts
    await this.loadAIPrompts();

    // Parse URL context (course integration)
    this.context = this.parseURLContext();

    // Setup UI
    this.setupEventListeners();

    // If context exists (opened from course), show course badge
    if (this.context.course) {
      this.showCourseContext();
    }

    // Check for saved draft
    await this.loadDraftIfExists();

    // If template already selected (from quiz or URL), load it
    if (this.context.template) {
      await this.selectTemplate(this.context.template);
    }

    console.log('Funnel Builder initialized');
  }

  async loadAIPrompts() {
    try {
      const response = await fetch('/funnel-builder/config/funnel-prompts.json');
      if (response.ok) {
        this.aiPrompts = await response.json();
        console.log('AI prompts loaded:', Object.keys(this.aiPrompts.prompts).length, 'prompts');
      } else {
        console.warn('Could not load AI prompts, using fallback');
        this.aiPrompts = null;
      }
    } catch (error) {
      console.error('Error loading AI prompts:', error);
      this.aiPrompts = null;
    }
  }

  parseURLContext() {
    const params = new URLSearchParams(window.location.search);
    return {
      course: params.get('course'),
      lesson: params.get('lesson'),
      step: params.get('step'),
      returnUrl: params.get('returnUrl'),
      template: params.get('template')
    };
  }

  setupEventListeners() {
    // Welcome screen buttons
    document.getElementById('take-quiz-btn')?.addEventListener('click', () => this.showQuiz());
    document.getElementById('choose-template-btn')?.addEventListener('click', () => this.showTemplateGrid());

    // Template selection
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const template = e.currentTarget.dataset.template;
        this.selectTemplate(template);
      });
    });

    // Change template
    document.getElementById('change-template-btn')?.addEventListener('click', () => this.changeTemplate());

    // Export menu
    document.getElementById('export-menu-btn')?.addEventListener('click', () => this.toggleExportMenu());

    // Export options
    document.querySelectorAll('.export-option').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const actions = ['downloadHTML', 'downloadZIP', 'copyToClipboard'];
        this[actions[index]]();
      });
    });

    // Deploy button
    document.getElementById('deploy-btn')?.addEventListener('click', () => this.deployFunnel());

    // Save draft
    document.getElementById('save-draft-btn')?.addEventListener('click', () => this.saveDraft());

    // Back to course
    document.getElementById('back-to-course-btn')?.addEventListener('click', () => this.returnToCourse());

    // Preview modes
    document.getElementById('preview-desktop')?.addEventListener('click', () => this.setPreviewMode('desktop'));
    document.getElementById('preview-tablet')?.addEventListener('click', () => this.setPreviewMode('tablet'));
    document.getElementById('preview-mobile')?.addEventListener('click', () => this.setPreviewMode('mobile'));
    document.getElementById('preview-fullscreen')?.addEventListener('click', () => this.fullscreenPreview());

    // AI prompt modal
    document.getElementById('close-ai-modal')?.addEventListener('click', () => this.closeAIModal());
    document.getElementById('copy-prompt-btn')?.addEventListener('click', () => this.copyPromptToClipboard());
    document.getElementById('auto-generate-btn')?.addEventListener('click', () => this.autoGenerateVariable());

    // Close export dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const exportBtn = document.getElementById('export-menu-btn');
      const exportDropdown = document.getElementById('export-dropdown');
      if (exportBtn && exportDropdown && !exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
        exportDropdown.classList.add('hidden');
      }
    });
  }

  showCourseContext() {
    const badge = document.getElementById('course-context-badge');
    if (badge) {
      badge.classList.remove('hidden');
      badge.classList.add('flex');
    }
  }

  showQuiz() {
    // Load quiz modal (will implement in funnel-wizard.js)
    const modal = document.getElementById('quiz-modal');
    if (modal) {
      modal.classList.remove('hidden');
      // Quiz logic will be in separate file
      this.showNotification('Quiz feature coming soon!', 'info');
    }
  }

  showTemplateGrid() {
    document.getElementById('template-grid')?.classList.remove('hidden');
  }

  async selectTemplate(templateName) {
    console.log('Selecting template:', templateName);

    this.selectedTemplate = templateName;

    // Hide welcome screen
    document.getElementById('welcome-screen')?.classList.add('hidden');

    // Show builder interface
    document.getElementById('builder-interface')?.classList.remove('hidden');

    // Update template info
    this.updateTemplateInfo(templateName);

    // Load template and extract variables
    await this.loadTemplateVariables(templateName);

    // Generate input form
    this.generateVariableInputs();

    // Update preview
    this.updatePreview();

    // Start auto-save
    this.startAutoSave();

    // If course context, focus on specific variable
    if (this.context.step) {
      this.focusOnVariable(this.context.step);
    }
  }

  updateTemplateInfo(templateName) {
    const templates = {
      'book-sales-page': {
        name: 'Gated Sneak-Peak Funnel',
        desc: 'Give away a free chapter to build your list'
      },
      'story-driven': {
        name: 'Story-Driven Sales Funnel',
        desc: 'Use storytelling to pre-sell your book'
      },
      'reader-magnet': {
        name: 'Reader Magnet Funnel',
        desc: 'Free book in exchange for email'
      },
      'direct-sale': {
        name: 'Direct-to-Sale Funnel',
        desc: 'Simple, benefit-focused sales page'
      }
    };

    const info = templates[templateName] || templates['book-sales-page'];

    document.getElementById('selected-template-name').textContent = info.name;
    document.getElementById('selected-template-desc').textContent = info.desc;
  }

  async loadTemplateVariables(templateName) {
    try {
      // Map template names to actual file paths
      const templatePaths = {
        'book-sales-page': '/brands/master-templates/book-sales-page.html',
        'story-driven': '/brands/master-templates/book-sales-page.html', // Will create later
        'reader-magnet': '/brands/master-templates/book-sales-page.html', // Will create later
        'direct-sale': '/brands/master-templates/book-sales-page.html' // Will create later
      };

      const templatePath = templatePaths[templateName];

      // Fetch template
      const response = await fetch(templatePath);
      if (!response.ok) throw new Error('Template not found');

      const templateHTML = await response.text();

      // Extract variables using regex
      this.extractedVariables = this.extractVariablesFromTemplate(templateHTML);

      // Store template HTML
      this.templateHTML = templateHTML;

      console.log('Extracted variables:', this.extractedVariables);
    } catch (error) {
      console.error('Error loading template:', error);
      this.showNotification('Error loading template', 'error');
    }
  }

  extractVariablesFromTemplate(html) {
    const variables = [];
    const seen = new Set();

    // Match {{VARIABLE}} and {{VARIABLE|default}}
    const regex = /\{\{([A-Z_][A-Z0-9_]*?)(?:\|([^}]*?))?\}\}/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const varName = match[1];
      const defaultValue = match[2] || '';

      if (!seen.has(varName)) {
        seen.add(varName);

        variables.push({
          name: varName,
          defaultValue: defaultValue,
          label: this.generateLabelFromVarName(varName),
          description: this.getVariableDescription(varName),
          type: this.guessVariableType(varName),
          required: this.isVariableRequired(varName)
        });
      }
    }

    return variables;
  }

  generateLabelFromVarName(varName) {
    // Convert BOOK_TITLE to "Book Title"
    return varName
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  getVariableDescription(varName) {
    const descriptions = {
      'BOOK_TITLE': 'The title of your book',
      'BOOK_SUBTITLE': 'A compelling subtitle or tagline',
      'AUTHOR_NAME': 'Your name or pen name',
      'AUTHOR_BIO': 'Brief author biography (2-3 sentences)',
      'PRICE': 'Book price (e.g., 19.99)',
      'ORIGINAL_PRICE': 'Original price for discount comparison',
      'BOOK_COVER': 'URL to book cover image',
      'AUTHOR_IMAGE': 'URL to author photo',
      'BENEFIT_1_TITLE': 'First main benefit headline',
      'BENEFIT_1_TEXT': 'Description of first benefit',
      'TESTIMONIAL_1_TEXT': 'Customer testimonial or review',
      'TESTIMONIAL_1_NAME': 'Name of person giving testimonial',
      'FAQ_1_Q': 'Frequently asked question',
      'FAQ_1_A': 'Answer to the question',
      'GUARANTEE_TEXT': 'Money-back guarantee description',
      'CTA_TEXT': 'Call-to-action button text',
      'PRIMARY_COLOR': 'Main brand color (hex code)',
      'ACCENT_COLOR': 'Accent/secondary color',
      'BRAND_NAME': 'Your brand or publisher name'
    };

    return descriptions[varName] || `Value for ${this.generateLabelFromVarName(varName)}`;
  }

  guessVariableType(varName) {
    if (varName.includes('PRICE') || varName.includes('COST')) return 'number';
    if (varName.includes('EMAIL')) return 'email';
    if (varName.includes('URL') || varName.includes('IMAGE') || varName.includes('COVER')) return 'url';
    if (varName.includes('TEXT') || varName.includes('BIO') || varName.includes('DESC')) return 'textarea';
    if (varName.includes('COLOR')) return 'color';
    return 'text';
  }

  isVariableRequired(varName) {
    const required = ['BOOK_TITLE', 'AUTHOR_NAME', 'PRICE'];
    return required.includes(varName);
  }

  generateVariableInputs() {
    const container = document.getElementById('variables-container');
    if (!container) return;

    container.innerHTML = '';

    this.extractedVariables.forEach(variable => {
      const inputDiv = this.createVariableInput(variable);
      container.appendChild(inputDiv);
    });

    // Update completion on input
    container.querySelectorAll('input, textarea').forEach(input => {
      input.addEventListener('input', (e) => {
        this.onVariableChange(e.target.name, e.target.value);
      });
    });
  }

  createVariableInput(variable) {
    const div = document.createElement('div');
    div.className = `variable-input ${variable.required ? 'required' : ''}`;
    div.id = `var-${variable.name}`;

    const label = document.createElement('label');
    label.htmlFor = variable.name;
    label.textContent = variable.label;

    const description = document.createElement('span');
    description.className = 'label-description';
    description.textContent = variable.description;

    let input;
    if (variable.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else {
      input = document.createElement('input');
      input.type = variable.type;
    }

    input.name = variable.name;
    input.id = variable.name;
    input.placeholder = variable.defaultValue || `Enter ${variable.label.toLowerCase()}`;
    input.value = this.variables[variable.name] || variable.defaultValue || '';

    // AI helper buttons
    const aiHelper = document.createElement('div');
    aiHelper.className = 'ai-helper';

    const promptBtn = document.createElement('button');
    promptBtn.type = 'button';
    promptBtn.className = 'ai-prompt-btn';
    promptBtn.innerHTML = '<i class="fas fa-lightbulb mr-1"></i> AI Prompt';
    promptBtn.onclick = () => this.showAIPrompt(variable.name);

    const generateBtn = document.createElement('button');
    generateBtn.type = 'button';
    generateBtn.className = 'ai-generate-btn';
    generateBtn.innerHTML = '<i class="fas fa-magic mr-1"></i> Auto-Generate';
    generateBtn.onclick = () => this.showAIPrompt(variable.name);

    aiHelper.appendChild(promptBtn);
    aiHelper.appendChild(generateBtn);

    div.appendChild(label);
    label.appendChild(description);
    div.appendChild(input);
    div.appendChild(aiHelper);

    return div;
  }

  onVariableChange(varName, value) {
    this.variables[varName] = value;
    this.updatePreview();
    this.updateCompletionProgress();
  }

  updateCompletionProgress() {
    const total = this.extractedVariables.filter(v => v.required).length;
    const filled = this.extractedVariables.filter(v => v.required && this.variables[v.name]?.trim()).length;

    const percentage = Math.round((filled / total) * 100);

    document.getElementById('completion-percentage').textContent = `${percentage}%`;
    document.getElementById('completion-bar').style.width = `${percentage}%`;
  }

  updatePreview() {
    if (!this.templateHTML) return;

    // Use template processor if available
    let processedHTML = this.templateHTML;

    if (this.templateProcessor) {
      processedHTML = this.templateProcessor.replaceVariables(this.templateHTML, this.variables);
    } else {
      // Fallback: manual replacement
      Object.entries(this.variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}(\\|[^}]*)?}}`, 'g');
        processedHTML = processedHTML.replace(regex, value || '');
      });

      // Clean up remaining variables with defaults
      processedHTML = processedHTML.replace(/{{([^|]+)\|([^}]+)}}/g, '$2');
      processedHTML = processedHTML.replace(/{{[^}]+}}/g, '');
    }

    // Update iframe
    const iframe = document.getElementById('preview-iframe');
    if (iframe) {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(processedHTML);
      iframeDoc.close();
    }
  }

  focusOnVariable(varName) {
    setTimeout(() => {
      const varDiv = document.getElementById(`var-${varName}`);
      if (varDiv) {
        varDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        varDiv.classList.add('highlighted');

        const input = document.getElementById(varName);
        if (input) {
          input.focus();
        }
      }
    }, 500);
  }

  showAIPrompt(varName) {
    const variable = this.extractedVariables.find(v => v.name === varName);
    if (!variable) return;

    // Get AI prompt for this variable
    const prompt = this.generateAIPrompt(variable);

    // Show modal
    const modal = document.getElementById('ai-prompt-modal');
    document.getElementById('ai-modal-field-name').textContent = variable.label;
    document.getElementById('ai-modal-prompt-text').textContent = prompt;

    modal.classList.remove('hidden');

    // Store current variable for auto-generate
    this.currentAIVariable = varName;
  }

  generateAIPrompt(variable) {
    // Get the prompt from loaded JSON
    if (this.aiPrompts && this.aiPrompts.prompts[variable.name]) {
      let prompt = this.aiPrompts.prompts[variable.name].prompt;

      // Replace context variables
      prompt = this.replacePromptVariables(prompt);

      return prompt;
    }

    // Fallback to generated prompt if JSON not loaded
    return this.generateFallbackPrompt(variable);
  }

  replacePromptVariables(promptText) {
    // Replace {{VARIABLE}} placeholders in the prompt with actual values
    let processed = promptText;

    // Common replacements
    const replacements = {
      '{{BOOK_TITLE}}': this.variables['BOOK_TITLE'] || '[Your Book Title]',
      '{{TARGET_AUDIENCE}}': this.variables['TARGET_AUDIENCE'] || 'readers',
      '{{AUTHOR_NAME}}': this.variables['AUTHOR_NAME'] || '[Author Name]',
      '{{PRICE}}': this.variables['PRICE'] || '19.99',
      '{{TOPIC}}': this.extractTopicFromTitle(),
      '{{BENEFIT_1_TITLE}}': this.variables['BENEFIT_1_TITLE'] || '[First Benefit]',
      '{{BENEFIT_2_TITLE}}': this.variables['BENEFIT_2_TITLE'] || '[Second Benefit]',
      '{{BENEFIT_3_TITLE}}': this.variables['BENEFIT_3_TITLE'] || '[Third Benefit]',
      '{{TESTIMONIAL_1_TEXT}}': this.variables['TESTIMONIAL_1_TEXT'] || '[First Testimonial]',
      '{{TESTIMONIAL_1_NAME}}': this.variables['TESTIMONIAL_1_NAME'] || '[Name]',
      '{{FAQ_1_Q}}': this.variables['FAQ_1_Q'] || '[First Question]',
      '{{FAQ_2_Q}}': this.variables['FAQ_2_Q'] || '[Second Question]',
      '{{FAQ_3_Q}}': this.variables['FAQ_3_Q'] || '[Third Question]',
      '{{HERO_HEADLINE}}': this.variables['HERO_HEADLINE'] || '[Hero Headline]'
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      processed = processed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    return processed;
  }

  extractTopicFromTitle() {
    // Try to infer topic from book title
    const title = this.variables['BOOK_TITLE'] || '';
    if (!title) return '[your topic]';

    // Simple extraction - take everything after common patterns
    const patterns = [
      /secrets of (.*)/i,
      /guide to (.*)/i,
      /how to (.*)/i,
      /the (.*) book/i,
      /(.*) for beginners/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) return match[1];
    }

    // Default to the title itself
    return title;
  }

  generateFallbackPrompt(variable) {
    // Fallback if JSON doesn't load
    const bookTitle = this.variables['BOOK_TITLE'] || '[Your Book Title]';
    const audience = this.variables['TARGET_AUDIENCE'] || 'readers';

    return `Write compelling copy for ${variable.label} for the book "${bookTitle}".\n\nTarget audience: ${audience}\n\nRequirements:\n- Specific and concrete\n- Benefit-driven\n- Authentic voice\n- Appropriate length\n\nProvide 2-3 options.`;
  }

  closeAIModal() {
    document.getElementById('ai-prompt-modal')?.classList.add('hidden');
  }

  async copyPromptToClipboard() {
    const promptText = document.getElementById('ai-modal-prompt-text').textContent;

    try {
      await navigator.clipboard.writeText(promptText);

      // Visual feedback
      const copyBtn = document.getElementById('copy-prompt-btn');
      const originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
      copyBtn.classList.add('bg-green-600');

      setTimeout(() => {
        copyBtn.innerHTML = originalHTML;
        copyBtn.classList.remove('bg-green-600');
      }, 2000);

      this.showNotification('Prompt copied! Paste it into ChatGPT or Claude.', 'success');
    } catch (error) {
      console.error('Copy failed:', error);

      // Fallback: Select text for manual copy
      const textArea = document.getElementById('ai-modal-prompt-text');
      if (textArea) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }

      this.showNotification('Please press Ctrl+C to copy (automatic copy failed)', 'warning');
    }
  }

  async autoGenerateVariable() {
    // This would call Claude API - for now, show placeholder
    this.showNotification('Auto-generate requires API key (coming soon!)', 'info');

    // TODO: Implement Claude API integration
    // const prompt = document.getElementById('ai-modal-prompt-text').textContent;
    // const result = await this.callClaudeAPI(prompt);
    // document.getElementById(this.currentAIVariable).value = result;
    // this.onVariableChange(this.currentAIVariable, result);
    // this.closeAIModal();
  }

  changeTemplate() {
    if (confirm('Are you sure? Your current progress will be saved as a draft.')) {
      this.saveDraft();
      document.getElementById('builder-interface').classList.add('hidden');
      document.getElementById('welcome-screen').classList.remove('hidden');
      this.stopAutoSave();
    }
  }

  toggleExportMenu() {
    const dropdown = document.getElementById('export-dropdown');
    dropdown?.classList.toggle('hidden');
  }

  async downloadHTML() {
    try {
      const processedHTML = this.getProcessedHTML();

      if (!processedHTML) {
        this.showNotification('No funnel to export. Please select a template first.', 'warning');
        return;
      }

      // Create blob
      const blob = new Blob([processedHTML], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      const filename = this.sanitizeFilename(this.variables['BOOK_TITLE'] || this.variables['FUNNEL_NAME'] || 'my-funnel');
      a.download = `${filename}.html`;

      // Trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);

      this.showNotification(`${filename}.html downloaded successfully!`, 'success');
      this.closeExportMenu();
    } catch (error) {
      console.error('Download failed:', error);
      this.showNotification('Download failed. Please try again.', 'error');
    }
  }

  async downloadZIP() {
    try {
      // Check if JSZip is available
      if (typeof JSZip === 'undefined') {
        // Fallback: download HTML only
        this.showNotification('Downloading HTML file (ZIP requires JSZip library)', 'info');
        return this.downloadHTML();
      }

      const processedHTML = this.getProcessedHTML();

      if (!processedHTML) {
        this.showNotification('No funnel to export. Please select a template first.', 'warning');
        return;
      }

      // Create ZIP
      const zip = new JSZip();

      // Add main HTML file
      const filename = this.sanitizeFilename(this.variables['BOOK_TITLE'] || this.variables['FUNNEL_NAME'] || 'my-funnel');
      zip.file(`${filename}.html`, processedHTML);

      // Add README
      const readme = this.generateReadme();
      zip.file('README.txt', readme);

      // Add CSS if custom styles exist
      if (this.variables['CUSTOM_CSS']) {
        zip.file('styles.css', this.variables['CUSTOM_CSS']);
      }

      // Add metadata
      const metadata = {
        created: new Date().toISOString(),
        template: this.selectedTemplate,
        variables: this.variables,
        version: '1.0.0'
      };
      zip.file('funnel-metadata.json', JSON.stringify(metadata, null, 2));

      // Generate ZIP file
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.zip`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 100);

      this.showNotification(`${filename}.zip downloaded successfully!`, 'success');
      this.closeExportMenu();
    } catch (error) {
      console.error('ZIP export failed:', error);
      this.showNotification('ZIP export failed. Downloading HTML instead.', 'warning');
      this.downloadHTML();
    }
  }

  generateReadme() {
    const bookTitle = this.variables['BOOK_TITLE'] || 'Your Funnel';
    return `# ${bookTitle} - Book Funnel

Generated with Teneo Marketplace Funnel Builder
Date: ${new Date().toLocaleDateString()}

## Files Included:

- ${this.sanitizeFilename(bookTitle)}.html - Main funnel page
- README.txt - This file
${this.variables['CUSTOM_CSS'] ? '- styles.css - Custom styling\n' : ''}
- funnel-metadata.json - Funnel configuration

## How to Use:

1. Upload all files to your web hosting
2. Visit the .html file in your browser
3. Share the URL with your audience

## Customization:

- Edit the .html file to change content
- Modify styles.css to adjust design
- Connect to your payment processor
- Add tracking codes (Google Analytics, Facebook Pixel)

## Need Help?

Visit: https://teneo-marketplace.com/support

---

Built with ❤️ using Teneo Marketplace Funnel Builder
`;
  }

  async copyToClipboard() {
    try {
      const processedHTML = this.getProcessedHTML();

      if (!processedHTML) {
        this.showNotification('No funnel to copy. Please select a template first.', 'warning');
        return;
      }

      await navigator.clipboard.writeText(processedHTML);

      this.showNotification('HTML copied to clipboard! Ready to paste.', 'success');
      this.closeExportMenu();

      // Optional: Show copy stats
      const stats = this.getHTMLStats(processedHTML);
      console.log('Copied HTML stats:', stats);
    } catch (error) {
      console.error('Copy failed:', error);

      // Fallback: Create a textarea and select
      const textarea = document.createElement('textarea');
      textarea.value = processedHTML;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
        this.showNotification('HTML copied to clipboard!', 'success');
        this.closeExportMenu();
      } catch (fallbackError) {
        this.showNotification('Copy failed. Please use Download instead.', 'error');
      }

      document.body.removeChild(textarea);
    }
  }

  getHTMLStats(html) {
    return {
      size: html.length,
      sizeKB: (html.length / 1024).toFixed(2),
      lines: html.split('\n').length,
      variablesFilled: Object.keys(this.variables).length
    };
  }

  closeExportMenu() {
    const dropdown = document.getElementById('export-dropdown');
    if (dropdown) {
      dropdown.classList.add('hidden');
    }
  }

  getProcessedHTML() {
    if (this.templateProcessor) {
      return this.templateProcessor.replaceVariables(this.templateHTML, this.variables);
    }

    let html = this.templateHTML;
    Object.entries(this.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}(\\|[^}]*)?}}`, 'g');
      html = html.replace(regex, value || '');
    });

    html = html.replace(/{{([^|]+)\|([^}]+)}}/g, '$2');
    html = html.replace(/{{[^}]+}}/g, '');

    return html;
  }

  sanitizeFilename(str) {
    return str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }

  async deployFunnel() {
    try {
      const response = await fetch('/api/funnels/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 1, // TODO: Get from session
          funnelName: this.variables['BOOK_TITLE'] || 'My Funnel',
          template: this.selectedTemplate,
          variables: this.variables
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.showNotification(`Funnel deployed! ${data.url}`, 'success');
      } else {
        this.showNotification('Deploy failed', 'error');
      }
    } catch (error) {
      console.error('Deploy error:', error);
      this.showNotification('Deploy not available yet', 'info');
    }
  }

  async saveDraft() {
    const draft = {
      userId: 1, // TODO: Get from session
      funnelName: this.variables['BOOK_TITLE'] || 'Untitled Funnel',
      template: this.selectedTemplate,
      variables: this.variables,
      context: this.context
    };

    // Save to localStorage
    localStorage.setItem('funnel-draft', JSON.stringify(draft));

    // Save to backend (TODO: implement when backend ready)
    // await fetch('/api/funnels/save-draft', { method: 'POST', body: JSON.stringify(draft) });

    this.showNotification('Draft saved!', 'success');
  }

  async loadDraftIfExists() {
    const draftStr = localStorage.getItem('funnel-draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);

        if (confirm('Continue editing your previous funnel?')) {
          this.variables = draft.variables;
          if (draft.template) {
            await this.selectTemplate(draft.template);
          }
          this.showNotification('Draft restored!', 'success');
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }

  startAutoSave() {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      this.saveDraft();
    }, 30000); // Every 30 seconds
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  returnToCourse() {
    if (this.context.returnUrl) {
      // Save progress first
      this.saveDraft();
      window.location.href = this.context.returnUrl;
    } else {
      this.showNotification('No return URL found', 'error');
    }
  }

  setPreviewMode(mode) {
    const iframe = document.getElementById('preview-iframe');

    // Remove all mode classes
    iframe?.classList.remove('preview-desktop-mode', 'preview-tablet-mode', 'preview-mobile-mode');

    // Add selected mode
    iframe?.classList.add(`preview-${mode}-mode`);

    // Update active button
    document.querySelectorAll('.preview-mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`preview-${mode}`)?.classList.add('active');
  }

  fullscreenPreview() {
    const processedHTML = this.getProcessedHTML();
    const win = window.open('', '_blank');
    win.document.write(processedHTML);
    win.document.close();
  }

  showNotification(message, type = 'success') {
    const toast = document.getElementById('notification-toast');
    const icon = document.getElementById('notification-icon');
    const text = document.getElementById('notification-text');

    const icons = {
      'success': 'fa-check-circle text-green-500',
      'error': 'fa-exclamation-circle text-red-500',
      'info': 'fa-info-circle text-blue-500',
      'warning': 'fa-exclamation-triangle text-yellow-500'
    };

    icon.className = `fas ${icons[type]} text-xl`;
    text.textContent = message;

    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('hiding');
      }, 300);
    }, 3000);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  window.funnelBuilder = new FunnelBuilder();
});
