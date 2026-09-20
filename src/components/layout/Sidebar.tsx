"use client";

import React from "react";
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
  Award
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
      id: "messaging",
      label: "Direct Dispatches",
      icon: MessageSquare,
      badge: unreadCount > 0 ? String(unreadCount) : undefined,
      badgeColor: "bg-emerald-500 text-black font-bold",
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
      id: "ai",
      label: "Kinara AI Copilot",
      icon: Sparkles,
      highlight: true,
    },
  ];

  const content = (
    <div className="flex flex-col h-full justify-between py-4 px-3 select-none">
      <div className="space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
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
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${item.badgeColor || ""}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Audio Room Quick Widget */}
        <div
          onClick={() => {
            onNavigate("communities");
            if (onCloseMobile) onCloseMobile();
          }}
          className="p-3 rounded-2xl bg-gradient-to-br from-[#0c1a17] to-[#081210] border border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Live Audio Lounge
            </span>
            <span className="text-[10px] text-slate-400 font-mono">14 listening</span>
          </div>
          <div className="text-xs font-semibold text-white group-hover:text-emerald-200 transition truncate">
            Silicon Savannah: AI Agents & M-Pesa Micro-rails
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex -space-x-2">
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
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-[11px]">
            <div className="font-semibold text-slate-200">Kinara Escrow & Trust</div>
            <div className="text-slate-400 text-[10px]">Zero fraud guarantee • 256-bit</div>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 text-center font-mono pt-1">
          KINARA SOVEREIGN OS • NAIROBI
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:block w-64 shrink-0 glass-panel border-r border-emerald-950/60 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-y-0 left-0 w-72 bg-[#091111] border-r border-emerald-500/30 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-emerald-950">
              <span className="text-sm font-bold text-emerald-300">KINARA NAVIGATION</span>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
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
