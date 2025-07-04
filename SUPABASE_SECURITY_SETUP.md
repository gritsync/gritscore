# Supabase Security Setup Guide

## Overview

This guide explains how to configure your GritScore application to use Supabase securely without the service role key. The application has been updated to use the anon key with JWT authentication, which provides better security through Row Level Security (RLS).

## What Changed

### Before (Insecure)
- Used service role key (`service_role_*`) in backend
- Bypassed Row Level Security (RLS)
- Had full database access regardless of user permissions

### After (Secure)
- Uses anon key (`eyJ*`) in backend
- Respects Row Level Security (RLS)
- User operations are authenticated via JWT tokens
- Better security posture

## Setup Instructions

### 1. Run the Setup Script

```bash
python setup_anon_key.py
```

This interactive script will:
- Help you get your anon key from Supabase dashboard
- Update your `.env` file
- Remove the old service role key
- Test the connection

### 2. Get Your Anon Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings > API**
4. Copy the **"anon public"** key (starts with `eyJ`)
5. **DO NOT** copy the "service_role" key

### 3. Update Environment Variables

Your `.env` file should now contain:

```env
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here
# Remove or comment out SUPABASE_KEY (service role key)
```

## Row Level Security (RLS) Setup

For the application to work properly, you need to set up RLS policies in your Supabase database.

### Enable RLS on Tables

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_advice ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crdt_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE crdt_alerts ENABLE ROW LEVEL SECURITY;
```

### Create RLS Policies

```sql
-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (true);

-- Transactions table policies
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
    FOR DELETE USING (auth.uid()::text = user_id);

-- Categories table policies
CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own categories" ON categories
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own categories" ON categories
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own categories" ON categories
    FOR DELETE USING (auth.uid()::text = user_id);

-- Debts table policies
CREATE POLICY "Users can view own debts" ON debts
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own debts" ON debts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own debts" ON debts
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own debts" ON debts
    FOR DELETE USING (auth.uid()::text = user_id);

-- Chat history table policies
CREATE POLICY "Users can view own chat history" ON chat_history
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own chat history" ON chat_history
    FOR DELETE USING (auth.uid()::text = user_id);

-- AI advice table policies
CREATE POLICY "Users can view own AI advice" ON ai_advice
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own AI advice" ON ai_advice
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Subscriptions table policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Credit reports table policies
CREATE POLICY "Users can view own credit reports" ON crdt_reports
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own credit reports" ON crdt_reports
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Credit alerts table policies
CREATE POLICY "Users can view own credit alerts" ON crdt_alerts
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own credit alerts" ON crdt_alerts
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
```

## How It Works

### Authentication Flow

1. **User Login**: User logs in and receives a JWT token
2. **API Requests**: Frontend sends requests with JWT token in Authorization header
3. **Backend Processing**: Backend extracts JWT token and creates authenticated Supabase client
4. **Database Operations**: Supabase client uses JWT token to authenticate with database
5. **RLS Enforcement**: Database applies RLS policies based on user identity

### Code Changes

The application now uses:

```python
# Instead of direct supabase client
from src.services.supabase_client import get_supabase_from_request

# In API endpoints
user_supabase = get_supabase_from_request()
response = user_supabase.table('transactions').select('*').eq('user_id', user_id).execute()
```

## Testing

### Test Connection

```bash
python test_supabase_connection.py
```

### Test Authentication

```bash
python test_auth.py
```

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Check that RLS is enabled on tables
   - Verify RLS policies are correctly configured
   - Ensure JWT tokens are being passed correctly

2. **"Invalid API key" errors**
   - Make sure you're using the anon key, not service role key
   - Verify the key starts with `eyJ`

3. **"User not found" errors**
   - Check that user registration is working
   - Verify JWT token contains correct user ID

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=True
```

## Security Benefits

1. **No Service Role Key**: Eliminates the security risk of having full database access
2. **Row Level Security**: Users can only access their own data
3. **JWT Authentication**: All operations are authenticated
4. **Audit Trail**: Database operations are logged with user context

## Migration Notes

- The Stripe webhook endpoint still uses the base client (no JWT available)
- Public endpoints (like registration) use the base client
- All user-specific operations now require authentication

## Support

If you encounter issues:

1. Check the Supabase logs in your dashboard
2. Verify RLS policies are correctly configured
3. Test with the provided test scripts
4. Check that JWT tokens are valid and not expired 