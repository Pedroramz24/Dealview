"""Deal management routes - Ready for Marketplace publishing features."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import List
from datetime import datetime, timezone
import uuid
import logging

from models import Deal, DealCreate, DealUpdate, User, StageUpdate
from utils.auth_helpers import get_current_user, get_current_user_supabase, security
from utils.db import get_db, get_supabase

router = APIRouter(prefix="/deals", tags=["Deals"])
logger = logging.getLogger(__name__)


@router.post("", response_model=Deal)
async def create_deal(deal_data: DealCreate, current_user: User = Depends(get_current_user)):
    """Create a new deal."""
    db = get_db()
    deal = Deal(**deal_data.model_dump(), created_by=current_user.id)
    
    deal_dict = deal.model_dump()
    deal_dict['created_at'] = deal_dict['created_at'].isoformat()
    deal_dict['updated_at'] = deal_dict['updated_at'].isoformat()
    if deal_dict['last_contact']:
        deal_dict['last_contact'] = deal_dict['last_contact'].isoformat()
    
    await db.deals.insert_one(deal_dict)
    return deal


@router.get("", response_model=List[Deal])
async def get_deals(current_user: User = Depends(get_current_user)):
    """Get all deals for the current user."""
    db = get_db()
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    
    for deal in deals:
        if isinstance(deal.get('created_at'), str):
            deal['created_at'] = datetime.fromisoformat(deal['created_at'])
        if isinstance(deal.get('updated_at'), str):
            deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
        if deal.get('last_contact') and isinstance(deal['last_contact'], str):
            deal['last_contact'] = datetime.fromisoformat(deal['last_contact'])
    
    return deals


@router.get("/{deal_id}", response_model=Deal)
async def get_deal(deal_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific deal by ID."""
    db = get_db()
    deal_doc = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal_doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    if isinstance(deal_doc.get('created_at'), str):
        deal_doc['created_at'] = datetime.fromisoformat(deal_doc['created_at'])
    if isinstance(deal_doc.get('updated_at'), str):
        deal_doc['updated_at'] = datetime.fromisoformat(deal_doc['updated_at'])
    if deal_doc.get('last_contact') and isinstance(deal_doc['last_contact'], str):
        deal_doc['last_contact'] = datetime.fromisoformat(deal_doc['last_contact'])
    
    return Deal(**deal_doc)


@router.put("/{deal_id}", response_model=Deal)
async def update_deal(deal_id: str, deal_update: DealUpdate, current_user: User = Depends(get_current_user)):
    """Update a deal."""
    db = get_db()
    update_data = {k: v for k, v in deal_update.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.deals.update_one({"id": deal_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    deal_doc = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if isinstance(deal_doc.get('created_at'), str):
        deal_doc['created_at'] = datetime.fromisoformat(deal_doc['created_at'])
    if isinstance(deal_doc.get('updated_at'), str):
        deal_doc['updated_at'] = datetime.fromisoformat(deal_doc['updated_at'])
    if deal_doc.get('last_contact') and isinstance(deal_doc['last_contact'], str):
        deal_doc['last_contact'] = datetime.fromisoformat(deal_doc['last_contact'])
    
    return Deal(**deal_doc)


@router.delete("/{deal_id}")
async def delete_deal(deal_id: str, current_user: User = Depends(get_current_user)):
    """Delete a deal."""
    db = get_db()
    result = await db.deals.delete_one({"id": deal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted successfully"}


@router.post("/{deal_id}/upload-image")
async def upload_deal_image(deal_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload an image for a deal."""
    db = get_db()
    supabase = get_supabase()
    
    deal_doc = await db.deals.find_one({"id": deal_id})
    if not deal_doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    file_content = await file.read()
    file_path = f"deals/{deal_id}/{uuid.uuid4()}_{file.filename}"
    
    try:
        result = supabase.storage.from_("property-images").upload(file_path, file_content, {"content-type": file.content_type})
        public_url = supabase.storage.from_("property-images").get_public_url(file_path)
        
        await db.deals.update_one(
            {"id": deal_id},
            {"$set": {"primary_image_url": public_url}}
        )
        
        return {"url": public_url, "message": "Image uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/{deal_id}/upload-document")
async def upload_deal_document(deal_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload a document for a deal."""
    db = get_db()
    supabase = get_supabase()
    
    deal_doc = await db.deals.find_one({"id": deal_id})
    if not deal_doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    file_content = await file.read()
    file_path = f"deals/{deal_id}/documents/{uuid.uuid4()}_{file.filename}"
    
    try:
        result = supabase.storage.from_("deal-documents").upload(file_path, file_content, {"content-type": file.content_type})
        
        res = supabase.storage.from_("deal-documents").create_signed_url(file_path, 31536000)  # 1 year
        signed_url = res.get('signedURL') or res.get('signedUrl')
        
        document = {"name": file.filename, "url": signed_url, "path": file_path}
        
        await db.deals.update_one(
            {"id": deal_id},
            {"$push": {"documents": document}}
        )
        
        return {"document": document, "message": "Document uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.put("/{deal_id}/stage")
async def update_deal_stage(deal_id: str, stage_update: StageUpdate, current_user: User = Depends(get_current_user)):
    """Update deal stage."""
    db = get_db()
    result = await db.deals.update_one(
        {"id": deal_id},
        {"$set": {"stage": stage_update.stage, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Stage updated successfully"}


@router.put("/{deal_id}/move")
async def move_deal(
    deal_id: str,
    pipeline_id: str = Form(None),
    pipeline_stage_id: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Move a deal to a different stage or pipeline (Supabase version)."""
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
# MARKETPLACE PUBLISHING ENDPOINTS (TO BE ADDED IN PHASE 2)
# ============================================================
# @router.post("/{deal_id}/publish")
# async def publish_deal_to_marketplace(...)
# 
# @router.post("/{deal_id}/unpublish")
# async def unpublish_deal_from_marketplace(...)
#
# @router.get("/{deal_id}/marketplace-stats")
# async def get_deal_marketplace_performance(...)
