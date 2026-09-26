"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "motion/react";
import { fetcher } from "@/lib/fetcher";
import { ClipCard, type ClipItem } from "./ClipCard";
import { toast } from "sonner";
import {
  Search,
  Music2,
  Heart,
  Compass,
  Users,
  Loader2,
  Film,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tab = "foryou" | "following";

// Mock following list — filters by authorId (For You is trending, Following is subset)
const MOCK_FOLLOWING_IDS = new Set<string>(["usr_brian_mwangi", "usr_amina_odhiambo"]);

interface ClipsApiData {
  clips: ClipItem[];
  nextCursor?: string | null;
  count?: number;
}

interface ClipsViewProps {
  clips?: ClipItem[];
  initialClips?: ClipItem[];
}

export function ClipsView({ clips: externalClips, initialClips }: ClipsViewProps) {
  const shouldFetch = !externalClips && !initialClips;
  const swrKey = shouldFetch ? "/api/clips?limit=20&sort=trending" : null;

  const { data, error, isLoading, mutate } = useSWR<ClipsApiData>(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const rawClips: ClipItem[] | undefined = useMemo(() => {
    if (externalClips) return externalClips;
    if (initialClips) return initialClips;
    if (data?.clips) return data.clips;
    return undefined;
  }, [externalClips, initialClips, data]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<number, boolean>>({});
  const [heartBurstId, setHeartBurstId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("foryou");
  const [hashtagFilter, setHashtagFilter] = useState("");
  const [soundFilter, setSoundFilter] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Derived filtered clips
  const filteredClips = useMemo(() => {
    if (!rawClips) return [];
    let out = [...rawClips];
    if (activeTab === "following") {
      out = out.filter((c) => MOCK_FOLLOWING_IDS.has(c.authorId));
    }
    if (hashtagFilter.trim()) {
      const q = hashtagFilter.trim().replace(/^#/, "").toLowerCase();
      out = out.filter((c) => c.hashtags?.some((h) => h.toLowerCase().includes(q)) || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    if (soundFilter.trim()) {
      const q = soundFilter.trim().toLowerCase();
      out = out.filter((c) => c.sound.toLowerCase().includes(q) || c.soundTitle.toLowerCase().includes(q));
    }
    return out;
  }, [rawClips, activeTab, hashtagFilter, soundFilter]);

  // Clamp currentIndex when the filtered list shrinks. This runs during render
  // (React's documented "adjusting state when a prop changes" pattern) instead of
  // in an effect, which would force an extra cascading render pass.
  const [prevFilteredLen, setPrevFilteredLen] = useState(filteredClips.length);
  if (prevFilteredLen !== filteredClips.length) {
    setPrevFilteredLen(filteredClips.length);
    if (filteredClips.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= filteredClips.length) {
      setCurrentIndex(Math.max(0, filteredClips.length - 1));
    }
  }

  // Declared before the keydown effect below so it is never referenced before init.
  const scrollToIndex = useCallback((idx: number) => {
    if (!containerRef.current) return;
    const el = itemRefs.current.get(idx);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  // IntersectionObserver to sync currentIndex to visible item
  useEffect(() => {
    if (!containerRef.current || filteredClips.length === 0) return;
    const root = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idxAttr = (visible.target as HTMLElement).dataset.index;
          if (idxAttr !== undefined) {
            const idx = parseInt(idxAttr, 10);
            if (!isNaN(idx)) setCurrentIndex(idx);
          }
        }
      },
      { root, threshold: [0.5, 0.75], rootMargin: "0px" }
    );
    itemRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredClips]);

  // Keyboard a11y: ArrowUp/Down navigate, Space play/pause, M mute
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, Math.max(0, filteredClips.length - 1)));
        scrollToIndex(Math.min(currentIndex + 1, filteredClips.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
        scrollToIndex(Math.max(0, currentIndex - 1));
      } else if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsMuted((m) => !m);
        toast(isMuted ? "Sound on" : "Muted", { description: isMuted ? "Audio enabled" : "Tap to unmute", duration: 1200 });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredClips.length, currentIndex, isMuted]);

  // When currentIndex changes programmatically, scroll
  useEffect(() => {
    scrollToIndex(currentIndex);
  }, [currentIndex, scrollToIndex]);

  const triggerHeartBurst = useCallback((id: number) => {
    setHeartBurstId(id);
    setTimeout(() => setHeartBurstId((cur) => (cur === id ? null : cur)), 900);
  }, []);

  const handleToggleLike = useCallback(
    async (id: number) => {
      const nextLiked = !likedMap[id];
      setLikedMap((prev) => ({ ...prev, [id]: nextLiked }));
      if (nextLiked) triggerHeartBurst(id);
      try {
        const res = await fetch(`/api/clips/${id}/like`, { method: "POST" });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          if (res.status === 401) toast.error("Sign in to like clips");
          else toast.error(j?.error || "Like failed");
          setLikedMap((prev) => ({ ...prev, [id]: !nextLiked }));
        } else {
          // optionally revalidate
          if (shouldFetch) mutate();
        }
      } catch {
        toast.error("Network error");
        setLikedMap((prev) => ({ ...prev, [id]: !nextLiked }));
      }
    },
    [likedMap, triggerHeartBurst, shouldFetch, mutate]
  );

  const handleDoubleTapLike = useCallback(
    (id: number) => {
      if (!likedMap[id]) handleToggleLike(id);
      else triggerHeartBurst(id);
    },
    [likedMap, handleToggleLike, triggerHeartBurst]
  );

  const handleToggleBookmark = useCallback(
    async (id: number) => {
      const next = !bookmarkedMap[id];
      setBookmarkedMap((prev) => ({ ...prev, [id]: next }));
      toast(next ? "Saved to bookmarks" : "Removed bookmark", {
        description: next ? "Find it in your library" : undefined,
      });
      try {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityType: "clip", entityId: String(id) }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          if (res.status === 401) toast.error("Sign in to bookmark");
          else toast.error(j?.error || "Bookmark failed");
          setBookmarkedMap((prev) => ({ ...prev, [id]: !next }));
        }
      } catch {
        toast.error("Network error");
        setBookmarkedMap((prev) => ({ ...prev, [id]: !next }));
      }
    },
    [bookmarkedMap]
  );

  const handleShare = useCallback(async (id: number) => {
    const clip = filteredClips.find((c) => c.id === id) ?? rawClips?.find((c) => c.id === id);
    const url = typeof window !== "undefined" ? `${window.location.origin}/clips/${id}` : `clip:${id}`;
    const title = clip ? `${clip.title} — @${clip.authorHandle}` : `Clip ${id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied", { description: title });
      } else {
        toast.info(url, { description: "Copy this link" });
      }
      // Best-effort share count bump not required
    } catch {
      toast.info(url);
    }
  }, [filteredClips, rawClips]);

  const handleFollow = useCallback((authorId: string, authorName: string) => {
    toast.success(`Following ${authorName}`, { description: "You’ll see their drops in Following" });
    // Optionally POST /api/... follow — mock for now
    void authorId;
  }, []);

  const clearFilters = useCallback(() => {
    setHashtagFilter("");
    setSoundFilter("");
  }, []);

  // Loading / error / empty
  if (isLoading) {
    return (
      <div className="w-full max-w-[420px] mx-auto space-y-3 p-4" aria-busy="true" aria-label="Loading clips">
        {/* Tabs skeleton */}
        <div className="flex items-center justify-center gap-2">
          <div className="h-8 w-24 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="h-8 w-24 rounded-full bg-white/[0.06] animate-pulse" />
        </div>
        {/* Header skeleton */}
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-xl bg-white/[0.06] animate-pulse" />
          <div className="h-9 flex-1 rounded-xl bg-white/[0.06] animate-pulse" />
        </div>
        {/* Clip skeleton */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.03] p-2">
          <div className="aspect-[9/14.5] md:h-[600px] md:aspect-auto w-full rounded-2xl bg-gradient-to-br from-zinc-900 to-black animate-pulse flex flex-col justify-end p-4 gap-3">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="h-4 w-3/4 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/10" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-16 rounded-full bg-emerald-500/20" />
              <div className="h-6 w-16 rounded-full bg-emerald-500/20" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading Kinara clips…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[420px] mx-auto p-6 text-center space-y-4" role="alert">
        <div className="kinara-card rounded-2xl p-6 border border-red-500/20 bg-red-950/20 space-y-3">
          <Film className="w-10 h-10 text-red-400 mx-auto" aria-hidden />
          <h3 className="text-sm font-bold text-white">Failed to load clips</h3>
          <p className="text-xs text-slate-400">{error instanceof Error ? error.message : "Network error. Please retry."}</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button size="sm" onClick={() => mutate()} variant="secondary">Retry</Button>
            <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!rawClips || rawClips.length === 0) {
    return (
      <div className="w-full max-w-[420px] mx-auto p-8 text-center space-y-3" role="status">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
          <Film className="w-6 h-6 text-slate-400" aria-hidden />
        </div>
        <h3 className="text-sm font-bold text-white">No clips yet</h3>
        <p className="text-xs text-slate-400">Be first to drop a 15s sovereign clip. Escrow ready.</p>
      </div>
    );
  }

  if (filteredClips.length === 0) {
    return (
      <div className="w-full max-w-[420px] mx-auto space-y-4 p-4">
        {/* Keep header visible even when filtered empty */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-center">
            <div className="inline-flex rounded-full bg-black/40 border border-white/10 p-1 backdrop-blur-md" role="tablist" aria-label="Clips feed tabs">
              <button
                role="tab"
                aria-selected={activeTab === "foryou"}
                onClick={() => setActiveTab("foryou")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${activeTab === "foryou" ? "bg-white text-black shadow" : "text-slate-400 hover:text-white"}`}
              >
                <span className="inline-flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" aria-hidden /> For You</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "following"}
                onClick={() => setActiveTab("following")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${activeTab === "following" ? "bg-white text-black shadow" : "text-slate-400 hover:text-white"}`}
              >
                <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" aria-hidden /> Following</span>
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" aria-hidden />
              <Input value={hashtagFilter} onChange={(e) => setHashtagFilter(e.target.value)} placeholder="Filter hashtag" aria-label="Filter by hashtag" className="pl-8 h-9 bg-black/40 border-white/10 text-xs" />
            </div>
            <div className="relative flex-1">
              <Music2 className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" aria-hidden />
              <Input value={soundFilter} onChange={(e) => setSoundFilter(e.target.value)} placeholder="Filter sound" aria-label="Filter by sound" className="pl-8 h-9 bg-black/40 border-white/10 text-xs" />
            </div>
          </div>
        </div>
        <div className="kinara-card rounded-2xl p-8 text-center space-y-3 border border-dashed border-white/10">
          <Search className="w-8 h-8 text-slate-500 mx-auto" aria-hidden />
          <p className="text-sm font-semibold text-white">No clips match filters</p>
          <p className="text-xs text-slate-400">Try clearing hashtag or sound filter, or switch tabs.</p>
          <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Kinara Clips — TikTok-style vertical feed"
      className="w-full max-w-[420px] mx-auto flex flex-col gap-3"
      onKeyDown={(e) => {
        // container-level delegation already via window, but keep for focus
        void e;
      }}
    >
      {/* Top tabs */}
      <div className="flex items-center justify-center sticky top-0 z-20 py-2 bg-[#060b0b]/80 backdrop-blur-md -mx-1 px-1">
        <div className="inline-flex rounded-full bg-black/40 border border-white/10 p-1 backdrop-blur-md" role="tablist" aria-label="Clips feed tabs">
          <button
            role="tab"
            aria-selected={activeTab === "foryou"}
            onClick={() => setActiveTab("foryou")}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${activeTab === "foryou" ? "bg-white text-black shadow" : "text-slate-400 hover:text-white"}`}
          >
            <span className="inline-flex items-center gap-1.5"><Compass className="w-3.5 h-3.5" aria-hidden /> For You</span>
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "following"}
            onClick={() => setActiveTab("following")}
            className={`px-5 py-1.5 rounded-full text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${activeTab === "following" ? "bg-white text-black shadow" : "text-slate-400 hover:text-white"}`}
          >
            <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" aria-hidden /> Following</span>
          </button>
        </div>
      </div>

      {/* Header filters */}
      <div className="flex gap-2 px-1">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" aria-hidden />
          <Input
            value={hashtagFilter}
            onChange={(e) => setHashtagFilter(e.target.value)}
            placeholder="Filter #hashtag"
            aria-label="Filter by hashtag"
            className="pl-8 h-9 bg-black/40 border-white/10 text-xs rounded-xl placeholder:text-slate-500 focus-visible:ring-emerald-500/30"
          />
          {hashtagFilter && (
            <button
              aria-label="Clear hashtag filter"
              onClick={() => setHashtagFilter("")}
              className="absolute right-2 top-2 h-5 w-5 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-400"
            >
              <X className="w-3 h-3" aria-hidden />
            </button>
          )}
        </div>
        <div className="relative flex-1">
          <Music2 className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" aria-hidden />
          <Input
            value={soundFilter}
            onChange={(e) => setSoundFilter(e.target.value)}
            placeholder="Filter sound"
            aria-label="Filter by sound"
            className="pl-8 h-9 bg-black/40 border-white/10 text-xs rounded-xl placeholder:text-slate-500 focus-visible:ring-emerald-500/30"
          />
          {soundFilter && (
            <button
              aria-label="Clear sound filter"
              onClick={() => setSoundFilter("")}
              className="absolute right-2 top-2 h-5 w-5 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-400"
            >
              <X className="w-3 h-3" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Current index + global controls */}
      <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-500">
        <span aria-live="polite" aria-atomic="true">
          {filteredClips.length > 0 ? `${currentIndex + 1} / ${filteredClips.length}` : "0 / 0"}
          {activeTab === "following" ? " • Following" : " • For You • trending"}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            aria-label={isPlaying ? "Pause all" : "Play current clip"}
            onClick={() => setIsPlaying((v) => !v)}
            className="h-7 w-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" aria-hidden /> : <Play className="w-3.5 h-3.5 fill-white" aria-hidden />}
          </button>
          <button
            aria-label={isMuted ? "Unmute" : "Mute"}
            onClick={() => {
              setIsMuted((m) => !m);
              toast(isMuted ? "Sound on" : "Muted");
            }}
            className="h-7 w-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" aria-hidden /> : <Volume2 className="w-3.5 h-3.5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Vertical feed — scroll snap */}
      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="Clips vertical feed — use Arrow Up / Down to navigate, Space to play/pause, M to mute"
        className="relative h-[calc(100vh-200px)] md:h-[640px] overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth rounded-2xl bg-black/20 border border-white/[0.06] no-scrollbar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>

        {filteredClips.map((clip, idx) => (
          <div
            key={clip.id}
            data-index={idx}
            ref={(el) => {
              if (el) itemRefs.current.set(idx, el);
              else itemRefs.current.delete(idx);
            }}
            className="snap-start snap-always"
          >
            <ClipCard
              clip={clip}
              index={idx}
              isActive={idx === currentIndex}
              isMuted={isMuted}
              isPlaying={isPlaying}
              isLiked={!!likedMap[clip.id]}
              isBookmarked={!!bookmarkedMap[clip.id]}
              showHeart={heartBurstId === clip.id}
              onToggleLike={handleToggleLike}
              onToggleBookmark={handleToggleBookmark}
              onShare={handleShare}
              onFollow={handleFollow}
              onDoubleTapLike={handleDoubleTapLike}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onToggleMute={() => setIsMuted((m) => !m)}
            />
          </div>
        ))}
      </div>

      {/* Desktop helper + mobile hint */}
      <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-slate-500 px-1">
        <span className="hidden md:inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px]">↑</kbd><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px]">↓</kbd> navigate</span>
        <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px]">Space</kbd> play</span>
        <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px]">M</kbd> mute</span>
        <span className="hidden sm:inline">• Double-tap video to like <Heart className="w-3 h-3 inline text-rose-400" aria-hidden /></span>
      </div>

      {/* Lightweight progress dots */}
      <div className="flex items-center justify-center gap-1.5" aria-hidden>
        {filteredClips.slice(0, 12).map((c, i) => (
          <button
            key={c.id}
            aria-label={`Go to clip ${i + 1}`}
            onClick={() => setCurrentIndex(i)}
            className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? "w-6 bg-emerald-400" : "w-1.5 bg-white/20 hover:bg-white/30"}`}
          />
        ))}
        {filteredClips.length > 12 && <span className="text-[10px] font-mono text-slate-500">+{filteredClips.length - 12}</span>}
      </div>

      {/* Motion heart burst global fallback (also inside card) */}
      <AnimatePresence>
        {heartBurstId !== null && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="pointer-events-none fixed inset-0 flex items-center justify-center z-30"
            aria-hidden
          >
            {/* intentionally empty — per-card burst is primary */}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

  // Named re-export for barrel imports
export type { ClipsViewProps };
export default ClipsView;
