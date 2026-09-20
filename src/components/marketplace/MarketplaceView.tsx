"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Truck,
  MapPin,
  Star,
  MessageCircle,
  Plus,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  DollarSign
} from "lucide-react";
import { MarketplaceProduct, UserProfile } from "@/types";
import { AIPriceCheckModal } from "./AIPriceCheckModal";
import { EscrowModal } from "./EscrowModal";

interface MarketplaceViewProps {
  products: MarketplaceProduct[];
  user: UserProfile | null;
  onNavigateMessage: (sellerName: string) => void;
  selectedCity: string;
}

export function MarketplaceView({
  products,
  user,
  onNavigateMessage,
  selectedCity,
}: MarketplaceViewProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductForAi, setSelectedProductForAi] = useState<MarketplaceProduct | null>(null);
  const [selectedProductForEscrow, setSelectedProductForEscrow] = useState<MarketplaceProduct | null>(null);
  const [escrowSuccessToast, setEscrowSuccessToast] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New item form state
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Craft & Fashion");

  const categories = [
    "all",
    "Craft & Fashion",
    "Art & Decor",
    "Electronics",
    "Solar & Clean Tech",
    "Gourmet & Food",
  ];

  const filteredProducts = products.filter((item) => {
    const matchesCat = activeCategory === "all" || item.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {escrowSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-950 border border-emerald-400 text-emerald-300 flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Escrow Vault Locked! Ref: <strong className="font-mono">{escrowSuccessToast}</strong></span>
          </div>
          <button
            onClick={() => setEscrowSuccessToast(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="kinara-card rounded-3xl p-6 sm:p-8 border border-amber-500/25 bg-gradient-to-r from-[#121c17] via-[#101915] to-[#15170d] relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>KINARA ESCROW VAULT • 100% DISPUTE-FREE GUARANTEE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            High-Craft Pan-African Commerce
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Direct from verified East & West African artisans, sustainable clean energy innovators, and certified electronics technicians. Secured by smart escrow.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>List Verified Item</span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Hub: {selectedCity} • Same-Day Boda Courier Active
            </span>
          </div>
        </div>

        {/* Ambient subtle glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition border ${
                activeCategory === cat
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                  : "bg-black/30 hover:bg-white/5 text-slate-400 border-white/5"
              }`}
            >
              {cat === "all" ? "All Curated Drops" : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items or sellers..."
            className="w-full bg-black/40 border border-emerald-950 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/40"
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="kinara-card rounded-2xl overflow-hidden border border-white/[0.08] flex flex-col justify-between group hover:border-amber-500/40 transition duration-200"
          >
            {/* Image Container with Badges */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/60">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Escrow Badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Escrow Secured</span>
              </div>

              {/* Distance Pill */}
              <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 border border-white/10">
                {product.distanceKm} km away
              </div>

              {/* Category Pill */}
              <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                {product.category}
              </div>
            </div>

            {/* Product Body */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{product.rating}</span>
                    <span className="text-slate-400 font-normal">({product.reviewsCount})</span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-400" />
                    {product.deliverySpeed}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-amber-200 transition line-clamp-1">
                  {product.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Price & Seller */}
              <div className="pt-3 border-t border-emerald-950/50 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Price</span>
                    <div className="text-base sm:text-lg font-black font-mono text-emerald-300">
                      {product.currency} {product.price.toLocaleString()}
                    </div>
                  </div>

                  {/* AI Valuation badge */}
                  <button
                    onClick={() => setSelectedProductForAi(product)}
                    className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>AI Price Check</span>
                  </button>
                </div>

                {/* Seller info */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <img
                      src={product.sellerAvatar}
                      alt={product.sellerName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="truncate max-w-[120px] font-medium text-slate-300">
                      {product.sellerName}
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 rounded font-mono">
                    ★ {product.sellerTrustScore}/100 Trust
                  </span>
                </div>

                {/* Actions: Buy & Chat */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setSelectedProductForEscrow(product)}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-950"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Buy with Escrow</span>
                  </button>

                  <button
                    onClick={() => onNavigateMessage(product.sellerName)}
                    className="py-2 px-3 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chat Seller</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Price Check Modal */}
      <AIPriceCheckModal
        isOpen={!!selectedProductForAi}
        onClose={() => setSelectedProductForAi(null)}
        product={selectedProductForAi}
        onProceedToBuy={(prod) => {
          setSelectedProductForEscrow(prod);
        }}
      />

      {/* Escrow Checkout Modal */}
      <EscrowModal
        isOpen={!!selectedProductForEscrow}
        onClose={() => setSelectedProductForEscrow(null)}
        product={selectedProductForEscrow}
        onSuccess={(ref) => {
          setSelectedProductForEscrow(null);
          setEscrowSuccessToast(ref);
        }}
      />

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0b1515] border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">List Item on Kinara Escrow</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Item Title</label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. Handwoven Kikoy Throw Blanket"
                  className="w-full bg-black/50 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Price (KES)</label>
                <input
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full bg-black/50 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full bg-black/50 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="Craft & Fashion">Craft & Fashion</option>
                  <option value="Art & Decor">Art & Decor</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Solar & Clean Tech">Solar & Clean Tech</option>
                  <option value="Gourmet & Food">Gourmet & Food</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-950">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Listing submitted for biometric escrow verification. Live in 2 minutes.");
                  setShowCreateModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
              >
                Publish Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
