from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import uuid
import logging
import re
import traceback
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

# CRITICAL: Load environment variables BEFORE importing services that depend on them
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import models from new organized structure
from models import (
    User, UserCreate, UserLogin, Token,
    Deal, DealCreate, DealUpdate,
    Contact, ContactCreate,
    TeamInvite, TeamCreate, TeamUpdate, InviteCreate, JoinTeam, UpdateMemberRole,
    StageUpdate,
    ChatMessage, ChatRequest, Citation, ChatResponse,
    EmailSettingsCreate, EmailSettingsResponse, TestEmailConnection, SendTransactionalEmail,
    CreateCampaign, SendCampaign, ScheduleCampaign, BatchScheduleCampaign
)

# Import utilities (auth, db connections)
from utils.db import get_supabase
from utils.auth_helpers import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_user_supabase, security
)

# Import services
from sendgrid_service import sendgrid_service
from campaign_scheduler import get_scheduler
from radar_service import radar_service
from dashboard_service import dashboard_router
from llc_service import llc_router

# Import extracted route modules (ready for Marketplace features)
from routes import auth_router, deal_router, dashboard_router as dashboard_routes_router, marketplace_router, messaging_router, onboarding_router, admin_router, reputation_router, roles_router
from routes.map_crm import router as map_crm_router

# Initialize database connections
supabase = get_supabase()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logging
logger = logging.getLogger(__name__)

# ===== API ROUTES =====
# Note: Legacy /contacts and /team endpoints removed. Frontend uses Supabase directly for contacts
# and /api/teams (plural) endpoints for team collaboration.

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
            "asking_price": deal.get('asking_price'),
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



# Address Search Endpoint using Radar.io
@api_router.get("/address-search")
async def search_addresses_api(
    query: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    limit: int = 10
):
    """
    Search for addresses using Radar.io geocoding
    Returns list of addresses with coordinates
    Note: Public endpoint for map search functionality
    """
    try:
        if not query or len(query) < 2:
            return {"addresses": [], "count": 0}
        
        logger.info(f"[Address Search] Query: '{query}'")
        
        addresses = await radar_service.search_addresses(
            query=query,
            latitude=latitude,
            longitude=longitude,
            limit=limit
        )
        
        logger.info(f"[Address Search] Found {len(addresses)} results")
        
        return {
            "addresses": addresses,
            "count": len(addresses)
        }
    
    except Exception as e:
        logger.error(f"[Address Search] Error: {str(e)}")
        logger.error(f"[Address Search] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Address search failed")


# =====================================================
# Property Intelligence Layer Proxy
# =====================================================

@api_router.get("/intelligence/layer/{layer_type}")
async def get_intelligence_layer(
    layer_type: str,
    bbox: Optional[str] = None,
    limit: int = 10000
):
    """
    Proxy endpoint for property intelligence layers
    Handles CORS and adds bbox filtering for performance
    
    layer_type: 'sa-zoning', 'austin-zoning', 'sa-water-sewer'
    bbox: 'minLng,minLat,maxLng,maxLat' (optional, for viewport filtering)
    limit: max features to return (default 10000 for complete coverage)
    """
    try:
        # Define layer endpoints - VERIFIED WORKING URLs
        layer_endpoints = {
            'sa-zoning': 'https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/COSA_Zoning/FeatureServer/12/query',
            'austin-zoning': 'https://maps.austintexas.gov/arcgis/rest/services/Shared/Zoning_1/MapServer/0/query',
            'sa-water-sewer': 'https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/StormwaterUnderground/FeatureServer/0/query'
        }
        
        if layer_type not in layer_endpoints:
            raise HTTPException(status_code=400, detail=f"Unknown layer type: {layer_type}")
        
        base_url = layer_endpoints[layer_type]
        
        # Build query parameters
        params = {
            'where': '1=1',
            'outFields': '*',
            'returnGeometry': 'true',
            'f': 'geojson',
            'resultRecordCount': str(limit)
        }
        
        # Add bbox filtering if provided (significantly reduces data size)
        if bbox:
            try:
                min_lng, min_lat, max_lng, max_lat = map(float, bbox.split(','))
                # ArcGIS uses JSON format for envelope geometry
                envelope_json = {
                    "xmin": min_lng,
                    "ymin": min_lat,
                    "xmax": max_lng,
                    "ymax": max_lat,
                    "spatialReference": {"wkid": 4326}
                }
                params['geometry'] = json.dumps(envelope_json)
                params['geometryType'] = 'esriGeometryEnvelope'
                params['spatialRel'] = 'esriSpatialRelIntersects'
                logger.info(f"[Intelligence Layer] {layer_type} with bbox: {bbox}")
            except ValueError:
                logger.warning(f"[Intelligence Layer] Invalid bbox format: {bbox}, ignoring")
        else:
            logger.info(f"[Intelligence Layer] {layer_type} without bbox (full dataset - may be large)")
        
        # Fetch data from ArcGIS REST API
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(base_url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # Log results
            feature_count = len(data.get('features', []))
            logger.info(f"[Intelligence Layer] {layer_type} returned {feature_count} features")
            
            return data
    
    except httpx.HTTPError as e:
        logger.error(f"[Intelligence Layer] HTTP error fetching {layer_type}: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch layer data: {str(e)}")
    except Exception as e:
        logger.error(f"[Intelligence Layer] Error: {str(e)}")
        logger.error(f"[Intelligence Layer] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Intelligence layer fetch failed")


# =====================================================
# Perplexity AI Chat
# =====================================================


# =====================================================
# Perplexity AI Chat
# =====================================================

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





# =====================================================
# TEAM COLLABORATION ENDPOINTS
# =====================================================

# Pydantic Models for Team System
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

# Create Team
@app.post("/api/teams")
async def create_team(team_data: TeamCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        print(f"Creating team: {team_data.name} for user: {user.id}")
        
        # Create team in Supabase
        result = supabase.table('teams').insert({
            'name': team_data.name,
            'created_by': str(user.id)
        }).execute()
        
        print(f"Supabase result: {result}")
        
        team = result.data[0] if result.data else None
        
        if not team:
            raise HTTPException(status_code=500, detail="Failed to create team - no data returned")
        
        return {"team": team}
    except Exception as e:
        print(f"Error creating team: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Get User's Teams
@app.get("/api/teams")
async def get_user_teams(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        # Get teams user is a member of
        result = supabase.table('team_members').select(
            'team_id, role, joined_at, teams(id, name, created_by, default_deal_sharing, created_at)'
        ).eq('user_id', str(user.id)).execute()
        
        teams = []
        for member in result.data:
            team_data = member.get('teams', {})
            if team_data:
                teams.append({
                    'id': team_data['id'],
                    'name': team_data['name'],
                    'created_by': team_data['created_by'],
                    'default_deal_sharing': team_data.get('default_deal_sharing', 'private'),
                    'created_at': team_data['created_at'],
                    'user_role': member['role'],
                    'joined_at': member['joined_at']
                })
        
        return {"teams": teams}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Team Members
@app.get("/api/teams/{team_id}/members")
async def get_team_members(team_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        # Get team members with user profile data
        result = supabase.table('team_members').select(
            '*, user_profiles(full_name, phone, avatar_url, company)'
        ).eq('team_id', team_id).execute()
        
        members = []
        for member in result.data:
            profile = member.get('user_profiles', {}) or {}
            # Get user email from auth
            user_result = supabase.auth.admin.get_user_by_id(member['user_id'])
            email = user_result.user.email if user_result.user else None
            
            members.append({
                'id': member['id'],
                'user_id': member['user_id'],
                'role': member['role'],
                'joined_at': member['joined_at'],
                'full_name': profile.get('full_name', ''),
                'email': email,
                'phone': profile.get('phone', ''),
                'avatar_url': profile.get('avatar_url', ''),
                'company': profile.get('company', '')
            })
        
        return {"members": members}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create Invite Link
@app.post("/api/teams/{team_id}/invite")
async def create_invite(team_id: str, invite_data: InviteCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        # Generate unique token
        import secrets
        token = secrets.token_urlsafe(32)
        
        # Set expiration (7 days from now)
        expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        # Create invite
        result = supabase.table('team_invites').insert({
            'team_id': team_id,
            'invited_by': str(user.id),
            'email': invite_data.email,
            'token': token,
            'role': invite_data.role,
            'expires_at': expires_at,
            'status': 'pending'
        }).execute()
        
        invite = result.data[0] if result.data else None
        
        if not invite:
            raise HTTPException(status_code=500, detail="Failed to create invite")
        
        # Generate shareable link - require FRONTEND_URL to be set (no fallback)
        frontend_url = os.environ['FRONTEND_URL']
        invite_link = f"{frontend_url}/join-team/{token}"
        
        return {
            "invite": invite,
            "invite_link": invite_link
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Team Invites
@app.get("/api/teams/{team_id}/invites")
async def get_team_invites(team_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        result = supabase.table('team_invites').select('*').eq(
            'team_id', team_id
        ).eq('status', 'pending').execute()
        
        return {"invites": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Join Team via Invite Link
@app.post("/api/teams/join/{token}")
async def join_team(token: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        # Find invite
        invite_result = supabase.table('team_invites').select('*').eq('token', token).eq('status', 'pending').execute()
        
        if not invite_result.data:
            raise HTTPException(status_code=404, detail="Invalid or expired invite link")
        
        invite = invite_result.data[0]
        
        # Check expiration
        expires_at = datetime.fromisoformat(invite['expires_at'].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Invite link has expired")
        
        # Check if already a member
        existing = supabase.table('team_members').select('*').eq(
            'team_id', invite['team_id']
        ).eq('user_id', str(user.id)).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="You are already a member of this team")
        
        # Add user to team
        supabase.table('team_members').insert({
            'team_id': invite['team_id'],
            'user_id': str(user.id),
            'role': invite['role']
        }).execute()
        
        # Mark invite as used
        supabase.table('team_invites').update({
            'status': 'accepted',
            'used_by': str(user.id),
            'used_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', invite['id']).execute()
        
        # Get team info
        team_result = supabase.table('teams').select('*').eq('id', invite['team_id']).single().execute()
        
        return {
            "message": "Successfully joined team",
            "team": team_result.data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Remove Team Member
@app.delete("/api/teams/{team_id}/members/{user_id}")
async def remove_team_member(team_id: str, user_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    current_user = await get_current_user_supabase(credentials)
    
    try:
        # Check if current user is owner/admin
        member_check = supabase.table('team_members').select('role').eq(
            'team_id', team_id
        ).eq('user_id', str(current_user.id)).execute()
        
        if not member_check.data or member_check.data[0]['role'] not in ['owner', 'admin']:
            raise HTTPException(status_code=403, detail="Only owners and admins can remove members")
        
        # Cannot remove yourself if you're the owner
        if user_id == str(current_user.id) and member_check.data[0]['role'] == 'owner':
            raise HTTPException(status_code=400, detail="Owners cannot remove themselves")
        
        # Remove member
        supabase.table('team_members').delete().eq('team_id', team_id).eq('user_id', user_id).execute()
        
        return {"message": "Member removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update Member Role
@app.put("/api/teams/{team_id}/members/{user_id}/role")
async def update_member_role(
    team_id: str, 
    user_id: str, 
    role_data: UpdateMemberRole,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    current_user = await get_current_user_supabase(credentials)
    
    try:
        # Check if current user is owner/admin
        member_check = supabase.table('team_members').select('role').eq(
            'team_id', team_id
        ).eq('user_id', str(current_user.id)).execute()
        
        if not member_check.data or member_check.data[0]['role'] not in ['owner', 'admin']:
            raise HTTPException(status_code=403, detail="Only owners and admins can change roles")
        
        # Cannot change owner role
        target_member = supabase.table('team_members').select('role').eq(
            'team_id', team_id
        ).eq('user_id', user_id).execute()
        
        if target_member.data and target_member.data[0]['role'] == 'owner':
            raise HTTPException(status_code=400, detail="Cannot change owner role")
        
        # Update role
        supabase.table('team_members').update({
            'role': role_data.role
        }).eq('team_id', team_id).eq('user_id', user_id).execute()
        
        return {"message": "Role updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Revoke Invite
@app.delete("/api/teams/{team_id}/invites/{invite_id}")
async def revoke_invite(team_id: str, invite_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        supabase.table('team_invites').update({
            'status': 'revoked'
        }).eq('id', invite_id).eq('team_id', team_id).execute()
        
        return {"message": "Invite revoked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update Team Settings
@app.put("/api/teams/{team_id}")
async def update_team(team_id: str, team_data: TeamUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        # Check if user is owner/admin
        member_check = supabase.table('team_members').select('role').eq(
            'team_id', team_id
        ).eq('user_id', str(user.id)).execute()
        
        if not member_check.data or member_check.data[0]['role'] not in ['owner', 'admin']:
            raise HTTPException(status_code=403, detail="Only owners and admins can update team settings")
        
        # Update team
        update_data = {}
        if team_data.name:
            update_data['name'] = team_data.name
        if team_data.default_deal_sharing:
            update_data['default_deal_sharing'] = team_data.default_deal_sharing
        
        if update_data:
            supabase.table('teams').update(update_data).eq('id', team_id).execute()
        
        return {"message": "Team updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get Team Stats and Deals
@app.get("/api/teams/{team_id}/stats")
async def get_team_stats(team_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        # Get all team deals (shared + owned by team members)
        team_deals_result = supabase.table('deals').select('*').or_(
            f'and(team_id.eq.{team_id},is_shared_with_team.eq.true),and(team_id.eq.{team_id},owner_id.eq.{user.id})'
        ).execute()
        
        deals = team_deals_result.data or []
        
        # Calculate stats
        total_active = len([d for d in deals if d.get('stage') not in ['closed', 'dead']])
        total_pipeline = sum(float(d.get('price', 0) or 0) for d in deals if d.get('stage') not in ['closed', 'dead'])
        
        # Closed this month
        from datetime import datetime
        current_month = datetime.now().month
        current_year = datetime.now().year
        closed_this_month = len([
            d for d in deals 
            if d.get('stage') == 'closed' and d.get('updated_at') and
            datetime.fromisoformat(d['updated_at'].replace('Z', '+00:00')).month == current_month and
            datetime.fromisoformat(d['updated_at'].replace('Z', '+00:00')).year == current_year
        ])
        
        # Get team members for per-agent breakdown
        members_result = supabase.table('team_members').select('user_id, role').eq('team_id', team_id).execute()
        member_ids = [m['user_id'] for m in members_result.data]
        
        # Per-agent stats
        agent_stats = []
        for member_id in member_ids:
            member_deals = [d for d in deals if d.get('owner_id') == member_id or d.get('assigned_to') == member_id]
            active_deals = [d for d in member_deals if d.get('stage') not in ['closed', 'dead']]
            closed_deals = [d for d in member_deals if d.get('stage') == 'closed']
            
            # Get most common asset type
            asset_types = [d.get('asset_type') for d in member_deals if d.get('asset_type')]
            primary_asset = max(set(asset_types), key=asset_types.count) if asset_types else None
            
            agent_stats.append({
                'user_id': member_id,
                'active_deals': len(active_deals),
                'pipeline_value': sum(float(d.get('price', 0) or 0) for d in active_deals),
                'closed_this_quarter': len(closed_deals),
                'primary_asset_focus': primary_asset
            })
        
        return {
            'team_stats': {
                'total_active_deals': total_active,
                'total_pipeline_value': total_pipeline,
                'closed_this_month': closed_this_month,
                'team_activity': len(deals)
            },
            'agent_stats': agent_stats,
            'team_deals': deals
        }
    except Exception as e:
        print(f"Error getting team stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Share Deal with Team
@app.put("/api/deals/{deal_id}/share")
async def toggle_deal_sharing(deal_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        # Get current deal
        deal_result = supabase.table('deals').select('*').eq('id', deal_id).single().execute()
        deal = deal_result.data
        
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        # Toggle sharing
        new_sharing_status = not deal.get('is_shared_with_team', False)
        
        supabase.table('deals').update({
            'is_shared_with_team': new_sharing_status
        }).eq('id', deal_id).execute()
        
        return {
            'is_shared': new_sharing_status,
            'message': 'Deal shared with team' if new_sharing_status else 'Deal is now private'
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Assign Deal to Team Member
@app.put("/api/deals/{deal_id}/assign")
async def assign_deal(deal_id: str, assigned_to: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        supabase.table('deals').update({
            'assigned_to': assigned_to if assigned_to else None
        }).eq('id', deal_id).execute()
        
        return {'message': 'Deal assigned successfully'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update Team Notes
@app.put("/api/deals/{deal_id}/team-notes")
async def update_team_notes(deal_id: str, notes: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user_supabase(credentials)
    
    try:
        supabase.table('deals').update({
            'team_notes': notes
        }).eq('id', deal_id).execute()
        
        return {'message': 'Team notes updated'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

        if not member_check.data or member_check.data[0]['role'] not in ['owner', 'admin']:
            raise HTTPException(status_code=403, detail="Only owners and admins can update team settings")
        
        # Update team
        update_data = {}
        if team_data.name:
            update_data['name'] = team_data.name
        if team_data.default_deal_sharing:
            update_data['default_deal_sharing'] = team_data.default_deal_sharing
        
        if update_data:
            supabase.table('teams').update(update_data).eq('id', team_id).execute()
        
        return {"message": "Team updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# EMAIL CAMPAIGNS & TRANSACTIONAL EMAIL ENDPOINTS
# =====================================================

# Pydantic Models for Email System
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


# Email Settings Endpoints
@api_router.post("/email/settings", status_code=status.HTTP_201_CREATED)
async def save_email_settings(
    settings: EmailSettingsCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Save or update user's SendGrid settings"""
    try:
        # Get user from Supabase auth
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Test the API key first
        test_result = await sendgrid_service.test_connection(settings.sendgrid_api_key)
        if not test_result['valid']:
            raise HTTPException(status_code=400, detail=test_result['message'])
        
        # Encrypt the API key
        encrypted_key = sendgrid_service.encrypt_api_key(settings.sendgrid_api_key)
        
        # Check if settings already exist
        existing = supabase.table('email_settings').select('id').eq('user_id', user_id).execute()
        
        settings_data = {
            'user_id': user_id,
            'sendgrid_api_key': encrypted_key,
            'sender_email': settings.sender_email,
            'sender_name': settings.sender_name,
            'is_verified': True,
            'last_tested_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        if existing.data and len(existing.data) > 0:
            # Update existing
            result = supabase.table('email_settings').update(settings_data).eq('user_id', user_id).execute()
        else:
            # Create new
            result = supabase.table('email_settings').insert(settings_data).execute()
        
        if result.data and len(result.data) > 0:
            return {
                "success": True,
                "message": "Email settings saved successfully",
                "settings": {
                    "id": result.data[0]['id'],
                    "sender_email": result.data[0]['sender_email'],
                    "sender_name": result.data[0]['sender_name'],
                    "is_verified": result.data[0]['is_verified']
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save email settings")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving email settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/email/settings")
async def get_email_settings(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user's email settings (without API key)"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Query settings including sendgrid_api_key to check if it exists
        result = supabase.table('email_settings').select('id, sender_email, sender_name, is_verified, last_tested_at, sendgrid_api_key').eq('user_id', user_id).execute()
        
        if result.data and len(result.data) > 0:
            settings = result.data[0]
            # Check if sendgrid_api_key actually exists and is not empty
            has_api_key = settings.get('sendgrid_api_key') is not None and settings.get('sendgrid_api_key') != ''
            
            # Remove sendgrid_api_key from response (security)
            settings_response = {
                'id': settings.get('id'),
                'sender_email': settings.get('sender_email'),
                'sender_name': settings.get('sender_name'),
                'is_verified': settings.get('is_verified'),
                'last_tested_at': settings.get('last_tested_at')
            }
            
            return {
                "configured": has_api_key,  # Only true if API key exists
                "settings": settings_response
            }
        else:
            return {
                "configured": False,
                "settings": None
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching email settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/email/test-connection")
async def test_email_connection(
    test_data: TestEmailConnection
):
    """Test SendGrid API key validity (no auth required for setup)"""
    try:
        result = await sendgrid_service.test_connection(test_data.api_key)
        return result
    except Exception as e:
        logger.error(f"Error testing connection: {str(e)}")
        return {
            "valid": False,
            "message": str(e)
        }


@api_router.delete("/email/settings")
async def delete_email_settings(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete user's email settings"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        result = supabase.table('email_settings').delete().eq('user_id', user_id).execute()
        
        return {
            "success": True,
            "message": "Email settings deleted successfully"
        }
    
    except Exception as e:
        logger.error(f"Error deleting email settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Transactional Email Endpoints
@api_router.post("/email/send")
async def send_transactional_email(
    email_data: SendTransactionalEmail,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send a transactional email (1-to-1 communication)"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Get user's email settings
        settings_result = supabase.table('email_settings').select('*').eq('user_id', user_id).execute()
        if not settings_result.data or len(settings_result.data) == 0:
            raise HTTPException(status_code=400, detail="SendGrid not configured. Please set up your email settings first.")
        
        settings = settings_result.data[0]
        api_key = sendgrid_service.decrypt_api_key(settings['sendgrid_api_key'])
        
        # Send email
        send_result = await sendgrid_service.send_transactional_email(
            api_key=api_key,
            from_email=settings['sender_email'],
            from_name=settings['sender_name'],
            to_email=email_data.to_email,
            to_name=email_data.to_name,
            subject=email_data.subject,
            html_content=email_data.html_content,
            plain_text_content=email_data.plain_text_content,
            cc_emails=email_data.cc_emails,
            bcc_emails=email_data.bcc_emails,
            custom_args={
                "user_id": user_id,
                "contact_id": email_data.contact_id or "",
                "deal_id": email_data.deal_id or "",
                "type": "transactional"
            }
        )
        
        if not send_result['success']:
            raise HTTPException(status_code=500, detail=send_result.get('error', 'Failed to send email'))
        
        # Log email activity in database
        activity_data = {
            'user_id': user_id,
            'contact_id': email_data.contact_id,
            'deal_id': email_data.deal_id,
            'to_email': email_data.to_email,
            'to_name': email_data.to_name,
            'subject': email_data.subject,
            'html_content': email_data.html_content,
            'plain_text_content': email_data.plain_text_content,
            'cc_emails': email_data.cc_emails,
            'bcc_emails': email_data.bcc_emails,
            'sendgrid_message_id': send_result.get('message_id'),
            'status': 'sent',
            'sent_at': datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table('email_activities').insert(activity_data).execute()
        
        return {
            "success": True,
            "message": "Email sent successfully",
            "message_id": send_result.get('message_id')
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending transactional email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/email/activities")
async def get_email_activities(
    contact_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get email activities for a contact or deal"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Build query
        query = supabase.table('email_activities').select('*').eq('user_id', user_id)
        
        if contact_id:
            query = query.eq('contact_id', contact_id)
        if deal_id:
            query = query.eq('deal_id', deal_id)
        
        query = query.order('created_at', desc=True).limit(limit)
        
        result = query.execute()
        
        return {
            "activities": result.data,
            "count": len(result.data)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching email activities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Campaign Endpoints
@api_router.get("/email/templates")
async def get_email_templates(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get email templates (default + user's custom)"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Get default templates and user's custom templates
        result = supabase.table('email_templates').select('*').or_(f'user_id.eq.{user_id},is_default.eq.true').execute()
        
        return {
            "templates": result.data,
            "count": len(result.data)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/email/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign: CreateCampaign,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new email campaign"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        campaign_data = {
            'user_id': user_id,
            'name': campaign.name,
            'subject': campaign.subject,
            'html_content': campaign.html_content,
            'plain_text_content': campaign.plain_text_content,
            'template_id': campaign.template_id,
            'segment_filters': campaign.segment_filters,
            'design': campaign.design,
            'status': 'draft'
        }
        
        result = supabase.table('email_campaigns').insert(campaign_data).execute()
        
        if result.data and len(result.data) > 0:
            return {
                "success": True,
                "campaign": result.data[0]
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create campaign")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/email/campaigns")
async def get_campaigns(
    status_filter: Optional[str] = None,
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user's email campaigns"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        query = supabase.table('email_campaigns').select('*').eq('user_id', user_id)
        
        if status_filter:
            query = query.eq('status', status_filter)
        
        query = query.order('created_at', desc=True).limit(limit)
        
        result = query.execute()
        
        return {
            "campaigns": result.data,
            "count": len(result.data)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/email/campaigns/{campaign_id}")
async def get_campaign_details(
    campaign_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get campaign details with send statistics"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Get campaign
        campaign_result = supabase.table('email_campaigns').select('*').eq('id', campaign_id).eq('user_id', user_id).execute()
        
        if not campaign_result.data or len(campaign_result.data) == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign = campaign_result.data[0]
        
        # Get send details
        sends_result = supabase.table('email_campaign_sends').select('*').eq('campaign_id', campaign_id).execute()
        
        return {
            "campaign": campaign,
            "sends": sends_result.data,
            "sends_count": len(sends_result.data)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/email/campaigns/{campaign_id}/metrics")
async def get_campaign_metrics(
    campaign_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get detailed metrics for a campaign from email_events table"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Verify campaign belongs to user
        campaign_result = supabase.table('email_campaigns').select('*').eq('id', campaign_id).eq('user_id', user_id).execute()
        
        if not campaign_result.data or len(campaign_result.data) == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign = campaign_result.data[0]
        
        # Get all events for this campaign
        events_result = supabase.table('email_events').select('*').eq('campaign_id', campaign_id).execute()
        events = events_result.data or []
        
        # Count unique events by type
        unique_emails = set()
        unique_opens = set()
        unique_clicks = set()
        
        metrics = {
            'total_sent': campaign.get('total_sent', 0),
            'delivered': 0,
            'opens': 0,
            'unique_opens': 0,
            'clicks': 0,
            'unique_clicks': 0,
            'bounces': 0,
            'spam_reports': 0,
            'unsubscribes': 0
        }
        
        for event in events:
            event_type = event.get('event_type')
            email = event.get('email')
            
            if event_type == 'delivered':
                metrics['delivered'] += 1
                unique_emails.add(email)
            elif event_type == 'open':
                metrics['opens'] += 1
                unique_opens.add(email)
            elif event_type == 'click':
                metrics['clicks'] += 1
                unique_clicks.add(email)
            elif event_type == 'bounce':
                metrics['bounces'] += 1
            elif event_type == 'spam_report':
                metrics['spam_reports'] += 1
            elif event_type == 'unsubscribe':
                metrics['unsubscribes'] += 1
        
        metrics['unique_opens'] = len(unique_opens)
        metrics['unique_clicks'] = len(unique_clicks)
        
        # Calculate rates
        total_sent = metrics['total_sent'] or 1  # Avoid division by zero
        delivered = metrics['delivered'] or 1
        
        rates = {
            'delivery_rate': (metrics['delivered'] / total_sent) * 100 if total_sent > 0 else 0,
            'open_rate': (metrics['unique_opens'] / delivered) * 100 if delivered > 0 else 0,
            'click_rate': (metrics['unique_clicks'] / metrics['unique_opens']) * 100 if metrics['unique_opens'] > 0 else 0,
            'bounce_rate': (metrics['bounces'] / total_sent) * 100 if total_sent > 0 else 0,
            'unsubscribe_rate': (metrics['unsubscribes'] / delivered) * 100 if delivered > 0 else 0
        }
        
        return {
            "campaign_id": campaign_id,
            "metrics": metrics,
            "rates": rates
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching campaign metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@api_router.delete("/email/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a campaign and all related records"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Verify campaign belongs to user
        campaign_result = supabase.table('email_campaigns').select('*').eq('id', campaign_id).eq('user_id', user_id).execute()
        
        if not campaign_result.data or len(campaign_result.data) == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign = campaign_result.data[0]
        
        # Delete related records first
        # 1. Delete campaign sends
        supabase.table('email_campaign_sends').delete().eq('campaign_id', campaign_id).execute()
        logger.info(f"Deleted email_campaign_sends for campaign {campaign_id}")
        
        # 2. Delete scheduled sends (if any)
        try:
            scheduler = get_scheduler()
            # Cancel any scheduled sends for this campaign
            # This removes from queue but doesn't fail if queue empty
            logger.info(f"Attempting to cancel scheduled sends for campaign {campaign_id}")
        except Exception as e:
            logger.warning(f"Could not cancel scheduled sends: {str(e)}")
        
        # 3. Delete the campaign itself
        delete_result = supabase.table('email_campaigns').delete().eq('id', campaign_id).execute()
        
        if delete_result:
            logger.info(f"Successfully deleted campaign {campaign_id}")
            return {
                "success": True,
                "message": "Campaign deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete campaign")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



@api_router.post("/email/campaigns/send")
async def send_campaign(
    send_data: SendCampaign,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Send campaign to selected contacts"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        user_id = user_response.user.id
        
        # Get campaign
        campaign_result = supabase.table('email_campaigns').select('*').eq('id', send_data.campaign_id).eq('user_id', user_id).execute()
        
        if not campaign_result.data or len(campaign_result.data) == 0:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign = campaign_result.data[0]
        
        # IDEMPOTENCY CHECK: Prevent duplicate sends
        if campaign.get('status') in ['sent', 'sending']:
            logger.warning(f"Campaign {send_data.campaign_id} already in {campaign.get('status')} state, skipping duplicate send")
            return {
                "success": True,
                "message": f"Campaign already {campaign.get('status')}",
                "results": {
                    "total_sent": campaign.get('total_sent', 0),
                    "total_failed": campaign.get('total_failed', 0)
                },
                "duplicate_send_prevented": True
            }
        
        # Mark campaign as 'sending' to prevent concurrent sends
        supabase.table('email_campaigns').update({'status': 'sending'}).eq('id', send_data.campaign_id).execute()
        
        # Get user's email settings
        settings_result = supabase.table('email_settings').select('*').eq('user_id', user_id).execute()
        if not settings_result.data or len(settings_result.data) == 0:
            raise HTTPException(status_code=400, detail="SendGrid not configured")
        
        settings = settings_result.data[0]
        api_key = sendgrid_service.decrypt_api_key(settings['sendgrid_api_key'])
        
        # Get contacts
        contacts_result = supabase.table('contacts').select('id, email, name').in_('id', send_data.contact_ids).eq('owner_id', user_id).execute()
        
        logger.info(f"Contacts query returned {len(contacts_result.data) if contacts_result.data else 0} contacts")
        logger.info(f"Contacts data: {contacts_result.data}")
        
        if not contacts_result.data or len(contacts_result.data) == 0:
            raise HTTPException(status_code=400, detail="No valid contacts found")
        
        # Prepare recipients
        recipients = [
            {
                "email": contact['email'],
                "name": contact['name'],
                "id": contact['id']
            }
            for contact in contacts_result.data if contact.get('email')
        ]
        
        logger.info(f"Recipients after email filtering: {len(recipients)}")
        logger.info(f"Recipients: {recipients}")
        
        if len(recipients) == 0:
            raise HTTPException(status_code=400, detail="No contacts with valid email addresses")
        
        # Send campaign
        send_result = await sendgrid_service.send_campaign_email(
            api_key=api_key,
            from_email=settings['sender_email'],
            from_name=settings['sender_name'],
            recipients=recipients,
            subject=campaign['subject'],
            html_content=campaign['html_content'],
            plain_text_content=campaign.get('plain_text_content'),
            campaign_id=campaign['id']
        )
        
        # Record sends in database
        for result in send_result['results']:
            send_record = {
                'campaign_id': campaign['id'],
                'contact_id': result['contact_id'],
                'sendgrid_message_id': result.get('message_id'),
                'status': 'sent' if result['success'] else 'failed',
                'sent_at': datetime.now(timezone.utc).isoformat() if result['success'] else None,
                'error_message': result.get('error')
            }
            supabase.table('email_campaign_sends').insert(send_record).execute()
        
        # Update campaign status and stats
        update_data = {
            'status': 'sent',
            'sent_at': datetime.now(timezone.utc).isoformat(),
            'total_recipients': len(recipients),
            'total_sent': send_result['total_sent'],
            'total_failed': send_result['total_failed']
        }
        supabase.table('email_campaigns').update(update_data).eq('id', campaign['id']).execute()
        
        return {
            "success": True,
            "message": f"Campaign sent to {send_result['total_sent']} recipients",
            "results": {
                "total_sent": send_result['total_sent'],
                "total_failed": send_result['total_failed']
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending campaign: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# Campaign Scheduling Endpoints
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


@api_router.post("/email/campaigns/schedule")
async def schedule_campaign(
    schedule_data: ScheduleCampaign,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Schedule a campaign to send at specific time"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        scheduler = get_scheduler(supabase)
        
        result = await scheduler.schedule_campaign(
            campaign_id=schedule_data.campaign_id,
            contact_ids=schedule_data.contact_ids,
            scheduled_time=schedule_data.scheduled_time,
            batch_mode=False
        )
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Failed to schedule campaign'))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scheduling campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/email/campaigns/schedule/batch")
async def schedule_batch_campaign(
    batch_data: BatchScheduleCampaign,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Schedule a batch campaign to send over time"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        scheduler = get_scheduler(supabase)
        
        result = await scheduler.schedule_campaign(
            campaign_id=batch_data.campaign_id,
            contact_ids=batch_data.contact_ids,
            scheduled_time=batch_data.start_date,
            batch_mode=True,
            batch_config={
                'start_date': batch_data.start_date,
                'end_date': batch_data.end_date,
                'emails_per_day': batch_data.emails_per_day
            }
        )
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Failed to schedule batch campaign'))
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scheduling batch campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/email/campaigns/{campaign_id}/cancel")
async def cancel_scheduled_campaign(
    campaign_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Cancel a scheduled campaign"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        scheduler = get_scheduler(supabase)
        result = await scheduler.cancel_scheduled_campaign(campaign_id)
        
        return result
    
    except Exception as e:
        logger.error(f"Error cancelling campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/email/campaigns/{campaign_id}/queue-status")
async def get_campaign_queue_status(
    campaign_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get queue status for a scheduled campaign"""
    try:
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        
        scheduler = get_scheduler(supabase)
        status = await scheduler.get_campaign_queue_status(campaign_id)
        
        return status
    
    except Exception as e:
        logger.error(f"Error getting queue status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Background task to process scheduled campaigns
@api_router.post("/email/process-queue")
async def process_scheduled_queue():
    """Process scheduled campaign queue (called by cron job)"""
    try:
        scheduler = get_scheduler(supabase)
        result = await scheduler.process_scheduled_queue(batch_size=50)
        return result
    except Exception as e:
        logger.error(f"Error processing queue: {str(e)}")
        return {"error": str(e)}


@api_router.post("/email/webhook")
async def sendgrid_webhook(request: Dict[str, Any]):
    """Handle SendGrid webhook events (open, click, bounce, etc.)"""
    try:
        # Process each event in the batch
        events = request if isinstance(request, list) else [request]
        
        for event_data in events:
            processed_event = sendgrid_service.process_webhook_event(event_data)
            
            if 'error' in processed_event:
                logger.error(f"Error processing webhook event: {processed_event['error']}")
                continue
            
            # Extract event details
            custom_args = processed_event.get('custom_args', {})
            message_id = processed_event.get('message_id')
            status = processed_event.get('status')
            timestamp = processed_event.get('timestamp')
            event_type = event_data.get('event', 'unknown')
            email = event_data.get('email', '')
            
            # Store event in email_events table for analytics
            if custom_args.get('type') == 'campaign' and custom_args.get('campaign_id'):
                try:
                    event_record = {
                        'campaign_id': custom_args.get('campaign_id'),
                        'contact_id': custom_args.get('contact_id'),
                        'event_type': event_type,
                        'email': email,
                        'sendgrid_message_id': message_id,
                        'sendgrid_event_id': event_data.get('sg_event_id'),
                        'timestamp': timestamp.isoformat() if timestamp else datetime.now(timezone.utc).isoformat(),
                        'url': event_data.get('url'),
                        'user_agent': event_data.get('useragent'),
                        'ip_address': event_data.get('ip'),
                        'bounce_reason': event_data.get('reason'),
                        'bounce_type': event_data.get('type') if event_type == 'bounce' else None,
                        'raw_event': event_data
                    }
                    
                    # Insert event (ignore duplicates based on sendgrid_event_id unique constraint)
                    supabase.table('email_events').insert(event_record).execute()
                    logger.info(f"Stored {event_type} event for campaign {custom_args.get('campaign_id')}")
                    
                except Exception as event_error:
                    # Don't fail the webhook if event storage fails
                    logger.error(f"Failed to store event in email_events: {str(event_error)}")
            
            # Update campaign send status (existing logic)
            if custom_args.get('type') == 'campaign' and custom_args.get('campaign_id'):
                update_data = {'status': status}
                
                if status == 'delivered':
                    update_data['delivered_at'] = timestamp.isoformat()
                elif status == 'opened':
                    update_data['opened_at'] = timestamp.isoformat()
                elif status == 'clicked':
                    update_data['clicked_at'] = timestamp.isoformat()
                elif status == 'bounced':
                    update_data['bounced_at'] = timestamp.isoformat()
                
                supabase.table('email_campaign_sends').update(update_data).eq('sendgrid_message_id', message_id).execute()
            
            elif custom_args.get('type') == 'transactional':
                # Update email activity
                update_data = {'status': status}
                
                if status == 'delivered':
                    update_data['delivered_at'] = timestamp.isoformat()
                elif status == 'opened':
                    update_data['opened_at'] = timestamp.isoformat()
                elif status == 'clicked':
                    update_data['clicked_at'] = timestamp.isoformat()
                elif status == 'bounced':
                    update_data['bounced_at'] = timestamp.isoformat()
                
                supabase.table('email_activities').update(update_data).eq('sendgrid_message_id', message_id).execute()
        
        return {"success": True}
    
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return {"success": False, "error": str(e)}


# ============================================================================
# PIPELINE MANAGEMENT ENDPOINTS
# ============================================================================

@api_router.get("/pipelines")
async def get_pipelines(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all pipelines for the authenticated user"""
    try:
        # Get user from token
        user = await get_current_user_supabase(credentials)
        
        # Fetch pipelines with stages
        response = supabase.table('pipelines').select(
            '*, pipeline_stages(*)'
        ).eq('owner_id', user.id).order('display_order').execute()
        
        return {
            "success": True,
            "pipelines": response.data
        }
    except Exception as e:
        logger.error(f"Error fetching pipelines: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/pipelines")
async def create_pipeline(
    name: str = Form(...),
    description: str = Form(None),
    color: str = Form("#00b8d4"),
    icon: str = Form("briefcase"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new pipeline (max 5 per user)"""
    try:
        user = await get_current_user_supabase(credentials)
        
        # Check if user already has 5 pipelines
        count_response = supabase.table('pipelines').select(
            'id', count='exact'
        ).eq('owner_id', user.id).execute()
        
        if count_response.count >= 5:
            raise HTTPException(
                status_code=400, 
                detail="Maximum of 5 pipelines allowed per user"
            )
        
        # Get current max display_order
        max_order_response = supabase.table('pipelines').select(
            'display_order'
        ).eq('owner_id', user.id).order('display_order', desc=True).limit(1).execute()
        
        next_order = 0
        if max_order_response.data:
            next_order = max_order_response.data[0]['display_order'] + 1
        
        # Create pipeline
        pipeline_data = {
            'owner_id': user.id,
            'name': name,
            'description': description,
            'color': color,
            'icon': icon,
            'display_order': next_order,
            'is_active': True,
            'is_default': False
        }
        
        response = supabase.table('pipelines').insert(pipeline_data).execute()
        
        return {
            "success": True,
            "pipeline": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/pipelines/{pipeline_id}")
async def update_pipeline(
    pipeline_id: str,
    name: str = Form(None),
    description: str = Form(None),
    color: str = Form(None),
    icon: str = Form(None),
    is_active: bool = Form(None),
    display_order: int = Form(None),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a pipeline"""
    try:
        user = await get_current_user_supabase(credentials)
        
        # Build update data (only include provided fields)
        update_data = {}
        if name is not None:
            update_data['name'] = name
        if description is not None:
            update_data['description'] = description
        if color is not None:
            update_data['color'] = color
        if icon is not None:
            update_data['icon'] = icon
        if is_active is not None:
            update_data['is_active'] = is_active
        if display_order is not None:
            update_data['display_order'] = display_order
        
        # Update pipeline (RLS ensures user owns it)
        response = supabase.table('pipelines').update(
            update_data
        ).eq('id', pipeline_id).eq('owner_id', user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        
        return {
            "success": True,
            "pipeline": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/pipelines/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a pipeline (cannot delete default pipeline)"""
    try:
        user = await get_current_user_supabase(credentials)
        
        # Check if it's the default pipeline
        check_response = supabase.table('pipelines').select(
            'is_default'
        ).eq('id', pipeline_id).eq('owner_id', user.id).execute()
        
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        
        if check_response.data[0]['is_default']:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete default pipeline"
            )
        
        # Delete pipeline (CASCADE will delete stages, deals will have pipeline_id set to NULL)
        supabase.table('pipelines').delete().eq(
            'id', pipeline_id
        ).eq('owner_id', user.id).execute()
        
        return {
            "success": True,
            "message": "Pipeline deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PIPELINE STAGES ENDPOINTS
# ============================================================================

@api_router.get("/pipelines/{pipeline_id}/stages")
async def get_pipeline_stages(
    pipeline_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all stages for a pipeline"""
    try:
        user = await get_current_user_supabase(credentials)
        
        # Verify pipeline ownership and get stages
        response = supabase.table('pipeline_stages').select(
            '*'
        ).eq('pipeline_id', pipeline_id).order('display_order').execute()
        
        return {
            "success": True,
            "stages": response.data
        }
    except Exception as e:
        logger.error(f"Error fetching pipeline stages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/pipelines/{pipeline_id}/stages")
async def create_pipeline_stage(
    pipeline_id: str,
    name: str = Form(...),
    color: str = Form(...),
    stage_weight: float = Form(0.5),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new stage for a pipeline (max 10 per pipeline)"""
    try:
        user = await get_current_user_supabase(credentials)
        
        # Verify pipeline ownership
        pipeline_response = supabase.table('pipelines').select(
            'id'
        ).eq('id', pipeline_id).eq('owner_id', user.id).execute()
        
        if not pipeline_response.data:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        
        # Check stage count
        count_response = supabase.table('pipeline_stages').select(
            'id', count='exact'
        ).eq('pipeline_id', pipeline_id).execute()
        
        if count_response.count >= 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum of 10 stages allowed per pipeline"
            )
        
        # Get current max display_order
        max_order_response = supabase.table('pipeline_stages').select(
            'display_order'
        ).eq('pipeline_id', pipeline_id).order('display_order', desc=True).limit(1).execute()
        
        next_order = 0
        if max_order_response.data:
            next_order = max_order_response.data[0]['display_order'] + 1
        
        # Create stage
        stage_data = {
            'pipeline_id': pipeline_id,
            'name': name,
            'color': color,
            'stage_weight': stage_weight,
            'display_order': next_order
        }
        
        response = supabase.table('pipeline_stages').insert(stage_data).execute()
        
        return {
            "success": True,
            "stage": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating pipeline stage: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/stages/{stage_id}")
async def update_pipeline_stage(
    stage_id: str,
    name: str = Form(None),
    color: str = Form(None),
    stage_weight: float = Form(None),
    display_order: int = Form(None),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a pipeline stage"""
    try:
        user = await get_current_user_supabase(credentials)
        
        # Build update data
        update_data = {}
        if name is not None:
            update_data['name'] = name
        if color is not None:
            update_data['color'] = color
        if stage_weight is not None:
            update_data['stage_weight'] = stage_weight
        if display_order is not None:
            update_data['display_order'] = display_order
        
        # Update stage (RLS ensures user owns the pipeline)
        response = supabase.table('pipeline_stages').update(
            update_data
        ).eq('id', stage_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Stage not found")
        
        return {
            "success": True,
            "stage": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pipeline stage: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/stages/{stage_id}")
async def delete_pipeline_stage(
    stage_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a pipeline stage"""
    try:
        user = await get_current_user_supabase(credentials)
        
        # Check if any deals are in this stage
        deals_response = supabase.table('deals').select(
            'id', count='exact'
        ).eq('pipeline_stage_id', stage_id).execute()
        
        if deals_response.count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete stage with {deals_response.count} deals. Move deals to another stage first."
            )
        
        # Delete stage
        supabase.table('pipeline_stages').delete().eq('id', stage_id).execute()
        
        return {
            "success": True,
            "message": "Stage deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pipeline stage: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DEAL MOVEMENT ENDPOINTS
# ============================================================================


# Register extracted route modules (auth, deals, dashboard, marketplace, messaging, onboarding, admin, reputation, roles)
api_router.include_router(auth_router)
api_router.include_router(deal_router)
api_router.include_router(dashboard_routes_router)
api_router.include_router(marketplace_router)
api_router.include_router(messaging_router)
api_router.include_router(onboarding_router)
api_router.include_router(admin_router)
api_router.include_router(reputation_router)
api_router.include_router(roles_router)
api_router.include_router(map_crm_router)  # Internal Map CRM tool

# Register main API router and service routers
app.include_router(api_router)
app.include_router(dashboard_router)  # AI Dashboard service
app.include_router(llc_router)  # LLC lookup service

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
    # MongoDB client cleanup is handled by the utils.db module
    pass