"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { SocialLink } from "@/lib/types/database";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SOCIAL_PRESETS,
  type SocialPresetKey,
  getSocialPreset,
  inferSocialPresetKey,
  normalizeSocialUrl,
} from "@/lib/social-presets";
import { getSocialIconByPreset } from "@/lib/social-icons";

interface FormData {
  preset: SocialPresetKey | "";
  url: string;
  order: number;
}

const initialForm: FormData = {
  preset: "",
  url: "",
  order: 0,
};

export default function AdminSocialLinksPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);

  const [items, setItems] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<SocialLink | null>(null);
  const [form, setForm] = useState<FormData>(initialForm);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchJson<SocialLink[]>("/api/social-links");
      setItems(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  }, [t.common.errorOccurred]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingItem(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (item: SocialLink) => {
    const preset = inferSocialPresetKey({
      icon: item.icon,
      platform: item.platform,
      url: item.url,
    });

    setEditingItem(item);
    setForm({
      preset: preset ?? "",
      url: item.url,
      order: item.order,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.preset) {
      toast.error(t.socialLinks.invalidPreset);
      return;
    }

    const normalizedUrl = normalizeSocialUrl(form.url);
    if (!normalizedUrl) {
      toast.error(t.socialLinks.invalidUrl);
      return;
    }

    const payload = {
      preset: form.preset,
      url: normalizedUrl,
      order: form.order,
    };

    try {
      if (editingItem) {
        await fetchMutation(`/api/social-links/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchMutation("/api/social-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      toast.success(t.common.savedSuccessfully);
      setDialogOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await fetchMutation(`/api/social-links/${deleteId}`, { method: "DELETE" });
      toast.success(t.common.deletedSuccessfully);
      setDeleteId(null);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.socialLinks.title}</h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t.socialLinks.addLink}
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.common.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const presetKey = inferSocialPresetKey({
              icon: item.icon,
              platform: item.platform,
              url: item.url,
            });
            const preset = presetKey ? getSocialPreset(presetKey) : null;
            const Icon = getSocialIconByPreset(presetKey);

            return (
              <Card key={item.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4" />
                      {preset?.label ?? item.platform}
                    </CardTitle>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-muted-foreground underline"
                    >
                      {item.url}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t.socialLinks.editLink : t.socialLinks.addLink}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.socialLinks.preset}</Label>
              <Select
                value={form.preset || undefined}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, preset: value as SocialPresetKey }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.socialLinks.selectPreset} />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_PRESETS.map((preset) => (
                    <SelectItem key={preset.key} value={preset.key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingItem && !form.preset ? (
                <p className="text-xs text-muted-foreground">
                  {t.socialLinks.legacyCustomNotice}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t.socialLinks.url}</Label>
              <Input
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.common.order}</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order: Number(e.target.value) || 0 }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={save}>{t.common.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.areYouSure}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.cannotBeUndone}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
