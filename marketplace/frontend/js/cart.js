// Shopping Cart System for Teneo Marketplace
// Handles cart management, localStorage persistence, and UI interactions

class ShoppingCart {
    constructor() {
        this.cart = [];
        this.isOpen = false;
        this.taxRate = 0.08; // 8% tax rate
        this.init();
    }

    init() {
        this.loadCartFromStorage();
        this.createCartElements();
        this.updateCartDisplay();
        this.bindEvents();
    }

    // Load cart from localStorage
    loadCartFromStorage() {
        try {
            const savedCart = localStorage.getItem('teneoCart');
            if (savedCart) {
                this.cart = JSON.parse(savedCart);
            }
        } catch (error) {
            console.error('Error loading cart from storage:', error);
            this.cart = [];
        }
    }

    // Save cart to localStorage
    saveCartToStorage() {
        try {
            localStorage.setItem('teneoCart', JSON.stringify(this.cart));
        } catch (error) {
            console.error('Error saving cart to storage:', error);
        }
    }

    // Add item to cart
    addToCart(bookData) {
        try {
            // Check if item already exists in cart
            const existingItem = this.cart.find(item => item.id === bookData.id);
            
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                // Add new item to cart
                const cartItem = {
                    id: bookData.id,
                    title: bookData.title,
                    author: bookData.author,
                    price: parseFloat(bookData.price),
                    coverImage: bookData.coverImage || bookData.cover,
                    quantity: 1,
                    addedAt: new Date().toISOString()
                };
                this.cart.push(cartItem);
            }

            this.saveCartToStorage();
            this.updateCartDisplay();
            this.animateCartIcon();
            this.showAddedMessage(bookData.title);
            
            return true;
        } catch (error) {
            console.error('Error adding item to cart:', error);
            return false;
        }
    }

    // Remove item from cart
    removeFromCart(itemId, showConfirmation = true) {
        if (showConfirmation) {
            const item = this.cart.find(item => item.id === itemId);
            if (!item) return false;
            
            if (!confirm(`Remove "${item.title}" from your cart?`)) {
                return false;
            }
        }

        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveCartToStorage();
        this.updateCartDisplay();
        this.updateCartSidebar();
        return true;
    }

    // Update item quantity
    updateQuantity(itemId, newQuantity) {
        const item = this.cart.find(item => item.id === itemId);
        if (!item) return false;

        if (newQuantity <= 0) {
            return this.removeFromCart(itemId, true);
        }

        item.quantity = parseInt(newQuantity);
        this.saveCartToStorage();
        this.updateCartDisplay();
        this.updateCartSidebar();
        return true;
    }

    // Clear entire cart
    clearCart(showConfirmation = true) {
        if (showConfirmation && this.cart.length > 0) {
            if (!confirm('Are you sure you want to clear your entire cart?')) {
                return false;
            }
        }

        this.cart = [];
        this.saveCartToStorage();
        this.updateCartDisplay();
        this.updateCartSidebar();
        this.closeCartSidebar();
        return true;
    }

    // Calculate cart totals
    calculateTotals() {
        const subtotal = this.cart.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        const tax = subtotal * this.taxRate;
        const total = subtotal + tax;

        return {
            subtotal: subtotal,
            tax: tax,
            total: total,
            itemCount: this.cart.reduce((count, item) => count + item.quantity, 0)
        };
    }

    // Create cart UI elements
    createCartElements() {
        this.createFloatingCartIcon();
        this.createCartSidebar();
    }

    // Create floating cart icon
    createFloatingCartIcon() {
        const cartIcon = document.createElement('div');
        cartIcon.id = 'floating-cart';
        cartIcon.className = 'floating-cart';
        cartIcon.innerHTML = `
            <div class="cart-icon">
                <i class="fas fa-shopping-cart"></i>
                <span class="cart-badge" id="cart-badge">0</span>
            </div>
        `;

        document.body.appendChild(cartIcon);
    }

    // Create cart sidebar
    createCartSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'cart-sidebar';
        sidebar.className = 'cart-sidebar';
        sidebar.innerHTML = `
            <div class="cart-overlay"></div>
            <div class="cart-panel">
                <div class="cart-header">
                    <h3>Shopping Cart</h3>
                    <button class="close-cart" id="close-cart">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="cart-content" id="cart-content">
                    <!-- Cart items will be populated here -->
                </div>
                <div class="cart-footer" id="cart-footer">
                    <!-- Cart totals and buttons will be populated here -->
                </div>
            </div>
        `;

        document.body.appendChild(sidebar);
    }

    // Bind event listeners
    bindEvents() {
        // Floating cart icon click
        const floatingCart = document.getElementById('floating-cart');
        if (floatingCart) {
            floatingCart.addEventListener('click', () => this.openCartSidebar());
        }

        // Close cart button
        const closeCart = document.getElementById('close-cart');
        if (closeCart) {
            closeCart.addEventListener('click', () => this.closeCartSidebar());
        }

        // Cart overlay click (close cart)
        const overlay = document.querySelector('.cart-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeCartSidebar());
        }

        // Escape key to close cart
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeCartSidebar();
            }
        });
    }

    // Update cart display (badge count)
    updateCartDisplay() {
        const totals = this.calculateTotals();
        const badge = document.getElementById('cart-badge');
        
        if (badge) {
            badge.textContent = totals.itemCount;
            badge.style.display = totals.itemCount > 0 ? 'block' : 'none';
        }

        // Update cart sidebar if it's open
        if (this.isOpen) {
            this.updateCartSidebar();
        }
    }

    // Update cart sidebar content
    updateCartSidebar() {
        const cartContent = document.getElementById('cart-content');
        const cartFooter = document.getElementById('cart-footer');
        
        if (!cartContent || !cartFooter) return;

        if (this.cart.length === 0) {
            cartContent.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart empty-cart-icon"></i>
                    <p>Your cart is empty</p>
                    <button class="continue-shopping-btn" onclick="window.cart.closeCartSidebar()">
                        Continue Shopping
                    </button>
                </div>
            `;
            cartFooter.innerHTML = '';
            return;
        }

        // Populate cart items
        cartContent.innerHTML = this.cart.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="item-image">
                    <img src="${item.coverImage || 'images/placeholder-book.jpg'}" alt="${item.title}" onerror="this.src='images/placeholder-book.jpg'">
                </div>
                <div class="item-details">
                    <h4 class="item-title">${item.title}</h4>
                    <p class="item-author">by ${item.author}</p>
                    <div class="item-price">$${item.price.toFixed(2)}</div>
                </div>
                <div class="item-controls">
                    <div class="quantity-controls">
                        <button class="qty-btn minus" onclick="window.cart.updateQuantity('${item.id}', ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="qty-btn plus" onclick="window.cart.updateQuantity('${item.id}', ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-item" onclick="window.cart.removeFromCart('${item.id}')" title="Remove item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="item-total">
                    $${(item.price * item.quantity).toFixed(2)}
                </div>
            </div>
        `).join('');

        // Populate cart footer
        const totals = this.calculateTotals();
        cartFooter.innerHTML = `
            <div class="cart-summary">
                <div class="summary-line">
                    <span>Subtotal:</span>
                    <span>$${totals.subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-line">
                    <span>Tax:</span>
                    <span>$${totals.tax.toFixed(2)}</span>
                </div>
                <div class="summary-line total">
                    <span>Total:</span>
                    <span>$${totals.total.toFixed(2)}</span>
                </div>
            </div>
            <div class="cart-actions">
                <button class="clear-cart-btn" onclick="window.cart.clearCart()">
                    Clear Cart
                </button>
                <button class="continue-shopping-btn" onclick="window.cart.closeCartSidebar()">
                    Continue Shopping
                </button>
                <button class="checkout-btn" onclick="window.cart.proceedToCheckout()">
                    Proceed to Checkout
                </button>
            </div>
        `;
    }

    // Open cart sidebar
    openCartSidebar() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) {
            this.updateCartSidebar();
            sidebar.classList.add('open');
            this.isOpen = true;
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    // Close cart sidebar
    closeCartSidebar() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
            this.isOpen = false;
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    // Animate cart icon when item is added
    animateCartIcon() {
        const cartIcon = document.getElementById('floating-cart');
        if (cartIcon) {
            cartIcon.classList.add('bounce');
            setTimeout(() => {
                cartIcon.classList.remove('bounce');
            }, 600);
        }
    }

    // Show success message when item is added
    showAddedMessage(itemTitle) {
        // Remove existing message if any
        const existingMessage = document.querySelector('.cart-success-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const message = document.createElement('div');
        message.className = 'cart-success-message';
        message.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>"${itemTitle}" added to cart</span>
        `;

        document.body.appendChild(message);

        // Auto-remove message after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
    }

    // Proceed to checkout
    proceedToCheckout() {
        if (this.cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        // Prepare checkout data
        const checkoutData = {
            items: this.cart.map(item => ({
                id: item.id,
                title: item.title,
                author: item.author,
                price: item.price,
                quantity: item.quantity
            })),
            totals: this.calculateTotals()
        };

        // For now, redirect to a placeholder checkout page or integrate with Stripe
        
        // You can integrate this with your existing Stripe checkout
        this.createStripeCheckout(checkoutData);
    }

    // Create Stripe checkout session (integration with existing Stripe code)
    async createStripeCheckout(checkoutData) {
        try {
            const response = await fetch(window.API_CONFIG.buildURL(window.API_CONFIG.ENDPOINTS.CHECKOUT), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: checkoutData.items
                })
            });

            const session = await response.json();
            
            if (session.url) {
                // Redirect to Stripe Checkout
                window.location.href = session.url;
            } else {
                throw new Error('Failed to create checkout session');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Sorry, there was an error processing your checkout. Please try again.');
        }
    }

    // Get cart item count
    getItemCount() {
        return this.cart.reduce((count, item) => count + item.quantity, 0);
    }

    // Get cart total
    getCartTotal() {
        return this.calculateTotals().total;
    }

    // Check if item is in cart
    isInCart(itemId) {
        return this.cart.some(item => item.id === itemId);
    }

    // Get item from cart
    getCartItem(itemId) {
        return this.cart.find(item => item.id === itemId);
    }
}

// Global cart instance
let cart;

// Initialize cart when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    cart = new ShoppingCart();
    window.cart = cart; // Make globally available
    
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShoppingCart;
}