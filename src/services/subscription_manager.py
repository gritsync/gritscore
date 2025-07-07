from datetime import datetime, timedelta
from src.services.supabase_client import supabase
import logging

logger = logging.getLogger(__name__)

class SubscriptionManager:
    """Manages subscription lifecycle and data archiving"""
    
    @staticmethod
    def check_expired_free_trials():
        """Check for expired free trials and archive data"""
        try:
            # Get users with expired free trials
            current_date = datetime.utcnow()
            expired_users = supabase.table('users').select(
                'id, email, subscription_plan, subscription_end_date'
            ).eq('subscription_plan', 'free').lt('subscription_end_date', current_date.isoformat()).execute()
            
            if not expired_users.data:
                logger.info("No expired free trials found")
                return []
            
            archived_users = []
            for user in expired_users.data:
                try:
                    # Archive user data
                    user_id = user['id']
                    
                    # Archive transactions
                    supabase.table('transactions').update({
                        'archived': True,
                        'archived_at': current_date.isoformat()
                    }).eq('user_id', user_id).execute()
                    
                    # Archive debts
                    supabase.table('debts').update({
                        'archived': True,
                        'archived_at': current_date.isoformat()
                    }).eq('user_id', user_id).execute()
                    
                    # Archive chat history
                    supabase.table('chat_history').update({
                        'archived': True,
                        'archived_at': current_date.isoformat()
                    }).eq('user_id', user_id).execute()
                    
                    # Archive AI advice
                    supabase.table('ai_advice').update({
                        'archived': True,
                        'archived_at': current_date.isoformat()
                    }).eq('user_id', user_id).execute()
                    
                    # Update user status
                    supabase.table('users').update({
                        'data_archived': True,
                        'data_archived_at': current_date.isoformat()
                    }).eq('id', user_id).execute()
                    
                    archived_users.append(user_id)
                    logger.info(f"Archived data for user {user_id}")
                    
                except Exception as e:
                    logger.error(f"Failed to archive data for user {user['id']}: {e}")
            
            return archived_users
            
        except Exception as e:
            logger.error(f"Error checking expired free trials: {e}")
            return []
    
    @staticmethod
    def restore_user_data(user_id):
        """Restore archived data when user upgrades"""
        try:
            current_date = datetime.utcnow()
            
            # Restore transactions
            supabase.table('transactions').update({
                'archived': False,
                'archived_at': None
            }).eq('user_id', user_id).eq('archived', True).execute()
            
            # Restore debts
            supabase.table('debts').update({
                'archived': False,
                'archived_at': None
            }).eq('user_id', user_id).eq('archived', True).execute()
            
            # Restore chat history
            supabase.table('chat_history').update({
                'archived': False,
                'archived_at': None
            }).eq('user_id', user_id).eq('archived', True).execute()
            
            # Restore AI advice
            supabase.table('ai_advice').update({
                'archived': False,
                'archived_at': None
            }).eq('user_id', user_id).eq('archived', True).execute()
            
            # Update user status
            supabase.table('users').update({
                'data_archived': False,
                'data_archived_at': None
            }).eq('id', user_id).execute()
            
            logger.info(f"Restored data for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to restore data for user {user_id}: {e}")
            return False
    
    @staticmethod
    def get_subscription_status(user_id):
        """Get detailed subscription status for a user"""
        try:
            user = supabase.table('users').select(
                'subscription_plan, subscription_start_date, subscription_end_date, data_archived'
            ).eq('id', user_id).single().execute()
            
            if not user.data:
                return None
            
            user_data = user.data
            current_date = datetime.utcnow()
            
            # Check if subscription is expired
            if user_data.get('subscription_end_date'):
                end_date = datetime.fromisoformat(user_data['subscription_end_date'].replace('Z', '+00:00'))
                # Make current_date timezone-aware for comparison
                current_date_aware = current_date.replace(tzinfo=end_date.tzinfo)
                is_expired = current_date_aware > end_date
            else:
                is_expired = False
            
            return {
                'plan': user_data.get('subscription_plan', 'free'),
                'start_date': user_data.get('subscription_start_date'),
                'end_date': user_data.get('subscription_end_date'),
                'status': 'active',  # Default to active since we don't have subscription_status column
                'is_expired': is_expired,
                'data_archived': user_data.get('data_archived', False),
                'days_remaining': (end_date - current_date_aware).days if not is_expired else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting subscription status for user {user_id}: {e}")
            return None 