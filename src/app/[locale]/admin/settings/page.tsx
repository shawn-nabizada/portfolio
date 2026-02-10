"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Profile } from "@/lib/types/database";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface SiteSettings {
  site_title?: { en?: string; fr?: string };
  site_description?: { en?: string; fr?: string };
  hero_title?: { en?: string; fr?: string };
  hero_subtitle?: { en?: string; fr?: string };
  contact_honeypot_enabled?: boolean;
  contact_honeypot_visible?: boolean;
  dvd_bounce_icon_size?: number;
  dvd_bounce_icon_opacity?: number;
  dvd_bounce_trail_enabled?: boolean;
  dvd_bounce_trail_density?: number;
  dvd_bounce_trail_opacity?: number;
  dvd_bounce_trail_length?: number;
}

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNumberSetting(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export default function AdminSettingsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    headline_en: "",
    headline_fr: "",
    bio_en: "",
    bio_fr: "",
    location: "",
    avatar_url: "",
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [siteForm, setSiteForm] = useState({
    site_title_en: "",
    site_title_fr: "",
    site_description_en: "",
    site_description_fr: "",
    hero_title_en: "",
    hero_title_fr: "",
    hero_subtitle_en: "",
    hero_subtitle_fr: "",
    contact_honeypot_enabled: false,
    contact_honeypot_visible: false,
    dvd_bounce_icon_size: "44",
    dvd_bounce_icon_opacity: "0.2",
    dvd_bounce_trail_enabled: true,
    dvd_bounce_trail_density: "1",
    dvd_bounce_trail_opacity: "1",
    dvd_bounce_trail_length: "1",
  });

  const fetchData = useCallback(async () => {
    try {
      const [profileData, settingsData] = await Promise.all([
        fetchJson<Profile | null>("/api/profile"),
        fetchJson<SiteSettings>("/api/settings"),
      ]);

      setProfile(profileData);

      setProfileForm({
        full_name: profileData?.full_name || "",
        headline_en: profileData?.headline_en || "",
        headline_fr: profileData?.headline_fr || "",
        bio_en: profileData?.bio_en || "",
        bio_fr: profileData?.bio_fr || "",
        location: profileData?.location || "",
        avatar_url: profileData?.avatar_url || "",
      });

      setSiteForm({
        site_title_en: settingsData.site_title?.en || "",
        site_title_fr: settingsData.site_title?.fr || "",
        site_description_en: settingsData.site_description?.en || "",
        site_description_fr: settingsData.site_description?.fr || "",
        hero_title_en: settingsData.hero_title?.en || "",
        hero_title_fr: settingsData.hero_title?.fr || "",
        hero_subtitle_en: settingsData.hero_subtitle?.en || "",
        hero_subtitle_fr: settingsData.hero_subtitle?.fr || "",
        contact_honeypot_enabled: settingsData.contact_honeypot_enabled === true,
        contact_honeypot_visible: settingsData.contact_honeypot_visible === true,
        dvd_bounce_icon_size: String(
          clampNumber(parseNumberSetting(settingsData.dvd_bounce_icon_size, 44), 20, 128)
        ),
        dvd_bounce_icon_opacity: String(
          clampNumber(parseNumberSetting(settingsData.dvd_bounce_icon_opacity, 0.2), 0.02, 0.95)
        ),
        dvd_bounce_trail_enabled: settingsData.dvd_bounce_trail_enabled !== false,
        dvd_bounce_trail_density: String(
          clampNumber(parseNumberSetting(settingsData.dvd_bounce_trail_density, 1), 0.1, 3)
        ),
        dvd_bounce_trail_opacity: String(
          clampNumber(parseNumberSetting(settingsData.dvd_bounce_trail_opacity, 1), 0, 3)
        ),
        dvd_bounce_trail_length: String(
          clampNumber(parseNumberSetting(settingsData.dvd_bounce_trail_length, 1), 0.25, 3)
        ),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  }, [t.common.errorOccurred]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasProfile = useMemo(() => Boolean(profile), [profile]);

  const avatarValidationError = (file: File) => {
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      return locale === "fr"
        ? "Seuls les fichiers PNG, JPG et WebP sont permis."
        : "Only PNG, JPG, and WebP files are allowed.";
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return locale === "fr"
        ? "L'avatar doit faire 2 Mo ou moins."
        : "Avatar must be 2MB or smaller.";
    }
    return null;
  };

  const uploadAvatarFile = async (file: File, showSuccessToast = true) => {
    const validationError = avatarValidationError(file);
    if (validationError) {
      throw new Error(validationError);
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);

      const updatedProfile = await fetchMutation<Profile>("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      setProfile(updatedProfile);
      setProfileForm((current) => ({
        ...current,
        avatar_url: updatedProfile.avatar_url || "",
      }));
      setAvatarFile(null);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }

      if (showSuccessToast) {
        toast.success(locale === "fr" ? "Avatar téléversé." : "Avatar uploaded.");
      }

      return updatedProfile;
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      let payload = { ...profileForm };
      if (avatarFile) {
        const updatedProfile = await uploadAvatarFile(avatarFile, false);
        payload = { ...payload, avatar_url: updatedProfile.avatar_url || "" };
      }

      await fetchMutation("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(t.common.savedSuccessfully);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    } finally {
      setSavingProfile(false);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) {
      toast.error(locale === "fr" ? "Choisissez une image d'abord." : "Choose an image first.");
      return;
    }

    try {
      await uploadAvatarFile(avatarFile);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const saveSiteSettings = async () => {
    const dvdBounceIconSize = clampNumber(
      Number.parseFloat(siteForm.dvd_bounce_icon_size),
      20,
      128
    );
    const dvdBounceIconOpacity = clampNumber(
      Number.parseFloat(siteForm.dvd_bounce_icon_opacity),
      0.02,
      0.95
    );
    const dvdBounceTrailDensity = clampNumber(
      Number.parseFloat(siteForm.dvd_bounce_trail_density),
      0.1,
      3
    );
    const dvdBounceTrailOpacity = clampNumber(
      Number.parseFloat(siteForm.dvd_bounce_trail_opacity),
      0,
      3
    );
    const dvdBounceTrailLength = clampNumber(
      Number.parseFloat(siteForm.dvd_bounce_trail_length),
      0.25,
      3
    );

    const updates = [
      {
        key: "site_title",
        value: { en: siteForm.site_title_en, fr: siteForm.site_title_fr },
      },
      {
        key: "site_description",
        value: {
          en: siteForm.site_description_en,
          fr: siteForm.site_description_fr,
        },
      },
      {
        key: "hero_title",
        value: { en: siteForm.hero_title_en, fr: siteForm.hero_title_fr },
      },
      {
        key: "hero_subtitle",
        value: { en: siteForm.hero_subtitle_en, fr: siteForm.hero_subtitle_fr },
      },
      {
        key: "contact_honeypot_enabled",
        value: siteForm.contact_honeypot_enabled,
      },
      {
        key: "contact_honeypot_visible",
        value: siteForm.contact_honeypot_visible,
      },
      {
        key: "dvd_bounce_icon_size",
        value: Number.isFinite(dvdBounceIconSize) ? dvdBounceIconSize : 44,
      },
      {
        key: "dvd_bounce_icon_opacity",
        value: Number.isFinite(dvdBounceIconOpacity) ? dvdBounceIconOpacity : 0.2,
      },
      {
        key: "dvd_bounce_trail_enabled",
        value: siteForm.dvd_bounce_trail_enabled,
      },
      {
        key: "dvd_bounce_trail_density",
        value: Number.isFinite(dvdBounceTrailDensity) ? dvdBounceTrailDensity : 1,
      },
      {
        key: "dvd_bounce_trail_opacity",
        value: Number.isFinite(dvdBounceTrailOpacity) ? dvdBounceTrailOpacity : 1,
      },
      {
        key: "dvd_bounce_trail_length",
        value: Number.isFinite(dvdBounceTrailLength) ? dvdBounceTrailLength : 1,
      },
    ];

    try {
      await Promise.all(
        updates.map((entry) =>
          fetchMutation("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          })
        )
      );
      toast.success(t.common.savedSuccessfully);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.settings.title}</h1>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">{t.settings.profile}</TabsTrigger>
          <TabsTrigger value="site">{t.settings.site}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.profile}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasProfile && (
                <p className="text-sm text-muted-foreground">
                  Profile does not exist yet. Saving will create it.
                </p>
              )}

              <div className="space-y-2">
                <Label>{t.settings.fullName}</Label>
                <Input
                  value={profileForm.full_name}
                  onChange={(e) =>
                    setProfileForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t.settings.headline} ({t.common.english})
                  </Label>
                  <Input
                    value={profileForm.headline_en}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, headline_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t.settings.headline} ({t.common.french})
                  </Label>
                  <Input
                    value={profileForm.headline_fr}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, headline_fr: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t.settings.bio} ({t.common.english})
                  </Label>
                  <Textarea
                    value={profileForm.bio_en}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, bio_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t.settings.bio} ({t.common.french})
                  </Label>
                  <Textarea
                    value={profileForm.bio_fr}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, bio_fr: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t.settings.location}</Label>
                  <Input
                    value={profileForm.location}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.settings.avatar}</Label>
                  <Input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {locale === "fr"
                      ? "Formats permis: PNG, JPG, WebP (2 Mo max)"
                      : "Allowed formats: PNG, JPG, WebP (max 2MB)"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={uploadAvatar}
                    disabled={avatarUploading || savingProfile || !avatarFile}
                  >
                    {avatarUploading
                      ? locale === "fr"
                        ? "Téléversement..."
                        : "Uploading..."
                      : locale === "fr"
                        ? "Téléverser l'avatar"
                        : "Upload Avatar"}
                  </Button>
                  {avatarFile ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{avatarFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {locale === "fr"
                          ? "Cette image sera aussi téléversée quand vous cliquez sur Enregistrer."
                          : "This image will also be uploaded when you click Save."}
                      </p>
                    </div>
                  ) : null}
                  {profileForm.avatar_url ? (
                    <div className="pt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profileForm.avatar_url}
                        alt={locale === "fr" ? "Aperçu de l'avatar" : "Avatar preview"}
                        className="h-16 w-16 rounded-full border border-border object-cover"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {locale === "fr" ? "Aucun avatar téléversé." : "No avatar uploaded yet."}
                    </p>
                  )}
                </div>
              </div>

              <Button onClick={saveProfile} disabled={savingProfile || avatarUploading}>
                {savingProfile ? t.common.saving : t.common.save}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.site}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t.settings.siteTitle} ({t.common.english})
                  </Label>
                  <Input
                    value={siteForm.site_title_en}
                    onChange={(e) =>
                      setSiteForm((f) => ({ ...f, site_title_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t.settings.siteTitle} ({t.common.french})
                  </Label>
                  <Input
                    value={siteForm.site_title_fr}
                    onChange={(e) =>
                      setSiteForm((f) => ({ ...f, site_title_fr: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t.settings.siteDescription} ({t.common.english})
                  </Label>
                  <Textarea
                    value={siteForm.site_description_en}
                    onChange={(e) =>
                      setSiteForm((f) => ({ ...f, site_description_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t.settings.siteDescription} ({t.common.french})
                  </Label>
                  <Textarea
                    value={siteForm.site_description_fr}
                    onChange={(e) =>
                      setSiteForm((f) => ({ ...f, site_description_fr: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t.settings.heroTitle} ({t.common.english})
                  </Label>
                  <Input
                    value={siteForm.hero_title_en}
                    onChange={(e) =>
                      setSiteForm((f) => ({ ...f, hero_title_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t.settings.heroTitle} ({t.common.french})
                  </Label>
                  <Input
                    value={siteForm.hero_title_fr}
                    onChange={(e) =>
                      setSiteForm((f) => ({ ...f, hero_title_fr: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    {t.settings.heroSubtitle} ({t.common.english})
                  </Label>
                  <Input
                    value={siteForm.hero_subtitle_en}
                    onChange={(e) =>
                      setSiteForm((f) => ({ ...f, hero_subtitle_en: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {t.settings.heroSubtitle} ({t.common.french})
                  </Label>
                  <Input
                    value={siteForm.hero_subtitle_fr}
                    onChange={(e) =>
                      setSiteForm((f) => ({ ...f, hero_subtitle_fr: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-border p-4">
                <p className="text-sm font-medium">{t.settings.contactSpamProtection}</p>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contact-honeypot-enabled"
                    checked={siteForm.contact_honeypot_enabled}
                    onCheckedChange={(checked) =>
                      setSiteForm((f) => ({
                        ...f,
                        contact_honeypot_enabled: checked === true,
                        contact_honeypot_visible:
                          checked === true ? f.contact_honeypot_visible : false,
                      }))
                    }
                  />
                  <Label htmlFor="contact-honeypot-enabled" className="cursor-pointer">
                    {t.settings.contactHoneypotEnabled}
                  </Label>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="contact-honeypot-visible"
                      checked={siteForm.contact_honeypot_visible}
                      disabled={!siteForm.contact_honeypot_enabled}
                      onCheckedChange={(checked) =>
                        setSiteForm((f) => ({
                          ...f,
                          contact_honeypot_visible:
                            f.contact_honeypot_enabled && checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor="contact-honeypot-visible"
                      className={`cursor-pointer ${
                        siteForm.contact_honeypot_enabled ? "" : "opacity-60"
                      }`}
                    >
                      {t.settings.contactHoneypotVisible}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.settings.contactHoneypotVisibleHint}
                  </p>
                </div>
              </div>

              <div className="space-y-4 rounded-md border border-border p-4">
                <p className="text-sm font-medium">{t.settings.dvdBounceEffects}</p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dvd-bounce-icon-size">{t.settings.dvdBounceIconSize}</Label>
                    <Input
                      id="dvd-bounce-icon-size"
                      type="number"
                      min={20}
                      max={128}
                      step={1}
                      value={siteForm.dvd_bounce_icon_size}
                      onChange={(e) =>
                        setSiteForm((f) => ({
                          ...f,
                          dvd_bounce_icon_size: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dvd-bounce-icon-opacity">
                      {t.settings.dvdBounceIconOpacity}
                    </Label>
                    <Input
                      id="dvd-bounce-icon-opacity"
                      type="number"
                      min={0.02}
                      max={0.95}
                      step={0.01}
                      value={siteForm.dvd_bounce_icon_opacity}
                      onChange={(e) =>
                        setSiteForm((f) => ({
                          ...f,
                          dvd_bounce_icon_opacity: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dvd-bounce-trail-enabled"
                      checked={siteForm.dvd_bounce_trail_enabled}
                      onCheckedChange={(checked) =>
                        setSiteForm((f) => ({
                          ...f,
                          dvd_bounce_trail_enabled: checked === true,
                        }))
                      }
                    />
                    <Label htmlFor="dvd-bounce-trail-enabled" className="cursor-pointer">
                      {t.settings.dvdBounceTrailEnabled}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.settings.dvdBounceTrailHint}</p>
                </div>

                <div
                  className={`grid gap-4 md:grid-cols-3 ${
                    siteForm.dvd_bounce_trail_enabled ? "" : "opacity-60"
                  }`}
                >
                  <div className="space-y-2">
                    <Label htmlFor="dvd-bounce-trail-density">
                      {t.settings.dvdBounceTrailDensity}
                    </Label>
                    <Input
                      id="dvd-bounce-trail-density"
                      type="number"
                      min={0.1}
                      max={3}
                      step={0.1}
                      disabled={!siteForm.dvd_bounce_trail_enabled}
                      value={siteForm.dvd_bounce_trail_density}
                      onChange={(e) =>
                        setSiteForm((f) => ({
                          ...f,
                          dvd_bounce_trail_density: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dvd-bounce-trail-opacity">
                      {t.settings.dvdBounceTrailOpacity}
                    </Label>
                    <Input
                      id="dvd-bounce-trail-opacity"
                      type="number"
                      min={0}
                      max={3}
                      step={0.1}
                      disabled={!siteForm.dvd_bounce_trail_enabled}
                      value={siteForm.dvd_bounce_trail_opacity}
                      onChange={(e) =>
                        setSiteForm((f) => ({
                          ...f,
                          dvd_bounce_trail_opacity: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dvd-bounce-trail-length">
                      {t.settings.dvdBounceTrailLength}
                    </Label>
                    <Input
                      id="dvd-bounce-trail-length"
                      type="number"
                      min={0.25}
                      max={3}
                      step={0.05}
                      disabled={!siteForm.dvd_bounce_trail_enabled}
                      value={siteForm.dvd_bounce_trail_length}
                      onChange={(e) =>
                        setSiteForm((f) => ({
                          ...f,
                          dvd_bounce_trail_length: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Button onClick={saveSiteSettings}>{t.common.save}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
