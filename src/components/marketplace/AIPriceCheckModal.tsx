"use client";

import Image from "next/image";

import React from "react";
import { X, Sparkles, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MarketplaceProduct } from "@/types";

interface AIPriceCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: MarketplaceProduct | null;
  onProceedToBuy: (product: MarketplaceProduct) => void;
}

export function AIPriceCheckModal({
  isOpen,
  onClose,
  product,
  onProceedToBuy,
}: AIPriceCheckModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0c1616] border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/50 via-emerald-950/40 to-[#0c1616] border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                Kinara AI Valuation & Trust Audit
              </h3>
              <p className="text-[11px] text-amber-300/80 font-mono">
                Model: Pan-African Liquidity & Authenticity Index
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Target item snippet */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/5">
            <Image src={product.image}
              alt={product.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0" width={56} height={56} unoptimized loading="lazy" />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{product.title}</h4>
              <div className="text-xs font-mono font-bold text-amber-400">
                Listed Price: {product.currency} {product.price.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400">
                Seller: {product.sellerName} (★ {product.sellerTrustScore}/100 Trust)
              </div>
            </div>
          </div>

          {/* AI Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Fair Market Estimate
              </div>
              <div className="text-sm font-bold font-mono text-white">
                {product.aiPriceEstimate}
              </div>
              <div className="text-[10px] text-emerald-300/70">
                Within 5-10% of regional median
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
              <div className="text-[10px] uppercase font-semibold text-amber-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Fraud & Counterfeit Risk
              </div>
              <div className="text-sm font-bold font-mono text-emerald-300">
                0.02% (Near Zero)
              </div>
              <div className="text-[10px] text-slate-400">
                Biometric KYC + Escrow Vault backed
              </div>
            </div>
          </div>

          {/* Synthesis text */}
          <div className="p-3.5 rounded-xl bg-black/50 border border-emerald-950/80 space-y-2 text-xs text-slate-300 leading-relaxed">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Sovereign Market Synthesis
            </div>
            <p>
              Kinara AI evaluated 48 recent transactions in {product.city} ({product.neighborhood}) for comparable {product.category} listings. 
              Seller &ldquo;{product.sellerName}&rdquo; has fulfilled {product.reviewsCount} verified orders with an average customer rating of {product.rating} ★.
            </p>
            <p className="text-emerald-300 font-medium">
              Recommendation: Approved for direct 1-click escrow. Your funds will remain in the Kinara Smart Vault until you inspect the item with the courier.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#091111] border-t border-amber-500/20 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
          >
            Close Audit
          </button>
          <button
            onClick={() => {
              onClose();
              onProceedToBuy(product);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-amber-950/50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Proceed with Escrow Buy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
