// API configuration
const API_BASE_URL = window.location.origin + '/api';

// Global variable to store books data
let booksData = [];

// Function to fetch books from API
async function fetchBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/books`);
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
    
    bookCard.innerHTML = `
        <div class="book-cover">${book.cover}</div>
        <div class="book-title">${book.title}</div>
        <div class="book-author">by ${book.author}</div>
        <div class="book-genre">${book.genre}</div>
        <div class="book-description">${book.description}</div>
        <div class="book-footer">
            <div class="book-price">${formattedPrice}</div>
            ${stockStatus}
        </div>
    `;
    
    // Add click event listener
    bookCard.addEventListener('click', function() {
        handleBookClick(book);
    });
    
    return bookCard;
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

// Function to refresh books from API
async function refreshBooks() {
    console.log('Refreshing books from API...');
    await renderBooksGrid();
}

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