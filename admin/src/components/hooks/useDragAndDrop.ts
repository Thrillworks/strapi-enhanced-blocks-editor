import * as React from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { useKeyboardDragAndDrop } from './useKeyboardDragAndDrop';
import type { Path } from 'slate';

const ItemTypes = {
  COMPONENT: 'component',
  EDIT_FIELD: 'editField',
  FIELD: 'field',
  DYNAMIC_ZONE: 'dynamicZone',
  RELATION: 'relation',
  BLOCKS: 'blocks',
} as const;

const DIRECTIONS = {
  UPWARD: 'upward',
  DOWNWARD: 'downward',
} as const;

const DROP_SENSITIVITY = {
  REGULAR: 'regular',
  IMMEDIATE: 'immediate',
} as const;

interface DragAndDropOptions {
  type: string;
  index: Path;
  item: {
    index: Path;
    displayedValue?: React.ReactNode;
    id?: string;
    [key: string]: unknown;
  };
  onStart?: () => void;
  onEnd?: () => void;
  onGrabItem?: (index: Path) => void;
  onDropItem?: (currentIndex: Path, newIndex?: Path) => void;
  onCancel?: (index: Path) => void;
  onMoveItem?: (newIndex: Path, dragIndex: Path) => void;
  dropSensitivity?: (typeof DROP_SENSITIVITY)[keyof typeof DROP_SENSITIVITY];
}

/**
 * A utility hook abstracting the general drag and drop hooks from react-dnd.
 * Centralising the same behaviours and by default offering keyboard support.
 */
const useDragAndDrop = (active: boolean, options: DragAndDropOptions) => {
  const {
    type = 'STRAPI_DND',
    index,
    item,
    onStart,
    onEnd,
    onGrabItem,
    onDropItem,
    onCancel,
    onMoveItem,
    dropSensitivity = DROP_SENSITIVITY.REGULAR,
  } = options;

  const objectRef = React.useRef<HTMLDivElement>(null);

  const [{ handlerId, isOver }, dropRef] = useDrop({
    accept: type,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
        isOver: monitor.isOver({ shallow: true }),
      };
    },
    drop(draggedItem: any) {
      const draggedIndex = draggedItem.index;
      const newIndex = index;
      if (onDropItem && draggedIndex !== newIndex) {
        onDropItem(draggedIndex, newIndex);
      }
    },
    hover(draggedItem: any, monitor) {
      if (!objectRef.current || !onMoveItem) {
        return;
      }

      const dragIndex = draggedItem.index;
      const newIndex = index;
      const hoverBoundingRect = objectRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (typeof dragIndex === 'number' && typeof newIndex === 'number') {
        if (dragIndex === newIndex) {
          return;
        }

        if (dropSensitivity === DROP_SENSITIVITY.REGULAR) {
          if (dragIndex < newIndex && hoverClientY < hoverMiddleY) {
            return;
          }
          if (dragIndex > newIndex && hoverClientY > hoverMiddleY) {
            return;
          }
        }

        onMoveItem(newIndex as unknown as Path, dragIndex as unknown as Path);
        draggedItem.index = newIndex;
      } else if (Array.isArray(dragIndex) && Array.isArray(newIndex)) {
        const minLength = Math.min(dragIndex.length, newIndex.length);
        let areEqual = true;
        let isLessThan = false;
        let isGreaterThan = false;

        for (let i = 0; i < minLength; i++) {
          if (dragIndex[i] < newIndex[i]) {
            isLessThan = true;
            areEqual = false;
            break;
          } else if (dragIndex[i] > newIndex[i]) {
            isGreaterThan = true;
            areEqual = false;
            break;
          }
        }

        if (areEqual && dragIndex.length === newIndex.length) {
          return;
        }

        if (dropSensitivity === DROP_SENSITIVITY.REGULAR) {
          if (isLessThan && !isGreaterThan && hoverClientY < hoverMiddleY) {
            return;
          }
          if (isGreaterThan && !isLessThan && hoverClientY > hoverMiddleY) {
            return;
          }
        }

        onMoveItem(newIndex as unknown as Path, dragIndex as unknown as Path);
        draggedItem.index = newIndex;
      }
    },
  });

  const getDragDirection = (monitor: {
    isDragging: () => boolean;
    didDrop: () => boolean;
    getInitialClientOffset: () => { y: number } | null;
    getClientOffset: () => { y: number } | null;
  }) => {
    if (
      monitor &&
      monitor.isDragging() &&
      !monitor.didDrop() &&
      monitor.getInitialClientOffset() &&
      monitor.getClientOffset()
    ) {
      const deltaY = monitor.getInitialClientOffset()!.y - monitor.getClientOffset()!.y;
      if (deltaY > 0) return DIRECTIONS.UPWARD;
      if (deltaY < 0) return DIRECTIONS.DOWNWARD;
      return null;
    }
    return null;
  };

  const [{ isDragging, direction }, dragRef, dragPreviewRef] = useDrag({
    type,
    item() {
      onStart?.();
      const { width } = objectRef.current?.getBoundingClientRect() ?? {};
      return {
        ...item,
        index,
        width,
      };
    },
    end() {
      onEnd?.();
    },
    canDrag: active,
    isDragging: item?.id ? (monitor) => item.id === monitor.getItem<{ id?: string }>().id : undefined,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      initialOffset: monitor.getInitialClientOffset(),
      currentOffset: monitor.getClientOffset(),
      direction: getDragDirection(monitor),
    }),
  });

  const handleKeyDown = useKeyboardDragAndDrop(active, index, {
    onGrabItem,
    onDropItem,
    onCancel,
    onMoveItem,
  });

  return [
    {
      handlerId,
      isDragging,
      handleKeyDown,
      isOverDropTarget: isOver,
      direction,
    },
    objectRef,
    dropRef,
    dragRef,
    dragPreviewRef,
  ] as const;
};

export { ItemTypes, DIRECTIONS, DROP_SENSITIVITY, useDragAndDrop };
