import { headers } from "next/headers";
import { getTranslations, type Locale } from "@/lib/i18n";
import { AdminLayoutWrapper } from "@/components/admin/admin-layout-wrapper";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const requestHeaders = await headers();
  const renderWithoutShell = requestHeaders.get("x-admin-forbidden-page") === "1";
  const t = getTranslations(locale as Locale);

  return (
    <AdminLayoutWrapper
      locale={locale}
      renderWithoutShell={renderWithoutShell}
      translations={{
        dashboard: t.admin.dashboard,
        skills: t.admin.skills,
        projects: t.admin.projects,
        experience: t.admin.experience,
        education: t.admin.education,
        hobbies: t.admin.hobbies,
        testimonials: t.admin.testimonials,
        messages: t.admin.messages,
        resume: t.admin.resume,
        socialLinks: t.admin.socialLinks,
        settings: t.admin.settings,
        logout: t.admin.logout,
      }}
    >
      {children}
    </AdminLayoutWrapper>
  );
}
