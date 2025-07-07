import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from src.services.supabase_client import supabase
from src.services.email_service import email_service

load_dotenv()

def get_all_users():
    response = supabase.table('users').select('id, email, full_name, preferred_name').execute()
    return response.data if response.data else []

def get_due_items_for_user(user_id):
    # Placeholder: Replace with real query to fetch due items for the user
    # Example: return [{'item': 'Credit Card Payment', 'due_date': '2024-07-12'}]
    return []

def main():
    today = datetime.now()
    users = get_all_users()
    print(f"Found {len(users)} users.")
    for user in users:
        email = user.get('email')
        name = user.get('preferred_name') or user.get('full_name') or email
        user_id = user.get('id')
        # --- Weekly Report ---
        if today.weekday() == 0:  # Monday
            report_data = "Your credit score improved by 10 points this week!"  # Placeholder
            print(f"Sending weekly report to {email}")
            email_service.send_weekly_report(email, name, report_data)
        # --- Due Date Reminders ---
        due_items = get_due_items_for_user(user_id)
        for due in due_items:
            due_date = datetime.strptime(due['due_date'], '%Y-%m-%d')
            if 0 <= (due_date - today).days <= 3:
                print(f"Sending due date reminder to {email} for {due['item']} due on {due['due_date']}")
                email_service.send_due_date_reminder(email, name, due['item'], due['due_date'])
        # --- Monthly Report ---
        if today.day == 1:
            report_data = "Here is your monthly summary!"  # Placeholder
            print(f"Sending monthly report to {email}")
            email_service.send_monthly_report(email, name, report_data)

if __name__ == "__main__":
    main() 