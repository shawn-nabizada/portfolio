import type { PaginatedResponse } from "@/lib/types/pagination";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

interface PaginationParams {
  enabled: boolean;
  page: number;
  pageSize: number;
  from: number;
  to: number;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function parsePageQuery(value: string | null): number {
  return parsePositiveInt(value, DEFAULT_PAGE);
}

export function parsePageSizeQuery(value: string | null): number {
  const parsed = parsePositiveInt(value, DEFAULT_PAGE_SIZE);
  return Math.min(MAX_PAGE_SIZE, Math.max(1, parsed));
}

export function readPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const hasPage = searchParams.get("page") !== null;
  const hasPageSize = searchParams.get("pageSize") !== null;
  const page = parsePageQuery(searchParams.get("page"));
  const pageSize = parsePageSizeQuery(searchParams.get("pageSize"));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return {
    enabled: hasPage || hasPageSize,
    page,
    pageSize,
    from,
    to,
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number
): PaginatedResponse<T> {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const totalPages = safeTotal === 0 ? 1 : Math.ceil(safeTotal / pageSize);

  return {
    items,
    page,
    pageSize,
    total: safeTotal,
    totalPages,
  };
}
