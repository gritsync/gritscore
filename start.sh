#!/bin/bash

# Startup script for Railway deployment
echo "🚀 Starting GritScore application..."

# Set environment variables for numpy/matplotlib compatibility
export LD_LIBRARY_PATH="/nix/store/*/lib:$LD_LIBRARY_PATH"
export LIBRARY_PATH="/nix/store/*/lib:$LIBRARY_PATH"
export PKG_CONFIG_PATH="/nix/store/*/lib/pkgconfig:$PKG_CONFIG_PATH"

# Set matplotlib backend to Agg for headless environment
export MPLBACKEND=Agg

# Create necessary directories if they don't exist
mkdir -p uploads
mkdir -p user_data

# Test basic Python imports
echo "🧪 Testing basic imports..."
python -c "import os, json, io, base64; print('Basic imports successful')"

# Test NumPy import (optional - will be handled gracefully in app)
echo "🧪 Testing NumPy import..."
python -c "import numpy; print(f'NumPy version: {numpy.__version__}')" || echo "NumPy import failed - will be handled gracefully"

# Start the application
echo "🌐 Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:$PORT wsgi:app --workers 2 --timeout 120 