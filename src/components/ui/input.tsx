import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${props.id}-error` : undefined}
          className={cn(
            "flex h-10 w-full rounded-xl border bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
            "border-white/[0.08] focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${props.id}-error`} className="mt-1 text-xs text-red-400">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border bg-black/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
          "border-white/[0.08] focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500/50",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-xl border bg-black/40 px-3 py-2 text-sm text-slate-100",
        "border-white/[0.08] focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
