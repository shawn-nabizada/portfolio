"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

interface AdminTranslations {
  dashboard: string;
  skills: string;
  projects: string;
  experience: string;
  education: string;
  hobbies: string;
  testimonials: string;
  messages: string;
  resume: string;
  socialLinks: string;
  settings: string;
  logout: string;
}

interface AdminLayoutWrapperProps {
  locale: string;
  translations: AdminTranslations;
  renderWithoutShell?: boolean;
  children: React.ReactNode;
}

export function AdminLayoutWrapper({
  locale,
  translations,
  renderWithoutShell = false,
  children,
}: AdminLayoutWrapperProps) {
  const pathname = usePathname();
  const isForbiddenPage = pathname === `/${locale}/admin/forbidden`;

  if (renderWithoutShell || isForbiddenPage) {
    return <>{children}</>;
  }

  return (
    <AdminShell locale={locale} translations={translations}>
      {children}
    </AdminShell>
  );
}
