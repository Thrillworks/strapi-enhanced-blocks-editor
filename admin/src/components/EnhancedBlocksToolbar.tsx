import { jsx, Fragment } from 'react/jsx-runtime';
import * as React from 'react';
import { Box, Flex, Menu } from '@strapi/design-system';
import { Plus, PuzzlePiece, Expand } from '@strapi/icons';
import { Editor, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';
import { styled } from 'styled-components';
import { useBlocksEditorContext } from './EnhancedBlocksEditor';
import { useStrapiBlocksEditorContext } from './EnhancedBlocksEditor';
import { SelectEntryDialog } from './SelectEntryDialog';
import { BlocksToolbar as StrapiBlocksToolbar } from '../utils/strapi-internals';

type EmbedDisplayMode = 'inline' | 'block';

const StyledMenuTrigger = styled(Menu.Trigger)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 4px;
  font-size: 1.4rem;
  font-weight: 500;
  cursor: pointer;
  color: ${({ theme }: { theme: any }) => theme.colors.neutral600};
  background: transparent;
  border: 1px solid ${({ theme }: { theme: any }) => theme.colors.neutral400};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${({ theme }: { theme: any }) => theme.colors.neutral100};
    border-color: ${({ theme }: { theme: any }) => theme.colors.neutral600};
  }
  
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const StyledMenuItem = styled(Menu.Item)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px;
  cursor: pointer;
  
  &:hover {
    background: ${({ theme }: { theme: any }) => theme.colors.neutral100};
  }

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }: { theme: any }) => theme.colors.neutral600};
  }
`;

const EmbeddedEntryButton = ({
  disabled,
  allowedContentTypes,
  allowedContentTypeUids,
  enableEmbeddedEntryDataInResponse,
}: {
  disabled: boolean;
  allowedContentTypes: string[];
  allowedContentTypeUids: string[];
  enableEmbeddedEntryDataInResponse: boolean;
}) => {
  const { editor } = useBlocksEditorContext('EmbeddedEntryButton');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [displayMode, setDisplayMode] = React.useState<EmbedDisplayMode>('inline');
  const savedSelectionRef = React.useRef<any>(null);

  const openDialog = (mode: EmbedDisplayMode) => {
    savedSelectionRef.current = editor.selection;
    setDisplayMode(mode);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    ReactEditor.focus(editor);
  };

  const handleDialogSubmit = (values: {
    documentId: string;
    contentType: string;
    contentTypeUid: string;
    mainField: string | null;
    title: string;
    data: Record<string, any>;
  }) => {
    const embeddedEntryNode = {
      type: 'embedded-entry',
      displayMode,
      entry: {
        documentId: values.documentId,
        contentType: values.contentType,
        contentTypeUid: values.contentTypeUid,
        titleField: values.title,
        ...(enableEmbeddedEntryDataInResponse && { data: values.data })
      },
      children: [{ type: 'text', text: '' }]
    };

    const insertAt = savedSelectionRef.current ?? Editor.end(editor, []);
    Transforms.insertNodes(editor, embeddedEntryNode as any, { at: insertAt });

    setIsDialogOpen(false);
    ReactEditor.focus(editor);
  };

  return (
    <>
      <Menu.Root>
        <StyledMenuTrigger disabled={disabled}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus />
            Embed
          </div>
        </StyledMenuTrigger>
        <Menu.Content>
          <StyledMenuItem key="inline" onSelect={() => openDialog('inline')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PuzzlePiece />
              Inline
            </div>
          </StyledMenuItem>
          <StyledMenuItem key="block" onSelect={() => openDialog('block')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Expand />
              Block
            </div>
          </StyledMenuItem>
        </Menu.Content>
      </Menu.Root>
      {isDialogOpen && (
        <SelectEntryDialog
          contentTypes={allowedContentTypes || []}
          allowedContentTypeUids={allowedContentTypeUids}
          handleClose={handleDialogClose}
          handleSubmit={handleDialogSubmit}
        />
      )}
    </>
  );
};

export const EnhancedBlocksToolbar = () => {
  const { disabled } = useStrapiBlocksEditorContext('EnhancedBlocksToolbar');
  const {
    allowEmbeddedEntries,
    allowedContentTypes,
    allowedContentTypeUids,
    enableEmbeddedEntryDataInResponse,
  } = useBlocksEditorContext('EnhancedBlocksToolbar');
  return (
    <Flex direction="row" alignItems="center" gap={2} width="100%">
      <Box style={{ flex: 1 }}>
        <StrapiBlocksToolbar />
      </Box>
      {allowEmbeddedEntries !== false && (
        <Box marginLeft="auto" marginRight="1rem">
          <EmbeddedEntryButton
            disabled={disabled}
            allowedContentTypes={allowedContentTypes || []}
            allowedContentTypeUids={allowedContentTypeUids || []}
            enableEmbeddedEntryDataInResponse={enableEmbeddedEntryDataInResponse}
          />
        </Box>
      )}
    </Flex>
  );
};
