"""
DealLinked CRM V2 - Deals Routes
CRUD operations for deals with all financial fields
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi import UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import logging
import uuid

from utils.db import get_supabase
from utils.auth_helpers import security

router = APIRouter(prefix="/deals", tags=["Deals"])
logger = logging.getLogger(__name__)


# ============================================================================
# MODELS
# ============================================================================

class DealCreate(BaseModel):
    title: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    asset_type: Optional[str] = None
    asking_price: Optional[float] = None
    size_sqft: Optional[float] = None
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    occupancy: Optional[float] = None
    zoning: Optional[str] = None
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    annual_income: Optional[float] = None
    annual_expenses: Optional[float] = None
    pipeline_id: Optional[str] = None
    pipeline_stage_id: Optional[str] = None
    status: Optional[str] = "active"
    notes: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None


class DealUpdate(BaseModel):
    title: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    asset_type: Optional[str] = None
    asking_price: Optional[float] = None
    size_sqft: Optional[float] = None
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    occupancy: Optional[float] = None
    zoning: Optional[str] = None
    noi: Optional[float] = None
    cap_rate: Optional[float] = None
    annual_income: Optional[float] = None
    annual_expenses: Optional[float] = None
    pipeline_id: Optional[str] = None
    pipeline_stage_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: Optional[List[str]] = None


class StageUpdate(BaseModel):
    pipeline_stage_id: str


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def get_user_id(credentials: HTTPAuthorizationCredentials) -> str:
    """Extract user ID from Supabase token"""
    supabase = get_supabase()
    user_response = supabase.auth.get_user(credentials.credentials)
    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_response.user.id


async def get_user_team_id(user_id: str) -> Optional[str]:
    """Get user's team ID"""
    supabase = get_supabase()
    try:
        response = supabase.table('user_profiles').select('team_id').eq('id', user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0].get('team_id')
        return None
    except Exception:
        return None


# ============================================================================
# ROUTES
# ============================================================================

@router.get("")
async def list_deals(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    status: Optional[str] = None,
    asset_type: Optional[str] = None,
    pipeline_id: Optional[str] = None,
    has_location: Optional[bool] = None
):
    """List all deals for current user"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Build query
        query = supabase.table('deals').select('*').eq('owner_id', user_id)
        
        # Apply filters
        if status:
            query = query.eq('status', status)
        if asset_type:
            query = query.eq('asset_type', asset_type)
        if pipeline_id:
            query = query.eq('pipeline_id', pipeline_id)
        if has_location:
            query = query.not_.is_('latitude', 'null').not_.is_('longitude', 'null')
        
        # Order by created_at descending
        query = query.order('created_at', desc=True)
        
        response = query.execute()
        
        return {
            "success": True,
            "deals": response.data or [],
            "count": len(response.data or [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List deals error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deals")


@router.get("/team")
async def list_team_deals(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    member_id: Optional[str] = None
):
    """List all deals from team members (excluding current user)"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        team_id = await get_user_team_id(user_id)
        
        if not team_id:
            return {
                "success": True,
                "deals": [],
                "count": 0,
                "message": "User is not part of a team"
            }
        
        # Get team members' deals (excluding current user)
        query = supabase.table('deals').select(
            '*, user_profiles!deals_owner_id_fkey(full_name, email, avatar_url)'
        ).eq('team_id', team_id).neq('owner_id', user_id)
        
        # Filter by specific team member if provided
        if member_id:
            query = query.eq('owner_id', member_id)
        
        # Only deals with location for map
        query = query.not_.is_('latitude', 'null').not_.is_('longitude', 'null')
        
        response = query.execute()
        
        return {
            "success": True,
            "deals": response.data or [],
            "count": len(response.data or [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List team deals error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch team deals")


@router.get("/{deal_id}")
async def get_deal(
    deal_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific deal by ID"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        team_id = await get_user_team_id(user_id)
        
        # Fetch deal with linked contacts
        response = supabase.table('deals').select(
            '*, contact_deal_links(*, contacts(*))'
        ).eq('id', deal_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        deal = response.data
        
        # Check access: owner or same team
        if deal['owner_id'] != user_id and deal.get('team_id') != team_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get documents
        docs_response = supabase.table('deal_documents').select('*').eq('deal_id', deal_id).execute()
        deal['documents'] = docs_response.data or []
        
        return {
            "success": True,
            "deal": deal
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get deal error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal")


@router.post("")
async def create_deal(
    deal: DealCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        team_id = await get_user_team_id(user_id)
        
        # If no pipeline specified, get default pipeline
        pipeline_id = deal.pipeline_id
        stage_id = deal.pipeline_stage_id
        
        if not pipeline_id:
            pipeline_response = supabase.table('pipelines').select('id').eq('owner_id', user_id).eq('is_default', True).execute()
            if pipeline_response.data and len(pipeline_response.data) > 0:
                pipeline_id = pipeline_response.data[0]['id']
                # Get first stage
                stage_response = supabase.table('pipeline_stages').select('id').eq('pipeline_id', pipeline_id).order('display_order').limit(1).execute()
                if stage_response.data:
                    stage_id = stage_response.data[0]['id']
        
        # Build deal data
        deal_data = {
            "id": str(uuid.uuid4()),
            "owner_id": user_id,
            "team_id": team_id,
            "title": deal.title,
            "address": deal.address,
            "city": deal.city,
            "state": deal.state,
            "zip_code": deal.zip_code,
            "latitude": deal.latitude,
            "longitude": deal.longitude,
            "asset_type": deal.asset_type,
            "asking_price": deal.asking_price,
            "size_sqft": deal.size_sqft,
            "lot_size": deal.lot_size,
            "year_built": deal.year_built,
            "occupancy": deal.occupancy,
            "zoning": deal.zoning,
            "noi": deal.noi,
            "cap_rate": deal.cap_rate,
            "annual_income": deal.annual_income,
            "annual_expenses": deal.annual_expenses,
            "pipeline_id": pipeline_id,
            "pipeline_stage_id": stage_id,
            "status": deal.status or "active",
            "notes": deal.notes,
            "image_url": deal.image_url,
            "image_urls": deal.image_urls
        }
        
        response = supabase.table('deals').insert(deal_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create deal")
        
        return {
            "success": True,
            "deal": response.data[0],
            "message": "Deal created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create deal error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal")


@router.put("/{deal_id}")
async def update_deal(
    deal_id: str,
    deal: DealUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        existing = supabase.table('deals').select('owner_id').eq('id', deal_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        if existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this deal")
        
        # Build update data (only non-None fields)
        update_data = deal.model_dump(exclude_unset=True, exclude_none=True)
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase.table('deals').update(update_data).eq('id', deal_id).execute()
        
        return {
            "success": True,
            "deal": response.data[0] if response.data else None,
            "message": "Deal updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update deal error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update deal")


@router.patch("/{deal_id}/stage")
async def update_deal_stage(
    deal_id: str,
    stage: StageUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update deal pipeline stage (for drag-and-drop)"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        existing = supabase.table('deals').select('owner_id').eq('id', deal_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        if existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this deal")
        
        response = supabase.table('deals').update({
            "pipeline_stage_id": stage.pipeline_stage_id
        }).eq('id', deal_id).execute()
        
        return {
            "success": True,
            "message": "Deal stage updated"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update stage error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update stage")


@router.delete("/{deal_id}")
async def delete_deal(
    deal_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        existing = supabase.table('deals').select('owner_id').eq('id', deal_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        if existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this deal")
        
        # Delete deal (cascade will handle documents and contact links)
        supabase.table('deals').delete().eq('id', deal_id).execute()
        
        return {
            "success": True,
            "message": "Deal deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete deal error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete deal")


@router.post("/{deal_id}/contacts/{contact_id}")
async def link_contact_to_deal(
    deal_id: str,
    contact_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    role: Optional[str] = None
):
    """Link a contact to a deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership of both deal and contact
        deal = supabase.table('deals').select('owner_id').eq('id', deal_id).single().execute()
        contact = supabase.table('contacts').select('owner_id').eq('id', contact_id).single().execute()
        
        if not deal.data or not contact.data:
            raise HTTPException(status_code=404, detail="Deal or contact not found")
        if deal.data['owner_id'] != user_id or contact.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create link
        link_data = {
            "id": str(uuid.uuid4()),
            "deal_id": deal_id,
            "contact_id": contact_id,
            "role": role
        }
        
        response = supabase.table('contact_deal_links').upsert(link_data).execute()
        
        return {
            "success": True,
            "message": "Contact linked to deal"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Link contact error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to link contact")


@router.delete("/{deal_id}/contacts/{contact_id}")
async def unlink_contact_from_deal(
    deal_id: str,
    contact_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Unlink a contact from a deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        deal = supabase.table('deals').select('owner_id').eq('id', deal_id).single().execute()
        if not deal.data or deal.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete link
        supabase.table('contact_deal_links').delete().eq('deal_id', deal_id).eq('contact_id', contact_id).execute()
        
        return {
            "success": True,
            "message": "Contact unlinked from deal"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unlink contact error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unlink contact")


@router.post("/{deal_id}/documents")
async def upload_document(
    deal_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload a document to a deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        deal = supabase.table('deals').select('owner_id').eq('id', deal_id).single().execute()
        if not deal.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        if deal.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Read file content
        content = await file.read()
        
        # Check file size (max 10MB)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max size is 10MB")
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{deal_id}/{str(uuid.uuid4())}.{file_ext}"
        
        # Upload to Supabase storage
        storage_response = supabase.storage.from_('deal-documents').upload(
            unique_filename,
            content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        file_url = supabase.storage.from_('deal-documents').get_public_url(unique_filename)
        
        # Save document record
        doc_data = {
            "id": str(uuid.uuid4()),
            "deal_id": deal_id,
            "file_name": file.filename,
            "file_url": file_url,
            "file_type": file_ext,
            "file_size": len(content),
            "uploaded_by": user_id
        }
        
        response = supabase.table('deal_documents').insert(doc_data).execute()
        
        return {
            "success": True,
            "document": response.data[0] if response.data else doc_data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload document error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.delete("/{deal_id}/documents/{document_id}")
async def delete_document(
    deal_id: str,
    document_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a document from a deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership of deal
        deal = supabase.table('deals').select('owner_id').eq('id', deal_id).single().execute()
        if not deal.data or deal.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get document to find file path
        doc = supabase.table('deal_documents').select('*').eq('id', document_id).single().execute()
        if not doc.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete from storage (if possible)
        try:
            file_url = doc.data.get('file_url', '')
            if 'deal-documents/' in file_url:
                file_path = file_url.split('deal-documents/')[-1]
                supabase.storage.from_('deal-documents').remove([file_path])
        except:
            pass  # Ignore storage deletion errors
        
        # Delete record
        supabase.table('deal_documents').delete().eq('id', document_id).execute()
        
        return {
            "success": True,
            "message": "Document deleted"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete document error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete document")
