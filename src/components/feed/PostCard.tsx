"use client";

import Image from "next/image";

import React, { useState } from "react";
import {
  Heart,
  MessageSquare,
  Share2,
  ShieldCheck,
  Sparkles,
  MapPin,
  Pin,
  Languages,
  Check,
  Send,
  Loader2
} from "lucide-react";
import { PostItem } from "@/types";

interface PostCardProps {
  post: PostItem;
  onPostUpdated?: (updated: PostItem) => void;
  onNavigateProfile?: () => void;
}

export function PostCard({ post, onPostUpdated, onNavigateProfile }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<string[]>([
    "This is the paradigm shift Africa needed. Sovereign rails first.",
    "Fully agree Brian. The offline vector sync tests in Turkana prove it.",
  ]);
  const [newComment, setNewComment] = useState("");
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleLike() {
    if (isLiking) return;
    setIsLiking(true);
    const newCount = hasLiked ? likes - 1 : likes + 1;
    setLikes(newCount);
    setHasLiked(!hasLiked);

    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    } catch (err) {
      console.error("Like error:", err);
    } finally {
      setIsLiking(false);
    }
  }

  async function handleTranslate(language: string) {
    if (translatedText) {
      setTranslatedText(null); // toggle off
      return;
    }
    setIsTranslating(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "translate",
          text: post.content,
          targetLanguage: language,
        }),
      });
      const data = await res.json();
      setTranslatedText(data.result);
    } catch {
      setTranslatedText("Translation unavailable.");
    } finally {
      setIsTranslating(false);
    }
  }

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAddComment() {
    if (!newComment.trim()) return;
    setComments([...comments, newComment.trim()]);
    setNewComment("");
  }

  const tagsArray: string[] = (() => {
    try {
      return JSON.parse(post.tags);
    } catch {
      return ["Kinara", "SovereignTech"];
    }
  })();

  return (
    <article className="kinara-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] shadow-md hover:border-emerald-500/30 transition-all duration-200">
      {/* Pinned banner if pinned */}
      {post.pinned && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 mb-3 pb-2 border-b border-emerald-950/60">
          <Pin className="w-3.5 h-3.5 fill-emerald-400" />
          <span>PINNED DISPATCH BY ARCHITECT</span>
        </div>
      )}

      {/* Author Bar */}
      <div className="flex items-center justify-between mb-3.5">
        <div
          onClick={onNavigateProfile}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative">
            <Image src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/30 group-hover:ring-emerald-400 transition" width={40} height={40} unoptimized loading="lazy" />
            {post.authorVerified && (
              <span
                className="absolute -bottom-1 -right-1 bg-[#060b0b] rounded-full p-0.5"
                title="Biometric & Escrow Verified"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                {post.authorName}
              </span>
              <span className="text-xs text-slate-400 font-mono">@{post.authorHandle}</span>
              <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                ★ {post.authorTrust}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {post.city}
              </span>
              <span>•</span>
              <span className="capitalize text-emerald-400/90 font-medium">{post.category}</span>
            </div>
          </div>
        </div>

        {/* Quick inline translate button */}
        <button
          onClick={() => handleTranslate("swahili")}
          className="text-xs text-slate-400 hover:text-emerald-300 px-2 py-1 rounded-lg bg-black/30 hover:bg-emerald-950/40 border border-white/5 transition flex items-center gap-1"
          title="Translate to Kiswahili / Original"
        >
          <Languages className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">
            {translatedText ? "Original" : "Kiswahili"}
          </span>
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-3">
        <p className="text-sm md:text-[15px] text-slate-200 leading-relaxed whitespace-pre-wrap">
          {translatedText || post.content}
        </p>

        {translatedText && (
          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 p-1.5 rounded border border-emerald-800/40">
            Translated via Kinara Sovereign NLP Edge Model
          </div>
        )}

        {/* Media if present */}
        {post.mediaUrl && (
          <div className="mt-3 rounded-xl overflow-hidden border border-white/10 group bg-black/40">
            <Image src={post.mediaUrl}
              alt="Post attachment"
              className="w-full max-h-96 object-cover transition duration-300 group-hover:scale-[1.01]"
              loading="lazy" width={600} height={400} unoptimized sizes="100vw" />
          </div>
        )}

        {/* Hashtags */}
        {tagsArray.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tagsArray.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-mono text-emerald-400/80 bg-emerald-950/30 hover:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-900/30 transition cursor-pointer"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 mt-3 border-t border-emerald-950/40 text-xs text-slate-400">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition group ${
              hasLiked ? "text-rose-400" : "hover:text-rose-400"
            }`}
          >
            <Heart
              className={`w-4 h-4 transition duration-200 ${
                hasLiked
                  ? "fill-rose-500 text-rose-500 scale-110"
                  : "group-hover:scale-110 text-slate-400"
              }`}
            />
            <span className="font-mono text-xs">{likes}</span>
          </button>

          {/* Comments */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 hover:text-emerald-300 transition"
          >
            <MessageSquare className="w-4 h-4 text-slate-400 hover:text-emerald-400 transition" />
            <span className="font-mono text-xs">{comments.length}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 hover:text-amber-300 transition"
            title="Copy link to dispatch"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-xs">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-slate-400 hover:text-amber-400 transition" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-500">
          Escrow Verified Node
        </div>
      </div>

      {/* Inline Comments Accordion */}
      {showComments && (
        <div className="mt-4 pt-3 border-t border-emerald-950/50 space-y-3 bg-black/20 p-3 rounded-xl">
          <div className="text-xs font-semibold text-emerald-300 flex items-center justify-between">
            <span>Verified Responses ({comments.length})</span>
          </div>

          <div className="space-y-2">
            {comments.map((c, i) => (
              <div key={i} className="text-xs text-slate-300 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                {c}
              </div>
            ))}
          </div>

          {/* Add comment input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              placeholder="Add your verified thought..."
              className="flex-1 bg-black/40 border border-emerald-950/70 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/40"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-black font-bold rounded-lg transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
