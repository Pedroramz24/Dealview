import React, { useState } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { X } from 'lucide-react';

const MapTextAnnotation = ({ annotations, onAddAnnotation, onDeleteAnnotation, editingAnnotation, onUpdateAnnotation }) => {
  return (
    <>
      {/* Existing Saved Annotations */}
      {annotations.map((annotation) => (
        <Marker
          key={annotation.id}
          longitude={annotation.longitude}
          latitude={annotation.latitude}
          anchor="center"
        >
          <div
            contentEditable={false}
            style={{
              color: annotation.color || '#ffffff',
              fontSize: `${annotation.fontSize || 16}px`,
              fontWeight: annotation.bold ? '700' : '500',
              fontStyle: annotation.italic ? 'italic' : 'normal',
              textTransform: annotation.uppercase ? 'uppercase' : 'none',
              transform: `rotate(${annotation.rotation || 0}deg)`,
              textShadow: `
                -2px -2px 6px rgba(0, 0, 0, 0.9),
                2px -2px 6px rgba(0, 0, 0, 0.9),
                -2px 2px 6px rgba(0, 0, 0, 0.9),
                2px 2px 6px rgba(0, 0, 0, 0.9),
                0 0 12px rgba(0, 0, 0, 0.8)
              `,
              whiteSpace: 'nowrap',
              cursor: 'default',
              userSelect: 'none',
              padding: '4px 8px',
              letterSpacing: '0.3px'
            }}
          >
            {annotation.text}
          </div>
        </Marker>
      ))}

      {/* Currently Editing Annotation - Inline Editing */}
      {editingAnnotation && (
        <Marker
          longitude={editingAnnotation.longitude}
          latitude={editingAnnotation.latitude}
          anchor="center"
        >
          <input
            type="text"
            value={editingAnnotation.text}
            onChange={(e) => onUpdateAnnotation({ ...editingAnnotation, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editingAnnotation.text.trim()) {
                onAddAnnotation(editingAnnotation);
              }
            }}
            placeholder="Type here..."
            autoFocus
            maxLength={100}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: editingAnnotation.color || '#ffffff',
              fontSize: `${editingAnnotation.fontSize || 16}px`,
              fontWeight: editingAnnotation.bold ? '700' : '500',
              fontStyle: editingAnnotation.italic ? 'italic' : 'normal',
              textTransform: editingAnnotation.uppercase ? 'uppercase' : 'none',
              transform: `rotate(${editingAnnotation.rotation || 0}deg)`,
              textShadow: `
                -2px -2px 6px rgba(0, 0, 0, 0.9),
                2px -2px 6px rgba(0, 0, 0, 0.9),
                -2px 2px 6px rgba(0, 0, 0, 0.9),
                2px 2px 6px rgba(0, 0, 0, 0.9),
                0 0 12px rgba(0, 0, 0, 0.8)
              `,
              textAlign: 'center',
              minWidth: '150px',
              padding: '4px 8px',
              letterSpacing: '0.3px'
            }}
          />
        </Marker>
      )}
    </>
  );
};

export { MapTextAnnotation };
