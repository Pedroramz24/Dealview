"""Deal-related data models."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


class Deal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Core Information
    deal_title: Optional[str] = None
    property_address: str
    asset_type: str  # Retail, Industrial, Office, Land, Restaurants, Hotels, Medical
    deal_status: str = "New"
    pipeline_stage: str = "New"
    priority: str = "Medium"  # High, Medium, Low
    owner_visibility: str = "Team"  # Private, Team
    description: str = ""
    
    # Location & Map
    latitude: float
    longitude: float
    display_on_map: bool = True
    market: Optional[str] = None
    submarket: Optional[str] = None
    
    # Property Facts
    building_size: Optional[float] = None  # sq ft
    lot_size: Optional[float] = None  # acres
    lot_acres: Optional[float] = None  # acres (alias for lot_size)
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    occupancy: Optional[str] = None  # Can be string like "95%" or float
    parking_spaces: Optional[int] = None
    key_features: Optional[str] = None
    
    # Financials
    asking_price: float
    noi: Optional[float] = None  # Net Operating Income
    cap_rate: Optional[float] = None
    lease_type: Optional[str] = None  # NNN, Gross, Modified Gross
    proforma_notes: Optional[str] = None
    
    # Contacts & Roles
    primary_contact: Optional[str] = None
    additional_contacts: List[Dict[str, str]] = []
    last_contact_date: Optional[str] = None
    
    # Activities & Notes
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    notes: str = ""
    
    # Media & Documents
    primary_image_url: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    documents: Optional[List[Dict[str, str]]] = None
    
    # Dates & IDs
    target_close_date: Optional[str] = None
    external_ids: Optional[str] = None
    
    # Transaction Timeline / Milestones (for Under Contract deals)
    milestones: Optional[Dict[str, Any]] = None
    under_contract_date: Optional[str] = None
    earnest_money_due_date: Optional[str] = None
    earnest_money_responsible: Optional[str] = None
    earnest_money_notes: Optional[str] = None
    property_info_delivery_date: Optional[str] = None
    property_info_responsible: Optional[str] = None
    property_info_notes: Optional[str] = None
    title_commitment_due_date: Optional[str] = None
    title_commitment_responsible: Optional[str] = None
    title_commitment_notes: Optional[str] = None
    seller_survey_delivery_date: Optional[str] = None
    seller_survey_responsible: Optional[str] = None
    seller_survey_notes: Optional[str] = None
    feasibility_period_ends_date: Optional[str] = None
    feasibility_period_responsible: Optional[str] = None
    feasibility_period_notes: Optional[str] = None
    buyer_objections_due_date: Optional[str] = None
    buyer_objections_responsible: Optional[str] = None
    buyer_objections_notes: Optional[str] = None
    seller_response_due_date: Optional[str] = None
    seller_response_responsible: Optional[str] = None
    seller_response_notes: Optional[str] = None
    closing_date: Optional[str] = None
    closing_responsible: Optional[str] = None
    closing_notes: Optional[str] = None
    
    # Legacy/Deprecated (keeping for backwards compatibility)
    stage: str = "New"  # Use deal_status instead
    contacts: List[Dict[str, str]] = []  # Use additional_contacts instead
    last_contact: Optional[datetime] = None  # Use last_contact_date instead
    
    # System fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""


class DealCreate(BaseModel):
    # Core Information
    deal_title: Optional[str] = None
    property_address: str
    asset_type: str
    deal_status: str = "New"
    pipeline_stage: str = "New"
    priority: str = "Medium"
    owner_visibility: str = "Team"
    description: str = ""
    
    # Location & Map
    latitude: float
    longitude: float
    display_on_map: bool = True
    market: Optional[str] = None
    submarket: Optional[str] = None
    
    # Property Facts
    building_size: Optional[float] = None
    lot_size: Optional[float] = None
    lot_acres: Optional[float] = None
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    occupancy: Optional[str] = None
    parking_spaces: Optional[int] = None
    key_features: Optional[str] = None
    
    # Financials
    asking_price: float
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    lease_type: Optional[str] = None
    proforma_notes: Optional[str] = None
    
    # Contacts & Roles
    primary_contact: Optional[str] = None
    additional_contacts: List[Dict[str, str]] = []
    last_contact_date: Optional[str] = None
    
    # Activities & Notes
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    notes: str = ""
    
    # Media & Documents
    primary_image_url: Optional[str] = None
    gallery_images: List[str] = []
    
    # Dates & IDs
    target_close_date: Optional[str] = None
    external_ids: Optional[str] = None
    
    # Transaction Timeline / Milestones
    milestones: Optional[Dict[str, Any]] = None
    under_contract_date: Optional[str] = None
    earnest_money_due_date: Optional[str] = None
    earnest_money_responsible: Optional[str] = None
    earnest_money_notes: Optional[str] = None
    property_info_delivery_date: Optional[str] = None
    property_info_responsible: Optional[str] = None
    property_info_notes: Optional[str] = None
    title_commitment_due_date: Optional[str] = None
    title_commitment_responsible: Optional[str] = None
    title_commitment_notes: Optional[str] = None
    seller_survey_delivery_date: Optional[str] = None
    seller_survey_responsible: Optional[str] = None
    seller_survey_notes: Optional[str] = None
    feasibility_period_ends_date: Optional[str] = None
    feasibility_period_responsible: Optional[str] = None
    feasibility_period_notes: Optional[str] = None
    buyer_objections_due_date: Optional[str] = None
    buyer_objections_responsible: Optional[str] = None
    buyer_objections_notes: Optional[str] = None
    seller_response_due_date: Optional[str] = None
    seller_response_responsible: Optional[str] = None
    seller_response_notes: Optional[str] = None
    closing_date: Optional[str] = None
    closing_responsible: Optional[str] = None
    closing_notes: Optional[str] = None
    
    # Legacy (for backwards compatibility)
    stage: str = "New"


class DealUpdate(BaseModel):
    # Core Information
    deal_title: Optional[str] = None
    property_address: Optional[str] = None
    asset_type: Optional[str] = None
    deal_status: Optional[str] = None
    pipeline_stage: Optional[str] = None
    priority: Optional[str] = None
    owner_visibility: Optional[str] = None
    description: Optional[str] = None
    
    # Location & Map
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    display_on_map: Optional[bool] = None
    market: Optional[str] = None
    submarket: Optional[str] = None
    
    # Property Facts
    building_size: Optional[float] = None
    lot_size: Optional[float] = None
    lot_acres: Optional[float] = None
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    occupancy: Optional[str] = None
    parking_spaces: Optional[int] = None
    key_features: Optional[str] = None
    
    # Financials
    asking_price: Optional[float] = None
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    lease_type: Optional[str] = None
    proforma_notes: Optional[str] = None
    
    # Contacts & Roles
    primary_contact: Optional[str] = None
    additional_contacts: Optional[List[Dict[str, str]]] = None
    last_contact_date: Optional[str] = None
    
    # Activities & Notes
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    notes: Optional[str] = None
    
    # Media & Documents
    primary_image_url: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    
    # Dates & IDs
    target_close_date: Optional[str] = None
    external_ids: Optional[str] = None
    
    # Transaction Timeline / Milestones
    milestones: Optional[Dict[str, Any]] = None
    under_contract_date: Optional[str] = None
    earnest_money_due_date: Optional[str] = None
    earnest_money_responsible: Optional[str] = None
    earnest_money_notes: Optional[str] = None
    property_info_delivery_date: Optional[str] = None
    property_info_responsible: Optional[str] = None
    property_info_notes: Optional[str] = None
    title_commitment_due_date: Optional[str] = None
    title_commitment_responsible: Optional[str] = None
    title_commitment_notes: Optional[str] = None
    seller_survey_delivery_date: Optional[str] = None
    seller_survey_responsible: Optional[str] = None
    seller_survey_notes: Optional[str] = None
    feasibility_period_ends_date: Optional[str] = None
    feasibility_period_responsible: Optional[str] = None
    feasibility_period_notes: Optional[str] = None
    buyer_objections_due_date: Optional[str] = None
    buyer_objections_responsible: Optional[str] = None
    buyer_objections_notes: Optional[str] = None
    seller_response_due_date: Optional[str] = None
    seller_response_responsible: Optional[str] = None
    seller_response_notes: Optional[str] = None
    closing_date: Optional[str] = None
    closing_responsible: Optional[str] = None
    closing_notes: Optional[str] = None
    
    # Legacy
    stage: Optional[str] = None
