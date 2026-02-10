"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { PortfolioData } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";
import { TerminalBody } from "./terminal-body";

const CLOSE_ANIMATION_MS = 180;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function TerminalModal({
  open,
  locale,
  data,
  onClose,
}: {
  open: boolean;
  locale: Locale;
  data: PortfolioData;
  onClose: () => void;
}) {
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const closeTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const visibilityFrameRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (visibilityFrameRef.current) {
        window.cancelAnimationFrame(visibilityFrameRef.current);
        visibilityFrameRef.current = null;
      }

      animationFrameRef.current = window.requestAnimationFrame(() => {
        setShouldRender(true);
        visibilityFrameRef.current = window.requestAnimationFrame(() => {
          setIsVisible(true);
          visibilityFrameRef.current = null;
        });
        animationFrameRef.current = null;
      });
      return () => {
        if (animationFrameRef.current) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (visibilityFrameRef.current) {
          window.cancelAnimationFrame(visibilityFrameRef.current);
          visibilityFrameRef.current = null;
        }
      };
    }

    if (visibilityFrameRef.current) {
      window.cancelAnimationFrame(visibilityFrameRef.current);
      visibilityFrameRef.current = null;
    }
    visibilityFrameRef.current = window.requestAnimationFrame(() => {
      setIsVisible(false);
      visibilityFrameRef.current = null;
    });
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (visibilityFrameRef.current) {
        window.cancelAnimationFrame(visibilityFrameRef.current);
        visibilityFrameRef.current = null;
      }
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!shouldRender) {
      delete document.body.dataset.terminalOpen;
      return;
    }

    document.body.dataset.terminalOpen = "true";
    return () => {
      delete document.body.dataset.terminalOpen;
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const activeInsideDialog = active ? dialog.contains(active) : false;

      if (event.shiftKey) {
        if (!activeInsideDialog || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!activeInsideDialog || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const frameId = window.requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !dialogRef.current?.contains(active)) {
        closeButtonRef.current?.focus();
      }
    });

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm transition-opacity duration-200 ease-out sm:p-3",
        isVisible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "mt-3 flex h-[80dvh] w-[98vw] max-h-[80dvh] flex-col overflow-hidden rounded-xl border border-terminal-border bg-card shadow-[0_0_25px_var(--terminal-glow)] transition-all duration-200 ease-out sm:mt-0 sm:h-[88vh] sm:w-[94vw] sm:max-h-[88vh] lg:h-[608px] lg:w-[945px] lg:max-h-[90vh] lg:max-w-[95vw]",
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-terminal-border/70 bg-background/90 px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500/80 sm:h-2.5 sm:w-2.5" aria-hidden="true" />
            <span className="h-2 w-2 rounded-full bg-yellow-500/80 sm:h-2.5 sm:w-2.5" aria-hidden="true" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/80 sm:h-2.5 sm:w-2.5" aria-hidden="true" />
            <span id={titleId} className="ml-2 font-mono text-xs text-terminal-dim">
              portfolio-sh
            </span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:p-1.5"
            aria-label={locale === "fr" ? "Fermer le terminal" : "Close terminal"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <TerminalBody locale={locale} data={data} onRequestClose={onClose} />
      </div>
    </div>
  );
}
