import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function resolveAvatarExtension(file: File): string | null {
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const formData = await request.formData();
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    return apiError("file is required", 400);
  }

  const file = fileValue;
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return apiError("Only PNG, JPG, or WebP images are allowed", 400);
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return apiError("Avatar must be 2MB or smaller", 400);
  }

  const extension = resolveAvatarExtension(file);
  if (!extension) {
    return apiError("Could not determine image extension", 400);
  }

  const adminClient = createAdminClient();
  const userId = adminCheck.user.id;
  const folderPath = `profiles/${userId}`;
  const filePath = `${folderPath}/avatar-${Date.now()}.${extension}`;

  const { data: existingFiles, error: listError } = await adminClient.storage
    .from("avatars")
    .list(folderPath, { limit: 100 });

  if (listError) {
    return apiError(listError.message);
  }

  const oldPaths = (existingFiles ?? [])
    .filter((item) => item.name)
    .map((item) => `${folderPath}/${item.name}`);

  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    return apiError(uploadError.message);
  }

  const { data: publicUrlData } = adminClient.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const avatarUrl = publicUrlData.publicUrl;
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: userId,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (profileError) {
    const { error: rollbackError } = await adminClient.storage
      .from("avatars")
      .remove([filePath]);
    if (rollbackError) {
      console.error("Failed to rollback uploaded avatar after profile update error", {
        filePath,
        rollbackError,
      });
    }

    return apiError(profileError.message);
  }

  const stalePaths = oldPaths.filter((path) => path !== filePath);
  if (stalePaths.length > 0) {
    const { error: staleRemoveError } = await adminClient.storage
      .from("avatars")
      .remove(stalePaths);
    if (staleRemoveError) {
      console.error("Failed to delete old avatar files after successful upload", {
        stalePaths,
        staleRemoveError,
      });
    }
  }

  revalidatePortfolioPages();
  return apiSuccess(profile);
}
