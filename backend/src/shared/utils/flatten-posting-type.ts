/**
 * Backwards-compat helpers: prior to the posting_type_master FK migration,
 * Posting.type was a Postgres ENUM column. The migration dropped the column
 * and replaced it with `posting_type_master_id` referencing MasterOption.
 *
 * API responses must still expose `posting.type` as a string so existing
 * consumers (frontend lists/badges/exports/reports) keep working unchanged.
 *
 * Use these helpers anywhere a posting (or a record that includes a posting)
 * is returned to the client.
 */

type PostingTypeMaster = { id?: string; value?: string } | null | undefined;

type WithPostingTypeMaster<T> = T & {
  posting_type_master?: PostingTypeMaster;
  posting_type_master_id?: string;
};

export function flattenPostingType<T extends WithPostingTypeMaster<Record<string, unknown>>>(
  posting: T,
): T & { type: string } {
  const value = posting?.posting_type_master?.value ?? '';
  return { ...posting, type: value };
}

type WithPosting<T> = T & {
  posting?: WithPostingTypeMaster<Record<string, unknown>> | null;
};

export function flattenNestedPostingType<T extends WithPosting<Record<string, unknown>>>(
  record: T,
): T {
  if (!record?.posting) return record;
  return { ...record, posting: flattenPostingType(record.posting) };
}

export const POSTING_TYPE_MASTER_INCLUDE = {
  posting_type_master: { select: { id: true, value: true } },
} as const;
