"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Lightbulb,
  FolderKanban,
  Mail,
  MessageSquareQuote,
  Briefcase,
  GraduationCap,
  Heart,
  FileText,
  Share2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalSkills: number;
  totalProjects: number;
  unreadMessages: number;
  pendingTestimonials: number;
}

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  isLoading: boolean;
}

function KpiCard({ icon: Icon, label, value, isLoading }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-0">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <span className="text-3xl font-bold tracking-tight">{value}</span>
          )}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const quickLinks = [
  { key: "skills" as const, href: "/admin/skills", icon: Lightbulb },
  { key: "projects" as const, href: "/admin/projects", icon: FolderKanban },
  { key: "experience" as const, href: "/admin/experience", icon: Briefcase },
  { key: "education" as const, href: "/admin/education", icon: GraduationCap },
  { key: "hobbies" as const, href: "/admin/hobbies", icon: Heart },
  {
    key: "testimonials" as const,
    href: "/admin/testimonials",
    icon: MessageSquareQuote,
  },
  { key: "messages" as const, href: "/admin/messages", icon: Mail },
  { key: "resume" as const, href: "/admin/resume", icon: FileText },
  { key: "socialLinks" as const, href: "/admin/social-links", icon: Share2 },
  { key: "settings" as const, href: "/admin/settings", icon: Settings },
];

export default function AdminDashboardPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Stats will remain null; cards show 0
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t.dashboard.title}
        </h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          icon={Lightbulb}
          label={t.dashboard.totalSkills}
          value={stats?.totalSkills ?? 0}
          isLoading={isLoading}
        />
        <KpiCard
          icon={FolderKanban}
          label={t.dashboard.totalProjects}
          value={stats?.totalProjects ?? 0}
          isLoading={isLoading}
        />
        <KpiCard
          icon={Mail}
          label={t.dashboard.unreadMessages}
          value={stats?.unreadMessages ?? 0}
          isLoading={isLoading}
        />
        <KpiCard
          icon={MessageSquareQuote}
          label={t.dashboard.pendingTestimonials}
          value={stats?.pendingTestimonials ?? 0}
          isLoading={isLoading}
        />
      </div>

      {/* Quick Links */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t.dashboard.quickLinks}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Button
                key={link.key}
                variant="outline"
                className="h-auto justify-start gap-3 px-4 py-3"
                asChild
              >
                <Link href={`/${locale}${link.href}`}>
                  <Icon className="h-4 w-4" />
                  {t.admin[link.key]}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
