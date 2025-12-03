"""Admin routes for DealLinked - Deal approval and management."""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import logging

from utils.auth_helpers import get_current_user_supabase
from utils.db import get_supabase

router = APIRouter(prefix="/admin", tags=["Admin"])
logger = logging.getLogger(__name__)


class ApprovalAction(BaseModel):
    """Approve or reject a deal."""
    action: str  # 'approve' or 'reject'
    reason: Optional[str] = None


@router.get("/pending-deals")
async def get_pending_deals(user = Depends(get_current_user_supabase)):
    """
    Get all deals pending approval.
    TODO: Add admin role check.
    """
    supabase = get_supabase()
    
    try:
        # Fetch pending deals (without foreign key join)
        deals = supabase.table('deals').select(
            'id, title, address, public_asset_type, public_market, public_price, '
            'published_at, published_by, approval_status, owner_id'
        ).eq('is_published', True).eq('approval_status', 'pending').order('published_at', desc=True).execute()
        
        # Get user info for each deal separately
        for deal in deals.data:
            try:
                user_profile = supabase.table('user_profiles').select('full_name, company').eq('id', deal['owner_id']).single().execute()
                if user_profile.data:
                    deal['broker_name'] = user_profile.data.get('full_name', 'Unknown')
                    deal['broker_company'] = user_profile.data.get('company', '')
                else:
                    deal['broker_name'] = 'Unknown'
                    deal['broker_company'] = ''
            except:
                deal['broker_name'] = 'Unknown'
                deal['broker_company'] = ''
        
        return {
            "pending_deals": deals.data,
            "count": len(deals.data)
        }
        
    except Exception as e:
        logger.error(f"Error fetching pending deals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pending deals"
        )


@router.post("/deals/{deal_id}/approve")
async def approve_deal(
    deal_id: str,
    approval_data: ApprovalAction,
    user = Depends(get_current_user_supabase)
):
    """
    Approve a deal for marketplace publication.
    TODO: Add admin role check.
    """
    supabase = get_supabase()
    
    try:
        if approval_data.action == 'approve':
            # Approve the deal
            result = supabase.table('deals').update({
                'approval_status': 'approved',
                'public_status': 'published',
                'approved_by': str(user.id),
                'approved_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', deal_id).execute()
            
            logger.info(f"Deal {deal_id} approved by {user.id}")
            
            return {
                "success": True,
                "message": "Deal approved and published to marketplace",
                "deal": result.data[0] if result.data else None
            }
            
        elif approval_data.action == 'reject':
            # Reject the deal
            result = supabase.table('deals').update({
                'approval_status': 'rejected',
                'public_status': 'draft',
                'is_published': False,
                'approved_by': str(user.id),
                'approved_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', deal_id).execute()
            
            logger.info(f"Deal {deal_id} rejected by {user.id} - Reason: {approval_data.reason}")
            
            return {
                "success": True,
                "message": "Deal rejected",
                "reason": approval_data.reason,
                "deal": result.data[0] if result.data else None
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing approval: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process approval"
        )


@router.get("/stats")
async def get_admin_stats(user = Depends(get_current_user_supabase)):
    """Get admin statistics."""
    supabase = get_supabase()
    
    try:
        # Count pending deals
        pending = supabase.table('deals').select('id').eq('is_published', True).eq('approval_status', 'pending').execute()
        
        # Count approved deals
        approved = supabase.table('deals').select('id').eq('approval_status', 'approved').execute()
        
        # Count total inquiries
        inquiries = supabase.table('marketplace_inquiries').select('id').execute()
        
        # Count total messages
        messages = supabase.table('marketplace_messages').select('id').execute()
        
        return {
            "pending_approvals": len(pending.data),
            "approved_deals": len(approved.data),
            "total_inquiries": len(inquiries.data),
            "total_messages": len(messages.data)
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch admin stats"
        )
