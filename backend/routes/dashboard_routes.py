"""Dashboard routes - Ready for Marketplace analytics."""
from fastapi import APIRouter, Depends
from typing import List
import time
import logging
import feedparser

from models import User
from utils.auth_helpers import get_current_user
from utils.db import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)

# News feed cache
news_cache = {
    'articles': [],
    'last_updated': 0,
    'cache_duration': 3600  # 1 hour in seconds
}


@router.get("/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get dashboard statistics for the current user's deals."""
    db = get_db()
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    
    total_pipeline_value = sum(deal.get('asking_price', 0) for deal in deals)
    total_deals = len(deals)
    avg_deal_size = total_pipeline_value / total_deals if total_deals > 0 else 0
    
    asset_type_distribution = {}
    for deal in deals:
        asset_type = deal.get('asset_type', 'Unknown')
        asset_type_distribution[asset_type] = asset_type_distribution.get(asset_type, 0) + 1
    
    stage_counts = {}
    for deal in deals:
        stage = deal.get('stage', 'New')
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
    
    return {
        "total_pipeline_value": total_pipeline_value,
        "total_deals": total_deals,
        "avg_deal_size": avg_deal_size,
        "asset_type_distribution": asset_type_distribution,
        "stage_counts": stage_counts
    }
