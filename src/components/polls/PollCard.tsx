"use client";

import * as React from "react";
import { BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export interface Poll {
  id: number;
  question: string;
  options: string[];
  votes: number[];
  votedBy: string[];
  postId?: number | null;
  clipId?: number | null;
  createdBy?: string;
  createdAt?: string;
}

interface PollCardProps {
  poll: Poll;
  currentUserId: string | null | undefined;
  onVote?: (updatedPoll: Poll) => void;
}

export function PollCard({ poll, currentUserId, onVote }: PollCardProps) {
  const [votingIndex, setVotingIndex] = React.useState<number | null>(null);
  const [localPoll, setLocalPoll] = React.useState<Poll>(poll);

  React.useEffect(() => {
    setLocalPoll(poll);
  }, [poll]);

  const totalVotes = React.useMemo(() => {
    const votes = Array.isArray(localPoll.votes) ? localPoll.votes : [];
    return votes.reduce((sum, v) => sum + (Number(v) || 0), 0);
  }, [localPoll.votes]);

  const hasVoted = React.useMemo(() => {
    if (!currentUserId) return false;
    const votedBy = Array.isArray(localPoll.votedBy) ? localPoll.votedBy : [];
    return votedBy.includes(currentUserId);
  }, [localPoll.votedBy, currentUserId]);

  async function handleVote(optionIndex: number) {
    if (hasVoted) {
      toast.info("You have already voted on this poll.");
      return;
    }
    if (!currentUserId) {
      toast.error("Please sign in to vote.");
      return;
    }
    if (optionIndex < 0 || optionIndex >= localPoll.options.length) return;

    setVotingIndex(optionIndex);
    try {
      const res = await fetch(`/api/polls/${localPoll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "Failed to vote";
        toast.error(msg);
        return;
      }
      const updated: Poll = data.poll ?? data;
      // Normalize votes/votedBy to ensure arrays
      if (updated && Array.isArray(updated.votes)) {
        setLocalPoll(updated);
        onVote?.(updated);
        toast.success("Vote recorded");
      } else {
        // fallback optimistic
        const votes = [...(localPoll.votes as number[])];
        while (votes.length < localPoll.options.length) votes.push(0);
        votes[optionIndex] = (votes[optionIndex] ?? 0) + 1;
        const next = {
          ...localPoll,
          votes,
          votedBy: [...(localPoll.votedBy as string[]), currentUserId!],
        };
        setLocalPoll(next);
        onVote?.(next);
        toast.success("Vote recorded");
      }
    } catch (err) {
      console.error("Poll vote error:", err);
      toast.error("Failed to vote. Please try again.");
    } finally {
      setVotingIndex(null);
    }
  }

  return (
    <div className="kinara-card rounded-2xl p-4 sm:p-5 space-y-3 border border-white/[0.06]">
      <div className="flex items-start gap-2">
        <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/30 shrink-0 mt-0.5">
          <BarChart3 className="h-4 w-4 text-emerald-400" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-100 leading-snug pr-2">{localPoll.question}</h4>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"} • {localPoll.options.length} options
            {hasVoted ? <span className="ml-2 inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Voted</span> : null}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        {localPoll.options.map((opt, idx) => {
          const votesForOption = Number(localPoll.votes?.[idx] ?? 0);
          const pct = totalVotes > 0 ? (votesForOption / totalVotes) * 100 : 0;
          const isVotingThis = votingIndex === idx;
          return (
            <button
              key={`${idx}-${opt}`}
              type="button"
              onClick={() => handleVote(idx)}
              disabled={hasVoted || votingIndex !== null}
              className={`group relative w-full text-left rounded-xl border px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                hasVoted
                  ? "bg-black/30 border-white/[0.06] cursor-not-allowed opacity-90"
                  : "bg-black/40 border-white/[0.08] hover:border-emerald-500/40 hover:bg-black/60 cursor-pointer"
              }`}
              aria-disabled={hasVoted || votingIndex !== null}
              aria-label={`Vote for ${opt}`}
            >
              {/* progress fill behind */}
              <div
                className="absolute inset-0 rounded-xl bg-emerald-500/10 transition-all duration-500 ease-out pointer-events-none"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-200 truncate pr-2 flex items-center gap-1.5">
                  {hasVoted ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 opacity-70" aria-hidden /> : null}
                  {opt}
                </span>
                <span className="shrink-0 text-xs font-mono font-bold text-emerald-300">
                  {votesForOption} <span className="text-slate-500 font-normal">({Math.round(pct)}%)</span>
                </span>
              </div>
              <Progress value={pct} max={100} className="mt-2 h-1.5 bg-white/5" indicatorClassName="bg-emerald-500" />
            </button>
          );
        })}
      </div>

      {hasVoted ? (
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden />
          You have already voted. Voting is disabled.
        </p>
      ) : (
        <p className="text-[11px] text-slate-500 pt-1">Select an option to cast your vote.</p>
      )}
    </div>
  );
}

// Also export default for convenience
export default PollCard;
