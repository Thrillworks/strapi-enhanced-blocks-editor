/**
 * Re-exports from a vendored snapshot of Strapi's content-manager blocks editor.
 *
 * The `.mjs` files under `admin/src/components/` are copied from
 * `@strapi/content-manager` and kept in-repo so the plugin can extend block
 * behavior (embedded entries) without relying on private package exports.
 *
 * Tested against Strapi 5.48.x. Internal Slate/block APIs may change in
 * future Strapi releases — verify drag-and-drop, toolbar, and save behavior
 * after upgrading Strapi.
 */

// @ts-nocheck - Suppress TypeScript errors for internal Strapi imports without type declarations

// BlocksEditor context and utilities (export)
export {
  BlocksEditorProvider,
  useBlocksEditorContext,
  normalizeBlocksState,
} from '../components/BlocksEditor.mjs';

// Block definitions
export { paragraphBlocks } from '../components/blocks/Paragraph.mjs';
export { headingBlocks } from '../components/blocks/Heading.mjs';
export { listBlocks } from '../components/blocks/List.mjs';
export { linkBlocks } from '../components/blocks/Link.mjs';
export { imageBlocks } from '../components/blocks/Image.mjs';
export { quoteBlocks } from '../components/blocks/Quote.mjs';
export { codeBlocks } from '../components/blocks/Code.mjs';

// Note: We don't use Strapi's withStrapiSchema plugin because it only allows
// Text and Link as inline nodes. Our withEmbeddedEntries plugin provides
// custom schema validation that supports inline embedded entries.

// Modifiers
export { modifiers } from '../components/Modifiers.mjs';

// UI Components
// Note: We use our own EnhancedBlocksContent instead of Strapi's BlocksContent
// to properly handle inline vs block embedded entries
export { EditorLayout } from '../components/blocks/EditorLayout.mjs';

// Toolbar
export { BlocksToolbar } from '../components/BlocksToolbar.mjs';
