"""NCND Digital Signature models for DealLinked Marketplace."""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import uuid


class NCNDSignatureCreate(BaseModel):
    """Request to sign an NCND agreement."""
    deal_id: str = Field(..., description="Deal ID to sign NCND for")
    signature_data: Optional[str] = Field(None, description="Base64 encoded signature image")
    agreed: bool = Field(..., description="User must explicitly agree to terms")
    
    @validator('agreed')
    def validate_agreed(cls, v):
        if not v:
            raise ValueError("User must agree to NCND terms")
        return v


class NCNDSignature(BaseModel):
    """NCND signature record."""
    id: str
    user_id: str
    deal_id: str
    property_address: str
    user_full_name: str
    user_email: str
    signature_data: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    agreement_text: str
    signed_at: datetime
    expires_at: datetime
    is_active: bool
    created_at: datetime


class NCNDStatus(BaseModel):
    """NCND signature status for a user and deal."""
    has_signed: bool
    is_expired: bool
    signature: Optional[NCNDSignature] = None
    requires_signature: bool


class NCNDSignatureResponse(BaseModel):
    """Response after signing NCND."""
    success: bool
    message: str
    signature_id: str
    expires_at: datetime


# NCND Agreement Template
NCND_AGREEMENT_TEMPLATE = """
NON-CIRCUMVENTION AND NON-DISCLOSURE AGREEMENT

By accessing this listing and any associated documents, analyses, financial information, broker communications, or property materials (collectively, the "Confidential Information"), you ("Recipient") agree that all such information is proprietary to the listing broker and/or property owner ("Disclosing Party") and is provided solely for the purpose of evaluating a potential transaction.

Recipient agrees not to disclose, distribute, reproduce, or share any Confidential Information with any third party except internal advisors directly involved in evaluating the opportunity, who shall also be bound by these same obligations.

Recipient further agrees not to circumvent the Disclosing Party in any manner, including contacting the property owner, tenants, lenders, contractors, property managers, or any other party connected to the asset without prior written authorization. All inquiries, negotiations, offers, and communications must be conducted exclusively through the Disclosing Party.

Recipient acknowledges that unauthorized disclosure or circumvention may cause substantial harm and agrees that equitable remedies, including injunctive relief, may be sought.

This NCND applies to all information accessed through DealLinked and remains in effect for a period of six (6) months from the date of acceptance.

Property Address: {property_address}
Recipient Name: {user_full_name}
Date: {current_date}
"""


def generate_ncnd_text(property_address: str, user_full_name: str) -> str:
    """Generate NCND agreement text with dynamic fields filled in."""
    from datetime import datetime, timezone
    
    return NCND_AGREEMENT_TEMPLATE.format(
        property_address=property_address,
        user_full_name=user_full_name,
        current_date=datetime.now(timezone.utc).strftime("%B %d, %Y")
    )
