"""
Radar.io Address Search Service
Provides geocoding and address autocomplete functionality
"""

import os
import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RadarService:
    """Service for Radar.io geocoding and address search"""
    
    def __init__(self):
        self.secret_key = os.environ.get('RADAR_SECRET_KEY')
        self.base_url = "https://api.radar.io/v1"
        self.cache: Dict[str, tuple] = {}  # Simple in-memory cache
        self.cache_ttl_minutes = 60
    
    def _get_cache_key(self, query: str, near: Optional[str] = None) -> str:
        """Generate cache key"""
        return f"{query.lower()}:{near or ''}"
    
    def _check_cache(self, cache_key: str) -> Optional[List[Dict]]:
        """Check if cached entry exists and is valid"""
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < timedelta(minutes=self.cache_ttl_minutes):
                logger.info(f"[Radar] Cache hit for: {cache_key}")
                return cached_data
            else:
                del self.cache[cache_key]
        return None
    
    def _set_cache(self, cache_key: str, data: List[Dict]) -> None:
        """Store data in cache"""
        self.cache[cache_key] = (data, datetime.now())
    
    async def search_addresses(
        self,
        query: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for addresses using Radar.io forward geocoding
        
        Args:
            query: Address search string
            latitude: Optional - bias results near this location
            longitude: Optional - bias results near this location
            limit: Maximum results to return (1-100)
        
        Returns:
            List of addresses with lat/lng and formatted address
        """
        
        # Check cache first
        near = f"{latitude},{longitude}" if latitude and longitude else None
        cache_key = self._get_cache_key(query, near)
        
        cached_result = self._check_cache(cache_key)
        if cached_result:
            return cached_result
        
        try:
            params = {
                "query": query,
                "limit": limit,
            }
            
            # Add location bias if provided
            if latitude is not None and longitude is not None:
                params["near"] = f"{latitude},{longitude}"
            
            # Limit to US for better Texas results
            params["countryCode"] = "US"
            
            logger.info(f"[Radar] Searching addresses: query='{query}', near={near}")
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/geocode/forward",
                    params=params,
                    headers={"Authorization": self.secret_key}
                )
                
                if response.status_code != 200:
                    logger.error(f"[Radar] API error {response.status_code}: {response.text}")
                    return []
                
                data = response.json()
            
            # Parse addresses from Radar response
            addresses = []
            for addr in data.get("addresses", []):
                try:
                    coordinates = addr.get("geometry", {}).get("coordinates", [0, 0])
                    
                    addresses.append({
                        "formatted_address": addr.get("formattedAddress", ""),
                        "latitude": coordinates[1],  # Radar returns [lng, lat]
                        "longitude": coordinates[0],
                        "street": addr.get("addressLabel", ""),
                        "city": addr.get("city", ""),
                        "state": addr.get("state", ""),
                        "state_code": addr.get("stateCode", ""),
                        "postal_code": addr.get("postalCode", ""),
                        "country": addr.get("country", ""),
                        "country_code": addr.get("countryCode", ""),
                    })
                except Exception as e:
                    logger.warning(f"[Radar] Failed to parse address: {str(e)}")
                    continue
            
            # Cache the results
            self._set_cache(cache_key, addresses)
            
            logger.info(f"[Radar] Search complete: {len(addresses)} results")
            return addresses
        
        except httpx.TimeoutException:
            logger.error("[Radar] API request timeout")
            return []
        except Exception as e:
            logger.error(f"[Radar] Unexpected error: {str(e)}")
            return []
    
    async def forward_geocode(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Geocode a single address to latitude/longitude.
        Used by Map CRM CSV import.
        
        Args:
            address: Full address string (e.g., "123 Main St, Austin, TX 78701")
        
        Returns:
            Dict with latitude, longitude, formatted_address or None if failed
        """
        try:
            results = await self.search_addresses(query=address, limit=1)
            if results and len(results) > 0:
                return results[0]
            return None
        except Exception as e:
            logger.error(f"[Radar] Forward geocode failed for '{address}': {str(e)}")
            return None


# Singleton instance
radar_service = RadarService()
