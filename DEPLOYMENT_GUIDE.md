# GritScore Pricing System Deployment Guide

## ✅ Implementation Status

The new pricing system has been successfully implemented and tested! Here's what's ready:

### ✅ **Backend Implementation**
- New pricing structure with auto-renewal
- Subscription lifecycle management
- Data archiving system for expired free trials
- Upgrade advertisement rules
- Stripe integration for payments

### ✅ **Frontend Implementation**
- Updated pricing page with new tiers
- Dashboard with upgrade suggestions
- Landing page with new pricing
- Auto-renewal indicators

### ✅ **Database Schema**
- Migration scripts ready
- New columns for subscription dates
- Archived data management
- Optimized indexes

## 🚀 Deployment Steps

### Step 1: Database Migration

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your GritScore project

2. **Run the SQL Migration**
   - Go to **SQL Editor**
   - Copy and paste the contents of `supabase_migration.sql`
   - Click **Run** to execute the migration

3. **Verify Migration**
   - Check that new columns are added to the `users` table
   - Verify indexes are created
   - Confirm existing users have subscription dates set

### Step 2: Stripe Configuration

1. **Update Stripe Products**
   - Go to your Stripe Dashboard
   - Create new products with the updated pricing:
     - **Basic**: $2.99/month
     - **Premium**: $59.94/6 months
     - **VIP**: $239.88/12 months

2. **Configure Webhooks**
   - Go to **Developers > Webhooks**
   - Add endpoint: `https://your-domain.com/api/subscription/webhook`
   - Select events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
   - Copy the webhook secret

3. **Update Environment Variables**
   - Add `STRIPE_WEBHOOK_SECRET` to your `.env` file
   - Update Stripe keys if needed

### Step 3: Deploy to Railway

1. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "Implement new pricing system with auto-renewal"
   git push origin main
   ```

2. **Verify Railway Deployment**
   - Check Railway dashboard for successful deployment
   - Monitor logs for any errors
   - Test the application URL

### Step 4: Test the System

1. **Test User Registration**
   - Register a new user
   - Verify 3-month free trial is set
   - Check subscription dates in database

2. **Test Upgrade Flow**
   - Try upgrading from free to basic
   - Verify Stripe checkout works
   - Check subscription is updated

3. **Test Auto-Renewal**
   - Create a test subscription
   - Verify webhook processing
   - Check renewal dates update

### Step 5: Set Up Monitoring

1. **Configure Expired Trial Checker**
   ```bash
   # Add to your crontab or scheduled task
   0 2 * * * cd /path/to/gritscore && python check_expired_trials.py
   ```

2. **Set Up Logging**
   - Monitor `expired_trials.log`
   - Set up error alerts
   - Track subscription metrics

## 🧪 Testing Checklist

### Backend Tests
- [ ] Plans endpoint returns correct pricing
- [ ] Upgrade suggestions work for each plan
- [ ] Stripe checkout creates sessions
- [ ] Webhooks process payments correctly
- [ ] Data archiving works for expired trials
- [ ] Data restoration works on upgrade

### Frontend Tests
- [ ] Pricing page shows new structure
- [ ] Dashboard shows upgrade suggestions
- [ ] Upgrade buttons work correctly
- [ ] No ads for VIP users
- [ ] Auto-renewal indicators display

### User Flow Tests
- [ ] New user registration sets 3-month trial
- [ ] Free trial expiration works
- [ ] Upgrade from expired trial restores data
- [ ] Auto-renewal processes correctly
- [ ] Cancellation flow works

## 📊 Success Metrics

Track these metrics after deployment:

### Conversion Metrics
- Free trial to paid conversion rate
- Upgrade conversion rates (Basic → Premium → VIP)
- Payment success rate
- Churn rate

### User Engagement
- Daily/Monthly active users
- Feature usage by plan
- Support ticket volume
- User satisfaction scores

### Technical Metrics
- API response times
- Error rates
- Database performance
- System uptime

## 🔧 Troubleshooting

### Common Issues

1. **Database Migration Fails**
   - Check Supabase permissions
   - Verify SQL syntax
   - Run migration in smaller chunks

2. **Stripe Webhook Issues**
   - Verify webhook endpoint URL
   - Check webhook secret
   - Test with Stripe CLI

3. **Subscription Not Updating**
   - Check webhook processing
   - Verify user authentication
   - Review database logs

4. **Frontend Not Loading**
   - Check Railway deployment
   - Verify environment variables
   - Clear browser cache

### Debug Commands

```bash
# Test database connection
python test_pricing_system.py

# Check expired trials
python check_expired_trials.py

# Test Stripe webhook locally
stripe listen --forward-to localhost:5000/api/subscription/webhook
```

## 📞 Support

If you encounter issues:

1. **Check the logs** in Railway dashboard
2. **Review the test results** from `test_pricing_system.py`
3. **Verify database migration** in Supabase
4. **Test Stripe webhooks** with Stripe CLI

## 🎉 Go-Live Checklist

Before going live:

- [ ] All tests pass
- [ ] Database migration completed
- [ ] Stripe webhooks configured
- [ ] Railway deployment successful
- [ ] Monitoring set up
- [ ] Support team trained
- [ ] Documentation updated
- [ ] Backup procedures in place

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Status:** _______________

**Notes:** 