"use client";

import { useState } from "react";
import type { Locale, Translations } from "@/lib/i18n";
import { AnimatedSection } from "@/components/public/animated-section";
import { fetchMutation } from "@/lib/http/mutation";
import { toast } from "sonner";

export function ContactSection({
  locale,
  t,
  settings,
}: {
  locale: Locale;
  t: Pick<Translations, "contact" | "common">;
  settings?: {
    honeypotEnabled?: boolean;
    honeypotVisible?: boolean;
  };
}) {
  const honeypotEnabled = settings?.honeypotEnabled === true;
  const honeypotVisible = honeypotEnabled && settings?.honeypotVisible === true;
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "",
    formStartedAt: Date.now(),
  });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        ...(honeypotEnabled
          ? {
            website: form.website,
            form_started_at: form.formStartedAt,
          }
          : {}),
      };

      await fetchMutation("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(t.contact.success);
      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
        website: "",
        formStartedAt: Date.now(),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.contact.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatedSection id="contact" className="space-y-6 py-14">
      <div>
        <h2 className="terminal-heading text-2xl font-semibold tracking-tight text-foreground">
          <span className="heading-prefix" aria-hidden="true">{"// "}</span>{t.contact.title}
        </h2>
        <p className="mt-1 text-base text-muted-foreground">{t.contact.subtitle}</p>
      </div>

      <form onSubmit={submit} className="terminal-card grid gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-6">
            <label htmlFor="contact-name" className="terminal-label">
              &gt; {t.contact.name}
            </label>
            <input
              id="contact-name"
              className="terminal-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder={t.contact.namePlaceholder}
            />
          </div>
          <div className="space-y-6">
            <label htmlFor="contact-email" className="terminal-label">
              &gt; {t.contact.email}
            </label>
            <input
              id="contact-email"
              type="email"
              className="terminal-input"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder={t.contact.emailPlaceholder}
            />
          </div>
        </div>
        <div className="space-y-6">
          <label htmlFor="contact-subject" className="terminal-label">
            &gt; {t.contact.subject}
          </label>
          <input
            id="contact-subject"
            className="terminal-input"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder={t.contact.subjectPlaceholder}
          />
        </div>
        <div className="space-y-6">
          <label htmlFor="contact-message" className="terminal-label">
            &gt; {t.contact.message}
          </label>
          <textarea
            id="contact-message"
            className="terminal-textarea"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            required
            placeholder={t.contact.messagePlaceholder}
            rows={5}
          />
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
              htmlFor="contact-website"
              className={honeypotVisible ? "terminal-label" : "sr-only"}
            >
              &gt; {t.contact.honeypotLabel}
            </label>
            <input
              id="contact-website"
              name="website"
              autoComplete="off"
              tabIndex={-1}
              className="terminal-input"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder={honeypotVisible ? t.contact.honeypotPlaceholder : ""}
            />
          </div>
        ) : null}
        <button type="submit" className="terminal-btn" disabled={sending}>
          {sending ? t.contact.sending : `[${locale === "fr" ? "ENTRÉE" : "ENTER"}] ${t.contact.send}`}
        </button>
      </form>
    </AnimatedSection>
  );
}
