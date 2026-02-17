"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, Plus, Pencil, Trash2 } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { SocialLink } from "@/lib/types/database";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { toast } from "sonner";
import { BulkActionToolbar } from "@/components/admin/bulk-action-toolbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { PaginationControls } from "@/components/admin/pagination-controls";
import { DEFAULT_PAGE_SIZE, parsePageQuery } from "@/lib/pagination";
import type { PaginatedResponse } from "@/lib/types/pagination";

interface FormData {
  preset: SocialPresetKey | "";
  url: string;
  order: number;
}

const SORT_DIRS = ["asc", "desc"] as const;
type SortDir = (typeof SORT_DIRS)[number];

const initialForm: FormData = {
  preset: "",
  url: "",
  order: 0,
};

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function resolveSortDir(value: string | null): SortDir {
  if (value && SORT_DIRS.includes(value as SortDir)) {
    return value as SortDir;
  }
  return "asc";
}

function sortLabel(locale: string, value: SortDir): string {
  if (locale === "fr") {
    return value === "asc" ? "Ordre croissant" : "Ordre décroissant";
  }
  return value === "asc" ? "Order ascending" : "Order descending";
}

export default function AdminSocialLinksPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);
  const pageFromUrl = parsePageQuery(searchParams.get("page"));
  const queryFromUrl = searchParams.get("q") ?? "";
  const sortDirFromUrl = resolveSortDir(searchParams.get("sortDir"));

  const [items, setItems] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(pageFromUrl);
  const [sortDir, setSortDir] = useState<SortDir>(sortDirFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<SocialLink | null>(null);
  const [form, setForm] = useState<FormData>(initialForm);
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");

  const fetchData = useCallback(async (activePage: number) => {
    setIsLoading(true);
    try {
      const endpointParams = new URLSearchParams();
      endpointParams.set("page", String(activePage));
      endpointParams.set("pageSize", String(PAGE_SIZE));
      endpointParams.set("q", searchQuery.trim());
      endpointParams.set("sortBy", "order");
      endpointParams.set("sortDir", sortDir);
      const data = await fetchJson<PaginatedResponse<SocialLink>>(
        `/api/social-links?${endpointParams.toString()}`
      );
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.total);
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, sortDir, t.common.errorOccurred]);

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
    fetchData(page);
  }, [fetchData, page]);

  useEffect(() => {
    setSelectedIds((current) => {
      const availableIds = new Set(items.map((item) => item.id));
      return new Set(Array.from(current).filter((id) => availableIds.has(id)));
    });
  }, [items]);

  const replaceState = (updates: { page?: number; q?: string; sortDir?: SortDir }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(updates.page ?? page));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("q", updates.q ?? searchQuery.trim());
    params.set("sortDir", updates.sortDir ?? sortDir);
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
    replaceState({ page: 1, q: value.trim() });
  };

  const updateSortDir = (value: SortDir) => {
    setSortDir(value);
    setPage(1);
    replaceState({ page: 1, sortDir: value });
  };

  const refreshAfterMutation = async () => {
    const data = await fetchData(page);
    if (data && data.items.length === 0 && data.total > 0 && page > 1) {
      updatePage(page - 1);
    }
  };

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
      await refreshAfterMutation();
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
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const duplicateItem = async (id: string) => {
    try {
      await fetchMutation(`/api/social-links/${id}/duplicate`, { method: "POST" });
      toast.success(t.common.savedSuccessfully);
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const allSelected = useMemo(
    () => items.length > 0 && items.every((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

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
      return new Set(items.map((item) => item.id));
    });
  };

  const applyBulkAction = async () => {
    if (bulkAction !== "delete" || selectedIds.size === 0) return;
    if (
      !window.confirm(
        locale === "fr"
          ? "Supprimer les liens sélectionnés ?"
          : "Delete selected links?"
      )
    ) {
      return;
    }

    try {
      await fetchMutation("/api/social-links/bulk", {
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
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={locale === "fr" ? "Rechercher des liens..." : "Search links..."}
            className="w-64"
          />
          <Select value={sortDir} onValueChange={(value) => updateSortDir(value as SortDir)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">{sortLabel(locale, "asc")}</SelectItem>
              <SelectItem value="desc">{sortLabel(locale, "desc")}</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {t.socialLinks.addLink}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.common.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <BulkActionToolbar
            allSelected={allSelected}
            pageCount={items.length}
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
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => toggleSelection(item.id, checked === true)}
                      />
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => duplicateItem(item.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
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
