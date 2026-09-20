"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Award,
  Star,
  MapPin,
  Briefcase,
  Users,
  Calendar,
  Sparkles,
  ExternalLink,
  Edit3,
  Check,
  CheckCircle2,
  FolderGit2,
  Flame,
  Radio
} from "lucide-react";
import { UserProfile, PostItem } from "@/types";
import { PostCard } from "@/components/feed/PostCard";

interface ProfileViewProps {
  user: UserProfile | null;
  posts: PostItem[];
  onUpdateBio: (newBio: string) => void;
}

export function ProfileView({ user, posts, onUpdateBio }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"projects" | "activity" | "trust" | "achievements">("projects");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || "");

  const userPosts = posts.filter((p) => p.authorHandle === (user?.handle || "brianmwangi"));

  const parsedSkills: string[] = (() => {
    try {
      return JSON.parse(user?.skills || "[]");
    } catch {
      return ["Design Systems", "Distributed Systems", "FinTech Rails", "Swahili NLP"];
    }
  })();

  const parsedAchievements: { title: string; desc: string; icon: string }[] = (() => {
    try {
      return JSON.parse(user?.achievements || "[]");
    } catch {
      return [
        { title: "Silicon Savannah 40u40", desc: "Top East African Innovators", icon: "Award" },
        { title: "M-Pesa Pioneer Fellow", desc: "100+ verified escrow transactions", icon: "ShieldCheck" },
      ];
    }
  })();

  function handleSaveBio() {
    onUpdateBio(bioInput);
    setIsEditingBio(false);
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Cover & Profile Header Card */}
      <div className="kinara-card rounded-3xl overflow-hidden border border-emerald-500/20 relative">
        <div className="h-48 sm:h-60 relative w-full overflow-hidden bg-black">
          <img
            src={user.cover}
            alt="Cover"
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091212] via-[#091212]/40 to-transparent" />
        </div>

        <div className="p-6 sm:p-8 -mt-20 sm:-mt-24 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-5">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-[#091212] shadow-2xl"
                />
                <span className="absolute -bottom-1 -right-1 bg-[#091212] rounded-full p-1">
                  <ShieldCheck className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white">{user.name}</h2>
                  <span className="text-xs text-slate-400 font-mono">@{user.handle}</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    {user.verificationType}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {user.location}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-300 font-mono font-bold">
                    ★ {user.trustScore}/100 Trust Score
                  </span>
                  <span>•</span>
                  <span className="text-amber-400 font-mono">
                    {user.marketplaceRating} ★ Escrow Rating
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 bg-black/40 px-4 py-2.5 rounded-2xl border border-white/5 text-xs">
              <div className="text-center">
                <div className="font-bold text-white font-mono">{user.followersCount.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 uppercase">Followers</div>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="text-center">
                <div className="font-bold text-white font-mono">{user.followingCount}</div>
                <div className="text-[10px] text-slate-400 uppercase">Following</div>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="text-center">
                <div className="font-bold text-emerald-300 font-mono">142</div>
                <div className="text-[10px] text-slate-400 uppercase">Escrows</div>
              </div>
            </div>
          </div>

          {/* Bio text */}
          <div className="mt-5 p-4 rounded-2xl bg-black/30 border border-emerald-950/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Sovereign Bio & Vision</span>
              <button
                onClick={() => setIsEditingBio(!isEditingBio)}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                <Edit3 className="w-3 h-3" />
                <span>{isEditingBio ? "Cancel" : "Edit Bio"}</span>
              </button>
            </div>

            {isEditingBio ? (
              <div className="space-y-2">
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  rows={3}
                  className="w-full bg-black/50 border border-emerald-950 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500/40"
                />
                <button
                  onClick={handleSaveBio}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs"
                >
                  Save Updates
                </button>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{user.bio}</p>
            )}
          </div>

          {/* Skills Badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {parsedSkills.map((skill, i) => (
              <span
                key={i}
                className="text-xs font-mono px-3 py-1 rounded-xl bg-emerald-950/50 text-emerald-300 border border-emerald-800/40"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 mt-6 border-b border-emerald-950/60 text-xs">
            {[
              { id: "projects", label: "Projects & Portfolio" },
              { id: "trust", label: "Trust Score Breakdown (98%)" },
              { id: "achievements", label: "Achievements & Fellowships" },
              { id: "activity", label: `Dispatches (${userPosts.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 font-semibold transition border-b-2 -mb-[2px] ${
                  activeTab === tab.id
                    ? "border-emerald-400 text-emerald-300 bg-emerald-950/20"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      {/* 1. Projects */}
      {activeTab === "projects" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Kinara Sovereign OS Core",
              role: "Lead Architect",
              description: "Offline-first edge distributed database protocol syncing between Kenya, Nigeria, and Rwanda.",
              stack: ["Rust", "WASM", "PostgreSQL", "M-Pesa 3.0 API"],
              metric: "120ms Latency across 2G Networks",
            },
            {
              title: "Mara Design Tokens Family",
              role: "Design Systems Fellow",
              description: "Pan-African typography and geometric design tokens harmonizing indigenous scripts with digital minimalism.",
              stack: ["Figma Tokens", "Ge'ez Glyphs", "Tailwind CSS"],
              metric: "Used by 42 African startups",
            },
          ].map((proj, i) => (
            <div key={i} className="kinara-card p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-400 font-mono font-bold uppercase tracking-wider">
                  {proj.role}
                </span>
                <span className="text-[10px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded font-mono">
                  {proj.metric}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">{proj.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{proj.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {proj.stack.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-mono text-slate-300 bg-black/40 px-2 py-0.5 rounded border border-white/5"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Trust Score Breakdown */}
      {activeTab === "trust" && (
        <div className="kinara-card p-6 rounded-3xl border border-emerald-500/30 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Trust Score: 98/100 (Sovereign Tier)</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated across national identity verification, escrow transaction history, and peer reviews.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-xl border border-emerald-600/40">
              ZERO DISPUTES EVER
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-950 space-y-1">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Identity Verification</div>
              <div className="text-sm font-bold text-white">National ID + Biometric</div>
              <div className="text-[10px] text-emerald-300">Verified by Republic of Kenya eCitizen</div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-950 space-y-1">
              <div className="text-[10px] uppercase font-bold text-amber-400">Escrow Fulfillments</div>
              <div className="text-sm font-bold text-white">142 Orders / 0 Disputes</div>
              <div className="text-[10px] text-slate-400">100% on-time handover rate</div>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-950 space-y-1">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Community Standing</div>
              <div className="text-sm font-bold text-white">Top 0.1% Contributor</div>
              <div className="text-[10px] text-slate-400">Silicon Savannah Innovators Hub</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Achievements */}
      {activeTab === "achievements" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {parsedAchievements.map((ach, i) => (
            <div
              key={i}
              className="kinara-card p-4 rounded-2xl border border-amber-500/20 flex items-center gap-3.5"
            >
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{ach.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{ach.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Activity */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          {userPosts.length > 0 ? (
            userPosts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              No recent dispatches published yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
