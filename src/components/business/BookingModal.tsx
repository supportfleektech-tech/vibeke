"use client";

import React, { useState } from "react";
import { X, Calendar, Clock, Check, ShieldCheck, Loader2 } from "lucide-react";
import { BusinessStorefront } from "@/types";
import { toast } from "sonner";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: BusinessStorefront | null;
  selectedService?: string;
  onSuccess: (bookingRef: string) => void;
}

export function BookingModal({
  isOpen,
  onClose,
  business,
  selectedService,
  onSuccess,
}: BookingModalProps) {
  const [date, setDate] = useState("Tomorrow (10:00 AM)");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [done, setDone] = useState(false);

  if (!isOpen || !business) return null;

  async function handleBook() {
    if (!business) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName: selectedService || "General Session",
          date,
        }),
      });
      const data = await res.json();
      const ref = data.bookingRef || `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setBookingRef(ref);
      setDone(true);
      setTimeout(() => {
        onSuccess(ref);
      }, 1500);
    } catch (e: any) {
      toast.error(e?.message || "Error booking appointment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0c1616] border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 to-[#0c1616] border-b border-emerald-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Reserve at {business.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-emerald-300">
              <Check className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">Booking Confirmed!</h4>
            <p className="text-xs text-slate-300">
              Reservation ref <code className="text-amber-400 font-mono font-bold">{bookingRef}</code>.
            </p>
            <p className="text-[11px] text-slate-400">
              Calendar invite and access QR code sent to your Kinara ID.
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Selected Service</span>
              <div className="text-xs font-semibold text-white">
                {selectedService || "Acoustic Pod / Boardroom Session"}
              </div>
              <div className="text-[11px] text-slate-400">
                {business.neighborhood}, {business.city} • Open {business.openHours}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1.5">Choose Date & Time Slot</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["Tomorrow 09:30 AM", "Tomorrow 02:00 PM", "Thursday 11:00 AM", "Friday 04:00 PM"].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setDate(slot)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      date === slot
                        ? "bg-emerald-950/70 border-emerald-500 text-emerald-300 font-semibold"
                        : "bg-black/40 border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Notes / Equipment Needed (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. HDMI 4K monitor connection, filter coffee carafe..."
                rows={2}
                className="w-full bg-black/50 border border-emerald-950 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/40"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-emerald-950">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm Reservation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
