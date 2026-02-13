"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  FolderKanban,
  Briefcase,
  GraduationCap,
  Heart,
  MessageSquareQuote,
  Mail,
  FileText,
  Share2,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface SidebarTranslations {
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

interface SidebarProps {
  locale: string;
  translations: SidebarTranslations;
  onNavigate?: () => void;
  collapsible?: boolean;
}

const navItems = [
  { key: "dashboard" as const, href: "/admin/dashboard", icon: LayoutDashboard },
  { key: "skills" as const, href: "/admin/skills", icon: Lightbulb },
  { key: "projects" as const, href: "/admin/projects", icon: FolderKanban },
  { key: "experience" as const, href: "/admin/experience", icon: Briefcase },
  { key: "education" as const, href: "/admin/education", icon: GraduationCap },
  { key: "hobbies" as const, href: "/admin/hobbies", icon: Heart },
  { key: "testimonials" as const, href: "/admin/testimonials", icon: MessageSquareQuote },
  { key: "messages" as const, href: "/admin/messages", icon: Mail },
  { key: "resume" as const, href: "/admin/resume", icon: FileText },
  { key: "socialLinks" as const, href: "/admin/social-links", icon: Share2 },
  { key: "settings" as const, href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({
  locale,
  translations,
  onNavigate,
  collapsible = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const labelClass = collapsible
    ? "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out lg:max-w-0 lg:opacity-0 lg:group-hover:max-w-[12rem] lg:group-hover:opacity-100"
    : "";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const fullHref = `/${locale}${item.href}`;
            const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
            const Icon = item.icon;

            return (
              <li key={item.key}>
                <Link
                  href={fullHref}
                  onClick={onNavigate}
                  className={cn(
                    "rounded-md py-2 text-sm font-medium transition-colors duration-200",
                    collapsible
                      ? "lg:grid lg:grid-cols-[3.5rem_1fr] lg:items-center lg:px-0"
                      : "flex items-center gap-3 px-3",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center",
                      collapsible && "lg:justify-self-center"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </span>
                  <span className={cn(labelClass, collapsible && "lg:justify-self-start")}>
                    {translations[item.key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className={cn(
            "text-muted-foreground transition-colors duration-200 hover:text-destructive",
            collapsible
              ? "lg:grid lg:w-full lg:grid-cols-[3.5rem_1fr] lg:items-center lg:px-0"
              : "w-full justify-start gap-3"
          )}
          onClick={handleLogout}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center",
              collapsible && "lg:justify-self-center"
            )}
          >
            <LogOut className="h-4 w-4" />
          </span>
          <span className={cn(labelClass, collapsible && "lg:justify-self-start")}>
            {translations.logout}
          </span>
        </Button>
      </div>
    </div>
  );
}
