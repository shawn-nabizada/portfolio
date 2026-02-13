import Link from "next/link";
import { getTranslations, type Locale } from "@/lib/i18n";

export default async function AdminForbiddenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale as Locale);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="terminal-card w-full max-w-xl space-y-4 rounded-xl p-6 text-center">
        <p className="text-sm font-medium text-destructive">403</p>
        <h1 className="terminal-heading text-2xl font-semibold text-foreground">
          {t.admin.forbiddenTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{t.admin.forbiddenDescription}</p>
        <Link href={`/${locale}`} className="terminal-btn inline-flex items-center justify-center">
          {t.admin.forbiddenBackToPublic}
        </Link>
      </div>
    </div>
  );
}
