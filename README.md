# Enhanced Blocks Editor

A Strapi plugin that extends the native Blocks editor with embedded entry support. Authors can reference other collection entries directly inside rich text content, either inline or as standalone blocks.

## Features

- Drop-in replacement for Strapi's Blocks field, with the same familiar editing experience
- Embed entries from your collection types inline or as block-level cards
- Configure which content types can be embedded per field, or disable embedding entirely
- Optionally include full embedded entry data in the API response

## Requirements

- Strapi **5.x**
- Node.js **>= 20**

## Installation

Install the plugin in your Strapi project:

```bash
# Using npm
npm install @thrillworksinc/strapi-enhanced-blocks-editor

# Using yarn
yarn add @thrillworksinc/strapi-enhanced-blocks-editor
```

Enable the plugin in `config/plugins.ts`. If the file already exists, add this entry alongside your other plugins:

```ts
export default {
  'enhanced-blocks-editor': {
    enabled: true,
  },
};
```

Rebuild the admin panel so the plugin is registered:

```bash
npm run build
# or
yarn build
```

Then start your application:

```bash
npm run develop
# or
yarn develop
```

## Configuration

### Add the custom field to a content type

1. Open **Content-Type Builder** in the Strapi admin panel.
2. Select or create a collection type.
3. Add a new field and choose **Enhanced Blocks Editor** under the **Custom** tab.
4. Open the field's **Advanced settings** and configure the options below.

| Option | Description |
| --- | --- |
| **Allow embedded entries** | Enabled by default. When off, the embed button is hidden in the editor and the allowed-types multi-select is disabled. |
| **Allowed types for embedded entry blocks** | Multi-select of collection types authors can embed. All types are selected by default. The embed dialog is limited to the selected types. |
| **Embedded entry data in response** | When enabled (default), the stored JSON includes the full entry data alongside the reference. Disable to store only the entry reference. Applies to **newly created** embeds only. |

## Usage

1. Open an entry in the Content Manager that uses an Enhanced Blocks Editor field.
2. Use the standard Blocks toolbar for headings, lists, links, images, and other block types.
3. Click the **Embed entry** button in the toolbar to insert a reference to another entry.
4. Choose **Inline** to embed the entry within a paragraph, or **Block** to insert it as a standalone card.
5. Select the content type and entry from the dialog, then confirm.

Embedded entries are stored as JSON in the same format as Strapi Blocks content, with an additional `embedded-entry` block type.

## Frontend rendering

Embedded entries use the same JSON format as Strapi Blocks content. On your frontend, render them with [@strapi/blocks-react-renderer](https://github.com/strapi/blocks-react-renderer) by providing a custom component for the `embedded-entry` block type. You do not need to modify the renderer package itself.

Install the renderer in your frontend project:

```bash
yarn add @strapi/blocks-react-renderer
# or
npm install @strapi/blocks-react-renderer
```

### Block shape

Each embedded entry is stored as a node with `type: 'embedded-entry'`:

```json
{
  "type": "embedded-entry",
  "displayMode": "inline",
  "entry": {
    "documentId": "abc123",
    "contentType": "article",
    "contentTypeUid": "api::article.article",
    "titleField": "My Article Title",
    "data": { }
  },
  "children": [{ "type": "text", "text": "" }]
}
```

- **`displayMode`** — `"inline"` when embedded inside a paragraph, `"block"` when inserted as a standalone card.
- **`entry.documentId`** and **`entry.contentType`** — always present; use these to link to or fetch the entry.
- **`entry.contentTypeUid`** — full Strapi content-type UID; present on newly created embeds. Older embeds may omit this field.
- **`entry.titleField`** — display title captured at embed time.
- **`entry.data`** — full entry payload, present only when **Embedded entry data in response** was enabled when the embed was created.

### Basic usage

Pass a custom `embedded-entry` block to `BlocksRenderer`. The same component handles both inline and block display modes:

```tsx
import { BlocksRenderer } from '@strapi/blocks-react-renderer';

function EmbeddedEntry({ displayMode, entry }) {
  if (displayMode === 'inline') {
    return <span className="embedded-entry-inline">{entry.titleField}</span>;
  }

  return (
    <article className="embedded-entry-card">
      <p>{entry.contentType}</p>
      <h3>{entry.titleField}</h3>
      {/* Use entry.data when present, or fetch by entry.documentId */}
    </article>
  );
}

export function RichText({ content }) {
  return (
    <BlocksRenderer
      content={content}
      blocks={{
        'embedded-entry': EmbeddedEntry,
      }}
    />
  );
}
```

Without a custom `embedded-entry` block, `@strapi/blocks-react-renderer` logs a warning and skips those nodes.

### Notes

- **Void element** — Like `image` blocks, embedded entries have a placeholder `children` array. Your component should not render `children`.
- **Reference-only embeds** — If `entry.data` is missing, fetch the entry from your Strapi API using `entry.documentId` and `entry.contentType`.
- **TypeScript** — `embedded-entry` is not part of the renderer's built-in types. Define props locally in your frontend, or extend the renderer's types as needed.

### Future Enhancements
- **Configure blocks visibility** - Add configuration option that will allow hiding of block level elements like bold, italic, Heading 1 etc.

## Reporting issues

If you find a bug or have a feature request, open an issue on [GitHub](https://github.com/Thrillworks/strapi-enhanced-blocks-editor/issues). Include steps to reproduce, expected vs. actual behavior, and your Strapi and plugin versions when reporting a bug.

## License

MIT
