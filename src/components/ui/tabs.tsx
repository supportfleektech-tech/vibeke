"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1.5 overflow-x-auto scrollbar-none border-b border-white/[0.06] pb-2 -mb-px",
        className
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          aria-controls={`panel-${t.id}`}
          id={`tab-${t.id}`}
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors",
            active === t.id
              ? "bg-emerald-600 text-black border-emerald-500"
              : "bg-white/[0.04] text-slate-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-slate-200"
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
  className,
}: {
  id: string;
  active: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (active !== id) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={cn("pt-4 animate-in", className)}
    >
      {children}
    </div>
  );
}
