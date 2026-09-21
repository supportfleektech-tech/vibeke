import * as React from "react";
import { cn } from "@/lib/cn";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

export function Progress({ value = 0, max = 100, className, indicatorClassName, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/10", className)}
      {...props}
    >
      <div
        className={cn("h-full bg-emerald-500 transition-all duration-500 ease-out", indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressBar({
  label,
  value,
  max = 100,
  className,
}: {
  label?: string;
  value: number;
  max?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-slate-300">{label}</span>
          <span className="font-mono text-emerald-300">{Math.round((value / max) * 100)}%</span>
        </div>
      )}
      <Progress value={value} max={max} />
    </div>
  );
}
