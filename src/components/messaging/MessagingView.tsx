"use client";

import React, { useState } from "react";
import {
  Send,
  Mic,
  Sparkles,
  Paperclip,
  Check,
  Play,
  Pause,
  ShieldCheck,
  Vote,
  Calendar,
  Lock,
  Search,
  ChevronRight,
  Loader2
} from "lucide-react";
import { MessageItem, UserProfile } from "@/types";

interface MessagingViewProps {
  initialMessages: MessageItem[];
  user: UserProfile | null;
}

export function MessagingView({ initialMessages, user }: MessagingViewProps) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [activeThreadId, setActiveThreadId] = useState<string>("th_folake");
  const [activeFilter, setActiveFilter] = useState<"all" | "pinned" | "unread" | "business" | "marketplace">("all");
  const [inputText, setInputText] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [pollVoted, setPollVoted] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const threads = [
    {
      id: "th_folake",
      name: "Folake Adebayo",
      avatar: "https://images.pexels.com/photos/1181695/pexels-photo-1181695.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      role: "FinTech Founder, Lagos",
      trust: 99,
      lastMsg: "Brian, the escrow smart contract for the Lagos-Nairobi trade corridor is deployed...",
      time: "10:18 AM",
      category: "business",
      pinned: true,
      unread: true,
    },
    {
      id: "th_zuri_seller",
      name: "Zuri Leatherworks",
      avatar: "https://images.pexels.com/photos/29038453/pexels-photo-29038453.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280",
      role: "Verified Artisan Seller",
      trust: 99,
      lastMsg: "Habari Brian! Your custom monogrammed Saddle-Leather Weekender is finished...",
      time: "11:30 AM",
      category: "marketplace",
      pinned: true,
      unread: false,
    },
    {
      id: "th_amina",
      name: "Amina Odhiambo",
      avatar: "https://images.pexels.com/photos/5999894/pexels-photo-5999894.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      role: "Lead UX Researcher",
      trust: 97,
      lastMsg: "Let's review the Swahili typography metrics at Ikigai today.",
      time: "Yesterday",
      category: "all",
      pinned: false,
      unread: false,
    },
  ];

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const threadMessages = messages.filter((m) => m.threadId === activeThreadId);

  async function handleSendMessage(type: "text" | "voice" = "text") {
    const textToSend = type === "text" ? inputText.trim() : "Voice dispatch (0:12)";
    if (!textToSend && type === "text") return;

    const newMsg: MessageItem = {
      id: Date.now(),
      threadId: activeThreadId,
      senderName: user?.name || "Brian Mwangi",
      senderAvatar: user?.avatar || "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      senderRole: "Product Architect",
      text: textToSend,
      timestamp: "Just now",
      isMe: true,
      type,
      metadata: type === "voice" ? JSON.stringify({ duration: "0:12", waveform: [30, 50, 70, 90, 60, 40, 80, 55, 30] }) : null,
    };

    setMessages([...messages, newMsg]);
    setInputText("");

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThreadId,
          text: textToSend,
          type,
          metadata: newMsg.metadata ? JSON.parse(newMsg.metadata) : null,
        }),
      });
    } catch (err) {
      console.error("Message send failed:", err);
    }
  }

  async function handleAiSummarizeThread() {
    setIsSummarizing(true);
    try {
      const fullConversation = threadMessages.map((m) => `${m.senderName}: ${m.text}`).join("\n");
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "summarize",
          text: fullConversation || "No messages to summarize.",
        }),
      });
      const data = await res.json();
      setAiSummary(data.result);
    } catch {
      setAiSummary("Could not generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  }

  return (
    <div className="kinara-card rounded-3xl border border-emerald-500/20 overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[640px] bg-[#070e0e]">
      {/* Threads List Column */}
      <div className="md:col-span-5 border-r border-emerald-950/60 flex flex-col h-full bg-[#081212]">
        {/* Threads Header */}
        <div className="p-4 border-b border-emerald-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Direct Dispatches</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                ENCRYPTED
              </span>
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {(["all", "pinned", "unread", "business", "marketplace"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition font-medium ${
                  activeFilter === filter
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Thread Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-emerald-950/40">
          {threads.map((thread) => {
            const isSelected = thread.id === activeThreadId;
            return (
              <div
                key={thread.id}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  setAiSummary(null);
                }}
                className={`p-3.5 flex items-start gap-3 cursor-pointer transition ${
                  isSelected
                    ? "bg-emerald-950/40 border-l-2 border-emerald-400"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <div className="relative">
                  <img
                    src={thread.avatar}
                    alt={thread.name}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/30 shrink-0"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-[#060b0b] rounded-full p-0.5">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white truncate">
                      {thread.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{thread.time}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{thread.role}</div>
                  <p className="text-xs text-slate-300 truncate mt-1">{thread.lastMsg}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Conversation Column */}
      <div className="md:col-span-7 flex flex-col h-full bg-[#060c0c]">
        {/* Conversation Header */}
        <div className="p-4 border-b border-emerald-950/60 flex items-center justify-between bg-[#081212]">
          <div className="flex items-center gap-3">
            <img
              src={activeThread.avatar}
              alt={activeThread.name}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-emerald-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{activeThread.name}</span>
                <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  ★ {activeThread.trust} Trust
                </span>
              </div>
              <div className="text-[11px] text-slate-400">{activeThread.role}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAiSummarizeThread}
              disabled={isSummarizing}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
              title="AI Summarize Deal or Thread"
            >
              {isSummarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">Summarize Thread</span>
            </button>
          </div>
        </div>

        {/* AI Summary Banner if requested */}
        {aiSummary && (
          <div className="p-3.5 m-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-slate-200 space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-amber-300 text-[11px]">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                KINARA AI CONVERSATION SYNTHESIS
              </span>
              <button
                onClick={() => setAiSummary(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="whitespace-pre-line leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {threadMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-2xl text-xs space-y-2 ${
                  msg.isMe
                    ? "bg-emerald-900/60 border border-emerald-500/30 text-emerald-100 rounded-br-xs"
                    : "bg-[#0c1817] border border-white/5 text-slate-200 rounded-bl-xs"
                }`}
              >
                {/* Voice note waveform */}
                {msg.type === "voice" ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                      className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow"
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>

                    <div className="flex items-center gap-0.5 h-6">
                      {[40, 65, 85, 50, 95, 70, 30, 85, 90, 60, 45, 80, 75, 55, 30].map(
                        (h, i) => (
                          <span
                            key={i}
                            style={{ height: `${(h / 100) * 22}px` }}
                            className={`w-1 rounded-full ${
                              isPlayingAudio ? "bg-emerald-300 animate-pulse" : "bg-emerald-500/60"
                            }`}
                          />
                        )
                      )}
                    </div>

                    <span className="font-mono text-[10px] text-emerald-300">0:15</span>
                  </div>
                ) : msg.type === "offer" ? (
                  /* Escrow Offer Card */
                  <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                      <Lock className="w-3.5 h-3.5" />
                      <span>KINARA SMART ESCROW PROPOSAL</span>
                    </div>
                    <p className="text-slate-200">{msg.text}</p>
                    <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                      <span className="text-amber-400 font-bold">KES 14,500</span>
                      <span className="text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded">
                        Funds Held in Vault
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                )}

                <div
                  className={`text-[9px] font-mono text-slate-400 flex items-center gap-1 ${
                    msg.isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.isMe && <Check className="w-3 h-3 text-emerald-400" />}
                </div>
              </div>
            </div>
          ))}

          {/* Interactive Poll Demonstration */}
          <div className="p-4 rounded-2xl bg-[#0c1817] border border-emerald-500/20 max-w-[85%] space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <Vote className="w-4 h-4 text-emerald-400" />
              <span>Team Poll: Next Deployment Target</span>
            </div>
            <div className="space-y-1.5">
              {[
                { id: "kigali", label: "Kigali Horizon Hub (Rwanda)", pct: "64%" },
                { id: "lagos", label: "Lagos FinTech Corridor (Nigeria)", pct: "36%" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPollVoted(opt.id)}
                  className={`w-full p-2.5 rounded-xl text-xs flex items-center justify-between border transition ${
                    pollVoted === opt.id
                      ? "bg-emerald-950/80 border-emerald-400 text-white font-bold"
                      : "bg-black/40 border-white/5 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="font-mono text-emerald-400">{opt.pct}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-emerald-950/60 bg-[#081212] flex items-center gap-2">
          <button
            onClick={() => handleSendMessage("voice")}
            className="p-2 rounded-xl bg-black/40 hover:bg-emerald-950 text-slate-400 hover:text-emerald-300 border border-white/5 transition"
            title="Record Voice Note (Audio Waveform)"
          >
            <Mic className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage("text")}
            placeholder={`Message ${activeThread.name}...`}
            className="flex-1 bg-black/50 border border-emerald-950/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500/40"
          />

          <button
            onClick={() => handleSendMessage("text")}
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-black font-bold transition shadow-md shadow-emerald-950"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
