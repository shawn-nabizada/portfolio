"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { LocaleToggle } from "@/components/public/locale-toggle";
import type { Locale, Translations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navOrder: Array<keyof Translations["nav"]> = [
  "about",
  "skills",
  "projects",
  "experience",
  "education",
  "hobbies",
  "testimonials",
  "contact",
];

export function PublicNavbar({
  locale,
  nav,
}: {
  locale: Locale;
  nav: Translations["nav"];
}) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const scrollToTop = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastY;

        if (open || currentY <= 20) {
          setHidden(false);
        } else if (Math.abs(delta) > 6) {
          setHidden(delta > 0);
        }

        lastY = currentY;
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-terminal-border bg-background/90 backdrop-blur transition-transform duration-300",
        hidden ? "-translate-y-full" : "translate-y-0"
      )}
      onKeyDown={handleKeyDown}
    >
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 min-[1225px]:hidden">
        <a
          href={`/${locale}`}
          onClick={scrollToTop}
          className="max-w-[calc(100vw-5.5rem)] truncate font-mono text-md text-terminal-green tracking-tight"
        >
          shawn_nabizada@portfolio:~$
        </a>

        <button
          className="flex items-center justify-center w-9 h-9 rounded-md border border-terminal-border text-muted-foreground hover:text-terminal-green hover:border-terminal-green transition-colors"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="mx-auto hidden h-16 w-full max-w-[min(96vw,112rem)] items-center gap-[clamp(0.5rem,1.4vw,1.6rem)] px-4 xl:px-6 2xl:px-8 min-[1225px]:flex">
        <div className="min-w-0 basis-[clamp(11rem,22vw,24rem)] shrink-0">
          <a
            href={`/${locale}`}
            onClick={scrollToTop}
            className="block truncate font-mono text-md text-terminal-green tracking-tight"
          >
            shawn_nabizada@portfolio:~$
          </a>
        </div>

        <nav
          aria-label="Main navigation"
          className="min-w-0 flex-1 overflow-x-auto overflow-y-visible px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="mx-auto flex w-max items-center justify-center gap-[clamp(0.3rem,0.75vw,0.85rem)]">
            {navOrder.map((item) => (
              <a
                key={item}
                href={`#${item}`}
                className="nav-link px-1 py-1 font-mono text-[clamp(12px,0.8vw,14px)] text-muted-foreground transition-colors hover:text-terminal-green whitespace-nowrap"
              >
                ./{nav[item].toLowerCase()}
              </a>
            ))}
          </div>
        </nav>

        <div className="flex basis-[clamp(11rem,22vw,24rem)] shrink-0 items-center justify-end gap-2 xl:gap-3">
          <ModeToggle />
          <LocaleToggle locale={locale} />
        </div>
      </div>

      <nav
        aria-label="Mobile navigation"
        className={cn(
          "border-t border-terminal-border bg-background px-4 py-4 min-[1225px]:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="flex flex-col gap-3">
          {navOrder.map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="font-mono text-sm text-muted-foreground hover:text-terminal-green transition-colors"
              onClick={() => setOpen(false)}
            >
              $ cd {nav[item].toLowerCase()}
            </a>
          ))}
          <div className="mt-2 flex items-center gap-2">
            <LocaleToggle locale={locale} />
            <ModeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
