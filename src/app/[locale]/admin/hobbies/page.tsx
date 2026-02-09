"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Plus,
  Pencil,
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
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { toast } from "sonner";

// ─── Hobby Dialog ───────────────────────────────────────────────────────
interface HobbyFormData {
  name_en: string;
  name_fr: string;
  icon: string;
  order: number;
}

function HobbyDialog({
  open,
  onOpenChange,
  hobby,
  onSave,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hobby: Hobby | null;
  onSave: (data: HobbyFormData) => Promise<void>;
  t: ReturnType<typeof getTranslations>;
}) {
  const [form, setForm] = useState<HobbyFormData>({
    name_en: "",
    name_fr: "",
    icon: "",
    order: 0,
  });
  const [iconSearch, setIconSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hobby) {
      setForm({
        name_en: hobby.name_en,
        name_fr: hobby.name_fr,
        icon: hobby.icon || "",
        order: hobby.order,
      });
      setIconSearch(hobby.icon || "");
    } else {
      setForm({
        name_en: "",
        name_fr: "",
        icon: "",
        order: 0,
      });
      setIconSearch("");
    }
  }, [hobby, open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label htmlFor="hobby-name-fr">
              {t.hobbies.hobbyName} ({t.common.french})
            </Label>
            <Input
              id="hobby-name-fr"
              value={form.name_fr}
              onChange={(e) =>
                setForm((f) => ({ ...f, name_fr: e.target.value }))
              }
              required
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
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);

  // Data
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHobby, setEditingHobby] = useState<Hobby | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const data = await fetchJson<Hobby[]>("/api/hobbies");
      setHobbies(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load hobbies data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      await fetchData();
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

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await fetchMutation(`/api/hobbies/${deleteTargetId}`, { method: "DELETE" });
      toast.success(t.common.deletedSuccessfully);
      setDeleteTargetId(null);
      await fetchData();
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {t.hobbies.title}
        </h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t.hobbies.addHobby}
        </Button>
      </div>

      {/* Hobbies Grid */}
      {hobbies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.common.noResults}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hobbies.map((hobby) => {
            const Icon = getHobbyIcon(hobby.icon);
            return (
              <Card key={hobby.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {hobby.name_en}
                    </div>
                  </CardTitle>
                <div className="flex gap-1">
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
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {hobby.name_fr}
                  </p>
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
      )}

      {/* ─── Dialogs ───────────────────────────────────────────────── */}
      <HobbyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hobby={editingHobby}
        onSave={handleSave}
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
