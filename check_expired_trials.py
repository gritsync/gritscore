#!/usr/bin/env python3
"""
Script to check for expired free trials and archive user data.
This should be run as a scheduled task (e.g., daily via cron).
"""

import os
import sys
import logging
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.services.subscription_manager import SubscriptionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('expired_trials.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def main():
    """Main function to check and archive expired free trials"""
    try:
        logger.info("Starting expired free trial check...")
        
        # Check for expired free trials
        archived_users = SubscriptionManager.check_expired_free_trials()
        
        if archived_users:
            logger.info(f"Archived data for {len(archived_users)} users: {archived_users}")
        else:
            logger.info("No expired free trials found")
            
        logger.info("Expired free trial check completed successfully")
        
    except Exception as e:
        logger.error(f"Error during expired free trial check: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 