# Getting Started with Book Marketplace

This guide will help you set up your own book marketplace in under 10 minutes.

## Prerequisites

- Node.js 14+ and npm
- Git
- A text editor (VS Code recommended)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/book-marketplace.git
cd book-marketplace
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (if separate)
cd ../frontend
npm install
```

### 3. Configure Environment

Create a `.env` file in the backend directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Basic Configuration
PORT=3000
NODE_ENV=development

# Branding
MARKETPLACE_NAME=My Bookstore
MARKETPLACE_TAGLINE=Digital Books Made Simple

# Email (for order notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Stripe (for payments)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### 4. Initialize Database

The marketplace uses SQLite by default (no setup required!):

```bash
# Database will be created automatically on first run
# Location: backend/database/marketplace.db
```

### 5. Start the Server

```bash
cd backend
npm start
```

Your marketplace is now running at http://localhost:3000!

## First Steps

### 1. Access Admin Panel

Navigate to http://localhost:3000/admin and log in with:
- Password: `admin123` (change this immediately!)

### 2. Add Your First Book

1. Click "Add New Book" in the admin panel
2. Fill in book details:
   - Title and author
   - Description
   - Price (or 0 for free)
   - Upload PDF file
   - Upload preview PDF (optional)

### 3. Customize Your Store

Edit frontend files to match your brand:
- `frontend/index.html` - Homepage
- `frontend/css/style.css` - Styling
- Update logo and colors

### 4. Test a Purchase

1. Visit your store homepage
2. Click on a book
3. Click "Buy Now"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Check your email for the download link

## Project Structure

```
marketplace/
├── backend/
│   ├── server.js           # Main server file
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth & security
│   ├── services/           # Email & payment
│   └── database/           # SQLite database
├── frontend/
│   ├── index.html          # Store homepage
│   ├── admin.html          # Admin panel
│   ├── css/                # Styling
│   └── js/                 # Client-side logic
└── docs/                   # Documentation
```

## Common Tasks

### Change Admin Password

1. Install bcrypt: `npm install bcryptjs`
2. Generate new password hash:
   ```javascript
   const bcrypt = require('bcryptjs');
   console.log(bcrypt.hashSync('your-new-password', 10));
   ```
3. Update `backend/middleware/auth.js` with the new hash

### Enable Email Notifications

1. Create an app password for your Gmail account
2. Update EMAIL_USER and EMAIL_PASS in `.env`
3. Restart the server

### Add Custom Pages

Create new HTML files in the frontend directory and link them from your navigation.

## Troubleshooting

### Port Already in Use
Change the PORT in `.env` to another number (e.g., 3001)

### Email Not Sending
- Check EMAIL_HOST and EMAIL_PORT settings
- Ensure EMAIL_PASS is an app password, not your regular password
- Check spam folder

### Database Errors
- Delete `backend/database/marketplace.db` to start fresh
- Ensure write permissions on the database directory

## Next Steps

- Read [Configuration Guide](./configuration.md) for all options
- Set up [Stripe](./stripe-setup.md) for real payments
- Deploy to [Vercel](./deployment/vercel.md) or [Render](./deployment/render.md)
- Join the [Federation Network](./federation.md)

## Getting Help

- GitHub Issues: Report bugs or request features
- Documentation: Check other guides in the docs folder
- Community: Join our Discord server

Happy selling! 🚀