"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { Story } from "./StoriesBar";

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  currentUserId: string;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function StoryViewer({ stories, initialIndex, onClose, currentUserId }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(() => Math.min(Math.max(initialIndex, 0), stories.length - 1));
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewedSet, setViewedSet] = useState<Set<number>>(() => new Set());
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentStory = stories[currentIndex];

  // Navigation handlers are declared before the effects that reference them so the
  // keydown listener never closes over an uninitialized binding. They are plain
  // functions (no manual useCallback) because the React Compiler memoizes them; the
  // hand-written wrappers were flagged as unpreservable by the compiler.
  function handleNext() {
    if (currentIndex >= stories.length - 1) {
      onClose();
      return;
    }
    setProgress(0);
    setCurrentIndex((i) => i + 1);
  }

  function handlePrev() {
    setProgress(0);
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  // Focus trap: focus close button and lock body scroll on mount, restore on unmount.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Keyboard: Escape closes, arrows navigate. Reads `currentIndex` directly and lists
  // every value it closes over, so the listener is only re-bound when one of them
  // actually changes (rather than on every render via unstable handler identities).
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight") {
        if (currentIndex >= stories.length - 1) {
          onClose();
        } else {
          setProgress(0);
          setCurrentIndex((i) => i + 1);
        }
      } else if (e.key === "ArrowLeft") {
        setProgress(0);
        if (currentIndex > 0) setCurrentIndex((i) => i - 1);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, currentIndex, stories.length]);

  // Auto-advance: 1% per 50ms => ~5s per story, paused while `isPaused`.
  // The advance side effect runs in the timer callback — never inside the
  // setProgress updater, which React may invoke more than once (StrictMode).
  useEffect(() => {
    if (isPaused || !currentStory) return;
    let pct = 0;
    const interval = window.setInterval(() => {
      pct += 1;
      if (pct >= 100) {
        pct = 0;
        setProgress(0);
        if (currentIndex < stories.length - 1) {
          setCurrentIndex((i) => i + 1);
        } else {
          onClose();
        }
        return;
      }
      setProgress(pct);
    }, 50);
    return () => window.clearInterval(interval);
  }, [isPaused, currentIndex, stories.length, onClose, currentStory]);

  // Mark viewed after 2s of dwell time. "Already viewed" is derived from props instead
  // of being written into state synchronously inside the effect body.
  useEffect(() => {
    if (!currentStory) return;
    const alreadyViewed =
      viewedSet.has(currentStory.id) ||
      ((currentStory.viewedBy as string[]) ?? []).includes(currentUserId);
    if (alreadyViewed) return;

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/stories/${currentStory.id}/view`, { method: "POST" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `View failed ${res.status}`);
        }
        setViewedSet((s) => new Set(s).add(currentStory.id));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to mark viewed";
        toast.error(msg);
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [currentStory, currentUserId, viewedSet]);

  // Touch swipe
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true);
  }
  function onTouchEnd(e: React.TouchEvent) {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartX.current;
    const dy = endY - (touchStartY.current ?? endY);
    // horizontal swipe threshold, ignore vertical swipes
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  if (!currentStory) return null;

  const viewedByCount = (currentStory.viewedBy as string[])?.length ?? 0;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Story by ${currentStory.authorHandle}`}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Media layer */}
      <div className="absolute inset-0 bg-black">
        {currentStory.mediaType === "video" ? (
          <video
            key={currentStory.id}
            src={currentStory.mediaUrl}
            autoPlay
            muted
            playsInline
            loop={false}
            controls={false}
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          // Full-bleed story media served from arbitrary external CDNs with unknown
          // intrinsic dimensions, so next/image cannot pre-size it. Scoped disable
          // for this single element rather than a global rule opt-out.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentStory.id}
            src={currentStory.mediaUrl}
            alt={currentStory.caption || `Story by ${currentStory.authorHandle}`}
            className="w-full h-full object-contain bg-black"
          />
        )}
        {/* gradient overlay for text readability */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      {/* Top bar: progress segments + header */}
      <div className="relative z-10 flex flex-col gap-3 p-3 sm:p-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        {/* Progress segments: one per story */}
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Story progress">
          {stories.map((_, idx) => {
            const isPast = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={idx}
                className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden backdrop-blur-sm"
              >
                <motion.div
                  className="h-full bg-emerald-400 rounded-full"
                  initial={false}
                  animate={{
                    width: isPast ? "100%" : isCurrent ? `${progress}%` : "0%",
                  }}
                  transition={isCurrent ? { duration: 0.05, ease: "linear" } : { duration: 0.2 }}
                  style={{ width: isPast ? "100%" : isCurrent ? `${progress}%` : "0%" }}
                />
              </div>
            );
          })}
        </div>

        {/* Author header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-white/15">
              <Image
                src={currentStory.authorAvatar}
                alt={currentStory.authorName}
                width={36}
                height={36}
                unoptimized
                className="w-full h-full object-cover"
              />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate">{currentStory.authorHandle}</span>
                <span className="text-[11px] text-white/60 font-mono truncate hidden sm:inline">
                  {formatTimeAgo(currentStory.createdAt)}
                </span>
                {viewedByCount > 0 && (
                  <span className="text-[11px] text-emerald-300 font-mono bg-white/10 px-1.5 py-0.5 rounded-full border border-white/10">
                    {viewedByCount} views
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/70 truncate sm:hidden">{formatTimeAgo(currentStory.createdAt)}</div>
            </div>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close story viewer"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white transition shrink-0 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tap zones left/right */}
      <button
        type="button"
        aria-label="Previous story"
        onClick={handlePrev}
        className="absolute left-0 top-0 bottom-16 w-1/2 z-10 cursor-pointer bg-transparent border-none p-0 focus-visible:outline-none"
        tabIndex={-1}
      />
      <button
        type="button"
        aria-label="Next story"
        onClick={handleNext}
        className="absolute right-0 top-0 bottom-16 w-1/2 z-10 cursor-pointer bg-transparent border-none p-0 focus-visible:outline-none"
        tabIndex={-1}
      />

      {/* Caption at bottom */}
      {currentStory.caption && (
        <div className="relative z-10 mt-auto p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] max-w-2xl mx-auto w-full">
          <p className="text-sm sm:text-[15px] text-white leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-3">
            {currentStory.caption}
          </p>
        </div>
      )}

      {/* Bottom viewed indicator row (premium) */}
      <div className="relative z-10 flex items-center justify-center gap-2 pb-3 sm:pb-4">
        <span className="text-[11px] font-mono text-white/50">Hold to pause • Tap sides to navigate • Swipe to switch</span>
      </div>
    </div>
  );
}
