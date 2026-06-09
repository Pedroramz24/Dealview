/**
 * Drag-and-Drop Components for @dnd-kit
 * Used for multi-column Kanban board
 */

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Droppable Column Component for Kanban
export function DroppableStageColumn({ stageId, children, isOver }) {
  const { setNodeRef } = useDroppable({
    id: stageId,
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col p-2 rounded-xl transition-all duration-200 h-full"
      style={{
        background: isOver ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
        border: isOver ? '2px dashed var(--accent)' : '2px dashed transparent',
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: '200px'
      }}
    >
      {children}
    </div>
  );
}

// Draggable Deal Card Component
export function DraggableDealCard({ dealId, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dealId,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1, // Fully hide original card when dragging (overlay shows instead)
    cursor: isDragging ? 'grabbing' : 'grab',
    marginBottom: '12px',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}
