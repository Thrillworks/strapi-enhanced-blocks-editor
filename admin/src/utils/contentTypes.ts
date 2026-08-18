export interface StrapiContentTypeInfo {
  uid: string;
  info: {
    displayName: string;
    mainField?: string | null;
  };
}

export function parseEmbeddedEntryBlockTypes(
  raw: string | string[] | null | undefined,
): string[] {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export function getShortNameFromUid(uid: string): string {
  const parts = uid.split('.');
  return parts[parts.length - 1];
}

export function resolveContentTypeUid(
  identifier: string,
  contentTypes: StrapiContentTypeInfo[],
): string | undefined {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('api::')) {
    return contentTypes.find((ct) => ct.uid === trimmed)?.uid;
  }

  return contentTypes.find((ct) => getShortNameFromUid(ct.uid) === trimmed)?.uid;
}

export function resolveContentTypeUids(
  identifiers: string[],
  contentTypes: StrapiContentTypeInfo[],
): string[] {
  return identifiers
    .map((identifier) => resolveContentTypeUid(identifier, contentTypes))
    .filter((uid): uid is string => Boolean(uid));
}

export function buildContentManagerEntryUrl(contentTypeUid: string, documentId: string): string {
  return `${window.location.origin}/admin/content-manager/collection-types/${contentTypeUid}/${documentId}`;
}

export function getEntryDisplayTitle(
  entry: Record<string, unknown> | null | undefined,
  mainField: string | null | undefined,
): string {
  if (!entry) {
    return 'Untitled';
  }

  if (mainField) {
    const value = entry[mainField];
    if (value != null && value !== '') {
      return String(value);
    }
  }

  for (const fallbackField of ['title', 'name', 'label']) {
    const value = entry[fallbackField];
    if (value != null && value !== '') {
      return String(value);
    }
  }

  return 'Untitled';
}
