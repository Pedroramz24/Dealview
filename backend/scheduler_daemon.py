"""
Background Campaign Scheduler
Runs every 5 minutes to process scheduled campaigns
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime
import logging

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from dotenv import load_dotenv
from supabase import create_client
from campaign_scheduler import get_scheduler

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_KEY']
supabase = create_client(supabase_url, supabase_key)


async def process_queue():
    """Process scheduled campaign queue"""
    try:
        logger.info("Starting scheduled campaign processing...")
        
        scheduler = get_scheduler(supabase)
        result = await scheduler.process_scheduled_queue(batch_size=50)
        
        if result.get('processed', 0) > 0:
            logger.info(f"Processed {result['processed']} scheduled emails: "
                       f"{result.get('sent', 0)} sent, {result.get('failed', 0)} failed")
        else:
            logger.info("No scheduled emails ready to process")
        
        return result
    except Exception as e:
        logger.error(f"Error processing queue: {str(e)}")
        return {"error": str(e)}


async def main():
    """Main scheduler loop"""
    logger.info("Campaign Scheduler started")
    
    while True:
        try:
            await process_queue()
            # Wait 5 minutes before next check
            await asyncio.sleep(300)  # 5 minutes
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
            break
        except Exception as e:
            logger.error(f"Scheduler error: {str(e)}")
            # Wait 1 minute before retry on error
            await asyncio.sleep(60)


if __name__ == "__main__":
    # Run once for testing
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        result = asyncio.run(process_queue())
        print(f"Result: {result}")
    else:
        # Run continuously
        asyncio.run(main())
