"""
Investor Portal - Intelligence & Analytics
Deal-centric and investor-centric engagement data for brokers.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id
import logging

router = APIRouter(prefix="/portals", tags=["Portal Intelligence"])
logger = logging.getLogger(__name__)


async def _verify_broker_portal(portal_id: str, user_id: str):
    """Verify the broker owns this portal. Returns portal data."""
    supabase = get_supabase()
    result = supabase.table('portals').select('id, broker_id, name').eq('id', portal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Portal not found")
    if result.data[0]['broker_id'] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return result.data[0]


@router.get("/{portal_id}/deals/{deal_id}/intelligence")
async def get_deal_intelligence(
    portal_id: str,
    deal_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Deal-centric intelligence: ranked list of investors who engaged with this deal.
    Shows view count, saved status, and documents downloaded per investor."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await _verify_broker_portal(portal_id, user_id)

    # Verify deal is in this portal
    link = supabase.table('portal_deals').select('id').eq('portal_id', portal_id).eq('deal_id', deal_id).execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="Deal not found in this portal")

    # Get all members of this portal
    members = supabase.table('portal_members').select('id, name, email, status').eq('portal_id', portal_id).execute()
    member_map = {m['id']: m for m in (members.data or [])}

    # Get all activity for this deal in this portal
    activity = supabase.table('portal_activity').select(
        'member_id, action, document_id, created_at'
    ).eq('portal_id', portal_id).eq('deal_id', deal_id).execute()

    # Get saved deals for this deal
    saved = supabase.table('portal_saved_deals').select('member_id').eq(
        'portal_id', portal_id
    ).eq('deal_id', deal_id).execute()
    saved_member_ids = set(r['member_id'] for r in (saved.data or []))

    # Aggregate per investor
    investor_stats = {}
    for event in (activity.data or []):
        mid = event['member_id']
        if mid not in investor_stats:
            investor_stats[mid] = {'view_count': 0, 'downloads': []}
        if event['action'] == 'view_deal':
            investor_stats[mid]['view_count'] += 1
        elif event['action'] == 'download_document':
            investor_stats[mid]['downloads'].append(event.get('document_id'))

    # Build ranked list
    investors = []
    for mid, member in member_map.items():
        stats = investor_stats.get(mid, {'view_count': 0, 'downloads': []})
        is_saved = mid in saved_member_ids
        # Engagement score: views + saves*3 + downloads*5
        score = stats['view_count'] + (3 if is_saved else 0) + len(stats['downloads']) * 5
        investors.append({
            'member_id': mid,
            'name': member['name'],
            'email': member.get('email'),
            'status': member['status'],
            'view_count': stats['view_count'],
            'is_saved': is_saved,
            'download_count': len(stats['downloads']),
            'engagement_score': score
        })

    # Sort by engagement score descending
    investors.sort(key=lambda x: x['engagement_score'], reverse=True)

    return {
        "success": True,
        "deal_id": deal_id,
        "investors": investors,
        "total_views": sum(i['view_count'] for i in investors),
        "total_saves": sum(1 for i in investors if i['is_saved']),
        "total_downloads": sum(i['download_count'] for i in investors)
    }


@router.get("/members/{member_id}/profile")
async def get_investor_profile(
    member_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Investor-centric intelligence: cross-portal behavioral profile.
    Shows which portals they belong to, deals viewed, deals saved, docs downloaded."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)

    # Get the member
    member = supabase.table('portal_members').select('*').eq('id', member_id).execute()
    if not member.data:
        raise HTTPException(status_code=404, detail="Member not found")

    member_data = member.data[0]

    # Verify broker owns the portal this member belongs to
    portal = supabase.table('portals').select('id, name, broker_id').eq('id', member_data['portal_id']).execute()
    if not portal.data or portal.data[0]['broker_id'] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Also find this investor in other portals by name+email (cross-portal)
    all_memberships = []
    if member_data.get('email'):
        other = supabase.table('portal_members').select(
            'id, portal_id, name, status, invited_at, activated_at'
        ).eq('email', member_data['email']).execute()
        for m in (other.data or []):
            # Verify broker owns each portal
            p = supabase.table('portals').select('id, name, broker_id').eq('id', m['portal_id']).execute()
            if p.data and p.data[0]['broker_id'] == user_id:
                all_memberships.append({
                    'member_id': m['id'],
                    'portal_id': m['portal_id'],
                    'portal_name': p.data[0]['name'],
                    'status': m['status'],
                    'joined': m.get('activated_at') or m.get('invited_at')
                })
    else:
        # No email — only this membership
        all_memberships.append({
            'member_id': member_data['id'],
            'portal_id': member_data['portal_id'],
            'portal_name': portal.data[0]['name'],
            'status': member_data['status'],
            'joined': member_data.get('activated_at') or member_data.get('invited_at')
        })

    # Collect member IDs across portals for this investor
    all_member_ids = [m['member_id'] for m in all_memberships]

    # Get all activity across portals
    activity = supabase.table('portal_activity').select(
        'action, deal_id, document_id, portal_id, created_at'
    ).in_('member_id', all_member_ids).order('created_at', desc=True).execute()

    # Get saved deals
    saved = supabase.table('portal_saved_deals').select(
        'deal_id, portal_id'
    ).in_('member_id', all_member_ids).execute()

    # Get deal titles for context
    deal_ids = list(set(
        [a['deal_id'] for a in (activity.data or []) if a.get('deal_id')] +
        [s['deal_id'] for s in (saved.data or [])]
    ))
    deal_titles = {}
    if deal_ids:
        deals = supabase.table('deals').select('id, title, asset_type, city, state').in_('id', deal_ids).execute()
        for d in (deals.data or []):
            deal_titles[d['id']] = {
                'title': d.get('title', 'Untitled'),
                'asset_type': d.get('asset_type'),
                'location': f"{d.get('city', '')}, {d.get('state', '')}".strip(', ')
            }

    # Aggregate deal views
    deal_views = {}
    doc_downloads = []
    for event in (activity.data or []):
        did = event.get('deal_id')
        if event['action'] == 'view_deal' and did:
            if did not in deal_views:
                deal_views[did] = 0
            deal_views[did] += 1
        elif event['action'] == 'download_document':
            doc_downloads.append({
                'deal_id': did,
                'document_id': event.get('document_id'),
                'downloaded_at': event['created_at']
            })

    # Build viewed deals list sorted by view count
    viewed_deals = []
    for did, count in sorted(deal_views.items(), key=lambda x: x[1], reverse=True):
        info = deal_titles.get(did, {})
        viewed_deals.append({
            'deal_id': did,
            'title': info.get('title', 'Unknown'),
            'asset_type': info.get('asset_type'),
            'location': info.get('location'),
            'view_count': count
        })

    # Build saved deals list
    saved_deals = []
    for s in (saved.data or []):
        info = deal_titles.get(s['deal_id'], {})
        saved_deals.append({
            'deal_id': s['deal_id'],
            'title': info.get('title', 'Unknown'),
            'asset_type': info.get('asset_type'),
            'location': info.get('location')
        })

    return {
        "success": True,
        "member": {
            "id": member_data['id'],
            "name": member_data['name'],
            "email": member_data.get('email'),
            "status": member_data['status'],
            "invited_at": member_data.get('invited_at'),
            "activated_at": member_data.get('activated_at')
        },
        "portals": all_memberships,
        "deals_viewed": viewed_deals,
        "deals_saved": saved_deals,
        "documents_downloaded": doc_downloads,
        "summary": {
            "total_portals": len(all_memberships),
            "total_deals_viewed": len(viewed_deals),
            "total_views": sum(deal_views.values()),
            "total_deals_saved": len(saved_deals),
            "total_downloads": len(doc_downloads)
        }
    }
