"use client";

import React, { useEffect, useRef } from "react";
import { X, ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Check, Sparkles, GripVertical } from "lucide-react";
import { DashboardSectionConfig, DashboardSectionKey } from "@/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ModuleCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: DashboardSectionConfig[];
  onUpdateSections: (newSections: DashboardSectionConfig[]) => void;
  onResetDefault: () => void;
}

function SortableItem({
  section,
  index,
  total,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  section: DashboardSectionConfig;
  index: number;
  total: number;
  onToggle: (id: DashboardSectionKey) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onMoveUp(index);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onMoveDown(index);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`${section.label} position ${index + 1} of ${total}. Use arrow keys to reorder, drag handle to move.`}
      className={`flex items-center justify-between p-3 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
        section.visible
          ? "bg-[#0f2120] border-emerald-500/25 text-white"
          : "bg-white/[0.02] border-white/5 text-slate-500"
      } ${isDragging ? "shadow-xl ring-2 ring-emerald-500/30 z-10" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* DragHandle with dnd-kit */}
        <button
          className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing touch-none shrink-0"
          aria-label={`Drag to reorder ${section.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-lg" aria-hidden>{section.icon}</span>
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">{section.label}</div>
          <div className="text-[10px] text-slate-400">Position #{index + 1}</div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Move up */}
        <button
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className="p-1.5 rounded-lg bg-black/40 hover:bg-emerald-950 disabled:opacity-30 disabled:hover:bg-black/40 text-slate-300 transition"
          title="Move Up"
          aria-label={`Move ${section.label} up`}
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        {/* Move down */}
        <button
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          className="p-1.5 rounded-lg bg-black/40 hover:bg-emerald-950 disabled:opacity-30 disabled:hover:bg-black/40 text-slate-300 transition"
          title="Move Down"
          aria-label={`Move ${section.label} down`}
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>

        {/* Toggle visible */}
        <button
          onClick={() => onToggle(section.id)}
          className={`p-1.5 rounded-lg transition ${
            section.visible
              ? "bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900"
              : "bg-black/50 text-slate-500 hover:text-slate-300"
          }`}
          title={section.visible ? "Hide section" : "Show section"}
          aria-label={section.visible ? `Hide ${section.label}` : `Show ${section.label}`}
          aria-pressed={section.visible}
        >
          {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function ModuleCustomizerModal({
  isOpen,
  onClose,
  sections,
  onUpdateSections,
  onResetDefault,
}: ModuleCustomizerModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Focus trap + Escape + aria-modal handling
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus first focusable inside dialog
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      // focus trap Tab cycling
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(sections, oldIndex, newIndex);
    onUpdateSections(next);
  }

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customizer-title"
        aria-describedby="customizer-desc"
        className="w-full max-w-lg bg-[#0b1515] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-emerald-950/80 bg-[#0e1b1b]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden />
            <div>
              <h3 id="customizer-title" className="text-sm font-bold text-white">Customize Dynamic Home</h3>
              <p id="customizer-desc" className="text-[11px] text-slate-400">
                Arrange, re-order and toggle your modular dashboard sections. Drag handles or use Arrow keys.
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Close customizer dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of sections with dnd-kit */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto" role="list" aria-label="Dashboard sections">
              {sections.map((section, index) => (
                <SortableItem
                  key={section.id}
                  section={section}
                  index={index}
                  total={sections.length}
                  onToggle={toggleVisibility}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Footer */}
        <div className="p-4 border-t border-emerald-950/80 bg-[#091111] flex items-center justify-between">
          <button
            onClick={onResetDefault}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-lg px-2 py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Standard
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Check className="w-4 h-4" />
            Done Customizing
          </button>
        </div>
      </div>
    </div>
  );
}
