import {
  Field,
  Flex,
  Loader,
  MultiSelect,
  MultiSelectOption,
  Tag,
  Typography,
} from '@strapi/design-system';
import { CaretDown, Cross } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import React from 'react';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';
import {
  getShortNameFromUid,
  parseEmbeddedEntryBlockTypes,
  type StrapiContentTypeInfo,
} from '../utils/contentTypes';

const SelectedContent = styled(Flex)`
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: ${({ theme }: { theme: any }) => theme.spaces[1]};
  pointer-events: none;
`;

// ~2 rows of 3.2rem tags + gaps; keeps the trigger compact so the dropdown
// can position correctly even when many types are selected.
const TagsContainer = styled(Flex)`
  flex: 1;
  flex-wrap: wrap;
  gap: ${({ theme }: { theme: any }) => theme.spaces[1]};
  max-height: 7.2rem;
  overflow: hidden;
  min-width: 0;
  align-items: center;
`;

const TruncatedTag = styled(Tag)`
  max-width: 16rem;
  min-width: 0;
  flex-shrink: 1;

  & > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  /* Keep only the remove (X) button interactive. */
  & > button {
    pointer-events: auto;
  }
`;

const OverflowIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }: { theme: any }) => theme.spaces[1]};
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 1.2rem;
  font-weight: 600;
  line-height: 1;
  color: ${({ theme }: { theme: any }) => theme.colors.neutral600};
  padding-inline: ${({ theme }: { theme: any }) => theme.spaces[1]};

  svg {
    width: 0.7rem;
    height: 0.7rem;
  }
`;

interface SelectedTagsDisplayProps {
  selectedValues: string[];
  getDisplayName: (uid: string) => string;
  onRemove: (uid: string) => (event: React.MouseEvent) => void;
  removeLabel: (name: string) => string;
  totalLabel: string;
}

const SelectedTagsDisplay = ({
  selectedValues,
  getDisplayName,
  onRemove,
  removeLabel,
  totalLabel,
}: SelectedTagsDisplayProps) => {
  const tagsRef = React.useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    const element = tagsRef.current;
    if (!element) {
      return;
    }

    const updateOverflow = () => {
      setIsOverflowing(element.scrollHeight > element.clientHeight + 1);
    };

    updateOverflow();

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selectedValues]);

  return (
    <SelectedContent>
      <TagsContainer ref={tagsRef}>
        {selectedValues.map((uid) => {
          const displayName = getDisplayName(uid);
          return (
            <TruncatedTag
              key={uid}
              tabIndex={-1}
              label={removeLabel(displayName)}
              icon={<Cross width={`${14 / 16}rem`} height={`${14 / 16}rem`} />}
              onClick={onRemove(uid)}
            >
              {displayName}
            </TruncatedTag>
          );
        })}
      </TagsContainer>
      {isOverflowing && (
        <OverflowIndicator aria-label={totalLabel}>
          {totalLabel}
        </OverflowIndicator>
      )}
    </SelectedContent>
  );
};

interface EmbeddedEntryTypesSelectProps {
  intlLabel: {
    id: string;
    defaultMessage: string;
  };
  description?: {
    id: string;
    defaultMessage: string;
  };
  name: string;
  error?: string;
  onChange: (payload: {
    target: {
      name: string;
      value: string[];
      type?: string;
    };
  }) => void;
  value?: string[] | string | null;
  disabled?: boolean;
  modifiedData?: {
    options?: {
      allow_embedded_entries?: boolean;
    };
  };
}

export const EmbeddedEntryTypesSelect = ({
  intlLabel,
  description,
  name,
  error,
  onChange,
  value,
  disabled = false,
  modifiedData,
}: EmbeddedEntryTypesSelectProps) => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();
  const [contentTypes, setContentTypes] = React.useState<StrapiContentTypeInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const didApplyDefault = React.useRef(false);
  const [userHasChanged, setUserHasChanged] = React.useState(false);

  const allowEmbeddedEntries = modifiedData?.options?.allow_embedded_entries ?? true;
  const isDisabled = disabled || !allowEmbeddedEntries;
  const isUnset = value === undefined || value === null;

  React.useEffect(() => {
    let cancelled = false;

    async function fetchContentTypes() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const response = await get('/enhanced-blocks-editor/content-types');
        const apiContentTypes = ((response?.data || []) as StrapiContentTypeInfo[]).filter(
          (ct) => ct.uid.startsWith('api::'),
        );
        if (!cancelled) {
          setContentTypes(apiContentTypes);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load content types for embedded entry settings', err);
          setFetchError('Failed to load content types');
          setContentTypes([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchContentTypes();
    return () => {
      cancelled = true;
    };
  }, [get]);

  const allContentTypeUids = React.useMemo(
    () => contentTypes.map((contentType) => contentType.uid),
    [contentTypes],
  );

  const parsedValues = React.useMemo(
    () => parseEmbeddedEntryBlockTypes(value),
    [value],
  );

  const selectedValues = React.useMemo(() => {
    if (contentTypes.length === 0) {
      return parsedValues;
    }

    if (!userHasChanged && isUnset) {
      return allContentTypeUids;
    }

    if (parsedValues.length === 0) {
      return [];
    }

    return parsedValues.map((identifier) => {
      if (identifier.startsWith('api::')) {
        return identifier;
      }
      const match = contentTypes.find(
        (ct) => getShortNameFromUid(ct.uid) === identifier,
      );
      return match?.uid ?? identifier;
    });
  }, [parsedValues, contentTypes, allContentTypeUids, isUnset, userHasChanged]);

  React.useEffect(() => {
    if (
      isDisabled ||
      isLoading ||
      allContentTypeUids.length === 0 ||
      didApplyDefault.current ||
      userHasChanged
    ) {
      return;
    }

    if (!isUnset) {
      didApplyDefault.current = true;
      return;
    }

    didApplyDefault.current = true;
    onChange({
      target: {
        name,
        value: allContentTypeUids,
        type: 'embedded-entry-types-select',
      },
    });
  }, [allContentTypeUids, isDisabled, isLoading, isUnset, name, onChange, userHasChanged]);

  const label = intlLabel.id
    ? formatMessage({
        id: intlLabel.id,
        defaultMessage: intlLabel.defaultMessage,
      })
    : name;

  const hint = description?.id
    ? formatMessage({
        id: description.id,
        defaultMessage: description.defaultMessage,
      })
    : undefined;

  const getDisplayName = React.useCallback(
    (uid: string) => {
      const contentType = contentTypes.find((ct) => ct.uid === uid);
      return contentType?.info.displayName ?? getShortNameFromUid(uid);
    },
    [contentTypes],
  );

  const handleChange = (values: string[]) => {
    setUserHasChanged(true);
    onChange({
      target: {
        name,
        value: values,
        type: 'embedded-entry-types-select',
      },
    });
  };

  const handleRemoveTag = (uidToRemove: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handleChange(selectedValues.filter((uid) => uid !== uidToRemove));
  };

  const customizeContent = () => {
    if (selectedValues.length === 0) {
      return formatMessage({
        id: 'enhanced-blocks-editor.embeddedEntryTypesSelect.selected.none',
        defaultMessage: 'No collection types selected',
      });
    }

    return (
      <SelectedTagsDisplay
        selectedValues={selectedValues}
        getDisplayName={getDisplayName}
        onRemove={handleRemoveTag}
        removeLabel={(displayName) =>
          formatMessage(
            {
              id: 'enhanced-blocks-editor.embeddedEntryTypesSelect.remove',
              defaultMessage: 'Remove {name}',
            },
            { name: displayName },
          )
        }
        totalLabel={formatMessage(
          {
            id: 'enhanced-blocks-editor.embeddedEntryTypesSelect.total',
            defaultMessage: '{count} total',
          },
          { count: selectedValues.length },
        )}
      />
    );
  };

  return (
    <Field.Root name={name} hint={hint} error={error ?? undefined}>
      {!isDisabled && (
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Field.Label>{label}</Field.Label>
          {isLoading ? (
            <Flex padding={3} justifyContent="center">
              <Loader small>Loading collection types...</Loader>
            </Flex>
          ) : fetchError ? (
            <Typography textColor="danger600">{fetchError}</Typography>
          ) : (
            <MultiSelect
              placeholder="Select collection types"
              // Design-system types declare string, but runtime renders React nodes.
              customizeContent={customizeContent as (value?: string[]) => string}
              value={selectedValues}
              onChange={handleChange}
              hasError={Boolean(error)}
            >
              {contentTypes.map((contentType) => (
                <MultiSelectOption key={contentType.uid} value={contentType.uid}>
                  {contentType.info.displayName}
                </MultiSelectOption>
              ))}
            </MultiSelect>
          )}
          <Field.Hint />
          <Field.Error />
        </Flex>
      )}
    </Field.Root>
  );
};
