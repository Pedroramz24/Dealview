"""Onboarding routes for DealLinked."""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
import logging

from utils.auth_helpers import get_current_user_supabase
from utils.db import get_supabase

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])
logger = logging.getLogger(__name__)


class BuyBoxPreferences(BaseModel):
    """User's buy box preferences."""
    markets: List[str] = []
    asset_types: List[str] = []
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_size: Optional[float] = None
    max_size: Optional[float] = None
    strategies: List[str] = []


class BrokerInfo(BaseModel):
    """Broker-specific information."""
    license_number: str
    brokerage_name: str
    specialization_markets: List[str] = []
    specialization_asset_types: List[str] = []


class OnboardingComplete(BaseModel):
    """Complete onboarding data."""
    user_role: str  # 'broker' or 'investor'
    buy_box_preferences: Optional[dict] = None
    broker_info: Optional[dict] = None


@router.post("/complete")
async def complete_onboarding(
    onboarding_data: OnboardingComplete,
    user = Depends(get_current_user_supabase)
):
    """
    Save user's onboarding preferences and mark onboarding as complete.
    """
    supabase = get_supabase()
    
    try:
        # Prepare update data
        update_data = {
            'user_role': onboarding_data.user_role,
            'onboarding_completed': True
        }
        
        # Add buy box preferences for investors
        if onboarding_data.user_role == 'investor' and onboarding_data.buy_box_preferences:
            update_data['buy_box_preferences'] = onboarding_data.buy_box_preferences
        
        # Add broker info (store in buy_box_preferences for now, can create separate table later)
        if onboarding_data.user_role == 'broker' and onboarding_data.broker_info:
            update_data['buy_box_preferences'] = onboarding_data.broker_info
        
        # Update user profile
        result = supabase.table('user_profiles').update(update_data).eq('id', str(user.id)).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        logger.info(f"User {user.id} completed onboarding as {onboarding_data.user_role}")
        
        return {
            "success": True,
            "message": "Onboarding completed successfully",
            "user_role": onboarding_data.user_role,
            "profile": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing onboarding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding"
        )


@router.get("/status")
async def check_onboarding_status(user = Depends(get_current_user_supabase)):
    """Check if user has completed onboarding."""
    supabase = get_supabase()
    
    try:
        profile = supabase.table('user_profiles').select(
            'onboarding_completed, user_role, buy_box_preferences'
        ).eq('id', str(user.id)).single().execute()
        
        if not profile.data:
            return {
                "onboarding_completed": False,
                "user_role": None
            }
        
        return {
            "onboarding_completed": profile.data.get('onboarding_completed', False),
            "user_role": profile.data.get('user_role'),
            "buy_box_preferences": profile.data.get('buy_box_preferences', {})
        }
        
    except Exception as e:
        logger.error(f"Error checking onboarding status: {str(e)}")
        return {
            "onboarding_completed": False,
            "user_role": None
        }
