// API configuration - Use centralized config
const API_BASE_URL = window.API_CONFIG ? window.API_CONFIG.API_URL : window.location.origin;

// Global variable to store books data
let booksData = [];

// Function to fetch books from API or brand catalog
async function fetchBooks() {
    try {
        // Check if brand manager is available and has brand-specific books
        if (window.brandManager && window.brandManager.currentBrand !== 'default') {
            const brandBooks = window.brandManager.getBooksData();
            if (brandBooks && brandBooks.length > 0) {
                booksData = brandBooks;
                console.log(`Loaded ${brandBooks.length} books from ${window.brandManager.currentBrand} brand`);
                return booksData;
            }
        }
        
        // Fallback to API for default books
        const response = await fetch(window.API_CONFIG.buildURL(window.API_CONFIG.ENDPOINTS.BOOKS));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        if (result.success && result.data) {
            booksData = result.data;
            return booksData;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error fetching books:', error);
        // Fallback to sample data if API fails
        return getFallbackBooks();
    }
}

// Fallback book data in case API is unavailable
function getFallbackBooks() {
    console.log('Using fallback book data');
    return [
        {
            id: 1,
            title: "The Midnight Library",
            author: "Matt Haig",
            genre: "Fiction",
            price: 12.99,
            currency: "USD",
            description: "A dazzling novel about all the choices that go into a life well lived.",
            cover: "📚",
            stock: 10
        },
        {
            id: 2,
            title: "Sapiens: A Brief History of Humankind",
            author: "Yuval Noah Harari",
            genre: "Non-Fiction",
            price: 15.99,
            currency: "USD",
            description: "A groundbreaking narrative of humanity's creation and evolution.",
            cover: "🧠",
            stock: 15
        }
    ];
}

// Function to format price
function formatPrice(price, currency = 'USD') {
    if (typeof price === 'string' && price.startsWith('$')) {
        return price;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(price);
}

// Function to create a book card element
function createBookCard(book) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.setAttribute('data-book-id', book.id);
    
    const formattedPrice = formatPrice(book.price, book.currency);
    const stockStatus = book.stock > 0 ? 
        `<span class="stock-status in-stock">${book.stock} in stock</span>` : 
        '<span class="stock-status out-of-stock">Out of stock</span>';
    
    // Add brand-specific urgency text if available
    const urgencyText = book.urgency ? `<div class="book-urgency">${book.urgency}</div>` : '';
    
    // Add testimonials if available
    const testimonial = book.testimonials && book.testimonials.length > 0 ? 
        `<div class="book-testimonial">"${book.testimonials[0].text}" - ${book.testimonials[0].name}</div>` : '';
    
    bookCard.innerHTML = `
        <div class="book-cover">${book.cover}</div>
        <div class="book-title">${book.title}</div>
        <div class="book-author">by ${book.author}</div>
        <div class="book-genre">${book.genre}</div>
        <div class="book-description">${book.description}</div>
        ${urgencyText}
        <div class="book-footer">
            <div class="book-price">${formattedPrice}</div>
            ${stockStatus}
        </div>
        ${testimonial}
        <div class="book-actions">
            <button class="buy-btn add-to-cart-btn" onclick="addToCart('${book.id}')" ${book.stock === 0 ? 'disabled' : ''}>
                <i class="fas fa-shopping-cart"></i>
                ${book.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
        </div>
    `;
    
    // Add click event listener
    bookCard.addEventListener('click', function() {
        handleBookClick(book);
    });
    
    return bookCard;
}

// Get network recommendations based on current book
function getNetworkRecommendations(book) {
    const recommendations = [];
    
    // Cross-store recommendation logic
    if (window.brandManager) {
        const currentBrand = window.brandManager.currentBrand;
        
        if (currentBrand === 'true-earth' && book.category === 'Alternative History') {
            recommendations.push({
                text: '🚀 Readers also explore: "The Consciousness Revolution" at Teneo Books',
                link: '/?brand=teneo',
                store: 'Teneo Books'
            });
        } else if (currentBrand === 'wealth-wise' && book.category === 'Investment Strategy') {
            recommendations.push({
                text: '🧠 Pattern seekers also read: "The Pattern Code" at Teneo Books',
                link: '/?brand=teneo',
                store: 'Teneo Books'
            });
        } else if (currentBrand === 'teneo' && book.title.includes('Pattern')) {
            recommendations.push({
                text: '💰 Apply patterns to wealth: "Market Psychology Decoded" at WealthWise',
                link: '/?brand=wealth-wise',
                store: 'WealthWise'
            });
        } else if (currentBrand === 'teneo' && book.title.includes('Consciousness')) {
            recommendations.push({
                text: '🔍 Uncover more truths: "Mudflood Conspiracy" at True Earth',
                link: '/?brand=true-earth',
                store: 'True Earth Publications'
            });
        }
    }
    
    return recommendations;
}

// Function to render all books in the grid
async function renderBooksGrid() {
    const booksGrid = document.getElementById('books-grid');
    
    if (!booksGrid) {
        console.error('Books grid container not found');
        return;
    }
    
    // Show loading state
    booksGrid.innerHTML = '<div class="loading">Loading books...</div>';
    
    try {
        // Fetch books from API
        const books = await fetchBooks();
        
        // Clear loading state
        booksGrid.innerHTML = '';
        
        if (books.length === 0) {
            booksGrid.innerHTML = '<div class="no-books">No books available at the moment.</div>';
            return;
        }
        
        // Create and append book cards
        books.forEach(book => {
            const bookCard = createBookCard(book);
            booksGrid.appendChild(bookCard);
        });
        
        console.log(`Rendered ${books.length} books in the grid`);
    } catch (error) {
        console.error('Error rendering books:', error);
        booksGrid.innerHTML = '<div class="error">Error loading books. Please try again later.</div>';
    }
}

// Function to handle book card clicks
function handleBookClick(book) {
    console.log('Book clicked:', book.title);
    
    // Check if book is in stock
    if (book.stock === 0) {
        alert(`Sorry, "${book.title}" is currently out of stock.`);
        return;
    }
    
    // Display book details
    const formattedPrice = formatPrice(book.price, book.currency);
    alert(`
Title: ${book.title}
Author: ${book.author}
Genre: ${book.genre}
Price: ${formattedPrice}
Stock: ${book.stock} available

${book.description}
    `);
}

// Function to filter books by genre
function filterBooksByGenre(genre) {
    const filteredBooks = genre === 'all' ? booksData : booksData.filter(book => 
        book.genre.toLowerCase() === genre.toLowerCase()
    );
    
    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '';
    
    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = `<div class="no-books">No books found in ${genre} genre.</div>`;
        return;
    }
    
    filteredBooks.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
    
    console.log(`Filtered books by genre: ${genre}, showing ${filteredBooks.length} books`);
}

// Function to search books by title or author
function searchBooks(searchTerm) {
    const filteredBooks = booksData.filter(book => 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '';
    
    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = `<div class="no-books">No books found matching "${searchTerm}".</div>`;
        return;
    }
    
    filteredBooks.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
    
    console.log(`Search results for "${searchTerm}": ${filteredBooks.length} books found`);
}

// Function to handle buy now button
async function handleBuyNow(bookId) {
    try {
        // Find the book
        const book = booksData.find(b => b.id === bookId);
        if (!book) {
            alert('Book not found!');
            return;
        }
        
        if (book.stock === 0) {
            alert('Sorry, this book is out of stock.');
            return;
        }
        
        // Show loading state
        const buyBtn = document.querySelector(`[onclick="handleBuyNow(${bookId})"]`);
        const originalText = buyBtn.textContent;
        buyBtn.disabled = true;
        buyBtn.textContent = '⏳ Creating checkout...';
        
        // Create Stripe checkout session
        const response = await fetch(window.API_CONFIG.buildURL(window.API_CONFIG.ENDPOINTS.CHECKOUT), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bookId: bookId,
                quantity: 1
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.url) {
            // Redirect to Stripe checkout
            window.location.href = result.url;
        } else {
            throw new Error(result.error || 'Failed to create checkout session');
        }
        
    } catch (error) {
        console.error('Buy now error:', error);
        
        // Reset button state
        const buyBtn = document.querySelector(`[onclick="handleBuyNow(${bookId})"]`);
        if (buyBtn) {
            buyBtn.disabled = false;
            buyBtn.textContent = '💳 Buy Now';
        }
        
        // Show user-friendly error message
        if (error.message.includes('Stripe not configured')) {
            alert('Payment system is not configured yet. Please check the setup guide in docs/STRIPE_SETUP.md');
        } else {
            alert(`Error: ${error.message}`);
        }
    }
}

// Function to refresh books from API
async function refreshBooks() {
    console.log('Refreshing books from API...');
    await renderBooksGrid();
}

// Add to cart functionality
function addToCart(bookId) {
    try {
        // Find the book
        const book = booksData.find(b => b.id == bookId);
        if (!book) {
            alert('Book not found!');
            return;
        }
        
        if (book.stock === 0) {
            alert('Sorry, this book is out of stock.');
            return;
        }
        
        // Get the button for animation
        const button = document.querySelector(`[onclick="addToCart('${bookId}')"]`);
        if (button) {
            // Add loading state
            button.classList.add('loading');
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            button.disabled = true;
            
            // Simulate brief loading time for better UX
            setTimeout(() => {
                // Use cart system to add item
                if (window.cart) {
                    const success = window.cart.addToCart({
                        id: book.id,
                        title: book.title,
                        author: book.author,
                        price: book.price,
                        coverImage: book.cover || book.coverImage,
                        stock: book.stock
                    });
                    
                    if (success) {
                        // Brief success animation
                        button.innerHTML = '<i class="fas fa-check"></i> Added!';
                        button.style.background = '#10b981';
                        
                        // Reset button after delay
                        setTimeout(() => {
                            button.innerHTML = originalText;
                            button.style.background = '';
                            button.classList.remove('loading');
                            button.disabled = false;
                        }, 1000);
                    } else {
                        button.innerHTML = originalText;
                        button.classList.remove('loading');
                        button.disabled = false;
                    }
                } else {
                    console.error('Cart system not available');
                    alert('Cart system is not ready yet. Please try again.');
                    button.innerHTML = originalText;
                    button.classList.remove('loading');
                    button.disabled = false;
                }
            }, 300);
        }
        
    } catch (error) {
        console.error('Add to cart error:', error);
        alert('Error adding item to cart. Please try again.');
    }
}

// Make functions globally available
window.handleBuyNow = handleBuyNow;
window.addToCart = addToCart;

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Teneo Books Marketplace loaded');
    renderBooksGrid();
});

// Export functions for potential future module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchBooks,
        createBookCard,
        renderBooksGrid,
        handleBookClick,
        filterBooksByGenre,
        searchBooks,
        refreshBooks
    };
}