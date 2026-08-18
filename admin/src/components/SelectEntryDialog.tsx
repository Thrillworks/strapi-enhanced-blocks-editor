import {
  Box,
  Button,
  Checkbox,
  Flex,
  Modal,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  Searchbar,
  SingleSelect,
  SingleSelectOption,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { Form, Formik } from "formik";
import React from "react";
import {
  getShortNameFromUid,
  getEntryDisplayTitle,
  resolveContentTypeUids,
  type StrapiContentTypeInfo,
} from "../utils/contentTypes";

interface SelectedEntryData {
  documentId: string;
  contentType: string;
  contentTypeUid: string;
  mainField: string | null;
  title: string;
  data: Record<string, any>;
}

interface SelectEntryDialogProps {
  contentTypes?: string[];
  allowedContentTypeUids?: string[];
  handleClose: () => void;
  handleSubmit: (values: SelectedEntryData) => void;
}

export const SelectEntryDialog = ({
  contentTypes: providedContentTypes,
  allowedContentTypeUids,
  handleClose,
  handleSubmit,
}: SelectEntryDialogProps) => {
  const { get } = useFetchClient();
  const [entries, setEntries] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingContentTypes, setIsLoadingContentTypes] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [selectedEntryId, setSelectedEntry] = React.useState("");
  const [contentTypeUid, setContentTypeUid] = React.useState("");
  const [availableContentTypeUids, setAvailableContentTypeUids] = React.useState<string[]>([]);
  const [contentTypesMap, setContentTypesMap] = React.useState<Record<string, string>>({});
  const [titleFieldMap, setTitleFieldMap] = React.useState<Record<string, string | null>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(1);
  const fetchRequestId = React.useRef(0);

  // Fetch all available content types from server
  React.useEffect(() => {
    let cancelled = false;

    async function fetchContentTypesData() {
      setIsLoadingContentTypes(true);
      setFetchError(null);
      try {
        const response: { data: StrapiContentTypeInfo[] } = await get(
          `/enhanced-blocks-editor/content-types`
        );

        const apiContentTypes = (response?.data || []).filter(
          (ct) => ct.uid.startsWith('api::')
        );

        let uidsToUse: string[];
        if (allowedContentTypeUids && allowedContentTypeUids.length > 0) {
          uidsToUse = allowedContentTypeUids;
        } else if (providedContentTypes && providedContentTypes.length > 0) {
          uidsToUse = resolveContentTypeUids(providedContentTypes, apiContentTypes);
        } else {
          uidsToUse = apiContentTypes.map((ct) => ct.uid);
        }

        const displayMap = uidsToUse.reduce<Record<string, string>>((acc, uid) => {
          const match = apiContentTypes.find((ct) => ct.uid === uid);
          acc[uid] = match?.info?.displayName || getShortNameFromUid(uid);
          return acc;
        }, {});

        const titleMap = uidsToUse.reduce<Record<string, string | null>>((acc, uid) => {
          const match = apiContentTypes.find((ct) => ct.uid === uid);
          acc[uid] = match?.info?.mainField ?? null;
          return acc;
        }, {});

        if (!cancelled) {
          setAvailableContentTypeUids(uidsToUse);
          setContentTypesMap(displayMap);
          setTitleFieldMap(titleMap);
          if (uidsToUse.length > 0) {
            setContentTypeUid(uidsToUse[0]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch content types", err);
          setFetchError("Failed to load content types. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingContentTypes(false);
        }
      }
    }

    fetchContentTypesData();
    return () => { cancelled = true; };
  }, [get, providedContentTypes, allowedContentTypeUids]);

  // Debounce search input
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch entries whenever query, page, or pageSize changes while modal is open
  React.useEffect(() => {
    if (!contentTypeUid) {
      return;
    }

    let cancelled = false;
    const requestId = ++fetchRequestId.current;

    async function fetchEntries() {
      setIsLoading(true);
      setFetchError(null);
      try {
        const params: Record<string, any> = { page, pageSize };
        if (debouncedQuery) {
          params._q = debouncedQuery;
        }
        const response = await get(
          `content-manager/collection-types/${contentTypeUid}`,
          { params } as any
        );
        if (cancelled || requestId !== fetchRequestId.current) {
          return;
        }
        const data = response?.data as unknown as {
          results: any[];
          pagination: { total: number; pageCount: number };
        };
        setEntries(data?.results || []);
        setTotal(data?.pagination?.total || 0);
        setPageCount(data?.pagination?.pageCount || 1);
      } catch (error) {
        if (!cancelled && requestId === fetchRequestId.current) {
          console.error(`Error fetching entries of type: ${contentTypeUid}`, error);
          setEntries([]);
          setTotal(0);
          setPageCount(1);
          setFetchError("Failed to load entries. Please try again.");
        }
      } finally {
        if (!cancelled && requestId === fetchRequestId.current) {
          setIsLoading(false);
        }
      }
    }

    fetchEntries();
    return () => { cancelled = true; };
  }, [contentTypeUid, debouncedQuery, page, pageSize, get]);

  // Custom handler to reset state when closing
  const handleModalClose = () => {
    setSelectedEntry("");
    setSearchQuery("");
    setFetchError(null);
    handleClose();
  };

  const isSelected = (entryId: string) => selectedEntryId === entryId;

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntry((prev) => (prev === entryId ? "" : entryId));
  };

  const canPrev = page > 1;
  const canNext = page < pageCount;
  const mainField = titleFieldMap[contentTypeUid] ?? null;

  const getEntryTitle = (entry: Record<string, unknown> | undefined) =>
    getEntryDisplayTitle(entry, mainField);

  return (
    <Modal.Root
      open
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) handleModalClose();
      }}
    >
      <Modal.Content style={{ minWidth: "720px", minHeight: "560px" }}>
        <Modal.Header>
          <Modal.Title>
            {contentTypeUid && contentTypesMap[contentTypeUid]
              ? `Add existing ${contentTypesMap[contentTypeUid]}`
              : "Add existing entry"}
          </Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={{}}
          onSubmit={() => {
            const selectedEntry = entries.find((e) => e.documentId === selectedEntryId);
            handleSubmit({
              documentId: selectedEntryId,
              contentType: getShortNameFromUid(contentTypeUid),
              contentTypeUid,
              mainField,
              title: getEntryTitle(selectedEntry),
              data: selectedEntry || {}
            });
          }}
          validateOnChange={false}
        >
          {() => {
            return (
              <Form>
                <Modal.Body>
                  <Flex direction="column" alignItems="stretch" gap={6}>
                    <Flex direction="row" gap={2}>
                      <Flex direction="row" gap={1}>
                        <Typography>Content type:</Typography>
                        <SingleSelect
                          value={contentTypeUid}
                          onChange={(val: any) => {
                            setContentTypeUid(val as string);
                            setPage(1);
                            setSelectedEntry("");
                          }}
                          disabled={isLoadingContentTypes}
                        >
                          {availableContentTypeUids.map((uid) => (
                            <SingleSelectOption key={uid} value={uid}>
                              {contentTypesMap[uid] || getShortNameFromUid(uid)}
                            </SingleSelectOption>
                          ))}
                        </SingleSelect>
                      </Flex>
                      <Box style={{ flex: 1 }}>
                        <Searchbar
                          name="searchEntry"
                          value={searchQuery}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                          }}
                          onClear={() => {
                            setSearchQuery("");
                            setPage(1);
                          }}
                          clearLabel="Clear"
                          placeholder="Search entries..."
                          size="M"
                        >
                          Search entries
                        </Searchbar>
                      </Box>
                    </Flex>
                    {fetchError && (
                      <Box padding={3} background="danger100">
                        <Typography textColor="danger700">{fetchError}</Typography>
                      </Box>
                    )}
                    {isLoadingContentTypes ? (
                      <Box padding={4} background="neutral100" style={{ minHeight: "320px" }}>
                        <Typography textAlign="center">Loading content types...</Typography>
                      </Box>
                    ) : isLoading ? (
                      <Box padding={4} background="neutral100" style={{ minHeight: "320px" }}>
                        <Typography textAlign="center">Loading entries...</Typography>
                      </Box>
                    ) : entries.length === 0 ? (
                      <Box padding={4} background="neutral100" style={{ minHeight: "320px" }}>
                        <Typography textAlign="center">No entries found</Typography>
                      </Box>
                    ) : (
                      <Box style={{ minHeight: "320px" }}>
                        <Table
                          colCount={3}
                          rowCount={entries.length}
                          style={{ tableLayout: "fixed", width: "100%" }}
                        >
                          <colgroup>
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "70%" }} />
                            <col style={{ width: "20%" }} />
                          </colgroup>
                          <Thead>
                            <Tr>
                              <Th>{""}</Th>
                              <Th>
                                <Typography variant="sigma">Name</Typography>
                              </Th>
                              <Th>
                                <Typography variant="sigma">Status</Typography>
                              </Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {entries.map((entry) => (
                              <Tr key={entry.id}>
                                <Td>
                                  <Checkbox
                                    checked={isSelected(entry.documentId)}
                                    onCheckedChange={() => handleSelectEntry(entry.documentId)}
                                    aria-label={`Select ${getEntryTitle(entry)}`}
                                    name={entry.documentId}
                                  />
                                </Td>
                                <Td
                                  style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  <Typography textColor="neutral800">
                                    {getEntryTitle(entry)}
                                  </Typography>
                                </Td>
                                <Td>
                                  <Typography textColor="neutral800">{entry.status}</Typography>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    )}

                    {/* Bottom controls combined in one row */}
                    <Flex justifyContent="space-between" alignItems="center" paddingTop={2}>
                      <Box style={{ minWidth: "180px" }}>
                        <SingleSelect
                          required
                          value={String(pageSize)}
                          onChange={(val: string | number) => {
                            const size = Number(val);
                            if ([10, 25, 50].includes(size)) {
                              setPageSize(size);
                              setPage(1);
                            }
                          }}
                        >
                          <SingleSelectOption value="10">10 per page</SingleSelectOption>
                          <SingleSelectOption value="25">25 per page</SingleSelectOption>
                          <SingleSelectOption value="50">50 per page</SingleSelectOption>
                        </SingleSelect>
                      </Box>

                      {/* Right: page info and navigation */}
                      <Flex gap={3} alignItems="center">
                        <Typography textColor="neutral600">
                          Page {page} of {pageCount} · {total} total
                        </Typography>
                        <Flex gap={2}>
                          <Button
                            variant="tertiary"
                            type="button"
                            onClick={() => canPrev && setPage((p) => Math.max(1, p - 1))}
                            disabled={!canPrev}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="tertiary"
                            type="button"
                            onClick={() => canNext && setPage((p) => Math.min(pageCount, p + 1))}
                            disabled={!canNext}
                          >
                            Next
                          </Button>
                        </Flex>
                      </Flex>
                    </Flex>
                  </Flex>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="tertiary" name="cancel" type="button" onClick={handleModalClose}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!selectedEntryId}
                    name="submit"
                    loading={isLoading}
                    type="submit"
                  >
                    Save
                  </Button>
                </Modal.Footer>
              </Form>
            );
          }}
        </Formik>
      </Modal.Content>
    </Modal.Root>
  );
};
