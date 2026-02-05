"""
DealLinked CRM V2 - Pipelines Routes
Pipeline and stage management
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging
import uuid

from utils.db import get_supabase
from utils.auth_helpers import security

router = APIRouter(prefix="/pipelines", tags=["Pipelines"])
logger = logging.getLogger(__name__)


# ============================================================================
# MODELS
# ============================================================================

class PipelineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: Optional[bool] = False


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None


class StageCreate(BaseModel):
    name: str
    color: Optional[str] = "#94a3b8"
    display_order: Optional[int] = None


class StageUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    display_order: Optional[int] = None


class StageReorder(BaseModel):
    stage_ids: List[str]  # Ordered list of stage IDs


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


# ============================================================================
# PIPELINE ROUTES
# ============================================================================

@router.get("")
async def list_pipelines(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all pipelines with their stages"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Get pipelines with stages
        response = supabase.table('pipelines').select(
            '*, pipeline_stages(*)'
        ).eq('owner_id', user_id).order('created_at').execute()
        
        pipelines = response.data or []
        
        # If no pipelines exist, create default pipeline with stages
        if not pipelines:
            logger.info(f"No pipelines found for user {user_id}, creating default pipeline")
            default_pipeline = await create_default_pipeline_for_user(supabase, user_id)
            if default_pipeline:
                pipelines = [default_pipeline]
        
        # Sort stages by display_order within each pipeline
        for pipeline in pipelines:
            stages = pipeline.get('pipeline_stages', [])
            pipeline['stages'] = sorted(stages, key=lambda s: s.get('display_order', 0))
            if 'pipeline_stages' in pipeline:
                del pipeline['pipeline_stages']
        
        return {
            "success": True,
            "pipelines": pipelines,
            "count": len(pipelines)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List pipelines error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch pipelines")


async def create_default_pipeline_for_user(supabase, user_id: str):
    """Create default pipeline with stages for a user (fallback if trigger failed)"""
    try:
        pipeline_id = str(uuid.uuid4())
        
        # Create default pipeline
        pipeline_data = {
            "id": pipeline_id,
            "owner_id": user_id,
            "name": "My Pipeline",
            "description": "Default deal pipeline",
            "is_default": True
        }
        
        pipeline_response = supabase.table('pipelines').insert(pipeline_data).execute()
        
        if not pipeline_response.data:
            logger.error("Failed to create default pipeline")
            return None
        
        # Create default stages
        default_stages = [
            {"name": "Need to Contact", "color": "#94a3b8", "display_order": 1},
            {"name": "Contacted", "color": "#60a5fa", "display_order": 2},
            {"name": "Prospect", "color": "#a78bfa", "display_order": 3},
            {"name": "Negotiations", "color": "#ec4899", "display_order": 4},
            {"name": "Offer Sent", "color": "#f59e0b", "display_order": 5},
            {"name": "Under Contract", "color": "#10b981", "display_order": 6},
            {"name": "Closed Won", "color": "#00d4aa", "display_order": 7},
            {"name": "Closed Lost", "color": "#ef4444", "display_order": 8}
        ]
        
        stages_data = []
        for stage in default_stages:
            stages_data.append({
                "id": str(uuid.uuid4()),
                "pipeline_id": pipeline_id,
                "name": stage["name"],
                "color": stage["color"],
                "display_order": stage["display_order"]
            })
        
        stages_response = supabase.table('pipeline_stages').insert(stages_data).execute()
        
        if not stages_response.data:
            logger.error("Failed to create default stages")
        
        # Fetch the complete pipeline with stages
        result = supabase.table('pipelines').select(
            '*, pipeline_stages(*)'
        ).eq('id', pipeline_id).single().execute()
        
        logger.info(f"Successfully created default pipeline for user {user_id}")
        return result.data if result.data else None
        
    except Exception as e:
        logger.error(f"Error creating default pipeline: {str(e)}")
        return None


@router.get("/{pipeline_id}")
async def get_pipeline(
    pipeline_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get a specific pipeline with stages"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        response = supabase.table('pipelines').select(
            '*, pipeline_stages(*)'
        ).eq('id', pipeline_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        
        pipeline = response.data
        if pipeline['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Sort stages
        stages = pipeline.get('pipeline_stages', [])
        pipeline['stages'] = sorted(stages, key=lambda s: s.get('display_order', 0))
        del pipeline['pipeline_stages']
        
        return {
            "success": True,
            "pipeline": pipeline
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get pipeline error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch pipeline")


@router.post("")
async def create_pipeline(
    pipeline: PipelineCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new pipeline"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # If setting as default, unset other defaults first
        if pipeline.is_default:
            supabase.table('pipelines').update({'is_default': False}).eq('owner_id', user_id).execute()
        
        pipeline_data = {
            "id": str(uuid.uuid4()),
            "owner_id": user_id,
            "name": pipeline.name,
            "description": pipeline.description,
            "is_default": pipeline.is_default or False
        }
        
        response = supabase.table('pipelines').insert(pipeline_data).execute()
        
        return {
            "success": True,
            "pipeline": response.data[0] if response.data else None,
            "message": "Pipeline created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create pipeline error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create pipeline")


@router.put("/{pipeline_id}")
async def update_pipeline(
    pipeline_id: str,
    pipeline: PipelineUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a pipeline"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        existing = supabase.table('pipelines').select('owner_id').eq('id', pipeline_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        if existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # If setting as default, unset other defaults first
        if pipeline.is_default:
            supabase.table('pipelines').update({'is_default': False}).eq('owner_id', user_id).neq('id', pipeline_id).execute()
        
        update_data = pipeline.model_dump(exclude_unset=True, exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase.table('pipelines').update(update_data).eq('id', pipeline_id).execute()
        
        return {
            "success": True,
            "pipeline": response.data[0] if response.data else None,
            "message": "Pipeline updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update pipeline error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update pipeline")


@router.delete("/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a pipeline (cannot delete default pipeline if it has deals)"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership
        existing = supabase.table('pipelines').select('owner_id, is_default').eq('id', pipeline_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        if existing.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if pipeline has deals
        deals_response = supabase.table('deals').select('id').eq('pipeline_id', pipeline_id).limit(1).execute()
        if deals_response.data:
            raise HTTPException(status_code=400, detail="Cannot delete pipeline with existing deals")
        
        # Delete pipeline (cascade will delete stages)
        supabase.table('pipelines').delete().eq('id', pipeline_id).execute()
        
        return {
            "success": True,
            "message": "Pipeline deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete pipeline error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete pipeline")


# ============================================================================
# STAGE ROUTES
# ============================================================================

@router.post("/{pipeline_id}/stages")
async def create_stage(
    pipeline_id: str,
    stage: StageCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new stage in a pipeline"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify pipeline ownership
        pipeline = supabase.table('pipelines').select('owner_id').eq('id', pipeline_id).single().execute()
        if not pipeline.data:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        if pipeline.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get max display_order if not provided
        display_order = stage.display_order
        if display_order is None:
            max_order = supabase.table('pipeline_stages').select('display_order').eq('pipeline_id', pipeline_id).order('display_order', desc=True).limit(1).execute()
            display_order = (max_order.data[0]['display_order'] + 1) if max_order.data else 1
        
        stage_data = {
            "id": str(uuid.uuid4()),
            "pipeline_id": pipeline_id,
            "name": stage.name,
            "color": stage.color or "#94a3b8",
            "display_order": display_order
        }
        
        response = supabase.table('pipeline_stages').insert(stage_data).execute()
        
        return {
            "success": True,
            "stage": response.data[0] if response.data else None,
            "message": "Stage created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create stage error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create stage")


@router.put("/stages/{stage_id}")
async def update_stage(
    stage_id: str,
    stage: StageUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a stage"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership through pipeline
        existing = supabase.table('pipeline_stages').select('pipeline_id').eq('id', stage_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Stage not found")
        
        pipeline = supabase.table('pipelines').select('owner_id').eq('id', existing.data['pipeline_id']).single().execute()
        if not pipeline.data or pipeline.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_data = stage.model_dump(exclude_unset=True, exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = supabase.table('pipeline_stages').update(update_data).eq('id', stage_id).execute()
        
        return {
            "success": True,
            "stage": response.data[0] if response.data else None,
            "message": "Stage updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update stage error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update stage")


@router.delete("/stages/{stage_id}")
async def delete_stage(
    stage_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a stage (cannot delete if deals are in this stage)"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify ownership through pipeline
        existing = supabase.table('pipeline_stages').select('pipeline_id').eq('id', stage_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Stage not found")
        
        pipeline = supabase.table('pipelines').select('owner_id').eq('id', existing.data['pipeline_id']).single().execute()
        if not pipeline.data or pipeline.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if stage has deals
        deals = supabase.table('deals').select('id').eq('pipeline_stage_id', stage_id).limit(1).execute()
        if deals.data:
            raise HTTPException(status_code=400, detail="Cannot delete stage with existing deals")
        
        supabase.table('pipeline_stages').delete().eq('id', stage_id).execute()
        
        return {
            "success": True,
            "message": "Stage deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete stage error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete stage")


@router.post("/{pipeline_id}/stages/reorder")
async def reorder_stages(
    pipeline_id: str,
    reorder: StageReorder,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reorder stages in a pipeline"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify pipeline ownership
        pipeline = supabase.table('pipelines').select('owner_id').eq('id', pipeline_id).single().execute()
        if not pipeline.data:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        if pipeline.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update display_order for each stage
        for index, stage_id in enumerate(reorder.stage_ids):
            supabase.table('pipeline_stages').update({'display_order': index + 1}).eq('id', stage_id).execute()
        
        return {
            "success": True,
            "message": "Stages reordered successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reorder stages error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reorder stages")
