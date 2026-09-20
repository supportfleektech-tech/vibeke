"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Image as ImageIcon,
  Languages,
  Wand2,
  Smile,
  Briefcase,
  Flame,
  Check,
  ChevronDown,
  Loader2,
  Tag
} from "lucide-react";
import { PostItem, UserProfile } from "@/types";

interface PostComposerProps {
  user: UserProfile | null;
  onPostCreated: (newPost: PostItem) => void;
  selectedCity: string;
}

export function PostComposer({ user, onPostCreated, selectedCity }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("trending");
  const [city, setCity] = useState(selectedCity || "Nairobi");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [showImageInput, setShowImageInput] = useState(false);
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);

  async function handleAiAction(action: string, extra?: any) {
    if (!content.trim() && action !== "continue") return;
    setIsAiProcessing(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: content,
          targetLanguage: extra?.language,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setContent(data.result);
      }
    } catch (err) {
      console.error("AI action failed:", err);
    } finally {
      setIsAiProcessing(false);
      setShowTranslateMenu(false);
    }
  }

  async function handlePublish() {
    if (!content.trim()) return;
    setIsPublishing(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          category,
          city,
          mediaUrl: mediaUrl?.trim() || null,
          mediaType: mediaUrl ? "image" : "text",
          tags: ["Kinara", "SovereignTech", category],
        }),
      });
      const data = await res.json();
      if (data.post) {
        onPostCreated(data.post);
        setContent("");
        setMediaUrl(null);
        setShowImageInput(false);
      }
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="kinara-card rounded-2xl p-4 border border-emerald-500/20 shadow-lg relative overflow-hidden bg-gradient-to-b from-[#0c1817] to-[#081211]">
      <div className="flex items-start gap-3">
        <img
          src={
            user?.avatar ||
            "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          }
          alt="Brian Mwangi"
          className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/30 shrink-0"
        />

        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a dispatch, breakthrough, market signal, or question..."
            rows={3}
            className="w-full bg-transparent text-sm md:text-base text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
          />

          {/* Media preview if added */}
          {mediaUrl && (
            <div className="relative mt-2 mb-3 rounded-xl overflow-hidden border border-emerald-950/80 max-h-48 group">
              <img src={mediaUrl} alt="Attached" className="w-full h-48 object-cover" />
              <button
                onClick={() => setMediaUrl(null)}
                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-lg text-xs"
              >
                Remove
              </button>
            </div>
          )}

          {showImageInput && !mediaUrl && (
            <div className="mt-2 mb-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Paste image URL (e.g. from Pexels, Unsplash, or CDN)..."
                onChange={(e) => setMediaUrl(e.target.value)}
                className="flex-1 bg-black/40 border border-emerald-950 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/40"
              />
              <button
                onClick={() => setShowImageInput(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Cancel
              </button>
            </div>
          )}

          {/* AI Everywhere Action Toolbar */}
          <div className="pt-2 border-t border-emerald-950/40 mt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left AI Tools */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAiToolbar(!showAiToolbar)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    showAiToolbar
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-950/40 hover:bg-emerald-950 text-emerald-300 border border-emerald-800/30"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>AI Copilot</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Media</span>
                </button>

                {/* Category select */}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-black/40 border border-emerald-950/60 rounded-lg text-xs text-slate-300 px-2 py-1 outline-none"
                >
                  <option value="trending">🔥 Trending</option>
                  <option value="innovation">⚡ Innovation</option>
                  <option value="culture">🌍 Culture</option>
                  <option value="business">💼 Business</option>
                </select>

                {/* City Tag */}
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-black/40 border border-emerald-950/60 rounded-lg text-xs text-slate-300 px-2 py-1 outline-none"
                >
                  <option value="Nairobi">📍 Nairobi</option>
                  <option value="Lagos">📍 Lagos</option>
                  <option value="Kigali">📍 Kigali</option>
                  <option value="Accra">📍 Accra</option>
                  <option value="Cape Town">📍 Cape Town</option>
                </select>
              </div>

              {/* Publish button */}
              <button
                type="button"
                onClick={handlePublish}
                disabled={!content.trim() || isPublishing}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-950"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <span>Dispatch</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* AI Expanded Tools Drawer */}
            {showAiToolbar && (
              <div className="mt-3 p-2.5 rounded-xl bg-black/50 border border-amber-500/20 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300 mb-2">
                  <span className="flex items-center gap-1">
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    INLINE SOVEREIGN AI ASSISTANT
                  </span>
                  {isAiProcessing && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Refining...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAiAction("rewrite")}
                    disabled={isAiProcessing || !content.trim()}
                    className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/40 transition disabled:opacity-40"
                  >
                    ✨ Rewrite Better
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAiAction("summarize")}
                    disabled={isAiProcessing || !content.trim()}
                    className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/40 transition disabled:opacity-40"
                  >
                    ✨ Summarize
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAiAction("sheng")}
                    disabled={isAiProcessing || !content.trim()}
                    className="px-2.5 py-1 rounded-lg text-xs bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 border border-amber-700/40 transition disabled:opacity-40"
                  >
                    🇰🇪 Sheng / Nairobi Vibe
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAiAction("pitch")}
                    disabled={isAiProcessing || !content.trim()}
                    className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/40 transition disabled:opacity-40"
                  >
                    ⚡ Founder Pitch Tone
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAiAction("professional")}
                    disabled={isAiProcessing || !content.trim()}
                    className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/40 transition disabled:opacity-40"
                  >
                    👔 Executive Tone
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAiAction("emojis")}
                    disabled={isAiProcessing || !content.trim()}
                    className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/40 transition disabled:opacity-40"
                  >
                    🚀 Tasteful Emojis
                  </button>

                  {/* Translate Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTranslateMenu(!showTranslateMenu)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800/40 flex items-center gap-1 transition"
                    >
                      <Languages className="w-3 h-3 text-emerald-400" />
                      <span>Translate</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>

                    {showTranslateMenu && (
                      <div className="absolute left-0 mt-1 w-44 glass-dropdown rounded-xl p-1 z-30 text-xs shadow-xl">
                        {[
                          { id: "swahili", label: "Kiswahili" },
                          { id: "yoruba", label: "Yorùbá" },
                          { id: "amharic", label: "አማርኛ (Amharic)" },
                          { id: "zulu", label: "isiZulu" },
                          { id: "french", label: "Français" },
                        ].map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => handleAiAction("translate", { language: l.id })}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-950 text-slate-300 hover:text-emerald-300"
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
