import { jsxs, jsx } from 'react/jsx-runtime';
import * as React from 'react';
import { createContext, useIsMobile } from '@strapi/admin/strapi-admin';
import { useFetchClient } from '@strapi/strapi/admin';
import { Divider, VisuallyHidden, IconButton } from '@strapi/design-system';
import { Expand, PuzzlePiece } from '@strapi/icons';
import { flushSync } from 'react-dom';
import { useIntl } from 'react-intl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createEditor, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import { ReactEditor, Slate, useSlate, withReact } from 'slate-react';
import { styled } from 'styled-components';
import {
  BlocksEditorProvider as StrapiBlocksEditorProvider,
  useBlocksEditorContext as useStrapiBlocksEditorContext,
  paragraphBlocks,
  headingBlocks,
  listBlocks,
  linkBlocks,
  imageBlocks,
  quoteBlocks,
  codeBlocks,
  EditorLayout,
  modifiers,
  normalizeBlocksState,
} from '../utils/strapi-internals';
import {
  getShortNameFromUid,
  parseEmbeddedEntryBlockTypes,
  resolveContentTypeUids,
  type StrapiContentTypeInfo,
} from '../utils/contentTypes';

import { EnhancedBlocksContent } from './EnhancedBlocksContent';

// Re-export Strapi's context hook for use in our components
// This allows Strapi's BlocksToolbar to work correctly
export { useStrapiBlocksEditorContext as useStrapiBlocksEditorContext };
import { withEmbeddedEntries } from './plugins/withEmbeddedEntries';
import { withStrapiSchema } from './plugins/withStrapiSchema';
import { EmbeddedEntry } from './EmbeddedEntry';
import { EnhancedBlocksToolbar } from './EnhancedBlocksToolbar';
import { getTranslation } from '../utils/getTranslation';

// Create our own context that extends Strapi's with allowedContentTypes
const [EnhancedBlocksEditorProvider, usePartialEnhancedBlocksEditorContext] = createContext<any>('EnhancedBlocksEditor');

// Our enhanced context hook that includes allowedContentTypes
export function useBlocksEditorContext(consumerName: any) {
  const context = usePartialEnhancedBlocksEditorContext(consumerName, (state: any) => state);
  const editor = useSlate();
  if (!context) {
    throw new Error(`useBlocksEditorContext must be used within EnhancedBlocksEditorProvider`);
  }
  return {
    ...context,
    editor
  };
}

const EditorDivider = styled(Divider)`
  background: ${({ theme }: { theme: any }) => theme.colors.neutral200};
`;

/**
 * Forces an update of the Slate editor when the value prop changes from outside of Slate.
 */
function useResetKey(value: any) {
  const slateUpdatesCount = React.useRef(0);
  const valueUpdatesCount = React.useRef(0);
  const [key, setKey] = React.useState(0);

  React.useEffect(() => {
    valueUpdatesCount.current += 1;
    if (valueUpdatesCount.current !== slateUpdatesCount.current) {
      setKey((previousKey) => previousKey + 1);
      slateUpdatesCount.current = valueUpdatesCount.current;
    }
  }, [value]);

  const incrementSlateUpdatesCount = React.useCallback(() => {
    slateUpdatesCount.current += 1;
  }, []);

  return {
    key,
    incrementSlateUpdatesCount
  };
}

const pipe = (...fns: any[]) => (value: any) => fns.reduce((prev, fn) => fn(prev), value);

// Embedded entry block definition (supports both inline and block displayMode)
const embeddedEntryBlocks = {
  'embedded-entry': {
    renderElement: (props: any) => jsx(EmbeddedEntry, { ...props }),
    matchNode: (node: any) => node.type === 'embedded-entry',
    isInBlocksSelector: false, // Embedded entries are inserted via toolbar, not blocks selector
    label: {
      id: 'enhanced-blocks-editor.blocks.embeddedEntry',
      defaultMessage: 'Embedded Entry'
    },
    icon: PuzzlePiece,
    handleConvert: () => { } // No-op since embedded entries are not convertible from other blocks
  }
};

const buildBlocks = () => ({
  ...paragraphBlocks,
  ...headingBlocks,
  ...listBlocks,
  ...linkBlocks,
  ...imageBlocks,
  ...quoteBlocks,
  ...codeBlocks,
  ...embeddedEntryBlocks,
});

const getBlockPlugins = (blocks: Record<string, any>) =>
  Object.values(blocks)
    .map((block: any) => block.plugin)
    .filter(Boolean);

interface EnhancedBlocksEditorProps {
  disabled?: any;
  name: any;
  onChange: any;
  value: any;
  error: any;
  attribute?: any;
  [key: string]: any;
}

export const EnhancedBlocksEditor = React.forwardRef<unknown, EnhancedBlocksEditorProps>(({
  disabled = false,
  name,
  onChange,
  value,
  error,
  attribute,
  ...contentProps
}, forwardedRef) => {
  const { formatMessage } = useIntl();
  const isMobile = useIsMobile();

  // Parse allowed content types from field options (UID array or legacy comma-separated string)
  const allowedContentTypeIdentifiers = React.useMemo(
    () => parseEmbeddedEntryBlockTypes(attribute?.options?.['embedded-entry-block-types']),
    [attribute?.options],
  );

  const { get } = useFetchClient();
  const [titleFieldMap, setTitleFieldMap] = React.useState<Record<string, string>>({});
  const [contentTypeUidMap, setContentTypeUidMap] = React.useState<Record<string, string>>({});
  const [allowedContentTypeUids, setAllowedContentTypeUids] = React.useState<string[]>([]);
  
  // Get allowEmbeddedEntries from attribute options (default to true)
  const allowEmbeddedEntries = attribute?.options?.allow_embedded_entries ?? true;

  // Get enableEmbeddedEntryDataInResponse from attribute options (default to true)
  const enableEmbeddedEntryDataInResponse = attribute?.options?.['enable_embedded_entry_data_in_response'] ?? true;
  
  // Resolve configured short names to full UIDs and fetch title fields
  React.useEffect(() => {
    let cancelled = false;

    async function fetchContentTypeMetadata() {
      try {
        const response = await get('/enhanced-blocks-editor/content-types');
        const apiContentTypes = ((response?.data || []) as StrapiContentTypeInfo[]).filter(
          (ct) => ct.uid.startsWith('api::'),
        );

        const resolvedUids = allowedContentTypeIdentifiers.length > 0
          ? allowedContentTypeIdentifiers.every((id) => id.startsWith('api::'))
            ? allowedContentTypeIdentifiers
            : resolveContentTypeUids(allowedContentTypeIdentifiers, apiContentTypes)
          : apiContentTypes.map((ct) => ct.uid);

        const uidMap: Record<string, string> = {};
        const titleMap: Record<string, string> = {};

        for (const uid of resolvedUids) {
          const shortName = getShortNameFromUid(uid);
          uidMap[shortName] = uid;

          const contentType = apiContentTypes.find((ct) => ct.uid === uid);
          const mainField = contentType?.info?.mainField;
          if (typeof mainField === 'string' && mainField) {
            titleMap[shortName] = mainField;
            titleMap[uid] = mainField;
          }
        }

        if (!cancelled) {
          setContentTypeUidMap(uidMap);
          setTitleFieldMap(titleMap);
          setAllowedContentTypeUids(resolvedUids);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching content type metadata', err);
          setContentTypeUidMap({});
          setTitleFieldMap({});
          setAllowedContentTypeUids([]);
        }
      }
    }

    fetchContentTypeMetadata();
    return () => { cancelled = true; };
  }, [get, allowedContentTypeIdentifiers]);

  // Create editor with all plugins
  // We use our own withEmbeddedEntries which handles schema validation,
  // allowing both inline and block embedded entries (unlike Strapi's withStrapiSchema
  // which only allows Text and Link as inline nodes)
  const [editor] = React.useState(() => {
    const allBlocks = buildBlocks();
    const blockPlugins = getBlockPlugins(allBlocks);

    return pipe(
      withHistory,
      withStrapiSchema,
      withEmbeddedEntries,
      withReact,
      ...blockPlugins,
    )(createEditor() as any);
  });

  const [liveText, setLiveText] = React.useState('');
  const ariaDescriptionId = React.useId();
  const [isExpandedMode, handleToggleExpand] = React.useReducer((prev) => !prev, false);

  React.useImperativeHandle(forwardedRef, () => ({
    focus() {
      ReactEditor.focus(editor);
    }
  }), [editor]);

  const { key, incrementSlateUpdatesCount } = useResetKey(value);
  const debounceTimeout = React.useRef<any>(null);

  const flushPendingFormSync = React.useCallback(() => {
    if (!debounceTimeout.current) {
      return;
    }
    clearTimeout(debounceTimeout.current);
    debounceTimeout.current = null;
    incrementSlateUpdatesCount();
    flushSync(() => {
      onChange(name, normalizeBlocksState(editor, editor.children));
    });
  }, [editor, incrementSlateUpdatesCount, name, onChange]);

  const handleSlateChange = React.useCallback((state: any) => {
    const isAstChange = editor.operations.some((op: any) => op.type !== 'set_selection');
    if (isAstChange) {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        incrementSlateUpdatesCount();
        onChange(name, normalizeBlocksState(editor, state));
        debounceTimeout.current = null;
      }, 300);
    }
  }, [editor, incrementSlateUpdatesCount, name, onChange]);

  React.useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (ReactEditor.isFocused(editor)) {
      return;
    }
    const normalizedValue = value?.length ? value : null;
    const normalizedEditorState = normalizeBlocksState(editor, editor.children);
    if (
      normalizedValue &&
      normalizedEditorState &&
      JSON.stringify(normalizedEditorState) !== JSON.stringify(normalizedValue)
    ) {
      Transforms.deselect(editor);
    }
  }, [editor, value]);

  // Combine all blocks including embedded entries
  const blocks = React.useMemo(buildBlocks, []);

  return (
    <DndProvider backend={HTML5Backend}>
      <VisuallyHidden
        id={ariaDescriptionId}
      >
        {formatMessage({
          id: getTranslation('components.Blocks.dnd.instruction'),
          defaultMessage: `To reorder blocks, press Command or Control along with Shift and the Up or Down arrow keys`
        })}
      </VisuallyHidden>
      <VisuallyHidden aria-live="assertive">
        {liveText}
      </VisuallyHidden>
      <Slate
        editor={editor}
        initialValue={value?.length ? value : [{
          type: 'paragraph',
          children: [{ type: 'text', text: '' }]
        }]}
        onChange={handleSlateChange}
        key={key}
      >
        <StrapiBlocksEditorProvider
          blocks={blocks}
          modifiers={modifiers}
          disabled={disabled}
          name={name}
          setLiveText={setLiveText}
          isExpandedMode={isExpandedMode}
          flushPendingFormSync={flushPendingFormSync}
        >
          <EnhancedBlocksEditorProvider
            allowedContentTypes={allowedContentTypeIdentifiers}
            allowedContentTypeUids={allowedContentTypeUids}
            contentTypeUidMap={contentTypeUidMap}
            titleFieldMap={titleFieldMap}
            allowEmbeddedEntries={allowEmbeddedEntries}
            enableEmbeddedEntryDataInResponse={enableEmbeddedEntryDataInResponse}
            disabled={disabled}
          >
            <EditorLayout
              error={error}
              disabled={disabled}
              onToggleExpand={handleToggleExpand}
              ariaDescriptionId={ariaDescriptionId}
            >
              {/* vvv  Couldn't import directly from @strapi/admin because we need to update toolbar */}
              <EnhancedBlocksToolbar />
              <EditorDivider width="100%" />
              {/* vvv  Couldn't import directly from @strapi/admin because it doesn't handle inline level embedded entries */}
              <EnhancedBlocksContent {...contentProps} />
              {!isExpandedMode && !isMobile && (
                <IconButton
                  position="absolute"
                  bottom="1.2rem"
                  right="1.2rem"
                  shadow="filterShadow"
                  label={formatMessage({
                    id: getTranslation('components.Blocks.expand'),
                    defaultMessage: 'Expand'
                  })}
                  onClick={handleToggleExpand}
                >
                  <Expand />
                </IconButton>
              )}
            </EditorLayout>
          </EnhancedBlocksEditorProvider>
        </StrapiBlocksEditorProvider>
      </Slate>
    </DndProvider>
  );
});

EnhancedBlocksEditor.displayName = 'EnhancedBlocksEditor';
      