"""
LLC Owner Lookup Service
Finds LLC registered agents and owner contact information using OpenCorporates API + fallbacks
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import httpx
import re
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

llc_router = APIRouter(prefix="/api/llc", tags=["llc"])

# OpenCorporates API configuration
OPENCORPORATES_API_KEY = os.environ.get('OPENCORPORATES_API_KEY', '')
OPENCORPORATES_BASE_URL = "https://api.opencorporates.com/v0.4"
CACHE_DURATION_DAYS = 30


# ============================================
# PYDANTIC MODELS
# ============================================

class RegisteredAgent(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None


class Officer(BaseModel):
    name: str
    position: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class PhoneNumber(BaseModel):
    number: str
    confidence: str  # high, medium, low
    source: str


class LLCLookupResult(BaseModel):
    llc_name: str
    jurisdiction_code: str
    company_number: Optional[str] = None
    company_type: Optional[str] = None
    current_status: Optional[str] = None
    incorporation_date: Optional[str] = None
    registered_agent: Optional[RegisteredAgent] = None
    officers: List[Officer] = []
    phone_numbers: List[PhoneNumber] = []
    opencorporates_url: Optional[str] = None
    registry_url: Optional[str] = None
    source: str
    confidence_score: float
    cached: bool = False


# ============================================
# HELPER FUNCTIONS
# ============================================

def normalize_llc_name(name: str) -> str:
    """Normalize LLC name for better matching"""
    name = name.upper().strip()
    # Remove common suffixes for better matching
    name = re.sub(r'\s+(LLC|L\.L\.C\.|L\.L\.C|LIMITED LIABILITY COMPANY)$', '', name, flags=re.IGNORECASE)
    return name


def parse_jurisdiction_code(state: str) -> str:
    """Convert state name/abbreviation to OpenCorporates jurisdiction code"""
    state_codes = {
        'TX': 'us_tx', 'TEXAS': 'us_tx',
        'CA': 'us_ca', 'CALIFORNIA': 'us_ca',
        'FL': 'us_fl', 'FLORIDA': 'us_fl',
        'NY': 'us_ny', 'NEW YORK': 'us_ny',
        'IL': 'us_il', 'ILLINOIS': 'us_il',
        'PA': 'us_pa', 'PENNSYLVANIA': 'us_pa',
        'OH': 'us_oh', 'OHIO': 'us_oh',
        'GA': 'us_ga', 'GEORGIA': 'us_ga',
        'NC': 'us_nc', 'NORTH CAROLINA': 'us_nc',
        'MI': 'us_mi', 'MICHIGAN': 'us_mi',
    }
    
    state_upper = state.upper().strip()
    return state_codes.get(state_upper, f'us_{state.lower()}')


async def check_cache(llc_name: str, jurisdiction_code: str, supabase) -> Optional[Dict]:
    """Check if we have a recent cached lookup"""
    try:
        normalized_name = normalize_llc_name(llc_name)
        
        # Check cache (within last 30 days)
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=CACHE_DURATION_DAYS)).isoformat()
        
        response = supabase.table('llc_lookup_cache').select('*').eq(
            'llc_name', normalized_name
        ).eq('jurisdiction_code', jurisdiction_code).gte(
            'last_lookup_at', cutoff_date
        ).limit(1).execute()
        
        if response.data:
            # Update lookup count
            cache_id = response.data[0]['id']
            supabase.table('llc_lookup_cache').update({
                'lookup_count': response.data[0]['lookup_count'] + 1,
                'last_lookup_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', cache_id).execute()
            
            logger.info(f"[LLC Lookup] Cache hit for {llc_name}")
            return response.data[0]
        
        return None
    except Exception as e:
        logger.error(f"Cache check error: {str(e)}")
        return None


async def save_to_cache(llc_name: str, jurisdiction_code: str, data: Dict, source: str, supabase):
    """Save lookup result to cache"""
    try:
        normalized_name = normalize_llc_name(llc_name)
        
        cache_data = {
            'llc_name': normalized_name,
            'jurisdiction_code': jurisdiction_code,
            'company_number': data.get('company_number'),
            'opencorporates_url': data.get('opencorporates_url'),
            'registry_url': data.get('registry_url'),
            'incorporation_date': data.get('incorporation_date'),
            'company_type': data.get('company_type'),
            'current_status': data.get('current_status'),
            'registered_agent_name': data.get('registered_agent', {}).get('name'),
            'registered_agent_address': data.get('registered_agent', {}).get('address'),
            'officers': data.get('officers', []),
            'phone_numbers': data.get('phone_numbers', []),
            'raw_data': data,
            'source': source,
            'confidence_score': data.get('confidence_score', 0.0),
            'last_lookup_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert (insert or update)
        supabase.table('llc_lookup_cache').upsert(
            cache_data,
            on_conflict='llc_name,jurisdiction_code'
        ).execute()
        
        logger.info(f"[LLC Lookup] Cached result for {llc_name}")
    except Exception as e:
        logger.error(f"Cache save error: {str(e)}")


async def lookup_opencorporates(llc_name: str, jurisdiction_code: str) -> Optional[Dict]:
    """Lookup LLC info via OpenCorporates API"""
    try:
        logger.info(f"[LLC Lookup] Querying OpenCorporates for {llc_name} in {jurisdiction_code}")
        
        # Build API URL
        url = f"{OPENCORPORATES_BASE_URL}/companies/search"
        params = {
            'q': llc_name,
            'jurisdiction_code': jurisdiction_code,
            'per_page': 5
        }
        
        if OPENCORPORATES_API_KEY:
            params['api_token'] = OPENCORPORATES_API_KEY
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code == 403:
                logger.warning("[LLC Lookup] OpenCorporates rate limit reached")
                return None
            
            if response.status_code != 200:
                logger.error(f"[LLC Lookup] OpenCorporates error: {response.status_code}")
                return None
            
            data = response.json()
            companies = data.get('results', {}).get('companies', [])
            
            if not companies:
                logger.info(f"[LLC Lookup] No results from OpenCorporates for {llc_name}")
                return None
            
            # Get the best match (first result)
            company_data = companies[0]['company']
            
            # Get detailed company info
            company_number = company_data.get('company_number')
            if company_number:
                detail_url = f"{OPENCORPORATES_BASE_URL}/companies/{jurisdiction_code}/{company_number}"
                detail_params = {'api_token': OPENCORPORATES_API_KEY} if OPENCORPORATES_API_KEY else {}
                
                detail_response = await client.get(detail_url, params=detail_params)
                if detail_response.status_code == 200:
                    detail_data = detail_response.json()
                    company_data = detail_data.get('results', {}).get('company', company_data)
            
            # Parse registered agent from address or officers
            registered_agent = None
            agent_address = company_data.get('registered_address_in_full') or company_data.get('registered_address')
            
            # Try to find registered agent in officers
            officers_data = company_data.get('officers', [])
            for officer in officers_data:
                officer_info = officer.get('officer', {})
                if officer_info.get('position', '').lower() in ['agent', 'registered agent']:
                    registered_agent = {
                        'name': officer_info.get('name'),
                        'address': officer_info.get('address', agent_address)
                    }
                    break
            
            # If no explicit agent, use first officer or address
            if not registered_agent and officers_data:
                first_officer = officers_data[0].get('officer', {})
                registered_agent = {
                    'name': first_officer.get('name'),
                    'address': agent_address
                }
            elif not registered_agent:
                registered_agent = {
                    'name': None,
                    'address': agent_address
                }
            
            # Format officers
            officers = []
            for officer in officers_data[:5]:  # Limit to 5 officers
                officer_info = officer.get('officer', {})
                officers.append({
                    'name': officer_info.get('name'),
                    'position': officer_info.get('position'),
                    'start_date': officer_info.get('start_date'),
                    'end_date': officer_info.get('end_date')
                })
            
            result = {
                'llc_name': company_data.get('name'),
                'jurisdiction_code': jurisdiction_code,
                'company_number': company_data.get('company_number'),
                'company_type': company_data.get('company_type'),
                'current_status': company_data.get('current_status'),
                'incorporation_date': company_data.get('incorporation_date'),
                'registered_agent': registered_agent,
                'officers': officers,
                'opencorporates_url': company_data.get('opencorporates_url'),
                'registry_url': company_data.get('registry_url'),
                'confidence_score': 0.85,  # High confidence from OpenCorporates
                'phone_numbers': []  # Will be populated by phone lookup
            }
            
            logger.info(f"[LLC Lookup] Found {llc_name} on OpenCorporates")
            return result
            
    except httpx.TimeoutException:
        logger.error("[LLC Lookup] OpenCorporates request timeout")
        return None
    except Exception as e:
        logger.error(f"[LLC Lookup] OpenCorporates error: {str(e)}")
        return None


async def lookup_phone_numbers(agent_name: str, address: Optional[str] = None) -> List[Dict]:
    """
    Lookup phone numbers for registered agent (placeholder for now)
    In future: integrate with TruePeopleSearch, FastPeopleSearch, etc.
    """
    # TODO: Implement actual phone number discovery
    # For now, return empty list
    logger.info(f"[Phone Lookup] Placeholder for {agent_name}")
    return []


# ============================================
# API ENDPOINTS
# ============================================

@llc_router.get("/lookup")
async def lookup_llc(
    llc_name: str,
    state: str = "TX",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Lookup LLC registered agent and owner information
    
    Parameters:
    - llc_name: Name of the LLC
    - state: State code (TX, CA, FL, etc.) - defaults to TX
    """
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        
        logger.info(f"[LLC Lookup] Request for '{llc_name}' in {state}")
        
        # Parse jurisdiction code
        jurisdiction_code = parse_jurisdiction_code(state)
        
        # Check cache first
        cached = await check_cache(llc_name, jurisdiction_code, supabase)
        if cached:
            # Format cached response
            result = LLCLookupResult(
                llc_name=cached['llc_name'],
                jurisdiction_code=cached['jurisdiction_code'],
                company_number=cached.get('company_number'),
                company_type=cached.get('company_type'),
                current_status=cached.get('current_status'),
                incorporation_date=cached.get('incorporation_date'),
                registered_agent=RegisteredAgent(
                    name=cached.get('registered_agent_name'),
                    address=cached.get('registered_agent_address')
                ) if cached.get('registered_agent_name') else None,
                officers=[Officer(**o) for o in (cached.get('officers') or [])],
                phone_numbers=[PhoneNumber(**p) for p in (cached.get('phone_numbers') or [])],
                opencorporates_url=cached.get('opencorporates_url'),
                registry_url=cached.get('registry_url'),
                source=cached['source'],
                confidence_score=float(cached['confidence_score']),
                cached=True
            )
            return {"success": True, "result": result}
        
        # Try OpenCorporates
        oc_result = await lookup_opencorporates(llc_name, jurisdiction_code)
        
        if oc_result:
            # Try to find phone numbers
            if oc_result['registered_agent'] and oc_result['registered_agent'].get('name'):
                phone_numbers = await lookup_phone_numbers(
                    oc_result['registered_agent']['name'],
                    oc_result['registered_agent'].get('address')
                )
                oc_result['phone_numbers'] = phone_numbers
            
            # Save to cache
            await save_to_cache(llc_name, jurisdiction_code, oc_result, 'opencorporates', supabase)
            
            result = LLCLookupResult(**oc_result, cached=False)
            return {"success": True, "result": result}
        
        # TODO: Fallback to Texas SOS scraper if OpenCorporates fails
        logger.warning(f"[LLC Lookup] No data found for {llc_name}")
        raise HTTPException(status_code=404, detail="LLC not found in available databases")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[LLC Lookup] Error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@llc_router.get("/search")
async def search_llcs(
    q: str,
    state: str = "TX",
    limit: int = 10,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Search for LLCs by name (returns multiple matches)
    
    Parameters:
    - q: Search query
    - state: State code (TX, CA, FL, etc.)
    - limit: Maximum number of results (default 10)
    """
    try:
        from server import get_current_user_supabase
        user = await get_current_user_supabase(credentials)
        
        jurisdiction_code = parse_jurisdiction_code(state)
        
        # Query OpenCorporates
        url = f"{OPENCORPORATES_BASE_URL}/companies/search"
        params = {
            'q': q,
            'jurisdiction_code': jurisdiction_code,
            'per_page': min(limit, 20)
        }
        
        if OPENCORPORATES_API_KEY:
            params['api_token'] = OPENCORPORATES_API_KEY
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Search failed")
            
            data = response.json()
            companies = data.get('results', {}).get('companies', [])
            
            results = []
            for company in companies:
                c = company['company']
                results.append({
                    'name': c.get('name'),
                    'company_number': c.get('company_number'),
                    'jurisdiction_code': c.get('jurisdiction_code'),
                    'company_type': c.get('company_type'),
                    'current_status': c.get('current_status'),
                    'incorporation_date': c.get('incorporation_date'),
                    'opencorporates_url': c.get('opencorporates_url')
                })
            
            return {"success": True, "results": results, "total": len(results)}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[LLC Search] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
