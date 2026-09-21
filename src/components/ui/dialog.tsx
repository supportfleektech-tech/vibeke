"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { Button } from "./button";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, description, children, className }: DialogProps) {
  const overlayRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    // focus trap: focus first focusable
    const dialog = overlayRef.current?.querySelector<HTMLElement>("[data-dialog-content]");
    const focusable = dialog?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    focusable?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-desc" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-dialog-content
        className={cn(
          "relative w-full max-w-lg max-h-[85vh] overflow-auto rounded-2xl bg-[#0e1b1b] border border-white/[0.08] p-0 animate-slide-in",
          "shadow-2xl",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="sticky top-0 bg-[#0e1b1b] border-b border-white/[0.06] p-5 pb-4 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 id="dialog-title" className="text-base font-bold text-slate-100">
                  {title}
                </h2>
              )}
              {description && (
                <p id="dialog-desc" className="text-xs text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {!title && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-3 right-3 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
