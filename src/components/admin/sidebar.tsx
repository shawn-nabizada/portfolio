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

export function AdminSidebar({ locale, translations, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/admin/login`);
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo / Title */}
      <div className="flex h-16 items-center border-b px-6">
        <Link
          href={`/${locale}/admin/dashboard`}
          className="flex items-center gap-2 font-semibold text-lg"
          onClick={onNavigate}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Admin</span>
        </Link>
      </div>

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
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {translations[item.key]}
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
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {translations.logout}
        </Button>
      </div>
    </div>
  );
}
