"use client";

import React, { useState } from "react";
import { X, ShieldCheck, Check, Truck, MapPin, Smartphone, CreditCard, Lock, Loader2 } from "lucide-react";
import { MarketplaceProduct } from "@/types";

interface EscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: MarketplaceProduct | null;
  onSuccess: (escrowRef: string) => void;
}

export function EscrowModal({ isOpen, onClose, product, onSuccess }: EscrowModalProps) {
  const [paymentRail, setPaymentRail] = useState<"mpesa" | "momo" | "card">("mpesa");
  const [phoneNumber, setPhoneNumber] = useState("0712 345 678");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [escrowRef, setEscrowRef] = useState("");

  if (!isOpen || !product) return null;

  async function handleConfirmEscrow() {
    if (!product) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/marketplace/${product.id}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerPrice: product.price,
          note: `Escrow order placed via ${paymentRail.toUpperCase()}`,
        }),
      });
      const data = await res.json();
      const ref = data.escrowId || `ESC-${Math.floor(100000 + Math.random() * 900000)}`;
      setEscrowRef(ref);
      setConfirmed(true);
      setTimeout(() => {
        onSuccess(ref);
      }, 1600);
    } catch {
      alert("Error initiating escrow transaction.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0b1515] border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 to-[#0b1515] border-b border-emerald-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Kinara Smart Escrow Checkout</h3>
              <p className="text-[11px] text-emerald-400 font-mono">
                Encrypted Vault Protection • Zero-Risk
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

        {confirmed ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-emerald-300 animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Escrow Vault Locked!</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Your payment of <strong className="text-emerald-300 font-mono">{product.currency} {product.price.toLocaleString()}</strong> is securely held in vault ref <code className="text-amber-400 font-mono">{escrowRef}</code>.
            </p>
            <p className="text-xs text-slate-400">
              Seller has been notified and Boda express dispatch is initiated. Funds are released only after you confirm handover.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Item summary */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/5">
              <img
                src={product.image}
                alt={product.title}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{product.title}</h4>
                <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                  {product.currency} {product.price.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-400" />
                    {product.deliverySpeed}
                  </span>
                  <span>•</span>
                  <span>{product.neighborhood}</span>
                </div>
              </div>
            </div>

            {/* Delivery address */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-950 space-y-1">
              <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Delivery Destination
              </div>
              <div className="text-xs font-medium text-white">
                Brian Mwangi • Kilimani Business Hub, Ring Road, Nairobi
              </div>
              <div className="text-[10px] text-slate-400">
                Courier will verify handover via Kinara one-time QR pass.
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">Select Sovereign Payment Rail</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentRail("mpesa")}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    paymentRail === "mpesa"
                      ? "bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold"
                      : "bg-black/40 border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                  <div className="text-[11px]">M-Pesa 3.0</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentRail("momo")}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    paymentRail === "momo"
                      ? "bg-amber-950/70 border-amber-500 text-amber-300 font-bold"
                      : "bg-black/40 border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                  <div className="text-[11px]">MTN MoMo</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentRail("card")}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    paymentRail === "card"
                      ? "bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold"
                      : "bg-black/40 border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                  <div className="text-[11px]">Bank Card</div>
                </button>
              </div>

              {/* Phone input for mobile money */}
              {(paymentRail === "mpesa" || paymentRail === "momo") && (
                <div className="mt-2">
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Mobile Money Phone Number (Prompt will be sent)
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-black/50 border border-emerald-950 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500/40 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Escrow Guarantee Pill */}
            <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/20 flex items-start gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>100% Protection:</strong> Money never touches the seller until you receive the package, inspect it in front of the rider, and tap <em>Confirm Satisfaction</em>.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        {!confirmed && (
          <div className="p-4 bg-[#081010] border-t border-emerald-950/80 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmEscrow}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-950"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locking Vault...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Lock {product.currency} {product.price.toLocaleString()} in Escrow</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
