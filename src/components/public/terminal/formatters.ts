import type { Locale } from "@/lib/i18n";

export function normalize(value: string): string {
  return value.toLowerCase().trim();
}

export function slugify(value: string): string {
  return normalize(value)
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export function formatColumns(
  values: string[],
  columns = 3,
  padWidth = 16
): string[] {
  if (values.length === 0) return [];

  const lines: string[] = [];
  for (let index = 0; index < values.length; index += columns) {
    const row = values.slice(index, index + columns);
    lines.push(row.map((value) => value.padEnd(padWidth)).join("").trimEnd());
  }
  return lines;
}

export function formatYearRange(
  startDate: string,
  endDate: string | null,
  locale: Locale
): string {
  const startLabel = formatMonthYearLabel(startDate, locale);
  const endLabel = endDate
    ? formatMonthYearLabel(endDate, locale)
    : locale === "fr"
      ? "Présent"
      : "Present";
  return `${startLabel} - ${endLabel}`;
}

export function formatDateLabel(value: string, locale: Locale): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatMonthYearLabel(value: string, locale: Locale): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-US", {
    year: "numeric",
    month: "short",
  });
}
