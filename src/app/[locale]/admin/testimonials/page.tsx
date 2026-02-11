"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { Testimonial } from "@/lib/types/database";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { DEFAULT_PAGE_SIZE, parsePageQuery } from "@/lib/pagination";
import { toast } from "sonner";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

const FILTERS = ["all", "pending", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function resolveFilter(value: string | null): Filter {
  if (value && FILTERS.includes(value as Filter)) {
    return value as Filter;
  }
  return "all";
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

  const [items, setItems] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(filterFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async (activeFilter: Filter, activePage: number) => {
    setIsLoading(true);
    try {
      const endpointParams = new URLSearchParams();
      if (activeFilter !== "all") {
        endpointParams.set("status", activeFilter);
      }
      endpointParams.set("page", String(activePage));
      endpointParams.set("pageSize", String(PAGE_SIZE));

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
  }, []);

  useEffect(() => {
    setFilter(filterFromUrl);
  }, [filterFromUrl]);

  useEffect(() => {
    setPage(pageFromUrl);
  }, [pageFromUrl]);

  useEffect(() => {
    fetchData(filter, page);
  }, [fetchData, filter, page]);

  const updateFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", nextFilter);
    params.set("page", "1");
    params.set("pageSize", String(PAGE_SIZE));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updatePage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
    setPage(boundedPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    params.set("page", String(boundedPage));
    params.set("pageSize", String(PAGE_SIZE));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const statusLabel = (status: Testimonial["status"]) => {
    if (status === "approved") return t.testimonials.approved;
    if (status === "rejected") return t.testimonials.rejected;
    return t.testimonials.pending;
  };

  const bodyContentFor = (item: Testimonial) => {
    const selectedLocale = locale === "fr" ? "fr" : "en";
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
      <h1 className="text-3xl font-bold tracking-tight">{t.testimonials.title}</h1>

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

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.common.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
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
                    <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
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
