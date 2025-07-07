# Pricing System Deployment Checklist

## Pre-Deployment Setup

### 1. Database Migration
- [ ] Run the database migration script:
  ```bash
  python run_migration.py
  ```
- [ ] Verify new columns are added to users table:
  - `subscription_start_date`
  - `subscription_end_date`
  - `subscription_status`
  - `data_archived`
  - `data_archived_at`
- [ ] Verify new columns are added to subscriptions table:
  - `start_date`
  - `end_date`
- [ ] Verify archived columns are added to data tables:
  - `transactions.archived`
  - `debts.archived`
  - `chat_history.archived`
  - `ai_advice.archived`

### 2. Stripe Configuration
- [ ] Update Stripe products with new pricing:
  - Basic: $2.99/month
  - Premium: $59.94/6 months
  - VIP: $239.88/12 months
- [ ] Configure Stripe webhooks:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
- [ ] Set webhook endpoint URL: `https://your-domain.com/api/subscription/webhook`
- [ ] Add `STRIPE_WEBHOOK_SECRET` to environment variables

### 3. Environment Variables
- [ ] Add new environment variable:
  ```
  STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
  ```
- [ ] Verify all existing environment variables are set

## Frontend Updates

### 4. Pricing Page
- [ ] Verify new pricing structure is displayed:
  - Free: $0 (3 months only)
  - Basic: $2.99/month
  - Premium: $9.99/6 months
  - VIP: $19.99/12 months
- [ ] Check auto-renewal indicators are shown
- [ ] Verify upgrade buttons work correctly
- [ ] Test responsive design on mobile

### 5. Dashboard Updates
- [ ] Verify upgrade suggestions appear for non-VIP users
- [ ] Check upgrade banner shows correct next plan
- [ ] Test plan status display
- [ ] Verify no advertisements for VIP users

### 6. Landing Page
- [ ] Update pricing section with new structure
- [ ] Verify pricing cards show correct periods
- [ ] Test call-to-action buttons

## Backend Testing

### 7. API Endpoints
- [ ] Test `/api/subscription/current` returns correct data
- [ ] Test `/api/subscription/upgrade-suggestion` works
- [ ] Test `/api/subscription/checkout` creates sessions
- [ ] Test `/api/subscription/webhook` processes payments

### 8. Subscription Management
- [ ] Test free plan registration sets 3-month trial
- [ ] Test paid plan upgrades work correctly
- [ ] Test auto-renewal webhook processing
- [ ] Test data restoration for expired users

### 9. Data Archiving
- [ ] Test expired trial detection
- [ ] Test data archival process
- [ ] Test data restoration on upgrade
- [ ] Verify archived data is not accessible

## Scheduled Tasks

### 10. Expired Trial Checker
- [ ] Set up cron job or scheduled task:
  ```bash
  # Run daily at 2 AM
  0 2 * * * cd /path/to/gritscore && python check_expired_trials.py
  ```
- [ ] Test the script manually:
  ```bash
  python check_expired_trials.py
  ```
- [ ] Verify log file is created: `expired_trials.log`

## Production Deployment

### 11. Railway Deployment
- [ ] Push changes to GitHub
- [ ] Verify Railway auto-deploys
- [ ] Check application logs for errors
- [ ] Test all endpoints in production

### 12. Stripe Production Setup
- [ ] Switch to production Stripe keys
- [ ] Configure production webhooks
- [ ] Test payment processing
- [ ] Verify subscription creation

### 13. Monitoring
- [ ] Set up error monitoring
- [ ] Configure payment failure alerts
- [ ] Monitor subscription metrics
- [ ] Track upgrade conversion rates

## Post-Deployment Verification

### 14. User Experience Testing
- [ ] Test new user registration flow
- [ ] Test free trial expiration
- [ ] Test upgrade from expired trial
- [ ] Test auto-renewal process
- [ ] Test cancellation flow

### 15. Data Integrity
- [ ] Verify existing users are not affected
- [ ] Check subscription dates are set correctly
- [ ] Verify archived data is preserved
- [ ] Test data restoration works

### 16. Performance Testing
- [ ] Test API response times
- [ ] Verify database queries are optimized
- [ ] Check memory usage
- [ ] Monitor error rates

## Rollback Plan

### 17. Emergency Procedures
- [ ] Keep backup of old pricing system
- [ ] Document rollback steps
- [ ] Test rollback procedure
- [ ] Have support contact information ready

## Documentation

### 18. Update Documentation
- [ ] Update API documentation
- [ ] Update user guides
- [ ] Update support documentation
- [ ] Create troubleshooting guide

## Final Checklist

### 19. Go-Live Verification
- [ ] All tests pass
- [ ] No critical errors in logs
- [ ] Payment processing works
- [ ] User registration works
- [ ] Upgrade flow works
- [ ] Data archiving works
- [ ] Scheduled tasks are running

### 20. Monitoring Setup
- [ ] Set up alerts for payment failures
- [ ] Monitor subscription metrics
- [ ] Track user engagement
- [ ] Monitor system performance

## Success Metrics

Track these metrics after deployment:
- [ ] User registration rate
- [ ] Free trial to paid conversion rate
- [ ] Upgrade conversion rates
- [ ] Payment success rate
- [ ] Customer support tickets
- [ ] System performance metrics

## Support Preparation

### 21. Support Team Training
- [ ] Train support team on new pricing
- [ ] Document common issues
- [ ] Create FAQ for new features
- [ ] Set up escalation procedures

### 22. Communication Plan
- [ ] Notify existing users of changes
- [ ] Update marketing materials
- [ ] Prepare customer communications
- [ ] Set up feedback collection

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Status:** _______________

**Notes:** 