"""Broker Reputation Engine models for DealLinked Marketplace."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


# =====================================================
# Deal Lifecycle Models
# =====================================================

class DealLifecycleEvent(BaseModel):
    """A lifecycle event for a deal."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_id: str
    event_type: str  # 'published', 'nda_signed', 'loi_submitted', 'under_contract', 'closed', 'withdrawn'
    event_date: datetime
    initiated_by: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    withdrawal_reason: Optional[str] = None
    withdrawal_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CreateLifecycleEvent(BaseModel):
    """Create a lifecycle event."""
    deal_id: str
    event_type: str
    withdrawal_reason: Optional[str] = None
    withdrawal_notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    
    @validator('event_type')
    def validate_event_type(cls, v):
        allowed = ['published', 'nda_signed', 'loi_submitted', 'under_contract', 'closed', 'withdrawn']
        if v not in allowed:
            raise ValueError(f"Invalid event type. Must be one of: {', '.join(allowed)}")
        return v
    
    @validator('withdrawal_reason')
    def validate_withdrawal_reason(cls, v, values):
        if values.get('event_type') == 'withdrawn' and not v:
            raise ValueError("Withdrawal reason is required when event_type is 'withdrawn'")
        if v:
            allowed = ['seller_not_ready', 'owner_denied', 'deal_fell_through', 'pricing_issues', 'other']
            if v not in allowed:
                raise ValueError(f"Invalid withdrawal reason. Must be one of: {', '.join(allowed)}")
        return v


# =====================================================
# Broker Reputation Models
# =====================================================

class BrokerReputation(BaseModel):
    """Broker reputation and quality metrics."""
    broker_id: str
    quality_score: int = Field(ge=0, le=100)
    avg_response_time_hours: float
    total_deals_published: int
    closed_deals_count: int
    dead_deal_count: int
    dead_deal_ratio: float
    nda_to_loi_rate: float = 0
    loi_to_contract_rate: float = 0
    contract_to_close_rate: float = 0
    verified_listing_count: int = 0
    avg_seller_engagement_score: float
    avg_terms_accuracy_score: float
    positive_feedback_count: int
    negative_feedback_count: int
    max_active_listings: int
    requires_manual_approval: bool
    is_trusted_broker: bool
    is_verified_track_record: bool
    is_fast_responder: bool
    last_calculated_at: datetime
    created_at: datetime
    updated_at: datetime


class BrokerBadges(BaseModel):
    """Display-friendly broker badges and stats."""
    broker_id: str
    badges: List[str] = []  # ['Trusted Broker', 'Verified Track Record', 'Fast Responder']
    stats: Dict[str, Any] = {}  # {'response_time': 'Fast', 'closed_deals': 10}
    quality_tier: str  # 'Premium', 'Standard', 'New'


class BrokerReputationSummary(BaseModel):
    """Public-facing reputation summary."""
    broker_id: str
    quality_score: int
    badges: List[str]
    stats: Dict[str, str]
    can_publish: bool
    max_listings: int


# =====================================================
# Deal Feedback Models
# =====================================================

class DealFeedback(BaseModel):
    """Structured feedback about a deal interaction."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_id: str
    buyer_id: str
    broker_id: str
    seller_engaged: Optional[bool] = None
    terms_accurate: Optional[bool] = None
    would_recommend: Optional[bool] = None
    optional_comment: Optional[str] = None
    interaction_type: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)


class SubmitFeedback(BaseModel):
    """Submit deal feedback."""
    deal_id: str
    seller_engaged: bool = Field(..., description="Was the seller actually engaged?")
    terms_accurate: bool = Field(..., description="Did deal terms match posting?")
    would_recommend: bool = Field(..., description="Would you work with this broker again?")
    optional_comment: Optional[str] = Field(None, max_length=1000)
    interaction_type: str
    
    @validator('interaction_type')
    def validate_interaction_type(cls, v):
        allowed = ['offer_submitted', 'loi_negotiated', 'deal_closed', 'deal_dead']
        if v not in allowed:
            raise ValueError(f"Invalid interaction type. Must be one of: {', '.join(allowed)}")
        return v


class FeedbackResponse(BaseModel):
    """Response after submitting feedback."""
    success: bool
    message: str
    feedback_id: str


# =====================================================
# Seller Commitment Models
# =====================================================

class SellerCommitment(BaseModel):
    """Seller commitment verification."""
    deal_id: str
    commitment_level: str  # 'signed_listing', 'written_auth', 'verbal_maybe'
    commitment_proof_url: Optional[str] = None
    commitment_verified_at: Optional[datetime] = None
    commitment_verified_by: Optional[str] = None


class UpdateCommitment(BaseModel):
    """Update seller commitment level."""
    commitment_level: str
    commitment_proof_url: Optional[str] = None
    
    @validator('commitment_level')
    def validate_commitment_level(cls, v):
        allowed = ['signed_listing', 'written_auth', 'verbal_maybe']
        if v not in allowed:
            raise ValueError(f"Invalid commitment level. Must be one of: {', '.join(allowed)}")
        return v


# =====================================================
# Response Time Models
# =====================================================

class ResponseTimeRecord(BaseModel):
    """Track broker response time."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    broker_id: str
    inquiry_id: Optional[str] = None
    inquiry_received_at: datetime
    response_sent_at: datetime
    response_time_hours: float
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RecordResponseTime(BaseModel):
    """Record a response time."""
    inquiry_id: Optional[str] = None
    inquiry_received_at: datetime
    response_sent_at: datetime


# =====================================================
# Helper Functions
# =====================================================

def calculate_broker_badges(reputation: BrokerReputation) -> BrokerBadges:
    """Convert reputation data into display badges and stats."""
    badges = []
    stats = {}
    
    # Determine badges
    if reputation.is_trusted_broker:
        badges.append("Trusted Broker")
    if reputation.is_verified_track_record:
        badges.append("Verified Track Record")
    if reputation.is_fast_responder:
        badges.append("Fast Responder")
    
    # Format stats for display
    if reputation.avg_response_time_hours > 0:
        if reputation.avg_response_time_hours < 6:
            stats['response_time'] = 'Very Fast'
        elif reputation.avg_response_time_hours < 12:
            stats['response_time'] = 'Fast'
        elif reputation.avg_response_time_hours < 24:
            stats['response_time'] = 'Same Day'
        else:
            stats['response_time'] = f'{int(reputation.avg_response_time_hours / 24)} days'
    
    if reputation.closed_deals_count > 0:
        stats['closed_deals'] = f'{reputation.closed_deals_count} closed'
    
    if reputation.total_deals_published > 0:
        stats['total_listings'] = f'{reputation.total_deals_published} listings'
    
    # Quality tier
    if reputation.quality_score >= 70:
        quality_tier = 'Premium'
    elif reputation.quality_score >= 40:
        quality_tier = 'Standard'
    else:
        quality_tier = 'New'
    
    return BrokerBadges(
        broker_id=reputation.broker_id,
        badges=badges,
        stats=stats,
        quality_tier=quality_tier
    )


def get_reputation_summary(reputation: BrokerReputation) -> BrokerReputationSummary:
    """Get public-facing reputation summary."""
    badges_obj = calculate_broker_badges(reputation)
    
    return BrokerReputationSummary(
        broker_id=reputation.broker_id,
        quality_score=reputation.quality_score,
        badges=badges_obj.badges,
        stats=badges_obj.stats,
        can_publish=not reputation.requires_manual_approval,
        max_listings=reputation.max_active_listings
    )
