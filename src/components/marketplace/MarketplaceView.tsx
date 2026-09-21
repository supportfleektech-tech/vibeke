"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";

import React, { useState, useEffect, useMemo } from "react";
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
  DollarSign,
  Loader2
} from "lucide-react";
import { MarketplaceProduct, UserProfile } from "@/types";
import { AIPriceCheckModal } from "./AIPriceCheckModal";
import { EscrowModal } from "./EscrowModal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Craft & Fashion");
  const [isPublishing, setIsPublishing] = useState(false);

  // Local products for optimistic refresh + pagination
  const [localProducts, setLocalProducts] = useState<MarketplaceProduct[]>(products);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [activeCategory, searchQuery]);

  const categories = [
    "all",
    "Craft & Fashion",
    "Art & Decor",
    "Electronics",
    "Solar & Clean Tech",
    "Gourmet & Food",
  ];

  const filteredProducts = useMemo(() => {
    return localProducts.filter((item) => {
      const matchesCat = activeCategory === "all" || item.category.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [localProducts, activeCategory, searchQuery]);

  const paginatedProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMore = filteredProducts.length > visibleCount;

  async function handlePublishListing() {
    const title = newItemTitle.trim();
    const description = newItemDescription.trim() || `${title} — Verified artisan listing from ${selectedCity}. Escrow secured.`;
    const priceNum = Number(newItemPrice);

    if (!title || title.length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (!description || description.length < 10) {
      toast.error("Description must be at least 10 characters");
      return;
    }
    if (!priceNum || isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (priceNum > 10_000_000) {
      toast.error("Price exceeds allowed limit");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price: Math.round(priceNum),
          category: newItemCategory,
          city: selectedCity,
          neighborhood: "Kilimani",
          currency: "KES",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const msg = data?.error || data?.details ? JSON.stringify(data.details) : "Failed to publish listing";
        toast.error(msg);
        return;
      }
      const newItem: MarketplaceProduct = data.item ?? data.data;
      toast.success("Listing published! Biometric escrow verification passed — live now.");
      setShowCreateModal(false);
      setNewItemTitle("");
      setNewItemDescription("");
      setNewItemPrice("");
      // Optimistically add to local list
      if (newItem) {
        setLocalProducts((prev) => [newItem, ...prev]);
      } else {
        // fallback: refetch
        try {
          const r = await fetch("/api/marketplace?limit=20");
          const j = await r.json();
          const items = j.items ?? j.data ?? [];
          if (Array.isArray(items) && items.length) setLocalProducts(items);
        } catch {}
      }
    } catch (e: any) {
      toast.error(e?.message || "Network error publishing listing");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification (fallback custom) */}
      {escrowSuccessToast && (
        <div role="status" aria-live="polite" className="p-4 rounded-2xl bg-emerald-950 border border-emerald-400 text-emerald-300 flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden />
            <span>Escrow Vault Locked! Ref: <strong className="font-mono">{escrowSuccessToast}</strong></span>
          </div>
          <button
            onClick={() => setEscrowSuccessToast(null)}
            className="text-xs text-slate-400 hover:text-white"
            aria-label="Dismiss escrow notification"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="kinara-card rounded-3xl p-6 sm:p-8 border border-amber-500/25 bg-gradient-to-r from-[#121c17] via-[#101915] to-[#15170d] relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" aria-hidden />
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
              aria-label="List verified item"
            >
              <Plus className="w-4 h-4" aria-hidden />
              <span>List Verified Item</span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Hub: {selectedCity} • Same-Day Boda Courier Active
            </span>
          </div>
        </div>

        {/* Ambient subtle glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs" role="tablist" aria-label="Marketplace categories">
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" aria-hidden />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items or sellers..."
            aria-label="Search marketplace items"
            className="w-full bg-black/40 border border-emerald-950 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/40"
          />
        </div>
      </div>

      {/* Products Grid - paginated limit 20 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedProducts.map((product) => (
          <div
            key={product.id}
            className="kinara-card rounded-2xl overflow-hidden border border-white/[0.08] flex flex-col justify-between group hover:border-amber-500/40 transition duration-200"
          >
            {/* Image Container with Badges */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/60">
              <Image src={product.image}
                alt={product.title}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy" width={600} height={400} unoptimized sizes="100vw" />

              {/* Escrow Badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" aria-hidden />
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
                    <Star className="w-3.5 h-3.5 fill-amber-400" aria-hidden />
                    <span>{product.rating}</span>
                    <span className="text-slate-400 font-normal">({product.reviewsCount})</span>
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-400" aria-hidden />
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
                    aria-label={`AI price check for ${product.title}`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" aria-hidden />
                    <span>AI Price Check</span>
                  </button>
                </div>

                {/* Seller info */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <Image src={product.sellerAvatar}
                      alt={product.sellerName}
                      loading="lazy"
                      className="w-5 h-5 rounded-full object-cover" width={20} height={20} unoptimized />
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
                    aria-label={`Buy ${product.title} with escrow`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" aria-hidden />
                    <span>Buy with Escrow</span>
                  </button>

                  <button
                    onClick={() => onNavigateMessage(product.sellerName)}
                    className="py-2 px-3 rounded-xl bg-black/40 hover:bg-white/5 border border-white/5 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                    aria-label={`Chat with ${product.sellerName}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
                    <span>Chat Seller</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Load More */}
      {filteredProducts.length === 0 ? (
        <div className="kinara-card p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-2">
          <ShoppingBag className="w-8 h-8 text-slate-500 mx-auto" aria-hidden />
          <p className="text-sm text-white font-semibold">No listings match your filters</p>
          <p className="text-xs text-slate-400">Try adjusting category or search in {selectedCity}.</p>
          <Button variant="secondary" size="sm" onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}>Clear filters</Button>
        </div>
      ) : hasMore ? (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={() => setVisibleCount((c) => c + 20)} aria-label="Load more products">
            Load More ({filteredProducts.length - visibleCount} remaining)
          </Button>
        </div>
      ) : filteredProducts.length > 20 ? (
        <div className="text-center text-xs text-slate-500 font-mono">All {filteredProducts.length} curated drops shown</div>
      ) : null}

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
          toast.success(`Escrow vault locked — Ref ${ref}`);
        }}
      />

      {/* Create Listing Modal - now with actual POST */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-listing-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="w-full max-w-md bg-[#0b1515] border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 id="create-listing-title" className="text-base font-bold text-white">List Item on Kinara Escrow</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="new-title" className="text-xs text-slate-400 block mb-1">Item Title *</label>
                <input
                  id="new-title"
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. Handwoven Kikoy Throw Blanket"
                  className="w-full bg-black/50 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40"
                />
              </div>

              <div>
                <label htmlFor="new-desc" className="text-xs text-slate-400 block mb-1">Description *</label>
                <textarea
                  id="new-desc"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Describe craftsmanship, materials, origin..."
                  rows={3}
                  className="w-full bg-black/50 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40 resize-none"
                />
              </div>

              <div>
                <label htmlFor="new-price" className="text-xs text-slate-400 block mb-1">Price (KES) *</label>
                <input
                  id="new-price"
                  type="number"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="e.g. 4500"
                  className="w-full bg-black/50 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500/40"
                />
              </div>

              <div>
                <label htmlFor="new-cat" className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  id="new-cat"
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
                disabled={isPublishing}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishListing}
                disabled={isPublishing}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-xs flex items-center gap-1.5"
              >
                {isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                {isPublishing ? "Publishing..." : "Publish Listing"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
