"use client";

import * as React from "react";
import Image from "next/image";
import useSWR from "swr";
import { BookOpen, Star, Users, Tag, Clock, Play, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Lesson {
  title: string;
  duration: string;
  videoUrl: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  banner: string;
  category: string;
  price: number;
  lessons: Lesson[] | string;
  instructorId?: string | null;
  enrolledCount: number;
  rating: string | number;
  createdAt?: string;
}

interface Enrollment {
  courseId: string;
  userId: string;
  progress: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to fetch");
  return data;
};

function parseLessons(raw: Course["lessons"]): Lesson[] {
  if (Array.isArray(raw)) return raw as Lesson[];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return `KES ${price.toLocaleString()}`;
}

export function CoursesView() {
  const { data, error, isLoading, mutate } = useSWR<{ courses: Course[] }>("/api/courses", fetcher, {
    revalidateOnFocus: false,
  });

  const courses = data?.courses ?? [];

  // enrolled courseIds + progress map – optimistic after enroll
  const [enrolledIds, setEnrolledIds] = React.useState<Set<string>>(new Set());
  const [progressMap, setProgressMap] = React.useState<Record<string, number>>({});
  const [enrollingId, setEnrollingId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  async function handleEnroll(courseId: string) {
    if (enrolledIds.has(courseId)) {
      toast.info("You are already enrolled in this course.");
      return;
    }
    setEnrollingId(courseId);
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        // already enrolled – treat as success
        setEnrolledIds((prev) => new Set(prev).add(courseId));
        setProgressMap((prev) => ({ ...prev, [courseId]: data?.enrollment?.progress ?? 0 }));
        toast.success("Already enrolled");
        return;
      }
      if (!res.ok) {
        toast.error(data?.error || "Failed to enroll");
        return;
      }
      const enrollment: Enrollment = data.enrollment ?? data;
      setEnrolledIds((prev) => new Set(prev).add(courseId));
      setProgressMap((prev) => ({ ...prev, [courseId]: enrollment?.progress ?? 0 }));
      toast.success("Enrolled successfully");
      // optimistic increment enrolledCount locally + revalidate
      mutate(
        (curr) => {
          if (!curr) return curr;
          return {
            courses: curr.courses.map((c) => (c.id === courseId ? { ...c, enrolledCount: (c.enrolledCount ?? 0) + 1 } : c)),
          };
        },
        { revalidate: false }
      );
      // background revalidate
      setTimeout(() => mutate(), 800);
    } catch (err) {
      console.error("Enroll error:", err);
      toast.error("Failed to enroll. Please try again.");
    } finally {
      setEnrollingId(null);
    }
  }

  if (error) {
    return (
      <div className="kinara-card rounded-2xl p-6 text-center space-y-3">
        <GraduationCap className="h-6 w-6 text-slate-500 mx-auto" />
        <p className="text-sm font-semibold text-white">Failed to load courses</p>
        <p className="text-xs text-slate-400">{String(error.message || error)}</p>
        <Button variant="secondary" size="sm" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/30">
          <GraduationCap className="h-4 w-4 text-emerald-400" aria-hidden />
        </span>
        <h2 className="text-sm font-bold text-white">Courses</h2>
        <span className="text-[11px] font-mono text-slate-500 bg-black/40 border border-white/5 px-2 py-0.5 rounded-full">
          {isLoading ? "loading..." : `${courses.length} courses`}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="kinara-card rounded-2xl overflow-hidden animate-pulse">
              <div className="h-36 bg-white/[0.04]" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-white/[0.06] rounded w-3/4" />
                <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                <div className="h-8 bg-white/[0.06] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="kinara-card rounded-2xl p-8 text-center space-y-3">
          <BookOpen className="h-6 w-6 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-white">No courses yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Courses will appear here once instructors publish them. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => {
            const lessons = parseLessons(course.lessons);
            const isEnrolled = enrolledIds.has(course.id);
            const progress = progressMap[course.id] ?? 0;
            const isExpanded = expandedId === course.id;
            const ratingNum = typeof course.rating === "string" ? parseFloat(course.rating) : course.rating;
            const ratingDisplay = isNaN(ratingNum as number) ? course.rating : (ratingNum as number).toFixed(1);

            return (
              <div key={course.id} className="kinara-card rounded-2xl overflow-hidden border border-white/[0.06] flex flex-col group">
                <div className="relative h-40 w-full overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {course.banner ? (
                    <Image
                      src={course.banner}
                      alt={course.title}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition duration-300"
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-emerald-950/40">
                      <BookOpen className="h-8 w-8 text-emerald-400/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <Badge variant="emerald" className="text-[11px]">
                      <Tag className="h-3 w-3" />
                      {course.category}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${course.price === 0 ? "bg-emerald-600 text-black border-emerald-500" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                      {formatPrice(course.price)}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col space-y-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-white leading-tight line-clamp-2">{course.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{course.description}</p>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3 text-emerald-400" />
                      {course.enrolledCount.toLocaleString()} enrolled
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" />
                      {ratingDisplay}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3 w-3 text-slate-400" />
                      {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
                    </span>
                  </div>

                  {/* Lessons jsonb as list */}
                  {lessons.length > 0 ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : course.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition"
                        aria-expanded={isExpanded}
                      >
                        <span className="flex items-center gap-1.5">
                          <Play className="h-3 w-3 text-emerald-400" />
                          Lessons ({lessons.length})
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">{isExpanded ? "Hide" : "Show"}</span>
                      </button>
                      {isExpanded ? (
                        <ul className="space-y-1.5 rounded-xl bg-black/30 border border-white/[0.06] p-2 max-h-40 overflow-auto">
                          {lessons.map((l, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                              <span className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800/30 flex items-center justify-center text-[10px] font-mono text-emerald-300 shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="truncate text-slate-200">{l.title}</span>
                              </span>
                              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                                <Clock className="h-3 w-3" />
                                {l.duration}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[11px] text-slate-500 truncate">
                          {lessons
                            .slice(0, 2)
                            .map((l) => l.title)
                            .join(" • ")}
                          {lessons.length > 2 ? ` +${lessons.length - 2} more` : ""}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No lessons listed.</p>
                  )}

                  {isEnrolled ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-emerald-300">Enrolled</span>
                        <span className="font-mono text-emerald-300">{progress}%</span>
                      </div>
                      <Progress value={progress} max={100} className="h-2" indicatorClassName="bg-emerald-500" />
                      <p className="text-[11px] text-slate-500">Keep learning – progress tracked per lesson.</p>
                    </div>
                  ) : null}

                  <div className="pt-2 mt-auto">
                    <Button
                      variant={isEnrolled ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => handleEnroll(course.id)}
                      disabled={isEnrolled || enrollingId === course.id}
                      loading={enrollingId === course.id}
                      className="w-full"
                      aria-label={isEnrolled ? `Enrolled in ${course.title}` : `Enroll in ${course.title}`}
                    >
                      {enrollingId === course.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Enrolling...
                        </>
                      ) : isEnrolled ? (
                        <>
                          <GraduationCap className="h-3.5 w-3.5" />
                          Enrolled
                        </>
                      ) : (
                        <>
                          <GraduationCap className="h-3.5 w-3.5" />
                          Enroll {course.price === 0 ? "• Free" : `• ${formatPrice(course.price)}`}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CoursesView;
