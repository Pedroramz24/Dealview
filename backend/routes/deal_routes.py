"""Deal management routes - Fully migrated to Supabase."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import List
from datetime import datetime, timezone
import uuid
import logging

from models import Deal, DealCreate, DealUpdate, User, StageUpdate
from models import PublishDealRequest, PublishDealResponse, calculate_completeness_score
from utils.auth_helpers import get_current_user, get_current_user_supabase, security
from utils.db import get_supabase
from middleware import require_broker

router = APIRouter(prefix="/deals", tags=["Deals"])
logger = logging.getLogger(__name__)


@router.post("", response_model=Deal)
async def create_deal(deal_data: DealCreate, current_user: User = Depends(get_current_user)):
    """Create a new deal in Supabase."""
    supabase = get_supabase()
    
    # Generate UUID for the deal
    deal_id = str(uuid.uuid4())
    
    # Map Pydantic model fields to Supabase schema
    # Only include fields that exist in the database
    deal_dict = {
        'id': deal_id,
        'owner_id': str(current_user.id),
        'title': deal_data.title,
        'address': deal_data.address,
        'city': deal_data.city,
        'state': deal_data.state,
        'zip_code': deal_data.zip_code,
        'asset_type': deal_data.asset_type,
        'status': deal_data.status,
        'stage': deal_data.stage,
        'priority': deal_data.priority,
        'owner_visibility': deal_data.owner_visibility,
        'description': deal_data.description,
        'latitude': deal_data.latitude,
        'longitude': deal_data.longitude,
        'display_on_map': deal_data.display_on_map,
        'asking_price': deal_data.asking_price,  # Mapped to asking_price after schema fix
        'size': deal_data.size,  # Mapped to size (not building_size)
        'lot_size': deal_data.lot_size,
        'year_built': deal_data.year_built,
        'zoning': deal_data.zoning,
        'occupancy': deal_data.occupancy,
        'parking_spaces': deal_data.parking_spaces,
        'noi': deal_data.noi,
        'cap_rate': deal_data.cap_rate,
        'primary_contact_id': deal_data.primary_contact_id,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Remove None values to avoid inserting nulls for optional fields
    deal_dict = {k: v for k, v in deal_dict.items() if v is not None}
    
    try:
        result = supabase.table('deals').insert(deal_dict).execute()
        return Deal(**result.data[0])
    except Exception as e:
        logger.error(f"Error creating deal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create deal: {str(e)}")


@router.get("", response_model=List[Deal])
async def get_deals(current_user: User = Depends(get_current_user)):
    """Get all deals for the current user from Supabase."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('deals').select('*').eq('owner_id', str(current_user.id)).execute()
        return [Deal(**deal) for deal in result.data]
    except Exception as e:
        logger.error(f"Error fetching deals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch deals: {str(e)}")


@router.get("/{deal_id}", response_model=Deal)
async def get_deal(deal_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific deal by ID from Supabase."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('deals').select('*').eq('id', deal_id).eq('owner_id', str(current_user.id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        return Deal(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching deal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch deal: {str(e)}")


@router.put("/{deal_id}", response_model=Deal)
async def update_deal(deal_id: str, deal_update: DealUpdate, current_user: User = Depends(get_current_user)):
    """Update a deal in Supabase."""
    supabase = get_supabase()
    
    try:
        # Prepare update data
        update_data = {k: v for k, v in deal_update.model_dump().items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Update deal
        result = supabase.table('deals').update(update_data).eq('id', deal_id).eq('owner_id', str(current_user.id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        return Deal(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating deal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update deal: {str(e)}")


@router.delete("/{deal_id}")
async def delete_deal(deal_id: str, current_user: User = Depends(get_current_user)):
    """Delete a deal from Supabase."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('deals').delete().eq('id', deal_id).eq('owner_id', str(current_user.id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        return {"message": "Deal deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting deal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete deal: {str(e)}")


@router.post("/{deal_id}/upload-image")
async def upload_deal_image(deal_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload an image for a deal."""
    supabase = get_supabase()
    
    try:
        # Verify deal exists and user owns it
        deal_result = supabase.table('deals').select('id').eq('id', deal_id).eq('owner_id', str(current_user.id)).execute()
        if not deal_result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        # Upload file to Supabase Storage
        file_content = await file.read()
        file_path = f"deals/{deal_id}/{uuid.uuid4()}_{file.filename}"
        
        result = supabase.storage.from_("property-images").upload(file_path, file_content, {"content-type": file.content_type})
        public_url = supabase.storage.from_("property-images").get_public_url(file_path)
        
        # Update deal with image URL
        supabase.table('deals').update({"image_url": public_url}).eq('id', deal_id).execute()
        
        return {"url": public_url, "message": "Image uploaded successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/{deal_id}/upload-document")
async def upload_deal_document(deal_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload a document for a deal."""
    supabase = get_supabase()
    
    try:
        # Verify deal exists and user owns it
        deal_result = supabase.table('deals').select('id, image_urls').eq('id', deal_id).eq('owner_id', str(current_user.id)).execute()
        if not deal_result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        # Upload file to Supabase Storage
        file_content = await file.read()
        file_path = f"deals/{deal_id}/documents/{uuid.uuid4()}_{file.filename}"
        
        result = supabase.storage.from_("deal-documents").upload(file_path, file_content, {"content-type": file.content_type})
        
        # Create signed URL (1 year expiry)
        res = supabase.storage.from_("deal-documents").create_signed_url(file_path, 31536000)
        signed_url = res.get('signedURL') or res.get('signedUrl')
        
        document = {"name": file.filename, "url": signed_url, "path": file_path}
        
        # For now, we'll store documents in a JSON field (image_urls is actually for multiple images)
        # You may want to create a separate documents table later
        
        return {"document": document, "message": "Document uploaded successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.put("/{deal_id}/stage")
async def update_deal_stage(deal_id: str, stage_update: StageUpdate, current_user: User = Depends(get_current_user)):
    """Update deal stage in Supabase."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('deals').update({
            'stage': stage_update.stage,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', deal_id).eq('owner_id', str(current_user.id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        return {"message": "Stage updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating stage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update stage: {str(e)}")


@router.put("/{deal_id}/move")
async def move_deal(
    deal_id: str,
    pipeline_id: str = Form(None),
    pipeline_stage_id: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Move a deal to a different stage or pipeline (Supabase)."""
    supabase = get_supabase()
    try:
        user = await get_current_user_supabase(credentials)
        
        # Get current deal
        deal_response = supabase.table('deals').select(
            'id, pipeline_id'
        ).eq('id', deal_id).eq('owner_id', user.id).execute()
        
        if not deal_response.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        current_deal = deal_response.data[0]
        
        # If moving to different pipeline, update both fields
        update_data = {
            'pipeline_stage_id': pipeline_stage_id
        }
        
        if pipeline_id and pipeline_id != current_deal['pipeline_id']:
            update_data['pipeline_id'] = pipeline_id
        
        # Update deal
        response = supabase.table('deals').update(
            update_data
        ).eq('id', deal_id).eq('owner_id', user.id).execute()
        
        return {
            "success": True,
            "deal": response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moving deal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# MARKETPLACE PUBLISHING ENDPOINTS
# ============================================================

@router.post("/{deal_id}/publish", response_model=PublishDealResponse)
async def publish_deal_to_marketplace(
    deal_id: str,
    publish_data: PublishDealRequest,
    user = Depends(get_current_user_supabase)
):
    """
    Publish a deal to the Marketplace with comprehensive data.
    Calculates completeness score and blocks publishing if below 80%.
    Requires admin approval before going live.
    """
    supabase = get_supabase()
    
    try:
        # Verify user owns this deal
        deal_result = supabase.table('deals').select('*').eq('id', deal_id).single().execute()
        
        if not deal_result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        if deal_result.data['owner_id'] != str(user.id):
            raise HTTPException(status_code=403, detail="You can only publish your own deals")
        
        # Prepare update data with all new fields
        update_data = publish_data.model_dump(exclude_none=False)
        
        # Calculate completeness score
        deal_data = {**deal_result.data, **update_data}
        completeness_score = calculate_completeness_score(deal_data)
        
        # Block if completeness < 80%
        if completeness_score < 80:
            raise HTTPException(
                status_code=400,
                detail=f"Deal completeness is {completeness_score}%. Must be at least 80% to publish."
            )
        
        # Update deal with marketplace data
        update_data['completeness_score'] = completeness_score
        update_data['is_published'] = False  # Requires approval
        update_data['approval_status'] = 'pending'
        update_data['published_at'] = datetime.now(timezone.utc).isoformat()
        update_data['published_by'] = str(user.id)
        
        result = supabase.table('deals').update(update_data).eq('id', deal_id).execute()
        
        return PublishDealResponse(
            success=True,
            message="Deal submitted for marketplace approval",
            completeness_score=completeness_score,
            approval_status="pending"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing deal: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
