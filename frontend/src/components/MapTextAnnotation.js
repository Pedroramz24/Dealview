import React from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { X } from 'lucide-react';

const MapTextAnnotation = ({ 
  annotations, 
  onAddAnnotation, 
  onDeleteAnnotation, 
  onMoveAnnotation,
  editingAnnotation, 
  onUpdateAnnotation 
}) => {
  return (
    <>
      {/* Saved Annotations - Draggable */}
      {annotations.map((annotation) => (
        <Marker
          key={annotation.id}
          longitude={annotation.longitude}
          latitude={annotation.latitude}
          anchor="center"
          draggable={true}
          onDragEnd={(e) => {
            onMoveAnnotation(annotation.id, e.lngLat.lng, e.lngLat.lat);
          }}
        >
          <div
            style={{
              position: 'relative',
              color: annotation.color || '#ffffff',
              fontSize: `${annotation.fontSize || 16}px`,
              fontWeight: annotation.bold ? '700' : '500',
              fontStyle: annotation.italic ? 'italic' : 'normal',
              textTransform: annotation.uppercase ? 'uppercase' : 'none',
              transform: `rotate(${annotation.rotation || 0}deg)`,
              textShadow: `
                -2px -2px 4px rgba(0, 0, 0, 1),
                2px -2px 4px rgba(0, 0, 0, 1),
                -2px 2px 4px rgba(0, 0, 0, 1),
                2px 2px 4px rgba(0, 0, 0, 1),
                0 0 8px rgba(0, 0, 0, 0.9),
                0 0 16px rgba(0, 0, 0, 0.7)
              `,
              whiteSpace: 'nowrap',
              cursor: 'move',
              userSelect: 'none',
              padding: '4px',
              letterSpacing: '0.5px',
              lineHeight: '1.2'
            }}
          >
            {annotation.text}
          </div>
        </Marker>
      ))}

      {/* Currently Editing - Inline Input */}
      {editingAnnotation && (
        <Marker
          longitude={editingAnnotation.longitude}
          latitude={editingAnnotation.latitude}
          anchor="center"
          draggable={false}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ 
              pointerEvents: 'auto',
              cursor: 'text'
            }}
          >
            <input
              type="text"
              value={editingAnnotation.text}
              onChange={(e) => {
                e.stopPropagation();
                onUpdateAnnotation({ ...editingAnnotation, text: e.target.value });
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && editingAnnotation.text.trim()) {
                  onAddAnnotation(editingAnnotation);
                } else if (e.key === 'Escape') {
                  onUpdateAnnotation(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Type label..."
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
                  -2px -2px 4px rgba(0, 0, 0, 1),
                  2px -2px 4px rgba(0, 0, 0, 1),
                  -2px 2px 4px rgba(0, 0, 0, 1),
                  2px 2px 4px rgba(0, 0, 0, 1),
                  0 0 8px rgba(0, 0, 0, 0.9),
                  0 0 16px rgba(0, 0, 0, 0.7)
                `,
                textAlign: 'center',
                minWidth: '200px',
                padding: '4px',
                letterSpacing: '0.5px',
                cursor: 'text',
                pointerEvents: 'auto'
              }}
            />
          </div>
        </Marker>
      )}
    </>
  );
};

export { MapTextAnnotation };
