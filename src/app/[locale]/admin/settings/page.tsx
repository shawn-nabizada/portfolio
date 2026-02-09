"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface SiteSettings {
  site_title?: { en?: string; fr?: string };
  site_description?: { en?: string; fr?: string };
  hero_title?: { en?: string; fr?: string };
  hero_subtitle?: { en?: string; fr?: string };
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

  const [siteForm, setSiteForm] = useState({
    site_title_en: "",
    site_title_fr: "",
    site_description_en: "",
    site_description_fr: "",
    hero_title_en: "",
    hero_title_fr: "",
    hero_subtitle_en: "",
    hero_subtitle_fr: "",
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

  const saveProfile = async () => {
    try {
      await fetchMutation("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      toast.success(t.common.savedSuccessfully);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const saveSiteSettings = async () => {
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
                    value={profileForm.avatar_url}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, avatar_url: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Button onClick={saveProfile}>{t.common.save}</Button>
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

              <Button onClick={saveSiteSettings}>{t.common.save}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
