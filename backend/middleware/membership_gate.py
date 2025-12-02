"""Membership gate middleware for DealLinked Marketplace.

All /app/* routes require both authentication AND active membership.
"""
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional
import logging

logger = logging.getLogger(__name__)


async def check_membership(credentials: HTTPAuthorizationCredentials):
    """
    Verify user has active membership.
    
    This dependency should be used on all Marketplace and Workspace routes
    that require paid membership access.
    
    Usage:
        user = Depends(check_membership)
    
    Returns:
        User object with membership info
        
    Raises:
        HTTPException 403 if membership is not active
    """
    # Import here to avoid circular dependency and env var issues
    from utils.auth_helpers import get_current_user_supabase
    from utils.db import get_supabase
    
    # First verify authentication
    user = await get_current_user_supabase(credentials)
    
    # Check membership status in user_profiles
    supabase = get_supabase()
    try:
        profile_response = supabase.table('user_profiles').select(
            'membership_active, membership_tier, user_role, onboarding_completed'
        ).eq('id', user.id).single().execute()
        
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User profile not found. Please complete registration."
            )
        
        profile = profile_response.data
        
        # Check if membership is active
        if not profile.get('membership_active', False):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Active membership required. Please subscribe to access DealLinked."
            )
        
        # Attach profile data to user object for convenience
        user.membership_tier = profile.get('membership_tier', 'base')
        user.user_role = profile.get('user_role', 'investor')
        user.onboarding_completed = profile.get('onboarding_completed', False)
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Membership check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify membership status"
        )


async def require_role(allowed_roles: list[str], credentials: HTTPAuthorizationCredentials):
    """
    Verify user has active membership AND one of the required roles.
    
    Args:
        allowed_roles: List of allowed roles (e.g., ['broker', 'admin'])
        
    Usage:
        user = Depends(lambda creds: require_role(['broker'], creds))
        
    Returns:
        User object with membership and role info
        
    Raises:
        HTTPException 403 if user doesn't have required role
    """
    user = await check_membership(credentials)
    
    if user.user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This action requires one of the following roles: {', '.join(allowed_roles)}"
        )
    
    return user


async def require_broker(credentials: HTTPAuthorizationCredentials):
    """
    Shorthand for requiring broker role.
    Use this for deal publishing endpoints.
    
    Usage:
        user = Depends(require_broker)
    """
    return await require_role(['broker', 'admin'], credentials)


async def check_onboarding(credentials: HTTPAuthorizationCredentials):
    """
    Verify user has completed onboarding.
    Redirect to onboarding if not completed.
    
    Usage:
        user = Depends(check_onboarding)
    """
    user = await check_membership(credentials)
    
    if not user.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            detail="Please complete onboarding wizard",
            headers={"Location": "/app/onboarding"}
        )
    
    return user
