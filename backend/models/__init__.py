"""Data models for DealLinked CRM."""
from .user import User, UserCreate, UserLogin
from .deal import Deal, DealCreate, DealUpdate
from .contact import Contact, ContactCreate
from .team import TeamInvite, TeamCreate, TeamUpdate, InviteCreate, JoinTeam, UpdateMemberRole
from .common import Token, StageUpdate
from .chat import ChatMessage, ChatRequest, Citation, ChatResponse
from .email import EmailSettingsCreate, EmailSettingsResponse, TestEmailConnection, SendTransactionalEmail
from .campaign import CreateCampaign, SendCampaign, ScheduleCampaign, BatchScheduleCampaign
from .marketplace import (
    SavedDeal, SavedDealCreate,
    DealView,
    MarketplaceInquiry, InquiryCreate, InquiryResponse,
    MarketplaceMessage, MessageCreate, MessageUpdate,
    MarketplaceOffer, OfferCreate, OfferUpdate,
    Conversation
)
from .publishing import (
    PublishDealRequest, PublishDealResponse,
    CompletenessScore, calculate_completeness_score
)
from .ncnd import (
    NCNDSignatureCreate, NCNDSignature, NCNDStatus,
    NCNDSignatureResponse, generate_ncnd_text
)

__all__ = [
    # User models
    "User", "UserCreate", "UserLogin",
    # Deal models
    "Deal", "DealCreate", "DealUpdate",
    # Contact models
    "Contact", "ContactCreate",
    # Team models
    "TeamInvite", "TeamCreate", "TeamUpdate", "InviteCreate", "JoinTeam", "UpdateMemberRole",
    # Common models
    "Token", "StageUpdate",
    # Chat models
    "ChatMessage", "ChatRequest", "Citation", "ChatResponse",
    # Email models
    "EmailSettingsCreate", "EmailSettingsResponse", "TestEmailConnection", "SendTransactionalEmail",
    # Campaign models
    "CreateCampaign", "SendCampaign", "ScheduleCampaign", "BatchScheduleCampaign",
    # Marketplace models
    "SavedDeal", "SavedDealCreate",
    "DealView",
    "MarketplaceInquiry", "InquiryCreate", "InquiryResponse",
    "MarketplaceMessage", "MessageCreate", "MessageUpdate",
    "MarketplaceOffer", "OfferCreate", "OfferUpdate",
    "Conversation",
    # Publishing models
    "PublishDealRequest", "PublishDealResponse",
    "CompletenessScore", "calculate_completeness_score",
]
