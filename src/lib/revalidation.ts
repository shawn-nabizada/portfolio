import { revalidatePath, revalidateTag } from "next/cache";
import type { Locale } from "@/lib/i18n";

const SUPPORTED_LOCALES: Locale[] = ["en", "fr"];
const PORTFOLIO_CACHE_TAG = "portfolio-public";

export function revalidatePortfolioPages() {
  for (const locale of SUPPORTED_LOCALES) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/admin`);
  }
  revalidateTag(PORTFOLIO_CACHE_TAG, "max");
}
