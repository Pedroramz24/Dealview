"""
DealLinked CRM V2 - Teams Routes
Team management and collaboration
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import logging
import uuid

from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id

router = APIRouter(prefix="/teams", tags=["Teams"])
logger = logging.getLogger(__name__)


# ============================================================================
# MODELS
# ============================================================================

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class InviteMember(BaseModel):
    email: EmailStr
    role: Optional[str] = "member"  # owner, admin, member


class UpdateMemberRole(BaseModel):
    role: str  # admin, member


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


async def get_user_with_team(credentials: HTTPAuthorizationCredentials) -> dict:
    """Get user with their team info"""
    user_id = await get_user_id(credentials)
    supabase = get_supabase()
    
    try:
        profile = supabase.table('user_profiles').select('*').eq('id', user_id).execute()
        profile_data = profile.data[0] if profile.data else {}
    except Exception:
        profile_data = {}
    
    return {
        "id": user_id,
        "profile": profile_data,
        "team_id": profile_data.get('team_id') if profile_data else None
    }


# ============================================================================
# TEAM ROUTES
# ============================================================================

@router.get("")
async def get_my_team(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current user's team with members"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        team_id = user_data.get('team_id')
        
        if not team_id:
            return {
                "success": True,
                "team": None,
                "message": "User is not part of a team"
            }
        
        # Get team with members
        team_response = supabase.table('teams').select('*').eq('id', team_id).single().execute()
        
        if not team_response.data:
            return {
                "success": True,
                "team": None,
                "message": "Team not found"
            }
        
        team = team_response.data
        
        # Get team members with profiles
        members_response = supabase.table('team_members').select(
            '*, user_profiles(id, email, full_name, avatar_url, phone, company)'
        ).eq('team_id', team_id).execute()
        
        members = []
        for member in (members_response.data or []):
            profile = member.get('user_profiles', {})
            members.append({
                "id": member['id'],
                "user_id": member['user_id'],
                "role": member['role'],
                "joined_at": member['joined_at'],
                "email": profile.get('email'),
                "full_name": profile.get('full_name'),
                "avatar_url": profile.get('avatar_url'),
                "phone": profile.get('phone'),
                "company": profile.get('company')
            })
        
        team['members'] = members
        
        return {
            "success": True,
            "team": team
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get team error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch team")


@router.post("")
async def create_team(
    team: TeamCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new team (user becomes owner)"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        user_id = user_data['id']
        
        # Check if user already has a team
        if user_data.get('team_id'):
            raise HTTPException(status_code=400, detail="User is already part of a team")
        
        team_id = str(uuid.uuid4())
        
        # Create team
        team_data = {
            "id": team_id,
            "name": team.name,
            "description": team.description,
            "owner_id": user_id
        }
        
        team_response = supabase.table('teams').insert(team_data).execute()
        
        # Add user as owner member
        member_data = {
            "id": str(uuid.uuid4()),
            "team_id": team_id,
            "user_id": user_id,
            "role": "owner"
        }
        supabase.table('team_members').insert(member_data).execute()
        
        # Update user's team_id
        supabase.table('user_profiles').update({'team_id': team_id}).eq('id', user_id).execute()
        
        # Also update deals to have team_id
        supabase.table('deals').update({'team_id': team_id}).eq('owner_id', user_id).execute()
        
        return {
            "success": True,
            "team": team_response.data[0] if team_response.data else None,
            "message": "Team created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create team error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create team")


@router.put("")
async def update_team(
    team: TeamUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update team (owner/admin only)"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        user_id = user_data['id']
        team_id = user_data.get('team_id')
        
        if not team_id:
            raise HTTPException(status_code=400, detail="User is not part of a team")
        
        # Check if user is owner or admin
        membership = supabase.table('team_members').select('role').eq('team_id', team_id).eq('user_id', user_id).single().execute()
        if not membership.data or membership.data['role'] not in ['owner', 'admin']:
            raise HTTPException(status_code=403, detail="Only team owners/admins can update team")
        
        update_data = team.model_dump(exclude_unset=True, exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase.table('teams').update(update_data).eq('id', team_id).execute()
        
        return {
            "success": True,
            "team": response.data[0] if response.data else None,
            "message": "Team updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update team error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update team")


@router.get("/members")
async def list_team_members(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all team members with their deals stats"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        team_id = user_data.get('team_id')
        
        if not team_id:
            return {
                "success": True,
                "members": [],
                "message": "User is not part of a team"
            }
        
        # Get team members with profiles
        members_response = supabase.table('team_members').select(
            '*, user_profiles(id, email, full_name, avatar_url)'
        ).eq('team_id', team_id).execute()
        
        members = []
        for member in (members_response.data or []):
            profile = member.get('user_profiles', {})
            user_id = member['user_id']
            
            # Get deals stats for this member
            deals_response = supabase.table('deals').select('id, asking_price, status').eq('owner_id', user_id).execute()
            deals = deals_response.data or []
            
            total_deals = len(deals)
            active_deals = len([d for d in deals if d.get('status') == 'active'])
            total_value = sum([d.get('asking_price', 0) or 0 for d in deals])
            
            members.append({
                "id": member['id'],
                "user_id": user_id,
                "role": member['role'],
                "joined_at": member['joined_at'],
                "email": profile.get('email'),
                "full_name": profile.get('full_name'),
                "avatar_url": profile.get('avatar_url'),
                "stats": {
                    "total_deals": total_deals,
                    "active_deals": active_deals,
                    "total_value": total_value
                }
            })
        
        return {
            "success": True,
            "members": members
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List members error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch team members")


@router.get("/{team_id}/stats")
async def get_team_stats(
    team_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get team stats including shared deals"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        user_team_id = user_data.get('team_id')
        
        if not user_team_id or user_team_id != team_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all team deals (deals with this team_id)
        deals_response = supabase.table('deals').select(
            '*, user_profiles!deals_owner_id_fkey(full_name, email, avatar_url)'
        ).eq('team_id', team_id).order('created_at', desc=True).execute()
        
        team_deals = deals_response.data or []
        
        # Get team members
        members_response = supabase.table('team_members').select(
            '*, user_profiles!team_members_user_id_fkey(full_name, email, avatar_url)'
        ).eq('team_id', team_id).execute()
        members = members_response.data or []
        
        # Compute agent stats
        agent_stats = []
        for member in members:
            member_deals = [d for d in team_deals if d.get('owner_id') == member.get('user_id')]
            profile = member.get('user_profiles', {}) or {}
            agent_stats.append({
                "user_id": member.get('user_id'),
                "full_name": profile.get('full_name', ''),
                "email": profile.get('email', ''),
                "avatar_url": profile.get('avatar_url'),
                "role": member.get('role', 'agent'),
                "total_deals": len(member_deals),
                "total_value": sum(d.get('asking_price', 0) or 0 for d in member_deals)
            })
        
        # Team-level stats
        team_stats = {
            "total_members": len(members),
            "total_active_deals": len(team_deals),
            "total_pipeline_value": sum(d.get('asking_price', 0) or 0 for d in team_deals)
        }
        
        return {
            "success": True,
            "team_stats": team_stats,
            "agent_stats": agent_stats,
            "team_deals": team_deals
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get team stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch team stats")


@router.get("/members/{member_id}/deals")
async def get_member_deals(
    member_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all deals for a specific team member"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        team_id = user_data.get('team_id')
        
        if not team_id:
            raise HTTPException(status_code=400, detail="User is not part of a team")
        
        # Verify member is in same team
        member_profile = supabase.table('user_profiles').select('team_id').eq('id', member_id).single().execute()
        if not member_profile.data or member_profile.data.get('team_id') != team_id:
            raise HTTPException(status_code=403, detail="Member is not in your team")
        
        # Get member's deals
        deals_response = supabase.table('deals').select('*').eq('owner_id', member_id).order('created_at', desc=True).execute()
        
        return {
            "success": True,
            "deals": deals_response.data or [],
            "count": len(deals_response.data or [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get member deals error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch member deals")


@router.post("/invite")
async def invite_member(
    invite: InviteMember,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Invite a user to team by email"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        user_id = user_data['id']
        team_id = user_data.get('team_id')
        
        if not team_id:
            raise HTTPException(status_code=400, detail="User is not part of a team")
        
        # Check if user is owner or admin
        membership = supabase.table('team_members').select('role').eq('team_id', team_id).eq('user_id', user_id).single().execute()
        if not membership.data or membership.data['role'] not in ['owner', 'admin']:
            raise HTTPException(status_code=403, detail="Only team owners/admins can invite members")
        
        # Find user by email
        invitee = supabase.table('user_profiles').select('id, team_id').eq('email', invite.email).single().execute()
        
        if not invitee.data:
            raise HTTPException(status_code=404, detail="User not found with that email")
        
        if invitee.data.get('team_id'):
            raise HTTPException(status_code=400, detail="User is already part of a team")
        
        invitee_id = invitee.data['id']
        
        # Add to team_members
        member_data = {
            "id": str(uuid.uuid4()),
            "team_id": team_id,
            "user_id": invitee_id,
            "role": invite.role or "member"
        }
        supabase.table('team_members').insert(member_data).execute()
        
        # Update invitee's team_id
        supabase.table('user_profiles').update({'team_id': team_id}).eq('id', invitee_id).execute()
        
        # Update invitee's deals
        supabase.table('deals').update({'team_id': team_id}).eq('owner_id', invitee_id).execute()
        
        return {
            "success": True,
            "message": f"Successfully invited {invite.email} to the team"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Invite member error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to invite member")


@router.put("/members/{member_id}/role")
async def update_member_role(
    member_id: str,
    role_update: UpdateMemberRole,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a team member's role (owner only)"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        user_id = user_data['id']
        team_id = user_data.get('team_id')
        
        if not team_id:
            raise HTTPException(status_code=400, detail="User is not part of a team")
        
        # Check if user is owner
        membership = supabase.table('team_members').select('role').eq('team_id', team_id).eq('user_id', user_id).single().execute()
        if not membership.data or membership.data['role'] != 'owner':
            raise HTTPException(status_code=403, detail="Only team owner can change roles")
        
        # Can't change owner role or change to owner
        if role_update.role == 'owner':
            raise HTTPException(status_code=400, detail="Cannot assign owner role")
        
        # Update role
        supabase.table('team_members').update({'role': role_update.role}).eq('user_id', member_id).eq('team_id', team_id).execute()
        
        return {
            "success": True,
            "message": "Member role updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update role error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update member role")


@router.delete("/members/{member_id}")
async def remove_member(
    member_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Remove a member from team (owner/admin only)"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        user_id = user_data['id']
        team_id = user_data.get('team_id')
        
        if not team_id:
            raise HTTPException(status_code=400, detail="User is not part of a team")
        
        # Check if user is owner or admin
        membership = supabase.table('team_members').select('role').eq('team_id', team_id).eq('user_id', user_id).single().execute()
        if not membership.data or membership.data['role'] not in ['owner', 'admin']:
            raise HTTPException(status_code=403, detail="Only team owners/admins can remove members")
        
        # Can't remove the owner
        target_membership = supabase.table('team_members').select('role').eq('team_id', team_id).eq('user_id', member_id).single().execute()
        if target_membership.data and target_membership.data['role'] == 'owner':
            raise HTTPException(status_code=400, detail="Cannot remove team owner")
        
        # Remove from team_members
        supabase.table('team_members').delete().eq('user_id', member_id).eq('team_id', team_id).execute()
        
        # Clear member's team_id
        supabase.table('user_profiles').update({'team_id': None}).eq('id', member_id).execute()
        
        # Clear team_id from member's deals
        supabase.table('deals').update({'team_id': None}).eq('owner_id', member_id).execute()
        
        return {
            "success": True,
            "message": "Member removed from team"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove member error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove member")


@router.post("/leave")
async def leave_team(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Leave current team (cannot leave if owner)"""
    supabase = get_supabase()
    try:
        user_data = await get_user_with_team(credentials)
        user_id = user_data['id']
        team_id = user_data.get('team_id')
        
        if not team_id:
            raise HTTPException(status_code=400, detail="User is not part of a team")
        
        # Check if user is owner
        membership = supabase.table('team_members').select('role').eq('team_id', team_id).eq('user_id', user_id).single().execute()
        if membership.data and membership.data['role'] == 'owner':
            raise HTTPException(status_code=400, detail="Team owner cannot leave. Transfer ownership first or delete team.")
        
        # Remove from team_members
        supabase.table('team_members').delete().eq('user_id', user_id).eq('team_id', team_id).execute()
        
        # Clear user's team_id
        supabase.table('user_profiles').update({'team_id': None}).eq('id', user_id).execute()
        
        # Clear team_id from user's deals
        supabase.table('deals').update({'team_id': None}).eq('owner_id', user_id).execute()
        
        return {
            "success": True,
            "message": "Successfully left the team"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Leave team error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to leave team")
