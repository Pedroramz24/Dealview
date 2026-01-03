"""Permission gate middleware for Map CRM internal tool."""
from fastapi import HTTPException, Depends, status
from utils.auth_helpers import get_current_user
from models import User
from utils.db import get_supabase
import logging

logger = logging.getLogger(__name__)


async def require_map_crm_access(current_user: User = Depends(get_current_user)) -> User:
    """
    Enterprise-grade permission gate for Map CRM.
    
    Verifies that the authenticated user has map_crm_access permission.
    Returns 403 Forbidden if user lacks permission.
    
    This is applied to ALL /api/map-crm/* endpoints.
    """
    try:
        supabase = get_supabase()
        
        # Query user profile for permissions
        result = supabase.table('user_profiles').select('permissions').eq('id', str(current_user.id)).single().execute()
        
        if not result.data:
            logger.warning(f"User {current_user.id} attempted Map CRM access - no profile found")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User profile not found"
            )
        
        permissions = result.data.get('permissions', {})
        has_access = permissions.get('map_crm_access', False) if isinstance(permissions, dict) else False
        
        if not has_access:
            logger.warning(f"User {current_user.id} ({current_user.email}) attempted Map CRM access - permission denied")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Map CRM requires special permissions. Contact your administrator."
            )
        
        logger.info(f"User {current_user.id} ({current_user.email}) accessed Map CRM")
        return current_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking Map CRM permissions for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify permissions"
        )
