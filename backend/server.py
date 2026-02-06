"""
DealLinked CRM V2 - Clean Server
Minimal, focused CRM backend
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging
import uuid

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import route modules
from routes_v2.auth import router as auth_router
from routes_v2.deals import router as deals_router
from routes_v2.contacts import router as contacts_router
from routes_v2.pipelines import router as pipelines_router
from routes_v2.teams import router as teams_router
from routes_v2.calendar import router as calendar_router
from routes_v2.dashboard import router as dashboard_router

# Import utilities
from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id

# Initialize FastAPI app
app = FastAPI(
    title="DealLinked CRM V2",
    description="Commercial Real Estate CRM - Clean Rebuild",
    version="2.0.0"
)

# API Router with /api prefix
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# CORS MIDDLEWARE
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# HEALTH CHECK
# ============================================================================
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "service": "DealLinked CRM V2"
    }

# ============================================================================
# DOCUMENT UPLOAD ROUTES
# ============================================================================
@api_router.post("/deals/{deal_id}/documents")
async def upload_document(
    deal_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload a document for a deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Verify deal ownership
        deal = supabase.table('deals').select('owner_id').eq('id', deal_id).single().execute()
        if not deal.data or deal.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Determine file type
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'unknown'
        file_type_map = {
            'pdf': 'pdf', 'doc': 'doc', 'docx': 'doc',
            'xls': 'xls', 'xlsx': 'xls', 'csv': 'xls',
            'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'gif': 'img',
            'mp4': 'video', 'mov': 'video', 'avi': 'video'
        }
        file_type = file_type_map.get(file_ext, 'other')
        
        # Upload to Supabase Storage
        storage_path = f"{deal_id}/{uuid.uuid4()}-{file.filename}"
        
        storage_response = supabase.storage.from_('deal-documents').upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        file_url = supabase.storage.from_('deal-documents').get_public_url(storage_path)
        
        # Create document record
        doc_data = {
            "id": str(uuid.uuid4()),
            "deal_id": deal_id,
            "owner_id": user_id,
            "file_name": file.filename,
            "file_url": file_url,
            "file_type": file_type,
            "file_size": file_size
        }
        
        response = supabase.table('deal_documents').insert(doc_data).execute()
        
        return {
            "success": True,
            "document": response.data[0] if response.data else None,
            "message": "Document uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload document error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload document")


@api_router.get("/deals/{deal_id}/documents")
async def list_documents(
    deal_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all documents for a deal"""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)
        
        # Get user's team_id
        profile = supabase.table('user_profiles').select('team_id').eq('id', user_id).execute()
        team_id = profile.data[0].get('team_id') if profile.data else None
        
        # Verify access (owner or same team)
        deal = supabase.table('deals').select('owner_id, team_id').eq('id', deal_id).single().execute()
        if not deal.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        if deal.data['owner_id'] != user_id and deal.data.get('team_id') != team_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get documents
        response = supabase.table('deal_documents').select('*').eq('deal_id', deal_id).order('uploaded_at', desc=True).execute()
        
        return {
            "success": True,
            "documents": response.data or [],
            "count": len(response.data or [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List documents error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch documents")


@api_router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a document"""
    supabase = get_supabase()
    try:
        # Verify user
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = user_response.user.id
        
        # Get document
        doc = supabase.table('deal_documents').select('*').eq('id', document_id).single().execute()
        if not doc.data:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Extract storage path from URL and delete from storage
        file_url = doc.data.get('file_url', '')
        if '/deal-documents/' in file_url:
            storage_path = file_url.split('/deal-documents/')[-1]
            try:
                supabase.storage.from_('deal-documents').remove([storage_path])
            except:
                pass  # Continue even if storage delete fails
        
        # Delete document record
        supabase.table('deal_documents').delete().eq('id', document_id).execute()
        
        return {
            "success": True,
            "message": "Document deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete document error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


# ============================================================================
# IMAGE UPLOAD ROUTE
# ============================================================================
@api_router.post("/deals/{deal_id}/images")
async def upload_image(
    deal_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload an image for a deal"""
    supabase = get_supabase()
    try:
        # Verify user
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = user_response.user.id
        
        # Verify deal ownership
        deal = supabase.table('deals').select('owner_id, image_urls').eq('id', deal_id).single().execute()
        if not deal.data or deal.data['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Read file content
        content = await file.read()
        
        # Upload to Supabase Storage
        storage_path = f"{deal_id}/{uuid.uuid4()}-{file.filename}"
        
        supabase.storage.from_('deal-images').upload(
            storage_path,
            content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        file_url = supabase.storage.from_('deal-images').get_public_url(storage_path)
        
        # Update deal's image_urls array
        current_images = deal.data.get('image_urls') or []
        current_images.append(file_url)
        
        supabase.table('deals').update({'image_urls': current_images}).eq('id', deal_id).execute()
        
        return {
            "success": True,
            "image_url": file_url,
            "message": "Image uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload image error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload image")


# ============================================================================
# GEOCODING ROUTES (Using Radar.io)
# ============================================================================
@api_router.get("/geocode")
async def geocode_address(
    address: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Geocode an address to lat/lng"""
    import httpx
    
    try:
        radar_key = os.environ.get('RADAR_SECRET_KEY')
        if not radar_key:
            raise HTTPException(status_code=500, detail="Geocoding service not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.radar.io/v1/geocode/forward",
                params={"query": address},
                headers={"Authorization": radar_key}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Geocoding failed")
            
            data = response.json()
            
            if not data.get('addresses'):
                return {
                    "success": False,
                    "message": "Address not found"
                }
            
            addr = data['addresses'][0]
            
            return {
                "success": True,
                "result": {
                    "latitude": addr.get('latitude'),
                    "longitude": addr.get('longitude'),
                    "formatted_address": addr.get('formattedAddress'),
                    "city": addr.get('city'),
                    "state": addr.get('state'),
                    "zip": addr.get('postalCode')
                }
            }
    except HTTPException:
        raise


@api_router.get("/geocode/autocomplete")
async def autocomplete_address(
    query: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get address autocomplete suggestions"""
    import httpx
    
    try:
        radar_key = os.environ.get('RADAR_SECRET_KEY')
        if not radar_key:
            raise HTTPException(status_code=500, detail="Geocoding service not configured")
        
        if len(query) < 3:
            return {"success": True, "suggestions": []}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.radar.io/v1/search/autocomplete",
                params={"query": query, "limit": 5},
                headers={"Authorization": radar_key}
            )
            
            if response.status_code != 200:
                return {"success": True, "suggestions": []}
            
            data = response.json()
            
            suggestions = []
            for addr in data.get('addresses', []):
                suggestions.append({
                    "formatted_address": addr.get('formattedAddress'),
                    "address": addr.get('addressLabel') or addr.get('formattedAddress', '').split(',')[0],
                    "city": addr.get('city'),
                    "state": addr.get('state'),
                    "zip": addr.get('postalCode'),
                    "latitude": addr.get('latitude'),
                    "longitude": addr.get('longitude')
                })
            
            return {
                "success": True,
                "suggestions": suggestions
            }
    except Exception as e:
        logger.error(f"Autocomplete error: {str(e)}")
        return {"success": True, "suggestions": []}


@api_router.get("/geocode/reverse")
async def reverse_geocode(
    lat: float,
    lng: float,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reverse geocode lat/lng to address"""
    import httpx
    
    try:
        radar_key = os.environ.get('RADAR_SECRET_KEY')
        if not radar_key:
            raise HTTPException(status_code=500, detail="Geocoding service not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.radar.io/v1/geocode/reverse",
                params={"coordinates": f"{lat},{lng}"},
                headers={"Authorization": radar_key}
            )
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "message": "Reverse geocoding failed"
                }
            
            data = response.json()
            
            if not data.get('addresses'):
                return {
                    "success": False,
                    "message": "No address found for this location"
                }
            
            addr = data['addresses'][0]
            
            return {
                "success": True,
                "result": {
                    "latitude": lat,
                    "longitude": lng,
                    "formatted_address": addr.get('formattedAddress'),
                    "address": addr.get('addressLabel') or addr.get('formattedAddress', '').split(',')[0],
                    "city": addr.get('city'),
                    "state": addr.get('state'),
                    "zip": addr.get('postalCode')
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Geocode error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to geocode address")


# ============================================================================
# REGISTER ROUTE MODULES
# ============================================================================
api_router.include_router(auth_router)
api_router.include_router(deals_router)
api_router.include_router(contacts_router)
api_router.include_router(pipelines_router)
api_router.include_router(teams_router)
api_router.include_router(calendar_router)
api_router.include_router(dashboard_router)

# Mount API router to app
app.include_router(api_router)


# ============================================================================
# STARTUP EVENT
# ============================================================================
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 DealLinked CRM V2 started successfully")
    logger.info("📍 API available at /api")
    logger.info("🔐 Using Supabase for authentication and database")


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
