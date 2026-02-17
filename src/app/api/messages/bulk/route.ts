import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { parseBulkRequest } from "@/lib/admin/bulk";

const ACTIONS = ["mark_read", "mark_unread", "delete"] as const;

type MessageBulkAction = (typeof ACTIONS)[number];

function isMessageBulkAction(value: string): value is MessageBulkAction {
  return ACTIONS.includes(value as MessageBulkAction);
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const parsed = await parseBulkRequest(request);
  if ("error" in parsed) {
    return apiError(parsed.error, parsed.status);
  }

  if (!isMessageBulkAction(parsed.action)) {
    return apiError("unsupported bulk action", 400);
  }

  const adminClient = createAdminClient();

  if (parsed.action === "delete") {
    const { data, error } = await adminClient
      .from("contact_messages")
      .delete()
      .in("id", parsed.ids)
      .select("id");

    if (error) {
      return apiError(error.message);
    }

    return apiSuccess({ success: true, affected: data?.length ?? 0 });
  }

  const read = parsed.action === "mark_read";
  const { data, error } = await adminClient
    .from("contact_messages")
    .update({ read })
    .in("id", parsed.ids)
    .select("id");

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess({ success: true, affected: data?.length ?? 0 });
}
