"""Common/shared data models."""
from pydantic import BaseModel
from .user import User


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class StageUpdate(BaseModel):
    stage: str
