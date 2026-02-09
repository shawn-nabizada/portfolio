import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidation-secret");
  if (!secret || secret !== process.env.REVALIDATION_SECRET) {
    return apiError("Invalid secret", 401);
  }

  revalidatePortfolioPages();
  return apiSuccess({ revalidated: true });
}
