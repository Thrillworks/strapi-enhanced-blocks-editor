import { Element, Node, Text, Transforms, Editor } from 'slate';

/**
 * Custom schema plugin for the enhanced blocks editor.
 * 
 * This plugin replaces Strapi's withStrapiSchema to allow:
 * - Embedded entries as both inline (displayMode: 'inline') and block elements
 * - Links as inline elements
 * - Images as void block elements
 * - All standard text formatting
 */
export const withEmbeddedEntries = (editor: any) => {
  const { isInline, isVoid, normalizeNode } = editor;

  // Define which elements are inline
  editor.isInline = (element: any) => {
    // Embedded entries are inline when displayMode is 'inline'
    if (element.type === 'embedded-entry') {
      return element.displayMode === 'inline';
    }
    // Links are always inline
    if (element.type === 'link') {
      return true;
    }
    return isInline(element);
  };

  // Define which elements are void (non-editable)
  editor.isVoid = (element: any) => {
    // Embedded entries are always void
    if (element.type === 'embedded-entry') {
      return true;
    }
    // Images are void
    if (element.type === 'image') {
      return true;
    }
    return isVoid(element);
  };

  // Custom normalizeNode for our schema
  editor.normalizeNode = (entry: [Node, number[]]) => {
    const [node, path] = entry;

    // For Element nodes, ensure they have valid children
    if (Element.isElement(node)) {
      const element = node as any;

      // Void elements must have exactly one empty text child
      if (Editor.isVoid(editor, element)) {
        // Ensure void elements have the required empty text child
        if (element.children.length === 0) {
          Transforms.insertNodes(
            editor,
            { type: 'text', text: '' } as any,
            { at: [...path, 0] }
          );
          return;
        }
      }

      // Block elements should not be empty - add empty paragraph if needed
      if (element.type === 'paragraph' && element.children.length === 0) {
        Transforms.insertNodes(
          editor,
          { type: 'text', text: '' } as any,
          { at: [...path, 0] }
        );
        return;
      }
    }

    // Fall back to default normalization for other cases
    normalizeNode(entry);
  };

  return editor;
};
