"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Users,
  FileText,
  Film,
  Flag,
  ShieldCheck,
  Radio,
  Calendar,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type StatsResponse = {
  stats: {
    usersCount: number;
    postsCount: number;
    clipsCount: number;
    reportsPending: number;
    escrowHeld: number;
    livesActive: number;
    eventsCount: number;
  };
  success: boolean;
};

type ReportItem = {
  id: number;
  reporterId: string;
  entityType: string;
  entityId: string;
  reason: string;
  details: string;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  createdAt: string;
};

type ReportsResponse = {
  reports: ReportItem[];
  count: number;
  limit: number;
  offset: number;
  status: string;
};

const statsConfig: Array<{
  key: keyof StatsResponse["stats"];
  label: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}> = [
  {
    key: "usersCount",
    label: "Citizens",
    sub: "Sovereign IDs",
    icon: <Users className="w-4 h-4" />,
    accent: "emerald",
  },
  {
    key: "postsCount",
    label: "Dispatches",
    sub: "Pulses live",
    icon: <FileText className="w-4 h-4" />,
    accent: "emerald",
  },
  {
    key: "clipsCount",
    label: "Clips",
    sub: "KINARA Shorts",
    icon: <Film className="w-4 h-4" />,
    accent: "emerald",
  },
  {
    key: "reportsPending",
    label: "Reports Pending",
    sub: "Moderation queue",
    icon: <Flag className="w-4 h-4" />,
    accent: "amber",
  },
  {
    key: "escrowHeld",
    label: "Escrow Held",
    sub: "In vault",
    icon: <ShieldCheck className="w-4 h-4" />,
    accent: "amber",
  },
  {
    key: "livesActive",
    label: "Live Now",
    sub: "Voice & Video",
    icon: <Radio className="w-4 h-4" />,
    accent: "emerald",
  },
  {
    key: "eventsCount",
    label: "Events",
    sub: "Pan-African",
    icon: <Calendar className="w-4 h-4" />,
    accent: "emerald",
  },
];

function statusBadgeVariant(status: string) {
  switch (status) {
    case "pending":
      return "gold" as const;
    case "reviewed":
      return "indigo" as const;
    case "actioned":
      return "emerald" as const;
    case "dismissed":
      return "slate" as const;
    default:
      return "default" as const;
  }
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function AdminView() {
  const [activeTab, setActiveTab] = useState("overview");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    mutate: mutateStats,
  } = useSWR<StatsResponse>("/api/admin/stats", fetcher, {
    refreshInterval: 30000,
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const {
    data: reportsData,
    isLoading: reportsLoading,
    error: reportsError,
    mutate: mutateReports,
  } = useSWR<ReportsResponse>("/api/reports?status=pending&limit=20", fetcher, {
    refreshInterval: 30000,
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const stats = statsData?.stats;
  const reports = reportsData?.reports ?? [];

  const totalContent = (stats?.postsCount ?? 0) + (stats?.clipsCount ?? 0);
  const moderationLoad = stats ? Math.min(100, Math.round((stats.reportsPending / Math.max(1, totalContent / 100)) * 10) ) : 0;
  // Clamped 0-100 progress for visual — or just pending as % of arbitrary cap 50
  const moderationProgress = stats ? Math.min(100, Math.round((stats.reportsPending / 50) * 100)) : 0;
  const escrowProgress = stats ? Math.min(100, Math.round((stats.escrowHeld / Math.max(1, stats.escrowHeld + 10)) * 100)) : 0;

  async function handleStatusChange(id: number, status: "reviewed" | "actioned" | "dismissed") {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(j?.error || `Failed to ${status} report #${id}`);
        return;
      }
      toast.success(
        status === "reviewed" ? `Report #${id} marked as Reviewed` : status === "actioned" ? `Report #${id} actioned — enforcement logged` : `Report #${id} dismissed`
      );
      // Optimistically remove from pending list or update
      mutateReports(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            reports: prev.reports.filter((r) => r.id !== id),
            count: Math.max(0, prev.count - 1),
          };
        },
        { revalidate: false }
      );
      mutateStats();
      // Revalidate in background
      setTimeout(() => {
        mutateReports();
        mutateStats();
      }, 600);
    } catch {
      toast.error("Network error updating report");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="kinara-card rounded-3xl p-5 sm:p-6 border border-emerald-500/20 bg-gradient-to-r from-[#0d1c1a] via-[#0a1312] to-[#07100f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              Sovereign Admin
              <Badge variant="emerald" className="font-mono text-[10px]">TRUST OPS</Badge>
            </h1>
            <p className="text-xs text-slate-400 font-mono">SWR polling every 30s • escrow & moderation live</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              mutateStats();
              mutateReports();
              toast.info("Refreshing sovereign metrics…");
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Badge variant="gold" className="hidden sm:inline-flex">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "queue", label: `Reports Queue${stats?.reportsPending ? ` • ${stats.reportsPending}` : ""}` },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* Stats Grid — always visible, but queue tab emphasizes reports */}
      <div className={activeTab === "queue" ? "opacity-90" : ""}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-emerald-500" />
            Sovereign Metrics
          </h2>
          <span className="text-[11px] font-mono text-slate-500">{stats ? `${Object.values(stats).reduce((a, b) => a + b, 0).toLocaleString()} signals` : "loading…"}</span>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="kinara-card rounded-2xl p-4 border border-white/5 animate-pulse space-y-3">
                <div className="w-8 h-8 rounded-xl bg-white/5" />
                <div className="h-6 bg-white/10 rounded w-12" />
                <div className="h-3 bg-white/5 rounded w-20" />
              </div>
            ))}
          </div>
        ) : statsError ? (
          <Card className="border-red-500/20 bg-red-950/20 p-6 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
            <p className="text-sm font-bold text-white">Failed to load sovereign stats</p>
            <p className="text-xs text-slate-400">{String((statsError as Error)?.message || "Network error")}</p>
            <Button variant="secondary" size="sm" onClick={() => mutateStats()} className="mx-auto">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          </Card>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {statsConfig.map((c) => {
              const value = stats[c.key];
              const isAlert = c.key === "reportsPending" && value > 0;
              const isLive = c.key === "livesActive" && value > 0;
              return (
                <div
                  key={c.key}
                  className={`kinara-card rounded-2xl p-4 border flex flex-col gap-2 transition ${
                    isAlert
                      ? "border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-[#0e1b1b]"
                      : isLive
                        ? "border-rose-500/20 bg-gradient-to-br from-rose-950/20 to-[#0e1b1b]"
                        : "border-emerald-500/15 bg-[#0e1b1b]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border text-xs font-bold ${
                      c.accent === "amber"
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        : isLive
                          ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                          : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    {c.icon}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-black font-mono text-white leading-none">{value.toLocaleString()}</div>
                    <div className="text-xs font-bold text-slate-200 leading-tight">{c.label}</div>
                    <div className="text-[10px] font-mono text-slate-500">{c.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Progress row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <Card className="bg-black/20 border-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-amber-400" /> Moderation Load
                </span>
                <span className="text-[11px] font-mono text-amber-300">{moderationProgress}%</span>
              </div>
              <Progress value={moderationProgress} max={100} className="h-1.5" indicatorClassName="bg-amber-500" />
              <p className="text-[11px] text-slate-500 font-mono">{stats.reportsPending} pending • cap 50 for 100%</p>
            </Card>
            <Card className="bg-black/20 border-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Escrow Utilization
                </span>
                <span className="text-[11px] font-mono text-emerald-300">{escrowProgress}%</span>
              </div>
              <Progress value={escrowProgress} max={100} className="h-1.5" />
              <p className="text-[11px] text-slate-500 font-mono">{stats.escrowHeld} held in vault</p>
            </Card>
            <Card className="bg-black/20 border-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-400" /> Live Coverage
                </span>
                <span className="text-[11px] font-mono text-white">{stats.livesActive} active</span>
              </div>
              <Progress value={Math.min(100, stats.livesActive * 20)} max={100} className="h-1.5" indicatorClassName="bg-rose-500" />
              <p className="text-[11px] text-slate-500 font-mono">{stats.eventsCount} events • {stats.usersCount.toLocaleString()} citizens</p>
            </Card>
          </div>
        )}
      </div>

      {/* Reports Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-400" />
            Reports Queue
            <Badge variant={reports.length > 0 ? "gold" : "slate"} className="font-mono">
              {reportsData?.count ?? reports.length} pending
            </Badge>
          </h2>
          <span className="text-[11px] font-mono text-slate-500">limit 20 • status=pending • polling 30s</span>
        </div>

        {reportsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="kinara-card rounded-2xl p-4 border border-white/5 animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-2/3" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
                <div className="w-20 h-8 bg-white/5 rounded-xl" />
              </div>
            ))}
          </div>
        ) : reportsError ? (
          <Card className="border-red-500/20 bg-red-950/20 p-6 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
            <p className="text-sm font-bold text-white">Failed to load reports queue</p>
            <p className="text-xs text-slate-400">{String((reportsError as Error)?.message || "Network error")}</p>
            <Button variant="secondary" size="sm" onClick={() => mutateReports()} className="mx-auto">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-black/20 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-bold text-white">Queue clear — sovereign trust intact</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">No pending reports. All flagged entities have been reviewed. Polling continues every 30s.</p>
            <Button variant="secondary" size="sm" onClick={() => mutateReports()} className="mx-auto">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[1.2fr_1fr_0.9fr_1.6fr_0.7fr_1.6fr] gap-2 px-4 py-2 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              <span>Reporter</span>
              <span>Entity</span>
              <span>Reason</span>
              <span>Details</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {reports.map((r) => (
              <div
                key={r.id}
                className="kinara-card rounded-2xl p-4 border border-white/[0.06] hover:border-amber-500/20 transition space-y-3 md:space-y-0 md:grid md:grid-cols-[1.2fr_1fr_0.9fr_1.6fr_0.7fr_1.6fr] md:gap-3 md:items-center"
              >
                {/* Reporter */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-mono font-bold text-amber-300">{r.reporterId.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-white truncate" title={r.reporterId}>
                      {r.reporterId.slice(0, 12)}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /># {r.id} • {timeAgo(r.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Entity */}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white capitalize flex items-center gap-1.5">
                    <Eye className="w-3 h-3 text-slate-400" />
                    {r.entityType}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-300 truncate" title={r.entityId}>
                    {r.entityId.slice(0, 18)}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] font-bold text-slate-200 capitalize">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    {r.reason}
                  </span>
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed" title={r.details}>
                    {r.details?.trim() ? r.details : <span className="text-slate-500 italic">No details provided</span>}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <Badge variant={statusBadgeVariant(r.status)} className="capitalize font-mono text-[11px]">
                    {r.status}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!!updatingId}
                    onClick={() => handleStatusChange(r.id, "reviewed")}
                    aria-label={`Mark report ${r.id} as reviewed`}
                    className="text-[11px] h-8 px-3"
                  >
                    {updatingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    Review
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!!updatingId}
                    onClick={() => handleStatusChange(r.id, "actioned")}
                    aria-label={`Mark report ${r.id} as actioned`}
                    className="text-[11px] h-8 px-3"
                  >
                    {updatingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    Actioned
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!updatingId}
                    onClick={() => handleStatusChange(r.id, "dismissed")}
                    aria-label={`Dismiss report ${r.id}`}
                    className="text-[11px] h-8 px-3 border border-white/10 hover:bg-white/5"
                  >
                    {updatingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}

            <p className="text-center text-[11px] font-mono text-slate-500 pt-2">
              Showing {reports.length} of {reportsData?.count ?? reports.length} pending • Auto-refreshing every 30s via SWR
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
