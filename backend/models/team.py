"""Team-related data models."""
from pydantic import BaseModel, EmailStr
from typing import Optional


class TeamInvite(BaseModel):
    email: EmailStr
    role: str = "readonly"


class TeamCreate(BaseModel):
    name: str


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    default_deal_sharing: Optional[str] = None


class InviteCreate(BaseModel):
    role: str = 'agent'
    email: Optional[str] = None


class JoinTeam(BaseModel):
    token: str


class UpdateMemberRole(BaseModel):
    role: str
