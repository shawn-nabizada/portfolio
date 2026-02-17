export type SortDir = "asc" | "desc";
export type TranslationFilter = "all" | "missing_en" | "missing_fr" | "complete";

const DEFAULT_MAX_QUERY_LENGTH = 120;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseSearchQuery(
  value: string | null,
  maxLength = DEFAULT_MAX_QUERY_LENGTH
): string {
  if (typeof value !== "string") return "";
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  return normalized.slice(0, Math.max(1, maxLength));
}

export function parseSortDir(value: string | null, fallback: SortDir = "asc"): SortDir {
  return value === "asc" || value === "desc" ? value : fallback;
}

export function parseSortBy<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  if (!value) return fallback;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseTranslationFilter(value: string | null): TranslationFilter {
  if (value === "missing_en") return "missing_en";
  if (value === "missing_fr") return "missing_fr";
  if (value === "complete") return "complete";
  return "all";
}

export function toOrIlikePattern(value: string): string {
  const sanitized = normalizeWhitespace(value)
    .replace(/[,%()]/g, " ")
    .replace(/["']/g, "")
    .trim();
  return `%${sanitized}%`;
}

type TranslationQueryBuilder = {
  or: (filters: string) => TranslationQueryBuilder;
  not: (column: string, operator: string, value: unknown) => TranslationQueryBuilder;
  neq: (column: string, value: unknown) => TranslationQueryBuilder;
};

export function applyTranslationFilter<T extends TranslationQueryBuilder>(
  query: T,
  filter: TranslationFilter,
  englishColumn: string,
  frenchColumn: string
): T {
  if (filter === "missing_en") {
    return query.or(`${englishColumn}.is.null,${englishColumn}.eq.""`) as T;
  }

  if (filter === "missing_fr") {
    return query.or(`${frenchColumn}.is.null,${frenchColumn}.eq.""`) as T;
  }

  if (filter === "complete") {
    return query
      .not(englishColumn, "is", null)
      .neq(englishColumn, "")
      .not(frenchColumn, "is", null)
      .neq(frenchColumn, "") as T;
  }

  return query;
}
