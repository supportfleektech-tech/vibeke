"use client";

import Image from "next/image";

import React, { useState } from "react";
import {
  Building2,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  Calendar,
  MessageCircle,
  Navigation,
  TrendingUp,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { BusinessStorefront } from "@/types";
import { BookingModal } from "./BookingModal";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface BusinessViewProps {
  businesses: BusinessStorefront[];
  selectedCity: string;
  onNavigateMessage: (businessName: string) => void;
  initialBusinessId?: string;
}

export function BusinessView({
  businesses,
  selectedCity,
  onNavigateMessage,
  initialBusinessId,
}: BusinessViewProps) {
  const [selectedId, setSelectedId] = useState(initialBusinessId || businesses[0]?.id || "biz_ikigai_nairobi");
  const [activeTab, setActiveTab] = useState<"catalog" | "reviews" | "analytics">("catalog");
  const [bookingService, setBookingService] = useState<string | null>(null);

  const business = businesses.find((b) => b.id === selectedId) || businesses[0];

  const parsedServices: { name: string; price: string }[] = (() => {
    const raw: any = (business as any)?.services;
    // Handle both string (JSON stringified) and jsonb array (already parsed)
    if (Array.isArray(raw)) return raw as { name: string; price: string }[];
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as { name: string; price: string }[];
        // fallback if not array but single object
        if (parsed && typeof parsed === "object") return [parsed];
        return [];
      } catch {
        return [
          { name: "Day Pass + Single-Origin Coffee", price: "KES 1,500 / day" },
          { name: "Private Acoustic Sound Pod", price: "KES 2,400" },
        ];
      }
    }
    // Already object but not array
    if (raw && typeof raw === "object") {
      if (Array.isArray(raw)) return raw;
      return [];
    }
    return [
      { name: "Day Pass + Single-Origin Coffee", price: "KES 1,500 / day" },
      { name: "Private Acoustic Sound Pod", price: "KES 2,400" },
    ];
  })();

  function handleDirections() {
    if (!business) return;
    const lat = (business as any).lat;
    const lng = (business as any).lng;
    let url: string;
    if (lat && lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(lat))},${encodeURIComponent(String(lng))}`;
    } else {
      const query = encodeURIComponent(`${business.name}, ${business.neighborhood}, ${business.city}`);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Directions to ${business.name} opened in Google Maps`);
  }

  if (!business) return null;

  return (
    <div className="space-y-6">
      {/* Directory Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Business directory">
        {businesses.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={selectedId === b.id}
            onClick={() => setSelectedId(b.id)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              selectedId === b.id
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-950/40"
                : "bg-black/30 hover:bg-white/5 text-slate-400 border-white/5"
            }`}
          >
            <Image src={b.avatar} alt={b.name} loading="lazy" className="w-5 h-5 rounded-md object-cover" width={20} height={20} unoptimized />
            <span>{b.name}</span>
            <span className="text-[10px] text-amber-400 font-mono">★ {b.rating}</span>
          </button>
        ))}
      </div>

      {/* Storefront Hero Presentation */}
      <div className="kinara-card rounded-3xl overflow-hidden border border-emerald-500/20 relative">
        <div className="h-52 sm:h-64 relative w-full overflow-hidden bg-black">
          <Image src={business.banner}
            alt={business.name}
            loading="lazy"
            className="w-full h-full object-cover brightness-75" width={600} height={400} unoptimized sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#091212] via-[#091212]/50 to-transparent" aria-hidden />
        </div>

        <div className="p-6 sm:p-8 -mt-20 sm:-mt-24 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-5">
            <div className="flex items-end gap-4">
              <Image src={business.avatar}
                alt={business.name}
                loading="lazy"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-[#091212] shadow-2xl" width={96} height={96} unoptimized />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {business.name}
                  </h2>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" aria-hidden />
                    VERIFIED ENTERPRISE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium">
                  {business.headline}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-1">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden />
                    {business.rating} ({business.reviewsCount} verified reviews)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
                    {business.neighborhood}, {business.city}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                    {business.openHours}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setBookingService(parsedServices[0]?.name || "Desk Reservation")}
                className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950"
                aria-label={`Book appointment at ${business.name}`}
              >
                <Calendar className="w-4 h-4" aria-hidden />
                <span>Book Appointment / Pod</span>
              </button>

              <button
                onClick={() => onNavigateMessage(business.name)}
                className="px-4 py-2.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition"
                aria-label={`Live chat with ${business.name}`}
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" aria-hidden />
                <span>Live Chat</span>
              </button>

              <button
                onClick={handleDirections}
                className="p-2.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-slate-300 hover:text-white transition"
                title="Get Directions"
                aria-label={`Get directions to ${business.name}`}
              >
                <Navigation className="w-4 h-4 text-emerald-400" aria-hidden />
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 mt-6 border-b border-emerald-950/60 text-xs" role="tablist" aria-label="Business sections">
            {[
              { id: "catalog", label: "Catalog & Services" },
              { id: "reviews", label: "Customer Reviews" },
              { id: "analytics", label: "Enterprise Analytics" },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
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
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parsedServices.map((service, index) => (
            <div
              key={index}
              className="kinara-card p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition"
            >
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                  {service.name}
                </h4>
                <div className="text-xs font-mono font-bold text-amber-400 mt-1">
                  {service.price}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Includes 1Gbps WiFi, power backup & Kinara Escrow receipt
                </div>
              </div>

              <button
                onClick={() => setBookingService(service.name)}
                className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-xs font-bold transition whitespace-nowrap"
                aria-label={`Reserve ${service.name}`}
              >
                Reserve Now
              </button>
            </div>
          ))}
          {parsedServices.length === 0 && (
            <div className="col-span-2 kinara-card p-6 rounded-2xl border border-dashed border-white/10 text-xs text-slate-400 text-center">No services listed.</div>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="space-y-3">
          {[
            {
              author: "Kofi Mensah",
              role: "Sound Producer",
              score: 5,
              text: "The acoustic isolation pods at Ikigai are second to none in Nairobi. Recorded my spatial audio stems with zero bleed from the cafe floor.",
              date: "2 days ago",
            },
            {
              author: "Folake Adebayo",
              role: "FinTech Founder",
              score: 5,
              text: "Held our Lagos-Nairobi board meeting in the 12-seat room. 1Gbps mesh was rock-solid and the single-origin Peaberry kept the team energized.",
              date: "1 week ago",
            },
          ].map((rev, i) => (
            <div key={i} className="kinara-card p-4 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{rev.author}</span>
                  <span className="text-slate-400">({rev.role})</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" aria-hidden />
                  <span className="font-bold">{rev.score}.0</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{rev.text}</p>
              <div className="text-[10px] text-slate-400 font-mono">{rev.date} • Verified Escrow Guest</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="kinara-card p-4 rounded-2xl border border-emerald-500/20 space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Monthly Orders</span>
              <div className="text-xl font-bold font-mono text-white">
                {business.monthlyTransactions.toLocaleString()}
              </div>
              <Progress value={Math.min(100, (business.monthlyTransactions / 250) * 100)} className="h-2" indicatorClassName="bg-emerald-500" />
              <div className="text-[11px] text-emerald-300">+14% vs last month • 250 target</div>
            </div>

            <div className="kinara-card p-4 rounded-2xl border border-amber-500/20 space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-400">Response Speed</span>
              <div className="text-xl font-bold font-mono text-white">4 Minutes</div>
              <Progress value={85} className="h-2" indicatorClassName="bg-amber-500" />
              <div className="text-[11px] text-slate-400">99.8% chat resolution</div>
            </div>

            <div className="kinara-card p-4 rounded-2xl border border-emerald-500/20 space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Escrow Trust Score</span>
              <div className="text-xl font-bold font-mono text-emerald-300">99.6%</div>
              <Progress value={99.6} className="h-2" indicatorClassName="bg-emerald-500" />
              <div className="text-[11px] text-slate-400">Zero arbitration claims</div>
            </div>
          </div>
          <div className="kinara-card p-4 rounded-2xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-white">Throughput & Trust Breakdown</h4>
            <Progress value={72} className="h-2" />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Orders fulfilled</span>
              <span className="text-emerald-300">{business.monthlyTransactions} / 250</span>
            </div>
            <Progress value={99.6} className="h-2" indicatorClassName="bg-amber-500" />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Trust retained</span>
              <span className="text-amber-300">99.6%</span>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={!!bookingService}
        onClose={() => setBookingService(null)}
        business={business}
        selectedService={bookingService || undefined}
        onSuccess={(ref) => {
          setBookingService(null);
          toast.success(`Reservation Confirmed! Ref: ${ref}`, {
            description: `${business.name} • ${bookingService}`,
            duration: 4000,
          });
        }}
      />
    </div>
  );
}
