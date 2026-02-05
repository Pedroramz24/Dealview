"""
DealLinked CRM V2 - Calendar Routes
Simple calendar event management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import uuid

from utils.db import get_supabase
from utils.auth_helpers import security

router = APIRouter(prefix="/calendar", tags=["Calendar"])
logger = logging.getLogger(__name__)


# ============================================================================
# MODELS
# ============================================================================

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = False
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    event_type: Optional[str] = "meeting"  # meeting, call, tour, deadline, other
    color: Optional[str] = "#00b8d4"


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    event_type: Optional[str] = None
    color: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def get_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    """Extract user ID from Supabase token"""
    supabase = get_supabase()
    user_response = supabase.auth.get_user(credentials.credentials)
    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_response.user.id


# ============================================================================
# ROUTES
# ============================================================================

@router.get("/events")
async def list_events(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    start_date: Optional[str] = None,  # ISO format
    end_date: Optional[str] = None,    # ISO format
    event_type: Optional[str] = None
):
    """List calendar events for current user"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Build query with related deal/contact info
        query = supabase.table('calendar_events').select(
            '*, deals(id, title, address), contacts(id, name, company)'
        ).eq('owner_id', user_id)
        
        # Apply date filters
        if start_date:
            query = query.gte('start_time', start_date)
        if end_date:
            query = query.lte('start_time', end_date)
        if event_type:
            query = query.eq('event_type', event_type)
        
        query = query.order('start_time')
        
        response = query.execute()
        
        return {
            "success": True,
            "events": response.data or [],
            "count": len(response.data or [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List events error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch events")


@router.get("/events/upcoming")
async def get_upcoming_events(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    days: int = 7,
    limit: int = 10
):
    """Get upcoming events for the next N days"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        now = datetime.utcnow()
        end_date = now + timedelta(days=days)
        
        response = supabase.table('calendar_events').select(
            '*, deals(id, title), contacts(id, name)'
        ).eq('owner_id', user_id).gte('start_time', now.isoformat()).lte('start_time', end_date.isoformat()).order('start_time').limit(limit).execute()
        
        return {
            "success": True,
            "events": response.data or []
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get upcoming events error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch upcoming events")


@router.get("/events/{event_id}")
async def get_event(
    event_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific event"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Use .execute() instead of .single() to avoid exception on no rows
        response = supabase.table('calendar_events').select(
            '*, deals(id, title, address, asset_type), contacts(id, name, email, phone, company)'
        ).eq('id', event_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event = response.data[0]
        if event['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "success": True,
            "event": event
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch event")


@router.post("/events")
async def create_event(
    event: EventCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new calendar event"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        event_data = {
            "id": str(uuid.uuid4()),
            "owner_id": user_id,
            "title": event.title,
            "description": event.description,
            "start_time": event.start_time.isoformat(),
            "end_time": event.end_time.isoformat() if event.end_time else None,
            "all_day": event.all_day or False,
            "deal_id": event.deal_id,
            "contact_id": event.contact_id,
            "event_type": event.event_type or "meeting",
            "color": event.color or "#00b8d4"
        }
        
        response = supabase.table('calendar_events').insert(event_data).execute()
        
        return {
            "success": True,
            "event": response.data[0] if response.data else None,
            "message": "Event created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create event")


@router.put("/events/{event_id}")
async def update_event(
    event_id: str,
    event: EventUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a calendar event"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        existing = supabase.table('calendar_events').select('owner_id').eq('id', event_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Event not found")
        if existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_data = event.model_dump(exclude_unset=True)
        
        # Handle datetime fields
        if 'start_time' in update_data and update_data['start_time']:
            update_data['start_time'] = update_data['start_time'].isoformat()
        if 'end_time' in update_data and update_data['end_time']:
            update_data['end_time'] = update_data['end_time'].isoformat()
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase.table('calendar_events').update(update_data).eq('id', event_id).execute()
        
        return {
            "success": True,
            "event": response.data[0] if response.data else None,
            "message": "Event updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update event")


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a calendar event"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        existing = supabase.table('calendar_events').select('owner_id').eq('id', event_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Event not found")
        if existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        supabase.table('calendar_events').delete().eq('id', event_id).execute()
        
        return {
            "success": True,
            "message": "Event deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete event error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete event")
