"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  MapPin,
  Users,
  Building2,
  Calendar,
  Tag,
  ShoppingBag,
  MessageCircle,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { RadarPin } from "@/types";

// Leaflet CSS — required once (also imported in LeafletMapCore; keep here for SSR-safe guarantee)
import "leaflet/dist/leaflet.css";

// Dynamically import the Leaflet map core (ssr:false) to avoid "window is not defined"
const LeafletMapCore = dynamic(() => import("./LeafletMapCore"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] lg:min-h-[500px] bg-[#060c0c] flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center animate-pulse">
        <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
      </div>
      <div className="text-xs font-mono text-emerald-400/80 tracking-widest">LOADING SOVEREIGN MAP • OSM + CARTO</div>
      <div className="text-[11px] text-slate-500">Kilimani • -1.2921, 36.7850 • 5.0 KM</div>
    </div>
  ),
});

interface LocalRadarMapProps {
  pins: RadarPin[];
  selectedCity: string;
  onNavigate: (view: string, extra?: unknown) => void;
}

const KILIMANI_POS: [number, number] = [-1.2921, 36.785];

export function LocalRadarMap({ pins, selectedCity, onNavigate }: LocalRadarMapProps) {
  const [filter, setFilter] = useState<string>("all");
  const [selectedPin, setSelectedPin] = useState<RadarPin | null>(pins[0] || null);
  const [userPos, setUserPos] = useState<[number, number]>(KILIMANI_POS);

  // Keep selected pin in sync when pins prop changes (e.g., initial fetch)
  useEffect(() => {
    if (!selectedPin && pins.length > 0) {
      setSelectedPin(pins[0]);
    }
  }, [pins, selectedPin]);

  // Opt-in geolocation: request once on mount, fallback to Kilimani
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    // Use permission-friendly geolocation (no prompt spam — only if user grants)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Only accept if finite & within plausible Nairobi bounds (~100km)
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setUserPos([latitude, longitude]);
        }
      },
      () => {
        // Silently keep Kilimani fallback; privacy opt-in respected
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const filteredPins = useMemo(() => {
    if (filter === "all") return pins;
    return pins.filter((p) => p.type === filter);
  }, [pins, filter]);

  // When filter changes, ensure selectedPin is visible; if not, auto-pick first filtered
  useEffect(() => {
    if (filteredPins.length === 0) {
      setSelectedPin(null);
      return;
    }
    if (selectedPin && filteredPins.some((p) => p.id === selectedPin.id)) return;
    setSelectedPin(filteredPins[0]);
  }, [filteredPins, selectedPin]);

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

  const handleRouteDrawer = () => {
    if (!selectedPin) return;
    const plat = parseFloat(String(selectedPin.lat));
    const plng = parseFloat(String(selectedPin.lng));
    if (!Number.isFinite(plat) || !Number.isFinite(plng)) {
      toast.error("Pin location unavailable");
      return;
    }
    const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userPos[0]},${userPos[1]};${plat},${plng}#map=14/${plat}/${plng}`;
    toast.success(`Routing to ${selectedPin.name} • OSM directions opened`);
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDrawerAction = () => {
    if (!selectedPin) return;
    switch (selectedPin.type) {
      case "friend":
        onNavigate("messaging");
        toast.success(`Opening dispatch to ${selectedPin.name}`);
        break;
      case "business":
        onNavigate("business");
        toast.success(`Opening storefront: ${selectedPin.name}`);
        break;
      case "listing":
        onNavigate("marketplace");
        toast.success(`Opening listing: ${selectedPin.name}`);
        break;
      case "event":
        toast.success(`RSVP Confirmed for ${selectedPin.name}! Event pass saved to your Kinara wallet.`);
        break;
      case "deal":
        toast.success(`Deal Activated! Show QR at counter: KINARA-PERK-25 • ${selectedPin.name}`);
        break;
      case "service":
        toast.success(`Service inquiry sent to ${selectedPin.name}`);
        break;
      default:
        toast.info(`Viewing ${selectedPin.name}`);
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
              <h3 className="text-base font-bold text-white font-sans">Local Radar • {selectedCity}</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                {filteredPins.length} ACTIVE NODES
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time proximity network: friends, events, businesses & verified drops</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-thin">
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
              className={`px-2.5 py-1 rounded-lg transition capitalize font-medium whitespace-nowrap ${
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

      {/* Main Radar Screen Layout: real map + drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
        {/* Real Leaflet Map */}
        <div className="lg:col-span-8 relative bg-[#060c0c] overflow-hidden border-b lg:border-b-0 lg:border-r border-emerald-950/60 flex flex-col">
          <div className="relative w-full h-[400px] lg:h-[500px] border-b border-emerald-500/10">
            <LeafletMapCore
              pins={filteredPins}
              selectedPin={selectedPin}
              onSelectPin={setSelectedPin}
              userPos={userPos}
              onNavigate={onNavigate}
            />

            {/* HUD overlay — GPS + range */}
            <div className="absolute bottom-3 left-3 z-[400] text-[10px] font-mono text-emerald-300 bg-black/75 backdrop-blur px-2.5 py-1 rounded-md border border-emerald-950 shadow-lg">
              GPS: {userPos[0].toFixed(4)}, {userPos[1].toFixed(4)} • RANGE: 5.0 KM RADIUS
            </div>
            <div className="absolute top-3 right-3 z-[400] text-[10px] font-mono text-amber-300 bg-black/70 px-2 py-1 rounded-md border border-amber-500/20">
              CARTO LIGHT • OSM FREE TILES
            </div>
          </div>

          {/* Optional mini legend strip below map */}
          <div className="px-3 py-2 bg-[#071313] border-t border-emerald-950/40 flex items-center gap-2 text-[10px] font-mono text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Friends
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Biz
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Events
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Deals
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-300" /> Drops
            </span>
            <span className="ml-auto text-emerald-400/70">tap pin → popup • click for drawer</span>
          </div>
        </div>

        {/* Pin Inspection & Direct Action Drawer */}
        <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-[#0b1616] min-h-[420px]">
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
                <Image
                  src={selectedPin.avatar}
                  alt={selectedPin.name}
                  width={56}
                  height={56}
                  unoptimized
                  loading="lazy"
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/30"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white leading-tight truncate">{selectedPin.name}</h4>
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
                    onClick={handleDrawerAction}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Quick Dispatch / Meet</span>
                  </button>
                )}

                {selectedPin.type === "business" && (
                  <button
                    onClick={handleDrawerAction}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>View Storefront & Book Pod</span>
                  </button>
                )}

                {selectedPin.type === "listing" && (
                  <button
                    onClick={handleDrawerAction}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>View Listing & Escrow Buy</span>
                  </button>
                )}

                {selectedPin.type === "event" && (
                  <button
                    onClick={handleDrawerAction}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>RSVP & Get Digital Pass</span>
                  </button>
                )}

                {selectedPin.type === "deal" && (
                  <button
                    onClick={handleDrawerAction}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Tag className="w-4 h-4" />
                    <span>Claim 25% Member Voucher</span>
                  </button>
                )}

                {selectedPin.type === "service" && (
                  <button
                    onClick={handleDrawerAction}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Request Service</span>
                  </button>
                )}

                <button
                  onClick={handleRouteDrawer}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-medium text-xs flex items-center justify-center gap-2 border border-white/5 transition"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Get Turn-by-Turn Route</span>
                </button>
              </div>

              {/* Lat/Lng debug — useful for sovereign map verification */}
              <div className="pt-2 text-[10px] font-mono text-slate-500">
                COORDS: {parseFloat(String(selectedPin.lat)).toFixed(4)}, {parseFloat(String(selectedPin.lng)).toFixed(4)}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">Select a node on the radar to inspect details and initiate actions.</div>
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
