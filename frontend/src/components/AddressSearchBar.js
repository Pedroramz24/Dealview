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

  // Debounced search - starts after 3 characters
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
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const fetchSuggestions = async (searchQuery) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get current map center for location bias
      let params = { query: searchQuery, limit: 10 };
      
      if (mapRef?.current) {
        const map = mapRef.current.getMap();
        const center = map.getCenter();
        params.latitude = center.lat;
        params.longitude = center.lng;
      }

      console.log('[AddressSearch] Fetching suggestions for:', searchQuery, params);

      const response = await axios.get(`${BACKEND_URL}/api/address-search`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[AddressSearch] Results:', response.data);
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
    // Set input to full formatted address
    setQuery(address.formatted_address);
    setShowSuggestions(false);
    
    // Fly map to selected location with smooth animation
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

  const handleKeyDown = (e) => {
    // Allow clearing with Escape key
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div style={{
        position: 'relative',
        background: 'rgba(11, 12, 14, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: showSuggestions && suggestions.length > 0 ? '12px 12px 0 0' : '12px',
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px',
        gap: '10px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.2s ease'
      }}>
        <Search size={20} style={{ color: '#00b8d4', flexShrink: 0 }} />
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search address or place..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 500
          }}
        />
        
        {loading && (
          <Loader2 size={18} style={{ color: '#00b8d4' }} className="animate-spin" />
        )}
        
        {query && !loading && (
          <button
            onClick={handleClear}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.6)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% - 1px)',
          left: 0,
          right: 0,
          background: 'rgba(11, 12, 14, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          zIndex: 10000,
          maxHeight: '400px',
          overflowY: 'auto'
        }}
        className="custom-scrollbar"
        >
          {suggestions.map((address, index) => (
            <div
              key={index}
              onClick={() => handleSelectAddress(address)}
              style={{
                padding: '14px 16px',
                borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <MapPin size={18} style={{ color: '#00b8d4', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Street Address - Primary */}
                  <div style={{
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '4px',
                    lineHeight: '1.3'
                  }}>
                    {address.street || address.formatted_address}
                  </div>
                  
                  {/* City, State, ZIP - Secondary */}
                  {address.city && (
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '13px',
                      lineHeight: '1.2'
                    }}>
                      {[address.city, address.state_code, address.postal_code].filter(Boolean).join(', ')}
                    </div>
                  )}
                  
                  {/* Country (if not US) */}
                  {address.country && address.country_code !== 'US' && (
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '12px',
                      marginTop: '2px'
                    }}>
                      {address.country}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showSuggestions && query.length >= 3 && suggestions.length === 0 && !loading && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% - 1px)',
          left: 0,
          right: 0,
          background: 'rgba(11, 12, 14, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '14px',
          zIndex: 10000,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          No addresses found for "{query}"
        </div>
      )}

      {/* Helper Text - Type more characters */}
      {query.length > 0 && query.length < 3 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          padding: '10px 14px',
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '8px',
          color: '#a855f7',
          fontSize: '13px',
          textAlign: 'center'
        }}>
          Type at least 3 characters to search
        </div>
      )}
    </div>
  );
};

export default AddressSearchBar;
