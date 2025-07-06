#!/bin/bash

# Railway Deployment Preparation Script for GritScore Backend
# This script prepares the backend for deployment to Railway

echo "🚀 Preparing GritScore Backend for Railway Deployment..."

# Check if Railway CLI is installed
echo "📋 Checking Railway CLI installation..."
if command -v railway &> /dev/null; then
    RAILWAY_VERSION=$(railway --version)
    echo "✅ Railway CLI found: $RAILWAY_VERSION"
else
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in to Railway
echo "🔐 Checking Railway login status..."
if railway whoami &> /dev/null; then
    LOGIN_STATUS=$(railway whoami)
    echo "✅ Logged in as: $LOGIN_STATUS"
else
    echo "❌ Not logged in to Railway. Please run: railway login"
    echo "Please login to Railway and run this script again."
    exit 1
fi

# Validate required files
echo "📁 Validating deployment files..."

required_files=(
    "app.py"
    "wsgi.py"
    "requirements.txt"
    "Procfile"
    "railway.json"
    "nixpacks.toml"
    "runtime.txt"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check Python dependencies
echo "🐍 Validating Python dependencies..."
if [ -f "requirements.txt" ]; then
    echo "✅ requirements.txt found"
else
    echo "❌ requirements.txt missing"
    exit 1
fi

# Check for environment variables
echo "🔧 Checking environment variables..."
if [ -f ".env" ]; then
    echo "⚠️  .env file found - make sure to set environment variables in Railway dashboard"
else
    echo "ℹ️  No .env file found - you'll need to set environment variables in Railway dashboard"
fi

# Display required environment variables
echo ""
echo "📋 Required Environment Variables for Railway:"
echo "SUPABASE_URL=your_supabase_project_url"
echo "SUPABASE_ANON_KEY=your_supabase_anon_key"
echo "FLASK_SECRET_KEY=your_flask_secret_key"
echo "JWT_SECRET_KEY=your_jwt_secret_key"
echo "OPENAI_API_KEY=your_openai_api_key"
echo "STRIPE_SECRET_KEY=your_stripe_secret_key"
echo "STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key"
echo "APP_URL=https://your-railway-app-url.railway.app"
echo "MAILJET_API_KEY=your_mailjet_api_key"
echo "MAILJET_API_SECRET=your_mailjet_api_secret"
echo "FLASK_ENV=production"
echo "DEBUG=False"

# Check if Railway project is initialized
echo ""
echo "🔍 Checking Railway project status..."
if railway status &> /dev/null; then
    echo "✅ Railway project found"
else
    echo "ℹ️  No Railway project found. Run 'railway init' to create one."
fi

echo ""
echo "🎯 Deployment Preparation Complete!"
echo "Next steps:"
echo "1. Set environment variables in Railway dashboard"
echo "2. Run 'railway up' to deploy"
echo "3. Check deployment logs with 'railway logs'"
echo "4. Monitor your app at the provided Railway URL"
echo ""
echo "📚 For detailed instructions, see RAILWAY_DEPLOYMENT.md" 