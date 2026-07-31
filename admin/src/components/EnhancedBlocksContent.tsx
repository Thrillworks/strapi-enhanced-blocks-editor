import { jsxs, jsx } from 'react/jsx-runtime';
import * as React from 'react';
import { Box, Flex, IconButton, useComposedRefs } from '@strapi/design-system';
import { Drag } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Transforms, Editor, Range, Path, BaseEditor } from 'slate';
import { Editable, ReactEditor } from 'slate-react';
import { styled, css } from 'styled-components';
import { useStrapiBlocksEditorContext } from './EnhancedBlocksEditor';
import { getTranslation } from '../utils/getTranslation';
import { ItemTypes, DIRECTIONS, useDragAndDrop } from './hooks/useDragAndDrop';
import type { Identifier } from 'dnd-core';

// Types
interface Block {
  renderElement: (props: any) => JSX.Element;
  icon: React.ComponentType<any>;
  label: { id: string; defaultMessage: string };
  matchNode: (node: any) => boolean;
  isInBlocksSelector?: boolean;
  dragHandleTopMargin?: string;
  handleConvert?: (editor: any) => any;
  handleEnterKey?: (editor: any) => void;
  handleBackspaceKey?: (editor: any, event: React.KeyboardEvent) => void;
  handleTab?: (editor: any) => void;
  snippets?: string[];
}

interface Modifier {
  icon: React.ComponentType<any>;
  isValidEventKey: (event: React.KeyboardEvent) => boolean;
  label: { id: string; defaultMessage: string };
  checkIsActive: (editor: any) => boolean;
  handleToggle: (editor: any) => void;
  renderLeaf: (children: React.ReactNode) => JSX.Element;
}

interface DragAndDropElementProps {
  children: React.ReactNode;
  index: Path;
  setDragDirection: (direction: string | null) => void;
  dragDirection: string | null;
  dragHandleTopMargin?: string;
}

interface CloneDragItemProps {
  children: React.ReactNode;
  dragHandleTopMargin?: string;
}

interface EnhancedBlocksContentProps {
  placeholder?: string;
  ariaLabelId?: string;
}

interface RenderElementProps {
  props: any;
  blocks: Record<string, Block>;
  editor: BaseEditor & ReactEditor;
  setDragDirection: (direction: string | null) => void;
  dragDirection: string | null;
}

// Helper to check if a node is a list
const isListNode = (node: any): boolean => {
  return node && typeof node === 'object' && node.type === 'list';
};

// Helper to get object entries
const getEntries = <T extends object>(obj: T) => Object.entries(obj);

const StyledEditable = styled(Editable) <{ isExpandedMode?: boolean }>`
  outline: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }: { theme: any }) => theme.spaces[3]};
  height: 100%;
  width: ${(props: any) => props.isExpandedMode ? '512px' : '100%'};
  margin: auto;

  > *:last-child {
    padding-bottom: ${({ theme }: { theme: any }) => theme.spaces[3]};
  }
`;

const Wrapper = styled(Box) <{ isOverDropTarget?: boolean }>`
  position: ${({ isOverDropTarget }: { isOverDropTarget?: boolean }) => isOverDropTarget && 'relative'};
`;

const DropPlaceholder = styled(Box) <{ dragDirection?: string | null; placeholderMargin?: number }>`
  position: absolute;
  right: 0;

  ${({ dragDirection, theme, placeholderMargin }: { dragDirection?: string | null; theme: any; placeholderMargin?: number }) => css`
    top: ${dragDirection === DIRECTIONS.UPWARD && `-${theme.spaces[placeholderMargin || 2]}`};
    bottom: ${dragDirection === DIRECTIONS.DOWNWARD && `-${theme.spaces[placeholderMargin || 2]}`};
  `}
`;

const DragItem = styled(Flex) <{ $dragVisibility?: string }>`
  & > [data-slate-node='element'] {
    width: 100%;
    opacity: inherit;
  }

  [role='button'] {
    visibility: ${(props: any) => props.$dragVisibility};
    opacity: inherit;
  }
  &[aria-disabled='true'] {
    user-drag: none;
  }
`;

const DragIconButton = styled(IconButton) <{ $dragHandleTopMargin?: string }>`
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: ${({ theme }: { theme: any }) => theme.borderRadius};
  padding-left: ${({ theme }: { theme: any }) => theme.spaces[0]};
  padding-right: ${({ theme }: { theme: any }) => theme.spaces[0]};
  padding-top: ${({ theme }: { theme: any }) => theme.spaces[1]};
  padding-bottom: ${({ theme }: { theme: any }) => theme.spaces[1]};
  visibility: hidden;
  cursor: grab;
  opacity: inherit;
  margin-top: ${(props: any) => props.$dragHandleTopMargin ?? 0};

  &:hover {
    background: ${({ theme }: { theme: any }) => theme.colors.neutral100};
  }
  &:active {
    cursor: grabbing;
    background: ${({ theme }: { theme: any }) => theme.colors.neutral150};
  }
  &[aria-disabled='true'] {
    visibility: hidden;
  }
  svg {
    min-width: ${({ theme }: { theme: any }) => theme.spaces[3]};

    path {
      fill: ${({ theme }: { theme: any }) => theme.colors.neutral500};
    }
  }
`;

// Full DragAndDropElement with react-dnd integration
const DragAndDropElement = ({ children, index, setDragDirection, dragDirection, dragHandleTopMargin }: DragAndDropElementProps) => {
  const { editor, disabled, name: fieldName, setLiveText } = useStrapiBlocksEditorContext('drag-and-drop');
  const { formatMessage } = useIntl();
  const [dragVisibility, setDragVisibility] = React.useState<string>('hidden');

  const handleMoveBlock = React.useCallback((newIndex: Path, currentIndex: Path) => {
    Transforms.moveNodes(editor, {
      at: currentIndex,
      to: newIndex
    });
    // Add 1 to the index for the live text message
    const currentIndexPosition = [
      currentIndex[0] + 1,
      ...currentIndex.slice(1)
    ];
    const newIndexPosition = [
      newIndex[0] + 1,
      ...newIndex.slice(1)
    ];
    setLiveText(formatMessage({
      id: getTranslation('components.Blocks.dnd.reorder'),
      defaultMessage: '{item}, moved. New position in the editor: {position}.'
    }, {
      item: `${fieldName}.${currentIndexPosition.join(',')}`,
      position: `${newIndexPosition.join(',')} of ${editor.children.length}`
    }));
  }, [editor, formatMessage, fieldName, setLiveText]);

  const [dragDropState, blockRef, dropRef, dragRef] = useDragAndDrop(!disabled, {
    type: `${ItemTypes.BLOCKS}_${fieldName}`,
    index,
    item: {
      index,
      displayedValue: children
    },
    onMoveItem: (newIndex: Path, currentIndex: Path) => {
      handleMoveBlock(newIndex, currentIndex);
    },
    onDropItem: (currentIndex: Path, newIndex?: Path) => {
      if (newIndex) handleMoveBlock(newIndex, currentIndex);
    }
  });

  const { handlerId, isDragging, isOverDropTarget, direction, handleKeyDown } = dragDropState as {
    handlerId: Identifier | null;
    isDragging: boolean;
    isOverDropTarget: boolean;
    direction: string | null;
    handleKeyDown: (e: React.KeyboardEvent) => void;
  };

  const composedBoxRefs = useComposedRefs(blockRef as unknown as React.RefObject<HTMLDivElement>, dropRef as any);

  // Set Drag direction before losing state while dragging
  React.useEffect(() => {
    if (direction) {
      setDragDirection(direction);
    }
  }, [direction, setDragDirection]);

  // On selection change hide drag handle
  React.useEffect(() => {
    setDragVisibility('hidden');
  }, [editor.selection]);

  return jsxs(Wrapper, {
    ref: composedBoxRefs,
    isOverDropTarget: isOverDropTarget,
    children: [
      isOverDropTarget && jsx(DropPlaceholder, {
        borderStyle: "solid",
        borderColor: "secondary200",
        borderWidth: "2px",
        width: "calc(100% - 24px)",
        marginLeft: "auto",
        dragDirection: dragDirection,
        placeholderMargin: (children as any)?.props?.as === 'li' ? 1 : 2
      }),
      isDragging ? jsx(CloneDragItem, {
        dragHandleTopMargin: dragHandleTopMargin,
        children: children
      }) : jsxs(DragItem, {
        ref: dragRef,
        "data-handler-id": handlerId,
        gap: 2,
        paddingLeft: 2,
        alignItems: "start",
        onDragStart: (event: React.DragEvent) => {
          const target = event.target as HTMLElement;
          const currentTarget = event.currentTarget as HTMLElement;
          // Dragging action should only trigger drag event when button is dragged
          if (target.getAttribute('role') !== 'button') {
            event.preventDefault();
          } else {
            currentTarget.style.opacity = '0.5';
          }
        },
        onDragEnd: (event: React.DragEvent) => {
          const currentTarget = event.currentTarget as HTMLElement;
          currentTarget.style.opacity = '1';
        },
        onMouseMove: () => setDragVisibility('visible'),
        onSelect: () => setDragVisibility('visible'),
        onMouseLeave: () => setDragVisibility('hidden'),
        "aria-disabled": disabled,
        $dragVisibility: dragVisibility,
        children: [
          jsx(DragIconButton, {
            tag: "div",
            contentEditable: false,
            role: "button",
            tabIndex: 0,
            withTooltip: false,
            label: formatMessage({
              id: getTranslation('components.DragHandle-label'),
              defaultMessage: 'Drag'
            }),
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
            onKeyDown: handleKeyDown,
            "aria-disabled": disabled,
            disabled: disabled,
            draggable: true,
            $dragHandleTopMargin: dragHandleTopMargin,
            children: jsx(Drag, {
              color: "primary500"
            })
          }),
          children
        ]
      })
    ]
  });
};

// To prevent applying opacity to the original item being dragged, display a cloned element without opacity.
const CloneDragItem = ({ children, dragHandleTopMargin }: CloneDragItemProps) => {
  const { formatMessage } = useIntl();
  return jsxs(DragItem, {
    gap: 2,
    paddingLeft: 2,
    alignItems: "start",
    $dragVisibility: "visible",
    children: [
      jsx(DragIconButton, {
        tag: "div",
        role: "button",
        withTooltip: false,
        label: formatMessage({
          id: getTranslation('components.DragHandle-label'),
          defaultMessage: 'Drag'
        }),
        $dragHandleTopMargin: dragHandleTopMargin,
        children: jsx(Drag, {
          color: "neutral600"
        })
      }),
      children
    ]
  });
};

const baseRenderLeaf = (props: any, modifiers: Record<string, Modifier>) => {
  const wrappedChildren = getEntries(modifiers).reduce((currentChildren, modifierEntry) => {
    const [name, modifier] = modifierEntry as [string, Modifier];
    if (props.leaf[name]) {
      return modifier.renderLeaf(currentChildren);
    }
    return currentChildren;
  }, props.children);
  return jsx('span', {
    ...props.attributes,
    className: props.leaf.className,
    children: wrappedChildren
  });
};

/**
 * Renders elements with proper handling for inline vs block elements.
 * Inline elements (like inline embedded-entry) render directly without drag wrapper.
 * Block elements get wrapped with DragAndDropElement.
 */
const baseRenderElement = ({ props, blocks, editor, setDragDirection, dragDirection }: RenderElementProps) => {
  const { element } = props;
  const blockMatch = Object.values(blocks).find((block) => block.matchNode(element));
  const block = blockMatch || blocks.paragraph;
  const nodePath = (ReactEditor as any).findPath(editor, element);

  // Inline elements (links, inline embedded-entry) cannot be dragged
  // List items and nested list blocks (indent level > 0) are skipped from drag
  const isInlineElement = editor.isInline(element);

  if (
    isInlineElement ||
    (isListNode(element) && element.indentLevel && element.indentLevel > 0) ||
    element.type === 'list-item'
  ) {
    // Render inline/list elements directly without drag wrapper
    return block.renderElement(props);
  }

  // Wrap block elements with drag and drop
  return jsx(DragAndDropElement, {
    index: nodePath,
    setDragDirection: setDragDirection,
    dragDirection: dragDirection,
    dragHandleTopMargin: block.dragHandleTopMargin,
    children: block.renderElement(props)
  });
};

const dragNoop = () => true;

export const EnhancedBlocksContent = ({ placeholder, ariaLabelId }: EnhancedBlocksContentProps) => {
  const {
    editor,
    disabled,
    blocks,
    modifiers,
    setLiveText,
    isExpandedMode,
    name,
    flushPendingFormSync,
  } = useStrapiBlocksEditorContext('EnhancedBlocksContent');
  const blocksRef = React.useRef<HTMLDivElement>(null);
  const { formatMessage } = useIntl();
  const [dragDirection, setDragDirection] = React.useState<string | null>(null);

  // Create renderLeaf function based on the modifiers store
  const renderLeaf = React.useCallback(
    (props: any) => baseRenderLeaf(props, modifiers as Record<string, Modifier>),
    [modifiers]
  );

  // Create renderElement function based on the blocks store
  const renderElement = React.useCallback(
    (props: any) => baseRenderElement({
      props,
      blocks: blocks as Record<string, Block>,
      editor,
      dragDirection,
      setDragDirection
    }),
    [blocks, editor, dragDirection, setDragDirection]
  );

  const handleMoveBlocks = (editorInstance: any, event: React.KeyboardEvent) => {
    if (!editorInstance.selection) return;
    const start = Range.start(editorInstance.selection);
    const currentIndex: [number] = [start.path[0]];
    let newIndexPosition = 0;
    if (event.key === 'ArrowUp') {
      newIndexPosition = currentIndex[0] > 0 ? currentIndex[0] - 1 : currentIndex[0];
    } else {
      newIndexPosition = currentIndex[0] < editorInstance.children.length - 1 ? currentIndex[0] + 1 : currentIndex[0];
    }
    const newIndex: [number] = [newIndexPosition];
    if (newIndexPosition !== currentIndex[0]) {
      Transforms.moveNodes(editorInstance, {
        at: currentIndex,
        to: newIndex
      });
      setLiveText(formatMessage({
        id: getTranslation('components.Blocks.dnd.reorder'),
        defaultMessage: '{item}, moved. New position in the editor: {position}.'
      }, {
        item: `${name}.${currentIndex[0] + 1}`,
        position: `${newIndex[0] + 1} of ${editorInstance.children.length}`
      }));
      event.preventDefault();
    }
  };

  const handleEnter = (event: React.KeyboardEvent) => {
    if (!editor.selection) return;
    const selectedNode = editor.children[editor.selection.anchor.path[0]] as any;
    const selectedBlock = Object.values(blocks as Record<string, Block>).find((block) => block.matchNode(selectedNode));
    if (!selectedBlock) return;

    // Allow forced line breaks when shift is pressed
    if (event.shiftKey && selectedNode.type !== 'image') {
      Transforms.insertText(editor, '\n');
      return;
    }

    if (selectedBlock.handleEnterKey) {
      selectedBlock.handleEnterKey(editor);
    } else {
      (blocks as Record<string, Block>).paragraph.handleEnterKey?.(editor);
    }
  };

  const handleBackspaceEvent = (event: React.KeyboardEvent) => {
    if (!editor.selection) return;
    const selectedNode = editor.children[editor.selection.anchor.path[0]] as any;
    const selectedBlock = Object.values(blocks as Record<string, Block>).find((block) => block.matchNode(selectedNode));
    if (selectedBlock?.handleBackspaceKey) {
      selectedBlock.handleBackspaceKey(editor, event);
    }
  };

  const handleTab = (event: React.KeyboardEvent) => {
    if (!editor.selection) return;
    const selectedNode = editor.children[editor.selection.anchor.path[0]] as any;
    const selectedBlock = Object.values(blocks as Record<string, Block>).find((block) => block.matchNode(selectedNode));
    if (selectedBlock?.handleTab) {
      event.preventDefault();
      selectedBlock.handleTab(editor);
    }
  };

  const handleKeyboardShortcuts = (event: React.KeyboardEvent) => {
    const isCtrlOrCmd = event.metaKey || event.ctrlKey;
    if (isCtrlOrCmd) {
      Object.values(modifiers as Record<string, Modifier>).forEach((modifier) => {
        if (modifier.isValidEventKey(event)) {
          modifier.handleToggle(editor);
        }
      });
      if (event.shiftKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
        handleMoveBlocks(editor, event);
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        return handleEnter(event);
      case 'Backspace':
        return handleBackspaceEvent(event);
      case 'Tab':
        return handleTab(event);
      case 'Escape':
        return (ReactEditor as any).blur(editor);
    }
    handleKeyboardShortcuts(event);
  };

  const handleScrollSelectionIntoView = React.useCallback(() => {
    if (!editor.selection || !blocksRef.current) return;
    const domRange = (ReactEditor as any).toDOMRange(editor, editor.selection);
    const domRect = domRange.getBoundingClientRect();
    const editorRect = blocksRef.current.getBoundingClientRect();
    if (domRect.top < editorRect.top || domRect.bottom > editorRect.bottom) {
      blocksRef.current.scrollBy({
        top: 28,
        behavior: 'smooth'
      });
    }
  }, [editor]);

  return jsx(Box, {
    ref: blocksRef,
    grow: 1,
    width: '100%',
    overflow: 'auto',
    fontSize: 2,
    background: 'neutral0',
    color: 'neutral800',
    lineHeight: 6,
    paddingRight: 7,
    paddingTop: 6,
    paddingBottom: 3,
    children: jsx(StyledEditable, {
      'aria-labelledby': ariaLabelId,
      readOnly: disabled,
      placeholder: placeholder,
      isExpandedMode: isExpandedMode,
      renderElement: renderElement,
      renderLeaf: renderLeaf,
      onKeyDown: handleKeyDown,
      onBlur: flushPendingFormSync,
      scrollSelectionIntoView: handleScrollSelectionIntoView,
      onDrop: dragNoop,
      onDragStart: dragNoop
    })
  });
};
