# Deployment Checklist for GritScore

## Pre-Deployment Checklist

### ✅ Environment Variables
- [ ] `.env` file is properly configured with all required keys
- [ ] No sensitive keys are committed to Git
- [ ] Production environment variables are set on deployment platform
- [ ] All API keys are valid and have sufficient credits/limits

### ✅ Dependencies
- [ ] All Python dependencies are listed in `requirements.txt`
- [ ] All Node.js dependencies are listed in `package.json`
- [ ] Dependencies are compatible with deployment platform
- [ ] No development-only dependencies in production builds

### ✅ Database Setup
- [ ] Supabase project is properly configured
- [ ] Database migrations have been run
- [ ] Row Level Security (RLS) policies are in place
- [ ] Database connection is working in production

### ✅ Authentication
- [ ] JWT secret keys are properly configured
- [ ] Supabase authentication is working
- [ ] User registration and login flows work
- [ ] Password reset functionality is tested

### ✅ File Upload
- [ ] Upload directory has proper permissions
- [ ] File size limits are configured
- [ ] File type validation is working
- [ ] Upload cleanup is implemented

### ✅ Payment Processing
- [ ] Stripe keys are configured for production
- [ ] Webhook endpoints are properly set up
- [ ] Payment flows are tested
- [ ] Subscription management is working

### ✅ API Endpoints
- [ ] All API endpoints are responding correctly
- [ ] CORS is properly configured
- [ ] Error handling is implemented
- [ ] Rate limiting is in place (recommended)

### ✅ Frontend Build
- [ ] Frontend builds successfully (`npm run build`)
- [ ] All assets are properly bundled
- [ ] Environment variables are accessible in frontend
- [ ] No console errors in production build

### ✅ Security
- [ ] Environment variables are not exposed in frontend
- [ ] API keys are not hardcoded
- [ ] Input validation is implemented
- [ ] SQL injection protection is in place

## Deployment Steps

### 1. Backend Deployment (Heroku/Railway/Render)

```bash
# 1. Create new app on your platform
# 2. Connect your Git repository
# 3. Set environment variables in platform dashboard
# 4. Deploy the application
```

**Required Environment Variables:**
```
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_supabase_anon_key
JWT_SECRET_KEY=your_production_jwt_secret
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_production_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_production_stripe_publishable_key
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_API_SECRET=your_mailjet_api_secret
FLASK_ENV=production
DEBUG=False
```

### 2. Frontend Deployment (Vercel/Netlify)

```bash
# 1. Build the frontend
npm run build

# 2. Deploy the dist/ folder to your platform
# 3. Configure environment variables for frontend
```

**Required Environment Variables:**
```
VITE_SUPABASE_URL=your_production_supabase_url
VITE_SUPABASE_ANON_KEY=your_production_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_production_stripe_publishable_key
VITE_API_BASE_URL=your_backend_api_url
```

### 3. Database Migration

```bash
# Run migrations on production database
python migrate.py
```

### 4. Webhook Configuration

1. Set up Stripe webhook endpoint pointing to your production backend
2. Configure webhook events for subscription updates
3. Test webhook delivery

## Post-Deployment Verification

### ✅ Functionality Tests
- [ ] User registration and login
- [ ] Credit report upload and analysis
- [ ] Dispute letter generation
- [ ] Payment processing
- [ ] Subscription management
- [ ] AI chat functionality
- [ ] Budget tracking features

### ✅ Performance Tests
- [ ] Page load times are acceptable
- [ ] API response times are reasonable
- [ ] File uploads work correctly
- [ ] No memory leaks detected

### ✅ Security Tests
- [ ] Authentication is working properly
- [ ] Unauthorized access is blocked
- [ ] Sensitive data is not exposed
- [ ] Input validation is working

### ✅ Monitoring Setup
- [ ] Error logging is configured
- [ ] Performance monitoring is set up
- [ ] Uptime monitoring is active
- [ ] Database monitoring is configured

## Troubleshooting Common Issues

### Environment Variables
- **Issue**: Frontend can't access environment variables
- **Solution**: Ensure variables start with `VITE_` prefix

### CORS Errors
- **Issue**: Frontend can't connect to backend API
- **Solution**: Configure CORS in backend to allow frontend domain

### Database Connection
- **Issue**: Database connection fails
- **Solution**: Check Supabase URL and keys, ensure RLS policies are correct

### File Uploads
- **Issue**: File uploads fail
- **Solution**: Check upload directory permissions and file size limits

### Payment Processing
- **Issue**: Stripe payments fail
- **Solution**: Verify Stripe keys are for production, check webhook configuration

## Maintenance

### Regular Tasks
- [ ] Monitor error logs
- [ ] Check API usage and limits
- [ ] Update dependencies regularly
- [ ] Backup database
- [ ] Monitor performance metrics

### Security Updates
- [ ] Keep dependencies updated
- [ ] Monitor for security vulnerabilities
- [ ] Rotate API keys periodically
- [ ] Review access logs

---

**Note**: This checklist should be completed before each deployment to ensure a smooth production experience. 