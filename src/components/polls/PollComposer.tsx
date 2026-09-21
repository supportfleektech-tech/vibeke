"use client";

import * as React from "react";
import { Plus, Trash2, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "sonner";

interface PollComposerProps {
  postId?: number | null;
  clipId?: number | null;
  onCreated?: (poll: any) => void;
}

export function PollComposer({ postId, clipId, onCreated }: PollComposerProps) {
  const [question, setQuestion] = React.useState("");
  const [options, setOptions] = React.useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const questionLen = question.trim().length;
  const isQuestionValid = questionLen >= 5 && questionLen <= 200;

  function updateOption(idx: number, value: string) {
    setOptions((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function addOption() {
    if (options.length >= 4) {
      toast.info("Maximum 4 options allowed.");
      return;
    }
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) {
      toast.info("At least 2 options are required.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 5 || trimmedQuestion.length > 200) {
      toast.error("Question must be between 5 and 200 characters.");
      return;
    }

    const cleaned = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleaned.length < 2) {
      toast.error("Provide at least 2 non-empty options.");
      return;
    }
    if (cleaned.length > 4) {
      toast.error("At most 4 options allowed.");
      return;
    }
    // also check each option max 50
    for (const o of cleaned) {
      if (o.length > 50) {
        toast.error("Each option must be at most 50 characters.");
        return;
      }
    }
    if (!postId && !clipId) {
      toast.error("A post or clip must be associated with the poll.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postId ?? null,
          clipId: clipId ?? null,
          question: trimmedQuestion,
          options: cleaned,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.details ? JSON.stringify(data.details) : "Failed to create poll";
        toast.error(typeof msg === "string" ? msg : "Failed to create poll");
        return;
      }
      toast.success("Poll created");
      onCreated?.(data.poll ?? data);
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      console.error("Poll create error:", err);
      toast.error("Failed to create poll. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="kinara-card rounded-2xl p-4 sm:p-5 space-y-4 border border-white/[0.06]">
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/30">
          <BarChart3 className="h-4 w-4 text-emerald-400" aria-hidden />
        </span>
        <h3 className="text-sm font-bold text-slate-100">Create Poll</h3>
        <span className="ml-auto text-[11px] font-mono text-slate-500">
          {questionLen}/200
        </span>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="poll-question" className="text-xs font-semibold text-slate-300">
          Question
        </label>
        <Textarea
          id="poll-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question (5–200 characters)..."
          rows={2}
          maxLength={200}
          className="resize-none"
          aria-describedby="poll-question-hint"
        />
        <p id="poll-question-hint" className="text-[11px] text-slate-500">
          {isQuestionValid ? (
            <span className="text-emerald-400">Looks good</span>
          ) : (
            <span>Min 5, max 200 characters. {questionLen < 5 ? `${5 - questionLen} more needed` : ""}</span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Options (2–4)</label>
          <span className="text-[11px] font-mono text-slate-500">{options.length}/4</span>
        </div>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center text-[11px] font-mono text-slate-400">
              {idx + 1}
            </span>
            <Input
              value={opt}
              onChange={(e) => updateOption(idx, e.target.value)}
              placeholder={`Option ${idx + 1} (max 50 chars)`}
              maxLength={50}
              aria-label={`Poll option ${idx + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeOption(idx)}
              disabled={options.length <= 2}
              aria-label={`Remove option ${idx + 1}`}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {options.length < 4 ? (
          <Button type="button" variant="secondary" size="sm" onClick={addOption} className="w-full sm:w-auto">
            <Plus className="h-3.5 w-3.5" />
            Add option
          </Button>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={isSubmitting}
        disabled={!isQuestionValid || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <BarChart3 className="h-4 w-4" />
            Create Poll
          </>
        )}
      </Button>

      {!postId && !clipId ? (
        <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          Tip: Pass <code className="font-mono">postId</code> or <code className="font-mono">clipId</code> to attach this poll to content.
        </p>
      ) : null}
    </form>
  );
}

export default PollComposer;
