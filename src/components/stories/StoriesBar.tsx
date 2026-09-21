"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Image from "next/image";
import { Plus } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { StoryViewer } from "./StoryViewer";

export interface Story {
  id: number;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  mediaUrl: string;
  mediaType: string;
  caption: string;
  expiresAt: string;
  viewedBy: string[];
  createdAt: string;
}

interface StoriesBarProps {
  currentUserId?: string;
}

const CURRENT_USER_FALLBACK = "usr_brian_mwangi";

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

function isViewed(story: Story, currentUserId: string): boolean {
  const viewedBy = (story.viewedBy as string[]) ?? [];
  return viewedBy.includes(currentUserId);
}

export function StoriesBar({ currentUserId = CURRENT_USER_FALLBACK }: StoriesBarProps) {
  const { data, isLoading, mutate } = useSWR<{ stories: Story[] }>("/api/stories", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const [viewerOpen, setViewerOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const stories: Story[] = useMemo(() => {
    const raw: Story[] = (data as { stories?: Story[] })?.stories ?? [];
    // client-side filter not expired as well
    return raw.filter((s) => !isExpired(s.expiresAt));
  }, [data]);

  function handleOpen(index: number) {
    setInitialIndex(index);
    setViewerOpen(true);
  }

  function handleClose() {
    setViewerOpen(false);
    // revalidate to pick up viewedBy changes after viewer closed
    mutate();
  }

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 min-w-[64px] animate-pulse">
            <div className="w-[64px] h-[64px] rounded-full bg-white/10 ring-2 ring-white/5" />
            <div className="h-3 w-12 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        aria-label="Stories"
      >
        {/* Your Story add button */}
        <div className="flex flex-col items-center gap-1.5 min-w-[64px] shrink-0">
          <button
            type="button"
            aria-label="Add your story"
            className="relative w-[64px] h-[64px] rounded-full p-[2.5px] bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-700 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_6px_16px_rgba(16,185,129,0.35)] transition-shadow group"
          >
            <span className="flex w-full h-full rounded-full bg-[#0e1b1b] items-center justify-center overflow-hidden border-[3px] border-[#060b0b]">
              <span className="w-full h-full bg-[#0e1b1b] rounded-full flex items-center justify-center relative">
                <span className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 to-transparent" />
                <Plus className="w-6 h-6 text-emerald-300 group-hover:text-emerald-200 transition-colors relative z-10" strokeWidth={2.2} />
              </span>
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full p-1 border-2 border-[#060b0b] shadow-md">
              <Plus className="w-3 h-3 text-black" strokeWidth={3} />
            </span>
          </button>
          <span className="text-[11px] font-medium text-slate-200 truncate w-[64px] text-center leading-none">Your Story</span>
          <span className="text-[10px] text-slate-500 leading-none">Add</span>
        </div>

        {stories.map((story, idx) => {
          const viewed = isViewed(story, currentUserId);
          const viewedCount = (story.viewedBy as string[])?.length ?? 0;
          return (
            <div key={story.id} className="flex flex-col items-center gap-1.5 min-w-[64px] shrink-0">
              <button
                type="button"
                onClick={() => handleOpen(idx)}
                aria-label={`View story by ${story.authorHandle}${viewed ? " viewed" : " not viewed"}`}
                className="relative w-[64px] h-[64px] rounded-full p-[2.5px] transition-transform hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060b0b]"
              >
                {/* Gradient ring: emerald if not viewed, slate if viewed */}
                <span
                  className={
                    viewed
                      ? "absolute inset-0 rounded-full bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800"
                      : "absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-amber-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]"
                  }
                  aria-hidden
                />
                <span className="relative flex w-full h-full rounded-full bg-[#060b0b] p-[2.5px]">
                  <span className="relative w-full h-full rounded-full overflow-hidden bg-[#0e1b1b] border border-white/5">
                    <Image
                      src={story.authorAvatar}
                      alt={story.authorName}
                      width={56}
                      height={56}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </span>
                </span>
                {viewedCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-[#0e1b1b] border border-white/10 text-[9px] font-mono font-semibold text-slate-300 px-1 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                    {viewedCount}
                  </span>
                )}
              </button>
              <span className="text-[11px] font-medium text-slate-200 truncate w-[64px] text-center leading-none">
                {story.authorHandle}
              </span>
              <span
                className={
                  viewed
                    ? "text-[10px] text-slate-500 leading-none"
                    : "text-[10px] text-emerald-400 font-medium leading-none"
                }
              >
                {viewed ? "Viewed" : "New"} {viewedCount > 0 ? `• ${viewedCount}` : ""}
              </span>
            </div>
          );
        })}

        {stories.length === 0 && !isLoading && (
          <div className="flex items-center text-xs text-slate-500 italic pl-2">No stories yet — be the first to share</div>
        )}
      </div>

      {viewerOpen && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialIndex={initialIndex}
          onClose={handleClose}
          currentUserId={currentUserId}
        />
      )}

      {/* hide scrollbar globally for this bar */}
      <style>{`.scrollbar-none::-webkit-scrollbar{display:none}`}</style>
    </>
  );
}
