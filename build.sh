#!/bin/bash
# Build script for Render deployment

echo "🚀 Starting OpenBazaar AI build..."

# Navigate to backend directory
cd marketplace/backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p database
mkdir -p books
mkdir -p logs

# Initialize database
echo "💾 Initializing database..."
node database/init.js || true

echo "✅ Build complete!"