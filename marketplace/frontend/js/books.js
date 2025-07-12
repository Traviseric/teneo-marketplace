// Sample book data for the marketplace
const sampleBooks = [
    {
        id: 1,
        title: "The Midnight Library",
        author: "Matt Haig",
        genre: "Fiction",
        price: "$12.99",
        description: "A dazzling novel about all the choices that go into a life well lived, from the internationally bestselling author of Reasons to Stay Alive.",
        cover: "📚"
    },
    {
        id: 2,
        title: "Sapiens: A Brief History of Humankind",
        author: "Yuval Noah Harari",
        genre: "Non-Fiction",
        price: "$15.99",
        description: "From a renowned historian comes a groundbreaking narrative of humanity's creation and evolution that explores the ways in which biology and history have defined us.",
        cover: "🧠"
    },
    {
        id: 3,
        title: "Project Hail Mary",
        author: "Andy Weir",
        genre: "Science Fiction",
        price: "$14.99",
        description: "A lone astronaut must save the earth and humanity in this brilliant, funny, and absolutely gripping new novel from the author of The Martian.",
        cover: "🚀"
    },
    {
        id: 4,
        title: "Atomic Habits",
        author: "James Clear",
        genre: "Self-Help",
        price: "$13.99",
        description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones. A supremely practical and useful book that will help you build good habits and break bad ones.",
        cover: "⚛️"
    },
    {
        id: 5,
        title: "The Seven Husbands of Evelyn Hugo",
        author: "Taylor Jenkins Reid",
        genre: "Fiction",
        price: "$11.99",
        description: "A reclusive Hollywood icon finally tells her story in this captivating and deeply emotional novel about love, ambition, and the price of fame.",
        cover: "✨"
    },
    {
        id: 6,
        title: "Educated",
        author: "Tara Westover",
        genre: "Memoir",
        price: "$13.49",
        description: "A powerful memoir about a woman who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.",
        cover: "🎓"
    }
];

// Function to create a book card element
function createBookCard(book) {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.setAttribute('data-book-id', book.id);
    
    bookCard.innerHTML = `
        <div class="book-cover">${book.cover}</div>
        <div class="book-title">${book.title}</div>
        <div class="book-author">by ${book.author}</div>
        <div class="book-genre">${book.genre}</div>
        <div class="book-description">${book.description}</div>
        <div class="book-price">${book.price}</div>
    `;
    
    // Add click event listener for future functionality
    bookCard.addEventListener('click', function() {
        handleBookClick(book);
    });
    
    return bookCard;
}

// Function to render all books in the grid
function renderBooksGrid() {
    const booksGrid = document.getElementById('books-grid');
    
    if (!booksGrid) {
        console.error('Books grid container not found');
        return;
    }
    
    // Clear existing content
    booksGrid.innerHTML = '';
    
    // Create and append book cards
    sampleBooks.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
    
    console.log(`Rendered ${sampleBooks.length} books in the grid`);
}

// Function to handle book card clicks
function handleBookClick(book) {
    console.log('Book clicked:', book.title);
    // Future: Add modal, navigation to detail page, etc.
    alert(`You clicked on "${book.title}" by ${book.author}\nPrice: ${book.price}`);
}

// Function to filter books by genre (for future use)
function filterBooksByGenre(genre) {
    const filteredBooks = genre === 'all' ? sampleBooks : sampleBooks.filter(book => 
        book.genre.toLowerCase() === genre.toLowerCase()
    );
    
    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '';
    
    filteredBooks.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
    
    console.log(`Filtered books by genre: ${genre}, showing ${filteredBooks.length} books`);
}

// Function to search books by title or author (for future use)
function searchBooks(searchTerm) {
    const filteredBooks = sampleBooks.filter(book => 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const booksGrid = document.getElementById('books-grid');
    booksGrid.innerHTML = '';
    
    filteredBooks.forEach(book => {
        const bookCard = createBookCard(book);
        booksGrid.appendChild(bookCard);
    });
    
    console.log(`Search results for "${searchTerm}": ${filteredBooks.length} books found`);
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Teneo Books Marketplace loaded');
    renderBooksGrid();
});

// Export functions for potential future module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sampleBooks,
        createBookCard,
        renderBooksGrid,
        handleBookClick,
        filterBooksByGenre,
        searchBooks
    };
}