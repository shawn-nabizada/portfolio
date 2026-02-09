import { AnimatedSection } from "@/components/public/animated-section";
import type { Translations } from "@/lib/i18n";
import type { LocalizedSkillCategory } from "@/lib/portfolio-data";

export function SkillsSection({
  categories,
  t,
}: {
  categories: LocalizedSkillCategory[];
  t: Pick<Translations, "skills">;
}) {
  const totalSkills = categories.reduce((sum, category) => sum + category.skills.length, 0);
  const directoryLabel =
    categories.length === 1 ? t.skills.directorySingular : t.skills.directoryPlural;
  const fileLabel = totalSkills === 1 ? t.skills.fileSingular : t.skills.filePlural;

  return (
    <AnimatedSection id="skills" className="space-y-6 py-14">
      <h2 className="terminal-heading text-2xl font-semibold tracking-tight text-foreground">
        <span className="heading-prefix" aria-hidden="true">{"// "}</span>{t.skills.title}
      </h2>
      <div className="terminal-card card-3d-hover rounded-lg bg-[var(--card)] p-5 font-mono">
        <p className="text-xs text-terminal-dim">
          <span className="text-terminal-green">shawn_nabizada@portfolio</span>
          <span className="text-terminal-dim">:</span>
          <span className="text-terminal-cyan">~</span>
          <span className="text-terminal-dim">$ </span>
          {t.skills.treeCommand}
        </p>
        <div className="mt-3 space-y-0 text-sm">
          <p className="whitespace-pre text-terminal-cyan">{t.skills.rootDirectory}</p>
          {categories.map((category, catIdx) => {
            const isLastCategory = catIdx === categories.length - 1;
            const catConnector = isLastCategory ? "└── " : "├── ";
            const childPrefix = isLastCategory ? "    " : "│   ";
            const categorySlug = category.name.toLowerCase().replace(/\s+/g, "-");

            return (
              <div key={category.id}>
                <p className="whitespace-pre text-muted-foreground">
                  <span className="text-terminal-border" aria-hidden="true">{catConnector}</span>
                  <span className="text-terminal-cyan">{categorySlug}/</span>
                </p>
                {category.skills.map((skill, skillIdx) => {
                  const isLastSkill = skillIdx === category.skills.length - 1;
                  const skillConnector = isLastSkill ? "└── " : "├── ";

                  return (
                    <p key={skill.id} className="whitespace-pre text-muted-foreground">
                      <span className="text-terminal-border" aria-hidden="true">
                        {childPrefix}{skillConnector}
                      </span>
                      {skill.name}
                    </p>
                  );
                })}
              </div>
            );
          })}
          <p className="mt-2 text-xs text-terminal-dim">
            {categories.length} {directoryLabel}, {totalSkills} {fileLabel}
          </p>
        </div>
      </div>
    </AnimatedSection>
  );
}
