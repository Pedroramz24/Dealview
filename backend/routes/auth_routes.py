"""Authentication routes - Using Supabase Auth only."""
from fastapi import APIRouter, Depends
from models import User
from utils.auth_helpers import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return current_user


# ============================================================
# MEMBERSHIP & ONBOARDING ENDPOINTS (TO BE ADDED IN PHASE 2)
# ============================================================
# @router.get("/membership/status")
# async def check_membership_status(current_user: User = Depends(get_current_user)):
#     """Check if user has active membership"""
#     pass
#
# @router.post("/onboarding/complete")
# async def complete_onboarding(...):
#     """Complete onboarding wizard and save buy box preferences"""
#     pass
