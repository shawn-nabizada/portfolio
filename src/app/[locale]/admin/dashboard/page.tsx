"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Lightbulb,
  FolderKanban,
  Mail,
  MessageSquareQuote,
  Eye,
  Download,
  type LucideIcon,
} from "lucide-react";
import { getTranslations, type Locale } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/http/mutation";
import { toast } from "sonner";

interface DashboardStats {
  totalSkills: number;
  totalProjects: number;
  unreadMessages: number;
  pendingTestimonials: number;
  portfolioViews: number;
  resumeDownloads: number;
}

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  isLoading: boolean;
  href?: string;
}

function KpiCard({ icon: Icon, label, value, isLoading, href }: KpiCardProps) {
  const card = (
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

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="block rounded-xl transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {card}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = getTranslations(locale as Locale);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await fetchJson<DashboardStats>("/api/admin/stats");
        setStats(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load dashboard stats";
        toast.error(message);
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
          icon={Eye}
          label={t.dashboard.portfolioViews}
          value={stats?.portfolioViews ?? 0}
          isLoading={isLoading}
        />
        <KpiCard
          icon={Download}
          label={t.dashboard.resumeDownloads}
          value={stats?.resumeDownloads ?? 0}
          isLoading={isLoading}
        />
        <KpiCard
          icon={Lightbulb}
          label={t.dashboard.totalSkills}
          value={stats?.totalSkills ?? 0}
          isLoading={isLoading}
          href={`/${locale}/admin/skills`}
        />
        <KpiCard
          icon={FolderKanban}
          label={t.dashboard.totalProjects}
          value={stats?.totalProjects ?? 0}
          isLoading={isLoading}
          href={`/${locale}/admin/projects`}
        />
        <KpiCard
          icon={Mail}
          label={t.dashboard.unreadMessages}
          value={stats?.unreadMessages ?? 0}
          isLoading={isLoading}
          href={`/${locale}/admin/messages?filter=unread`}
        />
        <KpiCard
          icon={MessageSquareQuote}
          label={t.dashboard.pendingTestimonials}
          value={stats?.pendingTestimonials ?? 0}
          isLoading={isLoading}
          href={`/${locale}/admin/testimonials?filter=pending`}
        />
      </div>

    </div>
  );
}
