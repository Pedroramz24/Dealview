"""
Enhanced Owner Lookup Service
Finds owner contact information for ALL entity types (LLC, LP, Corp, Trust, Individual)
Uses multi-strategy search and real phone number discovery
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
from bs4 import BeautifulSoup
import asyncio

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
    address: Optional[str] = None


class PhoneNumber(BaseModel):
    number: str
    confidence: str  # high, medium, low
    source: str
    type: Optional[str] = None  # mobile, landline, voip


class OwnerLookupResult(BaseModel):
    entity_name: str
    entity_type: str  # LLC, LP, Corporation, Trust, Individual
    jurisdiction_code: Optional[str] = None
    company_number: Optional[str] = None
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
    search_strategy: Optional[str] = None  # Which strategy found the result


# ============================================
# HELPER FUNCTIONS
# ============================================

def detect_entity_type(name: str) -> str:
    """Detect entity type from name"""
    name_upper = name.upper()
    
    if 'LLC' in name_upper or 'L.L.C' in name_upper or 'LIMITED LIABILITY' in name_upper:
        return 'LLC'
    elif 'LP' in name_upper or 'L.P.' in name_upper or 'LIMITED PARTNERSHIP' in name_upper:
        return 'LP'
    elif 'CORP' in name_upper or 'CORPORATION' in name_upper or 'INC' in name_upper:
        return 'Corporation'
    elif 'TRUST' in name_upper:
        return 'Trust'
    elif 'LTD' in name_upper or 'LIMITED' in name_upper:
        return 'Limited Company'
    else:
        # Check if it looks like a person's name (has common name patterns)
        # Simple heuristic: If 2-3 words and no corporate keywords, likely individual
        words = name.split()
        if 2 <= len(words) <= 3 and not any(kw in name_upper for kw in ['PROPERTIES', 'INVESTMENTS', 'HOLDINGS', 'VENTURES', 'GROUP']):
            return 'Individual'
        return 'Unknown'


def create_search_variants(name: str) -> List[str]:
    """Create multiple search variants for better matching"""
    variants = []
    
    # Original name
    variants.append(name.strip())
    
    # Uppercase variant
    variants.append(name.upper().strip())
    
    # Remove extra spaces
    cleaned = ' '.join(name.split())
    if cleaned not in variants:
        variants.append(cleaned)
    
    # Remove periods (LLC vs L.L.C.)
    no_periods = name.replace('.', '')
    if no_periods not in variants:
        variants.append(no_periods)
    
    # Try with "LLC" standardized
    llc_standard = re.sub(r'\bL\.L\.C\b', 'LLC', name, flags=re.IGNORECASE)
    if llc_standard not in variants:
        variants.append(llc_standard)
    
    # Try with comma variations
    if ',' in name:
        no_comma = name.replace(',', '')
        if no_comma not in variants:
            variants.append(no_comma)
    
    return variants


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
        'AZ': 'us_az', 'ARIZONA': 'us_az',
        'CO': 'us_co', 'COLORADO': 'us_co',
    }
    
    state_upper = state.upper().strip()
    return state_codes.get(state_upper, f'us_{state.lower()[:2]}')


async def check_cache(owner_name: str, jurisdiction_code: str, supabase) -> Optional[Dict]:
    """Check if we have a recent cached lookup"""
    try:
        # Check cache (within last 30 days)
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=CACHE_DURATION_DAYS)).isoformat()
        
        response = supabase.table('llc_lookup_cache').select('*').eq(
            'llc_name', owner_name
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
            
            logger.info(f"[Owner Lookup] Cache hit for {owner_name}")
            return response.data[0]
        
        return None
    except Exception as e:
        logger.error(f"Cache check error: {str(e)}")
        return None


async def save_to_cache(owner_name: str, jurisdiction_code: str, data: Dict, source: str, supabase):
    """Save lookup result to cache"""
    try:
        cache_data = {
            'llc_name': owner_name,
            'jurisdiction_code': jurisdiction_code,
            'company_number': data.get('company_number'),
            'opencorporates_url': data.get('opencorporates_url'),
            'registry_url': data.get('registry_url'),
            'incorporation_date': data.get('incorporation_date'),
            'company_type': data.get('company_type'),
            'current_status': data.get('current_status'),
            'registered_agent_name': data.get('registered_agent', {}).get('name') if data.get('registered_agent') else None,
            'registered_agent_address': data.get('registered_agent', {}).get('address') if data.get('registered_agent') else None,
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
        
        logger.info(f"[Owner Lookup] Cached result for {owner_name}")
    except Exception as e:
        logger.error(f"Cache save error: {str(e)}")


async def lookup_opencorporates_multi_strategy(owner_name: str, jurisdiction_code: str) -> Optional[Dict]:
    """
    Multi-strategy search on OpenCorporates to maximize match accuracy
    Tries multiple query variations until a match is found
    """
    try:
        logger.info(f"[Owner Lookup] Starting multi-strategy OpenCorporates search for '{owner_name}' in {jurisdiction_code}")
        
        # Create search variants
        search_variants = create_search_variants(owner_name)
        logger.info(f"[Owner Lookup] Testing {len(search_variants)} search variants: {search_variants}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Strategy 1: Exact match with jurisdiction
            for variant in search_variants:
                logger.info(f"[Owner Lookup] Strategy 1: Exact match - '{variant}'")
                url = f"{OPENCORPORATES_BASE_URL}/companies/search"
                params = {
                    'q': variant,
                    'jurisdiction_code': jurisdiction_code,
                    'per_page': 10,
                    'order': 'score'
                }
                
                if OPENCORPORATES_API_KEY:
                    params['api_token'] = OPENCORPORATES_API_KEY
                
                response = await client.get(url, params=params)
                
                if response.status_code == 403:
                    logger.warning("[Owner Lookup] Rate limit reached")
                    break
                
                if response.status_code == 200:
                    data = response.json()
                    companies = data.get('results', {}).get('companies', [])
                    
                    if companies:
                        logger.info(f"[Owner Lookup] Found {len(companies)} matches for '{variant}'")
                        # Return best match
                        return await parse_company_data(companies[0]['company'], client, jurisdiction_code, 'exact_match')
            
            # Strategy 2: Broader search without strict jurisdiction (find in any US state)
            logger.info(f"[Owner Lookup] Strategy 2: US-wide search")
            for variant in search_variants[:3]:  # Try top 3 variants
                params = {
                    'q': variant,
                    'country_code': 'us',  # Search all US jurisdictions
                    'per_page': 20,
                    'order': 'score'
                }
                
                if OPENCORPORATES_API_KEY:
                    params['api_token'] = OPENCORPORATES_API_KEY
                
                response = await client.get(f"{OPENCORPORATES_BASE_URL}/companies/search", params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    companies = data.get('results', {}).get('companies', [])
                    
                    # Filter for exact name match (case-insensitive)
                    for company in companies:
                        c = company['company']
                        if c.get('name', '').upper() == variant.upper():
                            logger.info(f"[Owner Lookup] US-wide search found exact match: {c.get('name')}")
                            return await parse_company_data(c, client, c.get('jurisdiction_code', jurisdiction_code), 'us_wide')
            
            # Strategy 3: Wildcard search (name*)
            logger.info(f"[Owner Lookup] Strategy 3: Wildcard search")
            base_name = search_variants[0].split()[0]  # First word
            if len(base_name) > 3:
                params = {
                    'q': f"{base_name}*",
                    'jurisdiction_code': jurisdiction_code,
                    'per_page': 20
                }
                
                if OPENCORPORATES_API_KEY:
                    params['api_token'] = OPENCORPORATES_API_KEY
                
                response = await client.get(f"{OPENCORPORATES_BASE_URL}/companies/search", params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    companies = data.get('results', {}).get('companies', [])
                    
                    # Find closest match
                    for company in companies:
                        c = company['company']
                        if owner_name.upper() in c.get('name', '').upper():
                            logger.info(f"[Owner Lookup] Wildcard found partial match: {c.get('name')}")
                            return await parse_company_data(c, client, jurisdiction_code, 'wildcard')
        
        logger.warning(f"[Owner Lookup] No OpenCorporates matches found for {owner_name}")
        return None
            
    except httpx.TimeoutException:
        logger.error("[Owner Lookup] Request timeout")
        return None
    except Exception as e:
        logger.error(f"[Owner Lookup] Error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None


async def parse_company_data(company_data: Dict, client: httpx.AsyncClient, jurisdiction_code: str, strategy: str) -> Dict:
    """Parse and enrich company data from OpenCorporates"""
    
    # Get detailed company info if we only have basic data
    company_number = company_data.get('company_number')
    company_jurisdiction = company_data.get('jurisdiction_code', jurisdiction_code)
    
    if company_number and not company_data.get('officers'):
        try:
            detail_url = f"{OPENCORPORATES_BASE_URL}/companies/{company_jurisdiction}/{company_number}"
            detail_params = {'api_token': OPENCORPORATES_API_KEY} if OPENCORPORATES_API_KEY else {}
            
            detail_response = await client.get(detail_url, params=detail_params)
            if detail_response.status_code == 200:
                detail_data = detail_response.json()
                company_data = detail_data.get('results', {}).get('company', company_data)
                logger.info(f"[Owner Lookup] Retrieved detailed data for {company_data.get('name')}")
        except Exception as e:
            logger.error(f"Error fetching detailed company data: {str(e)}")
    
    # Extract registered agent
    registered_agent = None
    agent_address = company_data.get('registered_address_in_full') or company_data.get('registered_address')
    
    # Format address if it's a dict
    if isinstance(agent_address, dict):
        addr_parts = [
            agent_address.get('street_address'),
            agent_address.get('locality'),
            agent_address.get('region'),
            agent_address.get('postal_code')
        ]
        agent_address = ', '.join(filter(None, addr_parts))
    
    # Try to find registered agent in officers
    officers_data = company_data.get('officers', [])
    for officer in officers_data:
        officer_info = officer.get('officer', {})
        position = officer_info.get('position', '').lower()
        if 'agent' in position or 'registered agent' in position:
            registered_agent = {
                'name': officer_info.get('name'),
                'address': officer_info.get('address', agent_address)
            }
            break
    
    # If no explicit agent, use first officer or company address
    if not registered_agent:
        if officers_data:
            first_officer = officers_data[0].get('officer', {})
            registered_agent = {
                'name': first_officer.get('name'),
                'address': first_officer.get('address', agent_address)
            }
        else:
            # For individuals or entities without officers, use the entity name itself
            registered_agent = {
                'name': company_data.get('name'),
                'address': agent_address
            }
    
    # Format officers
    officers = []
    for officer in officers_data[:10]:  # Get up to 10 officers
        officer_info = officer.get('officer', {})
        officers.append({
            'name': officer_info.get('name'),
            'position': officer_info.get('position'),
            'start_date': officer_info.get('start_date'),
            'end_date': officer_info.get('end_date'),
            'address': officer_info.get('address')
        })
    
    result = {
        'entity_name': company_data.get('name'),
        'entity_type': detect_entity_type(company_data.get('name', '')),
        'jurisdiction_code': company_jurisdiction,
        'company_number': company_data.get('company_number'),
        'company_type': company_data.get('company_type'),
        'current_status': company_data.get('current_status'),
        'incorporation_date': company_data.get('incorporation_date'),
        'registered_agent': registered_agent,
        'officers': officers,
        'opencorporates_url': company_data.get('opencorporates_url'),
        'registry_url': company_data.get('registry_url'),
        'confidence_score': 0.90 if strategy == 'exact_match' else 0.75,
        'phone_numbers': [],
        'search_strategy': strategy
    }
    
    return result


async def lookup_phone_whitepages(name: str, address: Optional[str] = None, city: Optional[str] = None, state: Optional[str] = None) -> List[Dict]:
    """
    Lookup phone numbers using WhitePages reverse address lookup
    This uses web scraping of public WhitePages data
    """
    try:
        if not address:
            logger.info(f"[Phone Lookup] No address provided for {name}")
            return []
        
        logger.info(f"[Phone Lookup] Searching WhitePages for {name} at {address}")
        
        # Parse city and state from address if not provided
        if not city or not state:
            # Try to extract from address string
            # Format: "123 Main St, San Antonio, TX 78201"
            parts = address.split(',')
            if len(parts) >= 3:
                city = parts[-2].strip() if not city else city
                state_zip = parts[-1].strip()
                state = state_zip.split()[0] if not state else state
        
        # Build WhitePages reverse address URL
        # Note: This is a simplified version - actual implementation would need proper scraping
        # For now, return placeholder
        
        # TODO: Implement actual WhitePages scraping with BeautifulSoup
        # This requires handling their CAPTCHA and rate limiting
        
        logger.info(f"[Phone Lookup] WhitePages lookup placeholder for {name}")
        return []
        
    except Exception as e:
        logger.error(f"[Phone Lookup] WhitePages error: {str(e)}")
        return []


async def lookup_phone_truepeoplesearch(name: str, city: Optional[str] = None, state: Optional[str] = None) -> List[Dict]:
    """
    Lookup phone numbers using TruePeopleSearch
    """
    try:
        logger.info(f"[Phone Lookup] TruePeopleSearch for {name} in {city}, {state}")
        
        # TODO: Implement TruePeopleSearch scraping
        # Requires handling Cloudflare protection and geo-restrictions
        
        return []
        
    except Exception as e:
        logger.error(f"[Phone Lookup] TruePeopleSearch error: {str(e)}")
        return []


async def discover_phone_numbers(agent_name: str, address: Optional[str] = None) -> List[Dict]:
    """
    Main phone number discovery function
    Tries multiple free sources and returns consolidated results
    """
    phone_numbers = []
    
    # Extract city and state from address
    city = None
    state = None
    if address:
        parts = address.split(',')
        if len(parts) >= 2:
            city = parts[-2].strip()
            state_part = parts[-1].strip().split()[0] if len(parts) >= 3 else None
            state = state_part
    
    # Try WhitePages
    wp_phones = await lookup_phone_whitepages(agent_name, address, city, state)
    phone_numbers.extend(wp_phones)
    
    # Try TruePeopleSearch if WhitePages didn't find anything
    if not phone_numbers:
        tps_phones = await lookup_phone_truepeoplesearch(agent_name, city, state)
        phone_numbers.extend(tps_phones)
    
    # Remove duplicates
    seen = set()
    unique_phones = []
    for phone in phone_numbers:
        if phone['number'] not in seen:
            seen.add(phone['number'])
            unique_phones.append(phone)
    
    return unique_phones


# ============================================
# API ENDPOINTS
# ============================================

@llc_router.get("/lookup")
async def lookup_owner(
    owner_name: str,
    state: str = "TX",
    find_phone: bool = True,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Enhanced owner lookup for ALL entity types
    
    Parameters:
    - owner_name: Name of the owner/entity
    - state: State code (TX, CA, FL, etc.)
    - find_phone: Whether to attempt phone number discovery (default: True)
    """
    try:
        from server import get_current_user_supabase, supabase
        user = await get_current_user_supabase(credentials)
        
        logger.info(f"[Owner Lookup] Request for '{owner_name}' in {state}")
        
        # Parse jurisdiction code
        jurisdiction_code = parse_jurisdiction_code(state)
        entity_type = detect_entity_type(owner_name)
        
        logger.info(f"[Owner Lookup] Detected entity type: {entity_type}")
        
        # Check cache first
        cached = await check_cache(owner_name, jurisdiction_code, supabase)
        if cached:
            logger.info(f"[Owner Lookup] Returning cached result")
            # Format cached response
            result = OwnerLookupResult(
                entity_name=cached['llc_name'],
                entity_type=detect_entity_type(cached['llc_name']),
                jurisdiction_code=cached['jurisdiction_code'],
                company_number=cached.get('company_number'),
                company_type=cached.get('company_type'),
                current_status=cached.get('current_status'),
                incorporation_date=cached.get('incorporation_date'),
                registered_agent=RegisteredAgent(
                    name=cached.get('registered_agent_name'),
                    address=cached.get('registered_agent_address')
                ) if cached.get('registered_agent_name') or cached.get('registered_agent_address') else None,
                officers=[Officer(**o) for o in (cached.get('officers') or [])],
                phone_numbers=[PhoneNumber(**p) for p in (cached.get('phone_numbers') or [])],
                opencorporates_url=cached.get('opencorporates_url'),
                registry_url=cached.get('registry_url'),
                source=cached['source'],
                confidence_score=float(cached['confidence_score']),
                cached=True,
                search_strategy=cached.get('raw_data', {}).get('search_strategy')
            )
            return {"success": True, "result": result}
        
        # Try OpenCorporates multi-strategy search
        oc_result = await lookup_opencorporates_multi_strategy(owner_name, jurisdiction_code)
        
        if oc_result:
            # Try to find phone numbers if requested
            if find_phone and oc_result['registered_agent'] and oc_result['registered_agent'].get('name'):
                logger.info(f"[Owner Lookup] Attempting phone number discovery for {oc_result['registered_agent']['name']}")
                phone_numbers = await discover_phone_numbers(
                    oc_result['registered_agent']['name'],
                    oc_result['registered_agent'].get('address')
                )
                oc_result['phone_numbers'] = phone_numbers
                
                if phone_numbers:
                    logger.info(f"[Owner Lookup] Found {len(phone_numbers)} phone numbers")
            
            # Save to cache
            await save_to_cache(owner_name, jurisdiction_code, oc_result, 'opencorporates', supabase)
            
            result = OwnerLookupResult(**oc_result, cached=False)
            return {"success": True, "result": result}
        
        # If this is an individual (not a company), return basic info
        if entity_type == 'Individual':
            logger.info(f"[Owner Lookup] Detected individual owner: {owner_name}")
            result = OwnerLookupResult(
                entity_name=owner_name,
                entity_type='Individual',
                jurisdiction_code=jurisdiction_code,
                registered_agent=RegisteredAgent(name=owner_name),
                source='inferred',
                confidence_score=0.50,
                phone_numbers=[],
                cached=False
            )
            return {"success": True, "result": result, "note": "Individual owner - no corporate records found"}
        
        # No results found
        logger.warning(f"[Owner Lookup] No data found for {owner_name}")
        raise HTTPException(
            status_code=404, 
            detail=f"No records found for '{owner_name}' in {state}. Try adjusting the search term or checking a different state."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Owner Lookup] Error: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@llc_router.get("/search")
async def search_entities(
    q: str,
    state: str = "TX",
    limit: int = 10,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Search for entities by name (returns multiple matches)
    """
    try:
        from server import get_current_user_supabase
        user = await get_current_user_supabase(credentials)
        
        jurisdiction_code = parse_jurisdiction_code(state)
        
        # Query OpenCorporates with multiple strategies
        url = f"{OPENCORPORATES_BASE_URL}/companies/search"
        params = {
            'q': q,
            'country_code': 'us',  # Search all US states for broader results
            'per_page': min(limit, 30),
            'order': 'score'
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
                    'opencorporates_url': c.get('opencorporates_url'),
                    'entity_type': detect_entity_type(c.get('name', ''))
                })
            
            return {"success": True, "results": results, "total": len(results)}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Owner Search] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

