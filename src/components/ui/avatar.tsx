import * as React from "react";
import { cn } from "@/lib/cn";

export function Avatar({
  src,
  alt,
  size = "md",
  className,
  fallback,
}: {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fallback?: string;
}) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  } as const;
  const [err, setErr] = React.useState(false);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full bg-slate-800 border border-white/10 shrink-0",
        sizes[size],
        className
      )}
    >
      {src && !err ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setErr(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-300">
          {fallback || alt.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
