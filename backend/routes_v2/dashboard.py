"""
DealLinked CRM V2 - Dashboard Routes
Simple dashboard statistics
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timedelta
import logging

from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


# ============================================================================
# ROUTES
# ============================================================================

@router.get("/stats")
async def get_dashboard_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get dashboard statistics for current user"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Get all user's deals
        deals_response = supabase.table('deals').select('id, asking_price, status, asset_type, pipeline_stage_id, created_at').eq('owner_id', user_id).execute()
        deals = deals_response.data or []
        
        # Get contacts count
        contacts_response = supabase.table('contacts').select('id', count='exact').eq('owner_id', user_id).execute()
        
        # Get upcoming events (next 7 days)
        now = datetime.utcnow()
        week_later = now + timedelta(days=7)
        events_response = supabase.table('calendar_events').select('id', count='exact').eq('owner_id', user_id).gte('start_time', now.isoformat()).lte('start_time', week_later.isoformat()).execute()
        
        # Calculate stats
        total_deals = len(deals)
        active_deals = len([d for d in deals if d.get('status') == 'active'])
        total_pipeline_value = sum([d.get('asking_price', 0) or 0 for d in deals if d.get('status') == 'active'])
        
        # Asset type distribution
        asset_types = {}
        for deal in deals:
            asset_type = deal.get('asset_type', 'Other') or 'Other'
            asset_types[asset_type] = asset_types.get(asset_type, 0) + 1
        
        # Pipeline stage counts
        stage_counts = {}
        for deal in deals:
            stage_id = deal.get('pipeline_stage_id')
            if stage_id:
                stage_counts[stage_id] = stage_counts.get(stage_id, 0) + 1
        
        # Recent deals (last 30 days)
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        recent_deals = len([d for d in deals if d.get('created_at', '') >= thirty_days_ago])
        
        return {
            "success": True,
            "stats": {
                "total_deals": total_deals,
                "active_deals": active_deals,
                "total_pipeline_value": total_pipeline_value,
                "total_contacts": contacts_response.count or 0,
                "upcoming_events": events_response.count or 0,
                "recent_deals": recent_deals,
                "asset_type_distribution": asset_types,
                "stage_counts": stage_counts
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get dashboard stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard stats")


@router.get("/recent-activity")
async def get_recent_activity(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    limit: int = 10
):
    """Get recent activity (deals, contacts, events)"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Get recent deals
        deals_response = supabase.table('deals').select('id, title, address, asset_type, asking_price, created_at, updated_at').eq('owner_id', user_id).order('updated_at', desc=True).limit(limit).execute()
        
        # Get recent contacts
        contacts_response = supabase.table('contacts').select('id, name, company, contact_type, created_at, updated_at').eq('owner_id', user_id).order('updated_at', desc=True).limit(limit).execute()
        
        # Get upcoming events
        now = datetime.utcnow()
        events_response = supabase.table('calendar_events').select('id, title, start_time, event_type').eq('owner_id', user_id).gte('start_time', now.isoformat()).order('start_time').limit(5).execute()
        
        return {
            "success": True,
            "activity": {
                "recent_deals": deals_response.data or [],
                "recent_contacts": contacts_response.data or [],
                "upcoming_events": events_response.data or []
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get recent activity error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent activity")



@router.get("/upcoming-deadlines")
async def get_upcoming_deadlines(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get upcoming critical dates across all user's deals within the next 30 days."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        today = datetime.utcnow().date()
        thirty_days = (today + timedelta(days=30)).isoformat()
        today_str = today.isoformat()
        
        # Get all user's deal IDs
        deals_response = supabase.table('deals') \
            .select('id, title, address') \
            .eq('owner_id', user_id) \
            .execute()
        deals = deals_response.data or []
        
        if not deals:
            return {"success": True, "deadlines": []}
        
        deal_map = {d['id']: d for d in deals}
        deal_ids = list(deal_map.keys())
        
        # Get all timeline milestones with dates in the next 30 days (or overdue)
        milestones_response = supabase.table('deal_timelines') \
            .select('*') \
            .in_('deal_id', deal_ids) \
            .neq('status', 'completed') \
            .not_.is_('target_date', 'null') \
            .lte('target_date', thirty_days) \
            .order('target_date') \
            .execute()
        
        deadlines = []
        for m in (milestones_response.data or []):
            deal = deal_map.get(m['deal_id'], {})
            target = m.get('target_date', '')
            if target:
                try:
                    target_date = datetime.strptime(target, '%Y-%m-%d').date()
                    days_remaining = (target_date - today).days
                except (ValueError, TypeError):
                    days_remaining = 999
            else:
                days_remaining = 999
            
            deadlines.append({
                "milestone_id": m['id'],
                "milestone_name": m['name'],
                "target_date": m.get('target_date'),
                "status": m.get('status'),
                "deal_id": m['deal_id'],
                "deal_title": deal.get('title', 'Unknown'),
                "deal_address": deal.get('address', ''),
                "days_remaining": days_remaining,
            })
        
        # Sort by days remaining (most urgent first)
        deadlines.sort(key=lambda x: x['days_remaining'])
        
        return {"success": True, "deadlines": deadlines}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get upcoming deadlines error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch upcoming deadlines")
