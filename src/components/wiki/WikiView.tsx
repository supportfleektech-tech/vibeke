"use client";

import * as React from "react";
import { FileText, Plus, Pencil, X, Save, Clock, User as UserIcon, Hash, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "sonner";

interface WikiPage {
  id: string;
  communityId: string;
  slug: string;
  title: string;
  content: string;
  version: number;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WikiViewProps {
  communitySlug: string;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Very lightweight markdown preview – zero-budget, no TipTap
function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return <p className="text-xs text-slate-500 italic">Nothing to preview.</p>;
  }
  // naive render: headings, bold, italic, code, lists
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("### ")) {
          return <h4 key={i} className="text-sm font-bold text-white mt-2">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={i} className="text-base font-bold text-white mt-3">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={i} className="text-lg font-extrabold text-white mt-3">{trimmed.slice(2)}</h2>;
        }
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return <div key={i} className="flex gap-2 ml-3"><span className="text-emerald-400">•</span><span>{trimmed.slice(2)}</span></div>;
        }
        if (trimmed.startsWith("> ")) {
          return <blockquote key={i} className="border-l-2 border-emerald-500/40 pl-3 text-slate-300 italic bg-emerald-950/20 py-1 rounded-r">{trimmed.slice(2)}</blockquote>;
        }
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={i} className="border-white/10 my-2" />;
        }
        // inline bold/italic/code naive replace for display via spans
        // keep as text but highlight code
        return <p key={i} className="min-h-[1.2em]">{line || "\u00A0"}</p>;
      })}
    </div>
  );
}

export function WikiView({ communitySlug }: WikiViewProps) {
  const [pages, setPages] = React.useState<WikiPage[]>([]);
  const [selectedSlug, setSelectedSlug] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  // create modal state
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [createSlug, setCreateSlug] = React.useState("");
  const [createTitle, setCreateTitle] = React.useState("");
  const [createContent, setCreateContent] = React.useState("");

  // edit state
  const [editTitle, setEditTitle] = React.useState("");
  const [editContent, setEditContent] = React.useState("");

  const selectedPage = React.useMemo(
    () => pages.find((p) => p.slug === selectedSlug) || null,
    [pages, selectedSlug]
  );

  const fetchPages = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(communitySlug)}/wiki`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to load wiki pages");
        return;
      }
      const list: WikiPage[] = data.pages ?? data ?? [];
      setPages(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list.length > 0 && !selectedSlug) {
        setSelectedSlug(list[0].slug);
      }
    } catch (err) {
      console.error("Wiki fetch error:", err);
      toast.error("Failed to load wiki pages");
    } finally {
      setIsLoading(false);
    }
  }, [communitySlug, selectedSlug]);

  React.useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  React.useEffect(() => {
    if (selectedPage) {
      setEditTitle(selectedPage.title);
      setEditContent(selectedPage.content);
    }
  }, [selectedPage]);

  async function handleCreate() {
    const slug = createSlug.trim().toLowerCase();
    const title = createTitle.trim();
    const content = createContent.trim();
    if (slug.length < 3 || slug.length > 50 || !/^[a-z0-9-]+$/.test(slug)) {
      toast.error("Slug must be 3-50 chars, lowercase a-z 0-9 and hyphen only");
      return;
    }
    if (title.length < 3 || title.length > 100) {
      toast.error("Title must be 3-100 characters");
      return;
    }
    if (content.length < 10 || content.length > 5000) {
      toast.error("Content must be 10-5000 characters");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(communitySlug)}/wiki`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to create wiki page");
        return;
      }
      const page: WikiPage = data.page ?? data;
      toast.success("Wiki page created");
      setPages((prev) => [page, ...prev.filter((p) => p.slug !== page.slug)]);
      setSelectedSlug(page.slug);
      setShowCreateModal(false);
      setCreateSlug("");
      setCreateTitle("");
      setCreateContent("");
    } catch (err) {
      console.error("Wiki create error:", err);
      toast.error("Failed to create wiki page");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleEdit() {
    if (!selectedPage) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    if (title && (title.length < 3 || title.length > 100)) {
      toast.error("Title must be 3-100 characters");
      return;
    }
    if (content && (content.length < 10 || content.length > 5000)) {
      toast.error("Content must be 10-5000 characters");
      return;
    }
    if (!title && !content) {
      toast.error("Provide title or content to update");
      return;
    }

    setIsEditing(true);
    try {
      const res = await fetch(
        `/api/communities/${encodeURIComponent(communitySlug)}/wiki/${encodeURIComponent(selectedPage.slug)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(title ? { title } : {}),
            ...(content ? { content } : {}),
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Failed to update wiki page");
        return;
      }
      const updated: WikiPage = data.page ?? data;
      toast.success("Wiki page updated");
      setPages((prev) => prev.map((p) => (p.slug === updated.slug ? updated : p)));
      setIsEditing(false);
    } catch (err) {
      console.error("Wiki update error:", err);
      toast.error("Failed to update wiki page");
    } finally {
      setIsEditing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/30">
            <FileText className="h-4 w-4 text-emerald-400" aria-hidden />
          </span>
          <h2 className="text-sm font-bold text-white">Community Wiki</h2>
          <span className="text-[11px] font-mono text-slate-500 bg-black/40 border border-white/5 px-2 py-0.5 rounded-full">
            /{communitySlug}
          </span>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Page
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Pages list */}
        <div className="kinara-card rounded-2xl border border-white/[0.06] p-3 space-y-2 max-h-[560px] overflow-auto">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-bold text-slate-300">Pages</span>
            <span className="text-[11px] font-mono text-slate-500">{pages.length}</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <FileText className="h-6 w-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No wiki pages yet.</p>
              <p className="text-[11px] text-slate-500">Create the first page to seed knowledge.</p>
            </div>
          ) : (
            pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedSlug(p.slug)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
                  selectedSlug === p.slug
                    ? "bg-emerald-950/60 border-emerald-500/30"
                    : "bg-black/30 border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Hash className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">{p.title}</span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">/{p.slug} • v{p.version}</p>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">{p.content.slice(0, 120)}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(p.updatedAt)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Viewer / Editor */}
        <div className="kinara-card rounded-2xl border border-white/[0.06] p-4 sm:p-5 space-y-4 min-h-[420px]">
          {!selectedPage ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Eye className="h-6 w-6 text-slate-500" />
              <p className="text-sm font-semibold text-white">Select a page</p>
              <p className="text-xs text-slate-400 max-w-sm">Choose a page from the left to view, or create a new one for <span className="font-mono text-emerald-300">{communitySlug}</span>.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white leading-tight">{selectedPage.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1 bg-black/40 border border-white/5 px-2 py-0.5 rounded-full text-slate-400">
                      <Hash className="h-3 w-3" />
                      {selectedPage.slug}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full text-emerald-300">
                      v{selectedPage.version}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <UserIcon className="h-3 w-3" />
                      {selectedPage.authorId ?? "anonymous"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formatDate(selectedPage.updatedAt)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing((v) => !v)}
                  aria-pressed={isEditing}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </div>

              {!isEditing ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-black/30 border border-white/[0.06] p-4">
                    <MarkdownPreview content={selectedPage.content} />
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-200 list-none flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Show raw markdown
                    </summary>
                    <pre className="mt-2 rounded-xl bg-black/40 border border-white/[0.06] p-3 text-xs font-mono text-slate-300 whitespace-pre-wrap break-words max-h-64 overflow-auto">
                      {selectedPage.content}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="wiki-edit-title" className="text-xs font-semibold text-slate-300">
                      Title (3–100)
                    </label>
                    <Input
                      id="wiki-edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Page title"
                      maxLength={100}
                    />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="wiki-edit-content" className="text-xs font-semibold text-slate-300">
                        Content – markdown (10–5000)
                      </label>
                      <Textarea
                        id="wiki-edit-content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="# Heading&#10;Write markdown here... - list item&#10;> quote"
                        rows={12}
                        maxLength={5000}
                        className="font-mono text-xs"
                      />
                      <p className="text-[11px] font-mono text-slate-500 text-right">{editContent.trim().length}/5000</p>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-300">Live preview</span>
                      <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 min-h-[280px] max-h-[340px] overflow-auto">
                        <MarkdownPreview content={editContent} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={handleEdit} loading={isEditing} disabled={isEditing}>
                      <Save className="h-3.5 w-3.5" />
                      Save changes
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">PUT /api/communities/{communitySlug}/wiki/{selectedPage.slug} • version will auto-increment</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wiki-create-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="relative w-full max-w-xl max-h-[85vh] overflow-auto rounded-2xl bg-[#0e1b1b] border border-white/[0.08] p-0 shadow-2xl animate-slide-in">
            <div className="sticky top-0 bg-[#0e1b1b] border-b border-white/[0.06] p-5 pb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="wiki-create-title" className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  New Wiki Page
                </h2>
                <p className="text-xs text-slate-400 mt-1">POST /api/communities/{communitySlug}/wiki</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)} aria-label="Close dialog">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="wiki-create-slug" className="text-xs font-semibold text-slate-300">
                  Slug <span className="text-slate-500 font-normal">(a-z 0-9 hyphen, 3–50)</span>
                </label>
                <Input
                  id="wiki-create-slug"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value.toLowerCase())}
                  placeholder="e.g. onboarding-guide"
                  maxLength={50}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="wiki-create-title-input" className="text-xs font-semibold text-slate-300">
                  Title (3–100)
                </label>
                <Input
                  id="wiki-create-title-input"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Page title"
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="wiki-create-content" className="text-xs font-semibold text-slate-300">
                    Content – markdown (10–5000)
                  </label>
                  <Textarea
                    id="wiki-create-content"
                    value={createContent}
                    onChange={(e) => setCreateContent(e.target.value)}
                    placeholder="# Welcome&#10;Write markdown here. Use ## headings, - lists, > quotes, `code`."
                    rows={8}
                    maxLength={5000}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] font-mono text-slate-500 text-right">{createContent.trim().length}/5000</p>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Preview</p>
                  <MarkdownPreview content={createContent} />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="primary" size="md" onClick={handleCreate} loading={isCreating} disabled={isCreating} className="flex-1">
                  <Save className="h-4 w-4" />
                  Create page
                </Button>
                <Button variant="ghost" size="md" onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default WikiView;
