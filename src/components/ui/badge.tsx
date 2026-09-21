import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "emerald" | "gold" | "indigo" | "slate" | "default";

const variantClasses: Record<Variant, string> = {
  emerald: "badge-emerald",
  gold: "badge-gold",
  indigo: "badge-indigo",
  slate: "badge-slate",
  default: "bg-white/[0.06] border border-white/[0.08] text-slate-300",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export function TrustBadge({ score }: { score: number }) {
  return <Badge variant="emerald">{score} TRUST</Badge>;
}
