# 🔧 Stripe Checkout Fix Guide for GritScore.ai

## 🚨 **Critical Issues Found**

### 1. **Missing Backend Stripe Secret Key**
**Problem**: Backend expects `STRIPE_SECRET_KEY` but environment has `VITE_STRIPE_SECRET_KEY`
**Impact**: Stripe checkout sessions cannot be created
**Status**: ❌ **CRITICAL - BLOCKING CHECKOUT**

### 2. **Wrong APP_URL Configuration**
**Problem**: APP_URL is set to `http://127.0.0.1:5000` instead of production URL
**Impact**: Success/cancel URLs redirect to localhost instead of production
**Status**: ❌ **CRITICAL - BLOCKING REDIRECTS**

### 3. **Mixed Test/Live Keys**
**Problem**: Environment has both test and live keys
**Impact**: Potential confusion and incorrect key usage
**Status**: ⚠️ **WARNING - NEEDS CLEANUP**

## 🔧 **Required Fixes**

### **Step 1: Update Environment Variables**

Add these lines to your `.env` file:

```bash
# Add this line (missing backend secret key):
STRIPE_SECRET_KEY=your_stripe_secret_key

# Update this line (change from localhost to production):
APP_URL=https://gritscore.vercel.app

# Remove or comment out these test keys:
#VITE_STRIPE_SECRET_KEY=sk_test_...
#VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### **Step 2: Verify Complete Environment File**

Your `.env` file should contain:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Flask Configuration
FLASK_SECRET_KEY=your_flask_secret_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Stripe Configuration - Backend (Server-side)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Stripe Configuration - Frontend (Client-side)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Application Configuration
APP_URL=https://gritscore.vercel.app
PORT=5000

#Mailjet
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_API_SECRET=your_mailjet_api_secret
MAILJET_SENDER_EMAIL=noreply@gritscore.ai
MAILJET_SENDER_NAME=GritScore.ai

# JWT Secret Key
JWT_SECRET_KEY=your_jwt_secret_key

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=false
```

### **Step 3: Test Configuration**

Run the test script to verify the fix:

```bash
python test_stripe_config.py
```

Expected output should show:
- ✅ STRIPE_SECRET_KEY: SET
- ✅ APP_URL: https://gritscore.vercel.app
- ✅ Stripe API connection successful

### **Step 4: Restart Backend Server**

After updating the environment variables, restart your backend server:

```bash
# If using Flask directly
python app.py

# If using Railway
railway up
```

## 🔍 **Code Changes Made**

### **1. Updated Subscription API URLs**
- **File**: `src/api/subscription.py`
- **Change**: Success and cancel URLs now use production domain instead of localhost
- **Impact**: Proper redirects after payment

### **2. Updated App Configuration**
- **File**: `app.py`
- **Change**: Default APP_URL now points to production
- **Impact**: Consistent domain usage across the application

## 🧪 **Testing Checklist**

After applying the fixes:

1. **✅ Environment Variables**
   - [ ] STRIPE_SECRET_KEY is set
   - [ ] APP_URL points to production
   - [ ] No test keys in production

2. **✅ Backend API**
   - [ ] Stripe API connection works
   - [ ] Checkout session creation works
   - [ ] Webhook endpoint accessible

3. **✅ Frontend Integration**
   - [ ] Stripe.js loads correctly
   - [ ] Checkout redirects work
   - [ ] Success/cancel pages load

4. **✅ Payment Flow**
   - [ ] User can select a plan
   - [ ] Stripe checkout opens
   - [ ] Payment processes successfully
   - [ ] User redirects to success page
   - [ ] Plan updates in database

## 🚀 **Deployment Steps**

### **For Railway Deployment:**

1. **Set Environment Variables in Railway Dashboard:**
   ```
   STRIPE_SECRET_KEY=your_stripe_secret_key
   APP_URL=https://gritscore.vercel.app
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

2. **Deploy to Railway:**
   ```bash
   railway up
   ```

3. **Update Stripe Webhook Endpoint:**
   - Go to Stripe Dashboard → Webhooks
   - Update endpoint URL to: `https://your-railway-app.railway.app/api/subscription/webhook`
   - Select events: `checkout.session.completed`

### **For Local Development:**

1. **Update .env file** with the fixes above
2. **Restart the server:**
   ```bash
   python app.py
   ```
3. **Test checkout flow**

## 🔒 **Security Notes**

- ✅ Using live Stripe keys for production
- ✅ Webhook signature verification enabled
- ✅ HTTPS URLs for all redirects
- ✅ Proper environment variable separation

## 📞 **Support**

If issues persist after applying these fixes:

1. **Check Stripe Dashboard** for any account issues
2. **Verify webhook endpoints** are properly configured
3. **Test with Stripe CLI** for local webhook testing
4. **Check server logs** for detailed error messages

---

**Status**: 🔧 **READY FOR FIX** - Apply the environment variable changes and restart the server. 