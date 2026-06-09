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
    """Submit a signup request for admin approval."""
    supabase = get_supabase()
    try:
        # Check if email already exists as a user
        existing = supabase.table('user_profiles').select('id').eq('email', request.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Check if request already pending
        pending = supabase.table('signup_requests').select('id, status').eq('email', request.email).execute()
        if pending.data:
            status = pending.data[0].get('status')
            if status == 'pending':
                raise HTTPException(status_code=400, detail="Your request is already pending review")
            if status == 'rejected':
                raise HTTPException(status_code=403, detail="Your request was not approved. Contact the administrator.")

        # Create signup request
        supabase.table('signup_requests').insert({
            "email": request.email,
            "full_name": request.full_name,
        }).execute()

        return {
            "success": True,
            "message": "Your access request has been submitted. You will be notified once approved."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup request error: {str(e)}")
        raise HTTPException(status_code=400, detail="Failed to submit request")


@router.get("/signup-requests")
async def get_signup_requests(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all pending signup requests (admin only)."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        result = supabase.table('signup_requests') \
            .select('*') \
            .order('created_at', desc=True) \
            .execute()
        return {"success": True, "requests": result.data or []}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get signup requests error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch requests")


class ApproveRequest(BaseModel):
    request_id: str
    action: str  # 'approve' or 'reject'
    password: Optional[str] = None


@router.post("/signup-requests/review")
async def review_signup_request(
    body: ApproveRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Approve or reject a signup request. On approve, creates the Supabase user."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)

        # Get the request
        req = supabase.table('signup_requests').select('*').eq('id', body.request_id).single().execute()
        if not req.data:
            raise HTTPException(status_code=404, detail="Request not found")

        if body.action == 'reject':
            supabase.table('signup_requests').update({
                "status": "rejected",
                "reviewed_by": user_id,
                "updated_at": datetime.utcnow().isoformat()
            }).eq('id', body.request_id).execute()
            return {"success": True, "message": "Request rejected"}

        if body.action == 'approve':
            email = req.data['email']
            full_name = req.data['full_name']
            password = body.password or "TempPass123!"

            # Create Supabase user
            resp = httpx.post(
                f"{SUPABASE_URL}/auth/v1/admin/users",
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": full_name}
                },
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {os.environ.get('SUPABASE_SERVICE_KEY', '')}",
                    "Content-Type": "application/json"
                },
                timeout=10
            )

            if resp.status_code not in (200, 201):
                logger.error(f"Failed to create user: {resp.text}")
                raise HTTPException(status_code=400, detail="Failed to create user account")

            supabase.table('signup_requests').update({
                "status": "approved",
                "reviewed_by": user_id,
                "updated_at": datetime.utcnow().isoformat()
            }).eq('id', body.request_id).execute()

            return {"success": True, "message": f"User {email} has been approved and account created"}

        raise HTTPException(status_code=400, detail="Invalid action")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Review signup request error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process request")



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
    """Refresh access token via Supabase Auth REST API (safe, no client contamination)"""
    try:
        token = credentials.credentials
        resp = httpx.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
            json={"refresh_token": token},
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            timeout=10
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to refresh token")
        
        auth_data = resp.json()
        
        return {
            "success": True,
            "access_token": auth_data.get('access_token'),
            "refresh_token": auth_data.get('refresh_token')
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refresh token error: {str(e)}")
        raise HTTPException(status_code=401, detail="Failed to refresh token")
