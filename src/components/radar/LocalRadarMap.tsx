"use client";

import React, { useState } from "react";
import {
  Compass,
  MapPin,
  Users,
  Building2,
  Calendar,
  Tag,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  Navigation,
  Clock,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { RadarPin } from "@/types";

interface LocalRadarMapProps {
  pins: RadarPin[];
  selectedCity: string;
  onNavigate: (view: string, extra?: any) => void;
}

export function LocalRadarMap({ pins, selectedCity, onNavigate }: LocalRadarMapProps) {
  const [filter, setFilter] = useState<string>("all");
  const [selectedPin, setSelectedPin] = useState<RadarPin | null>(pins[0] || null);
  const [radarPinging, setRadarPinging] = useState(true);

  const filteredPins = pins.filter((p) => {
    if (filter === "all") return true;
    return p.type === filter;
  });

  const getPinIcon = (type: string) => {
    switch (type) {
      case "friend":
        return <Users className="w-3.5 h-3.5 text-emerald-400" />;
      case "business":
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
      case "event":
        return <Calendar className="w-3.5 h-3.5 text-sky-400" />;
      case "deal":
        return <Tag className="w-3.5 h-3.5 text-rose-400" />;
      case "listing":
        return <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getPinColor = (type: string) => {
    switch (type) {
      case "friend":
        return "border-emerald-500 bg-emerald-950/80 text-emerald-300";
      case "business":
        return "border-amber-500 bg-amber-950/80 text-amber-300";
      case "event":
        return "border-sky-500 bg-sky-950/80 text-sky-300";
      case "deal":
        return "border-rose-500 bg-rose-950/80 text-rose-300";
      case "listing":
        return "border-amber-400 bg-amber-900/80 text-amber-200";
      default:
        return "border-emerald-500 bg-emerald-950/80 text-emerald-300";
    }
  };

  return (
    <div className="kinara-card rounded-3xl border border-emerald-500/25 overflow-hidden bg-[#091212] shadow-xl">
      {/* Radar Header */}
      <div className="p-4 sm:p-5 border-b border-emerald-950/60 bg-gradient-to-r from-[#0c1a17] to-[#0a1413] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-sans">
                Local Radar • {selectedCity}
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                12 ACTIVE NODES
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time proximity network: friends, events, businesses & verified drops
            </p>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: "all", label: "All Pins" },
            { id: "friend", label: "Friends" },
            { id: "business", label: "Businesses" },
            { id: "event", label: "Events" },
            { id: "deal", label: "Deals" },
            { id: "listing", label: "Drops" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-2.5 py-1 rounded-lg transition capitalize font-medium ${
                filter === item.id
                  ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Radar Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
        {/* Interactive Tactical Map & Radar Visualizer */}
        <div className="lg:col-span-8 relative bg-[#060c0c] p-6 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-emerald-950/60">
          {/* Radar concentric circular grid rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[180px] h-[180px] rounded-full border border-emerald-500/10" />
            <div className="absolute w-[320px] h-[320px] rounded-full border border-emerald-500/15" />
            <div className="absolute w-[460px] h-[460px] rounded-full border border-emerald-500/10" />
            <div className="absolute w-[600px] h-[600px] rounded-full border border-emerald-500/5" />
            {/* Center crosshair */}
            <div className="absolute w-full h-[1px] bg-emerald-500/10" />
            <div className="absolute h-full w-[1px] bg-emerald-500/10" />

            {/* Sweep line animation */}
            <div className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent pointer-events-none animate-spin-slow" />
          </div>

          {/* Current user location center */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 voice-pulse">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-300 mt-1 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30">
              Kilimani • You (Brian)
            </span>
          </div>

          {/* Placed Interactive Radar Nodes around the map */}
          {filteredPins.map((pin, i) => {
            // Calculate pseudo coordinates in circular space
            const angles = [35, 120, 210, 310, 165, 75];
            const angle = (angles[i % angles.length] * Math.PI) / 180;
            const radius = 90 + (i % 3) * 55;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const isSelected = selectedPin?.id === pin.id;

            return (
              <div
                key={pin.id}
                onClick={() => setSelectedPin(pin)}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
                className="absolute z-20 cursor-pointer group"
              >
                <div
                  className={`p-1.5 rounded-xl border flex items-center gap-1.5 shadow-lg transition-transform hover:scale-110 ${getPinColor(
                    pin.type
                  )} ${isSelected ? "ring-2 ring-emerald-400 scale-105" : ""}`}
                >
                  <img
                    src={pin.avatar}
                    alt={pin.name}
                    className="w-6 h-6 rounded-lg object-cover"
                  />
                  <div className="hidden sm:block text-[11px] font-semibold max-w-[110px] truncate">
                    {pin.name}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Compass & Distance HUD */}
          <div className="absolute bottom-3 left-3 text-[10px] font-mono text-emerald-400/70 bg-black/70 px-2.5 py-1 rounded-md border border-emerald-950">
            GPS: -1.2921, 36.7850 • RANGE: 5.0 KM RADIUS
          </div>
        </div>

        {/* Pin Inspection & Direct Action Drawer */}
        <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-[#0b1616]">
          {selectedPin ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                <span className="uppercase tracking-wider flex items-center gap-1">
                  {getPinIcon(selectedPin.type)}
                  {selectedPin.type} PIN
                </span>
                <span className="font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                  {selectedPin.distance}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={selectedPin.avatar}
                  alt={selectedPin.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/30"
                />
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {selectedPin.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedPin.neighborhood}, {selectedPin.city}
                  </p>
                  <span className="inline-block mt-1 text-[10px] text-amber-300 font-semibold bg-amber-500/15 px-2 py-0.5 rounded">
                    {selectedPin.status}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-emerald-950 text-xs text-slate-300 leading-relaxed">
                {selectedPin.details}
              </div>

              {/* Direct Actions */}
              <div className="space-y-2 pt-2">
                {selectedPin.type === "friend" && (
                  <button
                    onClick={() => onNavigate("messaging")}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Quick Dispatch / Meet</span>
                  </button>
                )}

                {selectedPin.type === "business" && (
                  <button
                    onClick={() => onNavigate("business")}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>View Storefront & Book Pod</span>
                  </button>
                )}

                {selectedPin.type === "listing" && (
                  <button
                    onClick={() => onNavigate("marketplace")}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>View Listing & Escrow Buy</span>
                  </button>
                )}

                {selectedPin.type === "event" && (
                  <button
                    onClick={() => alert(`RSVP Confirmed for ${selectedPin.name}! Event pass saved to your Kinara wallet.`)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>RSVP & Get Digital Pass</span>
                  </button>
                )}

                {selectedPin.type === "deal" && (
                  <button
                    onClick={() => alert(`Deal Activated! Show QR code at counter: KINARA-PERK-25`)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Tag className="w-4 h-4" />
                    <span>Claim 25% Member Voucher</span>
                  </button>
                )}

                <button
                  onClick={() => alert(`Directions loaded via Kinara Sovereign Maps: Route is 7 mins via Ring Road Kilimani.`)}
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-medium text-xs flex items-center justify-center gap-2 border border-white/5 transition"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Get Turn-by-Turn Route</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Select a node on the radar to inspect details and initiate actions.
            </div>
          )}

          {/* Verified safety guarantee */}
          <div className="pt-4 mt-4 border-t border-emerald-950/60 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Opt-in privacy • Zero third-party ad tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
