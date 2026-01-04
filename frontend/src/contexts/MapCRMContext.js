import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { API } from '../App';

const MapCRMContext = createContext();

export const useMapCRM = () => {
  const context = useContext(MapCRMContext);
  if (!context) {
    throw new Error('useMapCRM must be used within MapCRMProvider');
  }
  return context;
};

export const MapCRMProvider = ({ children }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [filters, setFilters] = useState({
    asset_type: null,
    city: null,
    status: null
  });
  const [loading, setLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Check if user has Map CRM access
  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[MapCRM] No user found');
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      console.log('[MapCRM] Checking access for user:', user.id);

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('permissions')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[MapCRM] Error fetching profile:', error);
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      console.log('[MapCRM] Profile permissions:', profile?.permissions);

      const access = profile?.permissions?.map_crm_access === true;
      console.log('[MapCRM] Has access:', access);
      setHasAccess(access);
    } catch (error) {
      console.error('[MapCRM] Failed to check Map CRM access:', error);
      setHasAccess(false);
    } finally {
      setCheckingAccess(false);
    }
  };

  const fetchProperties = async () => {
    if (!hasAccess) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const params = new URLSearchParams();
      if (filters.asset_type) params.append('asset_type', filters.asset_type);
      if (filters.city) params.append('city', filters.city);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', '10000'); // Increase limit for Supabase Pro

      const response = await fetch(`${API}/map-crm/properties?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch properties');
      const data = await response.json();
      console.log('[MapCRM] Fetched properties:', data.length);
      setProperties(data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    properties,
    setProperties,
    selectedProperty,
    setSelectedProperty,
    filters,
    setFilters,
    loading,
    hasAccess,
    checkingAccess,
    fetchProperties
  };

  return <MapCRMContext.Provider value={value}>{children}</MapCRMContext.Provider>;
};
