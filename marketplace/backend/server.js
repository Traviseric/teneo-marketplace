const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Sample book data (same as frontend for consistency)
const books = [
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
    },
    {
        id: 3,
        title: "Project Hail Mary",
        author: "Andy Weir",
        genre: "Science Fiction",
        price: 14.99,
        currency: "USD",
        description: "A lone astronaut must save the earth and humanity.",
        cover: "🚀",
        stock: 8
    },
    {
        id: 4,
        title: "Atomic Habits",
        author: "James Clear",
        genre: "Self-Help",
        price: 13.99,
        currency: "USD",
        description: "An Easy & Proven Way to Build Good Habits & Break Bad Ones.",
        cover: "⚛️",
        stock: 20
    },
    {
        id: 5,
        title: "The Seven Husbands of Evelyn Hugo",
        author: "Taylor Jenkins Reid",
        genre: "Fiction",
        price: 11.99,
        currency: "USD",
        description: "A captivating novel about love, ambition, and the price of fame.",
        cover: "✨",
        stock: 12
    },
    {
        id: 6,
        title: "Educated",
        author: "Tara Westover",
        genre: "Memoir",
        price: 13.49,
        currency: "USD",
        description: "A powerful memoir about education and self-invention.",
        cover: "🎓",
        stock: 18
    }
];

// API Routes

// Network routes
app.use('/api', require('./routes/network'));

// Download routes
app.use('/api/download', require('./routes/download'));

// Checkout routes (production-ready)
app.use('/api/checkout', require('./routes/checkout'));

// Get all books
app.get('/api/books', (req, res) => {
    res.json({
        success: true,
        data: books,
        count: books.length
    });
});

// Get single book by ID
app.get('/api/books/:id', (req, res) => {
    const bookId = parseInt(req.params.id);
    const book = books.find(b => b.id === bookId);
    
    if (!book) {
        return res.status(404).json({
            success: false,
            error: 'Book not found'
        });
    }
    
    res.json({
        success: true,
        data: book
    });
});

// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { bookId, quantity = 1 } = req.body;
        
        if (!bookId) {
            return res.status(400).json({
                success: false,
                error: 'Book ID is required'
            });
        }
        
        // Find the book
        const book = books.find(b => b.id === parseInt(bookId));
        if (!book) {
            return res.status(404).json({
                success: false,
                error: 'Book not found'
            });
        }
        
        // Check stock
        if (book.stock < quantity) {
            return res.status(400).json({
                success: false,
                error: `Only ${book.stock} copies available`
            });
        }
        
        // Check if Stripe is configured
        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({
                success: false,
                error: 'Stripe not configured. Please add STRIPE_SECRET_KEY to your .env file.'
            });
        }
        
        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: book.title,
                            description: `by ${book.author} - ${book.description}`,
                            metadata: {
                                bookId: book.id.toString(),
                                genre: book.genre
                            }
                        },
                        unit_amount: Math.round(book.price * 100), // Convert to cents
                    },
                    quantity: quantity,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/cancel`,
            metadata: {
                bookId: book.id.toString(),
                bookTitle: book.title,
                quantity: quantity.toString()
            }
        });
        
        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
        
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create checkout session',
            details: error.message
        });
    }
});

// Legacy checkout endpoint (keeping for backward compatibility)
app.post('/api/checkout', async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid checkout data'
            });
        }
        
        // Calculate total
        let total = 0;
        const orderItems = [];
        
        for (const item of items) {
            const book = books.find(b => b.id === item.bookId);
            if (!book) {
                return res.status(400).json({
                    success: false,
                    error: `Book with ID ${item.bookId} not found`
                });
            }
            
            if (book.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    error: `Insufficient stock for ${book.title}`
                });
            }
            
            total += book.price * item.quantity;
            orderItems.push({
                ...book,
                quantity: item.quantity,
                subtotal: book.price * item.quantity
            });
        }
        
        // Return mock response for legacy compatibility
        res.json({
            success: true,
            message: 'Use /api/create-checkout-session for Stripe integration',
            data: {
                orderId: `ORDER-${Date.now()}`,
                total: total.toFixed(2),
                currency: 'USD',
                items: orderItems,
                status: 'pending'
            }
        });
        
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create checkout session'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📚 API available at http://localhost:${PORT}/api`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
});