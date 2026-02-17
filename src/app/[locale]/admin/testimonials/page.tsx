"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Testimonial } from "@/lib/types/database";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { DEFAULT_PAGE_SIZE, parsePageQuery } from "@/lib/pagination";
import { toast } from "sonner";
import { BulkActionToolbar } from "@/components/admin/bulk-action-toolbar";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { resolvePreviewLanguage } from "@/lib/localized-preview";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILTERS = ["all", "pending", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];
const SORT_DIRS = ["desc", "asc"] as const;
type SortDir = (typeof SORT_DIRS)[number];
const TRANSLATION_FILTERS = ["all", "missing_en", "missing_fr", "complete"] as const;
type TranslationFilter = (typeof TRANSLATION_FILTERS)[number];
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function resolveFilter(value: string | null): Filter {
  if (value && FILTERS.includes(value as Filter)) {
    return value as Filter;
  }
  return "all";
}

function resolveSortDir(value: string | null): SortDir {
  if (value && SORT_DIRS.includes(value as SortDir)) {
    return value as SortDir;
  }
  return "desc";
}

function resolveTranslationFilter(value: string | null): TranslationFilter {
  if (value && TRANSLATION_FILTERS.includes(value as TranslationFilter)) {
    return value as TranslationFilter;
  }
  return "all";
}

function sortLabel(locale: string, value: SortDir): string {
  if (locale === "fr") {
    return value === "desc" ? "Plus récents" : "Plus anciens";
  }
  return value === "desc" ? "Newest first" : "Oldest first";
}

function statusBadgeVariant(status: Testimonial["status"]) {
  if (status === "approved") return "default" as const;
  if (status === "rejected") return "destructive" as const;
  return "secondary" as const;
}

export default function AdminTestimonialsPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);
  const filterFromUrl = resolveFilter(searchParams.get("filter"));
  const pageFromUrl = parsePageQuery(searchParams.get("page"));
  const queryFromUrl = searchParams.get("q") ?? "";
  const sortDirFromUrl = resolveSortDir(searchParams.get("sortDir"));
  const previewLangFromUrl =
    searchParams.get("previewLang") === "fr" ? "fr" : resolvePreviewLanguage(locale);
  const translationFromUrl = resolveTranslationFilter(searchParams.get("translation"));

  const [items, setItems] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(filterFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  const [sortDir, setSortDir] = useState<SortDir>(sortDirFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState<Locale>(previewLangFromUrl);
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [translationFilter, setTranslationFilter] = useState<TranslationFilter>(
    translationFromUrl
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");

  const fetchData = useCallback(async (activeFilter: Filter, activePage: number) => {
    setIsLoading(true);
    try {
      const endpointParams = new URLSearchParams();
      if (activeFilter !== "all") {
        endpointParams.set("status", activeFilter);
      }
      endpointParams.set("page", String(activePage));
      endpointParams.set("pageSize", String(PAGE_SIZE));
      endpointParams.set("q", searchQuery.trim());
      endpointParams.set("sortBy", "created_at");
      endpointParams.set("sortDir", sortDir);
      endpointParams.set("translation", translationFilter);

      const data = await fetchJson<PaginatedResponse<Testimonial>>(
        `/api/testimonials?${endpointParams.toString()}`
      );
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.total);
      return data;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load testimonials"
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, sortDir, translationFilter]);

  useEffect(() => {
    setFilter(filterFromUrl);
  }, [filterFromUrl]);

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
    setPreviewLang(previewLangFromUrl);
  }, [previewLangFromUrl]);

  useEffect(() => {
    setTranslationFilter(translationFromUrl);
  }, [translationFromUrl]);

  useEffect(() => {
    fetchData(filter, page);
  }, [fetchData, filter, page]);

  useEffect(() => {
    setSelectedIds((current) => {
      const availableIds = new Set(items.map((item) => item.id));
      return new Set(Array.from(current).filter((id) => availableIds.has(id)));
    });
  }, [items]);

  const replaceState = (updates: {
    filter?: Filter;
    page?: number;
    q?: string;
    sortDir?: SortDir;
    previewLang?: Locale;
    translation?: TranslationFilter;
  }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", updates.filter ?? filter);
    params.set("page", String(updates.page ?? page));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("q", updates.q ?? searchQuery.trim());
    params.set("sortDir", updates.sortDir ?? sortDir);
    params.set("previewLang", updates.previewLang ?? previewLang);
    params.set("translation", updates.translation ?? translationFilter);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updateFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    setPage(1);
    replaceState({ filter: nextFilter, page: 1 });
  };

  const updatePage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
    setPage(boundedPage);
    replaceState({ page: boundedPage });
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

  const updatePreviewLang = (value: Locale) => {
    setPreviewLang(value);
    replaceState({ previewLang: value });
  };

  const updateTranslationFilter = (value: TranslationFilter) => {
    setTranslationFilter(value);
    setPage(1);
    replaceState({ translation: value, page: 1 });
  };

  const statusLabel = (status: Testimonial["status"]) => {
    if (status === "approved") return t.testimonials.approved;
    if (status === "rejected") return t.testimonials.rejected;
    return t.testimonials.pending;
  };

  const bodyContentFor = (item: Testimonial) => {
    const selectedLocale = previewLang;
    const primary = selectedLocale === "fr" ? item.content_fr : item.content_en;
    const fallback = selectedLocale === "fr" ? item.content_en : item.content_fr;

    if (primary) {
      return { content: primary, selectedLocale, fallbackNotice: null as string | null };
    }

    if (fallback) {
      return {
        content: fallback,
        selectedLocale,
        fallbackNotice:
          selectedLocale === "fr"
            ? t.testimonials.bodyFallbackFr
            : t.testimonials.bodyFallbackEn,
      };
    }

    return { content: "", selectedLocale, fallbackNotice: null as string | null };
  };

  const refreshAfterMutation = async () => {
    const data = await fetchData(filter, page);
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
    () => items.length > 0 && items.every((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const translationCounts = useMemo(() => {
    let missingEn = 0;
    let missingFr = 0;
    let complete = 0;
    for (const item of items) {
      const hasEn = Boolean(item.content_en?.trim());
      const hasFr = Boolean(item.content_fr?.trim());
      if (!hasEn) missingEn += 1;
      if (!hasFr) missingFr += 1;
      if (hasEn && hasFr) complete += 1;
    }
    return { missingEn, missingFr, complete };
  }, [items]);

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
      if (!checked) {
        return new Set();
      }
      return new Set(items.map((item) => item.id));
    });
  };

  const applyBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    if (
      bulkAction === "delete" &&
      !window.confirm(
        locale === "fr"
          ? "Supprimer les témoignages sélectionnés ?"
          : "Delete selected testimonials?"
      )
    ) {
      return;
    }

    try {
      await fetchMutation("/api/testimonials/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: bulkAction, ids: Array.from(selectedIds) }),
      });
      toast.success(t.common.savedSuccessfully);
      setSelectedIds(new Set());
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const updateStatus = async (id: string, status: Testimonial["status"]) => {
    try {
      await fetchMutation(`/api/testimonials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success(t.common.savedSuccessfully);
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await fetchMutation(`/api/testimonials/${deleteId}`, {
        method: "DELETE",
      });
      toast.success(t.common.deletedSuccessfully);
      setDeleteId(null);
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-72" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t.testimonials.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={
              locale === "fr"
                ? "Rechercher des témoignages..."
                : "Search testimonials..."
            }
            className="w-64"
          />
          <Select
            value={translationFilter}
            onValueChange={(value) => updateTranslationFilter(value as TranslationFilter)}
          >
            <SelectTrigger className="w-52">
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
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">{sortLabel(locale, "desc")}</SelectItem>
              <SelectItem value="asc">{sortLabel(locale, "asc")}</SelectItem>
            </SelectContent>
          </Select>
          <AdminLanguageToggle
            value={previewLang}
            onChange={updatePreviewLang}
            labels={{ english: t.common.english, french: t.common.french }}
          />
        </div>
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => updateFilter(value as Filter)}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">{t.testimonials.all}</TabsTrigger>
          <TabsTrigger value="pending">{t.testimonials.pending}</TabsTrigger>
          <TabsTrigger value="approved">{t.testimonials.approved}</TabsTrigger>
          <TabsTrigger value="rejected">{t.testimonials.rejected}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{locale === "fr" ? "EN manquant" : "Missing EN"}: {translationCounts.missingEn}</Badge>
        <Badge variant="outline">{locale === "fr" ? "FR manquant" : "Missing FR"}: {translationCounts.missingFr}</Badge>
        <Badge variant="outline">{locale === "fr" ? "Complet" : "Complete"}: {translationCounts.complete}</Badge>
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
            actions={[
              { value: "approve", label: locale === "fr" ? "Approuver" : "Approve" },
              { value: "reject", label: locale === "fr" ? "Rejeter" : "Reject" },
              { value: "delete", label: locale === "fr" ? "Supprimer" : "Delete" },
            ]}
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

          {items.map((item) => {
            const { content, fallbackNotice } = bodyContentFor(item);
            return (
              <Card key={item.id}>
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{item.author_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {[item.author_title, item.author_company].filter(Boolean).join(" · ") || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => toggleSelection(item.id, checked === true)}
                      />
                      {(previewLang === "fr" ? !item.content_fr?.trim() : !item.content_en?.trim()) && (
                        <Badge variant="outline" className="text-[10px]">
                          {missingTranslationLabel}
                        </Badge>
                      )}
                      <Badge variant={statusBadgeVariant(item.status)}>
                        {statusLabel(item.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed">{content}</p>
                  {fallbackNotice ? (
                    <p className="text-xs text-muted-foreground">{fallbackNotice}</p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(item.id, "approved")}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {t.testimonials.approve}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(item.id, "rejected")}
                    >
                      <X className="mr-2 h-4 w-4" />
                      {t.testimonials.reject}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t.common.delete}
                    </Button>
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
