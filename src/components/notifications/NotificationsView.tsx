"use client";

import React, { useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  AtSign,
  Heart,
  MessageSquare,
  UserPlus,
  ShieldCheck,
  Sparkles,
  Video,
  Briefcase,
  Loader2,
  Eye,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface NotificationItem {
  id: number;
  userId: string;
  actorId: string | null;
  actorName: string;
  actorAvatar: string;
  type: string;
  entityType: string;
  entityId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

type NotifTab = "All" | "Unread" | "Mentions";

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

function typeIcon(type: string) {
  switch (type) {
    case "like": return <Heart className="w-3.5 h-3.5 text-rose-400" />;
    case "comment": return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
    case "follow": return <UserPlus className="w-3.5 h-3.5 text-amber-400" />;
    case "mention": return <AtSign className="w-3.5 h-3.5 text-sky-400" />;
    case "escrow": return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    case "live": return <Video className="w-3.5 h-3.5 text-rose-400" />;
    case "job": return <Briefcase className="w-3.5 h-3.5 text-amber-400" />;
    case "clip": return <Sparkles className="w-3.5 h-3.5 text-violet-400" />;
    default: return <Bell className="w-3.5 h-3.5 text-slate-400" />;
  }
}

interface NotificationsViewProps {
  onNavigate?: (view: string, extra?: unknown) => void;
}

export function NotificationsView({ onNavigate: _onNavigate }: NotificationsViewProps) {
  const [activeTab, setActiveTab] = useState<NotifTab>("All");

  const unreadOnly = activeTab === "Unread";
  const typeFilter = activeTab === "Mentions" ? "mention" : "";

  // SWR polling every 15s as requested
  const { data, isLoading, mutate } = useSWR<{ notifications: NotificationItem[]; unreadCount: number }>(
    `/api/notifications?unreadOnly=false`,
    fetcher,
    { refreshInterval: 15000, keepPreviousData: true }
  );

  const allNotifications: NotificationItem[] = data?.notifications ?? [];
  const unreadCount: number = data?.unreadCount ?? allNotifications.filter((n) => !n.read).length;

  // Client-side tab filtering (server supports unreadOnly & type but we keep single fetch + polling)
  const filtered = allNotifications.filter((n) => {
    if (activeTab === "Unread") return !n.read;
    if (activeTab === "Mentions") return n.type === "mention";
    return true;
  });

  // Optionally reflect typeFilter/unreadOnly via alternate fetch when tab changes - keep simple: client filter for snappy UX

  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  async function handleMarkAllRead() {
    if (unreadCount === 0) {
      toast.info("No unread notifications");
      return;
    }
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: "all" }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(j?.error || "Failed to mark all read");
        return;
      }
      toast.success("All caught up ✓");
      mutate();
    } catch {
      toast.error("Network error");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleMarkSingle(n: NotificationItem) {
    if (n.read) return;
    setMarkingId(n.id);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(j?.error || "Failed to mark read");
        return;
      }
      mutate(
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
            unreadCount: Math.max(0, (prev.unreadCount ?? 1) - 1),
          };
        },
        { revalidate: false }
      );
    } catch {
      toast.error("Network error");
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="kinara-card rounded-3xl p-5 sm:p-6 border border-emerald-500/20 bg-gradient-to-r from-[#0d1c1a] to-[#0a1312] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950">
            <Bell className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[11px] font-black font-mono">
                  {unreadCount}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {unreadCount > 0 ? `${unreadCount} unread • polling every 15s` : "All caught up • live polling every 15s"}
            </p>
          </div>
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={markingAll || unreadCount === 0}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs flex items-center gap-1.5 transition"
        >
          {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
          Mark all read
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-black/30 rounded-2xl p-1 border border-white/5 w-fit">
        {(["All", "Unread", "Mentions"] as NotifTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === t ? "bg-emerald-600 text-black" : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {t === "All" && <Eye className="w-3 h-3" />}
            {t === "Mentions" && <AtSign className="w-3 h-3" />}
            {t === "Unread" && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            {t}
            {t === "Unread" && unreadCount > 0 && ` (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="kinara-card p-4 rounded-2xl border border-white/5 animate-pulse flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="kinara-card p-10 rounded-3xl border border-dashed border-white/10 text-center space-y-2">
            <Bell className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm text-white font-semibold">
              {activeTab === "Unread" ? "No unread notifications" : activeTab === "Mentions" ? "No mentions yet" : "No notifications yet"}
            </p>
            <p className="text-xs text-slate-400">When someone interacts with you, it will appear here.</p>
          </div>
        ) : (
          filtered.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => handleMarkSingle(n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleMarkSingle(n)}
              className={`kinara-card p-4 rounded-2xl border flex items-center gap-3 cursor-pointer transition group ${
                !n.read ? "border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/40" : "border-white/[0.06] hover:border-white/10"
              }`}
            >
              <div className="relative shrink-0">
                <Image src={n.actorAvatar} alt={n.actorName} width={40} height={40} className="w-10 h-10 rounded-xl object-cover ring-1 ring-emerald-500/20" unoptimized />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#060b0b] border border-white/10 flex items-center justify-center">
                  {typeIcon(n.type)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-snug flex flex-wrap items-baseline gap-1">
                  <span className="font-bold text-white">{n.actorName}</span>
                  <span className="text-slate-300">{n.message}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                    {typeIcon(n.type)}
                    <span className="capitalize">{n.type}</span>
                    <span>•</span>
                    <span>{timeAgo(n.createdAt)}</span>
                  </span>
                  <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded border border-white/5 text-slate-400">{n.entityType} • {n.entityId.slice(0, 12)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!n.read && markingId !== n.id && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow shadow-emerald-500/30" aria-label="unread" />}
                {markingId === n.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                {!n.read && markingId !== n.id && <span className="hidden sm:inline text-[11px] font-bold text-emerald-400 group-hover:underline">Mark read</span>}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <p className="text-center text-[11px] font-mono text-slate-500">Auto-refreshing every 15s via SWR polling • {filtered.length} shown</p>
    </div>
  );
}
