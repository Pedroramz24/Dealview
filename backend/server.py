from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import uuid
import logging
import re
from passlib.context import CryptContext
from jose import JWTError, jwt
from supabase import create_client, Client
import io
import httpx
import json
from collections import OrderedDict
from datetime import datetime, timedelta
from layer_registry import LAYER_REGISTRY, CACHE_TTL, MAX_CACHE_SIZE, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW
import feedparser
import time


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_KEY']
supabase: Client = create_client(supabase_url, supabase_key)

# JWT & Password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 43200))

security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")


# News feed cache
news_cache = {
    'articles': [],
    'last_updated': 0,
    'cache_duration': 3600  # 1 hour in seconds
}


# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str = "agent"  # agent, admin, readonly
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Deal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # Core Information
    deal_title: Optional[str] = None
    property_address: str
    asset_type: str  # Retail, Industrial, Office, Land, Restaurants, Hotels, Medical
    deal_status: str = "New"
    pipeline_stage: str = "New"
    priority: str = "Medium"  # High, Medium, Low
    owner_visibility: str = "Team"  # Private, Team
    description: str = ""
    
    # Location & Map
    latitude: float
    longitude: float
    display_on_map: bool = True
    market: Optional[str] = None
    submarket: Optional[str] = None
    
    # Property Facts
    building_size: Optional[float] = None  # sq ft
    lot_size: Optional[float] = None  # acres
    lot_acres: Optional[float] = None  # acres (alias for lot_size)
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    occupancy: Optional[str] = None  # Can be string like "95%" or float
    parking_spaces: Optional[int] = None
    key_features: Optional[str] = None
    
    # Financials
    asking_price: float
    noi: Optional[float] = None  # Net Operating Income
    cap_rate: Optional[float] = None
    lease_type: Optional[str] = None  # NNN, Gross, Modified Gross
    proforma_notes: Optional[str] = None
    
    # Contacts & Roles
    primary_contact: Optional[str] = None
    additional_contacts: List[Dict[str, str]] = []
    last_contact_date: Optional[str] = None
    
    # Activities & Notes
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    notes: str = ""
    
    # Media & Documents
    primary_image_url: Optional[str] = None
    gallery_images: List[str] = []
    documents: List[Dict[str, str]] = []  # [{"name": "...", "url": "..."}]
    
    # Dates & IDs
    target_close_date: Optional[str] = None
    external_ids: Optional[str] = None
    
    # Transaction Timeline / Milestones (for Under Contract deals)
    milestones: Optional[Dict[str, Any]] = None  # Structured milestone data
    under_contract_date: Optional[str] = None
    earnest_money_due_date: Optional[str] = None
    earnest_money_responsible: Optional[str] = None
    earnest_money_notes: Optional[str] = None
    property_info_delivery_date: Optional[str] = None
    property_info_responsible: Optional[str] = None
    property_info_notes: Optional[str] = None
    title_commitment_due_date: Optional[str] = None
    title_commitment_responsible: Optional[str] = None
    title_commitment_notes: Optional[str] = None
    seller_survey_delivery_date: Optional[str] = None
    seller_survey_responsible: Optional[str] = None
    seller_survey_notes: Optional[str] = None
    feasibility_period_ends_date: Optional[str] = None
    feasibility_period_responsible: Optional[str] = None
    feasibility_period_notes: Optional[str] = None
    buyer_objections_due_date: Optional[str] = None
    buyer_objections_responsible: Optional[str] = None
    buyer_objections_notes: Optional[str] = None
    seller_response_due_date: Optional[str] = None
    seller_response_responsible: Optional[str] = None
    seller_response_notes: Optional[str] = None
    closing_date: Optional[str] = None
    closing_responsible: Optional[str] = None
    closing_notes: Optional[str] = None
    
    # Legacy/Deprecated (keeping for backwards compatibility)
    stage: str = "New"  # Use deal_status instead
    contacts: List[Dict[str, str]] = []  # Use additional_contacts instead
    last_contact: Optional[datetime] = None  # Use last_contact_date instead
    
    # System fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""

class DealCreate(BaseModel):
    # Core Information
    deal_title: Optional[str] = None
    property_address: str
    asset_type: str
    deal_status: str = "New"
    pipeline_stage: str = "New"
    priority: str = "Medium"
    owner_visibility: str = "Team"
    description: str = ""
    
    # Location & Map
    latitude: float
    longitude: float
    display_on_map: bool = True
    market: Optional[str] = None
    submarket: Optional[str] = None
    
    # Property Facts
    building_size: Optional[float] = None
    lot_size: Optional[float] = None
    lot_acres: Optional[float] = None
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    occupancy: Optional[str] = None
    parking_spaces: Optional[int] = None
    key_features: Optional[str] = None
    
    # Financials
    asking_price: float
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    lease_type: Optional[str] = None
    proforma_notes: Optional[str] = None
    
    # Contacts & Roles
    primary_contact: Optional[str] = None
    additional_contacts: List[Dict[str, str]] = []
    last_contact_date: Optional[str] = None
    
    # Activities & Notes
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    notes: str = ""
    
    # Media & Documents
    primary_image_url: Optional[str] = None
    gallery_images: List[str] = []
    
    # Dates & IDs
    target_close_date: Optional[str] = None
    external_ids: Optional[str] = None
    
    # Transaction Timeline / Milestones
    milestones: Optional[Dict[str, Any]] = None
    under_contract_date: Optional[str] = None
    earnest_money_due_date: Optional[str] = None
    earnest_money_responsible: Optional[str] = None
    earnest_money_notes: Optional[str] = None
    property_info_delivery_date: Optional[str] = None
    property_info_responsible: Optional[str] = None
    property_info_notes: Optional[str] = None
    title_commitment_due_date: Optional[str] = None
    title_commitment_responsible: Optional[str] = None
    title_commitment_notes: Optional[str] = None
    seller_survey_delivery_date: Optional[str] = None
    seller_survey_responsible: Optional[str] = None
    seller_survey_notes: Optional[str] = None
    feasibility_period_ends_date: Optional[str] = None
    feasibility_period_responsible: Optional[str] = None
    feasibility_period_notes: Optional[str] = None
    buyer_objections_due_date: Optional[str] = None
    buyer_objections_responsible: Optional[str] = None
    buyer_objections_notes: Optional[str] = None
    seller_response_due_date: Optional[str] = None
    seller_response_responsible: Optional[str] = None
    seller_response_notes: Optional[str] = None
    closing_date: Optional[str] = None
    closing_responsible: Optional[str] = None
    closing_notes: Optional[str] = None
    
    # Legacy (for backwards compatibility)
    stage: str = "New"

class DealUpdate(BaseModel):
    # Core Information
    deal_title: Optional[str] = None
    property_address: Optional[str] = None
    asset_type: Optional[str] = None
    deal_status: Optional[str] = None
    pipeline_stage: Optional[str] = None
    priority: Optional[str] = None
    owner_visibility: Optional[str] = None
    description: Optional[str] = None
    
    # Location & Map
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    display_on_map: Optional[bool] = None
    market: Optional[str] = None
    submarket: Optional[str] = None
    
    # Property Facts
    building_size: Optional[float] = None
    lot_size: Optional[float] = None
    lot_acres: Optional[float] = None
    year_built: Optional[int] = None
    zoning: Optional[str] = None
    occupancy: Optional[str] = None
    parking_spaces: Optional[int] = None
    key_features: Optional[str] = None
    
    # Financials
    asking_price: Optional[float] = None
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    lease_type: Optional[str] = None
    proforma_notes: Optional[str] = None
    
    # Contacts & Roles
    primary_contact: Optional[str] = None
    additional_contacts: Optional[List[Dict[str, str]]] = None
    last_contact_date: Optional[str] = None
    
    # Activities & Notes
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    notes: Optional[str] = None
    
    # Media & Documents
    primary_image_url: Optional[str] = None
    gallery_images: Optional[List[str]] = None
    
    # Dates & IDs
    target_close_date: Optional[str] = None
    external_ids: Optional[str] = None
    
    # Transaction Timeline / Milestones
    milestones: Optional[Dict[str, Any]] = None
    under_contract_date: Optional[str] = None
    earnest_money_due_date: Optional[str] = None
    earnest_money_responsible: Optional[str] = None
    earnest_money_notes: Optional[str] = None
    property_info_delivery_date: Optional[str] = None
    property_info_responsible: Optional[str] = None
    property_info_notes: Optional[str] = None
    title_commitment_due_date: Optional[str] = None
    title_commitment_responsible: Optional[str] = None
    title_commitment_notes: Optional[str] = None
    seller_survey_delivery_date: Optional[str] = None
    seller_survey_responsible: Optional[str] = None
    seller_survey_notes: Optional[str] = None
    feasibility_period_ends_date: Optional[str] = None
    feasibility_period_responsible: Optional[str] = None
    feasibility_period_notes: Optional[str] = None
    buyer_objections_due_date: Optional[str] = None
    buyer_objections_responsible: Optional[str] = None
    buyer_objections_notes: Optional[str] = None
    seller_response_due_date: Optional[str] = None
    seller_response_responsible: Optional[str] = None
    seller_response_notes: Optional[str] = None
    closing_date: Optional[str] = None
    closing_responsible: Optional[str] = None
    closing_notes: Optional[str] = None
    
    # Legacy
    stage: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    tags: List[str] = []  # ["Retail", "Buyer", "Principal"]
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    tags: List[str] = []
    notes: str = ""

class TeamInvite(BaseModel):
    email: EmailStr
    role: str = "readonly"

class StageUpdate(BaseModel):
    stage: str

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if user_doc is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def get_current_user_supabase(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Supabase JWT token and return user info"""
    try:
        token = credentials.credentials
        
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Return user info from Supabase
        return user_response.user
        
    except Exception as e:
        logger.error(f"Supabase auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


# Auth endpoints
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role="agent"
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['hashed_password'] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc.get('hashed_password', '')):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user_doc.pop('hashed_password', None)
    user = User(**user_doc)
    
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Deal endpoints
@api_router.post("/deals", response_model=Deal)
async def create_deal(deal_data: DealCreate, current_user: User = Depends(get_current_user)):
    deal = Deal(**deal_data.model_dump(), created_by=current_user.id)
    
    deal_dict = deal.model_dump()
    deal_dict['created_at'] = deal_dict['created_at'].isoformat()
    deal_dict['updated_at'] = deal_dict['updated_at'].isoformat()
    if deal_dict['last_contact']:
        deal_dict['last_contact'] = deal_dict['last_contact'].isoformat()
    
    await db.deals.insert_one(deal_dict)
    return deal

@api_router.get("/deals", response_model=List[Deal])
async def get_deals(current_user: User = Depends(get_current_user)):
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    
    for deal in deals:
        if isinstance(deal.get('created_at'), str):
            deal['created_at'] = datetime.fromisoformat(deal['created_at'])
        if isinstance(deal.get('updated_at'), str):
            deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
        if deal.get('last_contact') and isinstance(deal['last_contact'], str):
            deal['last_contact'] = datetime.fromisoformat(deal['last_contact'])
    
    return deals

@api_router.get("/deals/{deal_id}", response_model=Deal)
async def get_deal(deal_id: str, current_user: User = Depends(get_current_user)):
    deal_doc = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal_doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    if isinstance(deal_doc.get('created_at'), str):
        deal_doc['created_at'] = datetime.fromisoformat(deal_doc['created_at'])
    if isinstance(deal_doc.get('updated_at'), str):
        deal_doc['updated_at'] = datetime.fromisoformat(deal_doc['updated_at'])
    if deal_doc.get('last_contact') and isinstance(deal_doc['last_contact'], str):
        deal_doc['last_contact'] = datetime.fromisoformat(deal_doc['last_contact'])
    
    return Deal(**deal_doc)

@api_router.put("/deals/{deal_id}", response_model=Deal)
async def update_deal(deal_id: str, deal_update: DealUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in deal_update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.deals.update_one({"id": deal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    deal_doc = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if isinstance(deal_doc.get('created_at'), str):
        deal_doc['created_at'] = datetime.fromisoformat(deal_doc['created_at'])
    if isinstance(deal_doc.get('updated_at'), str):
        deal_doc['updated_at'] = datetime.fromisoformat(deal_doc['updated_at'])
    if deal_doc.get('last_contact') and isinstance(deal_doc['last_contact'], str):
        deal_doc['last_contact'] = datetime.fromisoformat(deal_doc['last_contact'])
    
    return Deal(**deal_doc)

@api_router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: str, current_user: User = Depends(get_current_user)):
    result = await db.deals.delete_one({"id": deal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted successfully"}

@api_router.post("/deals/{deal_id}/upload-image")
async def upload_deal_image(deal_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    deal_doc = await db.deals.find_one({"id": deal_id})
    if not deal_doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    file_content = await file.read()
    file_path = f"deals/{deal_id}/{uuid.uuid4()}_{file.filename}"
    
    try:
        result = supabase.storage.from_("property-images").upload(file_path, file_content, {"content-type": file.content_type})
        public_url = supabase.storage.from_("property-images").get_public_url(file_path)
        
        await db.deals.update_one(
            {"id": deal_id},
            {"$set": {"primary_image_url": public_url}}
        )
        
        return {"url": public_url, "message": "Image uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.post("/deals/{deal_id}/upload-document")
async def upload_deal_document(deal_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    deal_doc = await db.deals.find_one({"id": deal_id})
    if not deal_doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    file_content = await file.read()
    file_path = f"deals/{deal_id}/documents/{uuid.uuid4()}_{file.filename}"
    
    try:
        result = supabase.storage.from_("deal-documents").upload(file_path, file_content, {"content-type": file.content_type})
        
        res = supabase.storage.from_("deal-documents").create_signed_url(file_path, 31536000)  # 1 year
        signed_url = res.get('signedURL') or res.get('signedUrl')
        
        document = {"name": file.filename, "url": signed_url, "path": file_path}
        
        await db.deals.update_one(
            {"id": deal_id},
            {"$push": {"documents": document}}
        )
        
        return {"document": document, "message": "Document uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.put("/deals/{deal_id}/stage")
async def update_deal_stage(deal_id: str, stage_update: StageUpdate, current_user: User = Depends(get_current_user)):
    result = await db.deals.update_one(
        {"id": deal_id},
        {"$set": {"stage": stage_update.stage, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Stage updated successfully"}

# Contact endpoints
@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact_data: ContactCreate, current_user: User = Depends(get_current_user)):
    contact = Contact(**contact_data.model_dump())
    
    contact_dict = contact.model_dump()
    contact_dict['created_at'] = contact_dict['created_at'].isoformat()
    
    await db.contacts.insert_one(contact_dict)
    return contact

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(current_user: User = Depends(get_current_user)):
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(1000)
    
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    
    return contacts

@api_router.get("/contacts/{contact_id}", response_model=Contact)
async def get_contact(contact_id: str, current_user: User = Depends(get_current_user)):
    contact_doc = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact_doc:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    if isinstance(contact_doc.get('created_at'), str):
        contact_doc['created_at'] = datetime.fromisoformat(contact_doc['created_at'])
    
    return Contact(**contact_doc)

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, contact_update: ContactCreate, current_user: User = Depends(get_current_user)):
    update_data = contact_update.model_dump()
    
    result = await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact_doc = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if isinstance(contact_doc.get('created_at'), str):
        contact_doc['created_at'] = datetime.fromisoformat(contact_doc['created_at'])
    
    return Contact(**contact_doc)

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: User = Depends(get_current_user)):
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

# Dashboard endpoints
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    
    total_pipeline_value = sum(deal.get('asking_price', 0) for deal in deals)
    total_deals = len(deals)
    avg_deal_size = total_pipeline_value / total_deals if total_deals > 0 else 0
    
    asset_type_distribution = {}
    for deal in deals:
        asset_type = deal.get('asset_type', 'Unknown')
        asset_type_distribution[asset_type] = asset_type_distribution.get(asset_type, 0) + 1
    
    stage_counts = {}
    for deal in deals:
        stage = deal.get('stage', 'New')
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
    
    return {
        "total_pipeline_value": total_pipeline_value,
        "total_deals": total_deals,
        "avg_deal_size": avg_deal_size,
        "asset_type_distribution": asset_type_distribution,
        "stage_counts": stage_counts
    }

# Team endpoints
@api_router.post("/team/invite")
async def invite_team_member(invite_data: TeamInvite, current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Not authorized to invite team members")
    
    existing_user = await db.users.find_one({"email": invite_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create a temporary password - in production, send email with password reset link
    temp_password = f"temp_{uuid.uuid4().hex[:8]}"
    hashed_password = get_password_hash(temp_password)
    
    user = User(
        email=invite_data.email,
        full_name=invite_data.email.split('@')[0],
        role=invite_data.role
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['hashed_password'] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    return {
        "message": "Team member invited successfully",
        "email": invite_data.email,
        "temp_password": temp_password,
        "note": "In production, send this password via email"
    }

@api_router.get("/team", response_model=List[User])
async def get_team_members(current_user: User = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return [User(**user) for user in users]

# Public share endpoint (no auth required)
@api_router.get("/share/{deal_id}")
async def get_public_deal(deal_id: str):
    """Public endpoint for sharing deals - no authentication required"""
    try:
        # Query Supabase for the deal (public access)
        response = supabase.table('deals').select('*').eq('id', deal_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        deal = response.data
        
        # Return only public-safe fields
        return {
            "id": deal.get('id'),
            "title": deal.get('title'),
            "address": deal.get('address'),
            "city": deal.get('city'),
            "state": deal.get('state'),
            "zip_code": deal.get('zip_code'),
            "asset_type": deal.get('asset_type'),
            "description": deal.get('description'),
            "price": deal.get('price'),
            "size": deal.get('size'),
            "lot_size": deal.get('lot_size'),
            "year_built": deal.get('year_built'),
            "zoning": deal.get('zoning'),
            "occupancy": deal.get('occupancy'),
            "parking_spaces": deal.get('parking_spaces'),
            "key_features": deal.get('key_features'),
            "cap_rate": deal.get('cap_rate'),
            "noi": deal.get('noi'),
            "image_url": deal.get('image_url'),
            "latitude": deal.get('latitude'),
            "longitude": deal.get('longitude'),
            "created_at": deal.get('created_at'),
            "updated_at": deal.get('updated_at')
        }
    except Exception as e:
        logger.error(f"Error fetching public deal: {str(e)}")
        raise HTTPException(status_code=404, detail="Deal not found")



# Regrid API Proxy Endpoints
import httpx

REGRID_API_TOKEN = os.environ.get('REGRID_API_TOKEN')
REGRID_BASE_URL = "https://app.regrid.com/api/v1"

@api_router.get("/parcels/tiles/{z}/{x}/{y}.geojson")
async def get_parcel_tiles(z: int, x: int, y: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Proxy Regrid parcel tile endpoint - Returns GeoJSON tiles"""
    verify_token(credentials.credentials)
    
    if not REGRID_API_TOKEN:
        raise HTTPException(status_code=500, detail="Regrid API token not configured")
    
    # Regrid tiles endpoint - use parcels/{z}/{x}/{y}.geojson format
    url = f"https://tiles.regrid.com/parcels/{z}/{x}/{y}.geojson"
    headers = {"Authorization": f"Bearer {REGRID_API_TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Regrid tiles error: {str(e)}")

@api_router.get("/parcels/search")
async def search_parcels(
    lat: float,
    lon: float,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Search for parcel at specific lat/lon"""
    verify_token(credentials.credentials)
    
    if not REGRID_API_TOKEN:
        raise HTTPException(status_code=500, detail="Regrid API token not configured")
    
    url = f"{REGRID_BASE_URL}/parcels.geojson"
    headers = {"Authorization": f"Bearer {REGRID_API_TOKEN}"}
    params = {"lat": lat, "lon": lon, "limit": 1}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Regrid API error: {str(e)}")

@api_router.get("/parcels/{parcel_id}")
async def get_parcel_details(
    parcel_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get detailed parcel information"""
    verify_token(credentials.credentials)
    
    if not REGRID_API_TOKEN:
        raise HTTPException(status_code=500, detail="Regrid API token not configured")
    
    url = f"{REGRID_BASE_URL}/parcels/{parcel_id}.json"
    headers = {"Authorization": f"Bearer {REGRID_API_TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Regrid API error: {str(e)}")



# ========== Layer Management System ==========

# Simple in-memory cache with LRU eviction
class LayerCache:
    def __init__(self, max_size=MAX_CACHE_SIZE):
        self.cache = OrderedDict()
        self.max_size = max_size
        self.timestamps = {}
    
    def get(self, key: str):
        if key not in self.cache:
            return None
        
        # Check if expired
        if key in self.timestamps:
            if datetime.now(timezone.utc) > self.timestamps[key]:
                del self.cache[key]
                del self.timestamps[key]
                return None
        
        # Move to end (most recently used)
        self.cache.move_to_end(key)
        return self.cache[key]
    
    def set(self, key: str, value: Any, ttl: int = CACHE_TTL):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        self.timestamps[key] = datetime.now(timezone.utc) + timedelta(seconds=ttl)
        
        # Evict oldest if over max size
        while len(self.cache) > self.max_size:
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
            if oldest_key in self.timestamps:
                del self.timestamps[oldest_key]

# Simple rate limiter
class RateLimiter:
    def __init__(self):
        self.requests = {}
    
    def check_rate_limit(self, client_id: str) -> bool:
        now = datetime.now(timezone.utc)
        
        if client_id not in self.requests:
            self.requests[client_id] = []
        
        # Remove old requests outside the window
        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if now - req_time < timedelta(seconds=RATE_LIMIT_WINDOW)
        ]
        
        # Check if under limit
        if len(self.requests[client_id]) >= RATE_LIMIT_REQUESTS:
            return False
        
        # Add current request
        self.requests[client_id].append(now)
        return True

# Initialize cache and rate limiter
layer_cache = LayerCache()
rate_limiter = RateLimiter()

@api_router.get("/layers/registry")
async def get_layer_registry(current_user: User = Depends(get_current_user)):
    """Get the complete layer registry with metadata"""
    # Return registry without internal fields
    registry = {}
    for layer_id, layer_config in LAYER_REGISTRY.items():
        registry[layer_id] = {
            "id": layer_config["id"],
            "name": layer_config["name"],
            "description": layer_config["description"],
            "category": layer_config["category"],
            "style": layer_config["style"],
            "clickFields": layer_config.get("clickFields", [])
        }
    
    return {"layers": registry}

@api_router.get("/layers/{layer_id}/query")
async def query_layer(
    layer_id: str,
    bbox: Optional[str] = None,
    where: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Query a layer from its source with caching and rate limiting
    
    Args:
        layer_id: Layer identifier from registry
        bbox: Bounding box as "minx,miny,maxx,maxy"
        where: SQL where clause for filtering
    """
    user_id = current_user.email
    
    # Rate limiting
    if not rate_limiter.check_rate_limit(user_id):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds."
        )
    
    # Check if layer exists
    if layer_id not in LAYER_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Layer '{layer_id}' not found")
    
    layer_config = LAYER_REGISTRY[layer_id]
    
    # Create cache key
    cache_key = f"{layer_id}:{bbox}:{where}"
    
    # Check cache
    cached_data = layer_cache.get(cache_key)
    if cached_data:
        logger.info(f"Cache hit for layer {layer_id}")
        return cached_data
    
    # Fetch from source
    try:
        source_url = layer_config["source"]["url"]
        
        # Build query parameters for ArcGIS REST API
        params = {
            "where": where or "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "f": "geojson",
        }
        
        # Add result limit if specified in layer config
        max_records = layer_config.get("maxRecordCount", 2000)
        params["resultRecordCount"] = max_records
        
        if bbox:
            # Parse bbox
            try:
                minx, miny, maxx, maxy = map(float, bbox.split(','))
                params["geometry"] = f"{minx},{miny},{maxx},{maxy}"
                params["geometryType"] = "esriGeometryEnvelope"
                params["spatialRel"] = "esriSpatialRelIntersects"
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid bbox format. Use 'minx,miny,maxx,maxy'")
        
        # Make request to ArcGIS endpoint
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{source_url}/query", params=params)
            response.raise_for_status()
            data = response.json()
        
        # Cache the result
        layer_cache.set(cache_key, data)
        
        logger.info(f"Fetched and cached layer {layer_id}")
        return data
        
    except httpx.HTTPError as e:
        logger.error(f"Error fetching layer {layer_id}: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Error fetching data from source: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error for layer {layer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@api_router.get("/layers/{layer_id}/identify")
async def identify_feature(
    layer_id: str,
    lat: float,
    lon: float,
    tolerance: float = 0.001,
    current_user: User = Depends(get_current_user)
):
    """
    Identify features at a specific point
    
    Args:
        layer_id: Layer identifier
        lat: Latitude
        lon: Longitude
        tolerance: Search tolerance in degrees (default 0.001 ~= 100m)
    """
    # Check if layer exists
    if layer_id not in LAYER_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Layer '{layer_id}' not found")
    
    layer_config = LAYER_REGISTRY[layer_id]
    
    try:
        source_url = layer_config["source"]["url"]
        
        # Build identify query
        # Create a small bounding box around the point
        bbox = f"{lon - tolerance},{lat - tolerance},{lon + tolerance},{lat + tolerance}"
        
        # Use bounding box approach for more reliable identification
        bbox = f"{lon - tolerance},{lat - tolerance},{lon + tolerance},{lat + tolerance}"
        
        params = {
            "where": "1=1",
            "geometry": bbox,
            "geometryType": "esriGeometryEnvelope",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": ",".join(layer_config.get("clickFields", ["*"])),
            "returnGeometry": "true",
            "f": "json"
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{source_url}/query", params=params)
            response.raise_for_status()
            data = response.json()
        
        # Return only the features
        features = data.get("features", [])
        
        return {
            "layer_id": layer_id,
            "layer_name": layer_config["name"],
            "features": features,
            "count": len(features)
        }
        
    except httpx.HTTPError as e:
        logger.error(f"Error identifying features for layer {layer_id}: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Error identifying features: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error for layer identify {layer_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# Perplexity AI Chat Models
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

# Import Perplexity service
from perplexity_service import perplexity_service

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest, current_user = Depends(get_current_user_supabase)):
    """
    Chat endpoint for commercial real estate market research.
    Uses Perplexity AI to provide cited, web-grounded answers.
    """
    try:
        # Convert message models to dicts for API
        message_dicts = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Query Perplexity
        result = perplexity_service.search_real_estate(request.query, message_dicts)
        
        if not result["success"]:
            logger.error(f"Perplexity query failed: {result.get('error')}")
            return ChatResponse(
                content="I'm having trouble accessing market data right now. Please try again in a moment.",
                citations=[],
                related_questions=[]
            )
        
        # Format citations
        citations = [
            Citation(url=c["url"], title=c["title"])
            for c in result.get("citations", [])
        ]
        
        return ChatResponse(
            content=result["content"],
            citations=citations,
            related_questions=result.get("related_questions", [])
        )
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error processing your research query. Please try again."
        )



@api_router.get("/dashboard/news")
async def get_market_news(current_user = Depends(get_current_user_supabase)):
    """
    Fetch latest commercial real estate market news from RSS feeds.
    Caches results for 1 hour to minimize requests.
    """
    try:
        # Check cache first
        current_time = time.time()
        if news_cache['articles'] and (current_time - news_cache['last_updated']) < news_cache['cache_duration']:
            logger.info("Returning cached news articles")
            return {"articles": news_cache['articles'], "count": len(news_cache['articles']), "cached": True}
        
        logger.info("Fetching fresh news from RSS feeds")
        
        # Define CRE RSS feeds
        rss_feeds = [
            {
                'url': 'https://commercialobserver.com/feed/',
                'source': 'Commercial Observer'
            },
            {
                'url': 'https://www.bisnow.com/feed',
                'source': 'Bisnow'
            },
            {
                'url': 'https://www.globest.com/feed/',
                'source': 'GlobeSt'
            },
            {
                'url': 'https://www.cpexecutive.com/feed/',
                'source': 'CPExecutive'
            }
        ]
        
        articles = []
        
        # Fetch from each feed
        for feed_info in rss_feeds:
            try:
                feed = feedparser.parse(feed_info['url'])
                
                # Get top 3 articles from each source
                for entry in feed.entries[:3]:
                    # Calculate time ago
                    published_time = entry.get('published_parsed') or entry.get('updated_parsed')
                    if published_time:
                        pub_datetime = datetime(*published_time[:6])
                        time_diff = datetime.now() - pub_datetime
                        
                        if time_diff.days > 0:
                            time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
                        elif time_diff.seconds >= 3600:
                            hours = time_diff.seconds // 3600
                            time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
                        else:
                            minutes = time_diff.seconds // 60
                            time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
                    else:
                        time_ago = "Recently"
                    
                    # Get description (try summary, then content)
                    description = entry.get('summary', '')
                    if not description and 'content' in entry:
                        description = entry.content[0].get('value', '')
                    
                    # Clean HTML tags from description
                    import re
                    description = re.sub(r'<[^>]+>', '', description)
                    description = description[:200] + '...' if len(description) > 200 else description
                    
                    articles.append({
                        'title': entry.get('title', 'Untitled'),
                        'description': description,
                        'source': feed_info['source'],
                        'url': entry.get('link', ''),
                        'publishedAt': time_ago
                    })
                    
            except Exception as feed_error:
                logger.warning(f"Error parsing feed {feed_info['source']}: {str(feed_error)}")
                continue
        
        # Sort by most recent and limit to 8 articles
        articles = articles[:8]
        
        # Update cache
        news_cache['articles'] = articles
        news_cache['last_updated'] = current_time
        
        logger.info(f"Successfully fetched {len(articles)} news articles")
        return {"articles": articles, "count": len(articles), "cached": False}
        
    except Exception as e:
        logger.error(f"News endpoint error: {str(e)}")
        # Return placeholder on error
        return {
            "articles": [{
                "title": "Commercial Real Estate News",
                "description": "Stay updated with the latest market trends and investment opportunities.",
                "source": "CRE Updates",
                "url": "#",
                "publishedAt": "Recently"
            }],
            "count": 1,
            "error": True
        }
    except Exception as e:
        logger.error(f"News endpoint error: {str(e)}")
        return {"articles": [], "count": 0}



app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()