import React, { useRef, useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre';

const MapTextAnnotation = ({ 
  annotations, 
  onAddAnnotation, 
  onDeleteAnnotation, 
  onMoveAnnotation,
  editingAnnotation, 
  onUpdateAnnotation 
}) => {
  const inputRef = useRef(null);

  // Focus input when editing annotation is created
  useEffect(() => {
    if (editingAnnotation && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [editingAnnotation]);

  return (
    <>
      {/* Saved Annotations - Draggable, No Background */}
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
              color: annotation.color || '#ffffff',
              fontSize: `${annotation.fontSize || 16}px`,
              fontWeight: annotation.bold ? '700' : '500',
              fontStyle: annotation.italic ? 'italic' : 'normal',
              textTransform: annotation.uppercase ? 'uppercase' : 'none',
              transform: `rotate(${annotation.rotation || 0}deg)`,
              textShadow: `
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000,
                -2px -2px 3px rgba(0, 0, 0, 0.9),
                2px -2px 3px rgba(0, 0, 0, 0.9),
                -2px 2px 3px rgba(0, 0, 0, 0.9),
                2px 2px 3px rgba(0, 0, 0, 0.9),
                0 0 6px rgba(0, 0, 0, 0.8)
              `,
              whiteSpace: 'nowrap',
              cursor: 'move',
              userSelect: 'none',
              padding: '2px',
              letterSpacing: '0.5px',
              lineHeight: '1'
            }}
          >
            {annotation.text}
          </div>
        </Marker>
      ))}

      {/* Editing Input - Clean, No Background */}
      {editingAnnotation && (
        <Marker
          longitude={editingAnnotation.longitude}
          latitude={editingAnnotation.latitude}
          anchor="center"
          draggable={false}
        >
          <div 
            style={{ 
              position: 'relative',
              pointerEvents: 'auto',
              zIndex: 9999
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={editingAnnotation.text}
              onChange={(e) => {
                e.stopPropagation();
                onUpdateAnnotation({ ...editingAnnotation, text: e.target.value });
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && editingAnnotation.text.trim()) {
                  e.preventDefault();
                  onAddAnnotation(editingAnnotation);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onUpdateAnnotation(null);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              placeholder="Type label..."
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
                  -1px -1px 0 #000,
                  1px -1px 0 #000,
                  -1px 1px 0 #000,
                  1px 1px 0 #000,
                  -2px -2px 3px rgba(0, 0, 0, 0.9),
                  2px -2px 3px rgba(0, 0, 0, 0.9),
                  -2px 2px 3px rgba(0, 0, 0, 0.9),
                  2px 2px 3px rgba(0, 0, 0, 0.9),
                  0 0 6px rgba(0, 0, 0, 0.8)
                `,
                textAlign: 'center',
                minWidth: '200px',
                width: 'auto',
                padding: '2px',
                letterSpacing: '0.5px',
                cursor: 'text',
                pointerEvents: 'auto',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
                userSelect: 'text'
              }}
            />
          </div>
        </Marker>
      )}
    </>
  );
};

export { MapTextAnnotation };
