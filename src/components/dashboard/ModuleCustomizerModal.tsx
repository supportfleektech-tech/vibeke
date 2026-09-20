"use client";

import React from "react";
import { X, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Check, Sparkles } from "lucide-react";
import { DashboardSectionConfig, DashboardSectionKey } from "@/types";

interface ModuleCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: DashboardSectionConfig[];
  onUpdateSections: (newSections: DashboardSectionConfig[]) => void;
  onResetDefault: () => void;
}

export function ModuleCustomizerModal({
  isOpen,
  onClose,
  sections,
  onUpdateSections,
  onResetDefault,
}: ModuleCustomizerModalProps) {
  if (!isOpen) return null;

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...sections];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onUpdateSections(next);
  }

  function moveDown(index: number) {
    if (index === sections.length - 1) return;
    const next = [...sections];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onUpdateSections(next);
  }

  function toggleVisibility(id: DashboardSectionKey) {
    const next = sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s));
    onUpdateSections(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0b1515] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-950/80 bg-[#0e1b1b]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Customize Dynamic Home</h3>
              <p className="text-[11px] text-slate-400">
                Arrange, re-order and toggle your modular dashboard sections
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of sections */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition ${
                section.visible
                  ? "bg-[#0f2120] border-emerald-500/25 text-white"
                  : "bg-white/[0.02] border-white/5 text-slate-500"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{section.icon}</span>
                <div>
                  <div className="text-xs font-semibold">{section.label}</div>
                  <div className="text-[10px] text-slate-400">Position #{index + 1}</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Move up */}
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-emerald-950 disabled:opacity-30 disabled:hover:bg-black/40 text-slate-300 transition"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>

                {/* Move down */}
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === sections.length - 1}
                  className="p-1.5 rounded-lg bg-black/40 hover:bg-emerald-950 disabled:opacity-30 disabled:hover:bg-black/40 text-slate-300 transition"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                {/* Toggle visible */}
                <button
                  onClick={() => toggleVisibility(section.id)}
                  className={`p-1.5 rounded-lg transition ${
                    section.visible
                      ? "bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900"
                      : "bg-black/50 text-slate-500 hover:text-slate-300"
                  }`}
                  title={section.visible ? "Hide section" : "Show section"}
                >
                  {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-emerald-950/80 bg-[#091111] flex items-center justify-between">
          <button
            onClick={onResetDefault}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Standard
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/30"
          >
            <Check className="w-4 h-4" />
            Done Customizing
          </button>
        </div>
      </div>
    </div>
  );
}
