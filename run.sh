#!/bin/bash

# Transaction Tapestry View - Run Script
# This script sets up and runs the development server

set -e

echo "🎨 Transaction Tapestry View"
echo "=============================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the development server
echo "🚀 Starting development server..."
echo "   The app will open at http://localhost:5173"
echo ""
npm run dev
