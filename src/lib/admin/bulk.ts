import { NextRequest } from "next/server";

export interface ParsedBulkRequest {
  action: string;
  ids: string[];
}

export async function parseBulkRequest(
  request: NextRequest
): Promise<ParsedBulkRequest | { error: string; status: number }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "invalid json body", status: 400 };
  }

  if (!body || typeof body !== "object") {
    return { error: "invalid request body", status: 400 };
  }

  const actionValue = (body as { action?: unknown }).action;
  const idsValue = (body as { ids?: unknown }).ids;

  const action = typeof actionValue === "string" ? actionValue : "";
  const ids = Array.isArray(idsValue)
    ? Array.from(new Set(idsValue.filter((id): id is string => typeof id === "string")))
    : [];

  if (!action) {
    return { error: "action is required", status: 400 };
  }

  if (ids.length === 0) {
    return { error: "ids must contain at least one id", status: 400 };
  }

  return { action, ids };
}
