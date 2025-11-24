import React, { useState, useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { Type, X, Check } from 'lucide-react';

const MapTextAnnotation = ({ annotations, onAddAnnotation, onDeleteAnnotation }) => {
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
              whiteSpace: 'normal',
              boxShadow: '0 4px 12px rgba(0, 184, 212, 0.3), 0 0 20px rgba(0, 184, 212, 0.2)',
              cursor: 'default',
              maxWidth: '200px',
              wordWrap: 'break-word'
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
    </>
  );
};

export { MapTextAnnotation };
