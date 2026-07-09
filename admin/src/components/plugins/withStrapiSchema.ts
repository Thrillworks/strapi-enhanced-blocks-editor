'use strict';

var slate = require('slate');

const isText = (node: any)=>{
    return slate.Node.isNode(node) && !slate.Editor.isEditor(node) && node.type === 'text';
};
/**
 * This plugin is used to normalize the Slate document to match the Strapi schema.
 */ const withStrapiSchema = (editor: any)=>{
    const { normalizeNode } = editor;
    /**
   * On the strapi schema, we want text nodes to have type: text
   * By default, Slate add text nodes without type: text
   * So we add this normalization for the cases when Slate add text nodes automatically
   */ editor.normalizeNode = (entry: any)=>{
        const [node, path] = entry;
        if (!slate.Element.isElement(node) && !isText(node)) {
            slate.Transforms.setNodes(editor, {
                type: 'text'
            }, {
                at: path
            });
            return;
        }
        normalizeNode(entry);
    };
    return editor;
};

export { withStrapiSchema };
//# sourceMappingURL=withStrapiSchema.js.map
