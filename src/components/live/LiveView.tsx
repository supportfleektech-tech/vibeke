"use client";

import React, { useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Radio,
  Users,
  Heart,
  MessageSquare,
  Eye,
  Plus,
  X,
  Send,
  Gift,
  Sparkles,
  Video,
  LogOut,
  Loader2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LiveItem {
  id: string;
  hostId: string;
  hostName: string;
  hostHandle: string;
  hostAvatar: string;
  title: string;
  category: string;
  description: string;
  thumbnail: string;
  status: string;
  viewersCount: number;
  likes: number;
  startedAt: string;
}

interface LiveViewProps {
  onNavigate?: (view: string, extra?: unknown) => void;
}

export function LiveView({ onNavigate: _onNavigate }: LiveViewProps) {
  const { data, isLoading, mutate } = useSWR<{ lives: LiveItem[] }>("/api/lives?status=live", fetcher, {
    refreshInterval: 20000,
  });
  const lives: LiveItem[] = data?.lives ?? [];

  // Go Live modal
  const [showGoLive, setShowGoLive] = useState(false);
  const [goTitle, setGoTitle] = useState("");
  const [goCategory, setGoCategory] = useState("General");
  const [goThumbnail, setGoThumbnail] = useState("");
  const [goDescription, setGoDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Active live session
  const [activeLive, setActiveLive] = useState<LiveItem | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string; time: string }[]>([
    { user: "Amina", text: "Habari! Great stream 🔥", time: "now" },
    { user: "Kofi", text: "Sovereign tech love from Accra", time: "1m" },
    { user: "You", text: "Joined the live", time: "now" },
  ]);
  const [gifts, setGifts] = useState<number[]>([]);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  async function handleCreateLive() {
    if (!goTitle.trim() || goTitle.trim().length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (!goThumbnail.trim()) {
      toast.error("Thumbnail URL required");
      return;
    }
    try {
      new URL(goThumbnail);
    } catch {
      toast.error("Thumbnail must be a valid URL");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/lives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: goTitle.trim(),
          category: goCategory,
          thumbnail: goThumbnail.trim(),
          description: goDescription.trim(),
        }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.success) {
        toast.error(j?.error || "Failed to go live");
        return;
      }
      toast.success("You are live! Sovereign stream started.");
      setShowGoLive(false);
      setGoTitle("");
      setGoThumbnail("");
      setGoDescription("");
      mutate();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinLive(live: LiveItem) {
    setIsJoining(live.id);
    try {
      const res = await fetch(`/api/lives/${live.id}/join`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(j?.error || "Failed to join live");
        return;
      }
      const updatedViewers = j?.viewersCount ?? live.viewersCount + 1;
      setActiveLive({ ...live, viewersCount: updatedViewers });
      setChatMessages((prev) => [...prev, { user: "System", text: `Joined ${live.title}`, time: "now" }]);
      mutate();
    } catch {
      toast.error("Network error joining live");
    } finally {
      setIsJoining(null);
    }
  }

  async function handleEndLive() {
    if (!activeLive) return;
    setIsEnding(true);
    try {
      const res = await fetch(`/api/lives/${activeLive.id}/end`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(j?.error || "Failed to end live");
        return;
      }
      toast.success("Live ended. Sokoni saved.");
      setActiveLive(null);
      mutate();
    } catch {
      toast.error("Failed to end live");
    } finally {
      setIsEnding(false);
    }
  }

  function handleSendChat() {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { user: "You", text: chatInput.trim(), time: "now" }]);
    setChatInput("");
  }

  function handleGift() {
    const id = Date.now();
    setGifts((prev) => [...prev, id]);
    setTimeout(() => setGifts((prev) => prev.filter((g) => g !== id)), 1800);
    toast.success("Gift sent! Heart burst 💚");
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="kinara-card rounded-3xl p-6 sm:p-8 border border-emerald-500/20 bg-gradient-to-r from-[#0d1c1a] via-[#0a1514] to-[#0f1a12] relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              KINARA LIVE • SOVEREIGN BROADCAST
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Video className="w-6 h-6 text-emerald-400" />
              Live Now
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Pan-African live commerce, studio sessions, and verified builder broadcasts. Join, gift, and chat low-latency.
            </p>
          </div>
          <button
            onClick={() => setShowGoLive(true)}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition"
          >
            <Plus className="w-4 h-4" />
            Go Live
          </button>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kinara-card rounded-2xl overflow-hidden border border-white/5 animate-pulse">
              <div className="aspect-video bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : lives.length === 0 ? (
        <div className="kinara-card p-10 rounded-3xl border border-dashed border-white/10 text-center space-y-3">
          <Radio className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-white font-bold">No live broadcasts right now</p>
          <p className="text-xs text-slate-400">Be the first to go live and reach the sovereign network.</p>
          <button onClick={() => setShowGoLive(true)} className="px-4 py-2 rounded-xl bg-emerald-600 text-black font-bold text-xs">Go Live</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {lives.map((live) => (
            <motion.div
              key={live.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="kinara-card rounded-2xl overflow-hidden border border-white/[0.07] hover:border-emerald-500/30 transition group flex flex-col"
            >
              <div className="relative aspect-video bg-black/60 overflow-hidden">
                <Image src={live.thumbnail} alt={live.title} fill className="object-cover group-hover:scale-105 transition duration-300" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {/* LIVE badge pulsing emerald */}
                <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 bg-emerald-600 text-black px-2.5 py-1 rounded-full text-[11px] font-black tracking-widest shadow-md">
                  <span className="w-2 h-2 rounded-full bg-black animate-pulse" aria-hidden />
                  LIVE
                </span>
                <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full text-[11px] font-mono text-white border border-white/10 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-emerald-400" />
                  {live.viewersCount.toLocaleString()}
                </span>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center gap-2">
                  <Image src={live.hostAvatar} alt={live.hostName} width={32} height={32} className="w-8 h-8 rounded-xl object-cover ring-1 ring-emerald-500/20" unoptimized />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{live.hostName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">@{live.hostHandle}</div>
                  </div>
                  <span className="ml-auto text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">{live.category}</span>
                </div>

                <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition">{live.title}</h3>
                {live.description && <p className="text-xs text-slate-400 line-clamp-2">{live.description}</p>}

                <div className="flex items-center gap-2 pt-2 mt-auto">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-400" />
                    {live.viewersCount} watching
                  </span>
                  <button
                    onClick={() => handleJoinLive(live)}
                    disabled={!!isJoining}
                    className="ml-auto px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    {isJoining === live.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                    Join
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Go Live Modal */}
      <AnimatePresence>
        {showGoLive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={(e: React.MouseEvent) => (e.target as HTMLElement) === e.currentTarget && setShowGoLive(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="golive-title"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              className="w-full max-w-md bg-[#0b1515] border border-emerald-500/25 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 id="golive-title" className="text-base font-black text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Go Live
                </h3>
                <button onClick={() => setShowGoLive(false)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="live-title" className="text-xs text-slate-400 block mb-1">Title *</label>
                  <input id="live-title" value={goTitle} onChange={(e) => setGoTitle(e.target.value)} placeholder="e.g. Nairobi Studio • Amapiano Live Build" className="w-full bg-black/40 border border-emerald-950 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40" />
                </div>
                <div>
                  <label htmlFor="live-category" className="text-xs text-slate-400 block mb-1">Category</label>
                  <select id="live-category" value={goCategory} onChange={(e) => setGoCategory(e.target.value)} className="w-full bg-black/40 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    <option>General</option>
                    <option>Music</option>
                    <option>Tech</option>
                    <option>Commerce</option>
                    <option>Culture</option>
                    <option>Education</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="live-thumb" className="text-xs text-slate-400 block mb-1">Thumbnail URL *</label>
                  <input id="live-thumb" value={goThumbnail} onChange={(e) => setGoThumbnail(e.target.value)} placeholder="https://…" className="w-full bg-black/40 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/40" />
                </div>
                <div>
                  <label htmlFor="live-desc" className="text-xs text-slate-400 block mb-1">Description</label>
                  <textarea id="live-desc" value={goDescription} onChange={(e) => setGoDescription(e.target.value)} rows={3} placeholder="What are you streaming?" className="w-full bg-black/40 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/40 resize-none" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-950">
                <button onClick={() => setShowGoLive(false)} disabled={isCreating} className="px-4 py-2 text-xs text-slate-400 hover:text-white disabled:opacity-50">Cancel</button>
                <button onClick={handleCreateLive} disabled={isCreating} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5">
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isCreating ? "Starting…" : "Start Live"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Live Player Modal */}
      <AnimatePresence>
        {activeLive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
            onClick={(e: React.MouseEvent) => (e.target as HTMLElement) === e.currentTarget && setActiveLive(null)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.97, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 10 }}
              className="w-full max-w-5xl bg-[#0a1414] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2 py-1 rounded-full bg-emerald-600 text-black text-[11px] font-black flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 bg-black rounded-full animate-pulse" /> LIVE
                  </span>
                  <span className="text-sm font-bold text-white truncate">{activeLive.title}</span>
                  <span className="hidden sm:inline text-xs text-slate-400 font-mono truncate">• {activeLive.hostName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-800/30 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {activeLive.viewersCount}
                  </span>
                  <button onClick={() => setActiveLive(null)} className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300" aria-label="Close live">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] flex-1 min-h-0">
                {/* Player */}
                <div className="relative bg-black aspect-video lg:aspect-auto lg:min-h-[360px] overflow-hidden flex items-center justify-center">
                  <Image src={activeLive.thumbnail} alt={activeLive.title} fill className="object-cover opacity-90" unoptimized />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 gap-2">
                    <Radio className="w-10 h-10 text-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono bg-black/60 px-3 py-1 rounded-full border border-white/10">Live player • video placeholder</span>
                  </div>

                  {/* Heart burst overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence>
                      {gifts.map((id) => (
                        <motion.div
                          key={id}
                          initial={{ y: 20, opacity: 0, scale: 0.6 }}
                          animate={{ y: -80, opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, y: -120 }}
                          transition={{ duration: 1.6, ease: "easeOut" }}
                          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-rose-400"
                        >
                          <Heart className="w-10 h-10 fill-rose-500 text-rose-500 drop-shadow-xl" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                    <button onClick={handleGift} className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg">
                      <Gift className="w-3.5 h-3.5" />
                      Send Gift
                    </button>
                    <span className="ml-auto flex items-center gap-1.5 text-xs font-mono text-white bg-black/60 px-2 py-1 rounded-full border border-white/10">
                      <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                      {activeLive.likes} likes
                    </span>
                  </div>
                </div>

                {/* Chat & viewers */}
                <div className="flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0e1b1b]">
                  <div className="p-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      Live Chat
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400" />
                      {activeLive.viewersCount} viewers
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto p-3 space-y-2 max-h-64 lg:max-h-none">
                    {chatMessages.map((m, i) => (
                      <div key={i} className="text-xs flex gap-2">
                        <span className="font-bold text-emerald-300 shrink-0">{m.user}:</span>
                        <span className="text-slate-300 break-words">{m.text}</span>
                        <span className="ml-auto text-[10px] font-mono text-slate-500 shrink-0">{m.time}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 border-t border-white/5 flex items-center gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleSendChat()}
                      placeholder="Say something…"
                      className="flex-1 bg-black/40 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/30"
                    />
                    <button onClick={handleSendChat} className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 border-t border-emerald-950/50 flex items-center gap-2">
                    <button
                      onClick={handleEndLive}
                      disabled={isEnding}
                      className="flex-1 py-2 rounded-xl bg-black/40 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isEnding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                      End (host)
                    </button>
                    <button onClick={() => {
                      fetch(`/api/lives/${activeLive.id}/join?action=leave`, { method: "POST" }).catch(()=>{});
                      setActiveLive(null);
                      mutate();
                    }} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold">Leave</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
