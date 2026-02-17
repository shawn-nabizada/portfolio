"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  Loader2,
} from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Hobby } from "@/lib/types/database";
import { HOBBY_ICON_OPTIONS, getHobbyIcon } from "@/lib/hobby-icons";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";
import { BulkActionToolbar } from "@/components/admin/bulk-action-toolbar";
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

// ─── Hobby Dialog ───────────────────────────────────────────────────────
interface HobbyFormData {
  name_en: string;
  name_fr: string;
  short_description_en: string;
  short_description_fr: string;
  icon: string;
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

function HobbyDialog({
  open,
  onOpenChange,
  hobby,
  onSave,
  locale,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hobby: Hobby | null;
  onSave: (data: HobbyFormData) => Promise<void>;
  locale: Locale;
  t: ReturnType<typeof getTranslations>;
}) {
  const [form, setForm] = useState<HobbyFormData>({
    name_en: "",
    name_fr: "",
    short_description_en: "",
    short_description_fr: "",
    icon: "",
    order: 0,
  });
  const [iconSearch, setIconSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState("");

  useEffect(() => {
    const nextForm: HobbyFormData = hobby
      ? {
          name_en: hobby.name_en,
          name_fr: hobby.name_fr,
          short_description_en: hobby.short_description_en || "",
          short_description_fr: hobby.short_description_fr || "",
          icon: hobby.icon || "",
          order: hobby.order,
        }
      : {
          name_en: "",
          name_fr: "",
          short_description_en: "",
          short_description_fr: "",
          icon: "",
          order: 0,
        };

    setForm(nextForm);
    setIconSearch(nextForm.icon || "");
    setInitialSnapshot(JSON.stringify(nextForm));
  }, [hobby, open]);

  const isDirty = JSON.stringify(form) !== initialSnapshot;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty && !confirmDiscardChanges(locale)) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const filteredIcons = HOBBY_ICON_OPTIONS.filter((option) => {
    const query = iconSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  });

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
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {hobby ? t.hobbies.editHobby : t.hobbies.addHobby}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name EN */}
          <div className="space-y-2">
            <Label htmlFor="hobby-name-en">
              {t.hobbies.hobbyName} ({t.common.english})
            </Label>
            <Input
              id="hobby-name-en"
              value={form.name_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, name_en: e.target.value }))
              }
              required
            />
          </div>

          {/* Name FR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="hobby-name-fr">
                {t.hobbies.hobbyName} ({t.common.french})
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm((f) => ({ ...f, name_fr: f.name_en }))}
              >
                {locale === "fr" ? "Copier EN -> FR" : "Copy EN -> FR"}
              </Button>
            </div>
            <Input
              id="hobby-name-fr"
              value={form.name_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, name_fr: e.target.value }))
              }
              required
            />
          </div>

          {/* Short Description EN */}
          <div className="space-y-2">
            <Label htmlFor="hobby-short-description-en">
              {t.hobbies.shortDescription} ({t.common.english})
            </Label>
            <Input
              id="hobby-short-description-en"
              value={form.short_description_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, short_description_en: e.target.value }))
              }
            />
          </div>

          {/* Short Description FR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="hobby-short-description-fr">
                {t.hobbies.shortDescription} ({t.common.french})
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    short_description_fr: f.short_description_en,
                  }))
                }
              >
                {locale === "fr" ? "Copier EN -> FR" : "Copy EN -> FR"}
              </Button>
            </div>
            <Input
              id="hobby-short-description-fr"
              value={form.short_description_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, short_description_fr: e.target.value }))
              }
            />
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label htmlFor="hobby-icon-search">{t.hobbies.icon}</Label>
            <Input
              id="hobby-icon-search"
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder="Search icons..."
            />
            <div className="max-h-44 overflow-y-auto rounded-md border p-1">
              {filteredIcons.length === 0 ? (
                <p className="px-2 py-2 text-sm text-muted-foreground">
                  {t.common.noResults}
                </p>
              ) : (
                filteredIcons.map((option) => {
                  const Icon = option.icon;
                  const isSelected = form.icon === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, icon: option.value }));
                        setIconSearch(option.value);
                      }}
                      className={[
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
                        isSelected
                          ? "bg-secondary text-secondary-foreground"
                          : "hover:bg-muted",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{option.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {option.value}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {form.icon ? (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-mono">{form.icon}</span>
              </p>
            ) : null}
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="hobby-order">{t.common.order}</Label>
            <Input
              id="hobby-order"
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
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : hobby ? (
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

// ─── Main Page ──────────────────────────────────────────────────────────
export default function AdminHobbiesPage() {
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
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
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
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);

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
      const data = await fetchJson<PaginatedResponse<Hobby>>(
        `/api/hobbies?${endpointParams.toString()}`
      );
      setHobbies(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.total);
      return data;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load hobbies data"
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
      const availableIds = new Set(hobbies.map((item) => item.id));
      return new Set(Array.from(current).filter((id) => availableIds.has(id)));
    });
  }, [hobbies]);

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
    () => hobbies.length > 0 && hobbies.every((item) => selectedIds.has(item.id)),
    [hobbies, selectedIds]
  );

  const translationCounts = useMemo(() => {
    let missingEn = 0;
    let missingFr = 0;
    let complete = 0;
    for (const item of hobbies) {
      const hasEn = Boolean(item.name_en?.trim());
      const hasFr = Boolean(item.name_fr?.trim());
      if (!hasEn) missingEn += 1;
      if (!hasFr) missingFr += 1;
      if (hasEn && hasFr) complete += 1;
    }
    return { missingEn, missingFr, complete };
  }, [hobbies]);

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
      return new Set(hobbies.map((item) => item.id));
    });
  };

  // ── CRUD ──────────────────────────────────────────────────────────
  const handleSave = async (data: HobbyFormData) => {
    try {
      if (editingHobby) {
        await fetchMutation(`/api/hobbies/${editingHobby.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetchMutation("/api/hobbies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
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
    setEditingHobby(null);
    setDialogOpen(true);
  };

  const openEdit = (hobby: Hobby) => {
    setEditingHobby(hobby);
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const duplicateHobby = async (id: string) => {
    try {
      await fetchMutation(`/api/hobbies/${id}/duplicate`, { method: "POST" });
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
      await fetchMutation("/api/hobbies/bulk", {
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
      await fetchMutation(`/api/hobbies/${deleteTargetId}`, { method: "DELETE" });
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
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
          {t.hobbies.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={
              locale === "fr"
                ? "Rechercher des hobbies..."
                : "Search hobbies..."
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
            {t.hobbies.addHobby}
          </Button>
        </div>
      </div>

      {/* Hobbies Grid */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{locale === "fr" ? "EN manquant" : "Missing EN"}: {translationCounts.missingEn}</Badge>
        <Badge variant="outline">{locale === "fr" ? "FR manquant" : "Missing FR"}: {translationCounts.missingFr}</Badge>
        <Badge variant="outline">{locale === "fr" ? "Complet" : "Complete"}: {translationCounts.complete}</Badge>
      </div>

      {hobbies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.common.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <BulkActionToolbar
            allSelected={allSelected}
            pageCount={hobbies.length}
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hobbies.map((hobby) => {
              const Icon = getHobbyIcon(hobby.icon);
              const hobbyName = localizedText(previewLang, hobby.name_en, hobby.name_fr);
              const hobbyDescription = localizedText(
                previewLang,
                hobby.short_description_en,
                hobby.short_description_fr
              );
              return (
                <Card key={hobby.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.has(hobby.id)}
                          onCheckedChange={(checked) =>
                            toggleSelection(hobby.id, checked === true)
                          }
                        />
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {hobbyName}
                        {(previewLang === "fr"
                          ? !hobby.name_fr?.trim()
                          : !hobby.name_en?.trim()) && (
                          <Badge variant="outline" className="text-[10px]">
                            {missingTranslationLabel}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => duplicateHobby(hobby.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span className="sr-only">Duplicate</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(hobby)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">{t.common.edit}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDelete(hobby.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        <span className="sr-only">{t.common.delete}</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {hobbyDescription ? (
                      <p className="text-sm text-muted-foreground">{hobbyDescription}</p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {hobby.icon && (
                        <Badge variant="secondary" className="text-xs">
                          {t.hobbies.icon}: {hobby.icon}
                        </Badge>
                      )}
                      <span>
                        {t.common.order}: {hobby.order}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
      <HobbyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hobby={editingHobby}
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
