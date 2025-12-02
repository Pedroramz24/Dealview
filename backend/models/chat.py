"""Chat/AI-related data models."""
from pydantic import BaseModel
from typing import List


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str
    messages: List[ChatMessage] = []


class Citation(BaseModel):
    url: str
    title: str


class ChatResponse(BaseModel):
    content: str
    citations: List[Citation] = []
    related_questions: List[str] = []
