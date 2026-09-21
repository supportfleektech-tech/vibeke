"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import useSWR from "swr";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Bookmark,
  BookmarkCheck,
  Trash2,
  Search,
  Compass,
  FileText,
  Film,
  ShoppingBag,
  Briefcase,
  LayoutGrid,
  List,
  Sparkles,
  Loader2,
  Heart,
  Eye,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type BookmarkTab = "All" | "Post" | "Clip" | "Marketplace" | "Job";
type ViewMode = "grid" | "list";

interface BookmarkItem {
  id: number;
  userId: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

interface BookmarksViewProps {
  onNavigate?: (view: string, extra?: unknown) => void;
}

export function BookmarksView({ onNavigate }: BookmarksViewProps) {
  const [activeTab, setActiveTab] = useState<BookmarkTab>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [removingId, setRemovingId] = useState<number | null>(null);

  const entityParam = activeTab === "All" ? "" : `?entityType=${activeTab.toLowerCase()}`;
  const swrKey = `/api/bookmarks${entityParam}`;

  const { data, isLoading, mutate } = useSWR<{ bookmarks: BookmarkItem[]; data: BookmarkItem[] }>(swrKey, fetcher, {
    keepPreviousData: true,
  });

  const bookmarks: BookmarkItem[] = data?.bookmarks ?? data?.data ?? [];

  const tabs: BookmarkTab[] = ["All", "Post", "Clip", "Marketplace", "Job"];

  async function handleToggle(b: BookmarkItem) {
    setRemovingId(b.id);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: b.entityType, entityId: b.entityId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(j?.error || "Failed to toggle bookmark");
        return;
      }
      // j.bookmarked === false means removed
      if (j.bookmarked === false) {
        toast.success("Removed from bookmarks");
      } else {
        toast.success("Bookmark updated");
      }
      mutate();
    } catch {
      toast.error("Network error");
    } finally {
      setRemovingId(null);
    }
  }

  const emptyMessage = useMemo(() => {
    if (activeTab === "All") return "No bookmarks yet. Save posts, clips, drops, and roles to revisit them sovereign-fast.";
    return `No ${activeTab.toLowerCase()} bookmarks yet.`;
  }, [activeTab]);

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="kinara-card rounded-3xl p-5 sm:p-6 border border-emerald-500/20 bg-gradient-to-r from-[#0d1c1a] via-[#0a1514] to-[#081211] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950">
            <BookmarkCheck className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              Bookmarks
              <span className="text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {bookmarks.length} saved
              </span>
            </h2>
            <p className="text-xs text-slate-400">Your sovereign vault — posts, clips, marketplace drops, and jobs in one place.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-emerald-950/40">
          <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Bookmark tabs">
            {tabs.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={activeTab === t}
                onClick={() => setActiveTab(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                  activeTab === t ? "bg-emerald-600 text-black border-emerald-500" : "bg-black/30 text-slate-400 border-white/5 hover:border-emerald-500/20 hover:text-slate-200"
                }`}
              >
                {t === "Post" && <FileText className="w-3 h-3" />}
                {t === "Clip" && <Film className="w-3 h-3" />}
                {t === "Marketplace" && <ShoppingBag className="w-3 h-3" />}
                {t === "Job" && <Briefcase className="w-3 h-3" />}
                {t === "All" && <Bookmark className="w-3 h-3" />}
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-black/40 rounded-full p-1 border border-white/5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-full transition ${viewMode === "grid" ? "bg-emerald-600 text-black" : "text-slate-400 hover:text-white"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-full transition ${viewMode === "list" ? "bg-emerald-600 text-black" : "text-slate-400 hover:text-white"}`}
              aria-label="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kinara-card rounded-2xl p-4 border border-white/5 animate-pulse space-y-3">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-20 bg-white/5 rounded-xl" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="kinara-card p-10 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Bookmark className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Your vault is empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{emptyMessage}</p>
          <button
            onClick={() => onNavigate?.("explore")}
            className="mx-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            Explore Kinara
          </button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          <AnimatePresence mode="popLayout">
            {bookmarks.map((b) => (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={`kinara-card rounded-2xl border border-white/[0.07] hover:border-emerald-500/30 transition overflow-hidden ${viewMode === "list" ? "p-4 flex items-center gap-4" : "p-4 space-y-3"}`}
              >
                {viewMode === "grid" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
                        {b.entityType === "post" && <FileText className="w-3.5 h-3.5 text-emerald-400" />}
                        {b.entityType === "clip" && <Film className="w-3.5 h-3.5 text-violet-400" />}
                        {b.entityType === "marketplace" && <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />}
                        {b.entityType === "job" && <Briefcase className="w-3.5 h-3.5 text-emerald-400" />}
                        {!["post", "clip", "marketplace", "job"].includes(b.entityType) && <Bookmark className="w-3.5 h-3.5 text-slate-400" />}
                      </span>
                      <span className="text-xs font-bold text-white capitalize">{b.entityType}</span>
                      <span className="ml-auto text-[11px] font-mono text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="rounded-xl bg-black/30 border border-white/5 p-3 space-y-1.5">
                      <div className="text-xs font-mono text-slate-400">ID</div>
                      <div className="text-xs font-mono font-bold text-white truncate">{b.entityId}</div>
                      <div className="text-[11px] text-slate-500">Saved • {b.entityType} vault item</div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          const viewMap: Record<string, string> = { post: "feed", clip: "clips", marketplace: "marketplace", job: "jobs" };
                          onNavigate?.(viewMap[b.entityType] ?? "explore", { entityId: b.entityId });
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleToggle(b)}
                        disabled={removingId === b.id}
                        className="px-3 py-1.5 rounded-xl bg-black/40 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/30 text-rose-300 text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        {removingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="w-9 h-9 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center shrink-0">
                      {b.entityType === "post" && <FileText className="w-4 h-4 text-emerald-400" />}
                      {b.entityType === "clip" && <Film className="w-4 h-4 text-violet-400" />}
                      {b.entityType === "marketplace" && <ShoppingBag className="w-4 h-4 text-amber-400" />}
                      {b.entityType === "job" && <Briefcase className="w-4 h-4 text-emerald-400" />}
                      {!["post", "clip", "marketplace", "job"].includes(b.entityType) && <Bookmark className="w-4 h-4 text-slate-400" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white capitalize flex items-center gap-2">
                        {b.entityType}
                        <span className="text-[11px] font-mono text-slate-500">#{b.entityId}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{new Date(b.createdAt).toLocaleString()} • Saved to vault</div>
                    </div>
                    <button
                      onClick={() => {
                        const viewMap: Record<string, string> = { post: "feed", clip: "clips", marketplace: "marketplace", job: "jobs" };
                        onNavigate?.(viewMap[b.entityType] ?? "explore", { entityId: b.entityId });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs shrink-0"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleToggle(b)}
                      disabled={removingId === b.id}
                      className="p-2 rounded-xl bg-black/40 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/30 text-rose-300 disabled:opacity-50 shrink-0"
                      aria-label="Remove bookmark"
                    >
                      {removingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-center text-[11px] font-mono text-slate-500">{bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""} • Toggle via POST /api/bookmarks {"{entityType, entityId}"}</p>
    </div>
  );
}
