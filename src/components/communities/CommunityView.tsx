"use client";

import Image from "next/image";

import React, { useState } from "react";
import {
  Users,
  Radio,
  MessageSquare,
  FileText,
  Calendar,
  Briefcase,
  Sparkles,
  ShieldCheck,
  Mic,
  MicOff,
  Volume2,
  Hand,
  Check,
  Plus,
  Send,
  Download,
  Share2
} from "lucide-react";
import { CommunityItem, PostItem, UserProfile } from "@/types";
import { PostCard } from "@/components/feed/PostCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { toast } from "sonner";

interface CommunityViewProps {
  communities: CommunityItem[];
  posts: PostItem[];
  user: UserProfile | null;
  onPostCreated: (post: PostItem) => void;
  initialSlug?: string;
}

export function CommunityView({
  communities,
  posts,
  user,
  onPostCreated,
  initialSlug,
}: CommunityViewProps) {
  const [activeSlug, setActiveSlug] = useState(initialSlug || communities[0]?.slug || "silicon-savannah");
  const [activeTab, setActiveTab] = useState<"feed" | "voice" | "chat" | "files" | "events" | "ai">("voice");
  const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({
    "silicon-savannah": true,
    "afrobeats-sound": true,
  });

  // Voice room interactive state
  const [inVoiceRoom, setInVoiceRoom] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);

  // Chat tab state
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string; time: string; avatar: string }[]>([
    {
      user: "Amina Odhiambo",
      avatar: "https://images.pexels.com/photos/5999894/pexels-photo-5999894.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      text: "Has anyone benchmarked the local SQLite WASM sync on low-end Androids in rural Kisumu?",
      time: "11:02 AM",
    },
    {
      user: "Brian Mwangi",
      avatar: "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      text: "Yes! With OPFS (Origin Private File System), we are hitting 3ms query latency for 20,000 offline merchant records.",
      time: "11:05 AM",
    },
  ]);
  const [inputChatMessage, setInputChatMessage] = useState("");

  const currentCommunity = communities.find((c) => c.slug === activeSlug) || communities[0];
  const isJoined = !!joinedMap[activeSlug];

  function toggleJoin() {
    setJoinedMap({
      ...joinedMap,
      [activeSlug]: !isJoined,
    });
  }

  function handleSendChat() {
    if (!inputChatMessage.trim()) return;
    setChatMessages([
      ...chatMessages,
      {
        user: user?.name || "Brian Mwangi",
        avatar: user?.avatar || "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        text: inputChatMessage.trim(),
        time: "Just now",
      },
    ]);
    setInputChatMessage("");
  }

  if (!currentCommunity) return null;

  return (
    <div className="space-y-6">
      {/* Community Directory Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {communities.map((c) => (
          <button
            key={c.slug}
            onClick={() => setActiveSlug(c.slug)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              activeSlug === c.slug
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-950/40"
                : "bg-black/30 hover:bg-white/5 text-slate-400 border-white/5"
            }`}
          >
            <Image src={c.avatar} alt={c.name} className="w-5 h-5 rounded-md object-cover" width={20} height={20} unoptimized loading="lazy" />
            <span>{c.name}</span>
            {c.activeVoice && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Community Banner & Identity Header */}
      <div className="kinara-card rounded-3xl overflow-hidden border border-emerald-500/20 relative">
        <div className="h-44 sm:h-56 relative w-full overflow-hidden bg-emerald-950">
          <Image src={currentCommunity.banner}
            alt={currentCommunity.name}
            className="w-full h-full object-cover brightness-75" width={600} height={400} unoptimized loading="lazy" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1413] via-[#0a1413]/60 to-transparent" />
        </div>

        <div className="p-5 sm:p-6 -mt-16 sm:-mt-20 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Image src={currentCommunity.avatar}
                alt={currentCommunity.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-[#0a1413] shadow-2xl" width={80} height={80} unoptimized loading="lazy" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                    {currentCommunity.name}
                  </h2>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
                    VERIFIED COMMUNITY
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  {currentCommunity.tagline}
                </p>
                <div className="text-xs text-slate-400 flex items-center gap-3 pt-1">
                  <span>{currentCommunity.membersCount.toLocaleString()} Sovereign Members</span>
                  <span>•</span>
                  <span>Hub: {currentCommunity.city}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={toggleJoin}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                  isJoined
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 hover:bg-emerald-900"
                    : "bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-950/50"
                }`}
              >
                {isJoined ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Member</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Join Community</span>
                  </>
                )}
              </button>

              <button
                onClick={() => { navigator.clipboard?.writeText(window.location.href).catch(() => {}); toast.success(`Link to ${currentCommunity.name} copied to clipboard!`); }}
                className="p-2.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-slate-300 transition"
                title="Share Community"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-platform Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 mt-6 border-b border-emerald-950/60 overflow-x-auto text-xs">
            {[
              { id: "voice", label: "Live Voice Lounge", icon: Radio, pulse: currentCommunity.activeVoice },
              { id: "feed", label: "Dispatches & Feed", icon: Users },
              { id: "chat", label: "Live Channel", icon: MessageSquare },
              { id: "files", label: "Wiki & Files", icon: FileText },
              { id: "events", label: "Events & Demo Days", icon: Calendar },
              { id: "ai", label: "AI Moderator", icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 font-semibold whitespace-nowrap transition border-b-2 -mb-[2px] ${
                    isActive
                      ? "border-emerald-400 text-emerald-300 bg-emerald-950/20"
                      : "border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : ""}`} />
                  <span>{tab.label}</span>
                  {tab.pulse && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content Display */}
      {/* 1. Live Voice Lounge Tab */}
      {activeTab === "voice" && (
        <div className="kinara-card rounded-3xl p-6 border border-emerald-500/30 bg-gradient-to-b from-[#0c1c1a] to-[#071110] space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-emerald-950/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-400">
                  LIVE SPATIAL AUDIO ROOM • 24 BIT LOSSLESS
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                {currentCommunity.voiceRoomTopic || "Pan-African Technology & Architecture Roundtable"}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono bg-black/40 px-3 py-1 rounded-lg border border-emerald-950">
                18 on Stage • 142 Listening
              </span>
            </div>
          </div>

          {/* Speakers Grid with animated voice rings */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Speakers on Stage
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {[
                { name: "Brian Mwangi", role: "Host • Architect", avatar: "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", speaking: true },
                { name: "Folake Adebayo", role: "Speaker • Lagos", avatar: "https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800", speaking: true },
                { name: "Amina Odhiambo", role: "Speaker • Safaricom", avatar: "https://images.pexels.com/photos/5999894/pexels-photo-5999894.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800", speaking: false },
                { name: "Kofi Mensah", role: "Speaker • Accra", avatar: "https://images.pexels.com/photos/15283143/pexels-photo-15283143.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800", speaking: false },
                { name: "Zuri Artisan", role: "Seller Lead", avatar: "https://images.pexels.com/photos/29038453/pexels-photo-29038453.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280", speaking: false },
                { name: "David Kimani", role: "Rust Engine", avatar: "https://images.pexels.com/photos/9490631/pexels-photo-9490631.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800", speaking: false },
              ].map((speaker, idx) => (
                <div key={idx} className="flex flex-col items-center text-center group">
                  <div className="relative mb-2">
                    <Image src={speaker.avatar}
                      alt={speaker.name}
                      className={`w-16 h-16 rounded-2xl object-cover ring-2 ${
                        speaker.speaking
                          ? "ring-emerald-400 voice-pulse shadow-lg shadow-emerald-500/40"
                          : "ring-emerald-950/60"
                      }`} width={400} height={300} unoptimized loading="lazy" sizes="(max-width: 768px) 100vw, 400px" />
                    {speaker.speaking && (
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-1 rounded-full text-[10px]">
                        <Volume2 className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white truncate max-w-full">
                    {speaker.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-full">
                    {speaker.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audio controls bar */}
          <div className="p-4 rounded-2xl bg-black/60 border border-emerald-950/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                  isMuted
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                    : "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
                <span>{isMuted ? "Unmute Mic" : "Mute Mic"}</span>
              </button>

              <button
                onClick={() => setHasRaisedHand(!hasRaisedHand)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition ${
                  hasRaisedHand
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10"
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>{hasRaisedHand ? "Hand Raised" : "Raise Hand"}</span>
              </button>
            </div>

            {/* Live Audio Visualizer Bars */}
            <div className="flex items-center gap-1 h-6 px-3 bg-black/40 rounded-lg border border-emerald-950">
              <span className="w-1 bg-emerald-400 rounded-full animate-wave-1" />
              <span className="w-1 bg-emerald-400 rounded-full animate-wave-2" />
              <span className="w-1 bg-emerald-400 rounded-full animate-wave-3" />
              <span className="w-1 bg-emerald-400 rounded-full animate-wave-4" />
              <span className="w-1 bg-emerald-400 rounded-full animate-wave-2" />
              <span className="text-[10px] text-emerald-300 font-mono ml-2">48 kHz Live</span>
            </div>

            <button
              onClick={() => toast.info("Audio session minimized to background audio player.")}
              className="px-3 py-1.5 rounded-lg text-xs bg-rose-950/60 text-rose-300 border border-rose-800/40 hover:bg-rose-900 transition"
            >
              Quietly Leave
            </button>
          </div>
        </div>
      )}

      {/* 2. Feed Tab */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          <PostComposer
            user={user}
            onPostCreated={onPostCreated}
            selectedCity={currentCommunity.city}
          />
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}

      {/* 3. Chat Tab */}
      {activeTab === "chat" && (
        <div className="kinara-card rounded-3xl p-5 border border-emerald-500/20 flex flex-col h-[520px]">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <Image src={msg.avatar} alt={msg.user} className="w-8 h-8 rounded-xl object-cover shrink-0" width={32} height={32} unoptimized loading="lazy" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{msg.user}</span>
                    <span className="text-[10px] text-slate-400">{msg.time}</span>
                  </div>
                  <p className="text-xs text-slate-300 bg-black/40 p-2.5 rounded-xl border border-white/5">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-emerald-950/60 flex items-center gap-2">
            <input
              type="text"
              value={inputChatMessage}
              onChange={(e) => setInputChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder={`Message #${currentCommunity.slug} channel...`}
              className="flex-1 bg-black/50 border border-emerald-950 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/40"
            />
            <button
              onClick={handleSendChat}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Files & Wiki Tab */}
      {activeTab === "files" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Kinara Offline Edge Protocol Whitepaper (PDF)",
              size: "2.4 MB",
              date: "Updated yesterday",
              author: "Brian Mwangi",
            },
            {
              title: "Pan-African FinTech ISO-20022 Integration Map",
              size: "1.1 MB",
              date: "3 days ago",
              author: "Folake Adebayo",
            },
            {
              title: "Ge'ez & Swahili Font Design Token Specs (Figma)",
              size: "14.8 MB",
              date: "1 week ago",
              author: "Mara Design Labs",
            },
            {
              title: "M-Pesa 3.0 Real-Time Webhook Simulator (Rust)",
              size: "840 KB",
              date: "2 weeks ago",
              author: "Silicon Savannah Core",
            },
          ].map((file, i) => (
            <div
              key={i}
              className="kinara-card p-4 rounded-2xl border border-white/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{file.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {file.size} • By {file.author} • {file.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toast.info(`Downloading "${file.title}"...`)}
                className="p-2 rounded-lg bg-black/40 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 transition"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 5. Events Tab */}
      {activeTab === "events" && (
        <div className="space-y-3">
          {[
            {
              title: "Silicon Savannah AI & Escrow Demo Night",
              date: "Tomorrow, 6:30 PM EAT",
              venue: "Ikigai Roastery Westlands & Live Audio",
              attendees: 184,
            },
            {
              title: "Pan-African Edge Rust Hackathon (48h)",
              date: "Saturday, 9:00 AM",
              venue: "Virtual Corridor (Nairobi, Lagos, Kigali)",
              attendees: 310,
            },
          ].map((ev, i) => (
            <div
              key={i}
              className="kinara-card p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 text-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{ev.date} • {ev.venue}</p>
                </div>
              </div>
              <button
                onClick={() => toast.success(`RSVP registered for ${ev.title}!`)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition"
              >
                RSVP ({ev.attendees} Attending)
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 6. AI Moderator Tab */}
      {activeTab === "ai" && (
        <div className="kinara-card p-5 rounded-3xl border border-amber-500/20 bg-black/40 space-y-4">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>COMMUNITY SOVEREIGN AI MODERATOR</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            This channel is autonomously indexed by Kinara Edge LLM. It generates real-time audio transcripts, flags non-constructive behavior, and synthesizes key architecture conclusions.
          </p>
          <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/30 text-xs text-emerald-200">
            <strong>Today&apos;s Voice Lounge Summary:</strong> The room concluded that offline SQLite + CRDTs provide the highest resilience for East African point-of-sale systems during fiber outages.
          </div>
        </div>
      )}
    </div>
  );
}
