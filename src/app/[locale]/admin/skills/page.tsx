"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Tag, Loader2 } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Skill, SkillCategory } from "@/lib/types/database";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { DEFAULT_PAGE_SIZE, parsePageQuery } from "@/lib/pagination";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { toast } from "sonner";

const UNCATEGORIZED_VALUE = "__uncategorized__";
const PAGE_SIZE = DEFAULT_PAGE_SIZE;
const SKILLS_TAB = "skills";
const CATEGORIES_TAB = "categories";
type SkillsTab = typeof SKILLS_TAB | typeof CATEGORIES_TAB;

function resolveSkillsTab(value: string | null): SkillsTab {
  if (value === CATEGORIES_TAB) {
    return CATEGORIES_TAB;
  }
  return SKILLS_TAB;
}

// ─── Category Dialog ────────────────────────────────────────────────────
interface CategoryFormData {
  name_en: string;
  name_fr: string;
  order: number;
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: SkillCategory | null;
  onSave: (data: CategoryFormData) => Promise<void>;
  t: ReturnType<typeof getTranslations>;
}) {
  const [form, setForm] = useState<CategoryFormData>({
    name_en: "",
    name_fr: "",
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setForm({
        name_en: category.name_en,
        name_fr: category.name_fr,
        order: category.order,
      });
    } else {
      setForm({ name_en: "", name_fr: "", order: 0 });
    }
  }, [category, open]);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? t.skills.editCategory : t.skills.addCategory}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name-en">
              {t.skills.categoryName} ({t.common.english})
            </Label>
            <Input
              id="cat-name-en"
              value={form.name_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, name_en: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-name-fr">
              {t.skills.categoryName} ({t.common.french})
            </Label>
            <Input
              id="cat-name-fr"
              value={form.name_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, name_fr: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cat-order">{t.common.order}</Label>
            <Input
              id="cat-order"
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))
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
              ) : category ? (
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

// ─── Skill Dialog ───────────────────────────────────────────────────────
interface SkillFormData {
  name_en: string;
  name_fr: string;
  category_id: string;
  order: number;
}

function SkillDialog({
  open,
  onOpenChange,
  skill,
  defaultOrder,
  categories,
  onSave,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill | null;
  defaultOrder: number;
  categories: SkillCategory[];
  onSave: (data: SkillFormData) => Promise<void>;
  t: ReturnType<typeof getTranslations>;
}) {
  const [form, setForm] = useState<SkillFormData>({
    name_en: "",
    name_fr: "",
    category_id: "",
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (skill) {
      setForm({
        name_en: skill.name_en,
        name_fr: skill.name_fr,
        category_id: skill.category_id || "",
        order: skill.order,
      });
    } else {
      setForm({ name_en: "", name_fr: "", category_id: "", order: defaultOrder });
    }
  }, [defaultOrder, skill, open]);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {skill ? t.skills.editSkill : t.skills.addSkill}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skill-name-en">
              {t.skills.skillName} ({t.common.english})
            </Label>
            <Input
              id="skill-name-en"
              value={form.name_en}
              onChange={(e) =>
                setForm((f) => ({ ...f, name_en: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-name-fr">
              {t.skills.skillName} ({t.common.french})
            </Label>
            <Input
              id="skill-name-fr"
              value={form.name_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, name_fr: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-category">{t.skills.category}</Label>
            <Select
              value={form.category_id || UNCATEGORIZED_VALUE}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  category_id: value === UNCATEGORIZED_VALUE ? "" : value,
                }))
              }
            >
              <SelectTrigger id="skill-category">
                <SelectValue placeholder={t.skills.category} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCATEGORIZED_VALUE}>
                  {t.skills.uncategorized}
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-order">{t.common.order}</Label>
            <Input
              id="skill-order"
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))
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
              ) : skill ? (
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
export default function AdminSkillsPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);
  const activeTabFromUrl = resolveSkillsTab(searchParams.get("tab"));
  const skillsPageFromUrl = parsePageQuery(searchParams.get("skillsPage"));
  const categoriesPageFromUrl = parsePageQuery(searchParams.get("categoriesPage"));

  // Data
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SkillsTab>(activeTabFromUrl);
  const [skillsPage, setSkillsPage] = useState(skillsPageFromUrl);
  const [categoriesPage, setCategoriesPage] = useState(categoriesPageFromUrl);
  const [skillsTotalPages, setSkillsTotalPages] = useState(1);
  const [categoriesTotalPages, setCategoriesTotalPages] = useState(1);
  const [skillsTotalItems, setSkillsTotalItems] = useState(0);
  const [categoriesTotalItems, setCategoriesTotalItems] = useState(0);

  // Category dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(
    null
  );

  // Skill dialog
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "skill" | "category";
    id: string;
  } | null>(null);
  const nextSkillOrder = skills.reduce(
    (maxOrder, skill) => Math.max(maxOrder, skill.order),
    -1
  ) + 1;

  // Fetch data
  const fetchData = useCallback(async (activeSkillsPage: number, activeCategoriesPage: number) => {
    setIsLoading(true);
    try {
      const [skillsData, categoriesData] = await Promise.all([
        fetchJson<PaginatedResponse<Skill>>(
          `/api/skills?page=${activeSkillsPage}&pageSize=${PAGE_SIZE}`
        ),
        fetchJson<PaginatedResponse<SkillCategory>>(
          `/api/skill-categories?page=${activeCategoriesPage}&pageSize=${PAGE_SIZE}`
        ),
      ]);
      setSkills(skillsData.items);
      setCategories(categoriesData.items);
      setSkillsTotalPages(skillsData.totalPages);
      setCategoriesTotalPages(categoriesData.totalPages);
      setSkillsTotalItems(skillsData.total);
      setCategoriesTotalItems(categoriesData.total);
      return { skillsData, categoriesData };
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load skills data"
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveTab(activeTabFromUrl);
  }, [activeTabFromUrl]);

  useEffect(() => {
    setSkillsPage(skillsPageFromUrl);
  }, [skillsPageFromUrl]);

  useEffect(() => {
    setCategoriesPage(categoriesPageFromUrl);
  }, [categoriesPageFromUrl]);

  useEffect(() => {
    fetchData(skillsPage, categoriesPage);
  }, [fetchData, skillsPage, categoriesPage]);

  const replaceUrlState = (updates: {
    tab?: SkillsTab;
    skillsPage?: number;
    categoriesPage?: number;
  }) => {
    const nextTab = updates.tab ?? activeTab;
    const nextSkillsPage = Math.max(1, updates.skillsPage ?? skillsPage);
    const nextCategoriesPage = Math.max(1, updates.categoriesPage ?? categoriesPage);
    const params = new URLSearchParams(searchParams.toString());

    params.set("tab", nextTab);
    params.set("skillsPage", String(nextSkillsPage));
    params.set("categoriesPage", String(nextCategoriesPage));
    params.set("pageSize", String(PAGE_SIZE));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    setActiveTab(nextTab);
    setSkillsPage(nextSkillsPage);
    setCategoriesPage(nextCategoriesPage);
  };

  const updateTab = (nextTab: SkillsTab) => {
    replaceUrlState({ tab: nextTab });
  };

  const updateSkillsPage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), Math.max(1, skillsTotalPages));
    replaceUrlState({ skillsPage: boundedPage });
  };

  const updateCategoriesPage = (nextPage: number) => {
    const boundedPage = Math.min(
      Math.max(1, nextPage),
      Math.max(1, categoriesTotalPages)
    );
    replaceUrlState({ categoriesPage: boundedPage });
  };

  const refreshAfterMutation = async (type?: "skill" | "category") => {
    const data = await fetchData(skillsPage, categoriesPage);
    if (!data) return;

    if (
      (!type || type === "skill") &&
      data.skillsData.items.length === 0 &&
      data.skillsData.total > 0 &&
      skillsPage > 1
    ) {
      updateSkillsPage(skillsPage - 1);
    }

    if (
      (!type || type === "category") &&
      data.categoriesData.items.length === 0 &&
      data.categoriesData.total > 0 &&
      categoriesPage > 1
    ) {
      updateCategoriesPage(categoriesPage - 1);
    }
  };

  // ── Category CRUD ──────────────────────────────────────────────────
  const handleSaveCategory = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await fetchMutation(`/api/skill-categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetchMutation("/api/skill-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      toast.success(t.common.savedSuccessfully);
      await refreshAfterMutation("category");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
      throw error;
    }
  };

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: SkillCategory) => {
    setEditingCategory(cat);
    setCategoryDialogOpen(true);
  };

  const openDeleteCategory = (id: string) => {
    setDeleteTarget({ type: "category", id });
    setDeleteDialogOpen(true);
  };

  // ── Skill CRUD ─────────────────────────────────────────────────────
  const handleSaveSkill = async (data: SkillFormData) => {
    try {
      if (editingSkill) {
        await fetchMutation(`/api/skills/${editingSkill.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetchMutation("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      toast.success(t.common.savedSuccessfully);
      await refreshAfterMutation("skill");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
      throw error;
    }
  };

  const openAddSkill = () => {
    setEditingSkill(null);
    setSkillDialogOpen(true);
  };

  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillDialogOpen(true);
  };

  const openDeleteSkill = (id: string) => {
    setDeleteTarget({ type: "skill", id });
    setDeleteDialogOpen(true);
  };

  // ── Delete handler ─────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;

    const endpoint =
      deleteTarget.type === "skill"
        ? `/api/skills/${deleteTarget.id}`
        : `/api/skill-categories/${deleteTarget.id}`;

    try {
      await fetchMutation(endpoint, { method: "DELETE" });
      toast.success(t.common.deletedSuccessfully);
      const targetType = deleteTarget.type;
      setDeleteTarget(null);
      await refreshAfterMutation(targetType);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return t.skills.uncategorized;
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name_en : t.skills.uncategorized;
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
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.skills.title}</h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => updateTab(resolveSkillsTab(value))}
      >
        <TabsList>
          <TabsTrigger value="skills">{t.skills.title}</TabsTrigger>
          <TabsTrigger value="categories">{t.skills.category}</TabsTrigger>
        </TabsList>

        {/* ─── Skills Tab ──────────────────────────────────────────── */}
        <TabsContent value="skills" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddSkill}>
              <Plus className="mr-2 h-4 w-4" />
              {t.skills.addSkill}
            </Button>
          </div>

          {skills.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t.common.noResults}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {t.skills.skillName} ({t.common.english})
                        </TableHead>
                        <TableHead>
                          {t.skills.skillName} ({t.common.french})
                        </TableHead>
                        <TableHead>{t.skills.category}</TableHead>
                        <TableHead>{t.common.order}</TableHead>
                        <TableHead className="text-right">
                          {t.common.actions}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {skills.map((skill) => (
                        <TableRow key={skill.id}>
                          <TableCell className="font-medium">
                            {skill.name_en}
                          </TableCell>
                          <TableCell>{skill.name_fr}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {skill.category?.name_en || getCategoryName(skill.category_id)}
                            </Badge>
                          </TableCell>
                          <TableCell>{skill.order}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditSkill(skill)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">{t.common.edit}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteSkill(skill.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="sr-only">{t.common.delete}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <PaginationControls
                page={skillsPage}
                totalPages={skillsTotalPages}
                totalItems={skillsTotalItems}
                isLoading={isLoading}
                onPageChange={updateSkillsPage}
                labels={{
                  previous: t.common.previousPage,
                  next: t.common.nextPage,
                  page: t.common.page,
                  of: t.common.of,
                }}
              />
            </div>
          )}
        </TabsContent>

        {/* ─── Categories Tab ──────────────────────────────────────── */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddCategory}>
              <Plus className="mr-2 h-4 w-4" />
              {t.skills.addCategory}
            </Button>
          </div>

          {categories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t.common.noResults}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat) => (
                  <Card key={cat.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          {cat.name_en}
                        </div>
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditCategory(cat)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">{t.common.edit}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openDeleteCategory(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          <span className="sr-only">{t.common.delete}</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {cat.name_fr}
                      </p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t.common.order}: {cat.order}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <PaginationControls
                page={categoriesPage}
                totalPages={categoriesTotalPages}
                totalItems={categoriesTotalItems}
                isLoading={isLoading}
                onPageChange={updateCategoriesPage}
                labels={{
                  previous: t.common.previousPage,
                  next: t.common.nextPage,
                  page: t.common.page,
                  of: t.common.of,
                }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ───────────────────────────────────────────────── */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        t={t}
      />

      <SkillDialog
        open={skillDialogOpen}
        onOpenChange={setSkillDialogOpen}
        skill={editingSkill}
        defaultOrder={nextSkillOrder}
        categories={categories}
        onSave={handleSaveSkill}
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
