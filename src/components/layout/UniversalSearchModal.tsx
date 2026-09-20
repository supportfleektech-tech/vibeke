"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, X, Sparkles, MapPin, Users, ShoppingBag, Briefcase, Building2, User, ArrowRight } from "lucide-react";
import { CommunityItem, MarketplaceProduct, BusinessStorefront, JobListing, RadarPin } from "@/types";

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string, extra?: any) => void;
  communities: CommunityItem[];
  products: MarketplaceProduct[];
  businesses: BusinessStorefront[];
  jobs: JobListing[];
  radar: RadarPin[];
}

export function UniversalSearchModal({
  isOpen,
  onClose,
  onNavigate,
  communities,
  products,
  businesses,
  jobs,
  radar,
}: UniversalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "communities" | "products" | "businesses" | "jobs" | "people" | "ai">("all");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Handled in parent or toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setAiAnswer(null);
    }
  }, [isOpen]);

  const filteredCommunities = useMemo(() => {
    if (!query) return communities.slice(0, 3);
    const q = query.toLowerCase();
    return communities.filter((c) => c.name.toLowerCase().includes(q) || c.tagline.toLowerCase().includes(q));
  }, [communities, query]);

  const filteredProducts = useMemo(() => {
    if (!query) return products.slice(0, 3);
    const q = query.toLowerCase();
    return products.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, query]);

  const filteredBusinesses = useMemo(() => {
    if (!query) return businesses.slice(0, 2);
    const q = query.toLowerCase();
    return businesses.filter((b) => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q));
  }, [businesses, query]);

  const filteredJobs = useMemo(() => {
    if (!query) return jobs.slice(0, 2);
    const q = query.toLowerCase();
    return jobs.filter((j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q));
  }, [jobs, query]);

  const filteredPeople = useMemo(() => {
    const list = [
      { name: "Brian Mwangi", handle: "@brianmwangi", role: "Product Architect", location: "Nairobi", trust: 98 },
      { name: "Amina Odhiambo", handle: "@amina_ux", role: "Lead UX Researcher", location: "Nairobi", trust: 97 },
      { name: "Folake Adebayo", handle: "@folake_lagos", role: "FinTech Founder", location: "Lagos", trust: 99 },
      { name: "Kofi Mensah", handle: "@kofi_sound", role: "Audio Architect", location: "Accra", trust: 96 },
    ];
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q) || p.role.toLowerCase().includes(q));
  }, [query]);

  async function handleAskAi() {
    if (!query.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copilot", text: query }),
      });
      const data = await res.json();
      setAiAnswer(data.result || "No AI synthesis returned.");
    } catch {
      setAiAnswer("Unable to reach Kinara AI Copilot at this moment.");
    } finally {
      setIsAiLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0b1414] border border-emerald-500/25 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-emerald-950/60 bg-[#0d1818] gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, communities, marketplace, jobs, businesses or ask Kinara AI..."
            className="w-full bg-transparent text-sm md:text-base text-white placeholder-slate-400 outline-none"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 px-2.5 py-1 rounded border border-emerald-800/50"
          >
            ESC
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-emerald-950/40 bg-[#091111] overflow-x-auto text-xs font-medium">
          {(["all", "communities", "products", "businesses", "jobs", "people", "ai"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors capitalize ${
                activeTab === tab
                  ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab === "ai" ? "✨ Kinara AI" : tab}
            </button>
          ))}
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {/* Ask AI Quick Action */}
          {query.trim() && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-amber-950/20 border border-emerald-500/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>ASK KINARA AI COPILOT</span>
                </div>
                <button
                  onClick={handleAskAi}
                  disabled={isAiLoading}
                  className="px-3 py-1 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg flex items-center gap-1 transition"
                >
                  {isAiLoading ? "Synthesizing..." : "Generate Answer"}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-300 italic">
                &ldquo;{query}&rdquo;
              </p>
              {aiAnswer && (
                <div className="mt-2 p-3 bg-black/40 rounded-lg border border-amber-500/20 text-xs text-slate-200 leading-relaxed">
                  {aiAnswer}
                </div>
              )}
            </div>
          )}

          {/* Communities */}
          {(activeTab === "all" || activeTab === "communities") && filteredCommunities.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-emerald-400/90 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Communities</span>
              </div>
              <div className="space-y-2">
                {filteredCommunities.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onNavigate("communities", { communitySlug: c.slug });
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-950/40 border border-white/5 hover:border-emerald-500/30 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-lg object-cover" />
                      <div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                          {c.name}
                          {c.activeVoice && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                              LIVE VOICE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-sm">{c.tagline}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{c.membersCount.toLocaleString()} members</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Marketplace Products */}
          {(activeTab === "all" || activeTab === "products") && filteredProducts.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-amber-400/90 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Marketplace & Escrow</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onNavigate("marketplace");
                      onClose();
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-amber-950/30 border border-white/5 hover:border-amber-500/30 cursor-pointer transition"
                  >
                    <img src={p.image} alt={p.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">{p.title}</div>
                      <div className="text-xs font-mono font-bold text-amber-300">
                        {p.currency} {p.price.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400">{p.neighborhood} • {p.distanceKm} km</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* People & Profiles */}
          {(activeTab === "all" || activeTab === "people") && filteredPeople.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-emerald-400/90 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Verified People</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredPeople.map((person) => (
                  <div
                    key={person.handle}
                    onClick={() => {
                      onNavigate("profile");
                      onClose();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-950/30 border border-white/5 hover:border-emerald-500/30 cursor-pointer transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-300">
                      {person.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-white flex items-center gap-1">
                        {person.name}
                        <span className="text-[10px] text-amber-400 bg-amber-500/15 px-1 rounded">
                          ★ {person.trust}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{person.role} • {person.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Businesses */}
          {(activeTab === "all" || activeTab === "businesses") && filteredBusinesses.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-emerald-400/90 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Verified Businesses</span>
              </div>
              <div className="space-y-2">
                {filteredBusinesses.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      onNavigate("business", { businessId: b.id });
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-950/30 border border-white/5 hover:border-emerald-500/30 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <img src={b.avatar} alt={b.name} className="w-9 h-9 rounded-lg object-cover" />
                      <div>
                        <div className="text-xs font-semibold text-white">{b.name}</div>
                        <div className="text-[11px] text-slate-400">{b.category} • {b.neighborhood}</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-amber-400">★ {b.rating}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jobs */}
          {(activeTab === "all" || activeTab === "jobs") && filteredJobs.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-emerald-400/90 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Opportunities & Jobs</span>
              </div>
              <div className="space-y-2">
                {filteredJobs.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => {
                      onNavigate("jobs");
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-950/30 border border-white/5 hover:border-emerald-500/30 cursor-pointer transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{j.title}</div>
                      <div className="text-[11px] text-slate-400">{j.company} • {j.location}</div>
                    </div>
                    <div className="text-xs text-emerald-300 font-mono">{j.salary}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-emerald-950/60 bg-[#070e0e] text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="bg-black/50 px-1 py-0.5 rounded text-slate-300">↑↓</kbd></span>
            <span>Select: <kbd className="bg-black/50 px-1 py-0.5 rounded text-slate-300">Enter</kbd></span>
          </div>
          <span className="text-emerald-400 font-medium">Kinara Sovereign Index</span>
        </div>
      </div>
    </div>
  );
}
