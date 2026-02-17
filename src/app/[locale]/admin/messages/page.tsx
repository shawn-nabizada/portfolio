"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { MailOpen, Trash2 } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { ContactMessage } from "@/lib/types/database";
import type { PaginatedResponse } from "@/lib/types/pagination";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { DEFAULT_PAGE_SIZE, parsePageQuery } from "@/lib/pagination";
import { toast } from "sonner";
import { BulkActionToolbar } from "@/components/admin/bulk-action-toolbar";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILTERS = ["all", "unread", "read"] as const;
type MessageFilter = (typeof FILTERS)[number];
const SORT_DIRS = ["desc", "asc"] as const;
type SortDir = (typeof SORT_DIRS)[number];
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function resolveFilter(value: string | null): MessageFilter {
  if (value && FILTERS.includes(value as MessageFilter)) {
    return value as MessageFilter;
  }
  return "all";
}

function resolveSortDir(value: string | null): SortDir {
  if (value && SORT_DIRS.includes(value as SortDir)) {
    return value as SortDir;
  }
  return "desc";
}

function sortLabel(locale: string, value: SortDir): string {
  if (locale === "fr") {
    return value === "desc" ? "Plus récents" : "Plus anciens";
  }
  return value === "desc" ? "Newest first" : "Oldest first";
}

export default function AdminMessagesPage() {
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

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<MessageFilter>(filterFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  const [sortDir, setSortDir] = useState<SortDir>(sortDirFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");

  const fetchData = useCallback(async (activeFilter: MessageFilter, activePage: number) => {
    setIsLoading(true);
    try {
      const endpointParams = new URLSearchParams();
      if (activeFilter !== "all") {
        endpointParams.set("read", String(activeFilter === "read"));
      }
      endpointParams.set("page", String(activePage));
      endpointParams.set("pageSize", String(PAGE_SIZE));
      endpointParams.set("q", searchQuery.trim());
      endpointParams.set("sortBy", "created_at");
      endpointParams.set("sortDir", sortDir);

      const data = await fetchJson<PaginatedResponse<ContactMessage>>(
        `/api/messages?${endpointParams.toString()}`
      );
      setMessages(data.items);
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
    fetchData(filter, page);
  }, [fetchData, filter, page]);

  useEffect(() => {
    setSelectedIds((current) => {
      const availableIds = new Set(messages.map((item) => item.id));
      const next = new Set(Array.from(current).filter((id) => availableIds.has(id)));
      return next;
    });
  }, [messages]);

  const updateFilter = (nextFilter: MessageFilter) => {
    setFilter(nextFilter);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", nextFilter);
    params.set("page", "1");
    params.set("pageSize", String(PAGE_SIZE));
    params.set("q", searchQuery.trim());
    params.set("sortDir", sortDir);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updatePage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
    setPage(boundedPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    params.set("page", String(boundedPage));
    params.set("pageSize", String(PAGE_SIZE));
    params.set("q", searchQuery.trim());
    params.set("sortDir", sortDir);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updateQuery = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    params.set("page", "1");
    params.set("pageSize", String(PAGE_SIZE));
    params.set("q", value.trim());
    params.set("sortDir", sortDir);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const updateSortDir = (value: SortDir) => {
    setSortDir(value);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    params.set("page", "1");
    params.set("pageSize", String(PAGE_SIZE));
    params.set("q", searchQuery.trim());
    params.set("sortDir", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const refreshAfterMutation = async () => {
    const data = await fetchData(filter, page);
    if (data && data.items.length === 0 && data.total > 0 && page > 1) {
      updatePage(page - 1);
    }
  };

  const allSelected = useMemo(
    () => messages.length > 0 && messages.every((message) => selectedIds.has(message.id)),
    [messages, selectedIds]
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
      if (!checked) {
        return new Set();
      }
      return new Set(messages.map((message) => message.id));
    });
  };

  const applyBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    if (
      bulkAction === "delete" &&
      !window.confirm(
        locale === "fr"
          ? "Supprimer les messages sélectionnés ?"
          : "Delete selected messages?"
      )
    ) {
      return;
    }

    try {
      await fetchMutation("/api/messages/bulk", {
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

  const markAsRead = async (id: string) => {
    try {
      await fetchMutation(`/api/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
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
      await fetchMutation(`/api/messages/${deleteId}`, { method: "DELETE" });
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
        <Skeleton className="h-9 w-40" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }

  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t.messages.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder={locale === "fr" ? "Rechercher des messages..." : "Search messages..."}
              className="w-64"
            />
            <Select value={sortDir} onValueChange={(value) => updateSortDir(value as SortDir)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">{sortLabel(locale, "desc")}</SelectItem>
                <SelectItem value="asc">{sortLabel(locale, "asc")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

      <Tabs value={filter} onValueChange={(value) => updateFilter(value as MessageFilter)}>
        <TabsList>
          <TabsTrigger value="all">{t.messages.all}</TabsTrigger>
          <TabsTrigger value="unread">{t.messages.unread}</TabsTrigger>
          <TabsTrigger value="read">{t.messages.read}</TabsTrigger>
        </TabsList>
      </Tabs>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.messages.noMessages}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <BulkActionToolbar
            allSelected={allSelected}
            pageCount={messages.length}
            selectedCount={selectedIds.size}
            actionValue={bulkAction}
            actions={[
              {
                value: "mark_read",
                label: locale === "fr" ? "Marquer comme lu" : "Mark as read",
              },
              {
                value: "mark_unread",
                label: locale === "fr" ? "Marquer comme non lu" : "Mark as unread",
              },
              {
                value: "delete",
                label: locale === "fr" ? "Supprimer" : "Delete",
              },
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

          {messages.map((message) => (
            <Card key={message.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      {message.subject || (locale === "fr" ? "(Sans sujet)" : "(No subject)")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {message.name} ({message.email})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedIds.has(message.id)}
                      onCheckedChange={(checked) => toggleSelection(message.id, checked === true)}
                    />
                    <Badge variant={message.read ? "secondary" : "default"}>
                      {message.read ? t.messages.read : t.messages.unread}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleString()}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!message.read && (
                    <Button size="sm" variant="outline" onClick={() => markAsRead(message.id)}>
                      <MailOpen className="mr-2 h-4 w-4" />
                      {t.messages.markAsRead}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteId(message.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t.messages.deleteMessage}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
