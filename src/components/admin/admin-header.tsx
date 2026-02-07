"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { LOCALE_COOKIE } from "@/lib/i18n";

interface AdminHeaderProps {
  locale: string;
  onMenuToggle: () => void;
}

export function AdminHeader({ locale, onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const oppositeLocale = locale === "en" ? "fr" : "en";

  const handleLocaleToggle = () => {
    // Replace the locale segment in the current pathname
    const newPathname = pathname.replace(`/${locale}/`, `/${oppositeLocale}/`);
    // Set cookie so middleware picks it up
    document.cookie = `${LOCALE_COOKIE}=${oppositeLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.push(newPathname);
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
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

      {/* Page title area */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Locale toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLocaleToggle}
          className="min-w-[3rem] font-medium"
        >
          {locale.toUpperCase()}
        </Button>

        {/* Dark/Light mode toggle */}
        <ModeToggle />
      </div>
    </header>
  );
}
