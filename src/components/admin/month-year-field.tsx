"use client";

import { useMemo } from "react";
import type { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MonthYearFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

const MIN_YEAR = 1950;

function parseMonthYearValue(value: string): { year: string; month: string } {
  if (!value) {
    return { year: "", month: "" };
  }

  const normalized = value.slice(0, 7);
  const match = normalized.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return { year: "", month: "" };
  }

  return { year: match[1], month: match[2] };
}

function localeCode(locale: Locale) {
  return locale === "fr" ? "fr-CA" : "en-CA";
}

export function MonthYearField({
  id,
  label,
  value,
  onChange,
  locale,
  required = false,
  disabled = false,
  allowClear = false,
  className,
}: MonthYearFieldProps) {
  const parsedValue = parseMonthYearValue(value);

  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeCode(locale), { month: "long", timeZone: "UTC" }),
    [locale]
  );

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const monthNumber = index + 1;
        return {
          value: String(monthNumber).padStart(2, "0"),
          label: monthFormatter.format(new Date(Date.UTC(2020, index, 1))),
        };
      }),
    [monthFormatter]
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 2;
    return Array.from(
      { length: maxYear - MIN_YEAR + 1 },
      (_, index) => String(maxYear - index)
    );
  }, []);

  const monthPlaceholder = locale === "fr" ? "Mois" : "Month";
  const yearPlaceholder = locale === "fr" ? "Année" : "Year";
  const clearLabel = locale === "fr" ? "Effacer" : "Clear";

  const handleMonthChange = (nextMonth: string) => {
    const fallbackYear = String(new Date().getFullYear());
    const nextYear = parsedValue.year || fallbackYear;
    onChange(`${nextYear}-${nextMonth}`);
  };

  const handleYearChange = (nextYear: string) => {
    const nextMonth = parsedValue.month || "01";
    onChange(`${nextYear}-${nextMonth}`);
  };

  const clearValue = () => {
    onChange("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          value={parsedValue.month || undefined}
          onValueChange={handleMonthChange}
          disabled={disabled}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={monthPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={parsedValue.year || undefined}
          onValueChange={handleYearChange}
          disabled={disabled}
        >
          <SelectTrigger id={`${id}-year`} className="w-full">
            <SelectValue placeholder={yearPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {allowClear && value && !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={clearValue}
        >
          {clearLabel}
        </Button>
      ) : null}
    </div>
  );
}
