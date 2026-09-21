"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music,
  Volume2,
  VolumeX,
  Play,
  Pause,
  BadgeCheck,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Keep in sync with DB clips schema
export interface ClipItem {
  id: number;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorVerified: boolean;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  sound: string;
  soundTitle: string;
  durationSec: number;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount?: number;
  views: number;
  hashtags: string[];
  city: string;
  featured?: boolean;
  createdAt?: string;
}

interface ClipCardProps {
  clip: ClipItem;
  isActive: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  isBookmarked: boolean;
  showHeart: boolean;
  onToggleLike: (id: number) => void;
  onToggleBookmark: (id: number) => void;
  onShare: (id: number) => void;
  onFollow: (authorId: string, authorName: string) => void;
  onDoubleTapLike: (id: number) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  index: number;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function ClipCard({
  clip,
  isActive,
  isMuted,
  isPlaying,
  isLiked,
  isBookmarked,
  showHeart,
  onToggleLike,
  onToggleBookmark,
  onShare,
  onFollow,
  onDoubleTapLike,
  onTogglePlay,
  onToggleMute,
}: ClipCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const lastTapRef = useRef(0);

  // Sync play/pause with active + playing state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive && isPlaying) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  }, [isActive, isPlaying]);

  // Keep muted in sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const handleVideoClick = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    if (delta < 350 && delta > 0) {
      onDoubleTapLike(clip.id);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // single tap toggles play after short delay to allow double-tap detection
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 300) {
          onTogglePlay();
        }
      }, 300);
    }
  }, [clip.id, onDoubleTapLike, onTogglePlay]);

  const hashtags = Array.isArray(clip.hashtags) ? clip.hashtags : [];

  return (
    <div
      className="relative w-full snap-start snap-always flex items-center justify-center"
      style={{ height: "calc(100vh - 120px)", maxHeight: 720, minHeight: 520 }}
      aria-label={`Clip ${clip.id} by ${clip.authorName}`}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[380px] h-full max-h-[calc(100vh-140px)] md:max-h-[600px] bg-black rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] group"
      >
        {/* Video */}
        <video
          ref={videoRef}
          src={clip.videoUrl}
          poster={clip.thumbnailUrl}
          loop
          muted={isMuted}
          playsInline
          preload="metadata"
          aria-label={`${clip.title} — ${clip.description}`}
          onLoadedData={() => setIsVideoReady(true)}
          onClick={handleVideoClick}
          onDoubleClick={() => onDoubleTapLike(clip.id)}
          className="w-full h-full object-cover rounded-2xl cursor-pointer"
        />

        {/* Poster fallback shimmer while loading */}
        {!isVideoReady && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-black animate-pulse" aria-hidden />
        )}

        {/* Gradient scrim */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" aria-hidden />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-black/25 via-transparent to-transparent pointer-events-none" aria-hidden />

        {/* Top bar: city badge + mute */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200">
            <MapPin className="w-3 h-3 text-emerald-400" aria-hidden />
            {clip.city}
            {clip.featured && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />}
          </span>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              aria-label={isMuted ? "Unmute video" : "Mute video"}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onToggleMute();
              }}
              className="h-8 w-8 rounded-full bg-black/55 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              {isMuted ? <VolumeX className="w-4 h-4" aria-hidden /> : <Volume2 className="w-4 h-4" aria-hidden />}
            </button>
          </div>
        </div>

        {/* Center play/pause affordance */}
        <AnimatePresence>
          {!isPlaying && isActive && (
            <motion.button
              key="play-indicator"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl pointer-events-auto"
            >
              <Play className="w-6 h-6 fill-white ml-0.5" aria-hidden />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Heart burst */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              key={`heart-${clip.id}`}
              initial={{ scale: 0, opacity: 0, rotate: -12 }}
              animate={{ scale: 1.2, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden
            >
              <Heart className="w-20 h-20 fill-rose-500 text-rose-500 drop-shadow-[0_8px_24px_rgba(244,63,94,0.6)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right rail */}
        <div className="absolute right-2 bottom-20 md:bottom-24 flex flex-col items-center gap-4 pointer-events-auto">
          {/* Like */}
          <button
            aria-label={isLiked ? `Unlike ${clip.title}` : `Like ${clip.title}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleLike(clip.id);
            }}
            className="flex flex-col items-center gap-1 group/btn focus-visible:outline-none"
          >
            <span
              className={`h-12 w-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-200 active:scale-95 ${
                isLiked
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                  : "bg-white/10 border-white/15 text-white hover:bg-white/15 hover:border-white/25"
              }`}
            >
              <Heart className={`w-6 h-6 transition ${isLiked ? "fill-rose-500 text-rose-500" : "group-hover/btn:scale-110"}`} aria-hidden />
            </span>
            <span className={`text-[11px] font-semibold font-mono ${isLiked ? "text-rose-400" : "text-white"}`}>{formatCount(clip.likes + (isLiked ? 1 : 0) * 0)}</span>
          </button>

          {/* Comment */}
          <button
            aria-label={`Comment on ${clip.title}, ${clip.commentsCount} comments`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              toast.info("Comments coming soon — Kinara threads sync next");
            }}
            className="flex flex-col items-center gap-1 group/btn focus-visible:outline-none"
          >
            <span className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/15 transition active:scale-95">
              <MessageCircle className="w-6 h-6" aria-hidden />
            </span>
            <span className="text-[11px] font-semibold font-mono text-white">{formatCount(clip.commentsCount)}</span>
          </button>

          {/* Share */}
          <button
            aria-label={`Share ${clip.title}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onShare(clip.id);
            }}
            className="flex flex-col items-center gap-1 group/btn focus-visible:outline-none"
          >
            <span className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/15 transition active:scale-95">
              <Share2 className="w-5 h-5" aria-hidden />
            </span>
            <span className="text-[11px] font-semibold font-mono text-white">{formatCount(clip.sharesCount)}</span>
          </button>

          {/* Bookmark */}
          <button
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark clip"}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleBookmark(clip.id);
            }}
            className="flex flex-col items-center gap-1 focus-visible:outline-none"
          >
            <span
              className={`h-10 w-10 rounded-full backdrop-blur-md border flex items-center justify-center transition active:scale-95 ${
                isBookmarked ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-white/10 border-white/15 text-white hover:bg-white/15"
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? "fill-amber-400 text-amber-400" : ""}`} aria-hidden />
            </span>
          </button>

          {/* Sound disc */}
          <div className="relative mt-1">
            <div
              className={`h-12 w-12 rounded-full bg-gradient-to-br from-zinc-800 to-black border-2 border-white/20 flex items-center justify-center shadow-lg overflow-hidden ${isActive && isPlaying ? "animate-spin-slow" : ""}`}
              style={{ animationDuration: "3s" }}
              aria-hidden
            >
              <Image
                src={clip.authorAvatar}
                alt=""
                width={44}
                height={44}
                unoptimized
                className="h-full w-full object-cover rounded-full"
              />
              <span className="absolute inset-0 rounded-full border border-white/10" aria-hidden />
              <span className="absolute h-3 w-3 rounded-full bg-black border border-white/30" aria-hidden />
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
              <Music className="w-2.5 h-2.5 text-black" aria-hidden />
            </span>
          </div>
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-14 md:right-16 p-3.5 pt-10 pointer-events-auto">
          {/* Author row */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative shrink-0">
              <Image
                src={clip.authorAvatar}
                alt={`${clip.authorName} avatar`}
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
              />
              {clip.authorVerified && (
                <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-sky-500 border-2 border-black flex items-center justify-center" title="Verified">
                  <BadgeCheck className="w-3 h-3 text-white" aria-hidden />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-white truncate">@{clip.authorHandle}</span>
                {clip.authorVerified && <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden />}
                <span className="text-[11px] text-white/60 truncate hidden sm:inline">· {clip.authorName}</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onFollow(clip.authorId, clip.authorName);
              }}
              aria-label={`Follow ${clip.authorName}`}
              className="h-7 px-3 text-xs font-bold bg-white text-black hover:bg-zinc-100 border-white rounded-full shrink-0"
            >
              Follow
            </Button>
          </div>

          {/* Title + description */}
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 pr-2">{clip.title}</h3>
          <p className="text-[13px] text-white/90 leading-snug mt-1 line-clamp-2 pr-2">{clip.description}</p>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {hashtags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 backdrop-blur-sm"
                >
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
              {hashtags.length > 4 && (
                <span className="text-[11px] text-white/60 font-mono">+{hashtags.length - 4}</span>
              )}
            </div>
          )}

          {/* Sound bar marquee */}
          <div className="mt-2.5 flex items-center gap-2 text-xs text-white/90 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1.5 w-fit max-w-[92%] overflow-hidden">
            <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden />
            <div className="overflow-hidden whitespace-nowrap flex-1">
              <div className="animate-[marquee_10s_linear_infinite] inline-block whitespace-nowrap will-change-transform">
                <span className="font-medium">{clip.soundTitle || clip.sound}</span>
                <span className="mx-2 text-white/40">•</span>
                <span className="text-white/70">Original • Kinara</span>
                <span className="mx-2 text-white/40">•</span>
                <span className="font-medium">{clip.soundTitle || clip.sound}</span>
              </div>
            </div>
          </div>

          {/* Views row */}
          <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-white/55">
            <span className="flex items-center gap-1">
              {isPlaying ? <Pause className="w-3 h-3" aria-hidden /> : <Play className="w-3 h-3" aria-hidden />}
              {formatCount(clip.views)} views
            </span>
            <span aria-hidden>•</span>
            <span>{clip.durationSec}s</span>
          </div>
        </div>

        {/* Inline styles for marquee */}
        <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      </motion.div>
    </div>
  );
}
