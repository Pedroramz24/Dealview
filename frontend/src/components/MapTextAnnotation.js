import React, { useState } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { Type, X, Check } from 'lucide-react';

const MapTextAnnotation = ({ annotations, onAddAnnotation, onDeleteAnnotation, isAnnotationMode, onToggleMode }) => {
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [annotationText, setAnnotationText] = useState('');

  const handleSaveAnnotation = () => {
    if (!annotationText.trim()) return;
    
    onAddAnnotation({
      id: Date.now(),
      text: annotationText,
      latitude: editingAnnotation.latitude,
      longitude: editingAnnotation.longitude
    });
    
    setEditingAnnotation(null);
    setAnnotationText('');
  };

  const handleCancelAnnotation = () => {
    setEditingAnnotation(null);
    setAnnotationText('');
  };

  return (
    <>
      {/* Existing Annotations */}
      {annotations.map((annotation) => (
        <Marker
          key={annotation.id}
          longitude={annotation.longitude}
          latitude={annotation.latitude}
          anchor="center"
        >
          <div
            style={{
              position: 'relative',
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 184, 212, 0.5)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 184, 212, 0.3), 0 0 20px rgba(0, 184, 212, 0.2)',
              cursor: 'default',
              maxWidth: '200px',
              wordWrap: 'break-word',
              whiteSpace: 'normal'
            }}
          >
            {annotation.text}
            <button
              onClick={() => onDeleteAnnotation(annotation.id)}
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <X size={12} strokeWidth={3} />
            </button>
          </div>
        </Marker>
      ))}

      {/* Editing Annotation Input */}
      {editingAnnotation && (
        <Marker
          longitude={editingAnnotation.longitude}
          latitude={editingAnnotation.latitude}
          anchor="center"
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.95)',
              backdropFilter: 'blur(15px)',
              border: '2px solid #00b8d4',
              borderRadius: '10px',
              padding: '12px',
              boxShadow: '0 6px 24px rgba(0, 184, 212, 0.5)',
              minWidth: '220px'
            }}
          >
            <input
              type="text"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSaveAnnotation();
                if (e.key === 'Escape') handleCancelAnnotation();
              }}
              placeholder="Enter label..."
              autoFocus
              maxLength={50}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500',
                outline: 'none',
                marginBottom: '8px'
              }}
            />
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelAnnotation}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnnotation}
                disabled={!annotationText.trim()}
                style={{
                  padding: '6px 12px',
                  background: annotationText.trim() ? '#00b8d4' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(0, 184, 212, 0.3)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: annotationText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (annotationText.trim()) e.currentTarget.style.background = '#00d4ed';
                }}
                onMouseLeave={(e) => {
                  if (annotationText.trim()) e.currentTarget.style.background = '#00b8d4';
                }}
              >
                <Check size={14} />
                Save
              </button>
            </div>
          </div>
        </Marker>
      )}
    </>
  );
};

export { MapTextAnnotation };
