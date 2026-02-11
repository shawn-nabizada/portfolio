"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { MailOpen, Trash2 } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { ContactMessage } from "@/lib/types/database";
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

const FILTERS = ["all", "unread", "read"] as const;
type MessageFilter = (typeof FILTERS)[number];
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function resolveFilter(value: string | null): MessageFilter {
  if (value && FILTERS.includes(value as MessageFilter)) {
    return value as MessageFilter;
  }
  return "all";
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

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<MessageFilter>(filterFromUrl);
  const [page, setPage] = useState(pageFromUrl);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async (activeFilter: MessageFilter, activePage: number) => {
    setIsLoading(true);
    try {
      const endpointParams = new URLSearchParams();
      if (activeFilter !== "all") {
        endpointParams.set("read", String(activeFilter === "read"));
      }
      endpointParams.set("page", String(activePage));
      endpointParams.set("pageSize", String(PAGE_SIZE));

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
  }, [t.common.errorOccurred]);

  useEffect(() => {
    setFilter(filterFromUrl);
  }, [filterFromUrl]);

  useEffect(() => {
    setPage(pageFromUrl);
  }, [pageFromUrl]);

  useEffect(() => {
    fetchData(filter, page);
  }, [fetchData, filter, page]);

  const updateFilter = (nextFilter: MessageFilter) => {
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

  const refreshAfterMutation = async () => {
    const data = await fetchData(filter, page);
    if (data && data.items.length === 0 && data.total > 0 && page > 1) {
      updatePage(page - 1);
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
      <h1 className="text-3xl font-bold tracking-tight">{t.messages.title}</h1>

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
                  <Badge variant={message.read ? "secondary" : "default"}>
                    {message.read ? t.messages.read : t.messages.unread}
                  </Badge>
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
