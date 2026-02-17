"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  GraduationCap,
  MapPin,
  Calendar,
  Loader2,
} from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Education } from "@/lib/types/database";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";
import { BulkActionToolbar } from "@/components/admin/bulk-action-toolbar";
import { MonthYearField } from "@/components/admin/month-year-field";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { DEFAULT_PAGE_SIZE, parsePageQuery } from "@/lib/pagination";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { localizedText, resolvePreviewLanguage } from "@/lib/localized-preview";
import { confirmDiscardChanges } from "@/lib/confirm-discard";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_DIRS = ["asc", "desc"] as const;
type SortDir = (typeof SORT_DIRS)[number];
const TRANSLATION_FILTERS = ["all", "missing_en", "missing_fr", "complete"] as const;
type TranslationFilter = (typeof TRANSLATION_FILTERS)[number];

// ─── Education Dialog ───────────────────────────────────────────────────
interface EducationFormData {
  institution: string;
  degree_en: string;
  degree_fr: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  order: number;
}

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function resolveSortDir(value: string | null): SortDir {
  if (value && SORT_DIRS.includes(value as SortDir)) {
    return value as SortDir;
  }
  return "asc";
}

function resolveTranslationFilter(value: string | null): TranslationFilter {
  if (value && TRANSLATION_FILTERS.includes(value as TranslationFilter)) {
    return value as TranslationFilter;
  }
  return "all";
}

function EducationDialog({
  open,
  onOpenChange,
  education,
  onSave,
  locale,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  education: Education | null;
  onSave: (data: EducationFormData) => Promise<void>;
  locale: Locale;
  t: ReturnType<typeof getTranslations>;
}) {
  const [form, setForm] = useState<EducationFormData>({
    institution: "",
    degree_en: "",
    degree_fr: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState("");

  useEffect(() => {
    const nextForm: EducationFormData = education
      ? {
          institution: education.institution,
          degree_en: education.degree_en,
          degree_fr: education.degree_fr,
          location: education.location || "",
          start_date: toMonthInputValue(education.start_date),
          end_date: toMonthInputValue(education.end_date),
          is_current: !education.end_date,
          order: education.order,
        }
      : {
          institution: "",
          degree_en: "",
          degree_fr: "",
          location: "",
          start_date: "",
          end_date: "",
          is_current: false,
          order: 0,
        };

    setForm(nextForm);
    setInitialSnapshot(JSON.stringify(nextForm));
    setShowValidation(false);
  }, [education, open]);

  const isDirty = JSON.stringify(form) !== initialSnapshot;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty && !confirmDiscardChanges(locale)) {
      return;
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    if (!form.start_date) {
      toast.error(
        locale === "fr"
          ? "La date de début est requise."
          : "Start date is required."
      );
      return;
    }

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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {education
              ? t.education.editEducation
              : t.education.addEducation}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Institution */}
          <div className="space-y-2">
            <Label htmlFor="edu-institution">{t.education.institution}</Label>
            <Input
              id="edu-institution"
              value={form.institution}
              onChange={(e) =>
                setForm((f) => ({ ...f, institution: e.target.value }))
              }
              required
            />
          </div>

          {/* Degree EN */}
          <div className="space-y-2">
            <Label htmlFor="edu-degree-en">
              {t.education.degree} ({t.common.english})
            </Label>
            <Input
              id="edu-degree-en"
              value={form.degree_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, degree_en: e.target.value }))
              }
              required
            />
          </div>

          {/* Degree FR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edu-degree-fr">
                {t.education.degree} ({t.common.french})
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm((f) => ({ ...f, degree_fr: f.degree_en }))}
              >
                {locale === "fr" ? "Copier EN -> FR" : "Copy EN -> FR"}
              </Button>
            </div>
            <Input
              id="edu-degree-fr"
              value={form.degree_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, degree_fr: e.target.value }))
              }
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="edu-location">{t.education.location}</Label>
            <Input
              id="edu-location"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </div>

          <MonthYearField
            id="edu-start-date"
            label={t.education.startDate}
            value={form.start_date}
            onChange={(value) => setForm((f) => ({ ...f, start_date: value }))}
            locale={locale}
            required
          />
          {showValidation && !form.start_date ? (
            <p className="text-sm text-destructive">
              {locale === "fr"
                ? "La date de début est requise."
                : "Start date is required."}
            </p>
          ) : null}

          {/* Currently Studying */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edu-current"
              checked={form.is_current}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  is_current: checked === true,
                  end_date: checked === true ? "" : f.end_date,
                }))
              }
            />
            <Label htmlFor="edu-current" className="cursor-pointer">
              {t.education.currentlyStudying}
            </Label>
          </div>

          {/* End Date */}
          {!form.is_current && (
            <MonthYearField
              id="edu-end-date"
              label={t.education.endDate}
              value={form.end_date}
              onChange={(value) => setForm((f) => ({ ...f, end_date: value }))}
              locale={locale}
              allowClear
            />
          )}

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="edu-order">{t.common.order}</Label>
            <Input
              id="edu-order"
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

          <DialogFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={saving || !form.start_date}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : education ? (
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
export default function AdminEducationPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);
  const pageFromUrl = parsePageQuery(searchParams.get("page"));
  const queryFromUrl = searchParams.get("q") ?? "";
  const sortDirFromUrl = resolveSortDir(searchParams.get("sortDir"));
  const translationFromUrl = resolveTranslationFilter(searchParams.get("translation"));
  const previewLangFromUrl =
    searchParams.get("previewLang") === "fr" ? "fr" : resolvePreviewLanguage(locale);

  // Data
  const [educations, setEducations] = useState<Education[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(pageFromUrl);
  const [sortDir, setSortDir] = useState<SortDir>(sortDirFromUrl);
  const [translationFilter, setTranslationFilter] = useState<TranslationFilter>(
    translationFromUrl
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [previewLang, setPreviewLang] = useState<Locale>(previewLangFromUrl);
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEducation, setEditingEducation] =
    useState<Education | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async (activePage: number) => {
    setIsLoading(true);
    try {
      const endpointParams = new URLSearchParams();
      endpointParams.set("page", String(activePage));
      endpointParams.set("pageSize", String(PAGE_SIZE));
      endpointParams.set("q", searchQuery.trim());
      endpointParams.set("sortBy", "order");
      endpointParams.set("sortDir", sortDir);
      endpointParams.set("translation", translationFilter);
      const data = await fetchJson<PaginatedResponse<Education>>(
        `/api/education?${endpointParams.toString()}`
      );
      setEducations(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.total);
      return data;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load education data"
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, sortDir, translationFilter]);

  useEffect(() => {
    setPage(pageFromUrl);
  }, [pageFromUrl]);

  useEffect(() => {
    setSearchQuery(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    setSortDir(sortDirFromUrl);
  }, [sortDirFromUrl]);

  useEffect(() => {
    setTranslationFilter(translationFromUrl);
  }, [translationFromUrl]);

  useEffect(() => {
    setPreviewLang(previewLangFromUrl);
  }, [previewLangFromUrl]);

  useEffect(() => {
    fetchData(page);
  }, [fetchData, page]);

  useEffect(() => {
    setSelectedIds((current) => {
      const availableIds = new Set(educations.map((item) => item.id));
      return new Set(Array.from(current).filter((id) => availableIds.has(id)));
    });
  }, [educations]);

  const replaceState = (updates: {
    page?: number;
    q?: string;
    sortDir?: SortDir;
    translation?: TranslationFilter;
    previewLang?: Locale;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(updates.page ?? page));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("q", updates.q ?? searchQuery.trim());
    params.set("sortDir", updates.sortDir ?? sortDir);
    params.set("translation", updates.translation ?? translationFilter);
    params.set("previewLang", updates.previewLang ?? previewLang);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updatePage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
    replaceState({ page: boundedPage });
    setPage(boundedPage);
  };

  const updateQuery = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    replaceState({ q: value.trim(), page: 1 });
  };

  const updateSortDir = (value: SortDir) => {
    setSortDir(value);
    setPage(1);
    replaceState({ sortDir: value, page: 1 });
  };

  const updateTranslationFilter = (value: TranslationFilter) => {
    setTranslationFilter(value);
    setPage(1);
    replaceState({ translation: value, page: 1 });
  };

  const updatePreviewLang = (value: Locale) => {
    setPreviewLang(value);
    replaceState({ previewLang: value });
  };

  const refreshAfterMutation = async () => {
    const data = await fetchData(page);
    if (data && data.items.length === 0 && data.total > 0 && page > 1) {
      updatePage(page - 1);
    }
  };

  const missingTranslationLabel =
    locale === "fr"
      ? previewLang === "fr"
        ? "FR manquant"
        : "EN manquant"
      : previewLang === "fr"
        ? "FR missing"
        : "EN missing";

  const allSelected = useMemo(
    () => educations.length > 0 && educations.every((item) => selectedIds.has(item.id)),
    [educations, selectedIds]
  );

  const translationCounts = useMemo(() => {
    let missingEn = 0;
    let missingFr = 0;
    let complete = 0;
    for (const item of educations) {
      const hasEn = Boolean(item.degree_en?.trim());
      const hasFr = Boolean(item.degree_fr?.trim());
      if (!hasEn) missingEn += 1;
      if (!hasFr) missingFr += 1;
      if (hasEn && hasFr) complete += 1;
    }
    return { missingEn, missingFr, complete };
  }, [educations]);

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(() => {
      if (!checked) return new Set();
      return new Set(educations.map((item) => item.id));
    });
  };

  // ── CRUD ──────────────────────────────────────────────────────────
  const handleSave = async (data: EducationFormData) => {
    const payload = {
      institution: data.institution,
      degree_en: data.degree_en,
      degree_fr: data.degree_fr,
      location: data.location,
      start_date: toIsoMonthDate(data.start_date),
      end_date: data.is_current ? null : toIsoMonthDate(data.end_date) || null,
      order: data.order,
    };

    try {
      if (editingEducation) {
        await fetchMutation(`/api/education/${editingEducation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchMutation("/api/education", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      toast.success(t.common.savedSuccessfully);
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
      throw error;
    }
  };

  const openAdd = () => {
    setEditingEducation(null);
    setDialogOpen(true);
  };

  const openEdit = (edu: Education) => {
    setEditingEducation(edu);
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const duplicateEducation = async (id: string) => {
    try {
      await fetchMutation(`/api/education/${id}/duplicate`, { method: "POST" });
      toast.success(t.common.savedSuccessfully);
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const applyBulkAction = async () => {
    if (bulkAction !== "delete" || selectedIds.size === 0) return;
    if (
      !window.confirm(
        locale === "fr"
          ? "Supprimer les éléments sélectionnés ?"
          : "Delete selected entries?"
      )
    ) {
      return;
    }

    try {
      await fetchMutation("/api/education/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
      });
      toast.success(t.common.deletedSuccessfully);
      setSelectedIds(new Set());
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await fetchMutation(`/api/education/${deleteTargetId}`, { method: "DELETE" });
      toast.success(t.common.deletedSuccessfully);
      setDeleteTargetId(null);
      await refreshAfterMutation();
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {t.education.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={
              locale === "fr"
                ? "Rechercher des formations..."
                : "Search education..."
            }
            className="w-56"
          />
          <Select
            value={translationFilter}
            onValueChange={(value) => updateTranslationFilter(value as TranslationFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{locale === "fr" ? "Toutes traductions" : "All translations"}</SelectItem>
              <SelectItem value="missing_en">{locale === "fr" ? "EN manquant" : "Missing EN"}</SelectItem>
              <SelectItem value="missing_fr">{locale === "fr" ? "FR manquant" : "Missing FR"}</SelectItem>
              <SelectItem value="complete">{locale === "fr" ? "Complet" : "Complete"}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortDir} onValueChange={(value) => updateSortDir(value as SortDir)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">{locale === "fr" ? "Ordre croissant" : "Order ascending"}</SelectItem>
              <SelectItem value="desc">{locale === "fr" ? "Ordre décroissant" : "Order descending"}</SelectItem>
            </SelectContent>
          </Select>
          <AdminLanguageToggle
            value={previewLang}
            onChange={updatePreviewLang}
            labels={{ english: t.common.english, french: t.common.french }}
          />
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {t.education.addEducation}
          </Button>
        </div>
      </div>

      {/* Education List */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{locale === "fr" ? "EN manquant" : "Missing EN"}: {translationCounts.missingEn}</Badge>
        <Badge variant="outline">{locale === "fr" ? "FR manquant" : "Missing FR"}: {translationCounts.missingFr}</Badge>
        <Badge variant="outline">{locale === "fr" ? "Complet" : "Complete"}: {translationCounts.complete}</Badge>
      </div>

      {educations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.common.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <BulkActionToolbar
            allSelected={allSelected}
            pageCount={educations.length}
            selectedCount={selectedIds.size}
            actionValue={bulkAction}
            actions={[{ value: "delete", label: locale === "fr" ? "Supprimer" : "Delete" }]}
            labels={{
              selectAll: locale === "fr" ? "Tout sélectionner (page)" : "Select all (page)",
              selected: locale === "fr" ? "Sélectionnés" : "Selected",
              actionPlaceholder: locale === "fr" ? "Action groupée" : "Bulk action",
              apply: locale === "fr" ? "Appliquer" : "Apply",
            }}
            onToggleAll={toggleAll}
            onActionChange={setBulkAction}
            onApply={applyBulkAction}
          />
          {educations.map((edu) => {
            const degree = localizedText(previewLang, edu.degree_en, edu.degree_fr);
            return (
              <Card key={edu.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.has(edu.id)}
                          onCheckedChange={(checked) =>
                            toggleSelection(edu.id, checked === true)
                          }
                        />
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {degree}
                        {(previewLang === "fr"
                          ? !edu.degree_fr?.trim()
                          : !edu.degree_en?.trim()) && (
                          <Badge variant="outline" className="text-[10px]">
                            {missingTranslationLabel}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {edu.institution}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => duplicateEducation(edu.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="sr-only">Duplicate</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(edu)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">{t.common.edit}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openDelete(edu.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      <span className="sr-only">{t.common.delete}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {edu.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {edu.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(edu.start_date)} &ndash;{" "}
                      {edu.end_date
                        ? formatDate(edu.end_date)
                        : t.education.present}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.common.order}: {edu.order}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            isLoading={isLoading}
            onPageChange={updatePage}
            labels={{
              previous: t.common.previousPage,
              next: t.common.nextPage,
              page: t.common.page,
              of: t.common.of,
            }}
          />
        </div>
      )}

      {/* ─── Dialogs ───────────────────────────────────────────────── */}
      <EducationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        education={editingEducation}
        onSave={handleSave}
        locale={locale as Locale}
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
