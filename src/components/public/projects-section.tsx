"use client";

import { Github, ExternalLink } from "lucide-react";
import { AnimatedSection } from "@/components/public/animated-section";
import type { Locale, Translations } from "@/lib/i18n";
import type { LocalizedProject } from "@/lib/portfolio-data";

function formatMonthYear(value: string, locale: Locale): string {
  if (!value) return "";
  const normalized = value.length === 7 ? `${value}-01` : value;
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return value;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function ProjectsSection({
  locale,
  projects,
  t,
}: {
  locale: Locale;
  projects: LocalizedProject[];
  t: Pick<Translations, "projects">;
}) {
  return (
    <AnimatedSection id="projects" className="space-y-6 py-14">
      <h2 className="terminal-heading text-2xl font-semibold tracking-tight text-foreground">
        <span className="heading-prefix" aria-hidden="true">{"// "}</span>{t.projects.title}
      </h2>
      <div className="grid gap-4">
        {projects.map((project) => (
          <article key={project.id} className="terminal-card card-3d-hover flex h-full flex-col overflow-hidden rounded-xl">
              {/* Terminal window title bar */}
              <div className="flex items-center gap-1.5 border-b border-terminal-border px-3 py-2" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 font-mono text-[10px] text-terminal-dim">
                  {project.title.toLowerCase().replace(/\s+/g, "-")}.sh
                </span>
              </div>

              {project.image_url ? (
                <div className="relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className="h-44 w-full object-cover"
                  />
                  {/* Scanline overlay on image */}
                  <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0.78_0.2_145/3%)_2px,oklch(0.78_0.2_145/3%)_4px)]" aria-hidden="true" />
                </div>
              ) : null}

              <div className="flex flex-1 flex-col space-y-4 p-4">
                <div>
                  <h3 className="font-mono text-lg font-semibold text-foreground">{project.title}</h3>
                  {project.start_date ? (
                    <p className="mt-1 font-mono text-xs text-terminal-dim">
                      {formatMonthYear(project.start_date, locale)} -{" "}
                      {project.end_date
                        ? formatMonthYear(project.end_date, locale)
                        : t.projects.present}
                    </p>
                  ) : null}
                  {project.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {project.description}
                    </p>
                  ) : null}
                  {project.bullets.length > 0 ? (
                    <ul className="mt-2 space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">
                      {project.bullets.map((bullet, index) => (
                        <li key={`${project.id}-bullet-${index}`} className="list-disc">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {project.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className="rounded-md border border-terminal-border px-2 py-0.5 font-mono text-[10px] text-terminal-dim"
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center gap-2 pt-2">
                  {project.project_url ? (
                    <a
                      href={project.project_url}
                      target="_blank"
                      rel="noreferrer"
                      className="terminal-link inline-flex items-center gap-1.5 font-mono text-xs text-terminal-cyan hover:text-terminal-green transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      $ open <span className="terminal-link-arrow">&rarr;</span>
                    </a>
                  ) : null}
                  {project.project_url && project.github_url ? (
                    <span className="font-mono text-xs text-terminal-dim" aria-hidden="true">
                      |
                    </span>
                  ) : null}
                  {project.github_url ? (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="terminal-link inline-flex items-center gap-1.5 font-mono text-xs text-terminal-cyan hover:text-terminal-green transition-colors"
                    >
                      <Github className="h-3.5 w-3.5" />
                      $ git clone <span className="terminal-link-arrow">&rarr;</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
        ))}
      </div>
    </AnimatedSection>
  );
}
