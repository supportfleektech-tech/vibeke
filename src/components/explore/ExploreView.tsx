"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import useSWR from "swr";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Hash,
  Play,
  Users,
  FileText,
  Film,
  Compass,
  Sparkles,
  Heart,
  Eye,
  TrendingUp,
  X,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ExploreTab = "All" | "Clips" | "Posts" | "People" | "Tags";
type SearchResultShape = {
  results?: {
    posts: unknown[];
    people: unknown[];
    communities: unknown[];
    products: unknown[];
    businesses: unknown[];
    jobs: unknown[];
  };
  count?: number;
};

interface ExploreViewProps {
  onNavigate?: (view: string, extra?: unknown) => void;
  selectedCity?: string;
}

interface HashtagItem {
  tag: string;
  count: number;
  trendingScore: number;
  category?: string;
}

interface ClipItem {
  id: number;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  authorName: string;
  authorAvatar: string;
  authorHandle: string;
  likes: number;
  views: number;
  city: string;
}

interface PostItemLite {
  id: number;
  content: string;
  authorName: string;
  authorAvatar: string;
  authorHandle: string;
  authorTrust: number;
  authorVerified: boolean;
  city: string;
  category: string;
  likes: number;
  mediaUrl?: string | null;
  tags?: string[] | string;
  createdAt?: string;
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "now";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function ExploreView({ onNavigate, selectedCity: _selectedCity }: ExploreViewProps) {
  const [activeTab, setActiveTab] = useState<ExploreTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<"ForYou" | "Following">("ForYou");

  const searchKey = searchQuery.trim().length >= 1 ? `/api/search?q=${encodeURIComponent(searchQuery.trim())}&type=all` : null;

  const { data: searchData, isLoading: searchLoading } = useSWR<SearchResultShape>(searchKey, fetcher, {
    keepPreviousData: true,
  });

  const { data: trendingData } = useSWR<{ hashtags: HashtagItem[]; data: HashtagItem[] }>(
    "/api/hashtags/trending?limit=14",
    fetcher
  );

  // Derived arrays are memoized so they keep referential identity across renders;
  // otherwise `?? []` would mint a fresh array every render and defeat the useMemo below.
  const hashtags: HashtagItem[] = useMemo(
    () => trendingData?.hashtags ?? trendingData?.data ?? [],
    [trendingData]
  );

  const { data: clipsData } = useSWR<{ clips: ClipItem[] }>("/api/clips?limit=18&sort=trending", fetcher);
  const { data: postsData } = useSWR<{ posts: PostItemLite[] }>("/api/posts?limit=18", fetcher);

  const clips: ClipItem[] = useMemo(() => clipsData?.clips ?? [], [clipsData]);
  const posts: PostItemLite[] = useMemo(() => postsData?.posts ?? [], [postsData]);

  // Build mixed masonry items
  const masonryItems = useMemo(() => {
    type MixedItem =
      | { kind: "clip"; data: ClipItem; score: number }
      | { kind: "post"; data: PostItemLite; score: number }
      | { kind: "person"; data: Record<string, unknown>; score: number }
      | { kind: "hashtag"; data: HashtagItem; score: number };

    const items: MixedItem[] = [];

    // From search results if searching
    if (searchQuery.trim() && searchData?.results) {
      const r = searchData.results;
      const people = (r.people as Record<string, unknown>[]) ?? [];
      const postResults = (r.posts as PostItemLite[]) ?? [];
      // Scores are deterministic (derived from the data, not Math.random) so the
      // masonry order is stable across re-renders instead of reshuffling every time.
      people.slice(0, 6).forEach((p, i) => items.push({ kind: "person", data: p, score: 50 - i }));
      postResults.slice(0, 8).forEach((p, i) => items.push({ kind: "post", data: p, score: 40 - i }));
      // communities/products map loosely to post cards - skip for now
    } else {
      clips.forEach((c, i) => items.push({ kind: "clip", data: c, score: (c.likes ?? 0) / 100 - i * 0.01 }));
      posts.forEach((p, i) => items.push({ kind: "post", data: p, score: (p.likes ?? 0) / 10 - i * 0.01 }));
      // inject some hashtag cards
      hashtags.slice(0, 4).forEach((h) => items.push({ kind: "hashtag", data: h, score: h.trendingScore }));
    }

    // Apply selectedHashtag filter
    let filtered = items;
    if (selectedHashtag) {
      filtered = filtered.filter((it) => {
        if (it.kind === "clip") return (it.data as ClipItem).title.toLowerCase().includes(selectedHashtag.toLowerCase());
        if (it.kind === "post") {
          const tagsRaw = (it.data as PostItemLite).tags;
          const tags = Array.isArray(tagsRaw) ? tagsRaw : typeof tagsRaw === "string" ? (() => { try { return JSON.parse(tagsRaw); } catch { return [tagsRaw]; } })() : [];
          return (it.data as PostItemLite).content.toLowerCase().includes(selectedHashtag.toLowerCase()) || tags.join(" ").toLowerCase().includes(selectedHashtag.toLowerCase());
        }
        if (it.kind === "hashtag") return (it.data as HashtagItem).tag.toLowerCase() === selectedHashtag.toLowerCase();
        return true;
      });
    }

    // Tab filtering
    if (activeTab !== "All") {
      filtered = filtered.filter((it) => {
        if (activeTab === "Clips") return it.kind === "clip";
        if (activeTab === "Posts") return it.kind === "post";
        if (activeTab === "People") return it.kind === "person";
        if (activeTab === "Tags") return it.kind === "hashtag";
        return true;
      });
    }

    // ForYou ranks by the deterministic score above (stable across renders);
    // Following shows an evenly-spaced subset as a "following" vibe.
    if (feedMode === "ForYou") {
      return filtered.sort((a, b) => b.score - a.score);
    } else {
      return filtered.filter((_, i) => i % 2 === 0);
    }
  }, [clips, posts, hashtags, searchData, searchQuery, activeTab, selectedHashtag, feedMode]);

  const tabs: ExploreTab[] = ["All", "Clips", "Posts", "People", "Tags"];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="kinara-card rounded-3xl p-5 sm:p-6 border border-emerald-500/20 bg-gradient-to-r from-[#0d1c1a] via-[#0a1514] to-[#081211] space-y-4">
        <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono font-bold tracking-widest">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>KINARA EXPLORE • SOVEREIGN DISCOVERY</span>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 text-[11px] bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full text-emerald-300">
            <Sparkles className="w-3 h-3" />
            Mixed Feed • Curated
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts, people, clips, tags — e.g. Nairobi, Amapiano, Solar…"
            className="w-full bg-black/40 border border-emerald-950/60 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/40 transition"
            aria-label="Search explore"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-400"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Hashtag pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Trending:
          </span>
          {hashtags.length === 0 && <span className="text-xs text-slate-500 font-mono">Loading tags…</span>}
          {hashtags.map((h) => (
            <button
              key={h.tag}
              onClick={() => setSelectedHashtag(selectedHashtag === h.tag ? null : h.tag)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition ${
                selectedHashtag === h.tag
                  ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
                  : "bg-black/30 hover:bg-emerald-950/40 text-slate-300 border-white/5 hover:border-emerald-500/20"
              }`}
            >
              <Hash className="w-3 h-3 text-emerald-400" />
              <span>#{h.tag}</span>
              <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded-full text-slate-400">{h.count}</span>
            </button>
          ))}
        </div>

        {/* Tabs + ForYou/Following */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-emerald-950/40">
          <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Explore tabs">
            {tabs.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={activeTab === t}
                onClick={() => setActiveTab(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                  activeTab === t ? "bg-emerald-600 text-black border-emerald-500" : "bg-black/30 text-slate-400 border-white/5 hover:border-emerald-500/20 hover:text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-black/40 rounded-full p-1 border border-white/5">
            {(["ForYou", "Following"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFeedMode(m)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${feedMode === m ? "bg-emerald-600 text-black" : "text-slate-400 hover:text-white"}`}
              >
                {m === "ForYou" ? "For You" : "Following"}
              </button>
            ))}
          </div>
        </div>

        {selectedHashtag && (
          <div className="text-xs text-emerald-300 font-mono flex items-center gap-2">
            <span>Filtering by</span>
            <span className="bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">#{selectedHashtag}</span>
            <button onClick={() => setSelectedHashtag(null)} className="text-slate-400 hover:text-white underline text-xs">Clear</button>
          </div>
        )}
      </div>

      {/* Masonry grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {masonryItems.map((item, idx) => (
            <motion.div
              key={`${item.kind}-${idx}-${JSON.stringify(item.data).slice(0, 20)}`}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, delay: idx * 0.02 }}
              className="break-inside-avoid mb-4"
            >
              {item.kind === "clip" && (() => {
                const c = item.data as ClipItem;
                return (
                  <div
                    onClick={() => onNavigate?.("clips", { clipId: c.id })}
                    className="kinara-card rounded-2xl overflow-hidden border border-white/[0.07] hover:border-emerald-500/30 cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && onNavigate?.("clips", { clipId: c.id })}
                  >
                    <div className="relative aspect-[9/12] bg-black/60 overflow-hidden">
                      <Image src={c.thumbnailUrl} alt={c.title} fill className="object-cover group-hover:scale-105 transition duration-300" unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="w-11 h-11 rounded-full bg-emerald-500/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                          <Play className="w-4 h-4 fill-black ml-0.5" />
                        </span>
                      </div>
                      <span className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        CLIP
                      </span>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white font-mono">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" />
                          {c.likes?.toLocaleString() ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-300" />
                          {c.views?.toLocaleString() ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition">{c.title}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Image src={c.authorAvatar} alt={c.authorName} width={20} height={20} className="w-5 h-5 rounded-full object-cover" unoptimized />
                        <span className="truncate">@{c.authorHandle}</span>
                        <span className="ml-auto text-[10px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/30 font-mono">{c.city}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {item.kind === "post" && (() => {
                const p = item.data as PostItemLite;
                const tags: string[] = (() => {
                  const t = p.tags;
                  if (Array.isArray(t)) return t;
                  if (typeof t === "string") {
                    try { return JSON.parse(t); } catch { return [t]; }
                  }
                  return [];
                })();
                return (
                  <div
                    onClick={() => onNavigate?.("feed", { postId: p.id })}
                    className="kinara-card rounded-2xl p-4 border border-white/[0.07] hover:border-emerald-500/30 cursor-pointer space-y-3"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && onNavigate?.("feed", { postId: p.id })}
                  >
                    <div className="flex items-center gap-2">
                      <Image src={p.authorAvatar} alt={p.authorName} width={32} height={32} className="w-8 h-8 rounded-xl object-cover ring-1 ring-emerald-500/20" unoptimized />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{p.authorName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">@{p.authorHandle} • {p.city}</div>
                      </div>
                      <span className="ml-auto text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500/30 font-mono flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        POST
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-200 leading-relaxed line-clamp-6 whitespace-pre-wrap">{p.content}</p>
                    {p.mediaUrl && (
                      <div className="rounded-xl overflow-hidden border border-white/5">
                        <Image src={p.mediaUrl} alt="Post media" width={400} height={300} className="w-full object-cover max-h-64" unoptimized />
                      </div>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 4).map((tag, i) => (
                          <span key={i} className="text-[11px] font-mono text-emerald-400/80 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/20">#{String(tag).replace(/^#/, "")}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-2 border-t border-emerald-950/30">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-rose-400" /> {p.likes}</span>
                      <span className="capitalize text-emerald-400/80">{p.category}</span>
                      <span className="ml-auto">{timeAgo(p.createdAt)}</span>
                    </div>
                  </div>
                );
              })()}

              {item.kind === "person" && (() => {
                const u = item.data as Record<string, string | number>;
                const name = (u.name as string) || "Kinara Builder";
                const handle = (u.handle as string) || "builder";
                const avatar = (u.avatar as string) || "https://api.dicebear.com/7.x/initials/svg?seed=kinara";
                const bio = (u.bio as string) || "Verified sovereign creator on Kinara.";
                return (
                  <div
                    onClick={() => onNavigate?.("profile", { handle })}
                    className="kinara-card rounded-2xl p-4 border border-white/[0.07] hover:border-emerald-500/30 cursor-pointer flex items-center gap-3"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && onNavigate?.("profile", { handle })}
                  >
                    <Image src={avatar} alt={name} width={48} height={48} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/20 shrink-0" unoptimized />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        {name}
                        <Users className="w-3 h-3 text-emerald-400" />
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">@{handle}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">{bio.slice(0, 80)}</div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-400 shrink-0">View →</span>
                  </div>
                );
              })()}

              {item.kind === "hashtag" && (() => {
                const h = item.data as HashtagItem;
                return (
                  <div
                    onClick={() => setSelectedHashtag(h.tag)}
                    className="kinara-card rounded-2xl p-4 border border-white/[0.07] hover:border-emerald-500/30 cursor-pointer bg-gradient-to-br from-emerald-950/20 to-black/40 flex items-center justify-between"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && setSelectedHashtag(h.tag)}
                  >
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1.5">
                        <Hash className="w-4 h-4 text-emerald-400" />#{h.tag}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 capitalize">{h.category ?? "general"} • {h.count} uses</div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-800/40">★ {h.trendingScore}</span>
                  </div>
                );
              })()}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {searchLoading && <div className="text-center text-xs text-slate-400 font-mono py-6">Searching sovereign index…</div>}

      {!searchLoading && masonryItems.length === 0 && (
        <div className="kinara-card p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
          <Search className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-white font-semibold">No results</p>
          <p className="text-xs text-slate-400">Try a different term, tab, or clear the hashtag filter.</p>
          <button onClick={() => { setSearchQuery(""); setSelectedHashtag(null); setActiveTab("All"); }} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs">Clear filters</button>
        </div>
      )}
    </div>
  );
}
