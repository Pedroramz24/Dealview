"""
DealLinked CRM V2 - Authentication Routes
Handles login, signup, and user profile
CRITICAL: Never use supabase.auth.* methods on the singleton client - 
they contaminate the service_role session causing RLS failures everywhere.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import logging
import os
import httpx

from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')


# ============================================================================
# MODELS
# ============================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    avatar_url: Optional[str] = None


# ============================================================================
# ROUTES
# ============================================================================

@router.post("/login")
async def login(request: LoginRequest):
    """Login with email and password via Supabase Auth REST API (safe, no client contamination)"""
    supabase = get_supabase()
    try:
        # Use direct HTTP call to avoid contaminating the singleton client
        resp = httpx.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={"email": request.email, "password": request.password},
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            timeout=10
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        auth_data = resp.json()
        user_data = auth_data.get('user', {})
        access_token = auth_data.get('access_token')
        refresh_token = auth_data.get('refresh_token')
        
        if not user_data or not access_token:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        user_id = user_data['id']
        
        # Get user profile using the service_role client (safe - no auth contamination)
        profile_response = supabase.table('user_profiles').select('*').eq('id', user_id).single().execute()
        profile = profile_response.data if profile_response.data else {}
        
        return {
            "success": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_id,
                "email": user_data.get('email', ''),
                "full_name": profile.get('full_name', ''),
                "phone": profile.get('phone'),
                "company": profile.get('company'),
                "avatar_url": profile.get('avatar_url'),
                "team_id": profile.get('team_id'),
                "is_admin": profile.get('is_admin', False)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/signup")
async def signup(request: SignupRequest):
    """Sign up with email and password via Supabase Auth"""
    supabase = get_supabase()
    try:
        # Create user in Supabase Auth
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name
                }
            }
        })
        
        if not response.user:
            raise HTTPException(status_code=400, detail="Failed to create account")
        
        # Note: user_profiles record is created by database trigger
        
        return {
            "success": True,
            "access_token": response.session.access_token if response.session else None,
            "refresh_token": response.session.refresh_token if response.session else None,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "full_name": request.full_name
            },
            "message": "Account created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        if "already registered" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail="Failed to create account")


@router.get("/me")
async def get_current_user_profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user profile"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Get profile from user_profiles table
        profile_response = supabase.table('user_profiles').select('*').eq('id', user_id).execute()
        
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile = profile_response.data[0]
        
        return {
            "success": True,
            "user": {
                "id": profile['id'],
                "email": profile['email'],
                "full_name": profile.get('full_name'),
                "phone": profile.get('phone'),
                "company": profile.get('company'),
                "avatar_url": profile.get('avatar_url'),
                "team_id": profile.get('team_id'),
                "is_admin": profile.get('is_admin', False),
                "created_at": profile.get('created_at')
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get profile error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")


@router.put("/profile")
async def update_profile(
    update: ProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update current user profile"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Build update data
        update_data = {}
        if update.full_name is not None:
            update_data['full_name'] = update.full_name
        if update.phone is not None:
            update_data['phone'] = update.phone
        if update.company is not None:
            update_data['company'] = update.company
        if update.avatar_url is not None:
            update_data['avatar_url'] = update.avatar_url
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update profile
        response = supabase.table('user_profiles').update(update_data).eq('id', user_id).execute()
        
        return {
            "success": True,
            "message": "Profile updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update profile error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.post("/refresh")
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Refresh access token"""
    supabase = get_supabase()
    try:
        response = supabase.auth.refresh_session()
        
        if not response.session:
            raise HTTPException(status_code=401, detail="Failed to refresh token")
        
        return {
            "success": True,
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token
        }
    except Exception as e:
        logger.error(f"Refresh token error: {str(e)}")
        raise HTTPException(status_code=401, detail="Failed to refresh token")
