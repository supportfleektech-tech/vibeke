"use client";

import Image from "next/image";

import React, { useState } from "react";
import { Briefcase, MapPin, DollarSign, Clock, ShieldCheck, Check, Sparkles } from "lucide-react";
import { JobListing } from "@/types";

interface JobsViewProps {
  jobs: JobListing[];
  selectedCity: string;
}

export function JobsView({ jobs, selectedCity }: JobsViewProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [appliedMap, setAppliedMap] = useState<Record<number, boolean>>({});

  const categories = ["all", "Design & UX", "Engineering", "Operations"];

  const filteredJobs = jobs.filter((j) => {
    if (activeCategory === "all") return true;
    return j.category.toLowerCase().includes(activeCategory.toLowerCase());
  });

  function handleApply(id: number) {
    setAppliedMap({ ...appliedMap, [id]: true });
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="kinara-card p-6 sm:p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-[#0d1c1a] to-[#071312] space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
          <span>SOVEREIGN CAREERS & FELLOWSHIPS</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Pan-African High-Impact Opportunities
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          High craft roles at verified African startups, design collectives, and climate tech pioneers. Apply with your verified Kinara Trust Passport.
        </p>

        {/* Category Pills */}
        <div className="flex items-center gap-2 pt-2 text-xs overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-medium transition border ${
                activeCategory === cat
                  ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/40 font-bold"
                  : "bg-black/40 hover:bg-white/5 text-slate-400 border-white/5"
              }`}
            >
              {cat === "all" ? "All Openings" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => {
          const isApplied = !!appliedMap[job.id];
          const tags: string[] = (() => {
            try {
              return JSON.parse(job.tags);
            } catch {
              return ["Tech", "Remote"];
            }
          })();

          return (
            <div
              key={job.id}
              className="kinara-card p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:border-emerald-500/40 transition"
            >
              <div className="flex items-start gap-4">
                <Image src={job.companyLogo}
                  alt={job.company}
                  className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/20 shrink-0" width={48} height={48} unoptimized loading="lazy" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                    {job.title}
                  </h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-300">{job.company}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {job.location}
                    </span>
                    <span>•</span>
                    <span className="text-slate-400 font-mono text-[11px]">{job.postedAt}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="text-left md:text-right">
                  <div className="text-xs font-mono font-bold text-emerald-300">{job.salary}</div>
                  <div className="text-[10px] text-slate-400">{job.type}</div>
                </div>

                <button
                  onClick={() => handleApply(job.id)}
                  disabled={isApplied}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isApplied
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-600/40"
                      : "bg-emerald-600 hover:bg-emerald-500 text-black shadow-md shadow-emerald-950"
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Passport Dispatched</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>1-Click Apply</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
