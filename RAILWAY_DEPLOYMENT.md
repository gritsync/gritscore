# Railway Deployment Guide for GritScore Backend

## 🚀 Quick Deployment Steps

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Initialize Railway Project
```bash
railway init
```

### 4. Deploy to Railway
```bash
railway up
```

## 🔧 Environment Variables Setup

After deployment, set these environment variables in Railway dashboard:

### Required Environment Variables:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
FLASK_SECRET_KEY=your_flask_secret_key
JWT_SECRET_KEY=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
APP_URL=https://your-railway-app-url.railway.app
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_API_SECRET=your_mailjet_api_secret
FLASK_ENV=production
DEBUG=False
```

### Optional Environment Variables:
```
PORT=5000 (Railway sets this automatically)
```

## 📁 Project Structure for Railway

```
GritScore/
├── app.py                 # Main Flask application
├── wsgi.py               # WSGI entry point
├── requirements.txt      # Python dependencies
├── Procfile             # Railway process file
├── railway.json         # Railway configuration
├── nixpacks.toml       # Build configuration
├── runtime.txt          # Python version
└── RAILWAY_DEPLOYMENT.md # This file
```

## 🔍 Health Check Endpoints

- **Root**: `GET /` - Basic health check
- **API Status**: `GET /api/health` - API health status

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Failures**: Check Python version compatibility
2. **Import Errors**: Ensure all dependencies are in requirements.txt
3. **Environment Variables**: Verify all required env vars are set
4. **Port Issues**: Railway automatically sets PORT environment variable

### Debug Commands:
```bash
# View logs
railway logs

# Check status
railway status

# Restart service
railway service restart
```

## 🔗 Connecting Frontend

Update your Vercel frontend environment variables:
```
REACT_APP_API_URL=https://your-railway-app-url.railway.app
```

## 📊 Monitoring

- Railway provides built-in monitoring
- Check logs in Railway dashboard
- Set up alerts for downtime

## 🔒 Security Notes

- All API keys are encrypted in Railway
- Use production keys for all services
- Enable CORS for your Vercel domain
- Set up proper JWT token expiration

## 🚀 Next Steps

1. Deploy to Railway
2. Set environment variables
3. Test API endpoints
4. Update frontend API URL
5. Monitor performance
6. Set up custom domain (optional) 