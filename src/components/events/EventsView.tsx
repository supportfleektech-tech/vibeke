"use client";

import React, { useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Ticket,
  Users,
  Clock,
  Search,
  Sparkles,
  Loader2,
  Check,
  Compass,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface EventItem {
  id: string;
  title: string;
  description: string;
  banner: string;
  location: string;
  city: string;
  category: string;
  startAt: string;
  endAt: string;
  organizerId: string | null;
  attendeesCount: number;
  maxAttendees: number;
  price: number;
  createdAt: string;
}

interface EventsViewProps {
  onNavigate?: (view: string, extra?: unknown) => void;
  selectedCity?: string;
}

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(d: string) {
  const date = new Date(d);
  return date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export function EventsView({ onNavigate: _onNavigate, selectedCity }: EventsViewProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  const query = new URLSearchParams();
  if (selectedCity && selectedCity !== "all") query.set("city", selectedCity);
  if (category !== "all") query.set("category", category);
  if (search.trim()) query.set("q", search.trim());
  query.set("limit", "20");
  const qs = query.toString();
  const swrKey = `/api/events${qs ? `?${qs}` : ""}`;

  const { data, isLoading, mutate } = useSWR<{ events: EventItem[]; data: EventItem[] }>(swrKey, fetcher, {
    keepPreviousData: true,
  });

  const events: EventItem[] = data?.events ?? data?.data ?? [];

  async function handleRsvp(ev: EventItem) {
    const isJoined = joinedIds.has(ev.id);
    setRsvpLoading(ev.id);
    try {
      const res = await fetch(`/api/events/${ev.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isJoined ? "leave" : "join" }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(j?.error || "RSVP failed");
        return;
      }
      if (isJoined) {
        setJoinedIds((prev) => {
          const n = new Set(prev);
          n.delete(ev.id);
          return n;
        });
        toast.success("Left event — see you next time");
      } else {
        setJoinedIds((prev) => new Set(prev).add(ev.id));
        toast.success("RSVP confirmed! Check-in at venue");
      }
      mutate();
    } catch {
      toast.error("Network error");
    } finally {
      setRsvpLoading(null);
    }
  }

  const categories = ["all", "Tech", "Music", "Culture", "Business", "Sports"];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="kinara-card rounded-3xl p-6 sm:p-8 border border-emerald-500/20 bg-gradient-to-r from-[#0d1c1a] via-[#0a1514] to-[#0f1a12] space-y-4 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            KINARA EVENTS • SOVEREIGN GATHERINGS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Gatherings & Experiences</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Verified IRL gatherings — from Kilimani tech salons to Lagos waterfront festivals. RSVP sovereign-fast, escrow-safe.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, location, or host…"
                className="w-full bg-black/40 border border-emerald-950 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/40"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap transition ${category === c ? "bg-emerald-600 text-black border-emerald-500" : "bg-black/30 text-slate-400 border-white/5 hover:border-emerald-500/20"}`}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kinara-card rounded-2xl overflow-hidden border border-white/5 animate-pulse">
              <div className="aspect-[16/9] bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="kinara-card p-10 rounded-3xl border border-dashed border-white/10 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm text-white font-bold">No events found</p>
          <p className="text-xs text-slate-400">Try another city, category, or search term.</p>
          <button onClick={() => { setSearch(""); setCategory("all"); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-black font-bold text-xs">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev) => {
            const isJoined = joinedIds.has(ev.id);
            const pct = Math.min(100, Math.round((ev.attendeesCount / Math.max(1, ev.maxAttendees)) * 100));
            const isFull = ev.attendeesCount >= ev.maxAttendees;
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="kinara-card rounded-2xl overflow-hidden border border-white/[0.07] hover:border-emerald-500/30 flex flex-col group transition"
              >
                <div className="relative aspect-[16/9] bg-black/50 overflow-hidden">
                  <Image src={ev.banner} alt={ev.title} fill className="object-cover group-hover:scale-105 transition duration-300" unoptimized />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                    {ev.category}
                  </span>
                  <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-mono text-white border border-white/10 flex items-center gap-1">
                    <Ticket className="w-3 h-3 text-amber-400" />
                    {ev.price === 0 ? "FREE" : `KES ${ev.price.toLocaleString()}`}
                  </span>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-[11px] font-mono text-white">
                    <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full border border-white/10">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      {formatDate(ev.startAt)} • {formatTime(ev.startAt)}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition">{ev.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{ev.description}</p>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                    <span className="text-slate-500">•</span>
                    <span className="font-mono text-emerald-300">{ev.city}</span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-emerald-950/30">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3 text-emerald-400" />
                        {ev.attendeesCount}/{ev.maxAttendees}
                      </span>
                      <span className={isFull ? "text-amber-400" : "text-emerald-400"}>{isFull ? "Full" : `${pct}% filled`}</span>
                    </div>
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <button
                    onClick={() => handleRsvp(ev)}
                    disabled={!!rsvpLoading || (!isJoined && isFull)}
                    className={`mt-auto w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      isJoined ? "bg-emerald-950 text-emerald-300 border border-emerald-600/40" : "bg-emerald-600 hover:bg-emerald-500 text-black shadow-md shadow-emerald-950"
                    }`}
                  >
                    {rsvpLoading === ev.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isJoined ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Ticket className="w-3.5 h-3.5" />
                    )}
                    {rsvpLoading === ev.id ? "Updating…" : isJoined ? "Joined • Tap to Leave" : isFull ? "Event Full" : "RSVP • Join Event"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] font-mono text-slate-500">{events.length} events • POST /api/events/[id]/rsvp {"{action: join|leave}"}</p>
    </div>
  );
}
