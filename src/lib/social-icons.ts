import type { LucideIcon } from "lucide-react";
import {
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";
import type { SocialPresetKey } from "@/lib/social-presets";

const ICON_BY_PRESET: Record<SocialPresetKey, LucideIcon> = {
  linkedin: Linkedin,
  github: Github,
  x: Twitter,
  instagram: Instagram,
  youtube: Youtube,
  facebook: Facebook,
  website: Globe,
};

export function getSocialIconByPreset(preset: SocialPresetKey | null): LucideIcon {
  if (!preset) return Globe;
  return ICON_BY_PRESET[preset] ?? Globe;
}
