import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { API } from '../../App';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const CSVImport = ({ isOpen, onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Please select a CSV file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API}/map-crm/properties/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Import failed');
      }

      const data = await response.json();
      setResult(data);

      // Auto-close after success
      setTimeout(() => {
        onImportComplete();
      }, 2000);

    } catch (err) {
      console.error('Import error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Properties from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with property data. The file must include: address, city, state, zip_code, asset_type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
              disabled={uploading}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">Click to select CSV file</p>
                </div>
              )}
            </label>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {result && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-800">Import Complete!</p>
                <p className="text-sm text-green-700 mt-1">
                  {result.successful_rows} of {result.total_rows} properties imported successfully.
                </p>
                {result.failed_rows > 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    {result.failed_rows} properties failed to import.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* CSV Format Help */}
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Required Columns:</p>
            <p className="text-xs text-gray-600 font-mono">
              address, city, state, zip_code, asset_type
            </p>
            <p className="text-xs text-gray-500 mt-2">
              <strong>Asset types:</strong> Gas, Retail, Industrial, Office, Land, Multifamily
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Upload & Import'
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImport;
