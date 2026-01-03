import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const MapCRMDebug = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setDebugInfo({ error: 'No user logged in' });
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, permissions')
        .eq('id', user.id)
        .single();

      setDebugInfo({
        user: {
          id: user.id,
          email: user.email
        },
        profile: profile,
        error: error,
        hasMapCRMAccess: profile?.permissions?.map_crm_access === true
      });
    } catch (err) {
      setDebugInfo({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <Card className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Map CRM Debug Info</h1>
        
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-semibold mb-2">Debug Information:</h2>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>

            <div className="mt-4">
              {debugInfo?.hasMapCRMAccess ? (
                <div className="bg-green-50 border border-green-200 p-4 rounded">
                  <p className="text-green-800 font-semibold">✅ You have Map CRM access!</p>
                  <Button 
                    onClick={() => window.location.href = '/internal/map-crm'}
                    className="mt-2"
                  >
                    Go to Map CRM
                  </Button>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 p-4 rounded">
                  <p className="text-red-800 font-semibold">❌ No Map CRM access</p>
                  <p className="text-sm text-red-600 mt-1">
                    Permissions in database: {JSON.stringify(debugInfo?.profile?.permissions)}
                  </p>
                </div>
              )}
            </div>

            <Button onClick={checkAccess} variant="outline">
              Refresh Check
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MapCRMDebug;
