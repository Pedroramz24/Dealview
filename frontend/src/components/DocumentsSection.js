import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, File, FileSpreadsheet, FileImage, Video } from 'lucide-react';
import { toast } from 'sonner';

const DocumentsSection = ({ dealId, userId }) => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dealId) {
      fetchDocuments();
    }
  }, [dealId]);

  const fetchDocuments = async () => {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (!userId) {
      toast.error('You must be logged in to upload files');
      return;
    }

    setUploading(true);

    try {
      const { supabase } = await import('../supabaseClient');
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${dealId}/${Date.now()}-${file.name}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('deal-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('deal-documents')
          .getPublicUrl(fileName);

        // Create document record
        const { error: insertError } = await supabase
          .from('documents')
          .insert([{
            deal_id: dealId,
            name: file.name,
            file_url: publicUrl,
            file_type: fileExt,
            file_size: file.size,
            uploaded_by: userId
          }]);

        if (insertError) throw insertError;
      }

      toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded successfully`);
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.name}"?`)) return;

    try {
      const { supabase } = await import('../supabaseClient');
      
      // Extract file path from URL
      const urlParts = doc.file_url.split('/deal-documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0];
        
        // Delete from storage
        await supabase.storage
          .from('deal-documents')
          .remove([filePath]);
      }

      // Delete document record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)) {
      return <FileImage size={20} style={{ color: '#a855f7' }} />;
    } else if (['pdf'].includes(type)) {
      return <FileText size={20} style={{ color: '#ef4444' }} />;
    } else if (['doc', 'docx'].includes(type)) {
      return <FileText size={20} style={{ color: '#3b82f6' }} />;
    } else if (['xls', 'xlsx', 'csv'].includes(type)) {
      return <FileSpreadsheet size={20} style={{ color: '#10b981' }} />;
    } else if (['mp4', 'mov', 'avi'].includes(type)) {
      return <Video size={20} style={{ color: '#f59e0b' }} />;
    } else {
      return <File size={20} style={{ color: '#6b7280' }} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.03)', 
      border: '1px solid rgba(0, 184, 212, 0.3)', 
      borderRadius: '12px', 
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
          Documents ({documents.length})
        </h3>
        <label htmlFor="document-upload" style={{ cursor: 'pointer' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: uploading ? 'rgba(255,255,255,0.05)' : 'rgba(0, 184, 212, 0.1)',
            border: '1px solid rgba(0, 184, 212, 0.3)',
            borderRadius: '8px',
            color: uploading ? 'rgba(255,255,255,0.4)' : '#00b8d4',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s',
            pointerEvents: uploading ? 'none' : 'auto'
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = 'rgba(0, 184, 212, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}>
            <Upload size={16} />
            <span>{uploading ? 'Uploading...' : 'Upload Documents'}</span>
          </div>
          <input
            id="document-upload"
            type="file"
            multiple
            onChange={handleDocumentUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
          Loading documents...
        </div>
      ) : documents.length > 0 ? (
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.05)',
          overflow: 'hidden'
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 100px 120px 80px',
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            fontSize: '12px',
            fontWeight: '600',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <div>Type</div>
            <div>Name</div>
            <div>Size</div>
            <div>Date</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {/* Document Rows */}
          {documents.map((doc, index) => (
            <div
              key={doc.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 100px 120px 80px',
                gap: '16px',
                padding: '12px 16px',
                alignItems: 'center',
                borderBottom: index < documents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                transition: 'background 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {getFileIcon(doc.file_type)}
              </div>
              <div style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {doc.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                {formatFileSize(doc.file_size)}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                {formatDate(doc.created_at)}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <a
                  href={doc.file_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '6px',
                    background: 'rgba(0, 184, 212, 0.1)',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
                    borderRadius: '6px',
                    color: '#00b8d4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 184, 212, 0.2)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={14} />
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDocument(doc);
                  }}
                  style={{
                    padding: '6px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '8px',
          border: '2px dashed rgba(255,255,255,0.1)'
        }}>
          <FileText size={48} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px' }}>
            No documents uploaded yet
          </p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
            Click "Upload Documents" to add files
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentsSection;
