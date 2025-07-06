# Railway Deployment Preparation Script for GritScore Backend
# This script prepares the backend for deployment to Railway

Write-Host "🚀 Preparing GritScore Backend for Railway Deployment..." -ForegroundColor Green

# Check if Railway CLI is installed
Write-Host "📋 Checking Railway CLI installation..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found. Installing..." -ForegroundColor Red
    npm install -g @railway/cli
}

# Check if user is logged in to Railway
Write-Host "🔐 Checking Railway login status..." -ForegroundColor Yellow
try {
    $loginStatus = railway whoami
    Write-Host "✅ Logged in as: $loginStatus" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Railway. Please run: railway login" -ForegroundColor Red
    Write-Host "Please login to Railway and run this script again." -ForegroundColor Yellow
    exit 1
}

# Validate required files
Write-Host "📁 Validating deployment files..." -ForegroundColor Yellow

$requiredFiles = @(
    "app.py",
    "wsgi.py", 
    "requirements.txt",
    "Procfile",
    "railway.json",
    "nixpacks.toml",
    "runtime.txt"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file found" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
        exit 1
    }
}

# Check Python dependencies
Write-Host "🐍 Validating Python dependencies..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    Write-Host "✅ requirements.txt found" -ForegroundColor Green
} else {
    Write-Host "❌ requirements.txt missing" -ForegroundColor Red
    exit 1
}

# Check for environment variables
Write-Host "🔧 Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "⚠️  .env file found - make sure to set environment variables in Railway dashboard" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️  No .env file found - you'll need to set environment variables in Railway dashboard" -ForegroundColor Cyan
}

# Display required environment variables
Write-Host "`n📋 Required Environment Variables for Railway:" -ForegroundColor Cyan
Write-Host "SUPABASE_URL=your_supabase_project_url" -ForegroundColor White
Write-Host "SUPABASE_ANON_KEY=your_supabase_anon_key" -ForegroundColor White
Write-Host "FLASK_SECRET_KEY=your_flask_secret_key" -ForegroundColor White
Write-Host "JWT_SECRET_KEY=your_jwt_secret_key" -ForegroundColor White
Write-Host "OPENAI_API_KEY=your_openai_api_key" -ForegroundColor White
Write-Host "STRIPE_SECRET_KEY=your_stripe_secret_key" -ForegroundColor White
Write-Host "STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key" -ForegroundColor White
Write-Host "APP_URL=https://your-railway-app-url.railway.app" -ForegroundColor White
Write-Host "MAILJET_API_KEY=your_mailjet_api_key" -ForegroundColor White
Write-Host "MAILJET_API_SECRET=your_mailjet_api_secret" -ForegroundColor White
Write-Host "FLASK_ENV=production" -ForegroundColor White
Write-Host "DEBUG=False" -ForegroundColor White

# Check if Railway project is initialized
Write-Host "`n🔍 Checking Railway project status..." -ForegroundColor Yellow
try {
    $projectStatus = railway status
    Write-Host "✅ Railway project found" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  No Railway project found. Run 'railway init' to create one." -ForegroundColor Yellow
}

Write-Host "`n🎯 Deployment Preparation Complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set environment variables in Railway dashboard" -ForegroundColor White
Write-Host "2. Run 'railway up' to deploy" -ForegroundColor White
Write-Host "3. Check deployment logs with 'railway logs'" -ForegroundColor White
Write-Host "4. Monitor your app at the provided Railway URL" -ForegroundColor White

Write-Host "`n📚 For detailed instructions, see RAILWAY_DEPLOYMENT.md" -ForegroundColor Yellow 