"""Map CRM property routes - CSV import, CRUD, map data, conversion."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, status
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
import csv
import io
import httpx
import os

from models.map_crm_models import (
    MapProperty, MapPropertyCreate, MapPropertyUpdate,
    MapPropertyAssignment, ClaimPropertyRequest,
    CSVImport, ImportProgress, ImportStatus,
    MapDataRequest, MapCluster,
    ConvertToDealRequest, ConvertToDealResponse,
    AssetType, PropertyStatus
)
from models import User
from middleware.map_crm_gate import require_map_crm_access
from utils.db import get_supabase
from radar_service import radar_service

router = APIRouter(prefix="/map-crm", tags=["Map CRM"])
logger = logging.getLogger(__name__)


@router.post("/properties/import")
async def import_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_map_crm_access)
):
    """
    Import properties from CSV file with automatic geocoding.
    
    CSV must contain: address, city, state, zip_code, asset_type
    Optional fields: All other property fields
    
    Processes in batches with Radar.io geocoding.
    """
    supabase = get_supabase()
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read CSV content
        content = await file.read()
        csv_data = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_data))
        
        # Validate required columns
        required_columns = {'address', 'city', 'state', 'zip_code', 'asset_type'}
        if not required_columns.issubset(set(reader.fieldnames)):
            raise HTTPException(
                status_code=400,
                detail=f"CSV must contain columns: {', '.join(required_columns)}"
            )
        
        # Create import record
        rows = list(reader)
        total_rows = len(rows)
        
        import_id = str(uuid.uuid4())
        import_record = {
            'id': import_id,
            'user_id': str(current_user.id),
            'filename': file.filename,
            'total_rows': total_rows,
            'status': ImportStatus.PROCESSING.value,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table('map_csv_imports').insert(import_record).execute()
        
        # Process properties
        successful_rows = 0
        failed_rows = 0
        error_log = []
        properties_to_insert = []
        
        for idx, row in enumerate(rows, start=1):
            try:
                # Validate asset type
                asset_type = row.get('asset_type', '').strip()
                if asset_type not in [e.value for e in AssetType]:
                    raise ValueError(f"Invalid asset_type: {asset_type}. Must be one of: Gas, Retail, Industrial, Office, Land, Multifamily")
                
                # Build address for geocoding
                address = row.get('address', '').strip()
                city = row.get('city', '').strip()
                state = row.get('state', '').strip()
                zip_code = row.get('zip_code', '').strip()
                
                if not all([address, city, state]):
                    raise ValueError("Missing required address fields")
                
                full_address = f"{address}, {city}, {state} {zip_code}"
                
                # Geocode with Radar.io
                geocode_result = await radar_service.forward_geocode(full_address)
                
                if not geocode_result or 'latitude' not in geocode_result:
                    raise ValueError(f"Failed to geocode address: {full_address}")
                
                # Prepare property data
                property_data = {
                    'id': str(uuid.uuid4()),
                    'owner_id': str(current_user.id),
                    'address': address,
                    'city': city,
                    'state': state,
                    'zip_code': zip_code,
                    'latitude': geocode_result['latitude'],
                    'longitude': geocode_result['longitude'],
                    'asset_type': asset_type,
                    'status': PropertyStatus.AVAILABLE.value,
                    'created_at': datetime.now(timezone.utc).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                # Add optional fields
                optional_fields = [
                    'title', 'asking_price', 'lot_size', 'building_size',
                    'assessed_value', 'cap_rate', 'noi', 'income', 'expenses',
                    'year_built', 'parking_spaces', 'occupancy', 'zoning',
                    'lease_type', 'description', 'notes',
                    'owner_name', 'owner_phone', 'owner_email'
                ]
                
                for field in optional_fields:
                    if field in row and row[field].strip():
                        value = row[field].strip()
                        # Convert numeric fields
                        if field in ['asking_price', 'lot_size', 'building_size', 'assessed_value', 'cap_rate', 'noi', 'income', 'expenses', 'occupancy']:
                            try:
                                property_data[field] = float(value)
                            except ValueError:
                                pass
                        elif field in ['year_built', 'parking_spaces']:
                            try:
                                property_data[field] = int(value)
                            except ValueError:
                                pass
                        else:
                            property_data[field] = value
                
                properties_to_insert.append(property_data)
                successful_rows += 1
                
            except Exception as e:
                failed_rows += 1
                error_log.append({
                    'row': idx,
                    'data': row,
                    'error': str(e)
                })
                logger.error(f"Failed to process row {idx}: {str(e)}")
        
        # Bulk insert properties
        if properties_to_insert:
            supabase.table('map_properties').insert(properties_to_insert).execute()
        
        # Update import record
        supabase.table('map_csv_imports').update({
            'successful_rows': successful_rows,
            'failed_rows': failed_rows,
            'status': ImportStatus.COMPLETED.value if failed_rows == 0 else ImportStatus.COMPLETED.value,
            'error_log': error_log if error_log else None,
            'completed_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', import_id).execute()
        
        return {
            'import_id': import_id,
            'status': 'completed',
            'total_rows': total_rows,
            'successful_rows': successful_rows,
            'failed_rows': failed_rows,
            'message': f"Successfully imported {successful_rows} of {total_rows} properties"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV import failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/properties", response_model=List[MapProperty])
async def get_properties(
    asset_type: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_map_crm_access)
):
    """Get properties with optional filters."""
    supabase = get_supabase()
    
    try:
        query = supabase.table('map_properties').select('*')
        
        if asset_type:
            query = query.eq('asset_type', asset_type)
        if city:
            query = query.eq('city', city)
        if status:
            query = query.eq('status', status)
        
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        return [MapProperty(**prop) for prop in result.data]
        
    except Exception as e:
        logger.error(f"Failed to fetch properties: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch properties")


@router.get("/properties/{property_id}", response_model=MapProperty)
async def get_property(
    property_id: str,
    current_user: User = Depends(require_map_crm_access)
):
    """Get a single property by ID."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('map_properties').select('*').eq('id', property_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        return MapProperty(**result.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch property: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch property")


@router.put("/properties/{property_id}", response_model=MapProperty)
async def update_property(
    property_id: str,
    property_update: MapPropertyUpdate,
    current_user: User = Depends(require_map_crm_access)
):
    """Update property fields."""
    supabase = get_supabase()
    
    try:
        # Build update dict (exclude None values)
        update_data = property_update.model_dump(exclude_unset=True)
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        update_data['last_edited_by'] = str(current_user.id)
        
        result = supabase.table('map_properties').update(update_data).eq('id', property_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        return MapProperty(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update property: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update property")


@router.delete("/properties/{property_id}")
async def delete_property(
    property_id: str,
    current_user: User = Depends(require_map_crm_access)
):
    """Delete a property."""
    supabase = get_supabase()
    
    try:
        supabase.table('map_properties').delete().eq('id', property_id).execute()
        return {"message": "Property deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete property: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete property")


@router.post("/properties/{property_id}/claim")
async def claim_property(
    property_id: str,
    claim_request: ClaimPropertyRequest,
    current_user: User = Depends(require_map_crm_access)
):
    """Claim a property (assign to current user)."""
    supabase = get_supabase()
    
    try:
        # Check if property exists
        prop_result = supabase.table('map_properties').select('id, status').eq('id', property_id).single().execute()
        
        if not prop_result.data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Create or update assignment
        assignment_data = {
            'property_id': property_id,
            'user_id': str(current_user.id),
            'status': 'claimed',
            'notes': claim_request.notes,
            'claimed_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert (insert or update if exists)
        supabase.table('map_property_assignments').upsert(assignment_data).execute()
        
        # Update property status
        supabase.table('map_properties').update({
            'status': PropertyStatus.CLAIMED.value,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', property_id).execute()
        
        return {"message": "Property claimed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to claim property: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to claim property")


@router.get("/properties/map-data", response_model=List[MapProperty])
async def get_map_data(
    north: float,
    south: float,
    east: float,
    west: float,
    asset_type: Optional[str] = None,
    current_user: User = Depends(require_map_crm_access)
):
    """
    Get properties within map bounds for rendering.
    Returns simplified data for map markers.
    """
    supabase = get_supabase()
    
    try:
        query = supabase.table('map_properties').select('*').gte('latitude', south).lte('latitude', north).gte('longitude', west).lte('longitude', east)
        
        if asset_type:
            query = query.eq('asset_type', asset_type)
        
        # Limit to 1000 properties for performance
        query = query.limit(1000)
        
        result = query.execute()
        return [MapProperty(**prop) for prop in result.data]
        
    except Exception as e:
        logger.error(f"Failed to fetch map data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch map data")


@router.get("/imports", response_model=List[CSVImport])
async def get_imports(
    current_user: User = Depends(require_map_crm_access)
):
    """Get import history for current user."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('map_csv_imports').select('*').eq('user_id', str(current_user.id)).order('created_at', desc=True).execute()
        
        return [CSVImport(**imp) for imp in result.data]
        
    except Exception as e:
        logger.error(f"Failed to fetch imports: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch imports")
