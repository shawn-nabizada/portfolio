import type { SocialLink } from "@/lib/types/database";
import { AnimatedSection } from "@/components/public/animated-section";
import { getSocialIconByPreset } from "@/lib/social-icons";
import { getSocialPreset, inferSocialPresetKey, normalizeSocialUrl } from "@/lib/social-presets";

export function SocialLinksSection({ links }: { links: SocialLink[] }) {
  const visibleLinks = links
    .map((link) => {
      const normalizedUrl = normalizeSocialUrl(link.url);
      if (!normalizedUrl) return null;

      const presetKey = inferSocialPresetKey({
        icon: link.icon,
        platform: link.platform,
        url: normalizedUrl,
      });
      const preset = presetKey ? getSocialPreset(presetKey) : null;
      const Icon = getSocialIconByPreset(presetKey);

      return {
        id: link.id,
        url: normalizedUrl,
        label: preset?.label ?? link.platform,
        Icon,
      };
    })
    .filter((link): link is NonNullable<typeof link> => Boolean(link));

  if (visibleLinks.length === 0) return null;

  return (
    <AnimatedSection className="py-6">
      <div className="flex flex-wrap gap-3">
        {visibleLinks.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            aria-label={link.label}
            title={link.label}
            className="card-3d-hover terminal-card inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:text-terminal-green"
          >
            <link.Icon className="h-4 w-4" />
            <span>{link.label}</span>
          </a>
        ))}
      </div>
    </AnimatedSection>
  );
}
