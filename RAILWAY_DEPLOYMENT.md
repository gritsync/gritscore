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

### 3. Initialize Railway Project (if not already done)
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
├── prepare_railway_deploy.ps1  # Windows deployment script
├── prepare_railway_deploy.sh   # Unix deployment script
└── RAILWAY_DEPLOYMENT.md # This file
```

## 🔍 Health Check Endpoints

- **Root**: `GET /` - Basic health check
- **API Status**: `GET /api/health` - API health status

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Failures**: 
   - Check Python version compatibility (using Python 3.11.7)
   - Ensure all dependencies are in requirements.txt
   - Check nixpacks.toml configuration

2. **Import Errors**: 
   - Ensure all dependencies are in requirements.txt
   - Check for missing packages in the build logs

3. **Environment Variables**: 
   - Verify all required env vars are set in Railway dashboard
   - Check that no sensitive data is in the code

4. **Port Issues**: 
   - Railway automatically sets PORT environment variable
   - Gunicorn is configured to bind to 0.0.0.0:$PORT

5. **Database Connection Issues**:
   - Verify Supabase URL and keys are correct
   - Check that RLS policies are properly configured
   - Ensure database is accessible from Railway's IP range

### Debug Commands:
```bash
# View logs
railway logs

# Check status
railway status

# Restart service
railway service restart

# Check environment variables
railway variables
```

## 🔗 Connecting Frontend

Update your Vercel frontend environment variables:
```
VITE_API_BASE_URL=https://your-railway-app-url.railway.app
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## 📊 Monitoring

- Railway provides built-in monitoring
- Check logs in Railway dashboard
- Set up alerts for downtime
- Monitor API response times

## 🔒 Security Notes

- All API keys are encrypted in Railway
- Use production keys for all services
- Enable CORS for your Vercel domain
- Set up proper JWT token expiration
- Never commit .env files to Git

## 🚀 Deployment Preparation Scripts

### Windows (PowerShell):
```powershell
.\prepare_railway_deploy.ps1
```

### Unix/Linux/macOS:
```bash
./prepare_railway_deploy.sh
```

These scripts will:
- Check Railway CLI installation
- Validate login status
- Verify all required files exist
- Display required environment variables
- Check project initialization status

## 📋 Pre-Deployment Checklist

- [ ] Railway CLI installed and logged in
- [ ] All required files present (app.py, wsgi.py, requirements.txt, etc.)
- [ ] Environment variables ready for Railway dashboard
- [ ] Supabase project configured with RLS policies
- [ ] Stripe account configured for production
- [ ] OpenAI API key has sufficient credits
- [ ] Mailjet API keys configured
- [ ] Frontend ready to connect to new backend URL

## 🎯 Post-Deployment Verification

1. **Health Check**: Visit your Railway app URL to ensure it's running
2. **API Testing**: Test key endpoints like `/api/auth/health`
3. **Database Connection**: Verify Supabase connection works
4. **File Uploads**: Test PDF upload functionality
5. **Payment Processing**: Test Stripe integration
6. **Email Sending**: Verify Mailjet integration

## 🔄 Continuous Deployment

Railway automatically deploys when you push to your main branch. To set up:

1. Connect your GitHub repository to Railway
2. Configure automatic deployments
3. Set up branch protection rules
4. Monitor deployment logs

## 🚀 Next Steps

1. Deploy to Railway using `railway up`
2. Set environment variables in Railway dashboard
3. Test API endpoints
4. Update frontend API URL
5. Monitor performance
6. Set up custom domain (optional)
7. Configure monitoring and alerts

## 📞 Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Verify environment variables: `railway variables`
3. Check build logs in Railway dashboard
4. Review this documentation
5. Check Railway's official documentation 