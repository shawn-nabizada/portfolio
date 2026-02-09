"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Upload, Trash2, Download } from "lucide-react";
import { getTranslations, type Locale, type Translations } from "@/lib/i18n";
import type { Resume } from "@/lib/types/database";
import { fetchJson, fetchMutation } from "@/lib/http/mutation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface ResumeSlotProps {
  language: "en" | "fr";
  label: string;
  locale: Locale;
  t: Pick<Translations, "resume" | "common">;
  item: Resume | null;
  onUpload: (language: "en" | "fr", file: File) => Promise<void>;
  onDelete: (language: "en" | "fr") => void;
}

function ResumeSlot({
  language,
  label,
  locale,
  t,
  item,
  onUpload,
  onDelete,
}: ResumeSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const dateLocale = locale === "fr" ? "fr-CA" : "en-CA";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onUpload(language, file);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {item ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{item.file_name}</p>
            <p className="text-muted-foreground">
              {t.resume.uploadedAt}{" "}
              {new Intl.DateTimeFormat(dateLocale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(item.uploaded_at))}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={item.file_url} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  {t.resume.open}
                </a>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(language)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t.common.delete}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.resume.noResume}</p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? t.resume.uploading : item ? t.resume.replace : t.resume.upload}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminResumePage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteLanguage, setDeleteLanguage] = useState<"en" | "fr" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchJson<Resume[]>("/api/resume");
      setResumes(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    } finally {
      setIsLoading(false);
    }
  }, [t.common.errorOccurred]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onUpload = async (language: "en" | "fr", file: File) => {
    try {
      const formData = new FormData();
      formData.append("language", language);
      formData.append("file", file);

      await fetchMutation("/api/resume", {
        method: "POST",
        body: formData,
      });

      toast.success(t.common.savedSuccessfully);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
      throw error;
    }
  };

  const requestDelete = (language: "en" | "fr") => {
    setDeleteLanguage(language);
  };

  const confirmDelete = async () => {
    if (!deleteLanguage) return;

    setIsDeleting(true);
    try {
      await fetchMutation(`/api/resume?language=${deleteLanguage}`, {
        method: "DELETE",
      });
      toast.success(t.common.deletedSuccessfully);
      setDeleteLanguage(null);
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.common.errorOccurred);
    } finally {
      setIsDeleting(false);
    }
  };

  const englishResume = resumes.find((item) => item.language === "en") || null;
  const frenchResume = resumes.find((item) => item.language === "fr") || null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.resume.title}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <ResumeSlot
          language="en"
          label={t.resume.englishLabel}
          locale={locale as Locale}
          t={{ resume: t.resume, common: t.common }}
          item={englishResume}
          onUpload={onUpload}
          onDelete={requestDelete}
        />
        <ResumeSlot
          language="fr"
          label={t.resume.frenchLabel}
          locale={locale as Locale}
          t={{ resume: t.resume, common: t.common }}
          item={frenchResume}
          onUpload={onUpload}
          onDelete={requestDelete}
        />
      </div>

      <AlertDialog
        open={Boolean(deleteLanguage)}
        onOpenChange={(open) => {
          if (!open) setDeleteLanguage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.areYouSure}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.common.cannotBeUndone}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
