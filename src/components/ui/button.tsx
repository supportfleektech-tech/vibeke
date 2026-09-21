import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-500 text-black font-semibold border border-emerald-500/30",
  secondary:
    "bg-black/40 hover:bg-black/60 text-slate-200 border border-white/[0.08] hover:border-white/[0.12]",
  ghost:
    "bg-transparent hover:bg-white/[0.06] text-slate-300 border border-transparent",
  gold: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30",
  danger: "bg-red-600 hover:bg-red-500 text-white border border-red-500/30",
};

const sizeClasses: Record<Size, string> = {
  sm: "min-h-11 px-3 text-xs gap-1.5",
  md: "min-h-11 px-4 py-2 text-sm gap-2",
  lg: "min-h-11 px-6 text-sm gap-2",
  icon: "min-h-11 min-w-11 h-11 w-11 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060b0b]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98] touch-target",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
