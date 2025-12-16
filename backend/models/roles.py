"""Unified roles system models."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class RoleVerificationRequest(BaseModel):
    """Request to become a verified broker or seller."""
    requested_role: str = Field(..., pattern="^(broker|seller)$")
    
    # Broker fields
    broker_license: Optional[str] = None
    broker_firm: Optional[str] = None
    broker_phone: Optional[str] = None
    broker_markets: Optional[List[str]] = []
    broker_specialties: Optional[List[str]] = []
    broker_w9_url: Optional[str] = None
    broker_license_url: Optional[str] = None
    
    # Seller fields
    seller_entity_name: Optional[str] = None
    seller_entity_type: Optional[str] = None  # 'Individual', 'LLC', 'Corporation', 'Partnership'
    seller_phone: Optional[str] = None
    
    @validator('requested_role')
    def validate_role(cls, v):
        if v not in ['broker', 'seller']:
            raise ValueError("Role must be 'broker' or 'seller'")
        return v


class OwnershipVerificationRequest(BaseModel):
    """Request to verify ownership of a specific property."""
    property_address: str = Field(..., min_length=5)
    proof_type: str = Field(..., pattern="^(deed|tax_record|title_report|other)$")
    proof_document_url: Optional[str] = None


class ApproveRoleRequest(BaseModel):
    """Admin approval of role verification."""
    request_id: str
    admin_notes: Optional[str] = None


class RejectRoleRequest(BaseModel):
    """Admin rejection of role verification."""
    request_id: str
    rejection_reason: str = Field(..., min_length=10)
    admin_notes: Optional[str] = None


class ApproveOwnershipRequest(BaseModel):
    """Admin approval of ownership verification."""
    verification_id: str
    admin_notes: Optional[str] = None


class RejectOwnershipRequest(BaseModel):
    """Admin rejection of ownership verification."""
    verification_id: str
    rejection_reason: str = Field(..., min_length=10)
    admin_notes: Optional[str] = None


class UserRoles(BaseModel):
    """User's current roles and verifications."""
    user_id: str
    roles: List[str] = []
    primary_role: str = "buyer"
    role_verifications: Dict[str, Any] = {}
    is_admin: bool = False
    
    # Role-specific data
    broker_data: Optional[Dict[str, Any]] = None
    seller_data: Optional[Dict[str, Any]] = None
    buyer_data: Optional[Dict[str, Any]] = None


class UserPermissions(BaseModel):
    """User's computed permissions based on roles."""
    can_publish_as_broker: bool = False
    can_publish_as_owner: bool = False
    verified_properties: List[str] = []  # Addresses user can publish as owner
    max_listings: int = 100
    can_access_marketplace: bool = True
    can_access_crm: bool = False
    is_admin: bool = False


class RoleVerificationResponse(BaseModel):
    """Response after submitting role verification request."""
    success: bool
    message: str
    request_id: Optional[str] = None
    status: str = "pending"  # 'pending', 'approved', 'rejected'


class OwnershipVerificationResponse(BaseModel):
    """Response after submitting ownership verification."""
    success: bool
    message: str
    verification_id: Optional[str] = None
    status: str = "pending"
