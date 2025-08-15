// Enhanced Product Page with Print Options
class ProductPageEnhanced {
    constructor() {
        this.selectedFormat = 'digital_pdf';
        this.selectedBundle = null;
        this.shippingOptions = null;
        this.shippingAddress = null;
        this.currentBook = null;
    }

    init(book) {
        this.currentBook = book;
        this.renderFormatSelector(book);
        this.attachEventListeners();
        this.updatePrice();
    }

    renderFormatSelector(book) {
        const formatContainer = document.getElementById('format-selector');
        if (!formatContainer) return;

        let html = '<div class="format-options">';
        
        // Individual format options
        html += '<h3>Select Format:</h3>';
        html += '<div class="format-choices">';
        
        if (book.formats.digital_pdf?.available) {
            html += this.renderFormatOption('digital_pdf', book.formats.digital_pdf, '📱');
        }
        
        if (book.formats.print_digest?.available) {
            html += this.renderFormatOption('print_digest', book.formats.print_digest, '📕');
        }
        
        if (book.formats.print_trade?.available) {
            html += this.renderFormatOption('print_trade', book.formats.print_trade, '📘');
        }
        
        html += '</div>';
        
        // Bundle options
        if (book.bundles && book.bundles.length > 0) {
            html += '<div class="bundle-section">';
            html += '<h3>Save with Bundles:</h3>';
            html += '<div class="bundle-choices">';
            
            book.bundles.forEach(bundle => {
                html += this.renderBundleOption(bundle);
            });
            
            html += '</div></div>';
        }
        
        // Shipping calculator for physical books
        html += `
            <div id="shipping-section" class="shipping-section" style="display: none;">
                <h3>Calculate Shipping:</h3>
                <div class="shipping-form">
                    <input type="text" id="ship-zip" placeholder="ZIP Code" maxlength="10">
                    <select id="ship-country">
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                    </select>
                    <button id="calc-shipping" class="btn btn-secondary">Calculate Shipping</button>
                </div>
                <div id="shipping-options" class="shipping-options"></div>
            </div>
        `;
        
        html += '</div>';
        formatContainer.innerHTML = html;
    }

    renderFormatOption(formatId, format, icon) {
        const isSelected = this.selectedFormat === formatId && !this.selectedBundle;
        return `
            <div class="format-option ${isSelected ? 'selected' : ''}" 
                 data-format="${formatId}"
                 data-type="format">
                <div class="format-icon">${icon}</div>
                <div class="format-details">
                    <div class="format-name">${format.format}</div>
                    <div class="format-specs">
                        ${format.pages ? `${format.pages} pages` : ''}
                        ${format.fileSize ? ` • ${format.fileSize}` : ''}
                    </div>
                    <div class="format-price">
                        ${format.originalPrice ? `<span class="original-price">$${format.originalPrice}</span>` : ''}
                        <span class="current-price">$${format.price}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderBundleOption(bundle) {
        const isSelected = this.selectedBundle === bundle.id;
        return `
            <div class="bundle-option ${isSelected ? 'selected' : ''}" 
                 data-bundle="${bundle.id}"
                 data-type="bundle">
                <div class="bundle-badge">${bundle.badge}</div>
                <div class="bundle-details">
                    <div class="bundle-name">${bundle.name}</div>
                    <div class="bundle-price">
                        <span class="bundle-total">$${bundle.price}</span>
                        <span class="bundle-savings">Save $${bundle.savings}</span>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Format selection
        document.querySelectorAll('.format-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const format = e.currentTarget.dataset.format;
                this.selectFormat(format);
            });
        });

        // Bundle selection
        document.querySelectorAll('.bundle-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const bundleId = e.currentTarget.dataset.bundle;
                this.selectBundle(bundleId);
            });
        });

        // Shipping calculator
        const calcButton = document.getElementById('calc-shipping');
        if (calcButton) {
            calcButton.addEventListener('click', () => this.calculateShipping());
        }

        // Add to cart button
        const addToCartBtn = document.getElementById('add-to-cart');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => this.addToCart());
        }
    }

    selectFormat(formatId) {
        this.selectedFormat = formatId;
        this.selectedBundle = null;
        
        // Update UI
        document.querySelectorAll('.format-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.format === formatId);
        });
        document.querySelectorAll('.bundle-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Show/hide shipping section
        this.toggleShippingSection(formatId !== 'digital_pdf');
        
        this.updatePrice();
    }

    selectBundle(bundleId) {
        this.selectedBundle = bundleId;
        this.selectedFormat = null;
        
        // Update UI
        document.querySelectorAll('.bundle-option').forEach(el => {
            el.classList.toggle('selected', el.dataset.bundle === bundleId);
        });
        document.querySelectorAll('.format-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Show shipping section if bundle contains physical items
        const bundle = this.currentBook.bundles.find(b => b.id === bundleId);
        const hasPhysical = bundle.formats.some(f => f !== 'digital_pdf');
        this.toggleShippingSection(hasPhysical);
        
        this.updatePrice();
    }

    toggleShippingSection(show) {
        const shippingSection = document.getElementById('shipping-section');
        if (shippingSection) {
            shippingSection.style.display = show ? 'block' : 'none';
        }
    }

    updatePrice() {
        let price = 0;
        let displayText = '';
        
        if (this.selectedBundle) {
            const bundle = this.currentBook.bundles.find(b => b.id === this.selectedBundle);
            price = bundle.price;
            displayText = `Bundle: $${price}`;
        } else if (this.selectedFormat) {
            const format = this.currentBook.formats[this.selectedFormat];
            price = format.price;
            displayText = `${format.format}: $${price}`;
        }
        
        // Update price display
        const priceDisplay = document.getElementById('selected-price');
        if (priceDisplay) {
            priceDisplay.textContent = displayText;
        }
        
        // Update add to cart button
        const addToCartBtn = document.getElementById('add-to-cart');
        if (addToCartBtn) {
            addToCartBtn.textContent = `Add to Cart - $${price}`;
        }
    }

    async calculateShipping() {
        const zip = document.getElementById('ship-zip').value;
        const country = document.getElementById('ship-country').value;
        
        if (!zip) {
            alert('Please enter a ZIP code');
            return;
        }
        
        // Show loading state
        const optionsDiv = document.getElementById('shipping-options');
        optionsDiv.innerHTML = '<div class="loading">Calculating shipping options...</div>';
        
        try {
            const lineItems = this.getLineItemsForShipping();
            const response = await fetch('/api/shipping/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineItems,
                    destination: { zip, country }
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.shippingOptions = data.options;
                this.renderShippingOptions(data.options);
            } else {
                optionsDiv.innerHTML = '<div class="error">Unable to calculate shipping</div>';
            }
        } catch (error) {
            console.error('Shipping calculation error:', error);
            optionsDiv.innerHTML = '<div class="error">Shipping calculation failed</div>';
        }
    }

    getLineItemsForShipping() {
        const items = [];
        
        if (this.selectedBundle) {
            const bundle = this.currentBook.bundles.find(b => b.id === this.selectedBundle);
            bundle.formats.forEach(formatId => {
                if (formatId !== 'digital_pdf') {
                    const format = this.currentBook.formats[formatId];
                    items.push({
                        bookId: this.currentBook.id,
                        formatType: formatId,
                        pod_package_id: format.pod_package_id,
                        page_count: format.pages,
                        quantity: 1
                    });
                }
            });
        } else if (this.selectedFormat && this.selectedFormat !== 'digital_pdf') {
            const format = this.currentBook.formats[this.selectedFormat];
            items.push({
                bookId: this.currentBook.id,
                formatType: this.selectedFormat,
                pod_package_id: format.pod_package_id,
                page_count: format.pages,
                quantity: 1
            });
        }
        
        return items;
    }

    renderShippingOptions(options) {
        const optionsDiv = document.getElementById('shipping-options');
        
        let html = '<div class="shipping-results">';
        html += '<h4>Available Shipping Methods:</h4>';
        
        options.forEach(option => {
            html += `
                <div class="shipping-option" data-method="${option.method}">
                    <input type="radio" name="shipping" id="ship-${option.method}" value="${option.method}">
                    <label for="ship-${option.method}">
                        <div class="shipping-method">
                            <strong>${option.displayName}</strong>
                            <span class="shipping-cost">$${option.cost.toFixed(2)}</span>
                        </div>
                        <div class="shipping-time">
                            Estimated delivery: ${option.estimatedDelivery.earliest} - ${option.estimatedDelivery.latest}
                        </div>
                    </label>
                </div>
            `;
        });
        
        html += '</div>';
        optionsDiv.innerHTML = html;
        
        // Select first option by default
        const firstOption = optionsDiv.querySelector('input[type="radio"]');
        if (firstOption) {
            firstOption.checked = true;
        }
    }

    addToCart() {
        const cartItem = this.buildCartItem();
        
        // Get selected shipping if applicable
        if (this.requiresShipping()) {
            const selectedShipping = document.querySelector('input[name="shipping"]:checked');
            if (!selectedShipping) {
                alert('Please select a shipping method');
                return;
            }
            cartItem.shippingMethod = selectedShipping.value;
            cartItem.shippingCost = this.shippingOptions.find(o => o.method === selectedShipping.value).cost;
        }
        
        // Add to cart (using existing cart system)
        cart.addItem(cartItem);
        
        // Show success message
        this.showAddedToCart();
    }

    buildCartItem() {
        const item = {
            id: this.currentBook.id,
            title: this.currentBook.title,
            author: this.currentBook.author,
            coverImage: this.currentBook.coverImage
        };
        
        if (this.selectedBundle) {
            const bundle = this.currentBook.bundles.find(b => b.id === this.selectedBundle);
            item.type = 'bundle';
            item.bundleId = bundle.id;
            item.bundleName = bundle.name;
            item.formats = bundle.formats;
            item.price = bundle.price;
            item.requiresShipping = bundle.formats.some(f => f !== 'digital_pdf');
        } else {
            const format = this.currentBook.formats[this.selectedFormat];
            item.type = 'single';
            item.format = this.selectedFormat;
            item.formatName = format.format;
            item.price = format.price;
            item.requiresShipping = this.selectedFormat !== 'digital_pdf';
            
            if (this.selectedFormat !== 'digital_pdf') {
                item.pod_package_id = format.pod_package_id;
                item.pages = format.pages;
            }
        }
        
        return item;
    }

    requiresShipping() {
        if (this.selectedBundle) {
            const bundle = this.currentBook.bundles.find(b => b.id === this.selectedBundle);
            return bundle.formats.some(f => f !== 'digital_pdf');
        }
        return this.selectedFormat !== 'digital_pdf';
    }

    showAddedToCart() {
        const message = document.createElement('div');
        message.className = 'cart-added-message show';
        message.innerHTML = `
            <div class="message-content">
                <span>✓ Added to cart!</span>
                <a href="/cart.html" class="view-cart-link">View Cart</a>
            </div>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const productPage = new ProductPageEnhanced();
    
    // Get book data from page
    const bookData = window.currentBook || getBookFromPage();
    if (bookData) {
        productPage.init(bookData);
    }
});