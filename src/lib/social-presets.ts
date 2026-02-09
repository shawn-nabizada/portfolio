export type SocialPresetKey =
  | "linkedin"
  | "github"
  | "x"
  | "instagram"
  | "youtube"
  | "facebook"
  | "website";

export interface SocialPreset {
  key: SocialPresetKey;
  label: string;
  aliases: string[];
}

export const SOCIAL_PRESETS: readonly SocialPreset[] = [
  {
    key: "linkedin",
    label: "LinkedIn",
    aliases: ["linkedin"],
  },
  {
    key: "github",
    label: "GitHub",
    aliases: ["github"],
  },
  {
    key: "x",
    label: "X",
    aliases: ["x", "twitter", "xtwitter"],
  },
  {
    key: "instagram",
    label: "Instagram",
    aliases: ["instagram"],
  },
  {
    key: "youtube",
    label: "YouTube",
    aliases: ["youtube", "youtu"],
  },
  {
    key: "facebook",
    label: "Facebook",
    aliases: ["facebook", "fb"],
  },
  {
    key: "website",
    label: "Website",
    aliases: ["website", "site", "portfolio", "web"],
  },
] as const;

const presetByKey = new Map<SocialPresetKey, SocialPreset>(
  SOCIAL_PRESETS.map((preset) => [preset.key, preset])
);

function normalizeCandidate(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const aliasToPresetKey = new Map<string, SocialPresetKey>(
  SOCIAL_PRESETS.flatMap((preset) => {
    const values = [preset.key, preset.label, ...preset.aliases].map((value) =>
      normalizeCandidate(value)
    );
    return values.map((value) => [value, preset.key] as const);
  })
);

const URL_PROTOCOL_RE = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

export function isSocialPresetKey(value: unknown): value is SocialPresetKey {
  return typeof value === "string" && presetByKey.has(value as SocialPresetKey);
}

export function getSocialPreset(key: SocialPresetKey) {
  return presetByKey.get(key) ?? null;
}

export function normalizeSocialUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withScheme = URL_PROTOCOL_RE.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function inferSocialPresetKey({
  icon,
  platform,
  url,
}: {
  icon?: string | null;
  platform?: string | null;
  url?: string | null;
}): SocialPresetKey | null {
  if (icon) {
    const iconCandidate = aliasToPresetKey.get(normalizeCandidate(icon));
    if (iconCandidate) return iconCandidate;
  }

  if (platform) {
    const platformCandidate = aliasToPresetKey.get(normalizeCandidate(platform));
    if (platformCandidate) return platformCandidate;
  }

  const normalizedUrl = normalizeSocialUrl(url);
  if (!normalizedUrl) return null;

  try {
    const host = new URL(normalizedUrl).hostname.toLowerCase();

    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("github.com")) return "github";
    if (host.includes("twitter.com") || host.includes("x.com")) return "x";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.com")) return "facebook";
    return "website";
  } catch {
    return null;
  }
}
