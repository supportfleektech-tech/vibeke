"use client";

import React, { useEffect } from "react";
import {
  LayoutDashboard,
  Compass,
  Users,
  ShoppingBag,
  Building2,
  MessageSquare,
  Briefcase,
  User,
  Sparkles,
  Radio,
  Shield,
  Layers,
  Flame,
  Award,
  Clapperboard,
  CircleDashed,
  Video,
  Search,
  Bell,
  Bookmark,
  Calendar,
  Telescope,
  Zap,
  GraduationCap,
  FileText,
  BarChart3,
  Flag
} from "lucide-react";
import { PersonaRole } from "@/types";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentPersona: PersonaRole;
  unreadCount?: number;
  activeVoiceCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  currentView,
  onNavigate,
  currentPersona,
  unreadCount = 2,
  activeVoiceCount = 3,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const navItems = [
    {
      id: "home",
      label: "Dynamic Home",
      icon: LayoutDashboard,
      highlight: false,
    },
    {
      id: "clips",
      label: "Kinara Clips",
      icon: Clapperboard,
      badge: "TikTok",
      badgeColor: "bg-pink-500/20 text-pink-300",
    },
    {
      id: "live",
      label: "Live Stages",
      icon: Video,
      badge: "LIVE",
      badgeColor: "bg-red-500/20 text-red-300",
    },
    {
      id: "explore",
      label: "Explore & Hashtags",
      icon: Telescope,
      badge: "#Trending",
      badgeColor: "bg-indigo-500/20 text-indigo-300",
    },
    {
      id: "stories",
      label: "Stories",
      icon: CircleDashed,
      badge: "24h",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
    },
    {
      id: "radar",
      label: "Local Radar & Map",
      icon: Compass,
      badge: "LIVE",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
    },
    {
      id: "communities",
      label: "Communities & Audio",
      icon: Users,
      badge: `${activeVoiceCount} Voice`,
      badgeColor: "bg-emerald-500/20 text-emerald-300",
    },
    {
      id: "marketplace",
      label: "Marketplace & Escrow",
      icon: ShoppingBag,
      badge: "AI Check",
      badgeColor: "bg-amber-500/20 text-amber-300",
    },
    {
      id: "business",
      label: "Business Storefronts",
      icon: Building2,
    },
    {
      id: "events",
      label: "Events & Meetups",
      icon: Calendar,
      badge: "2",
      badgeColor: "bg-blue-500/20 text-blue-300",
    },
    {
      id: "messaging",
      label: "Direct Dispatches",
      icon: MessageSquare,
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
      badgeColor: "bg-emerald-500 text-black font-bold",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
      badgeColor: "bg-red-500 text-white font-bold",
    },
    {
      id: "bookmarks",
      label: "Bookmarks & Saves",
      icon: Bookmark,
    },
    {
      id: "jobs",
      label: "Opportunities & Jobs",
      icon: Briefcase,
    },
    {
      id: "profile",
      label: "Sovereign Profile",
      icon: User,
      badge: "98 ★",
      badgeColor: "bg-amber-500/20 text-amber-300",
    },
    {
      id: "courses",
      label: "Courses & Studio",
      icon: GraduationCap,
      badge: "New",
      badgeColor: "bg-indigo-500/20 text-indigo-300",
    },
    {
      id: "admin",
      label: "Trust Ops (Admin)",
      icon: Shield,
      badge: "Ops",
      badgeColor: "bg-slate-500/20 text-slate-300",
    },
    {
      id: "ai",
      label: "Kinara AI Copilot",
      icon: Sparkles,
      highlight: true,
    },
  ];

  // Escape handling for mobile drawer + focus
  useEffect(() => {
    if (!isMobileOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && onCloseMobile) onCloseMobile();
    }
    document.addEventListener("keydown", handleEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = prev;
    };
  }, [isMobileOpen, onCloseMobile]);

  const content = (
    <div className="flex flex-col h-full justify-between py-4 px-3 select-none">
      <div className="space-y-6">
        {/* Navigation list */}
        <nav aria-label="Primary" className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500" aria-hidden>
            Platform Hubs
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Navigate to ${item.label}${item.badge ? `, ${item.badge}` : ""}`}
                className={`w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-950/90 to-emerald-900/40 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    : item.highlight
                    ? "text-amber-300 hover:bg-amber-950/20 border border-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive
                        ? "text-emerald-400"
                        : item.highlight
                        ? "text-amber-400"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span aria-hidden className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${item.badgeColor || ""}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Audio Room Quick Widget */}
        <div
          onClick={() => {
            onNavigate("communities");
            if (onCloseMobile) onCloseMobile();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onNavigate("communities");
              if (onCloseMobile) onCloseMobile();
            }
          }}
          aria-label="Join live audio lounge, 14 listening"
          className="p-3 rounded-2xl bg-gradient-to-br from-[#0c1a17] to-[#081210] border border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" aria-hidden />
              Live Audio Lounge
            </span>
            <span className="text-[10px] text-slate-400 font-mono">14 listening</span>
          </div>
          <div className="text-xs font-semibold text-white group-hover:text-emerald-200 transition truncate">
            Silicon Savannah: AI Agents & M-Pesa Micro-rails
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex -space-x-2" aria-hidden>
              <div className="w-6 h-6 rounded-full bg-emerald-800 border-2 border-[#0c1a17] text-[10px] flex items-center justify-center font-bold text-emerald-200">
                BM
              </div>
              <div className="w-6 h-6 rounded-full bg-amber-800 border-2 border-[#0c1a17] text-[10px] flex items-center justify-center font-bold text-amber-200">
                AO
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-900 border-2 border-[#0c1a17] text-[10px] flex items-center justify-center font-bold text-emerald-300">
                FA
              </div>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium group-hover:underline flex items-center gap-1">
              Join Room →
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Sovereignty Badge */}
      <div className="pt-4 border-t border-emerald-950/50 space-y-2">
        <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-950/80 flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden />
          <div className="text-[11px]">
            <div className="font-semibold text-slate-200">Kinara Escrow & Trust</div>
            <div className="text-slate-400 text-[10px]">Zero fraud guarantee • 256-bit</div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 text-center font-mono pt-1" aria-hidden>
          KINARA SOVEREIGN OS • NAIROBI
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside id="desktop-sidebar" aria-label="Sidebar navigation" className="hidden md:block w-64 shrink-0 glass-panel border-r border-emerald-950/60 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onClick={(e) => {
            if (e.target === e.currentTarget && onCloseMobile) onCloseMobile();
          }}
        >
          <div id="mobile-sidebar" className="fixed inset-y-0 left-0 w-72 bg-[#091111] border-r border-emerald-500/30 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-emerald-950">
              <span className="text-sm font-bold text-emerald-300">KINARA NAVIGATION</span>
              <button
                onClick={onCloseMobile}
                className="min-h-11 min-w-11 p-2 rounded-lg text-slate-400 hover:text-white touch-target flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
