"""Email-related data models."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class EmailSettingsCreate(BaseModel):
    sendgrid_api_key: str
    sender_email: EmailStr
    sender_name: str


class EmailSettingsResponse(BaseModel):
    id: str
    sender_email: str
    sender_name: str
    is_verified: bool
    last_tested_at: Optional[datetime]


class TestEmailConnection(BaseModel):
    api_key: str


class SendTransactionalEmail(BaseModel):
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    to_email: EmailStr
    to_name: Optional[str] = None
    subject: str
    html_content: str
    plain_text_content: Optional[str] = None
    cc_emails: Optional[List[str]] = None
    bcc_emails: Optional[List[str]] = None
