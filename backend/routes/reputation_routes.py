"""Broker reputation and lifecycle tracking routes."""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime, timezone
import logging

from models.reputation import (
    CreateLifecycleEvent, DealLifecycleEvent,
    SubmitFeedback, FeedbackResponse,
    UpdateCommitment,
    BrokerReputationSummary,
    get_reputation_summary
)
from utils.auth_helpers import get_current_user_supabase
from utils.db import get_supabase

router = APIRouter(prefix="/reputation", tags=["Reputation"])
logger = logging.getLogger(__name__)


# =====================================================
# Deal Lifecycle Endpoints
# =====================================================

@router.post("/lifecycle-event")
async def create_lifecycle_event(
    event_data: CreateLifecycleEvent,
    user = Depends(get_current_user_supabase)
):
    """
    Create a deal lifecycle event.
    Tracks progression: published → NDA → LOI → contract → closed/withdrawn
    """
    supabase = get_supabase()
    
    try:
        # Verify user owns the deal
        deal = supabase.table('deals').select('id, owner_id').eq('id', event_data.deal_id).single().execute()
        
        if not deal.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        if deal.data['owner_id'] != str(user.id):
            raise HTTPException(status_code=403, detail="You can only create events for your own deals")
        
        # Create event
        event_record = {
            'deal_id': event_data.deal_id,
            'event_type': event_data.event_type,
            'event_date': datetime.now(timezone.utc).isoformat(),
            'initiated_by': str(user.id),
            'metadata': event_data.metadata or {},
            'withdrawal_reason': event_data.withdrawal_reason,
            'withdrawal_notes': event_data.withdrawal_notes
        }
        
        result = supabase.table('deal_lifecycle_events').insert(event_record).execute()
        
        # Trigger reputation recalculation for broker
        try:
            supabase.rpc('calculate_broker_reputation', {'target_broker_id': str(user.id)}).execute()
        except Exception as calc_error:
            logger.warning(f"Reputation calculation failed: {str(calc_error)}")
        
        return {
            "success": True,
            "message": f"Lifecycle event '{event_data.event_type}' recorded",
            "event": result.data[0] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating lifecycle event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create lifecycle event: {str(e)}"
        )


@router.get("/lifecycle-events/{deal_id}")
async def get_deal_lifecycle_events(
    deal_id: str,
    user = Depends(get_current_user_supabase)
):
    """Get all lifecycle events for a deal."""
    supabase = get_supabase()
    
    try:
        # Verify user owns the deal
        deal = supabase.table('deals').select('id, owner_id').eq('id', deal_id).single().execute()
        
        if not deal.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        if deal.data['owner_id'] != str(user.id):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Fetch events
        events = supabase.table('deal_lifecycle_events').select('*').eq(
            'deal_id', deal_id
        ).order('event_date', desc=True).execute()
        
        return {
            "deal_id": deal_id,
            "events": events.data,
            "count": len(events.data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lifecycle events: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch lifecycle events"
        )


# =====================================================
# Broker Reputation Endpoints
# =====================================================

@router.get("/broker/{broker_id}", response_model=BrokerReputationSummary)
async def get_broker_reputation(
    broker_id: str,
    user = Depends(get_current_user_supabase)
):
    """
    Get public reputation summary for a broker.
    Shows badges, stats, and quality tier.
    Returns default values for new brokers without reputation data.
    """
    supabase = get_supabase()
    
    try:
        # Fetch reputation - use maybeSingle to handle empty results gracefully
        result = supabase.table('broker_reputation').select('*').eq('broker_id', broker_id).execute()
        
        # If no reputation data exists, return default for new brokers
        if not result.data or len(result.data) == 0:
            logger.info(f"No reputation data found for broker {broker_id}, returning defaults")
            return BrokerReputationSummary(
                broker_id=broker_id,
                quality_score=50,
                badges=[],
                stats={
                    "total_listings": 0,
                    "verified_listings": 0,
                    "closed_deals": 0,
                    "response_time": "N/A"
                },
                can_publish=True,
                max_listings=100
            )
        
        # Convert to model and generate summary
        from models.reputation import BrokerReputation
        reputation = BrokerReputation(**result.data[0])
        summary = get_reputation_summary(reputation)
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        # Log the error but return default instead of 500
        logger.warning(f"Error fetching broker reputation for {broker_id}: {str(e)}, returning defaults")
        return BrokerReputationSummary(
            broker_id=broker_id,
            quality_score=50,
            badges=[],
            stats={
                "total_listings": 0,
                "verified_listings": 0,
                "closed_deals": 0,
                "response_time": "N/A"
            },
            can_publish=True,
            max_listings=100
        )


@router.post("/broker/{broker_id}/recalculate")
async def recalculate_broker_reputation(
    broker_id: str,
    user = Depends(get_current_user_supabase)
):
    """
    Manually trigger reputation recalculation.
    Only the broker themselves or admins can trigger this.
    """
    supabase = get_supabase()
    
    try:
        # Verify user is the broker or admin
        if str(user.id) != broker_id:
            # Check if user is admin (you can add admin check logic here)
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Call reputation calculation function
        result = supabase.rpc('calculate_broker_reputation', {'target_broker_id': broker_id}).execute()
        
        return {
            "success": True,
            "message": "Reputation recalculated",
            "result": result.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recalculating reputation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate reputation: {str(e)}"
        )


# =====================================================
# Deal Feedback Endpoints
# =====================================================

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_deal_feedback(
    feedback_data: SubmitFeedback,
    user = Depends(get_current_user_supabase)
):
    """
    Submit structured feedback about a deal interaction.
    Can only submit once per deal per user.
    """
    supabase = get_supabase()
    
    try:
        # Get deal and broker info
        deal = supabase.table('deals').select('id, owner_id').eq('id', feedback_data.deal_id).single().execute()
        
        if not deal.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        broker_id = deal.data['owner_id']
        
        # Prevent self-feedback
        if broker_id == str(user.id):
            raise HTTPException(status_code=400, detail="Cannot submit feedback for your own deals")
        
        # Create feedback record
        feedback_record = {
            'deal_id': feedback_data.deal_id,
            'buyer_id': str(user.id),
            'broker_id': broker_id,
            'seller_engaged': feedback_data.seller_engaged,
            'terms_accurate': feedback_data.terms_accurate,
            'would_recommend': feedback_data.would_recommend,
            'optional_comment': feedback_data.optional_comment,
            'interaction_type': feedback_data.interaction_type,
            'submitted_at': datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table('deal_feedback').insert(feedback_record).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create feedback"
            )
        
        # Trigger reputation recalculation for broker
        try:
            supabase.rpc('calculate_broker_reputation', {'target_broker_id': broker_id}).execute()
        except Exception as calc_error:
            logger.warning(f"Reputation calculation failed: {str(calc_error)}")
        
        return FeedbackResponse(
            success=True,
            message="Feedback submitted successfully",
            feedback_id=result.data[0]['id']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        if 'duplicate' in str(e).lower() or 'unique' in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already submitted feedback for this deal"
            )
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}"
        )


@router.get("/feedback/check/{deal_id}")
async def check_feedback_submitted(
    deal_id: str,
    user = Depends(get_current_user_supabase)
):
    """Check if user has already submitted feedback for a deal."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('deal_feedback').select('id').eq(
            'deal_id', deal_id
        ).eq('buyer_id', str(user.id)).execute()
        
        return {
            "has_submitted": len(result.data) > 0,
            "deal_id": deal_id
        }
        
    except Exception as e:
        logger.error(f"Error checking feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check feedback status"
        )


# =====================================================
# Seller Commitment Endpoints
# =====================================================

@router.put("/deals/{deal_id}/commitment")
async def update_seller_commitment(
    deal_id: str,
    commitment_data: UpdateCommitment,
    user = Depends(get_current_user_supabase)
):
    """
    Update seller commitment level for a deal.
    Affects deal visibility and broker reputation.
    """
    supabase = get_supabase()
    
    try:
        # Verify user owns the deal
        deal = supabase.table('deals').select('id, owner_id').eq('id', deal_id).single().execute()
        
        if not deal.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        if deal.data['owner_id'] != str(user.id):
            raise HTTPException(status_code=403, detail="You can only update your own deals")
        
        # Update commitment
        update_data = {
            'seller_commitment_level': commitment_data.commitment_level,
            'commitment_proof_url': commitment_data.commitment_proof_url,
            'commitment_verified_at': datetime.now(timezone.utc).isoformat(),
            'commitment_verified_by': str(user.id)
        }
        
        result = supabase.table('deals').update(update_data).eq('id', deal_id).execute()
        
        # Update verified listing count if signed_listing
        if commitment_data.commitment_level == 'signed_listing':
            try:
                supabase.rpc('calculate_broker_reputation', {'target_broker_id': str(user.id)}).execute()
            except Exception as calc_error:
                logger.warning(f"Reputation calculation failed: {str(calc_error)}")
        
        return {
            "success": True,
            "message": "Seller commitment updated",
            "deal": result.data[0] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating commitment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update seller commitment"
        )
