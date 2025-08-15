#!/bin/bash
# Start script for Render deployment

echo "🎯 Starting Teneo Marketplace server..."

# Navigate to backend directory
cd marketplace/backend

# Start the server
node server.js