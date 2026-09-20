"use client";

import React, { useState } from "react";
import {
  Sparkles,
  SlidersHorizontal,
  Flame,
  Compass,
  Users,
  Briefcase,
  ShoppingBag,
  Film,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Radio,
  Star,
  MapPin,
  TrendingUp,
  Truck,
  Heart,
  Volume2
} from "lucide-react";
import {
  UserProfile,
  PostItem,
  CommunityItem,
  MarketplaceProduct,
  JobListing,
  RadarPin,
  MessageItem,
  DashboardSectionConfig,
  PersonaRole
} from "@/types";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";

interface DynamicHomeProps {
  user: UserProfile | null;
  posts: PostItem[];
  communities: CommunityItem[];
  products: MarketplaceProduct[];
  jobs: JobListing[];
  radar: RadarPin[];
  messages: MessageItem[];
  sectionsConfig: DashboardSectionConfig[];
  currentPersona: PersonaRole;
  selectedCity: string;
  onNavigate: (view: string, extra?: any) => void;
  onPostCreated: (post: PostItem) => void;
  onOpenCustomizer: () => void;
}

export function DynamicHome({
  user,
  posts,
  communities,
  products,
  jobs,
  radar,
  messages,
  sectionsConfig,
  currentPersona,
  selectedCity,
  onNavigate,
  onPostCreated,
  onOpenCustomizer,
}: DynamicHomeProps) {
  // Cinema video preview player simulation
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);

  const cinemaShowcases = [
    {
      id: 1,
      title: "Silicon Savannah: The Offline Edge Revolution",
      creator: "Brian Mwangi & Nairobi Labs",
      duration: "4:18",
      views: "18.4k",
      thumb: "https://images.pexels.com/photos/29069344/pexels-photo-29069344.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    },
    {
      id: 2,
      title: "Sonic Architecture: Inside Lagos Spatial Acoustics Studio",
      creator: "Kofi Mensah & Afrobeats Audio",
      duration: "6:42",
      views: "24.9k",
      thumb: "https://images.pexels.com/photos/5332445/pexels-photo-5332445.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    },
    {
      id: 3,
      title: "Rwandan Fine Weaving: Ancient Geometry Meets Modern UI",
      creator: "Imigongo Atelier",
      duration: "3:30",
      views: "12.1k",
      thumb: "https://images.pexels.com/photos/27556617/pexels-photo-27556617.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    },
  ];

  // Render individual sections based on config order
  function renderSection(sectionId: string) {
    switch (sectionId) {
      /* 1. GREETING HEADER */
      case "greeting":
        return (
          <div
            key="greeting"
            className="kinara-card rounded-3xl p-6 sm:p-7 border border-emerald-500/20 bg-gradient-to-r from-[#0d1d1b] via-[#091514] to-[#07100f] relative overflow-hidden shadow-xl"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👋</span>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Good Evening, {user?.name?.split(" ")[0] || "Brian"}
                  </h1>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    ★ 98 TRUST
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300">
                  Habari ya Nairobi! 42 verified builders online in Silicon Savannah. 2 escrow deliveries active in Kilimani.
                </p>

                <div className="pt-2 flex items-center gap-3 text-xs text-emerald-400 font-mono">
                  <span>Hub: {selectedCity} (24°C EAT)</span>
                  <span>•</span>
                  <span>Escrow Safe: 100% Protected</span>
                </div>
              </div>

              {/* Persona indicator and customize button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenCustomizer}
                  className="px-3 py-2 rounded-xl bg-black/40 hover:bg-emerald-950/60 border border-white/5 hover:border-emerald-500/30 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Customize Dashboard</span>
                </button>
              </div>
            </div>

            {/* Subtle background glow */}
            <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          </div>
        );

      /* 2. TRENDING PULSES & POSTS */
      case "trending":
        return (
          <div key="trending" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>🔥 Trending Pulses & Dispatches</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{posts.length} Live Dispatches</span>
            </div>

            {/* Post Composer */}
            <PostComposer
              user={user}
              onPostCreated={onPostCreated}
              selectedCity={selectedCity}
            />

            {/* Post list */}
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onNavigateProfile={() => onNavigate("profile")}
                />
              ))}
            </div>
          </div>
        );

      /* 3. NEARBY RADAR */
      case "radar":
        return (
          <div key="radar" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
                <span>📍 Nearby Local Radar • {selectedCity}</span>
              </div>
              <button
                onClick={() => onNavigate("radar")}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Full Map Radar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Radar Horizontal Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {radar.slice(0, 3).map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => onNavigate("radar")}
                  className="kinara-card p-3.5 rounded-2xl border border-white/5 hover:border-emerald-500/30 cursor-pointer transition flex items-center gap-3"
                >
                  <img
                    src={pin.avatar}
                    alt={pin.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 ring-2 ring-emerald-500/20"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{pin.name}</span>
                      <span className="text-[10px] text-emerald-300 font-mono font-bold bg-emerald-950 px-1.5 py-0.5 rounded">
                        {pin.distance}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{pin.details}</div>
                    <span className="text-[10px] text-amber-300 font-medium">{pin.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      /* 4. COMMUNITIES & AUDIO LOUNGES */
      case "communities":
        return (
          <div key="communities" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>👥 Communities & Live Audio Lounges</span>
              </div>
              <button
                onClick={() => onNavigate("communities")}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Browse All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {communities.slice(0, 2).map((comm) => (
                <div
                  key={comm.id}
                  onClick={() => onNavigate("communities", { communitySlug: comm.slug })}
                  className="kinara-card p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer transition space-y-3 bg-gradient-to-br from-[#0c1817] to-[#081211]"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={comm.avatar}
                      alt={comm.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/20"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{comm.name}</h4>
                        {comm.activeVoice && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{comm.tagline}</p>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        {comm.membersCount.toLocaleString()} members • {comm.city}
                      </div>
                    </div>
                  </div>

                  {comm.activeVoice && (
                    <div className="p-2.5 rounded-xl bg-black/50 border border-emerald-950 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span className="text-emerald-300 text-[11px] truncate max-w-[200px]">
                          {comm.voiceRoomTopic || "Audio Lounge Live"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Join →</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      /* 5. CAREER & JOBS */
      case "jobs":
        return (
          <div key="jobs" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>💼 High-Craft Opportunities</span>
              </div>
              <button
                onClick={() => onNavigate("jobs")}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View All Jobs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobs.slice(0, 2).map((j) => (
                <div
                  key={j.id}
                  onClick={() => onNavigate("jobs")}
                  className="kinara-card p-4 rounded-2xl border border-white/5 hover:border-emerald-500/30 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-white truncate">{j.title}</h4>
                    <div className="text-[11px] text-slate-400">{j.company} • {j.location}</div>
                    <div className="text-xs font-mono font-bold text-emerald-300">{j.salary}</div>
                  </div>
                  <span className="text-xs text-emerald-400 shrink-0 font-bold">Apply →</span>
                </div>
              ))}
            </div>
          </div>
        );

      /* 6. MARKETPLACE */
      case "marketplace":
        return (
          <div key="marketplace" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>🛒 Curated Escrow Drops</span>
              </div>
              <button
                onClick={() => onNavigate("marketplace")}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.slice(0, 3).map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => onNavigate("marketplace")}
                  className="kinara-card rounded-2xl overflow-hidden border border-white/5 hover:border-amber-500/40 cursor-pointer transition flex flex-col justify-between group"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded-full text-[10px] text-emerald-300 border border-emerald-500/30 font-mono">
                      Escrow
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-200 transition">
                      {prod.title}
                    </h4>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-300">
                        {prod.currency} {prod.price.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">{prod.deliverySpeed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      /* 7. CINEMA & SHORTS */
      case "cinema":
        return (
          <div key="cinema" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Film className="w-4 h-4 text-emerald-400" />
                <span>🎬 KINARA Cinema & African Creative Spotlights</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">4K Master Audio</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {cinemaShowcases.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => setPlayingVideoId(playingVideoId === vid.id ? null : vid.id)}
                  className="kinara-card rounded-2xl overflow-hidden border border-white/5 hover:border-emerald-500/40 cursor-pointer transition group"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    <img
                      src={vid.thumb}
                      alt={vid.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/80 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                        <Volume2 className="w-4 h-4" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
                      {vid.duration}
                    </span>
                  </div>

                  <div className="p-3 space-y-1">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition">
                      {vid.title}
                    </h4>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{vid.creator}</span>
                      <span className="font-mono text-slate-500">{vid.views}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      /* 8. MESSAGES QUICK PREVIEW */
      case "messages":
        return (
          <div key="messages" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>💬 Active Dispatches & Negotiation Channels</span>
              </div>
              <button
                onClick={() => onNavigate("messaging")}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Open Messenger</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="kinara-card p-4 rounded-2xl border border-white/5 space-y-2.5">
              <div
                onClick={() => onNavigate("messaging")}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800"
                      alt="Folake"
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/20"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-[#060b0b] rounded-full p-0.5">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Folake Adebayo (Lagos)</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono">
                        99 ★
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-sm">
                      &ldquo;Brian, the escrow smart contract for the trade corridor is deployed...&rdquo;
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400">10:18 AM</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Adaptively rendered sections based on user's customized order & visibility */}
      {sectionsConfig
        .filter((s) => s.visible)
        .map((section) => renderSection(section.id))}
    </div>
  );
}
