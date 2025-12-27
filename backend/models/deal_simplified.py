"""Simplified Deal models aligned with Supabase schema."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid


class Deal(BaseModel):
    """Deal model matching actual Supabase schema - for responses."""
    model_config = ConfigDict(extra="ignore", from_attributes=True)
    
    # Required fields
    id: Optional[str] = None
    owner_id: Optional[str] = None
    
    # Core Information
    title: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    asset_type: Optional[str] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None
    
    # Location
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    display_on_map: Optional[bool] = None
    
    # Property Facts
    size: Optional[float] = None
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    occupancy: Optional[str] = None
    parking_spaces: Optional[int] = None
    
    # Financials
    asking_price: Optional[float] = None
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    
    # Pipeline
    pipeline_id: Optional[str] = None
    pipeline_stage_id: Optional[str] = None
    
    # Contacts
    primary_contact_id: Optional[str] = None
    last_contact_date: Optional[str] = None
    
    # Activities
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    target_close_date: Optional[str] = None
    notes: Optional[str] = None
    
    # Media
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None
    
    # System
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_published: Optional[bool] = None
    approval_status: Optional[str] = None


class DealCreate(BaseModel):
    """Model for creating deals - only required fields."""
    # Required fields
    address: str
    asset_type: str
    asking_price: float
    
    # Optional fields
    title: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    description: Optional[str] = ""
    status: Optional[str] = "New"
    stage: Optional[str] = "New"
    priority: Optional[str] = "Medium"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    size: Optional[float] = None
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    occupancy: Optional[str] = None
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    primary_contact_id: Optional[str] = None
    notes: Optional[str] = None
    pipeline_id: Optional[str] = None
    pipeline_stage_id: Optional[str] = None


class DealUpdate(BaseModel):
    """Model for updating deals - all fields optional."""
    title: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    asset_type: Optional[str] = None
    asking_price: Optional[float] = None
    size: Optional[float] = None
    lot_size: Optional[float] = None
    description: Optional[str] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    priority: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    pipeline_id: Optional[str] = None
    pipeline_stage_id: Optional[str] = None
    target_close_date: Optional[str] = None


class StageUpdate(BaseModel):
    """Model for updating deal stage."""
    stage: str
