"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Briefcase,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Experience } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { toast } from "sonner";

// ─── Experience Dialog ──────────────────────────────────────────────────
interface ExperienceFormData {
  company: string;
  position_en: string;
  position_fr: string;
  description_en: string;
  description_fr: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  order: number;
}

function ExperienceDialog({
  open,
  onOpenChange,
  experience,
  onSave,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experience: Experience | null;
  onSave: (data: ExperienceFormData) => Promise<void>;
  t: ReturnType<typeof getTranslations>;
}) {
  const [form, setForm] = useState<ExperienceFormData>({
    company: "",
    position_en: "",
    position_fr: "",
    description_en: "",
    description_fr: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (experience) {
      setForm({
        company: experience.company,
        position_en: experience.position_en,
        position_fr: experience.position_fr,
        description_en: experience.description_en || "",
        description_fr: experience.description_fr || "",
        location: experience.location || "",
        start_date: toMonthInputValue(experience.start_date),
        end_date: toMonthInputValue(experience.end_date),
        is_current: !experience.end_date,
        order: experience.order,
      });
    } else {
      setForm({
        company: "",
        position_en: "",
        position_fr: "",
        description_en: "",
        description_fr: "",
        location: "",
        start_date: "",
        end_date: "",
        is_current: false,
        order: 0,
      });
    }
  }, [experience, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onOpenChange(false);
    } catch {
      // Keep dialog open on failure.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {experience
              ? t.experience.editExperience
              : t.experience.addExperience}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="exp-company">{t.experience.company}</Label>
            <Input
              id="exp-company"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
              required
            />
          </div>

          {/* Position EN */}
          <div className="space-y-2">
            <Label htmlFor="exp-position-en">
              {t.experience.position} ({t.common.english})
            </Label>
            <Input
              id="exp-position-en"
              value={form.position_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, position_en: e.target.value }))
              }
              required
            />
          </div>

          {/* Position FR */}
          <div className="space-y-2">
            <Label htmlFor="exp-position-fr">
              {t.experience.position} ({t.common.french})
            </Label>
            <Input
              id="exp-position-fr"
              value={form.position_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, position_fr: e.target.value }))
              }
              required
            />
          </div>

          {/* Description EN */}
          <div className="space-y-2">
            <Label htmlFor="exp-desc-en">
              {t.common.description} ({t.common.english})
            </Label>
            <Textarea
              id="exp-desc-en"
              value={form.description_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, description_en: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Description FR */}
          <div className="space-y-2">
            <Label htmlFor="exp-desc-fr">
              {t.common.description} ({t.common.french})
            </Label>
            <Textarea
              id="exp-desc-fr"
              value={form.description_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, description_fr: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="exp-location">{t.experience.location}</Label>
            <Input
              id="exp-location"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="exp-start-date">{t.experience.startDate}</Label>
            <Input
              id="exp-start-date"
              type="month"
              value={form.start_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, start_date: e.target.value }))
              }
              required
            />
          </div>

          {/* Current Position */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exp-current"
              checked={form.is_current}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  is_current: checked === true,
                  end_date: checked === true ? "" : f.end_date,
                }))
              }
            />
            <Label htmlFor="exp-current" className="cursor-pointer">
              {t.experience.currentPosition}
            </Label>
          </div>

          {/* End Date */}
          {!form.is_current && (
            <div className="space-y-2">
              <Label htmlFor="exp-end-date">{t.experience.endDate}</Label>
              <Input
                id="exp-end-date"
                type="month"
                value={form.end_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
              />
            </div>
          )}

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="exp-order">{t.common.order}</Label>
            <Input
              id="exp-order"
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  order: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : experience ? (
                t.common.update
              ) : (
                t.common.create
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation ────────────────────────────────────────────────
function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  t: ReturnType<typeof getTranslations>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.common.areYouSure}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.common.cannotBeUndone}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            variant="destructive"
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {t.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function toMonthInputValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 7);
}

function toIsoMonthDate(value: string) {
  if (!value) return "";
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}

// ─── Main Page ──────────────────────────────────────────────────────────
export default function AdminExperiencePage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);

  // Data
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExperience, setEditingExperience] =
    useState<Experience | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const data = await fetchJson<Experience[]>("/api/experience");
      setExperiences(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load experience data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── CRUD ──────────────────────────────────────────────────────────
  const handleSave = async (data: ExperienceFormData) => {
    const payload = {
      company: data.company,
      position_en: data.position_en,
      position_fr: data.position_fr,
      description_en: data.description_en,
      description_fr: data.description_fr,
      location: data.location,
      start_date: toIsoMonthDate(data.start_date),
      end_date: data.is_current ? null : toIsoMonthDate(data.end_date) || null,
      order: data.order,
    };

    try {
      if (editingExperience) {
        await fetchMutation(`/api/experience/${editingExperience.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchMutation("/api/experience", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      toast.success(t.common.savedSuccessfully);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
      throw error;
    }
  };

  const openAdd = () => {
    setEditingExperience(null);
    setDialogOpen(true);
  };

  const openEdit = (exp: Experience) => {
    setEditingExperience(exp);
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await fetchMutation(`/api/experience/${deleteTargetId}`, { method: "DELETE" });
      toast.success(t.common.deletedSuccessfully);
      setDeleteTargetId(null);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {t.experience.title}
        </h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t.experience.addExperience}
        </Button>
      </div>

      {/* Experience List */}
      {experiences.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.common.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiences.map((exp) => (
            <Card key={exp.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      {exp.position_en}
                    </div>
                  </CardTitle>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {exp.company}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(exp)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">{t.common.edit}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openDelete(exp.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    <span className="sr-only">{t.common.delete}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {exp.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {exp.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(exp.start_date)} &ndash;{" "}
                    {exp.end_date
                      ? formatDate(exp.end_date)
                      : t.experience.present}
                  </span>
                </div>
                {exp.description_en && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {exp.description_en}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {t.common.order}: {exp.order}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Dialogs ───────────────────────────────────────────────── */}
      <ExperienceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        experience={editingExperience}
        onSave={handleSave}
        t={t}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        t={t}
      />
    </div>
  );
}
