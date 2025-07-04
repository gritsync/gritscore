#!/bin/bash

# GritScore.ai Deployment Script
# This script prepares the application for production deployment

echo "🚀 Starting GritScore.ai deployment preparation..."

# 1. Clean up development files
echo "🧹 Cleaning up development files..."
rm -rf __pycache__
rm -rf .pytest_cache
rm -rf dist
rm -rf node_modules/.cache

# 2. Install production dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

# 3. Build frontend
echo "🔨 Building frontend..."
npm run build

# 4. Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install -r requirements.txt

# 5. Check environment variables
echo "🔍 Checking environment variables..."
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Please create one based on env.example"
    echo "📋 Required environment variables:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - FLASK_SECRET_KEY"
    echo "   - JWT_SECRET_KEY"
    echo "   - OPENAI_API_KEY"
    echo "   - STRIPE_SECRET_KEY"
    echo "   - STRIPE_PUBLISHABLE_KEY"
    echo "   - MAILJET_API_KEY"
    echo "   - MAILJET_API_SECRET"
    echo "   - APP_URL"
    echo "   - FLASK_ENV=production"
    echo "   - DEBUG=False"
else
    echo "✅ .env file found"
fi

# 6. Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads
mkdir -p user_data

# 7. Set proper permissions
echo "🔐 Setting proper permissions..."
chmod 755 uploads
chmod 755 user_data

echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up your production environment variables"
echo "2. Deploy to your chosen platform (Heroku, Railway, Render, etc.)"
echo "3. Configure your domain and SSL certificates"
echo "4. Set up monitoring and logging"
echo ""
echo "📚 See DEPLOYMENT_CHECKLIST.md for detailed instructions" 