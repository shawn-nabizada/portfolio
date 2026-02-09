"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { MailOpen, Trash2 } from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import type { ContactMessage } from "@/lib/types/database";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { toast } from "sonner";
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

  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<MessageFilter>(filterFromUrl);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async (activeFilter: MessageFilter) => {
    setIsLoading(true);
    try {
      const endpoint =
        activeFilter === "all"
          ? "/api/messages"
          : `/api/messages?read=${activeFilter === "read"}`;
      const data = await fetchJson<ContactMessage[]>(endpoint);
      setMessages(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  }, [t.common.errorOccurred]);

  useEffect(() => {
    setFilter(filterFromUrl);
  }, [filterFromUrl]);

  useEffect(() => {
    fetchData(filter);
  }, [fetchData, filter]);

  const updateFilter = (nextFilter: MessageFilter) => {
    setFilter(nextFilter);
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", nextFilter);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchMutation(`/api/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      toast.success(t.common.savedSuccessfully);
      await fetchData(filter);
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
      await fetchData(filter);
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
