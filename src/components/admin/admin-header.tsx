"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { getTranslations, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

interface AdminHeaderProps {
  locale: string;
  onMenuToggle: () => void;
}

export function AdminHeader({ locale, onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = getTranslations((locale as Locale) || "en");

  const oppositeLocale = locale === "en" ? "fr" : "en";

  const handleLocaleToggle = () => {
    const newPathname = pathname.replace(/^\/(en|fr)(?=\/|$)/, `/${oppositeLocale}`);
    // Set cookie so middleware picks it up
    document.cookie = `${LOCALE_COOKIE}=${oppositeLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.push(newPathname);
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-lg font-semibold tracking-tight">Admin</span>
      </div>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={`/${locale}`} target="_blank" rel="noopener noreferrer">
            {t.admin.viewPortfolio}
          </a>
        </Button>

        {/* Locale toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLocaleToggle}
          className="min-w-[3rem] font-medium"
        >
          {oppositeLocale.toUpperCase()}
        </Button>

        {/* Dark/Light mode toggle */}
        <ModeToggle />
      </div>
    </header>
  );
}
