import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

function extractStoragePath(fileUrl: string) {
  const marker = "/object/public/resumes/";
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(fileUrl.slice(idx + marker.length));
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .order("uploaded_at", { ascending: false });

  if (error) {
    return apiError(error.message);
  }

  const latestByLanguage = new Map<string, (typeof data)[number]>();
  for (const row of data ?? []) {
    if (!latestByLanguage.has(row.language)) {
      latestByLanguage.set(row.language, row);
    }
  }

  return apiSuccess(Array.from(latestByLanguage.values()));
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const formData = await request.formData();
  const languageValue = formData.get("language");
  const fileValue = formData.get("file");

  if (languageValue !== "en" && languageValue !== "fr") {
    return apiError("language must be en or fr", 400);
  }

  if (!(fileValue instanceof File)) {
    return apiError("file is required", 400);
  }

  const language = languageValue;
  const file = fileValue;

  const adminClient = createAdminClient();

  const { data: existingRows, error: existingError } = await adminClient
    .from("resumes")
    .select("id, file_url")
    .eq("language", language);

  if (existingError) {
    return apiError(existingError.message);
  }

  const safeFileName = file.name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
  const finalFileName = safeFileName || `resume-${language}.pdf`;
  const filePath = `${language}/${Date.now()}-${finalFileName}`;

  const { error: uploadError } = await adminClient.storage
    .from("resumes")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    return apiError(uploadError.message);
  }

  const { data: publicUrlData } = adminClient.storage
    .from("resumes")
    .getPublicUrl(filePath);

  const { data, error } = await adminClient
    .from("resumes")
    .insert({
      language,
      file_url: publicUrlData.publicUrl,
      file_name: file.name,
    })
    .select()
    .single();

  if (error) {
    const { error: rollbackStorageError } = await adminClient.storage
      .from("resumes")
      .remove([filePath]);
    if (rollbackStorageError) {
      console.error("Failed to rollback uploaded resume after DB insert error", {
        filePath,
        rollbackStorageError,
      });
    }
    return apiError(error.message);
  }

  if (existingRows && existingRows.length > 0) {
    const oldRowIds = existingRows.map((row) => row.id);
    const pathsToRemove = existingRows
      .map((row) => extractStoragePath(row.file_url))
      .filter((value): value is string => Boolean(value));

    const { error: oldRowsDeleteError } = await adminClient
      .from("resumes")
      .delete()
      .in("id", oldRowIds);
    if (oldRowsDeleteError) {
      console.error("Failed to delete old resume rows after successful replacement", {
        language,
        oldRowIds,
        oldRowsDeleteError,
      });
    }

    if (pathsToRemove.length > 0) {
      const { error: oldStorageDeleteError } = await adminClient.storage
        .from("resumes")
        .remove(pathsToRemove);
      if (oldStorageDeleteError) {
        console.error("Failed to delete old resume files after successful replacement", {
          language,
          pathsToRemove,
          oldStorageDeleteError,
        });
      }
    }
  }

  revalidatePortfolioPages();
  return apiSuccess(data, 201);
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const language = request.nextUrl.searchParams.get("language");
  if (language !== "en" && language !== "fr") {
    return apiError("language query param must be en or fr", 400);
  }

  const adminClient = createAdminClient();

  const { data: rows, error: fetchError } = await adminClient
    .from("resumes")
    .select("id, file_url")
    .eq("language", language);

  if (fetchError) {
    return apiError(fetchError.message);
  }

  if (!rows || rows.length === 0) {
    return apiSuccess({ success: true });
  }

  const pathsToRemove = rows
    .map((row) => extractStoragePath(row.file_url))
    .filter((value): value is string => Boolean(value));

  if (pathsToRemove.length > 0) {
    await adminClient.storage.from("resumes").remove(pathsToRemove);
  }

  const { error: deleteError } = await adminClient
    .from("resumes")
    .delete()
    .eq("language", language);

  if (deleteError) {
    return apiError(deleteError.message);
  }

  revalidatePortfolioPages();
  return apiSuccess({ success: true });
}
