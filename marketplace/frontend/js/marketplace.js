// Teneo Marketplace Core JavaScript
// Handles brand configuration, catalog loading, cart operations, and more

const Marketplace = (function() {
    'use strict';

    // Configuration
    const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    const DEFAULT_BRAND = 'teneo';
    
    // State
    let currentBrand = null;
    let currentConfig = null;
    let currentCatalog = null;
    let cart = [];

    // Initialize
    function init() {
        loadCart();
        determineBrand();
        loadBrandConfig().then(() => {
            loadCatalog();
        });
        setupEventListeners();
    }

    // Determine current brand from URL parameter
    function determineBrand() {
        const urlParams = new URLSearchParams(window.location.search);
        currentBrand = urlParams.get('brand') || DEFAULT_BRAND;
    }

    // Load brand configuration
    async function loadBrandConfig() {
        try {
            const response = await fetch(`/brands/${currentBrand}/config.json`);
            if (!response.ok) throw new Error('Brand config not found');
            
            currentConfig = await response.json();
            applyBrandTheme(currentConfig);
            updateBrandUI(currentConfig);
            
            return currentConfig;
        } catch (error) {
            console.error('Error loading brand config:', error);
            // Fallback to default brand
            if (currentBrand !== DEFAULT_BRAND) {
                currentBrand = DEFAULT_BRAND;
                return loadBrandConfig();
            }
        }
    }

    // Apply brand theme to CSS variables
    function applyBrandTheme(config) {
        const root = document.documentElement;
        const theme = config.theme;
        
        if (theme) {
            root.style.setProperty('--primary-color', theme.primaryColor || '#7C3AED');
            root.style.setProperty('--secondary-color', theme.secondaryColor || '#10B981');
            root.style.setProperty('--accent-color', theme.accentColor || '#FEA644');
            root.style.setProperty('--background-color', theme.backgroundColor || '#FFEFD6');
            root.style.setProperty('--text-color', theme.textColor || '#1F2937');
            
            if (theme.fontFamily) {
                root.style.setProperty('--font-family', theme.fontFamily);
            }
        }
    }

    // Update UI with brand information
    function updateBrandUI(config) {
        // Update logo/brand name
        const logoElements = document.querySelectorAll('[data-brand-logo]');
        logoElements.forEach(el => {
            el.textContent = config.logo + ' ' + config.brandName;
        });

        // Update brand name
        const nameElements = document.querySelectorAll('[data-brand-name]');
        nameElements.forEach(el => {
            el.textContent = config.brandName;
        });

        // Update tagline
        const taglineElements = document.querySelectorAll('[data-brand-tagline]');
        taglineElements.forEach(el => {
            el.textContent = config.tagline;
        });

        // Update description
        const descElements = document.querySelectorAll('[data-brand-description]');
        descElements.forEach(el => {
            el.textContent = config.description;
        });

        // Update page title
        document.title = `${config.brandName} Marketplace`;
    }

    // Load catalog
    async function loadCatalog() {
        try {
            const response = await fetch(`/brands/${currentBrand}/catalog.json`);
            if (!response.ok) throw new Error('Catalog not found');
            
            currentCatalog = await response.json();
            
            // Render books if container exists
            const booksContainer = document.getElementById('books-grid');
            if (booksContainer) {
                renderBooks(currentCatalog.books || []);
            }
            
            // Render collections if container exists
            const collectionsContainer = document.getElementById('collections-grid');
            if (collectionsContainer) {
                renderCollections(currentCatalog.collections || []);
            }
            
            return currentCatalog;
        } catch (error) {
            console.error('Error loading catalog:', error);
            displayError('books-grid', 'Unable to load catalog');
        }
    }

    // Render books
    function renderBooks(books, container = 'books-grid') {
        const grid = document.getElementById(container);
        if (!grid) return;
        
        if (books.length === 0) {
            grid.innerHTML = '<p class="no-results">No books found</p>';
            return;
        }
        
        grid.innerHTML = books.map(book => createBookCard(book)).join('');
    }

    // Create book card HTML
    function createBookCard(book) {
        return `
            <div class="book-card" data-book-id="${book.id}">
                <a href="/book-detail.html?id=${book.id}&brand=${currentBrand}" class="book-link">
                    <img src="${book.coverImage}" alt="${book.title}" class="book-cover" 
                         onerror="this.src='https://via.placeholder.com/400x600?text=${encodeURIComponent(book.title)}'">
                    <div class="book-info">
                        ${book.badge ? `<span class="book-badge">${book.badge}</span>` : ''}
                        <h3 class="book-title">${book.title}</h3>
                        <p class="book-author">${book.author}</p>
                        <p class="book-description">${book.description}</p>
                        <div class="book-price">
                            <span class="current-price">$${book.price}</span>
                            ${book.originalPrice ? `<span class="original-price">$${book.originalPrice}</span>` : ''}
                        </div>
                    </div>
                </a>
                <button class="add-to-cart-btn" onclick="Marketplace.addToCart('${book.id}')">
                    Add to Cart
                </button>
            </div>
        `;
    }

    // Render collections
    function renderCollections(collections, container = 'collections-grid') {
        const grid = document.getElementById(container);
        if (!grid) return;
        
        if (collections.length === 0) {
            grid.innerHTML = '';
            return;
        }
        
        grid.innerHTML = collections.map(collection => createCollectionCard(collection)).join('');
    }

    // Create collection card HTML
    function createCollectionCard(collection) {
        return `
            <div class="collection-card" data-collection-id="${collection.id}">
                <span class="collection-badge">${collection.badge}</span>
                <h3 class="collection-title">${collection.title}</h3>
                <p class="collection-description">${collection.description}</p>
                <div class="collection-price">
                    <span class="collection-current-price">$${collection.price}</span>
                    <span class="collection-original-price">$${collection.originalPrice}</span>
                </div>
                ${collection.bonus ? `<div class="collection-bonus">${collection.bonus}</div>` : ''}
                <button class="add-collection-btn" onclick="Marketplace.addCollectionToCart('${collection.id}')">
                    Add Bundle to Cart
                </button>
            </div>
        `;
    }

    // Cart Operations
    function loadCart() {
        const savedCart = localStorage.getItem('marketplace_cart');
        cart = savedCart ? JSON.parse(savedCart) : [];
        updateCartUI();
    }

    function saveCart() {
        localStorage.setItem('marketplace_cart', JSON.stringify(cart));
        updateCartUI();
    }

    function addToCart(bookId) {
        const book = findBookById(bookId);
        if (!book) return;
        
        const existingItem = cart.find(item => item.id === bookId && item.type === 'book');
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: bookId,
                type: 'book',
                brand: currentBrand,
                title: book.title,
                author: book.author,
                price: book.price,
                coverImage: book.coverImage,
                quantity: 1
            });
        }
        
        saveCart();
        showNotification('Added to cart!');
    }

    function addCollectionToCart(collectionId) {
        const collection = findCollectionById(collectionId);
        if (!collection) return;
        
        const existingItem = cart.find(item => item.id === collectionId && item.type === 'collection');
        
        if (existingItem) {
            showNotification('Bundle already in cart');
            return;
        }
        
        cart.push({
            id: collectionId,
            type: 'collection',
            brand: currentBrand,
            title: collection.title,
            price: collection.price,
            books: collection.books,
            quantity: 1
        });
        
        saveCart();
        showNotification('Bundle added to cart!');
    }

    function removeFromCart(itemId, itemType = 'book') {
        cart = cart.filter(item => !(item.id === itemId && item.type === itemType));
        saveCart();
    }

    function updateCartQuantity(itemId, itemType, quantity) {
        const item = cart.find(i => i.id === itemId && i.type === itemType);
        if (item) {
            item.quantity = Math.max(1, quantity);
            saveCart();
        }
    }

    function clearCart() {
        cart = [];
        saveCart();
    }

    function getCartTotal() {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    function getCartCount() {
        return cart.reduce((count, item) => count + item.quantity, 0);
    }

    function updateCartUI() {
        // Update cart count badges
        const countElements = document.querySelectorAll('[data-cart-count]');
        const count = getCartCount();
        countElements.forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? 'inline-block' : 'none';
        });

        // Update cart total
        const totalElements = document.querySelectorAll('[data-cart-total]');
        totalElements.forEach(el => {
            el.textContent = `$${getCartTotal().toFixed(2)}`;
        });
    }

    // Search and Filter
    function searchBooks(query) {
        if (!currentCatalog || !currentCatalog.books) return [];
        
        const searchTerm = query.toLowerCase();
        return currentCatalog.books.filter(book => {
            return (
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm) ||
                book.description.toLowerCase().includes(searchTerm) ||
                (book.tags && book.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
        });
    }

    function filterBooksByCategory(category) {
        if (!currentCatalog || !currentCatalog.books) return [];
        
        if (!category || category === 'all') {
            return currentCatalog.books;
        }
        
        return currentCatalog.books.filter(book => book.category === category);
    }

    function filterBooksByPriceRange(minPrice, maxPrice) {
        if (!currentCatalog || !currentCatalog.books) return [];
        
        return currentCatalog.books.filter(book => {
            return book.price >= minPrice && book.price <= maxPrice;
        });
    }

    // Newsletter
    async function subscribeToNewsletter(email) {
        try {
            // In production, this would call an API endpoint
            const response = await fetch(`${API_URL}/api/newsletter/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, brand: currentBrand })
            });
            
            if (!response.ok) throw new Error('Subscription failed');
            
            return { success: true, message: 'Successfully subscribed!' };
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            // For demo purposes, we'll simulate success
            return { success: true, message: 'Thank you for subscribing!' };
        }
    }

    // Helper Functions
    function findBookById(bookId) {
        return currentCatalog?.books?.find(book => book.id === bookId);
    }

    function findCollectionById(collectionId) {
        return currentCatalog?.collections?.find(collection => collection.id === collectionId);
    }

    function showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function displayError(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<p class="error-message">${message}</p>`;
        }
    }

    // Event Listeners
    function setupEventListeners() {
        // Search form
        const searchForm = document.getElementById('search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = e.target.querySelector('input[name="search"]').value;
                const results = searchBooks(query);
                renderBooks(results);
            });
        }

        // Newsletter form
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = e.target.querySelector('input[type="email"]').value;
                const result = await subscribeToNewsletter(email);
                showNotification(result.message, result.success ? 'success' : 'error');
                if (result.success) {
                    e.target.reset();
                }
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                const books = filterBooksByCategory(e.target.value);
                renderBooks(books);
            });
        }
    }

    // Public API
    return {
        init,
        loadBrandConfig,
        loadCatalog,
        getCurrentBrand: () => currentBrand,
        getCurrentConfig: () => currentConfig,
        getCurrentCatalog: () => currentCatalog,
        switchBrand: (brand) => {
            currentBrand = brand;
            window.location.search = `?brand=${brand}`;
        },
        
        // Cart operations
        addToCart,
        addCollectionToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        getCart: () => [...cart],
        getCartTotal,
        getCartCount,
        
        // Search and filter
        searchBooks,
        filterBooksByCategory,
        filterBooksByPriceRange,
        
        // UI updates
        renderBooks,
        renderCollections,
        showNotification,
        
        // Newsletter
        subscribeToNewsletter,
        
        // Helpers
        findBookById,
        findCollectionById
    };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Marketplace.init);
} else {
    Marketplace.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Marketplace;
}