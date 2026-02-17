"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/lib/i18n";

interface AdminLanguageToggleProps {
  value: Locale;
  onChange: (value: Locale) => void;
  labels: {
    english: string;
    french: string;
  };
  ariaLabel?: string;
}

export function AdminLanguageToggle({
  value,
  onChange,
  labels,
  ariaLabel = "Preview language",
}: AdminLanguageToggleProps) {
  const onValueChange = (nextValue: string) => {
    if (nextValue === "en" || nextValue === "fr") {
      onChange(nextValue);
    }
  };

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList aria-label={ariaLabel}>
        <TabsTrigger value="en">{labels.english}</TabsTrigger>
        <TabsTrigger value="fr">{labels.french}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
