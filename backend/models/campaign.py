"""Campaign-related data models."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class CreateCampaign(BaseModel):
    name: str
    subject: str
    html_content: str
    plain_text_content: Optional[str] = None
    template_id: Optional[str] = None
    segment_filters: Optional[Dict[str, Any]] = None
    design: Optional[str] = None  # Unlayer design JSON for re-editing


class SendCampaign(BaseModel):
    campaign_id: str
    contact_ids: List[str]


class ScheduleCampaign(BaseModel):
    campaign_id: str
    contact_ids: List[str]
    scheduled_time: datetime
    timezone: str = 'America/Chicago'


class BatchScheduleCampaign(BaseModel):
    campaign_id: str
    contact_ids: List[str]
    start_date: datetime
    end_date: datetime
    emails_per_day: int = 50
