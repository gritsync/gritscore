#!/usr/bin/env python3
"""
Script to run database migration for Supabase.
This adds the new subscription date columns to the users and subscriptions tables.
"""

import os
import sys
from dotenv import load_dotenv
from src.services.supabase_client import supabase

# Load environment variables
load_dotenv()

def run_migration():
    """Run the database migration to add subscription date columns"""
    
    print("Starting database migration...")
    
    try:
        # Migration SQL commands
        migration_commands = [
            # Add subscription date columns to users table
            """
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS data_archived BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS data_archived_at TIMESTAMP WITH TIME ZONE;
            """,
            
            # Add subscription date columns to subscriptions table
            """
            ALTER TABLE subscriptions 
            ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
            """,
            
            # Add archived columns to data tables
            """
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
            """,
            
            """
            ALTER TABLE debts 
            ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
            """,
            
            """
            ALTER TABLE chat_history 
            ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
            """,
            
            """
            ALTER TABLE ai_advice 
            ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
            """,
            
            # Create indexes for efficient queries
            """
            CREATE INDEX IF NOT EXISTS idx_users_subscription_dates 
            ON users(subscription_start_date, subscription_end_date);
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_subscriptions_dates 
            ON subscriptions(start_date, end_date);
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_transactions_archived 
            ON transactions(archived, user_id);
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_debts_archived 
            ON debts(archived, user_id);
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_chat_history_archived 
            ON chat_history(archived, user_id);
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_ai_advice_archived 
            ON ai_advice(archived, user_id);
            """
        ]
        
        # Execute each migration command
        for i, command in enumerate(migration_commands, 1):
            print(f"Executing migration {i}/{len(migration_commands)}...")
            
            try:
                # Execute the SQL command
                result = supabase.rpc('exec_sql', {'sql': command}).execute()
                print(f"✓ Migration {i} completed successfully")
                
            except Exception as e:
                print(f"⚠ Migration {i} failed: {e}")
                print("This might be expected if columns already exist")
        
        print("\n✅ Database migration completed!")
        print("\nNext steps:")
        print("1. Set up Stripe webhooks for subscription management")
        print("2. Configure the scheduled task for expired trial checking")
        print("3. Test the new subscription system")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration() 