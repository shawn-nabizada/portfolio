"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  Star,
  ExternalLink,
  Github,
  Calendar,
  Loader2,
} from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Project, Skill } from "@/lib/types/database";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthYearField } from "@/components/admin/month-year-field";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";
import { BulkActionToolbar } from "@/components/admin/bulk-action-toolbar";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { DEFAULT_PAGE_SIZE, parsePageQuery } from "@/lib/pagination";
import type { PaginatedResponse } from "@/lib/types/pagination";
import {
  localizedArray,
  localizedText,
  resolvePreviewLanguage,
} from "@/lib/localized-preview";
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

// ─── Project Dialog ─────────────────────────────────────────────────────
interface ProjectFormData {
  title_en: string;
  title_fr: string;
  description_en: string;
  description_fr: string;
  project_bullets_en: string[];
  project_bullets_fr: string[];
  image_url: string;
  project_url: string;
  github_url: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  featured: boolean;
  order: number;
  skill_ids: string[];
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

function normalizeBulletInput(value: unknown): string[] {
  if (!Array.isArray(value)) return [""];

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim());

  return normalized.length > 0 ? normalized : [""];
}

function hasAtLeastOneBullet(value: string[]): boolean {
  return value.some((item) => item.trim().length > 0);
}

function ProjectDialog({
  open,
  onOpenChange,
  project,
  allSkills,
  onSave,
  locale,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
  allSkills: Skill[];
  onSave: (data: ProjectFormData) => Promise<void>;
  locale: Locale;
  t: ReturnType<typeof getTranslations>;
}) {
  const [form, setForm] = useState<ProjectFormData>({
    title_en: "",
    title_fr: "",
    description_en: "",
    description_fr: "",
    project_bullets_en: [""],
    project_bullets_fr: [""],
    image_url: "",
    project_url: "",
    github_url: "",
    start_date: "",
    end_date: "",
    is_current: false,
    featured: false,
    order: 0,
    skill_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState("");

  useEffect(() => {
    const nextForm: ProjectFormData = project
      ? {
          title_en: project.title_en,
          title_fr: project.title_fr,
          description_en: project.description_en || "",
          description_fr: project.description_fr || "",
          project_bullets_en: normalizeBulletInput(project.project_bullets_en),
          project_bullets_fr: normalizeBulletInput(project.project_bullets_fr),
          image_url: project.image_url || "",
          project_url: project.project_url || "",
          github_url: project.github_url || "",
          start_date: toMonthInputValue(project.start_date),
          end_date: toMonthInputValue(project.end_date),
          is_current: Boolean(project.start_date && !project.end_date),
          featured: project.featured,
          order: project.order,
          skill_ids: project.skills?.map((s) => s.id) || [],
        }
      : {
          title_en: "",
          title_fr: "",
          description_en: "",
          description_fr: "",
          project_bullets_en: [""],
          project_bullets_fr: [""],
          image_url: "",
          project_url: "",
          github_url: "",
          start_date: "",
          end_date: "",
          is_current: false,
          featured: false,
          order: 0,
          skill_ids: [],
        };

    setForm(nextForm);
    setInitialSnapshot(JSON.stringify(nextForm));
    setShowValidation(false);
  }, [project, open]);

  const isDirty = JSON.stringify(form) !== initialSnapshot;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty && !confirmDiscardChanges(locale)) {
      return;
    }

    onOpenChange(nextOpen);
  };

  const hasEnglishBullets = hasAtLeastOneBullet(form.project_bullets_en);
  const hasFrenchBullets = hasAtLeastOneBullet(form.project_bullets_fr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    if (!form.start_date || !hasEnglishBullets || !hasFrenchBullets) {
      if (!form.start_date) {
        toast.error(
          locale === "fr"
            ? "La date de début est requise."
            : "Start date is required."
        );
      }
      if (!hasEnglishBullets || !hasFrenchBullets) {
        toast.error(t.projects.bulletsRequired);
      }
      return;
    }

    setSaving(true);
    if (project) {
      setInitialSnapshot(JSON.stringify(form));
    }
    try {
      await onSave(form);
      onOpenChange(false);
    } catch {
      // Keep dialog open on failure.
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setForm((f) => ({
      ...f,
      skill_ids: f.skill_ids.includes(skillId)
        ? f.skill_ids.filter((id) => id !== skillId)
        : [...f.skill_ids, skillId],
    }));
  };

  const updateBullet = (
    key: "project_bullets_en" | "project_bullets_fr",
    index: number,
    value: string
  ) => {
    setForm((f) => {
      const next = [...f[key]];
      next[index] = value;
      return { ...f, [key]: next };
    });
  };

  const addBullet = (key: "project_bullets_en" | "project_bullets_fr") => {
    setForm((f) => ({ ...f, [key]: [...f[key], ""] }));
  };

  const removeBullet = (
    key: "project_bullets_en" | "project_bullets_fr",
    index: number
  ) => {
    setForm((f) => {
      if (f[key].length <= 1) return f;
      return { ...f, [key]: f[key].filter((_, i) => i !== index) };
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {project ? t.projects.editProject : t.projects.addProject}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title EN */}
          <div className="space-y-2">
            <Label htmlFor="proj-title-en">
              {t.projects.projectTitle} ({t.common.english})
            </Label>
            <Input
              id="proj-title-en"
              value={form.title_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, title_en: e.target.value }))
              }
              required
            />
          </div>

          {/* Title FR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="proj-title-fr">
                {t.projects.projectTitle} ({t.common.french})
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm((f) => ({ ...f, title_fr: f.title_en }))}
              >
                {locale === "fr" ? "Copier EN -> FR" : "Copy EN -> FR"}
              </Button>
            </div>
            <Input
              id="proj-title-fr"
              value={form.title_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, title_fr: e.target.value }))
              }
              required
            />
          </div>

          {/* Description EN */}
          <div className="space-y-2">
            <Label htmlFor="proj-desc-en">
              {t.projects.projectDescription} ({t.common.english})
            </Label>
            <Textarea
              id="proj-desc-en"
              value={form.description_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, description_en: e.target.value }))
              }
              rows={3}
            />
          </div>

          {/* Description FR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="proj-desc-fr">
                {t.projects.projectDescription} ({t.common.french})
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    description_fr: f.description_en,
                  }))
                }
              >
                {locale === "fr" ? "Copier EN -> FR" : "Copy EN -> FR"}
              </Button>
            </div>
            <Textarea
              id="proj-desc-fr"
              value={form.description_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, description_fr: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t.projects.bulletPoints} ({t.common.english})</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => addBullet("project_bullets_en")}>
                {t.projects.addBullet}
              </Button>
            </div>
            <div className="space-y-2">
              {form.project_bullets_en.map((bullet, index) => (
                <div key={`bullet-en-${index}`} className="flex items-center gap-2">
                  <Input
                    value={bullet}
                    onChange={(e) => updateBullet("project_bullets_en", index, e.target.value)}
                    placeholder={t.projects.bulletPlaceholder}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeBullet("project_bullets_en", index)}
                    disabled={form.project_bullets_en.length <= 1}
                  >
                    {t.common.delete}
                  </Button>
                </div>
              ))}
            </div>
            {showValidation && !hasEnglishBullets ? (
              <p className="text-sm text-destructive">
                {locale === "fr"
                  ? "Ajoutez au moins un point en anglais."
                  : "Add at least one English bullet point."}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t.projects.bulletPoints} ({t.common.french})</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      project_bullets_fr: [...f.project_bullets_en],
                    }))
                  }
                >
                  {locale === "fr" ? "Copier EN -> FR" : "Copy EN -> FR"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addBullet("project_bullets_fr")}
                >
                  {t.projects.addBullet}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {form.project_bullets_fr.map((bullet, index) => (
                <div key={`bullet-fr-${index}`} className="flex items-center gap-2">
                  <Input
                    value={bullet}
                    onChange={(e) => updateBullet("project_bullets_fr", index, e.target.value)}
                    placeholder={t.projects.bulletPlaceholder}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeBullet("project_bullets_fr", index)}
                    disabled={form.project_bullets_fr.length <= 1}
                  >
                    {t.common.delete}
                  </Button>
                </div>
              ))}
            </div>
            {showValidation && !hasFrenchBullets ? (
              <p className="text-sm text-destructive">
                {locale === "fr"
                  ? "Ajoutez au moins un point en français."
                  : "Add at least one French bullet point."}
              </p>
            ) : null}
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="proj-image">{t.projects.imageUrl}</Label>
            <Input
              id="proj-image"
              type="url"
              value={form.image_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, image_url: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>

          {/* Project URL */}
          <div className="space-y-2">
            <Label htmlFor="proj-url">{t.projects.projectUrl}</Label>
            <Input
              id="proj-url"
              type="url"
              value={form.project_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, project_url: e.target.value }))
              }
              placeholder="https://..."
            />
          </div>

          {/* GitHub URL */}
          <div className="space-y-2">
            <Label htmlFor="proj-github">{t.projects.githubUrl}</Label>
            <Input
              id="proj-github"
              type="url"
              value={form.github_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, github_url: e.target.value }))
              }
              placeholder="https://github.com/..."
            />
          </div>

          <MonthYearField
            id="proj-start-date"
            label={t.projects.startDate}
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

          {/* Current Project */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="proj-current"
              checked={form.is_current}
              onCheckedChange={(checked) =>
                setForm((f) => ({
                  ...f,
                  is_current: checked === true,
                  end_date: checked === true ? "" : f.end_date,
                }))
              }
            />
            <Label htmlFor="proj-current" className="cursor-pointer">
              {t.projects.currentProject}
            </Label>
          </div>

          {/* End Date */}
          {!form.is_current && (
            <MonthYearField
              id="proj-end-date"
              label={t.projects.endDate}
              value={form.end_date}
              onChange={(value) => setForm((f) => ({ ...f, end_date: value }))}
              locale={locale}
              allowClear
            />
          )}

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="proj-order">{t.common.order}</Label>
            <Input
              id="proj-order"
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

          {/* Featured */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="proj-featured"
              checked={form.featured}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, featured: checked === true }))
              }
            />
            <Label htmlFor="proj-featured" className="cursor-pointer">
              {t.projects.featured}
            </Label>
          </div>

          {/* Linked Skills */}
          <div className="space-y-2">
            <Label>{t.projects.linkedSkills}</Label>
            {allSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.common.noResults}
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {allSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`skill-${skill.id}`}
                      checked={form.skill_ids.includes(skill.id)}
                      onCheckedChange={() => toggleSkill(skill.id)}
                    />
                    <Label
                      htmlFor={`skill-${skill.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {skill.name_en}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                !form.start_date ||
                !hasAtLeastOneBullet(form.project_bullets_en) ||
                !hasAtLeastOneBullet(form.project_bullets_fr)
              }
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : project ? (
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
export default function AdminProjectsPage() {
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
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

  // Project dialog
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

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
      const [projectsData, skillsData] = await Promise.all([
        fetchJson<PaginatedResponse<Project>>(
          `/api/projects?${endpointParams.toString()}`
        ),
        fetchJson<Skill[]>("/api/skills"),
      ]);
      setProjects(projectsData.items);
      setTotalPages(projectsData.totalPages);
      setTotalItems(projectsData.total);
      setAllSkills(skillsData);
      return projectsData;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load projects data"
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
      const availableIds = new Set(projects.map((item) => item.id));
      return new Set(Array.from(current).filter((id) => availableIds.has(id)));
    });
  }, [projects]);

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
    () => projects.length > 0 && projects.every((item) => selectedIds.has(item.id)),
    [projects, selectedIds]
  );

  const translationCounts = useMemo(() => {
    let missingEn = 0;
    let missingFr = 0;
    let complete = 0;
    for (const item of projects) {
      const hasEn = Boolean(item.title_en?.trim());
      const hasFr = Boolean(item.title_fr?.trim());
      if (!hasEn) missingEn += 1;
      if (!hasFr) missingFr += 1;
      if (hasEn && hasFr) complete += 1;
    }
    return { missingEn, missingFr, complete };
  }, [projects]);

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
      return new Set(projects.map((item) => item.id));
    });
  };

  // ── Project CRUD ────────────────────────────────────────────────────
  const handleSaveProject = async (data: ProjectFormData) => {
    const payload = {
      title_en: data.title_en,
      title_fr: data.title_fr,
      description_en: data.description_en,
      description_fr: data.description_fr,
      project_bullets_en: data.project_bullets_en
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      project_bullets_fr: data.project_bullets_fr
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
      image_url: data.image_url,
      project_url: data.project_url,
      github_url: data.github_url,
      start_date: toIsoMonthDate(data.start_date),
      end_date: data.is_current ? null : toIsoMonthDate(data.end_date) || null,
      featured: data.featured,
      order: data.order,
      skill_ids: data.skill_ids,
    };

    try {
      if (editingProject) {
        await fetchMutation(`/api/projects/${editingProject.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetchMutation("/api/projects", {
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

  const openAddProject = () => {
    setEditingProject(null);
    setProjectDialogOpen(true);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectDialogOpen(true);
  };

  const openDeleteProject = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const duplicateProject = async (id: string) => {
    try {
      await fetchMutation(`/api/projects/${id}/duplicate`, { method: "POST" });
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
      await fetchMutation("/api/projects/bulk", {
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

  // ── Delete handler ─────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await fetchMutation(`/api/projects/${deleteTargetId}`, { method: "DELETE" });
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
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
          {t.projects.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={
              locale === "fr"
                ? "Rechercher des projets..."
                : "Search projects..."
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
          <Button onClick={openAddProject}>
            <Plus className="mr-2 h-4 w-4" />
            {t.projects.addProject}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{locale === "fr" ? "EN manquant" : "Missing EN"}: {translationCounts.missingEn}</Badge>
        <Badge variant="outline">{locale === "fr" ? "FR manquant" : "Missing FR"}: {translationCounts.missingFr}</Badge>
        <Badge variant="outline">{locale === "fr" ? "Complet" : "Complete"}: {translationCounts.complete}</Badge>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.common.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <BulkActionToolbar
            allSelected={allSelected}
            pageCount={projects.length}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const projectTitle = localizedText(
                previewLang,
                project.title_en,
                project.title_fr
              );
              const projectDescription = localizedText(
                previewLang,
                project.description_en,
                project.description_fr
              );
              const projectBullets = localizedArray(
                previewLang,
                project.project_bullets_en,
                project.project_bullets_fr
              );

              return (
                <Card key={project.id} className="flex flex-col">
                  {/* Image thumbnail */}
                  {project.image_url && (
                    <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.image_url}
                        alt={projectTitle}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.has(project.id)}
                          onCheckedChange={(checked) =>
                            toggleSelection(project.id, checked === true)
                          }
                        />
                        {projectTitle}
                        {(previewLang === "fr"
                          ? !project.title_fr?.trim()
                          : !project.title_en?.trim()) && (
                          <Badge variant="outline" className="text-[10px]">
                            {missingTranslationLabel}
                          </Badge>
                        )}
                        {project.featured && (
                          <Badge variant="default" className="text-xs">
                            <Star className="mr-1 h-3 w-3" />
                            {t.projects.featured}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => duplicateProject(project.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span className="sr-only">Duplicate</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditProject(project)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">{t.common.edit}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDeleteProject(project.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        <span className="sr-only">{t.common.delete}</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-3">
                    {/* Description preview */}
                    {projectDescription ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {projectDescription}
                      </p>
                    ) : null}

                    {projectBullets.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {projectBullets.slice(0, 3).map((bullet, index) => (
                          <li key={`${project.id}-admin-bullet-${index}`}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}

                    {project.start_date ? (
                      <p className="inline-flex items-center text-xs text-muted-foreground">
                        <Calendar className="mr-1 h-3.5 w-3.5" />
                        {formatDate(project.start_date)} &ndash;{" "}
                        {project.end_date ? formatDate(project.end_date) : t.projects.present}
                      </p>
                    ) : null}

                    {/* Linked skills */}
                    {project.skills && project.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {project.skills.map((skill) => (
                          <Badge key={skill.id} variant="secondary" className="text-xs">
                            {localizedText(previewLang, skill.name_en, skill.name_fr)}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    {/* Links */}
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      {project.project_url && (
                        <a
                          href={project.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          {t.projects.viewProject}
                        </a>
                      )}
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Github className="mr-1 h-3 w-3" />
                          {t.projects.viewCode}
                        </a>
                      )}
                    </div>

                    {/* Order indicator */}
                    <div className="text-xs text-muted-foreground">
                      {t.common.order}: {project.order}
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
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={editingProject}
        allSkills={allSkills}
        onSave={handleSaveProject}
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
