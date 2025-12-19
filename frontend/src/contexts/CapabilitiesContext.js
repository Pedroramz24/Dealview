import React, { createContext, useContext, useState, useEffect } from 'react';
import { API } from '../App';
import { supabase } from '../supabaseClient';
import { computeCapabilities } from '../utils/capabilities';

const CapabilitiesContext = createContext(null);

export const CapabilitiesProvider = ({ children }) => {
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCapabilities = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      // Fetch roles and permissions in parallel
      const [rolesResponse, permissionsResponse] = await Promise.all([
        fetch(`${API}/roles/my-roles`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`${API}/roles/my-permissions`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      if (rolesResponse.ok && permissionsResponse.ok) {
        const rolesData = await rolesResponse.json();
        const permissionsData = await permissionsResponse.json();
        
        // Compute capabilities
        const caps = computeCapabilities(rolesData, permissionsData);
        setCapabilities(caps);
      }
    } catch (error) {
      console.error('Error fetching capabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapabilities();
  }, []);

  return (
    <CapabilitiesContext.Provider value={{ capabilities, loading, refetch: fetchCapabilities }}>
      {children}
    </CapabilitiesContext.Provider>
  );
};

export const useCapabilities = () => {
  const context = useContext(CapabilitiesContext);
  if (!context) {
    throw new Error('useCapabilities must be used within CapabilitiesProvider');
  }
  return context;
};
