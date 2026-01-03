import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapCRMProvider, useMapCRM } from '../../contexts/MapCRMContext';
import MapView from './MapView';
import CSVImport from './CSVImport';
import { Button } from '../../components/ui/button';
import { Upload, MapPin, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

const MapCRMContent = () => {
  const { hasAccess, checkingAccess, fetchProperties, loading, properties } = useMapCRM();
  const [showImport, setShowImport] = React.useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[MapCRM Content] checkingAccess:', checkingAccess, 'hasAccess:', hasAccess);
    if (!checkingAccess && !hasAccess) {
      console.log('[MapCRM Content] Redirecting to workspace - no access');
      navigate('/workspace');
    }
  }, [hasAccess, checkingAccess, navigate]);

  useEffect(() => {
    if (hasAccess) {
      console.log('[MapCRM Content] Fetching properties');
      fetchProperties();
    }
  }, [hasAccess]);

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert className="max-w-md">
          <AlertDescription>
            Access denied. This internal tool requires special permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">Map CRM</h1>
            <p className="text-sm text-gray-500">
              {properties.length} properties loaded
            </p>
          </div>
        </div>
        <Button onClick={() => setShowImport(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <MapView />
        )}
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <CSVImport
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImportComplete={() => {
            setShowImport(false);
            fetchProperties();
          }}
        />
      )}
    </div>
  );
};

const MapCRM = () => {
  return (
    <MapCRMProvider>
      <MapCRMContent />
    </MapCRMProvider>
  );
};

export default MapCRM;
