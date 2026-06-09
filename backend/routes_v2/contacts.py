"""
DealLinked CRM V2 - Contacts Routes
CRUD operations for contacts with smart tags
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import logging
import uuid

from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id

router = APIRouter(prefix="/contacts", tags=["Contacts"])
logger = logging.getLogger(__name__)


# ============================================================================
# MODELS
# ============================================================================

class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    owner_address: Optional[str] = None
    contact_type: Optional[str] = "Buyer"
    contact_types: Optional[List[str]] = None
    asset_type_focus: Optional[List[str]] = None
    markets: Optional[List[str]] = None
    status: Optional[str] = "Active"
    tag_ids: Optional[List[str]] = None
    lead_source: Optional[str] = None
    last_follow_up: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    owner_address: Optional[str] = None
    contact_type: Optional[str] = None
    contact_types: Optional[List[str]] = None
    asset_type_focus: Optional[List[str]] = None
    markets: Optional[List[str]] = None
    status: Optional[str] = None
    tag_ids: Optional[List[str]] = None
    lead_source: Optional[str] = None
    last_follow_up: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    notes: Optional[str] = None


class TagCreate(BaseModel):
    name: str
    color: Optional[str] = "#00b8d4"


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


# ============================================================================
# TAG ROUTES
# ============================================================================

@router.get("/tags")
async def list_tags(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all contact tags for current user"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        response = supabase.table('contact_tags').select('*').eq('owner_id', user_id).order('name').execute()
        
        return {
            "success": True,
            "tags": response.data or [],
            "count": len(response.data or [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List tags error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tags")


@router.post("/tags")
async def create_tag(
    tag: TagCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new contact tag"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        tag_data = {
            "id": str(uuid.uuid4()),
            "owner_id": user_id,
            "name": tag.name,
            "color": tag.color or "#00b8d4"
        }
        
        response = supabase.table('contact_tags').insert(tag_data).execute()
        
        return {
            "success": True,
            "tag": response.data[0] if response.data else None,
            "message": "Tag created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        if "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="Tag already exists")
        logger.error(f"Create tag error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create tag")


@router.put("/tags/{tag_id}")
async def update_tag(
    tag_id: str,
    tag: TagUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a contact tag"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership - catch invalid UUID or missing record
        try:
            existing = supabase.table('contact_tags').select('owner_id').eq('id', tag_id).maybe_single().execute()
        except Exception:
            raise HTTPException(status_code=404, detail="Tag not found")
        if not existing or not existing.data or existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        update_data = tag.model_dump(exclude_unset=True, exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase.table('contact_tags').update(update_data).eq('id', tag_id).execute()
        
        return {
            "success": True,
            "tag": response.data[0] if response.data else None,
            "message": "Tag updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update tag error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update tag")


@router.delete("/tags/{tag_id}")
async def delete_tag(
    tag_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a contact tag"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership - catch invalid UUID or missing record
        try:
            existing = supabase.table('contact_tags').select('owner_id').eq('id', tag_id).maybe_single().execute()
        except Exception:
            raise HTTPException(status_code=404, detail="Tag not found")
        if not existing or not existing.data or existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        supabase.table('contact_tags').delete().eq('id', tag_id).execute()
        
        return {
            "success": True,
            "message": "Tag deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete tag error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete tag")


# ============================================================================
# CONTACT ROUTES
# ============================================================================

@router.get("")
async def list_contacts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    contact_type: Optional[str] = None,
    status: Optional[str] = None,
    tag_id: Optional[str] = None,
    search: Optional[str] = None
):
    """List all contacts for current user"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Build query - also get linked deals count
        query = supabase.table('contacts').select(
            '*, contact_deal_links(deal_id)'
        ).eq('owner_id', user_id)
        
        # Apply filters
        if contact_type:
            query = query.eq('contact_type', contact_type)
        if status:
            query = query.eq('status', status)
        if tag_id:
            query = query.contains('tag_ids', [tag_id])
        if search:
            query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%,company.ilike.%{search}%")
        
        query = query.order('name')
        
        response = query.execute()
        
        # Add linked deals count to each contact
        contacts = response.data or []
        for contact in contacts:
            contact['linked_deals_count'] = len(contact.get('contact_deal_links', []))
            # Remove the nested array, just keep the count
            del contact['contact_deal_links']
        
        return {
            "success": True,
            "contacts": contacts,
            "count": len(contacts)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List contacts error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch contacts")


@router.get("/{contact_id}")
async def get_contact(
    contact_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific contact with linked deals"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Get contact with linked deals - don't use single() to avoid exception on no rows
        response = supabase.table('contacts').select(
            '*, contact_deal_links(*, deals(id, title, address, asset_type, asking_price, status))'
        ).eq('id', contact_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        contact = response.data[0]
        if contact['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Flatten linked deals
        linked_deals = []
        for link in contact.get('contact_deal_links', []):
            if link.get('deals'):
                deal = link['deals']
                deal['role'] = link.get('role')
                linked_deals.append(deal)
        contact['linked_deals'] = linked_deals
        del contact['contact_deal_links']
        
        # Get tags details
        if contact.get('tag_ids'):
            tags_response = supabase.table('contact_tags').select('*').in_('id', contact['tag_ids']).execute()
            contact['tags'] = tags_response.data or []
        else:
            contact['tags'] = []
        
        return {
            "success": True,
            "contact": contact
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get contact error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch contact")


@router.post("")
async def create_contact(
    contact: ContactCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new contact"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        contact_data = {
            "id": str(uuid.uuid4()),
            "owner_id": user_id,
            "name": contact.name,
            "email": contact.email,
            "phone": contact.phone,
            "company": contact.company,
            "title": contact.title,
            "owner_address": contact.owner_address,
            "contact_type": contact.contact_type or "Buyer",
            "contact_types": contact.contact_types or [],
            "asset_type_focus": contact.asset_type_focus or [],
            "markets": contact.markets or [],
            "status": contact.status or "Active",
            "tag_ids": contact.tag_ids or [],
            "lead_source": contact.lead_source,
            "last_follow_up": contact.last_follow_up.isoformat() if contact.last_follow_up else None,
            "next_follow_up": contact.next_follow_up.isoformat() if contact.next_follow_up else None,
            "notes": contact.notes
        }
        
        response = supabase.table('contacts').insert(contact_data).execute()
        
        return {
            "success": True,
            "contact": response.data[0] if response.data else None,
            "message": "Contact created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create contact error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create contact")


@router.put("/{contact_id}")
async def update_contact(
    contact_id: str,
    contact: ContactUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a contact"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership - don't use single() to avoid exception on no rows
        existing = supabase.table('contacts').select('owner_id').eq('id', contact_id).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        if existing.data[0]['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_data = contact.model_dump(exclude_unset=True)
        
        # Handle datetime fields
        if 'last_follow_up' in update_data and update_data['last_follow_up']:
            update_data['last_follow_up'] = update_data['last_follow_up'].isoformat()
        if 'next_follow_up' in update_data and update_data['next_follow_up']:
            update_data['next_follow_up'] = update_data['next_follow_up'].isoformat()
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase.table('contacts').update(update_data).eq('id', contact_id).execute()
        
        return {
            "success": True,
            "contact": response.data[0] if response.data else None,
            "message": "Contact updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update contact error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update contact")


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a contact"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership - don't use single() to avoid exception on no rows
        existing = supabase.table('contacts').select('owner_id').eq('id', contact_id).execute()
        if not existing.data or len(existing.data) == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        if existing.data[0]['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete contact (cascade will handle links)
        supabase.table('contacts').delete().eq('id', contact_id).execute()
        
        return {
            "success": True,
            "message": "Contact deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete contact error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete contact")



# ============================================================================
# BULK IMPORT
# ============================================================================

class BulkContactCreate(BaseModel):
    contacts: List[ContactCreate]

@router.post("/bulk-import")
async def bulk_import_contacts(
    bulk: BulkContactCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Bulk import contacts from CSV data"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        created = 0
        skipped = 0
        errors = []
        
        for contact in bulk.contacts:
            try:
                contact_data = {
                    "id": str(uuid.uuid4()),
                    "owner_id": user_id,
                    "name": contact.name,
                    "email": contact.email,
                    "phone": contact.phone,
                    "company": contact.company,
                    "contact_type": contact.contact_type or "Buyer",
                    "status": contact.status or "Active",
                    "notes": contact.notes,
                    "tag_ids": contact.tag_ids or [],
                }
                supabase.table('contacts').insert(contact_data).execute()
                created += 1
            except Exception as e:
                skipped += 1
                errors.append(f"{contact.name}: {str(e)[:80]}")
        
        return {
            "success": True,
            "created": created,
            "skipped": skipped,
            "errors": errors[:10],
            "message": f"Imported {created} contacts ({skipped} skipped)"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk import error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to import contacts")
