# GritScore.ai Deployment Script for Windows
# This script prepares the application for production deployment

Write-Host "🚀 Starting GritScore.ai deployment preparation..." -ForegroundColor Green

# 1. Clean up development files
Write-Host "🧹 Cleaning up development files..." -ForegroundColor Yellow
if (Test-Path "__pycache__") { Remove-Item "__pycache__" -Recurse -Force }
if (Test-Path ".pytest_cache") { Remove-Item ".pytest_cache" -Recurse -Force }
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
if (Test-Path "node_modules\.cache") { Remove-Item "node_modules\.cache" -Recurse -Force }

# 2. Install production dependencies
Write-Host "📦 Installing production dependencies..." -ForegroundColor Yellow
npm ci --only=production

# 3. Build frontend
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
npm run build

# 4. Install Python dependencies
Write-Host "🐍 Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# 5. Check environment variables
Write-Host "🔍 Checking environment variables..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found. Please create one based on env.example" -ForegroundColor Red
    Write-Host "📋 Required environment variables:" -ForegroundColor Cyan
    Write-Host "   - SUPABASE_URL" -ForegroundColor White
    Write-Host "   - SUPABASE_ANON_KEY" -ForegroundColor White
    Write-Host "   - FLASK_SECRET_KEY" -ForegroundColor White
    Write-Host "   - JWT_SECRET_KEY" -ForegroundColor White
    Write-Host "   - OPENAI_API_KEY" -ForegroundColor White
    Write-Host "   - STRIPE_SECRET_KEY" -ForegroundColor White
    Write-Host "   - STRIPE_PUBLISHABLE_KEY" -ForegroundColor White
    Write-Host "   - MAILJET_API_KEY" -ForegroundColor White
    Write-Host "   - MAILJET_API_SECRET" -ForegroundColor White
    Write-Host "   - APP_URL" -ForegroundColor White
    Write-Host "   - FLASK_ENV=production" -ForegroundColor White
    Write-Host "   - DEBUG=False" -ForegroundColor White
} else {
    Write-Host "✅ .env file found" -ForegroundColor Green
}

# 6. Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
if (-not (Test-Path "uploads")) { New-Item -ItemType Directory -Path "uploads" }
if (-not (Test-Path "user_data")) { New-Item -ItemType Directory -Path "user_data" }

Write-Host "✅ Deployment preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Set up your production environment variables" -ForegroundColor White
Write-Host "2. Deploy to your chosen platform (Heroku, Railway, Render, etc.)" -ForegroundColor White
Write-Host "3. Configure your domain and SSL certificates" -ForegroundColor White
Write-Host "4. Set up monitoring and logging" -ForegroundColor White
Write-Host ""
Write-Host "📚 See DEPLOYMENT_CHECKLIST.md for detailed instructions" -ForegroundColor Cyan 