"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

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

interface AdminShellProps {
  locale: string;
  translations: AdminTranslations;
  children: React.ReactNode;
}

export function AdminShell({ locale, translations, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AdminHeader
        locale={locale}
        onMenuToggle={() => setSidebarOpen(true)}
      />

      <div className="relative flex-1 overflow-hidden">
        {/* Desktop sidebar overlay */}
        <aside className="group absolute inset-y-0 left-0 z-30 hidden overflow-hidden border-r bg-background transition-[width] duration-300 ease-out lg:flex lg:w-20 lg:flex-col lg:hover:w-64 lg:hover:shadow-xl">
          <AdminSidebar locale={locale} translations={translations} collapsible />
        </aside>

        {/* Mobile sidebar (sheet) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AdminSidebar
              locale={locale}
              translations={translations}
              onNavigate={() => setSidebarOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main className="h-full overflow-y-auto p-4 lg:pr-12 lg:pl-32">
          {children}
        </main>
      </div>
    </div>
  );
}
