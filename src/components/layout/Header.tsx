"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Sparkles,
  Zap,
  Globe,
  SlidersHorizontal,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Wifi,
  WifiOff,
  Sun,
  Palette
} from "lucide-react";
import Image from "next/image";
import { PersonaRole, UserProfile } from "@/types";

interface HeaderProps {
  currentPersona: PersonaRole;
  onSelectPersona: (role: PersonaRole) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  lowBandwidth: boolean;
  onToggleLowBandwidth: () => void;
  onOpenSearch: () => void;
  onOpenCustomizer: () => void;
  onNavigate: (view: string) => void;
  user: UserProfile | null;
  onToggleSidebarMobile?: () => void;
}

const AFRICAN_CITIES = [
  { name: "Nairobi", temp: "24°C", tz: "EAT", tag: "Silicon Savannah" },
  { name: "Lagos", temp: "31°C", tz: "WAT", tag: "Creative Liquidity" },
  { name: "Kigali", temp: "22°C", tz: "CAT", tag: "Clean Tech Axis" },
  { name: "Accra", temp: "29°C", tz: "GMT", tag: "Sound & Culture" },
  { name: "Cape Town", temp: "20°C", tz: "SAST", tag: "Design Corridor" },
  { name: "Addis Ababa", temp: "21°C", tz: "EAT", tag: "Aviation & Heritage" },
];

const PERSONA_LABELS: Record<PersonaRole, { label: string; desc: string; icon: string }> = {
  citizen: { label: "Citizen", desc: "Modular feed & local discovery", icon: "🌍" },
  creator: { label: "Creator Studio", desc: "Analytics & live audio lounges", icon: "🎨" },
  business: { label: "Enterprise", desc: "Storefront CRM & escrow orders", icon: "💼" },
  student: { label: "Scholar", desc: "Study pods & peer hackathons", icon: "📚" },
  buyer: { label: "Collector", desc: "Marketplace & verified artisan deals", icon: "🛒" },
};

export function Header({
  currentPersona,
  onSelectPersona,
  selectedCity,
  onSelectCity,
  lowBandwidth,
  onToggleLowBandwidth,
  onOpenSearch,
  onOpenCustomizer,
  onNavigate,
  user,
  onToggleSidebarMobile,
}: HeaderProps) {
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);

  const activeCityData = AFRICAN_CITIES.find((c) => c.name.toLowerCase() === selectedCity.toLowerCase()) || AFRICAN_CITIES[0];

  // Outside-click close + Escape handling for both dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityDropdownOpen(false);
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) setPersonaDropdownOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCityDropdownOpen(false);
        setPersonaDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-emerald-950/60 bg-[#060c0c]/85" role="banner">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-3">
          {onToggleSidebarMobile && (
            <button
              onClick={onToggleSidebarMobile}
              className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5"
              aria-label="Toggle navigation"
              aria-expanded={undefined}
              aria-controls="mobile-sidebar"
            >
              <Menu className="w-5 h-5" aria-hidden />
            </button>
          )}

          <div
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onNavigate("home")}
            aria-label="Go to home"
          >
            {/* Kinara African Apex Glyph */}
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-700 to-amber-600 p-[1.5px] shadow-lg shadow-emerald-950/50 group-hover:shadow-emerald-500/20 transition">
              <div className="w-full h-full bg-[#060d0d] rounded-[10px] flex items-center justify-center overflow-hidden">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 via-emerald-100 to-amber-300 text-lg tracking-tighter">
                  K
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" aria-hidden />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5 font-sans">
                KINARA
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-emerald-400/80 -mt-1 hidden sm:block">
                Sovereign Platform
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar Trigger (Universal Search) */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block">
          <button
            onClick={onOpenSearch}
            className="w-full min-h-11 px-3.5 bg-black/40 hover:bg-black/60 border border-emerald-950/70 hover:border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-slate-400 transition group shadow-inner touch-target"
            aria-label="Open universal search"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300 transition" aria-hidden />
              <span>Search people, communities, products or ask AI...</span>
            </div>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] bg-emerald-950/50 text-emerald-300 rounded border border-emerald-800/40 font-mono" aria-hidden>
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: City Vibe, Persona Switcher, Data-Saver, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search button */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden min-h-11 min-w-11 p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/5 flex items-center justify-center touch-target"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-emerald-400" aria-hidden />
          </button>

          {/* City Selector Dropdown */}
          <div className="relative" ref={cityRef}>
            <button
              onClick={() => {
                setCityDropdownOpen(!cityDropdownOpen);
                setPersonaDropdownOpen(false);
              }}
              className="min-h-11 px-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/30 flex items-center gap-1.5 text-xs text-slate-200 transition touch-target"
              aria-label={`Select city, current ${activeCityData.name}`}
              aria-expanded={cityDropdownOpen}
              aria-haspopup="menu"
              aria-controls="city-menu"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
              <span className="font-semibold">{activeCityData.name}</span>
              <span className="text-[10px] text-emerald-300/80 hidden lg:inline">{activeCityData.temp}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition ${cityDropdownOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>

            {cityDropdownOpen && (
              <div id="city-menu" role="menu" aria-label="Pan-African hubs" className="absolute right-0 mt-2 w-56 glass-dropdown rounded-xl py-1 z-50 text-xs shadow-2xl animate-in">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80 border-b border-emerald-950">
                  Pan-African Hubs
                </div>
                {AFRICAN_CITIES.map((c) => (
                  <button
                    key={c.name}
                    role="menuitem"
                    onClick={() => {
                      onSelectCity(c.name);
                      setCityDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-950/60 transition focus-visible:outline-none focus-visible:bg-emerald-950/40 ${
                      selectedCity.toLowerCase() === c.name.toLowerCase()
                        ? "text-emerald-300 bg-emerald-950/40 font-semibold"
                        : "text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.tag}</div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400">{c.temp}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Adaptive Persona Switcher */}
          <div className="relative" ref={personaRef}>
            <button
              onClick={() => {
                setPersonaDropdownOpen(!personaDropdownOpen);
                setCityDropdownOpen(false);
              }}
              className="min-h-11 px-2.5 rounded-lg bg-gradient-to-r from-emerald-950/60 to-amber-950/40 hover:bg-emerald-900/40 border border-emerald-500/30 flex items-center gap-1.5 text-xs text-white transition shadow-sm touch-target"
              title="Switch Adaptive UI Persona"
              aria-label={`Switch persona, current ${PERSONA_LABELS[currentPersona].label}`}
              aria-expanded={personaDropdownOpen}
              aria-haspopup="menu"
              aria-controls="persona-menu"
            >
              <span className="text-xs" aria-hidden>{PERSONA_LABELS[currentPersona].icon}</span>
              <span className="font-semibold hidden md:inline">{PERSONA_LABELS[currentPersona].label}</span>
              <ChevronDown className={`w-3 h-3 text-amber-400 transition ${personaDropdownOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>

            {personaDropdownOpen && (
              <div id="persona-menu" role="menu" aria-label="Adaptive UI Mode" className="absolute right-0 mt-2 w-64 glass-dropdown rounded-xl p-1.5 z-50 text-xs shadow-2xl animate-in">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400 border-b border-white/10 mb-1">
                  Adaptive UI Mode
                </div>
                {(Object.keys(PERSONA_LABELS) as PersonaRole[]).map((role) => (
                  <button
                    key={role}
                    role="menuitem"
                    onClick={() => {
                      onSelectPersona(role);
                      setPersonaDropdownOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-left flex items-start gap-2.5 hover:bg-white/5 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                      currentPersona === role
                        ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-300"
                        : "text-slate-300"
                    }`}
                    aria-current={currentPersona === role ? "true" : undefined}
                  >
                    <span className="text-base mt-0.5" aria-hidden>{PERSONA_LABELS[role].icon}</span>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        {PERSONA_LABELS[role].label}
                        {currentPersona === role && (
                          <span className="text-[9px] bg-emerald-500 text-black px-1 rounded font-bold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight">
                        {PERSONA_LABELS[role].desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Low-Bandwidth Mode Toggle (Data Saver) */}
          <button
            onClick={onToggleLowBandwidth}
            title={lowBandwidth ? "Low Bandwidth Mode Active (82% data saved)" : "Switch to Low Bandwidth Mode"}
            aria-pressed={lowBandwidth}
            aria-label={lowBandwidth ? "Disable low bandwidth mode" : "Enable low bandwidth mode"}
            className={`min-h-11 px-2 rounded-lg flex items-center gap-1 text-xs transition border touch-target ${
              lowBandwidth
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-black/30 hover:bg-black/50 text-slate-400 border-white/5 hover:border-emerald-800/40"
            }`}
          >
            {lowBandwidth ? <WifiOff className="w-3.5 h-3.5 text-amber-400" aria-hidden /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" aria-hidden />}
            <span className="text-[11px] font-mono hidden xl:inline">
              {lowBandwidth ? "Lite: -82%" : "Data Saver"}
            </span>
          </button>

          {/* Module Layout Customizer Trigger */}
          <button
            onClick={onOpenCustomizer}
            title="Customize Dashboard Modular Sections"
            aria-label="Customize dashboard"
            className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-black/30 hover:bg-emerald-950/60 border border-white/5 hover:border-emerald-500/30 flex items-center justify-center text-slate-300 hover:text-emerald-300 transition touch-target"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden />
          </button>

          {/* User Profile Avatar & Trust Badge */}
          <div
            onClick={() => onNavigate("profile")}
            className="flex items-center gap-2 pl-1 cursor-pointer group"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onNavigate("profile")}
            aria-label="Open profile"
          >
            <div className="relative">
              <Image
                src={
                  user?.avatar ||
                  "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                }
                alt={user?.name || "Brian Mwangi"}
                width={32}
                height={32}
                unoptimized
                loading="lazy"
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-emerald-500/40 group-hover:ring-emerald-400 transition"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#060b0b] rounded-full flex items-center justify-center" aria-hidden>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </span>
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition leading-none">
                {user?.name || "Brian Mwangi"}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5 mt-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-amber-400 inline" aria-hidden />
                {user?.trustScore || 98} Trust
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
