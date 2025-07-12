-- Teneo Marketplace Database Initialization Script
-- This script creates the initial database schema for the marketplace

-- Create books table
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    cover VARCHAR(255), -- emoji or image URL
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    isbn VARCHAR(17), -- ISBN-13 format
    publisher VARCHAR(255),
    publication_date DATE,
    page_count INTEGER,
    language VARCHAR(50) DEFAULT 'English',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for future authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- For future authentication
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'customer',
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table for purchase tracking
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    stripe_session_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    customer_email VARCHAR(255),
    shipping_address JSONB,
    billing_address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table for order details
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create categories table for book organization
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create book_categories junction table (many-to-many)
CREATE TABLE IF NOT EXISTS book_categories (
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, category_id)
);

-- Create reviews table for future features
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_price ON books(price);
CREATE INDEX IF NOT EXISTS idx_books_stock ON books(stock);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_reviews_book_id ON reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Insert sample data
INSERT INTO books (title, author, genre, description, price, cover, stock, isbn, publisher, publication_date, page_count) VALUES
    ('The Midnight Library', 'Matt Haig', 'Fiction', 'A dazzling novel about all the choices that go into a life well lived.', 12.99, '📚', 10, '978-0525559474', 'Viking', '2020-08-13', 288),
    ('Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', 'Non-Fiction', 'A groundbreaking narrative of humanity''s creation and evolution.', 15.99, '🧠', 15, '978-0062316110', 'Harper', '2015-02-10', 464),
    ('Project Hail Mary', 'Andy Weir', 'Science Fiction', 'A lone astronaut must save the earth and humanity.', 14.99, '🚀', 8, '978-0593135204', 'Ballantine Books', '2021-05-04', 496),
    ('Atomic Habits', 'James Clear', 'Self-Help', 'An Easy & Proven Way to Build Good Habits & Break Bad Ones.', 13.99, '⚛️', 20, '978-0735211292', 'Avery', '2018-10-16', 320),
    ('The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'Fiction', 'A captivating novel about love, ambition, and the price of fame.', 11.99, '✨', 12, '978-1501161933', 'Atria Books', '2017-06-13', 400),
    ('Educated', 'Tara Westover', 'Memoir', 'A powerful memoir about education and self-invention.', 13.49, '🎓', 18, '978-0399590504', 'Random House', '2018-02-20', 334)
ON CONFLICT (title, author) DO NOTHING;

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
    ('Fiction', 'Fictional stories and novels'),
    ('Non-Fiction', 'Factual and educational books'),
    ('Science Fiction', 'Science fiction and fantasy'),
    ('Self-Help', 'Personal development and improvement'),
    ('Memoir', 'Personal life stories and autobiographies'),
    ('Business', 'Business and entrepreneurship'),
    ('Technology', 'Technology and programming'),
    ('History', 'Historical books and biographies')
ON CONFLICT (name) DO NOTHING;

-- Link books to categories
INSERT INTO book_categories (book_id, category_id) 
SELECT b.id, c.id 
FROM books b, categories c 
WHERE (b.title = 'The Midnight Library' AND c.name = 'Fiction')
   OR (b.title = 'Sapiens: A Brief History of Humankind' AND c.name = 'Non-Fiction')
   OR (b.title = 'Project Hail Mary' AND c.name = 'Science Fiction')
   OR (b.title = 'Atomic Habits' AND c.name = 'Self-Help')
   OR (b.title = 'The Seven Husbands of Evelyn Hugo' AND c.name = 'Fiction')
   OR (b.title = 'Educated' AND c.name = 'Memoir')
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for book statistics
CREATE OR REPLACE VIEW book_stats AS
SELECT 
    b.id,
    b.title,
    b.author,
    b.price,
    b.stock,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as review_count,
    COALESCE(SUM(oi.quantity), 0) as total_sold
FROM books b
LEFT JOIN reviews r ON b.id = r.book_id
LEFT JOIN order_items oi ON b.id = oi.book_id
LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
GROUP BY b.id, b.title, b.author, b.price, b.stock;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO teneo;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO teneo;