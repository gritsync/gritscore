#!/bin/bash

# Build script for Railway deployment
echo "🚀 Starting build process..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --break-system-packages -r requirements.txt

# Ensure gunicorn is installed
echo "🔧 Installing gunicorn..."
pip install --break-system-packages gunicorn

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p user_data

echo "✅ Build complete!" 