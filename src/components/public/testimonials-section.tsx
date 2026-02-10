"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Locale, Translations } from "@/lib/i18n";
import type { Testimonial } from "@/lib/types/database";
import { AnimatedSection } from "@/components/public/animated-section";
import { fetchMutation } from "@/lib/http/mutation";
import { TESTIMONIAL_MAX_CHARS } from "@/lib/constants/testimonials";
import { toast } from "sonner";

const TESTIMONIALS_PER_PAGE = 4;

function shortHash(id: string): string {
  const hex = Array.from(id.replace(/-/g, "").slice(0, 7))
    .map((c) => c.charCodeAt(0).toString(16))
    .join("")
    .slice(0, 7);
  return hex.padEnd(7, "0");
}

export function TestimonialsSection({
  locale,
  items,
  t,
  settings,
}: {
  locale: Locale;
  items: Testimonial[];
  t: Pick<Translations, "testimonials" | "common">;
  settings?: {
    honeypotEnabled?: boolean;
    honeypotVisible?: boolean;
  };
}) {
  const honeypotEnabled = settings?.honeypotEnabled === true;
  const honeypotVisible = honeypotEnabled && settings?.honeypotVisible === true;
  const [form, setForm] = useState({
    author_name: "",
    author_title: "",
    author_company: "",
    content: "",
    website: "",
    formStartedAt: Date.now(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);

  const totalTestimonials = items.length;
  const totalPages = Math.max(1, Math.ceil(totalTestimonials / TESTIMONIALS_PER_PAGE));
  const pageItems = useMemo(() => {
    const start = (page - 1) * TESTIMONIALS_PER_PAGE;
    return items.slice(start, start + TESTIMONIALS_PER_PAGE);
  }, [items, page]);

  useEffect(() => {
    setPage((previous) => Math.min(Math.max(previous, 1), totalPages));
  }, [totalPages]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        author_name: form.author_name,
        author_title: form.author_title,
        author_company: form.author_company,
        content: form.content,
        ...(honeypotEnabled
          ? {
            website: form.website,
            form_started_at: form.formStartedAt,
          }
          : {}),
      };

      await fetchMutation("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(t.testimonials.submitSuccess);
      setForm({
        author_name: "",
        author_title: "",
        author_company: "",
        content: "",
        website: "",
        formStartedAt: Date.now(),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatedSection id="testimonials" className="space-y-6 py-14">
      <h2 className="terminal-heading text-2xl font-semibold tracking-tight text-foreground">
        <span className="heading-prefix" aria-hidden="true">{"// "}</span>{t.testimonials.title}
      </h2>

      <div className="terminal-card card-3d-hover rounded-lg bg-[var(--card)] p-5 font-mono">
        <p className="text-xs text-terminal-dim">
          <span className="text-terminal-green">shawn_nabizada@portfolio</span>
          <span className="text-terminal-dim">:</span>
          <span className="text-terminal-cyan">~</span>
          <span className="text-terminal-dim">$ </span>
          {t.testimonials.logCommand}
        </p>

        <div className="mt-4 space-y-0">
          {pageItems.length === 0 ? (
            <p className="text-xs text-terminal-dim">{t.testimonials.empty}</p>
          ) : (
            pageItems.map((item, index) => {
              const hash = shortHash(item.id);
              const authorLine = [item.author_title, item.author_company]
                .filter(Boolean)
                .join(", ");
              const content =
                locale === "fr" ? item.content_fr || item.content_en : item.content_en;

              return (
                <article key={item.id}>
                  {index > 0 && (
                    <div className="my-4 border-t border-terminal-border" aria-hidden="true" />
                  )}
                  <p className="text-xs">
                    <span className="text-terminal-dim">{t.testimonials.commitLabel} </span>
                    <span className="text-terminal-cyan">{hash}</span>
                  </p>
                  <p className="text-xs">
                    <span className="text-terminal-dim">{t.testimonials.authorLabel}: </span>
                    <span className="text-foreground">{item.author_name}</span>
                    {authorLine && (
                      <span className="text-terminal-dim"> &lt;{authorLine}&gt;</span>
                    )}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap pl-4 text-sm leading-relaxed text-muted-foreground">
                    {content}
                  </p>
                </article>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-terminal-border/60 pt-3 text-xs text-terminal-dim">
          <div className="flex items-center gap-3">
            <span>
              {totalTestimonials} {t.testimonials.totalLabel}
            </span>
            <span>
              {t.testimonials.pageLabel} {page}/{totalPages}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              disabled={page <= 1}
              className="rounded-md border border-terminal-border px-2 py-1 text-terminal-cyan transition-colors hover:border-terminal-green hover:text-terminal-green disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t.testimonials.prevPage}
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((previous) => Math.min(totalPages, previous + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-terminal-border px-2 py-1 text-terminal-cyan transition-colors hover:border-terminal-green hover:text-terminal-green disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={t.testimonials.nextPage}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="terminal-card space-y-4 p-5">
        <h3 className="terminal-heading text-lg font-semibold text-foreground">{t.testimonials.submit}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-6">
            <label htmlFor="testimonial-author-name" className="terminal-label">
              &gt; {t.testimonials.authorName}
            </label>
            <input
              id="testimonial-author-name"
              className="terminal-input"
              value={form.author_name}
              onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-6">
            <label htmlFor="testimonial-author-title" className="terminal-label">
              &gt; {t.testimonials.authorTitle}
            </label>
            <input
              id="testimonial-author-title"
              className="terminal-input"
              value={form.author_title}
              onChange={(e) => setForm((f) => ({ ...f, author_title: e.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-6">
          <label htmlFor="testimonial-author-company" className="terminal-label">
            &gt; {t.testimonials.authorCompany}
          </label>
          <input
            id="testimonial-author-company"
            className="terminal-input"
            value={form.author_company}
            onChange={(e) => setForm((f) => ({ ...f, author_company: e.target.value }))}
          />
        </div>
        <div className="space-y-6">
          <label htmlFor="testimonial-content" className="terminal-label">
            &gt; {t.testimonials.content}
          </label>
          <textarea
            id="testimonial-content"
            className="terminal-textarea"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            maxLength={TESTIMONIAL_MAX_CHARS}
            required
            rows={3}
          />
          <p className="text-right text-xs text-terminal-dim">
            {form.content.length}/{TESTIMONIAL_MAX_CHARS}
          </p>
        </div>
        {honeypotEnabled ? (
          <div
            className={
              honeypotVisible
                ? "space-y-2"
                : "pointer-events-none absolute left-[-10000px] top-auto h-px w-px overflow-hidden opacity-0"
            }
            aria-hidden={!honeypotVisible}
          >
            <label
              htmlFor="testimonial-website"
              className={honeypotVisible ? "terminal-label" : "sr-only"}
            >
              &gt; {t.testimonials.honeypotLabel}
            </label>
            <input
              id="testimonial-website"
              name="website"
              autoComplete="off"
              tabIndex={-1}
              className="terminal-input"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder={honeypotVisible ? t.testimonials.honeypotPlaceholder : ""}
            />
          </div>
        ) : null}
        <button type="submit" className="terminal-btn" disabled={submitting}>
          {submitting ? t.common.loading : t.testimonials.submit}
        </button>
      </form>
    </AnimatedSection>
  );
}
