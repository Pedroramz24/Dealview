import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AddressSearchBar = ({ onSelectAddress, mapRef }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    debounceRef.current = setTimeout(async () => {
      await fetchSuggestions(query);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const fetchSuggestions = async (searchQuery) => {
    try {
      let params = { query: searchQuery, limit: 10 };
      
      if (mapRef?.current) {
        const map = mapRef.current.getMap();
        const center = map.getCenter();
        params.latitude = center.lat;
        params.longitude = center.lng;
      }

      console.log('[AddressSearch] Fetching:', searchQuery);

      const response = await axios.get(`${BACKEND_URL}/api/address-search`, {
        params
      });

      console.log('[AddressSearch] Results:', response.data.count);
      setSuggestions(response.data.addresses || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('[AddressSearch] Error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = (address) => {
    setQuery(address.formatted_address);
    setShowSuggestions(false);
    
    if (mapRef?.current && address.latitude && address.longitude) {
      mapRef.current.flyTo({
        center: [address.longitude, address.latitude],
        zoom: 17,
        duration: 2000,
        essential: true
      });
    }

    if (onSelectAddress) {
      onSelectAddress(address);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Search Input - Flush with Header */}
      <div style={{
        height: '44px',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: '10px',
        transition: 'all 0.2s ease'
      }}>
        <Search size={18} style={{ color: 'rgba(255, 255, 255, 0.5)', flexShrink: 0 }} />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search addresses..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500
          }}
        />
        
        {loading && (
          <Loader2 size={16} style={{ color: '#00b8d4' }} className="animate-spin" />
        )}
        
        {query && !loading && (
          <button
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.4)',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: 'rgba(20, 22, 25, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
          zIndex: 1100,
          maxHeight: '360px',
          overflowY: 'auto'
        }}
        className="custom-scrollbar"
        >
          {suggestions.map((address, index) => (
            <div
              key={`${address.latitude}-${address.longitude}-${index}`}
              onClick={() => handleSelectAddress(address)}
              style={{
                padding: '16px 18px',
                borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '14px' }}>
                <MapPin size={18} style={{ color: '#00b8d4', marginTop: '3px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    lineHeight: '1.3',
                    letterSpacing: '-0.01em'
                  }}>
                    {address.street || address.formatted_address}
                  </div>
                  
                  {address.city && (
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '13px',
                      lineHeight: '1.4'
                    }}>
                      {[address.city, address.state_code, address.postal_code].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showSuggestions && query.length >= 3 && suggestions.length === 0 && !loading && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: 'rgba(20, 22, 25, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '10px',
          padding: '24px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '14px',
          zIndex: 1100,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
        }}>
          No addresses found for "{query}"
        </div>
      )}
    </div>
  );
};

export default AddressSearchBar;
