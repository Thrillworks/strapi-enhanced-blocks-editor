import * as React from 'react';
import type { Path } from 'slate';

interface KeyboardDragAndDropOptions {
  onGrabItem?: (index: Path) => void;
  onDropItem?: (index: Path, newIndex?: Path) => void;
  onCancel?: (index: Path) => void;
  onMoveItem?: (newIndex: Path, dragIndex: Path) => void;
}

/**
 * Utility hook designed to implement keyboard accessible drag and drop by
 * returning an onKeyDown handler to be passed to the drag icon button.
 *
 * @internal - You should use `useDragAndDrop` instead.
 */
const useKeyboardDragAndDrop = (
  active: boolean,
  index: Path,
  { onCancel, onDropItem, onGrabItem, onMoveItem }: KeyboardDragAndDropOptions,
) => {
  const [isSelected, setIsSelected] = React.useState(false);

  const handleMove = (movement: 'UP' | 'DOWN') => {
    if (!isSelected || !onMoveItem || !Array.isArray(index)) {
      return;
    }

    const lastIndex = index[index.length - 1];

    if (movement === 'UP' && lastIndex > 0) {
      const newIndex = [...index.slice(0, -1), lastIndex - 1];
      onMoveItem(newIndex, index);
    } else if (movement === 'DOWN') {
      const newIndex = [...index.slice(0, -1), lastIndex + 1];
      onMoveItem(newIndex, index);
    }
  };

  const handleDragClick = () => {
    if (isSelected) {
      onDropItem?.(index);
      setIsSelected(false);
    } else {
      onGrabItem?.(index);
      setIsSelected(true);
    }
  };

  const handleCancel = () => {
    if (isSelected) {
      setIsSelected(false);
      onCancel?.(index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!active) {
      return;
    }

    if (e.key === 'Tab') {
      if (isSelected) {
        onDropItem?.(index);
        setIsSelected(false);
      }
      return;
    }

    e.preventDefault();

    switch (e.key) {
      case ' ':
      case 'Enter':
        handleDragClick();
        break;
      case 'Escape':
        handleCancel();
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        handleMove('DOWN');
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        handleMove('UP');
        break;
    }
  };

  return handleKeyDown;
};

export { useKeyboardDragAndDrop };
