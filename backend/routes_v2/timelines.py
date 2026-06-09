"""
DealLinked CRM V2 - Deal Timeline Routes
Critical Dates Timeline Tracker for Under Contract properties
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta
import logging
import uuid

from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id

router = APIRouter(prefix="/deals", tags=["Timelines"])
logger = logging.getLogger(__name__)

DEFAULT_MILESTONES = [
    {"name": "Feasibility Start", "sort_order": 0},
    {"name": "Feasibility End", "sort_order": 1},
    {"name": "Loan Commitment", "sort_order": 2},
    {"name": "Title Clearance", "sort_order": 3},
    {"name": "Closing", "sort_order": 4},
]


class MilestoneCreate(BaseModel):
    name: str
    target_date: Optional[str] = None
    notes: Optional[str] = ""
    status: Optional[str] = "pending"
    sort_order: Optional[int] = None


class MilestoneUpdate(BaseModel):
    name: Optional[str] = None
    target_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None


class ReorderRequest(BaseModel):
    milestone_ids: List[str]


async def verify_deal_access(deal_id: str, user_id: str):
    """Verify user has access to the deal (owner or team member)."""
    supabase = get_supabase()
    deal = supabase.table('deals').select('owner_id, team_id').eq('id', deal_id).single().execute()
    if not deal.data:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    is_owner = deal.data['owner_id'] == user_id
    is_team = False
    if not is_owner and deal.data.get('team_id'):
        profile = supabase.table('user_profiles').select('team_id').eq('id', user_id).execute()
        is_team = profile.data and profile.data[0].get('team_id') == deal.data['team_id']
    
    if not is_owner and not is_team:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return deal.data, is_owner


@router.get("/{deal_id}/timeline")
async def get_timeline(
    deal_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all timeline milestones for a deal, sorted by target_date."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        await verify_deal_access(deal_id, user_id)
        
        result = supabase.table('deal_timelines') \
            .select('*') \
            .eq('deal_id', deal_id) \
            .execute()
        
        milestones = result.data or []
        
        # Fetch documents for all milestones
        milestone_ids = [m['id'] for m in milestones]
        docs_map = {}
        if milestone_ids:
            docs_result = supabase.table('milestone_documents') \
                .select('*') \
                .eq('deal_id', deal_id) \
                .order('created_at') \
                .execute()
            for doc in (docs_result.data or []):
                mid = doc['milestone_id']
                if mid not in docs_map:
                    docs_map[mid] = []
                docs_map[mid].append(doc)
        
        # Attach documents to milestones
        for m in milestones:
            m['documents'] = docs_map.get(m['id'], [])
        
        # Sort: milestones with dates first (ascending), then those without dates
        def sort_key(m):
            if m.get('target_date'):
                return (0, m['target_date'])
            return (1, m.get('sort_order', 999))
        
        milestones.sort(key=sort_key)
        
        return {"success": True, "milestones": milestones}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get timeline error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch timeline")


@router.post("/{deal_id}/timeline")
async def create_milestone(
    deal_id: str,
    milestone: MilestoneCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new milestone for a deal's timeline."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        deal_data, is_owner = await verify_deal_access(deal_id, user_id)
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only deal owner can modify timeline")
        
        # Get max sort_order if not provided
        if milestone.sort_order is None:
            existing = supabase.table('deal_timelines') \
                .select('sort_order') \
                .eq('deal_id', deal_id) \
                .order('sort_order', desc=True) \
                .limit(1) \
                .execute()
            milestone.sort_order = (existing.data[0]['sort_order'] + 1) if existing.data else 0
        
        data = {
            "deal_id": deal_id,
            "name": milestone.name,
            "notes": milestone.notes or "",
            "status": milestone.status or "pending",
            "sort_order": milestone.sort_order,
        }
        if milestone.target_date:
            data["target_date"] = milestone.target_date
        
        result = supabase.table('deal_timelines').insert(data).execute()
        
        return {"success": True, "milestone": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create milestone error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create milestone")


@router.post("/{deal_id}/timeline/initialize")
async def initialize_timeline(
    deal_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Initialize default milestones for a deal's timeline."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        deal_data, is_owner = await verify_deal_access(deal_id, user_id)
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only deal owner can modify timeline")
        
        # Check if milestones already exist
        existing = supabase.table('deal_timelines') \
            .select('id') \
            .eq('deal_id', deal_id) \
            .execute()
        
        if existing.data:
            return {"success": True, "message": "Timeline already initialized", "milestones": []}
        
        milestones = []
        for m in DEFAULT_MILESTONES:
            data = {
                "deal_id": deal_id,
                "name": m["name"],
                "sort_order": m["sort_order"],
                "status": "pending",
                "notes": "",
            }
            result = supabase.table('deal_timelines').insert(data).execute()
            if result.data:
                milestones.append(result.data[0])
        
        return {"success": True, "milestones": milestones}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Initialize timeline error: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize timeline")


@router.put("/{deal_id}/timeline/{milestone_id}")
async def update_milestone(
    deal_id: str,
    milestone_id: str,
    milestone: MilestoneUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a timeline milestone."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        deal_data, is_owner = await verify_deal_access(deal_id, user_id)
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only deal owner can modify timeline")
        
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        if milestone.name is not None:
            update_data["name"] = milestone.name
        if milestone.target_date is not None:
            update_data["target_date"] = milestone.target_date if milestone.target_date else None
        if milestone.notes is not None:
            update_data["notes"] = milestone.notes
        if milestone.status is not None:
            update_data["status"] = milestone.status
        if milestone.sort_order is not None:
            update_data["sort_order"] = milestone.sort_order
        
        result = supabase.table('deal_timelines') \
            .update(update_data) \
            .eq('id', milestone_id) \
            .eq('deal_id', deal_id) \
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        return {"success": True, "milestone": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update milestone error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update milestone")


@router.delete("/{deal_id}/timeline/{milestone_id}")
async def delete_milestone(
    deal_id: str,
    milestone_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a timeline milestone."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        deal_data, is_owner = await verify_deal_access(deal_id, user_id)
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only deal owner can modify timeline")
        
        supabase.table('deal_timelines') \
            .delete() \
            .eq('id', milestone_id) \
            .eq('deal_id', deal_id) \
            .execute()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete milestone error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete milestone")


@router.put("/{deal_id}/timeline-reorder")
async def reorder_milestones(
    deal_id: str,
    request: ReorderRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reorder timeline milestones."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        deal_data, is_owner = await verify_deal_access(deal_id, user_id)
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only deal owner can modify timeline")
        
        for idx, milestone_id in enumerate(request.milestone_ids):
            supabase.table('deal_timelines') \
                .update({"sort_order": idx, "updated_at": datetime.utcnow().isoformat()}) \
                .eq('id', milestone_id) \
                .eq('deal_id', deal_id) \
                .execute()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reorder milestones error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reorder milestones")


@router.post("/{deal_id}/timeline/{milestone_id}/documents")
async def upload_milestone_document(
    deal_id: str,
    milestone_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload a document for a specific milestone."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        deal_data, is_owner = await verify_deal_access(deal_id, user_id)
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only deal owner can upload milestone documents")
        
        # Verify milestone exists
        milestone = supabase.table('deal_timelines') \
            .select('id') \
            .eq('id', milestone_id) \
            .eq('deal_id', deal_id) \
            .single() \
            .execute()
        if not milestone.data:
            raise HTTPException(status_code=404, detail="Milestone not found")
        
        content = await file.read()
        file_size = len(content)
        
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'unknown'
        file_type_map = {
            'pdf': 'pdf', 'doc': 'doc', 'docx': 'doc',
            'xls': 'xls', 'xlsx': 'xls', 'csv': 'xls',
            'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'gif': 'img',
        }
        file_type = file_type_map.get(file_ext, 'other')
        
        storage_path = f"milestones/{deal_id}/{milestone_id}/{uuid.uuid4()}-{file.filename}"
        
        supabase.storage.from_('deal-documents').upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type}
        )
        
        file_url = supabase.storage.from_('deal-documents').get_public_url(storage_path)
        
        doc_data = {
            "id": str(uuid.uuid4()),
            "milestone_id": milestone_id,
            "deal_id": deal_id,
            "file_name": file.filename,
            "file_url": file_url,
            "file_type": file_type,
            "file_size": file_size,
            "uploaded_by": user_id,
        }
        
        result = supabase.table('milestone_documents').insert(doc_data).execute()
        
        return {
            "success": True,
            "document": result.data[0] if result.data else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload milestone document error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")


@router.delete("/{deal_id}/timeline/{milestone_id}/documents/{document_id}")
async def delete_milestone_document(
    deal_id: str,
    milestone_id: str,
    document_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a document from a milestone."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        deal_data, is_owner = await verify_deal_access(deal_id, user_id)
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="Only deal owner can delete milestone documents")
        
        # Get doc to find storage path
        doc = supabase.table('milestone_documents') \
            .select('file_url') \
            .eq('id', document_id) \
            .eq('milestone_id', milestone_id) \
            .single() \
            .execute()
        
        if doc.data and doc.data.get('file_url'):
            try:
                file_url = doc.data['file_url']
                storage_path = file_url.split('/deal-documents/')[-1]
                supabase.storage.from_('deal-documents').remove([storage_path])
            except Exception:
                pass
        
        supabase.table('milestone_documents') \
            .delete() \
            .eq('id', document_id) \
            .eq('milestone_id', milestone_id) \
            .execute()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete milestone document error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")
