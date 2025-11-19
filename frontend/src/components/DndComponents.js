/**
 * Migration Guide: react-beautiful-dnd to @dnd-kit
 * 
 * For multi-column Kanban boards in Pipeline.js, we need to use @dnd-kit differently.
 * @dnd-kit doesn't have built-in Droppable/Draggable like react-beautiful-dnd.
 * 
 * Instead, we use:
 * 1. useDroppable hook for each column/stage
 * 2. useDraggable hook for each deal card
 * 3. DndContext wraps the entire board
 * 4. onDragEnd handles drop logic
 * 
 * The key difference: We manually handle which column a card is dropped into
 * by checking the `over.id` in onDragEnd and mapping it to stage IDs.
 */

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// Droppable Column Component
export function DroppableColumn({ id, children, isDraggingOver }) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col p-2 rounded-xl transition-all duration-200 h-full"
      style={{
        background: isDraggingOver ? 'rgba(0, 184, 212, 0.08)' : 'transparent',
        border: isDraggingOver ? '2px dashed var(--accent)' : '2px dashed transparent',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      {children}
    </div>
  );
}

// Draggable Deal Card Component
export function DraggableDealCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
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
