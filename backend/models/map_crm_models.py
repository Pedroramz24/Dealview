"""Map CRM Pydantic models for internal property management tool."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class AssetType(str, Enum):
    """Property asset types."""
    GAS = "Gas"
    RETAIL = "Retail"
    INDUSTRIAL = "Industrial"
    OFFICE = "Office"
    LAND = "Land"
    MULTIFAMILY = "Multifamily"


class PropertyStatus(str, Enum):
    """Property status in Map CRM workflow."""
    AVAILABLE = "available"
    CLAIMED = "claimed"
    CONVERTED = "converted"
    DEAD = "dead"


class AssignmentStatus(str, Enum):
    """Assignment status for team members."""
    CLAIMED = "claimed"
    WORKING = "working"
    CONTACTED = "contacted"


class ImportStatus(str, Enum):
    """CSV import processing status."""
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MapPropertyBase(BaseModel):
    """Base model for property data."""
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: float
    longitude: float
    title: Optional[str] = None
    asset_type: AssetType
    status: PropertyStatus = PropertyStatus.AVAILABLE
    asking_price: Optional[float] = None
    lot_size: Optional[float] = None
    building_size: Optional[float] = None
    assessed_value: Optional[float] = None
    cap_rate: Optional[float] = None
    noi: Optional[float] = None
    income: Optional[float] = None
    expenses: Optional[float] = None
    year_built: Optional[int] = None
    parking_spaces: Optional[int] = None
    occupancy: Optional[float] = None
    zoning: Optional[str] = None
    lease_type: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None


class MapPropertyCreate(MapPropertyBase):
    """Model for creating a new property."""
    team_id: Optional[str] = None


class MapPropertyUpdate(BaseModel):
    """Model for updating property fields."""
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    title: Optional[str] = None
    asset_type: Optional[AssetType] = None
    status: Optional[PropertyStatus] = None
    asking_price: Optional[float] = None
    lot_size: Optional[float] = None
    building_size: Optional[float] = None
    assessed_value: Optional[float] = None
    cap_rate: Optional[float] = None
    noi: Optional[float] = None
    income: Optional[float] = None
    expenses: Optional[float] = None
    year_built: Optional[int] = None
    parking_spaces: Optional[int] = None
    occupancy: Optional[float] = None
    zoning: Optional[str] = None
    lease_type: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None


class MapProperty(MapPropertyBase):
    """Full property model with metadata."""
    id: str
    owner_id: str
    team_id: Optional[str] = None
    deal_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_edited_by: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class MapPropertyAssignment(BaseModel):
    """Property assignment model."""
    id: str
    property_id: str
    user_id: str
    status: AssignmentStatus
    claimed_at: datetime
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ClaimPropertyRequest(BaseModel):
    """Request to claim a property."""
    notes: Optional[str] = None


class CSVImport(BaseModel):
    """CSV import record."""
    id: str
    user_id: str
    filename: str
    total_rows: int
    successful_rows: int
    failed_rows: int
    status: ImportStatus
    error_log: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ImportProgress(BaseModel):
    """Real-time import progress."""
    import_id: str
    status: ImportStatus
    total_rows: int
    processed_rows: int
    successful_rows: int
    failed_rows: int
    errors: Optional[List[str]] = None


class MapDataRequest(BaseModel):
    """Request for clustered map data."""
    north: float
    south: float
    east: float
    west: float
    zoom: int
    asset_types: Optional[List[AssetType]] = None
    status: Optional[List[PropertyStatus]] = None


class MapCluster(BaseModel):
    """Clustered property point for map."""
    latitude: float
    longitude: float
    count: int
    property_ids: List[str]
    asset_types: List[str]


class ConvertToDealRequest(BaseModel):
    """Request to convert property to DealLinked deal."""
    pipeline_id: Optional[str] = None
    pipeline_stage_id: Optional[str] = None


class ConvertToDealResponse(BaseModel):
    """Response after converting property to deal."""
    success: bool
    deal_id: str
    message: str
