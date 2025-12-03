"""Enhanced Publishing Wizard models for DealLinked Marketplace."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class PublishDealRequest(BaseModel):
    """Comprehensive publishing request for property or land listings."""
    
    # Property Type
    is_land_listing: bool = False
    
    # Basic Info (Required for both)
    public_asset_type: str = Field(..., min_length=1)
    public_market: str = Field(..., min_length=1)
    public_price: float = Field(..., gt=0)
    public_strategy: Optional[str] = "Core"
    
    # Financial Details
    cap_rate: Optional[float] = None
    noi: Optional[float] = None
    
    # Sale Conditions & Notes
    sale_conditions: Optional[List[str]] = []
    sale_notes: Optional[str] = None
    highlights: Optional[List[str]] = []
    seller_commitment_level: Optional[str] = "written_auth"  # Default to written auth
    
    # Media
    image_urls: Optional[List[str]] = []
    brochure_document_ids: Optional[List[str]] = []
    
    # Property-Specific Fields
    building_status: Optional[str] = None  # 'Under Construction', 'Under Renovation', 'Existing'
    buildings: Optional[int] = None
    units: Optional[int] = None
    gba: Optional[float] = None  # Gross Building Area
    floors: Optional[int] = None
    year_built: Optional[int] = None
    year_renovated: Optional[int] = None
    metering: Optional[str] = None
    construction: Optional[str] = None
    parking: Optional[str] = None
    land_area: Optional[float] = None
    zoning: Optional[str] = None
    zoning_description: Optional[str] = None
    unit_mix: Optional[Dict[str, Any]] = None  # For multi-family/retail
    
    # Land-Specific Fields
    lot_number: Optional[str] = None
    lot_size: Optional[float] = None
    lot_description: Optional[str] = None
    secondary_type: Optional[str] = None  # 'Commercial', 'Industrial', 'Residential', 'Agricultural'
    topography: Optional[str] = None  # 'Level', 'Rolling', 'Sloping', 'Steep'
    grading: Optional[str] = None  # 'Asphalt Paved', 'Finish Grade', etc.
    
    @validator('sale_conditions')
    def validate_sale_conditions(cls, v):
        """Validate sale conditions against allowed list."""
        allowed_conditions = [
            '1031 Exchange', 'Build to Suit', 'Shell Condition', 
            'Bulk/Portfolio Sale', 'Deferred Maintenance', 'Distress Sale',
            'Ground Lease (Leased Fee)', 'Ground Lease (Leasehold)',
            'High Vacancy Property', 'Lease Option', 'Redevelopment Project',
            'REO Sale', 'Sale Leaseback', 'Short Sale'
        ]
        if v:
            for condition in v:
                if condition not in allowed_conditions:
                    raise ValueError(f"Invalid sale condition: {condition}")
        return v
    
    @validator('building_status')
    def validate_building_status(cls, v):
        """Validate building status."""
        if v and v not in ['Under Construction', 'Under Renovation', 'Existing']:
            raise ValueError("Invalid building status")
        return v
    
    @validator('secondary_type')
    def validate_secondary_type(cls, v):
        """Validate land secondary type."""
        if v and v not in ['Commercial', 'Industrial', 'Residential', 'Agricultural']:
            raise ValueError("Invalid secondary type")
        return v
    
    @validator('topography')
    def validate_topography(cls, v):
        """Validate topography."""
        if v and v not in ['Level', 'Rolling', 'Sloping', 'Steep']:
            raise ValueError("Invalid topography")
        return v
    
    @validator('grading')
    def validate_grading(cls, v):
        """Validate grading."""
        allowed_gradings = [
            'Asphalt Paved', 'Finish Grade', 'Finished Lot', 
            'Previously Developed Lot', 'Raw Land', 'Agricultural Land'
        ]
        if v and v not in allowed_gradings:
            raise ValueError("Invalid grading")
        return v


class CompletenessScore(BaseModel):
    """Listing completeness breakdown."""
    total_score: int = Field(..., ge=0, le=100)
    required_fields_score: int = Field(..., ge=0, le=40)
    financial_fields_score: int = Field(..., ge=0, le=20)
    details_fields_score: int = Field(..., ge=0, le=20)
    media_score: int = Field(..., ge=0, le=20)
    can_publish: bool
    missing_fields: List[str]


class PublishDealResponse(BaseModel):
    """Response after publishing a deal."""
    success: bool
    message: str
    deal_id: str
    completeness_score: int
    public_status: str  # 'pending_approval', 'published', 'draft'
    can_publish: bool


def calculate_completeness_score(deal_data: Dict[str, Any]) -> CompletenessScore:
    """
    Calculate listing completeness score.
    
    Score breakdown:
    - Required fields (40 points): price, asset_type, market, description
    - Financial fields (20 points): cap_rate, noi  
    - Details fields (20 points): building details, zoning, highlights
    - Media (20 points): photos, documents
    
    Minimum 80% required to publish.
    """
    required_score = 0
    financial_score = 0
    details_score = 0
    media_score = 0
    missing_fields = []
    
    # Required fields (10 points each = 40 total)
    required_fields = ['public_price', 'public_asset_type', 'public_market', 'description']
    for field in required_fields:
        if deal_data.get(field):
            required_score += 10
        else:
            missing_fields.append(field)
    
    # Financial fields (10 points each = 20 total)
    financial_fields = ['cap_rate', 'noi']
    for field in financial_fields:
        if deal_data.get(field) is not None:
            financial_score += 10
    
    # Details fields (20 points total)
    is_land = deal_data.get('is_land_listing', False)
    
    if is_land:
        # Land-specific details
        detail_fields = ['lot_size', 'secondary_type', 'topography', 'grading', 
                        'zoning', 'highlights']
        points_per_field = 20 / len(detail_fields)
        for field in detail_fields:
            val = deal_data.get(field)
            if val and (not isinstance(val, list) or len(val) > 0):
                details_score += points_per_field
    else:
        # Property details
        detail_fields = ['buildings', 'units', 'gba', 'year_built', 'zoning', 
                        'building_status', 'highlights']
        points_per_field = 20 / len(detail_fields)
        for field in detail_fields:
            val = deal_data.get(field)
            if val is not None and (not isinstance(val, list) or len(val) > 0):
                details_score += points_per_field
    
    # Media (20 points total: 10 for photos, 10 for documents)
    image_urls = deal_data.get('image_urls', []) or []
    brochure_docs = deal_data.get('brochure_document_ids', []) or []
    
    if len(image_urls) > 0:
        media_score += 10
    if len(brochure_docs) > 0:
        media_score += 10
    
    # Calculate total
    total_score = int(required_score + financial_score + details_score + media_score)
    can_publish = total_score >= 80
    
    return CompletenessScore(
        total_score=total_score,
        required_fields_score=int(required_score),
        financial_fields_score=int(financial_score),
        details_fields_score=int(details_score),
        media_score=int(media_score),
        can_publish=can_publish,
        missing_fields=missing_fields
    )
