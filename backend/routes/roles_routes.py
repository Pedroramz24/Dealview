"""Unified roles and permissions routes."""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from datetime import datetime, timezone
import logging

from models.roles import (
    RoleVerificationRequest,
    OwnershipVerificationRequest,
    ApproveRoleRequest,
    RejectRoleRequest,
    ApproveOwnershipRequest,
    RejectOwnershipRequest,
    UserRoles,
    UserPermissions,
    RoleVerificationResponse,
    OwnershipVerificationResponse
)
from utils.auth_helpers import get_current_user_supabase
from utils.db import get_supabase

router = APIRouter(prefix="/roles", tags=["Roles & Permissions"])
logger = logging.getLogger(__name__)


# =====================================================
# User Role & Permission Endpoints
# =====================================================

@router.get("/my-roles", response_model=UserRoles)
async def get_my_roles(user = Depends(get_current_user_supabase)):
    """
    Get current user's roles and verification status.
    Returns all roles, primary role, and role-specific data.
    """
    supabase = get_supabase()
    
    try:
        # Fetch user profile with role data
        profile_result = supabase.table('user_profiles').select('*').eq('id', str(user.id)).single().execute()
        
        if not profile_result.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        profile = profile_result.data
        
        # Extract role-specific data
        broker_data = None
        if 'broker' in profile.get('roles', []):
            broker_data = {
                'license': profile.get('broker_license'),
                'firm': profile.get('broker_firm'),
                'phone': profile.get('broker_phone'),
                'markets': profile.get('broker_markets', []),
                'specialties': profile.get('broker_specialties', []),
                'bio': profile.get('broker_bio')
            }
        
        seller_data = None
        if 'seller' in profile.get('roles', []):
            seller_data = {
                'entity_name': profile.get('seller_entity_name'),
                'entity_type': profile.get('seller_entity_type'),
                'phone': profile.get('seller_phone')
            }
        
        buyer_data = {
            'company': profile.get('buyer_company'),
            'investment_criteria': profile.get('buyer_investment_criteria', {}),
            'buy_box_preferences': profile.get('buy_box_preferences', {})
        }
        
        return UserRoles(
            user_id=str(user.id),
            roles=profile.get('roles', ['buyer']),
            primary_role=profile.get('primary_role', 'buyer'),
            role_verifications=profile.get('role_verifications', {}),
            is_admin=profile.get('is_admin', False),
            broker_data=broker_data,
            seller_data=seller_data,
            buyer_data=buyer_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user roles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user roles"
        )


@router.get("/my-permissions", response_model=UserPermissions)
async def get_my_permissions(user = Depends(get_current_user_supabase)):
    """
    Get current user's computed permissions.
    Returns what actions user can perform based on verified roles.
    """
    supabase = get_supabase()
    
    try:
        # Fetch user profile
        profile_result = supabase.table('user_profiles').select('*').eq('id', str(user.id)).single().execute()
        
        if not profile_result.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        profile = profile_result.data
        roles = profile.get('roles', ['buyer'])
        verifications = profile.get('role_verifications', {})
        is_admin = profile.get('is_admin', False)
        
        # Check if broker role is verified
        can_publish_as_broker = (
            'broker' in roles and 
            verifications.get('broker', {}).get('status') == 'verified'
        )
        
        # Get verified properties for seller role
        verified_properties = []
        if 'seller' in roles:
            ownership_result = supabase.table('ownership_verifications').select(
                'property_address'
            ).eq('user_id', str(user.id)).eq('status', 'approved').execute()
            
            verified_properties = [v['property_address'] for v in ownership_result.data]
        
        can_publish_as_owner = len(verified_properties) > 0
        
        # Everyone can access marketplace (buyers, brokers, sellers)
        can_access_marketplace = True
        
        # Only brokers with verified role get CRM access
        can_access_crm = can_publish_as_broker
        
        return UserPermissions(
            can_publish_as_broker=can_publish_as_broker,
            can_publish_as_owner=can_publish_as_owner,
            verified_properties=verified_properties,
            max_listings=100,
            can_access_marketplace=can_access_marketplace,
            can_access_crm=can_access_crm,
            is_admin=is_admin
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error computing user permissions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute permissions"
        )


# =====================================================
# Role Verification Request Endpoints
# =====================================================

@router.post("/request-verification", response_model=RoleVerificationResponse)
async def request_role_verification(
    request_data: RoleVerificationRequest,
    user = Depends(get_current_user_supabase)
):
    """
    Submit request to become a verified broker or seller.
    Broker: requires license, firm, W9, license upload.
    Seller: requires entity info, will need per-property ownership verification.
    """
    supabase = get_supabase()
    
    try:
        # Check if user already has this role
        profile_result = supabase.table('user_profiles').select('roles').eq('id', str(user.id)).single().execute()
        
        if profile_result.data:
            current_roles = profile_result.data.get('roles', [])
            if request_data.requested_role in current_roles:
                raise HTTPException(
                    status_code=400,
                    detail=f"You already have the {request_data.requested_role} role. No need to request again."
                )
        
        # Check if there's already a pending request
        existing_request = supabase.table('role_verification_requests').select('id, status').eq(
            'user_id', str(user.id)
        ).eq('requested_role', request_data.requested_role).eq('status', 'pending').execute()
        
        if existing_request.data and len(existing_request.data) > 0:
            raise HTTPException(
                status_code=400,
                detail=f"You already have a pending {request_data.requested_role} verification request"
            )
        
        # Validate required fields based on role
        if request_data.requested_role == 'broker':
            if not request_data.broker_license or not request_data.broker_firm:
                raise HTTPException(
                    status_code=400,
                    detail="Broker verification requires license number and firm name"
                )
        elif request_data.requested_role == 'seller':
            if not request_data.seller_entity_name:
                raise HTTPException(
                    status_code=400,
                    detail="Seller verification requires entity name"
                )
        
        # Create verification request
        request_record = {
            'user_id': str(user.id),
            'requested_role': request_data.requested_role,
            'status': 'pending',
            'submitted_at': datetime.now(timezone.utc).isoformat(),
            **request_data.dict(exclude={'requested_role'})
        }
        
        result = supabase.table('role_verification_requests').insert(request_record).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=500,
                detail="Failed to create verification request"
            )
        
        return RoleVerificationResponse(
            success=True,
            message=f"{request_data.requested_role.capitalize()} verification request submitted. An admin will review it shortly.",
            request_id=result.data[0]['id'],
            status='pending'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating role verification request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit verification request"
        )


@router.post("/request-ownership-verification", response_model=OwnershipVerificationResponse)
async def request_ownership_verification(
    request_data: OwnershipVerificationRequest,
    user = Depends(get_current_user_supabase)
):
    """
    Submit request to verify ownership of a specific property.
    Required for sellers to publish properties as owners.
    """
    supabase = get_supabase()
    
    try:
        # Check if user has seller role
        profile_result = supabase.table('user_profiles').select('roles').eq('id', str(user.id)).single().execute()
        
        if not profile_result.data or 'seller' not in profile_result.data.get('roles', []):
            raise HTTPException(
                status_code=403,
                detail="You must have the seller role to request ownership verification"
            )
        
        # Check if already verified for this property
        existing_verification = supabase.table('ownership_verifications').select('id, status').eq(
            'user_id', str(user.id)
        ).eq('property_address', request_data.property_address).execute()
        
        for verification in existing_verification.data:
            if verification['status'] == 'approved':
                raise HTTPException(
                    status_code=400,
                    detail="This property is already verified for your account"
                )
            elif verification['status'] == 'pending':
                raise HTTPException(
                    status_code=400,
                    detail="You already have a pending verification request for this property"
                )
        
        # Create verification request
        verification_record = {
            'user_id': str(user.id),
            'property_address': request_data.property_address,
            'proof_type': request_data.proof_type,
            'proof_document_url': request_data.proof_document_url,
            'status': 'pending',
            'submitted_at': datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table('ownership_verifications').insert(verification_record).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=500,
                detail="Failed to create ownership verification request"
            )
        
        return OwnershipVerificationResponse(
            success=True,
            message="Ownership verification request submitted. An admin will review your documents.",
            verification_id=result.data[0]['id'],
            status='pending'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating ownership verification request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit ownership verification request"
        )


@router.get("/my-verification-requests")
async def get_my_verification_requests(user = Depends(get_current_user_supabase)):
    """
    Get all role and ownership verification requests submitted by current user.
    """
    supabase = get_supabase()
    
    try:
        # Fetch role verification requests
        role_requests_result = supabase.table('role_verification_requests').select('*').eq(
            'user_id', str(user.id)
        ).order('submitted_at', desc=True).execute()
        
        # Fetch ownership verification requests
        ownership_requests_result = supabase.table('ownership_verifications').select('*').eq(
            'user_id', str(user.id)
        ).order('submitted_at', desc=True).execute()
        
        return {
            "role_verification_requests": role_requests_result.data,
            "ownership_verification_requests": ownership_requests_result.data
        }
        
    except Exception as e:
        logger.error(f"Error fetching verification requests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch verification requests"
        )


# =====================================================
# Admin Endpoints
# =====================================================

@router.get("/admin/pending-role-verifications")
async def get_pending_role_verifications(user = Depends(get_current_user_supabase)):
    """
    Admin only: Get all pending role verification requests.
    """
    supabase = get_supabase()
    
    try:
        # Check if user is admin
        profile_result = supabase.table('user_profiles').select('is_admin').eq('id', str(user.id)).single().execute()
        
        if not profile_result.data or not profile_result.data.get('is_admin'):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Fetch pending requests with user info
        requests_result = supabase.table('role_verification_requests').select(
            '*, user:user_profiles(full_name, email)'
        ).eq('status', 'pending').order('submitted_at', desc=False).execute()
        
        return {
            "pending_requests": requests_result.data,
            "count": len(requests_result.data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pending role verifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pending verifications"
        )


@router.post("/admin/approve-role-verification")
async def approve_role_verification(
    approval_data: ApproveRoleRequest,
    user = Depends(get_current_user_supabase)
):
    """
    Admin only: Approve a role verification request.
    Grants the requested role to the user.
    """
    supabase = get_supabase()
    
    try:
        # Check if user is admin
        profile_result = supabase.table('user_profiles').select('is_admin').eq('id', str(user.id)).single().execute()
        
        if not profile_result.data or not profile_result.data.get('is_admin'):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Fetch the request
        request_result = supabase.table('role_verification_requests').select('*').eq(
            'id', approval_data.request_id
        ).single().execute()
        
        if not request_result.data:
            raise HTTPException(status_code=404, detail="Verification request not found")
        
        request_data = request_result.data
        
        if request_data['status'] != 'pending':
            raise HTTPException(
                status_code=400,
                detail=f"Request is already {request_data['status']}"
            )
        
        # Update request status
        supabase.table('role_verification_requests').update({
            'status': 'approved',
            'reviewed_at': datetime.now(timezone.utc).isoformat(),
            'reviewed_by': str(user.id),
            'admin_notes': approval_data.admin_notes
        }).eq('id', approval_data.request_id).execute()
        
        # Add role to user profile
        user_id = request_data['user_id']
        requested_role = request_data['requested_role']
        
        user_profile = supabase.table('user_profiles').select('roles, role_verifications').eq(
            'id', user_id
        ).single().execute()
        
        current_roles = user_profile.data.get('roles', ['buyer']) if user_profile.data else ['buyer']
        role_verifications = user_profile.data.get('role_verifications', {}) if user_profile.data else {}
        
        # Add role if not present
        if requested_role not in current_roles:
            current_roles.append(requested_role)
        
        # Update verification status
        role_verifications[requested_role] = {
            'status': 'verified',
            'verified_at': datetime.now(timezone.utc).isoformat(),
            'verified_by': str(user.id)
        }
        
        # Update profile with role data
        update_data = {
            'roles': current_roles,
            'role_verifications': role_verifications
        }
        
        # Add role-specific data
        if requested_role == 'broker':
            update_data.update({
                'broker_license': request_data.get('broker_license'),
                'broker_firm': request_data.get('broker_firm'),
                'broker_phone': request_data.get('broker_phone'),
                'broker_markets': request_data.get('broker_markets', []),
                'broker_specialties': request_data.get('broker_specialties', []),
                'broker_w9_url': request_data.get('broker_w9_url'),
                'broker_license_url': request_data.get('broker_license_url')
            })
        elif requested_role == 'seller':
            update_data.update({
                'seller_entity_name': request_data.get('seller_entity_name'),
                'seller_entity_type': request_data.get('seller_entity_type'),
                'seller_phone': request_data.get('seller_phone')
            })
        
        supabase.table('user_profiles').update(update_data).eq('id', user_id).execute()
        
        # Log admin action
        supabase.table('admin_actions').insert({
            'admin_id': str(user.id),
            'action_type': 'approve_role',
            'target_type': 'role_verification',
            'target_id': approval_data.request_id,
            'action_details': {
                'user_id': user_id,
                'role': requested_role
            },
            'notes': approval_data.admin_notes
        }).execute()
        
        return {
            "success": True,
            "message": f"{requested_role.capitalize()} role granted to user"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving role verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve verification"
        )
