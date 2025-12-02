"""Marketplace interaction models for DealLinked."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class SavedDeal(BaseModel):
    """User saved/bookmarked deal."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    deal_id: str
    saved_at: datetime
    notes: Optional[str] = None


class SavedDealCreate(BaseModel):
    """Create a saved deal."""
    deal_id: str
    notes: Optional[str] = None


class DealView(BaseModel):
    """Deal view for analytics."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_id: str
    user_id: Optional[str] = None
    viewed_at: datetime


class MarketplaceInquiry(BaseModel):
    """Initial inquiry from buyer to broker."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_id: str
    inquirer_id: str
    broker_id: str
    message: str
    status: str = "new"  # new, responded, closed
    created_at: datetime
    responded_at: Optional[datetime] = None


class InquiryCreate(BaseModel):
    """Create an inquiry."""
    deal_id: str
    message: str


class InquiryResponse(BaseModel):
    """Update inquiry status."""
    status: str  # responded, closed


class MarketplaceMessage(BaseModel):
    """Real-time message between users."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    recipient_id: str
    deal_id: str
    message: str
    read: bool = False
    created_at: datetime


class MessageCreate(BaseModel):
    """Send a message."""
    recipient_id: str
    deal_id: str
    message: str
    conversation_id: Optional[str] = None


class MessageUpdate(BaseModel):
    """Mark message as read."""
    read: bool


class MarketplaceOffer(BaseModel):
    """Formal offer from buyer to broker."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_id: str
    buyer_id: str
    broker_id: str
    offer_amount: float
    terms: Optional[str] = None
    contingencies: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected, countered, withdrawn
    counter_amount: Optional[float] = None
    counter_terms: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None


class OfferCreate(BaseModel):
    """Submit an offer."""
    deal_id: str
    offer_amount: float
    terms: Optional[str] = None
    contingencies: Optional[str] = None
    expires_at: Optional[datetime] = None


class OfferUpdate(BaseModel):
    """Update offer status or counter."""
    status: Optional[str] = None  # accepted, rejected, countered, withdrawn
    counter_amount: Optional[float] = None
    counter_terms: Optional[str] = None


class Conversation(BaseModel):
    """Conversation summary for messaging UI."""
    conversation_id: str
    other_user_id: str
    other_user_name: str
    other_user_avatar: Optional[str] = None
    deal_id: str
    deal_title: str
    last_message: str
    last_message_at: datetime
    unread_count: int
