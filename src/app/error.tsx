"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#060b0b] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-500/30 flex items-center justify-center">
        <span className="text-xl">⚠</span>
      </div>
      <h2 className="text-lg font-bold text-white">Sovereign Core interrupted</h2>
      <p className="text-xs text-slate-400 max-w-md leading-relaxed">
        {error.message || "An unexpected error occurred while synchronizing the platform."}
      </p>
      {error.digest && (
        <p className="text-[11px] font-mono text-slate-500">Digest: {error.digest}</p>
      )}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="min-h-11 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition"
        >
          Retry synchronization
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="min-h-11 px-5 py-2.5 rounded-xl bg-black/40 hover:bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold transition"
        >
          Return home
        </button>
      </div>
    </div>
  );
}
