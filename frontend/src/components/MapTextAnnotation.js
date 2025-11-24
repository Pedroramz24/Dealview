import React, { useRef, useEffect } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import { X } from 'lucide-react';

const MapTextAnnotation = ({ 
  annotations, 
  onAddAnnotation, 
  onDeleteAnnotation, 
  onMoveAnnotation,
  onEditAnnotation,
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
      {/* Saved Annotations - Draggable and Editable */}
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
            onClick={(e) => {
              e.stopPropagation();
              onEditAnnotation(annotation);
            }}
            style={{
              position: 'relative',
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
              padding: 0,
              margin: 0,
              letterSpacing: '0.5px',
              lineHeight: '1',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              pointerEvents: 'auto'
            }}
          >
            {annotation.text}
            {/* Delete button appears on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAnnotation(annotation.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                opacity: 0,
                pointerEvents: 'auto'
              }}
              className="annotation-delete-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <X size={12} strokeWidth={3} />
            </button>
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
              zIndex: 9999,
              background: 'transparent',
              padding: 0,
              margin: 0
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
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
                padding: 0,
                margin: 0,
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
                letterSpacing: '0.5px',
                cursor: 'text',
                pointerEvents: 'auto',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
                userSelect: 'text',
                boxShadow: 'none',
                WebkitAppearance: 'none'
              }}
            />
          </div>
        </Marker>
      )}
    </>
  );
};

export { MapTextAnnotation };
