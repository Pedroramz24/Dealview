"""
AI Operations Dashboard Service
Provides real-time intelligence and prioritization for CRM operations
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from supabase import Client
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

dashboard_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


# ============================================
# PYDANTIC MODELS
# ============================================

class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str  # meeting, deadline, reminder, call, site_visit, other
    start_time: datetime
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = []
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    all_day: bool = False
    reminder_minutes: int = 15


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    attendees: Optional[List[str]] = None
    status: Optional[str] = None  # scheduled, completed, cancelled
    reminder_minutes: Optional[int] = None


class DealMilestoneCreate(BaseModel):
    deal_id: str
    title: str
    description: Optional[str] = None
    milestone_type: str  # contract_signed, deposit_received, inspection, financing_approved, closing, custom
    due_date: datetime
    priority: str = "medium"  # low, medium, high, critical
    notes: Optional[str] = None


class DealMilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None  # pending, completed, overdue, cancelled
    priority: Optional[str] = None
    notes: Optional[str] = None
    completed_date: Optional[datetime] = None


class PriorityItemUpdate(BaseModel):
    completed: Optional[bool] = None
    dismissed: Optional[bool] = None


class DashboardSnapshot(BaseModel):
    active_deals: int
    total_pipeline_value: float
    weighted_pipeline_value: float
    meetings_today: int
    overdue_milestones: int
    high_priority_actions: int
    deals_closing_this_week: int
    recent_activities: List[Dict[str, Any]]


class PriorityItem(BaseModel):
    id: str
    title: str
    description: Optional[str]
    priority_level: str
    priority_score: float
    action_type: str
    due_date: Optional[datetime]
    related_deal: Optional[Dict[str, Any]] = None
    related_contact: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = {}


# ============================================
# PRIORITY CALCULATION ENGINE
# ============================================

def calculate_priority_score(
    deal_value: float = 0,
    pipeline_stage_weight: float = 0,
    days_until_due: int = 999,
    is_overdue: bool = False
) -> tuple[float, str]:
    """
    Calculate priority score using weighted algorithm
    Returns: (score, priority_level)
    
    Factors:
    - Deal Value: Higher $ = higher priority
    - Pipeline Stage: Further along = higher priority
    - Time Sensitivity: Closer dates = higher priority
    - Overdue: Immediate critical priority
    """
    
    # Overdue items are always critical
    if is_overdue:
        return (100.0, 'critical')
    
    # Initialize score
    score = 0.0
    
    # Deal Value Component (0-30 points)
    # $0-100K = 0-10 pts, $100K-500K = 10-20 pts, $500K+ = 20-30 pts
    if deal_value > 0:
        if deal_value >= 500000:
            score += 30
        elif deal_value >= 100000:
            score += 10 + ((deal_value - 100000) / 400000) * 10
        else:
            score += (deal_value / 100000) * 10
    
    # Pipeline Stage Component (0-30 points)
    # stage_weight is 0-100, normalize to 0-30
    score += (pipeline_stage_weight / 100) * 30
    
    # Time Sensitivity Component (0-40 points)
    # Today = 40, This week = 30, Next week = 20, Next month = 10, Beyond = 0
    if days_until_due <= 0:
        score += 40  # Today or past
    elif days_until_due <= 7:
        score += 30  # This week
    elif days_until_due <= 14:
        score += 20  # Next week
    elif days_until_due <= 30:
        score += 10  # This month
    
    # Determine priority level
    if score >= 80:
        priority_level = 'critical'
    elif score >= 60:
        priority_level = 'high'
    elif score >= 30:
        priority_level = 'medium'
    else:
        priority_level = 'low'
    
    return (round(score, 2), priority_level)


async def generate_priorities_from_data(
    user_id: str,
    deals: List[Dict],
    milestones: List[Dict],
    events: List[Dict],
    supabase: Client
) -> List[Dict]:
    """
    Generate priority items based on deals, milestones, and events
    """
    priorities = []
    now = datetime.now(timezone.utc)
    
    # 1. Overdue Milestones (CRITICAL)
    for milestone in milestones:
        if milestone['status'] == 'pending':
            due_date = datetime.fromisoformat(milestone['due_date'].replace('Z', '+00:00'))
            if due_date < now:
                score, level = calculate_priority_score(is_overdue=True)
                priorities.append({
                    'user_id': user_id,
                    'title': f"⚠️ Overdue: {milestone['title']}",
                    'description': milestone.get('description', ''),
                    'priority_score': score,
                    'priority_level': level,
                    'action_type': 'complete_milestone',
                    'related_milestone_id': milestone['id'],
                    'related_deal_id': milestone.get('deal_id'),
                    'due_date': milestone['due_date'],
                    'metadata': {'days_overdue': (now - due_date).days}
                })
    
    # 2. Today's Meetings/Events (HIGH)
    today_end = now.replace(hour=23, minute=59, second=59)
    for event in events:
        if event['status'] == 'scheduled':
            start_time = datetime.fromisoformat(event['start_time'].replace('Z', '+00:00'))
            if now <= start_time <= today_end:
                score, level = calculate_priority_score(days_until_due=0)
                priorities.append({
                    'user_id': user_id,
                    'title': f"📅 Today: {event['title']}",
                    'description': event.get('description', ''),
                    'priority_score': score,
                    'priority_level': 'high',
                    'action_type': 'schedule_meeting',
                    'related_event_id': event['id'],
                    'related_deal_id': event.get('deal_id'),
                    'due_date': event['start_time'],
                    'metadata': {'event_type': event['event_type'], 'location': event.get('location')}
                })
    
    # 3. High-Value Deals in Late Stages (HIGH)
    for deal in deals:
        deal_value = float(deal.get('price', 0) or 0)
        stage_weight = float(deal.get('stage_weight', 50))
        
        # Focus on deals > $500K in stages with weight > 60
        if deal_value > 500000 and stage_weight > 60:
            score, level = calculate_priority_score(
                deal_value=deal_value,
                pipeline_stage_weight=stage_weight,
                days_until_due=7  # Assume weekly check-in
            )
            priorities.append({
                'user_id': user_id,
                'title': f"💰 High-Value Deal: {deal.get('title', 'Untitled')}",
                'description': f"${deal_value:,.0f} in {deal.get('stage_name', 'Unknown Stage')}",
                'priority_score': score,
                'priority_level': level,
                'action_type': 'review_deal',
                'related_deal_id': deal['id'],
                'metadata': {'deal_value': deal_value, 'stage_weight': stage_weight}
            })
    
    # 4. Upcoming Milestones (This Week) (MEDIUM)
    week_end = now + timedelta(days=7)
    for milestone in milestones:
        if milestone['status'] == 'pending':
            due_date = datetime.fromisoformat(milestone['due_date'].replace('Z', '+00:00'))
            if now < due_date <= week_end:
                days_until = (due_date - now).days
                score, level = calculate_priority_score(days_until_due=days_until)
                priorities.append({
                    'user_id': user_id,
                    'title': f"📌 Due Soon: {milestone['title']}",
                    'description': milestone.get('description', ''),
                    'priority_score': score,
                    'priority_level': level,
                    'action_type': 'complete_milestone',
                    'related_milestone_id': milestone['id'],
                    'related_deal_id': milestone.get('deal_id'),
                    'due_date': milestone['due_date'],
                    'metadata': {'days_until_due': days_until}
                })
    
    return priorities


# ============================================
# API ENDPOINTS
# ============================================

def get_supabase_and_user(credentials: HTTPAuthorizationCredentials, supabase: Client):
    """Helper to get user from Supabase token"""
    from server import get_current_user_supabase  # Import here to avoid circular dependency
    import asyncio
    return asyncio.create_task(get_current_user_supabase(credentials))


@dashboard_router.get("/snapshot")
async def get_dashboard_snapshot(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> DashboardSnapshot:
    """
    Get real-time situational snapshot of user's CRM data
    """
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0)
        today_end = now.replace(hour=23, minute=59, second=59)
        week_end = now + timedelta(days=7)
        
        # Fetch deals
        deals_response = supabase.table('deals').select(
            '*, pipeline_stages(stage_weight, name)'
        ).eq('owner_id', user.id).execute()
        deals = deals_response.data or []
        
        # Fetch milestones
        milestones_response = supabase.table('deal_milestones').select('*').eq(
            'owner_id', user.id
        ).execute()
        milestones = milestones_response.data or []
        
        # Fetch calendar events
        events_response = supabase.table('calendar_events').select('*').eq(
            'owner_id', user.id
        ).gte('start_time', today_start.isoformat()).execute()
        events = events_response.data or []
        
        # Calculate metrics
        active_deals = len([d for d in deals if d.get('status') != 'closed'])
        total_pipeline_value = sum(float(d.get('price', 0) or 0) for d in deals if d.get('status') != 'closed')
        
        # Weighted pipeline (deal_value * stage_weight / 100)
        weighted_value = 0
        for deal in deals:
            if deal.get('status') != 'closed':
                deal_value = float(deal.get('price', 0) or 0)
                stage_weight = deal.get('pipeline_stages', {}).get('stage_weight', 50) if deal.get('pipeline_stages') else 50
                weighted_value += (deal_value * stage_weight / 100)
        
        # Meetings today
        meetings_today = len([
            e for e in events 
            if datetime.fromisoformat(e['start_time'].replace('Z', '+00:00')) <= today_end
            and e['status'] == 'scheduled'
        ])
        
        # Overdue milestones
        overdue_milestones = len([
            m for m in milestones 
            if m['status'] == 'pending' 
            and datetime.fromisoformat(m['due_date'].replace('Z', '+00:00')) < now
        ])
        
        # Deals closing this week (stage_weight > 80)
        deals_closing_week = len([
            d for d in deals 
            if d.get('pipeline_stages', {}).get('stage_weight', 0) > 80
        ])
        
        # High priority actions (from priority queue)
        priority_response = supabase.table('ai_priority_queue').select('*').eq(
            'owner_id', user.id
        ).eq('completed', False).eq('dismissed', False).gte('priority_score', 60).execute()
        high_priority_actions = len(priority_response.data or [])
        
        # Recent activities (simplified for now)
        recent_activities = []
        
        return DashboardSnapshot(
            active_deals=active_deals,
            total_pipeline_value=total_pipeline_value,
            weighted_pipeline_value=weighted_value,
            meetings_today=meetings_today,
            overdue_milestones=overdue_milestones,
            high_priority_actions=high_priority_actions,
            deals_closing_this_week=deals_closing_week,
            recent_activities=recent_activities
        )
        
    except Exception as e:
        logger.error(f"Error fetching dashboard snapshot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.get("/priorities")
async def get_priorities(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> List[PriorityItem]:
    """
    Get prioritized action items for today
    """
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        
        # Fetch existing priority items
        priority_response = supabase.table('ai_priority_queue').select(
            '*, deals(id, title, price), contacts(id, name)'
        ).eq('owner_id', user.id).eq('completed', False).eq(
            'dismissed', False
        ).order('priority_score', desc=True).limit(20).execute()
        
        priorities = priority_response.data or []
        
        # If no priorities exist, generate them
        if not priorities:
            # Fetch data
            deals_response = supabase.table('deals').select(
                '*, pipeline_stages(stage_weight, name)'
            ).eq('owner_id', user.id).execute()
            
            milestones_response = supabase.table('deal_milestones').select('*').eq(
                'owner_id', user.id
            ).execute()
            
            events_response = supabase.table('calendar_events').select('*').eq(
                'owner_id', user.id
            ).eq('status', 'scheduled').execute()
            
            # Generate priorities
            new_priorities = await generate_priorities_from_data(
                user.id,
                deals_response.data or [],
                milestones_response.data or [],
                events_response.data or [],
                supabase
            )
            
            # Insert into database
            if new_priorities:
                insert_response = supabase.table('ai_priority_queue').insert(
                    new_priorities
                ).execute()
                priorities = insert_response.data or []
        
        # Format response
        result = []
        for p in priorities:
            result.append(PriorityItem(
                id=p['id'],
                title=p['title'],
                description=p.get('description'),
                priority_level=p['priority_level'],
                priority_score=float(p['priority_score']),
                action_type=p['action_type'],
                due_date=p.get('due_date'),
                related_deal=p.get('deals'),
                related_contact=p.get('contacts'),
                metadata=p.get('metadata', {})
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching priorities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.get("/calendar")
async def get_calendar_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get calendar events and milestones for timeline view
    """
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        
        # Default to next 30 days if no dates provided
        if not start_date:
            start_date = datetime.now(timezone.utc).isoformat()
        if not end_date:
            end_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        
        # Fetch events
        events_response = supabase.table('calendar_events').select(
            '*, deals(id, title), contacts(id, name)'
        ).eq('owner_id', user.id).gte('start_time', start_date).lte(
            'start_time', end_date
        ).order('start_time').execute()
        
        # Fetch milestones
        milestones_response = supabase.table('deal_milestones').select(
            '*, deals(id, title)'
        ).eq('owner_id', user.id).gte('due_date', start_date).lte(
            'due_date', end_date
        ).order('due_date').execute()
        
        return {
            "events": events_response.data or [],
            "milestones": milestones_response.data or []
        }
        
    except Exception as e:
        logger.error(f"Error fetching calendar data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.post("/events")
async def create_calendar_event(
    event: CalendarEventCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new calendar event"""
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        
        event_data = event.model_dump()
        event_data['owner_id'] = user.id
        
        response = supabase.table('calendar_events').insert(event_data).execute()
        return {"success": True, "event": response.data[0]}
        
    except Exception as e:
        logger.error(f"Error creating calendar event: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.post("/milestones")
async def create_deal_milestone(
    milestone: DealMilestoneCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new deal milestone"""
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        
        milestone_data = milestone.model_dump()
        milestone_data['owner_id'] = user.id
        
        response = supabase.table('deal_milestones').insert(milestone_data).execute()
        return {"success": True, "milestone": response.data[0]}
        
    except Exception as e:
        logger.error(f"Error creating milestone: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.patch("/priorities/{priority_id}")
async def update_priority_item(
    priority_id: str,
    update: PriorityItemUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Mark priority item as completed or dismissed"""
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        
        update_data = {}
        if update.completed is not None:
            update_data['completed'] = update.completed
            if update.completed:
                update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
        
        if update.dismissed is not None:
            update_data['dismissed'] = update.dismissed
            if update.dismissed:
                update_data['dismissed_at'] = datetime.now(timezone.utc).isoformat()
        
        response = supabase.table('ai_priority_queue').update(update_data).eq(
            'id', priority_id
        ).eq('owner_id', user.id).execute()
        
        return {"success": True, "priority": response.data[0] if response.data else None}
        
    except Exception as e:
        logger.error(f"Error updating priority: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@dashboard_router.post("/priorities/refresh")
async def refresh_priorities(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Regenerate priority queue based on current data"""
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        
        # Clear existing uncompleted priorities
        supabase.table('ai_priority_queue').delete().eq(
            'owner_id', user.id
        ).eq('completed', False).execute()
        
        # Fetch fresh data
        deals_response = supabase.table('deals').select(
            '*, pipeline_stages(stage_weight, name)'
        ).eq('owner_id', user.id).execute()
        
        milestones_response = supabase.table('deal_milestones').select('*').eq(
            'owner_id', user.id
        ).execute()
        
        events_response = supabase.table('calendar_events').select('*').eq(
            'owner_id', user.id
        ).eq('status', 'scheduled').execute()
        
        # Generate new priorities
        new_priorities = await generate_priorities_from_data(
            user.id,
            deals_response.data or [],
            milestones_response.data or [],
            events_response.data or [],
            supabase
        )
        
        # Insert
        if new_priorities:
            response = supabase.table('ai_priority_queue').insert(new_priorities).execute()
            return {"success": True, "count": len(response.data)}
        
        return {"success": True, "count": 0}
        
    except Exception as e:
        logger.error(f"Error refreshing priorities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
