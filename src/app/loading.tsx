export default function Loading() {
  return (
    <div className="min-h-screen bg-[#060b0b] flex flex-col items-center justify-center space-y-4" aria-busy="true" aria-live="polite">
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-700 to-amber-600 p-[2px] shadow-2xl animate-pulse">
        <div className="w-full h-full bg-[#060d0d] rounded-[14px] flex items-center justify-center">
          <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 to-amber-300">K</span>
        </div>
      </div>
      <div className="space-y-3 w-full max-w-md px-6">
        <div className="h-4 bg-emerald-950/40 rounded-full animate-pulse w-3/4 mx-auto" />
        <div className="h-3 bg-white/5 rounded-full animate-pulse w-1/2 mx-auto" />
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="h-24 bg-[#0c1616] border border-emerald-950 rounded-2xl animate-pulse" />
          <div className="h-24 bg-[#0c1616] border border-emerald-950 rounded-2xl animate-pulse delay-75" />
          <div className="h-24 bg-[#0c1616] border border-emerald-950 rounded-2xl animate-pulse delay-150" />
        </div>
      </div>
      <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Synchronizing Sovereign Core…
      </p>
      <span className="sr-only">Loading Kinara platform</span>
    </div>
  );
}
