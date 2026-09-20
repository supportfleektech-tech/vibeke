"use client";

import React, { useState } from "react";
import { Sparkles, Send, Bot, User, ArrowRight, Loader2, ShieldCheck, Languages, Zap } from "lucide-react";
import { UserProfile } from "@/types";

interface KinaraAICopilotProps {
  user: UserProfile | null;
  selectedCity: string;
}

export function KinaraAICopilot({ user, selectedCity }: KinaraAICopilotProps) {
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string; time: string }[]>([
    {
      sender: "ai",
      text: "Habari Brian! I am your Kinara Sovereign AI Copilot. I can assist you with cross-border trade mechanics, M-Pesa 3.0 integrations, African typography design tokens, or local market intelligence across Nairobi, Lagos, and Kigali.",
      time: "Just now",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    "How does Kinara Escrow handle cross-border KES to NGN settlement?",
    "Explain the offline-first vector sync protocol for African mobile networks",
    "What are the top 3 tech hubs in Nairobi right now?",
    "Draft a concise pitch for an African hardware climate venture",
  ];

  async function handleSend(customText?: string) {
    const textToSend = customText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: "user" as const,
      text: textToSend.trim(),
      time: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copilot", text: textToSend }),
      });
      const data = await res.json();
      const aiReply = {
        sender: "ai" as const,
        text: data.result || "Synthesizing answer from Kinara Sovereign index.",
        time: "Just now",
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Network error contacting Kinara Edge AI.", time: "Just now" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="kinara-card rounded-3xl border border-amber-500/30 overflow-hidden flex flex-col h-[650px] bg-[#070e0e] shadow-2xl">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/80 via-[#0a1615] to-amber-950/40 border-b border-emerald-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Kinara Sovereign AI Copilot</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                v3.4 EDGE
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Fine-tuned on African economic corridors, mobile rails & design systems
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local Vector Sync</span>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="p-3 bg-black/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          Suggested:
        </span>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-emerald-950/60 border border-white/5 hover:border-emerald-500/30 text-slate-300 hover:text-white whitespace-nowrap transition text-[11px]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                m.sender === "user"
                  ? "bg-emerald-700 text-white"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-amber-400" />}
            </div>

            <div
              className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-1.5 ${
                m.sender === "user"
                  ? "bg-emerald-900/60 border border-emerald-500/30 text-emerald-100 rounded-tr-xs"
                  : "bg-[#0b1716] border border-emerald-950/80 text-slate-200 rounded-tl-xs shadow-md"
              }`}
            >
              <p className="whitespace-pre-line">{m.text}</p>
              <div
                className={`text-[9px] font-mono text-slate-400 ${
                  m.sender === "user" ? "text-right" : "text-left"
                }`}
              >
                {m.time}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-3 text-xs text-amber-300 p-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Consulting sovereign knowledge index...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-4 bg-[#091212] border-t border-emerald-950/80 flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Kinara AI anything about African tech, code, contracts or market pricing..."
          className="flex-1 bg-black/50 border border-emerald-950 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500/40"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || isLoading}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-950/50"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
