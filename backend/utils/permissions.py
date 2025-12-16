"""Permission checking utilities for role-based access control."""
from typing import Optional
from fastapi import HTTPException, status
from utils.db import get_supabase


def has_role(user_id: str, role: str) -> bool:
    """
    Check if user has a specific role.
    
    Args:
        user_id: User ID to check
        role: Role name ('broker', 'seller', 'buyer')
    
    Returns:
        True if user has the role, False otherwise
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table('user_profiles').select('roles').eq('id', user_id).single().execute()
        
        if not result.data:
            return False
        
        roles = result.data.get('roles', [])
        return role in roles
        
    except Exception:
        return False


def has_verified_role(user_id: str, role: str) -> bool:
    """
    Check if user has a verified role.
    
    Args:
        user_id: User ID to check
        role: Role name ('broker', 'seller')
    
    Returns:
        True if user has verified role, False otherwise
    """
    supabase = get_supabase()
    
    try:
        result = supabase.table('user_profiles').select('role_verifications').eq('id', user_id).single().execute()
        
        if not result.data:
            return False
        
        verifications = result.data.get('role_verifications', {})
        role_verification = verifications.get(role, {})
        
        return role_verification.get('status') == 'verified'
        
    except Exception:
        return False


def can_publish_as_broker(user_id: str) -> bool:
    """
    Check if user can publish deals as a broker.
    Requires verified broker role.
    """
    return has_verified_role(user_id, 'broker')


def can_publish_as_owner(user_id: str, property_address: Optional[str] = None) -> bool:
    """
    Check if user can publish as property owner.
    
    Args:
        user_id: User ID to check
        property_address: Optional specific property address
    
    Returns:
        True if user can publish as owner (for that specific property if provided)
    """
    supabase = get_supabase()
    
    try:
        # Check if user has seller role
        if not has_role(user_id, 'seller'):
            return False
        
        # If specific property provided, check ownership verification
        if property_address:
            result = supabase.table('ownership_verifications').select('id').eq(
                'user_id', user_id
            ).eq('property_address', property_address).eq('status', 'approved').execute()
            
            return len(result.data) > 0
        else:
            # Check if user has ANY verified properties
            result = supabase.table('ownership_verifications').select('id').eq(
                'user_id', user_id
            ).eq('status', 'approved').execute()
            
            return len(result.data) > 0
            
    except Exception:
        return False


def require_role(role: str):
    """
    Decorator to require specific role.
    
    Usage:
        @require_role('broker')
        async def my_endpoint(user = Depends(get_current_user_supabase)):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get user from kwargs (passed by Depends)
            user = kwargs.get('user')
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not has_role(str(user.id), role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"{role.capitalize()} role required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_verified_role(role: str):
    """
    Decorator to require verified role.
    
    Usage:
        @require_verified_role('broker')
        async def my_endpoint(user = Depends(get_current_user_supabase)):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get user from kwargs
            user = kwargs.get('user')
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            if not has_verified_role(str(user.id), role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Verified {role} role required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_admin(func):
    """
    Decorator to require admin role.
    
    Usage:
        @require_admin
        async def my_endpoint(user = Depends(get_current_user_supabase)):
            ...
    """
    async def wrapper(*args, **kwargs):
        # Get user from kwargs
        user = kwargs.get('user')
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        supabase = get_supabase()
        result = supabase.table('user_profiles').select('is_admin').eq('id', str(user.id)).single().execute()
        
        if not result.data or not result.data.get('is_admin'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return await func(*args, **kwargs)
    return wrapper
