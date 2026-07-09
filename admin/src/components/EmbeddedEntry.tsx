import * as React from 'react';
import { Menu } from '@strapi/design-system';
import { PuzzlePiece, Pencil, Trash } from '@strapi/icons';
import { Transforms } from 'slate';
import { useFocused, useSelected, ReactEditor } from 'slate-react';
import { styled, css } from 'styled-components';
import { useBlocksEditorContext } from './EnhancedBlocksEditor';
import { buildContentManagerEntryUrl, getShortNameFromUid } from '../utils/contentTypes';

// Inline badge for embedded entries (displayMode: 'inline')
const InlineEntryBadge = styled.span<{ $isFocused: boolean; $readOnly?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${({ theme }: { theme: any }) => theme.colors.primary100};
  color: ${({ theme }: { theme: any }) => theme.colors.primary700};
  font-size: 1.4rem;
  font-weight: 500;
  cursor: ${({ $readOnly }: { $readOnly?: boolean }) => ($readOnly ? 'default' : 'pointer')};
  user-select: none;
  vertical-align: baseline;
  pointer-events: ${({ $readOnly }: { $readOnly?: boolean }) => ($readOnly ? 'none' : 'auto')};
  
  ${(props: { $isFocused: boolean; $readOnly?: boolean; theme: any }) => props.$isFocused && !props.$readOnly && css`
    outline: 2px solid ${props.theme.colors.primary600};
    outline-offset: 2px;
  `}
  
  &:hover {
    background: ${({ theme, $readOnly }: { theme: any; $readOnly?: boolean }) =>
      $readOnly ? theme.colors.primary100 : theme.colors.primary200};
  }
`;

// Block card for embedded entries (displayMode: 'block')
const BlockEntryCard = styled.div<{ $isFocused: boolean; $readOnly?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin: 8px 0;
  border-radius: 8px;
  background: ${({ theme }: { theme: any }) => theme.colors.neutral100};
  border: 1px solid ${({ theme }: { theme: any }) => theme.colors.neutral200};
  cursor: ${({ $readOnly }: { $readOnly?: boolean }) => ($readOnly ? 'default' : 'pointer')};
  user-select: none;
  pointer-events: ${({ $readOnly }: { $readOnly?: boolean }) => ($readOnly ? 'none' : 'auto')};
  
  ${(props: { $isFocused: boolean; $readOnly?: boolean; theme: any }) => props.$isFocused && !props.$readOnly && css`
    outline: 2px solid ${props.theme.colors.primary600};
    outline-offset: 2px;
    border-color: ${props.theme.colors.primary300};
  `}
  
  &:hover {
    background: ${({ theme, $readOnly }: { theme: any; $readOnly?: boolean }) =>
      $readOnly ? theme.colors.neutral100 : theme.colors.neutral150};
    border-color: ${({ theme, $readOnly }: { theme: any; $readOnly?: boolean }) =>
      $readOnly ? theme.colors.neutral200 : theme.colors.neutral300};
  }
`;

const BlockEntryIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: ${({ theme }: { theme: any }) => theme.colors.primary100};
  flex-shrink: 0;
`;

const BlockEntryContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`;

const BlockEntryTitle = styled.span`
  font-size: 1.4rem;
  font-weight: 600;
  color: ${({ theme }: { theme: any }) => theme.colors.neutral800};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BlockEntryType = styled.span`
  font-size: 1.2rem;
  color: ${({ theme }: { theme: any }) => theme.colors.neutral500};
`;

const EntryIcon = styled(PuzzlePiece)`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
`;

const BlockEntryIcon = styled(PuzzlePiece)`
  width: 16px;
  height: 16px;
  color: ${({ theme }: { theme: any }) => theme.colors.primary600};
`;

const KebabTrigger = styled(Menu.Trigger)`
  display: flow;
  align-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }: { theme: any }) => theme.colors.neutral500};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const KebabMenuItem = styled(Menu.Item)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;

  &:hover {
    background: ${({ theme }: { theme: any }) => theme.colors.neutral100};
  }

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`;

const KebabMenuLabel = styled.span`
  font-size: 1.4rem;
  font-weight: 500;
`;

const isEmbeddedEntry = (element: any): boolean => {
  return element.type === 'embedded-entry';
};

const EntryKebabMenu = ({
  onOpen,
  onRemove
}: {
  onOpen: () => void;
  onRemove: () => void;
}) => {
  return (
    <Menu.Root>
      <KebabTrigger
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
      </KebabTrigger>
      <Menu.Content>
        <KebabMenuItem onSelect={onOpen}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Pencil />
            <KebabMenuLabel>Open</KebabMenuLabel>
          </div>
        </KebabMenuItem>
        <KebabMenuItem onSelect={onRemove}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash />
            <KebabMenuLabel>Remove</KebabMenuLabel>
          </div>
        </KebabMenuItem>
      </Menu.Content>
    </Menu.Root>
  );
};

export const EmbeddedEntry = ({ attributes, children, element }: { attributes: any; children: any; element: any }) => {
  const editorIsFocused = useFocused();
  const entryIsSelected = useSelected();
  const { editor, contentTypeUidMap = {}, disabled = false } = useBlocksEditorContext('EmbeddedEntry');

  const getContentTypeUid = () => {
    if (element.entry?.contentTypeUid) {
      return element.entry.contentTypeUid;
    }
    const shortName = element.entry?.contentType;
    if (shortName && contentTypeUidMap[shortName]) {
      return contentTypeUidMap[shortName];
    }
    if (shortName) {
      return `api::${shortName}.${shortName}`;
    }
    return null;
  };

  const openEntry = () => {
    const contentTypeUid = getContentTypeUid();
    const documentId = element.entry?.documentId;
    if (!contentTypeUid || !documentId) {
      return;
    }
    window.open(buildContentManagerEntryUrl(contentTypeUid, documentId), '_blank');
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openEntry();
  };

  const handleRemove = (e?: React.MouseEvent | Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const path = ReactEditor.findPath(editor, element);
    Transforms.removeNodes(editor, { at: path });
  };

  if (!isEmbeddedEntry(element)) {
    return null;
  }
  
  const title = element.entry?.titleField || 'Unknown';
  const contentType = element.entry?.contentType || getShortNameFromUid(getContentTypeUid() || '') || 'Entry';
  const isBlock = element.displayMode === 'block';
  const isFocused = !disabled && editorIsFocused && entryIsSelected;

  if (isBlock) {
    return (
      <div {...attributes}>
        <BlockEntryCard
          contentEditable={false}
          $isFocused={isFocused}
          $readOnly={disabled}
          onClick={disabled ? undefined : handleClick}
        >
          <BlockEntryIconWrapper>
            <BlockEntryIcon />
          </BlockEntryIconWrapper>
          <BlockEntryContent>
            <BlockEntryTitle>{title}</BlockEntryTitle>
            <BlockEntryType>{contentType}</BlockEntryType>
          </BlockEntryContent>
          {!disabled && (
            <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <EntryKebabMenu onOpen={openEntry} onRemove={handleRemove} />
            </div>
          )}
        </BlockEntryCard>
        {children}
      </div>
    );
  }

  return (
    <span {...attributes}>
      <InlineEntryBadge
        contentEditable={false}
        $isFocused={isFocused}
        $readOnly={disabled}
        onClick={disabled ? undefined : handleClick}
      >
        <EntryIcon />
        <span>{title}</span>
        {!disabled && (
          <span onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <EntryKebabMenu onOpen={openEntry} onRemove={handleRemove} />
          </span>
        )}
      </InlineEntryBadge>
      {children}
    </span>
  );
};
