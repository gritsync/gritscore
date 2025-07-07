# Pricing and Subscription System

## Overview

GritScore implements a tiered subscription system with auto-renewal capabilities and data archiving for expired free trials.

## Pricing Structure

### Free Plan
- **Price**: $0
- **Duration**: 3 months only
- **Features**: Budgeting & Debt Tracking
- **Auto-renewal**: No
- **Data handling**: Archived after 3 months unless upgraded

### Basic Plan
- **Price**: $2.99/month
- **Duration**: Monthly billing
- **Features**: Everything in Free + AI Chat & Coaching
- **Auto-renewal**: Yes
- **Data handling**: Always accessible

### Premium Plan
- **Price**: $9.99/6 months ($59.94 total)
- **Duration**: 6-month billing
- **Features**: Everything in Basic + AI Credit Analysis + Score Simulator
- **Auto-renewal**: Yes
- **Data handling**: Always accessible

### VIP Plan
- **Price**: $19.99/12 months ($239.88 total)
- **Duration**: 12-month billing
- **Features**: Everything in Premium + Dispute Generator + VIP Support
- **Auto-renewal**: Yes
- **Data handling**: Always accessible

## Upgrade Advertisement Rules

The system automatically suggests upgrades based on the user's current plan:

- **Free users**: Advertise Basic plan
- **Basic users**: Advertise Premium plan
- **Premium users**: Advertise VIP plan
- **VIP users**: No advertisements (highest tier)

## Auto-Renewal System

### How it Works
1. Users provide credit card details during checkout
2. Stripe handles secure payment processing
3. Subscriptions automatically renew based on billing period
4. Users can cancel anytime through their account settings

### Billing Periods
- **Basic**: Monthly (30 days)
- **Premium**: 6 months (180 days)
- **VIP**: 12 months (365 days)

## Data Archiving System

### Free Trial Expiration
- Free users have 3 months to try the service
- After 3 months, data is automatically archived
- Archived data is safely stored and can be restored upon upgrade

### Data Restoration
- When a user upgrades from an expired free trial, their data is automatically restored
- All historical data (transactions, debts, chat history, AI advice) becomes accessible again

## Database Schema

### Users Table Additions
```sql
ALTER TABLE users 
ADD COLUMN subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN data_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN data_archived_at TIMESTAMP WITH TIME ZONE;
```

### Subscriptions Table Additions
```sql
ALTER TABLE subscriptions 
ADD COLUMN start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;
```

## API Endpoints

### Get Current Subscription
```
GET /api/subscription/current
```
Returns detailed subscription status including expiration and data archival status.

### Get Upgrade Suggestion
```
GET /api/subscription/upgrade-suggestion
```
Returns the suggested upgrade plan based on current plan.

### Create Checkout Session
```
POST /api/subscription/checkout
Body: { "planId": "basic" }
```
Creates Stripe checkout session for plan upgrade.

## Stripe Integration

### Webhook Events Handled
- `checkout.session.completed`: Process successful payments
- `invoice.payment_succeeded`: Handle subscription renewals

### Required Stripe Configuration
- Stripe Secret Key
- Stripe Publishable Key
- Stripe Webhook Secret (for production)

## Scheduled Tasks

### Expired Trial Checker
Run daily to check for expired free trials:
```bash
python check_expired_trials.py
```

This script:
1. Identifies users with expired free trials
2. Archives their data
3. Updates user status
4. Logs all actions

## Frontend Implementation

### Dashboard Features
- Shows current plan with expiration status
- Displays upgrade suggestions for non-VIP users
- Shows data archival status for expired free trials
- Provides direct upgrade links

### Pricing Page Features
- Clear pricing with billing periods
- Auto-renewal indicators
- Feature comparisons
- FAQ section addressing common concerns

## Security Considerations

### Data Protection
- All sensitive data is encrypted
- Credit card details are never stored (handled by Stripe)
- User data is archived securely when free trials expire

### Access Control
- Plan-based feature access
- Automatic feature restrictions for expired users
- Secure API endpoints with JWT authentication

## Monitoring and Logging

### Subscription Status Monitoring
- Track subscription lifecycle events
- Monitor auto-renewal success/failure rates
- Alert on payment processing issues

### Data Archival Logging
- Log all data archival operations
- Track data restoration events
- Monitor storage usage for archived data

## Migration Guide

### For Existing Users
1. Run the database migration script
2. Update existing users with appropriate subscription dates
3. Set up the scheduled task for expired trial checking
4. Configure Stripe webhooks for production

### Environment Variables
Add to your environment:
```
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

## Troubleshooting

### Common Issues
1. **Webhook failures**: Check Stripe webhook configuration
2. **Data not restored**: Verify user has archived data before upgrade
3. **Auto-renewal failures**: Check Stripe subscription status
4. **Expired trial not detected**: Verify scheduled task is running

### Debug Endpoints
- `/api/subscription/update-plan`: Manual plan updates for testing
- Check logs in `expired_trials.log` for archival issues

## Future Enhancements

### Planned Features
- Prorated billing for mid-cycle upgrades
- Family/team plans
- Custom billing cycles
- Advanced analytics for subscription metrics

### Integration Opportunities
- Email marketing for upgrade campaigns
- Analytics for conversion optimization
- Customer support integration
- Advanced reporting dashboard 