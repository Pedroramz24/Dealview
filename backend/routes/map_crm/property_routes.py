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
import re

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


def normalize_address(address: str, city: str, state: str) -> str:
    """Normalize address for duplicate detection."""
    # Remove extra whitespace, convert to lowercase
    normalized = f"{address} {city} {state}".lower().strip()
    # Remove punctuation except spaces
    normalized = re.sub(r'[^\w\s]', '', normalized)
    # Collapse multiple spaces
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized


def extract_zip_from_address(address: str) -> tuple:
    """
    Extract ZIP code from address string if present.
    
    Returns: (cleaned_address, zip_code or None)
    
    Examples:
        "123 Main St, Austin TX 78701" → ("123 Main St, Austin TX", "78701")
        "456 Oak Ave" → ("456 Oak Ave", None)
    """
    # Look for 5-digit ZIP code
    zip_match = re.search(r'\b(\d{5})(?:-\d{4})?\b', address)
    
    if zip_match:
        zip_code = zip_match.group(1)  # Get just the 5 digits
        cleaned_address = address.replace(zip_match.group(0), '').strip()
        # Clean up trailing commas/spaces
        cleaned_address = re.sub(r'[,\s]+$', '', cleaned_address)
        return cleaned_address, zip_code
    
    return address, None


def classify_asset_type(row: dict) -> str:
    """
    Intelligently classify asset type based on property attributes.
    
    Priority:
    1. Explicit asset_type column
    2. Keyword analysis (address, title, description)
    3. Size heuristics
    4. Default to 'Unknown'
    """
    # Check if asset_type is explicitly provided
    if 'asset_type' in row and row['asset_type'].strip():
        asset_type = row['asset_type'].strip()
        if asset_type in [e.value for e in AssetType]:
            return asset_type
    
    # Combine searchable text
    searchable = ' '.join([
        row.get('address', ''),
        row.get('title', ''),
        row.get('description', ''),
        row.get('notes', '')
    ]).lower()
    
    # Get building size for heuristics
    building_size = 0
    lot_size = 0
    try:
        if 'building_size' in row and row['building_size']:
            building_size = float(row['building_size'])
        if 'lot_size' in row and row['lot_size']:
            lot_size = float(row['lot_size'])
    except ValueError:
        pass
    
    # Gas Station - Small footprint with keywords
    gas_keywords = ['gas', 'fuel', 'station', 'convenience', 'c-store', 'petrol']
    if any(kw in searchable for kw in gas_keywords) and building_size < 5000:
        return 'Gas'
    
    # Multifamily - Residential keywords
    multifamily_keywords = ['apartment', 'multifamily', 'multi-family', 'units', 'complex', 'residential']
    if any(kw in searchable for kw in multifamily_keywords):
        return 'Multifamily'
    
    # Industrial - Large buildings with keywords
    industrial_keywords = ['warehouse', 'distribution', 'manufacturing', 'industrial', 'logistics', 'flex']
    if any(kw in searchable for kw in industrial_keywords) or building_size > 20000:
        return 'Industrial'
    
    # Retail - Shopping keywords
    retail_keywords = ['retail', 'shopping', 'store', 'mall', 'plaza', 'center', 'shop']
    if any(kw in searchable for kw in retail_keywords):
        return 'Retail'
    
    # Office - Professional keywords
    office_keywords = ['office', 'corporate', 'medical', 'professional', 'business', 'tower']
    if any(kw in searchable for kw in office_keywords):
        return 'Office'
    
    # Land - Lot size > 0 and no building
    if lot_size > 0 and building_size == 0:
        return 'Land'
    
    # Default to Office as most common commercial type
    return 'Office'


async def find_existing_property(supabase, address: str, city: str, state: str, latitude: float, longitude: float):
    """
    Find existing property by normalized address or lat/lng proximity.
    
    Returns existing property dict or None.
    """
    # Try exact normalized address match first
    normalized = normalize_address(address, city, state)
    
    try:
        # Get all properties to check (we'll do matching in Python for flexibility)
        result = supabase.table('map_properties').select('*').execute()
        
        for prop in result.data:
            # Check normalized address match
            prop_normalized = normalize_address(
                prop.get('address', ''),
                prop.get('city', ''),
                prop.get('state', '')
            )
            
            if prop_normalized == normalized:
                logger.info(f"Found existing property by address: {prop['id']}")
                return prop
            
            # Check lat/lng proximity (within ~50 meters)
            # 0.0005 degrees ≈ 50 meters
            lat_diff = abs(prop.get('latitude', 0) - latitude)
            lng_diff = abs(prop.get('longitude', 0) - longitude)
            
            if lat_diff < 0.0005 and lng_diff < 0.0005:
                logger.info(f"Found existing property by location: {prop['id']}")
                return prop
        
        return None
        
    except Exception as e:
        logger.error(f"Error finding existing property: {str(e)}")
        return None


@router.post("/properties/import")
async def import_csv(
    file: UploadFile = File(...),
    asset_type_override: Optional[str] = None,
    current_user: User = Depends(require_map_crm_access)
):
    """
    Smart CSV import with:
    - Manual asset type classification (for single-type CSVs)
    - Intelligent auto-classification (when override not provided)
    - Duplicate detection and update logic (by address + lat/lng)
    - Geocoding via Radar.io
    
    Required columns: address, city, state, zip_code
    Optional: asset_type (will use override or auto-classify)
    Optional: All other property fields
    
    Args:
        file: CSV file
        asset_type_override: If provided, apply this asset type to ALL properties in CSV
    """
    supabase = get_supabase()
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Validate asset_type_override if provided
    if asset_type_override and asset_type_override not in [e.value for e in AssetType]:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid asset_type_override. Must be one of: {', '.join([e.value for e in AssetType])}"
        )
    
    try:
        # Read CSV content
        content = await file.read()
        csv_data = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(csv_data))
        
        # Validate minimum required columns (asset_type is now optional)
        required_columns = {'address', 'city', 'state', 'zip_code'}
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
        updated_rows = 0
        error_log = []
        properties_to_insert = []
        
        for idx, row in enumerate(rows, start=1):
            try:
                # Build address for geocoding
                address = row.get('address', '').strip()
                city = row.get('city', '').strip()
                state = row.get('state', '').strip()
                zip_code = row.get('zip_code', '').strip() if 'zip_code' in row else ''
                
                if not all([address, city, state]):
                    raise ValueError("Missing required address fields")
                
                # Smart ZIP extraction if not provided
                if not zip_code:
                    address, extracted_zip = extract_zip_from_address(address)
                    if extracted_zip:
                        zip_code = extracted_zip
                        logger.info(f"Extracted ZIP {zip_code} from address")
                
                # Check if PropertyRadar already provided lat/lng (SKIP GEOCODING if so)
                latitude = None
                longitude = None
                
                if 'latitude' in row and row['latitude'] and 'longitude' in row and row['longitude']:
                    try:
                        latitude = float(row['latitude'])
                        longitude = float(row['longitude'])
                        logger.info(f"Using provided coordinates: ({latitude}, {longitude})")
                    except ValueError:
                        pass
                
                # Only geocode if coordinates not provided
                if not latitude or not longitude:
                    full_address = f"{address}, {city}, {state} {zip_code}".strip()
                    geocode_result = await radar_service.forward_geocode(full_address)
                    
                    if not geocode_result or 'latitude' not in geocode_result:
                        raise ValueError(f"Failed to geocode address: {full_address}")
                    
                    latitude = geocode_result['latitude']
                    longitude = geocode_result['longitude']
                
                # Determine asset type (priority order):
                # 1. Manual override (user selected in wizard)
                # 2. CSV column value
                # 3. Auto-classification
                if asset_type_override:
                    asset_type = asset_type_override
                else:
                    asset_type = classify_asset_type(row)
                
                # Check for existing property (duplicate detection)
                existing_property = await find_existing_property(
                    supabase, address, city, state, latitude, longitude
                )
                
                if existing_property:
                    # UPDATE existing property
                    update_data = {
                        'address': address,
                        'city': city,
                        'state': state,
                        'zip_code': zip_code,
                        'latitude': latitude,
                        'longitude': longitude,
                        'asset_type': asset_type,
                        'updated_at': datetime.now(timezone.utc).isoformat(),
                        'last_edited_by': str(current_user.id)
                    }
                    
                    # Add optional fields
                    indexed_fields = [
                        'title', 'asking_price', 'lot_size', 'building_size',
                        'assessed_value', 'cap_rate', 'noi', 'income', 'expenses',
                        'year_built', 'parking_spaces', 'occupancy', 'zoning',
                        'lease_type', 'description', 'notes',
                        'owner_name', 'owner_phone', 'owner_email',
                        # PropertyRadar specific
                        'beds', 'baths', 'est_value', 'land_value', 'improvements_value',
                        'est_equity_dollars', 'est_equity_percent', 'tax_delinquent_dollars',
                        'purchase_date', 'purchase_amount', 'county', 'apn', 'photo_url',
                        'listing_status', 'owner_type',
                        # Boolean flags
                        'high_equity', 'underwater', 'bankruptcy', 'foreclosure',
                        'owner_occupied', 'cash_buyer', 'listed_for_sale', 'tax_delinquent'
                    ]
                    
                    jsonb_fields = [
                        'mail_address', 'mail_city', 'mail_state', 'mail_zip',
                        'first_lien_record_date', 'first_lien_term', 'first_lien_ltv_percent',
                        'first_cash_out'
                    ]
                    
                    custom_data = {}
                    
                    for field in indexed_fields:
                        if field in row and row[field] and str(row[field]).strip():
                            value = str(row[field]).strip()
                            if field in ['asking_price', 'lot_size', 'building_size', 'assessed_value', 
                                        'cap_rate', 'noi', 'income', 'expenses', 'occupancy',
                                        'baths', 'est_value', 'land_value', 'improvements_value',
                                        'est_equity_dollars', 'est_equity_percent', 'tax_delinquent_dollars',
                                        'purchase_amount']:
                                try:
                                    update_data[field] = float(value)
                                except ValueError:
                                    pass
                            elif field in ['year_built', 'parking_spaces', 'beds']:
                                try:
                                    update_data[field] = int(value)
                                except ValueError:
                                    pass
                            elif field in ['high_equity', 'underwater', 'bankruptcy', 'foreclosure',
                                          'owner_occupied', 'cash_buyer', 'listed_for_sale', 'tax_delinquent']:
                                update_data[field] = value.lower() in ['true', 'yes', '1', 'y']
                            else:
                                update_data[field] = value
                    
                    for field in jsonb_fields:
                        if field in row and row[field] and str(row[field]).strip():
                            custom_data[field] = str(row[field]).strip()
                    
                    if custom_data:
                        update_data['custom_data'] = custom_data
                    
                    # Update in database
                    supabase.table('map_properties').update(update_data).eq('id', existing_property['id']).execute()
                    updated_rows += 1
                    successful_rows += 1
                    logger.info(f"Updated existing property: {existing_property['id']}")
                    
                else:
                    # INSERT new property
                    property_data = {
                        'id': str(uuid.uuid4()),
                        'owner_id': str(current_user.id),
                        'address': address,
                        'city': city,
                        'state': state,
                        'zip_code': zip_code,
                        'latitude': latitude,
                        'longitude': longitude,
                        'asset_type': asset_type,
                        'status': PropertyStatus.AVAILABLE.value,
                        'created_at': datetime.now(timezone.utc).isoformat(),
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }
                    
                    # PropertyRadar indexed fields
                    indexed_fields = [
                        'title', 'asking_price', 'lot_size', 'building_size',
                        'assessed_value', 'cap_rate', 'noi', 'income', 'expenses',
                        'year_built', 'parking_spaces', 'occupancy', 'zoning',
                        'lease_type', 'description', 'notes',
                        'owner_name', 'owner_phone', 'owner_email',
                        # PropertyRadar specific
                        'beds', 'baths', 'est_value', 'land_value', 'improvements_value',
                        'est_equity_dollars', 'est_equity_percent', 'tax_delinquent_dollars',
                        'purchase_date', 'purchase_amount', 'county', 'apn', 'photo_url',
                        'listing_status', 'owner_type',
                        # Boolean flags
                        'high_equity', 'underwater', 'bankruptcy', 'foreclosure',
                        'owner_occupied', 'cash_buyer', 'listed_for_sale', 'tax_delinquent'
                    ]
                    
                    # JSONB fields (mail address, lien details)
                    jsonb_fields = [
                        'mail_address', 'mail_city', 'mail_state', 'mail_zip',
                        'first_lien_record_date', 'first_lien_term', 'first_lien_ltv_percent',
                        'first_cash_out'
                    ]
                    
                    custom_data = {}
                    
                    # Map indexed fields
                    for field in indexed_fields:
                        if field in row and row[field] and str(row[field]).strip():
                            value = str(row[field]).strip()
                            
                            # Type conversion for numeric fields
                            if field in ['asking_price', 'lot_size', 'building_size', 'assessed_value', 
                                        'cap_rate', 'noi', 'income', 'expenses', 'occupancy',
                                        'baths', 'est_value', 'land_value', 'improvements_value',
                                        'est_equity_dollars', 'est_equity_percent', 'tax_delinquent_dollars',
                                        'purchase_amount']:
                                try:
                                    property_data[field] = float(value)
                                except ValueError:
                                    pass
                            elif field in ['year_built', 'parking_spaces', 'beds']:
                                try:
                                    property_data[field] = int(value)
                                except ValueError:
                                    pass
                            elif field in ['high_equity', 'underwater', 'bankruptcy', 'foreclosure',
                                          'owner_occupied', 'cash_buyer', 'listed_for_sale', 'tax_delinquent']:
                                # Convert to boolean
                                property_data[field] = value.lower() in ['true', 'yes', '1', 'y']
                            else:
                                property_data[field] = value
                    
                    # Map JSONB fields
                    for field in jsonb_fields:
                        if field in row and row[field] and str(row[field]).strip():
                            custom_data[field] = str(row[field]).strip()
                    
                    # Only add custom_data if it has content
                    if custom_data:
                        property_data['custom_data'] = custom_data
                    
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
        
        # Bulk insert new properties
        if properties_to_insert:
            supabase.table('map_properties').insert(properties_to_insert).execute()
            logger.info(f"Inserted {len(properties_to_insert)} new properties")
        
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
            'new_properties': len(properties_to_insert),
            'updated_properties': updated_rows,
            'classification_method': 'manual_override' if asset_type_override else 'auto_classified',
            'message': f"Successfully processed {successful_rows} of {total_rows} properties ({len(properties_to_insert)} new, {updated_rows} updated)"
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
    limit: int = 10000,
    offset: int = 0,
    current_user: User = Depends(require_map_crm_access)
):
    """Get properties with optional filters. Default limit increased to 10000 for better table view."""
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


@router.get("/properties/map-data", response_model=List[MapProperty])
async def get_map_data(
    north: float,
    south: float,
    east: float,
    west: float,
    zoom: int,
    asset_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_map_crm_access)
):
    """
    Get properties within map viewport bounds with intelligent clustering.
    MUST be before /properties/{property_id} route to avoid path conflicts.
    """
    supabase = get_supabase()
    
    try:
        # Build base query with viewport bounds
        query = supabase.table('map_properties').select('*').gte('latitude', south).lte('latitude', north).gte('longitude', west).lte('longitude', east)
        
        # Apply filters
        if asset_type:
            query = query.eq('asset_type', asset_type)
        if status:
            query = query.eq('status', status)
        else:
            # By default, hide converted properties on map
            query = query.neq('status', 'converted')
        
        # Zoom-based strategy
        if zoom >= 14:
            # High zoom: Show individual properties (limit 1000)
            query = query.limit(1000)
        elif zoom >= 11:
            # Medium zoom: Show more properties but still limited
            query = query.limit(500)
        else:
            # Low zoom: Sample properties (show subset)
            query = query.limit(200)
        
        result = query.execute()
        logger.info(f"Fetched {len(result.data)} properties for viewport (zoom {zoom})")
        return [MapProperty(**prop) for prop in result.data]
        
    except Exception as e:
        logger.error(f"Failed to fetch map data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch map data")


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
    """
    Claim a property (assign to current user).
    Creates/updates assignment record and updates property status.
    """
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
        
        # Update property status to claimed
        supabase.table('map_properties').update({
            'status': PropertyStatus.CLAIMED.value,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', property_id).execute()
        
        logger.info(f"User {current_user.id} claimed property {property_id}")
        
        return {"message": "Property claimed successfully", "property_id": property_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to claim property: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to claim property")


@router.post("/properties/{property_id}/unclaim")
async def unclaim_property(
    property_id: str,
    current_user: User = Depends(require_map_crm_access)
):
    """Unclaim a property (remove assignment)."""
    supabase = get_supabase()
    
    try:
        # Delete assignment
        supabase.table('map_property_assignments').delete().eq('property_id', property_id).eq('user_id', str(current_user.id)).execute()
        
        # Update property status back to available
        supabase.table('map_properties').update({
            'status': PropertyStatus.AVAILABLE.value,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', property_id).execute()
        
        logger.info(f"User {current_user.id} unclaimed property {property_id}")
        
        return {"message": "Property unclaimed successfully"}
        
    except Exception as e:
        logger.error(f"Failed to unclaim property: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unclaim property")


@router.get("/assignments/me")
async def get_my_assignments(
    current_user: User = Depends(require_map_crm_access)
):
    """Get all properties claimed by current user."""
    supabase = get_supabase()
    
    try:
        # Get assignments
        assignments = supabase.table('map_property_assignments').select('property_id').eq('user_id', str(current_user.id)).execute()
        
        if not assignments.data:
            return []
        
        property_ids = [a['property_id'] for a in assignments.data]
        
        # Get properties
        properties = supabase.table('map_properties').select('*').in_('id', property_ids).execute()
        
        return [MapProperty(**prop) for prop in properties.data]
        
    except Exception as e:
        logger.error(f"Failed to fetch user assignments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch assignments")


@router.get("/properties/map-data", response_model=List[MapProperty])
async def get_map_data(
    north: float,
    south: float,
    east: float,
    west: float,
    zoom: int,
    asset_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(require_map_crm_access)
):
    """
    Get properties within map viewport bounds with intelligent clustering.
    
    Performance optimization for 100k+ properties:
    - Returns max 1000 properties per request
    - At low zoom: Returns clustered/sampled data
    - At high zoom: Returns individual properties in viewport
    
    Args:
        north, south, east, west: Map viewport bounds
        zoom: Current zoom level (determines clustering strategy)
        asset_type: Optional filter
        status: Optional filter
    """
    supabase = get_supabase()
    
    try:
        # Build base query with viewport bounds
        query = supabase.table('map_properties').select('*').gte('latitude', south).lte('latitude', north).gte('longitude', west).lte('longitude', east)
        
        # Apply filters
        if asset_type:
            query = query.eq('asset_type', asset_type)
        if status:
            query = query.eq('status', status)
        else:
            # By default, hide converted properties on map
            query = query.neq('status', 'converted')
        
        # Zoom-based strategy
        if zoom >= 14:
            # High zoom: Show individual properties (limit 1000)
            query = query.limit(1000)
        elif zoom >= 11:
            # Medium zoom: Show more properties but still limited
            query = query.limit(500)
        else:
            # Low zoom: Sample properties (show subset)
            # Use modulo on row_number for even distribution
            query = query.limit(200)
        
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


@router.post("/properties/{property_id}/convert-to-deal")
async def convert_property_to_deal(
    property_id: str,
    pipeline_id: Optional[str] = None,
    current_user: User = Depends(require_map_crm_access)
):
    """
    Convert a DealVisor property to a DealLinked deal.
    
    Transfers all property data to deals table and marks property as converted.
    This is the 'effortless transfer' feature - one-click property → deal conversion.
    """
    supabase = get_supabase()
    
    try:
        # Get property
        prop_result = supabase.table('map_properties').select('*').eq('id', property_id).single().execute()
        
        if not prop_result.data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        property_data = prop_result.data
        
        # Check if already converted
        if property_data.get('deal_id'):
            raise HTTPException(status_code=400, detail="Property already converted to deal")
        
        # Create deal from property data
        deal_id = str(uuid.uuid4())
        
        deal_data = {
            'id': deal_id,
            'owner_id': str(current_user.id),
            'title': property_data.get('title') or property_data.get('address'),
            'address': property_data.get('address'),
            'city': property_data.get('city'),
            'state': property_data.get('state'),
            'zip_code': property_data.get('zip_code'),
            'asset_type': property_data.get('asset_type'),
            'status': 'active',
            'stage': 'prospect',
            'priority': 'high' if property_data.get('high_equity') or property_data.get('foreclosure') else 'medium',
            'latitude': property_data.get('latitude'),
            'longitude': property_data.get('longitude'),
            'asking_price': property_data.get('asking_price') or property_data.get('est_value'),
            'size': property_data.get('building_size'),
            'lot_size': property_data.get('lot_size'),
            'year_built': property_data.get('year_built'),
            'zoning': property_data.get('zoning'),
            'occupancy': property_data.get('occupancy'),
            'description': property_data.get('description'),
            'notes': property_data.get('notes'),
            'pipeline_id': pipeline_id,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Remove None values
        deal_data = {k: v for k, v in deal_data.items() if v is not None}
        
        # Insert deal
        supabase.table('deals').insert(deal_data).execute()
        
        # Update property to mark as converted
        supabase.table('map_properties').update({
            'deal_id': deal_id,
            'status': 'converted',
            'updated_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', property_id).execute()
        
        logger.info(f"Converted property {property_id} to deal {deal_id}")
        
        return {
            'success': True,
            'deal_id': deal_id,
            'message': f'Property successfully converted to deal. Access it in DealLinked Workspace.'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to convert property to deal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
