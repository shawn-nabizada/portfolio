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
  children: React.ReactNode;
}

export function AdminLayoutWrapper({
  locale,
  translations,
  children,
}: AdminLayoutWrapperProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === `/${locale}/admin/login`;

  // Login page renders without the admin shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // All other admin pages get the sidebar + header shell
  return (
    <AdminShell locale={locale} translations={translations}>
      {children}
    </AdminShell>
  );
}
