"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Camera,
  FlipHorizontal,
  Music,
  ImagePlus,
  Upload,
  CircleDot,
  StopCircle,
  Sparkles,
  Video,
  Clock3,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type FacingMode = "user" | "environment";
type FilterOption = "none" | "sepia" | "contrast" | "bw";
type DurationOption = 15 | 30 | 60;

interface SoundItem {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  audioUrl?: string;
  durationSec?: number;
  category?: string;
  usesCount?: number;
}

interface ChallengeItem {
  id: string;
  tag: string;
  title: string;
  banner?: string;
}

interface CameraStudioProps {
  onClose?: () => void;
  onUploaded?: (clip: unknown) => void;
  duetClipId?: string | number;
}

const FILTER_STYLES: Record<FilterOption, string> = {
  none: "none",
  sepia: "sepia(0.85) contrast(1.05)",
  contrast: "contrast(1.35) saturate(1.2)",
  bw: "grayscale(1) contrast(1.1)",
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CameraStudio({ onClose, onUploaded, duetClipId }: CameraStudioProps) {
  // Required states per spec
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [filter, setFilter] = useState<FilterOption>("none");

  // Extra UI state
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [selectedChallengeTag, setSelectedChallengeTag] = useState<string | null>(null);
  const [duration, setDuration] = useState<DurationOption>(15);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const duetUrl = duetClipId ? `https://cdn.kinara.ke/duet-${String(duetClipId)}.mp4` : null;

  // Fetch sounds (limited to 5 for header pill list)
  useEffect(() => {
    let cancelled = false;
    async function loadSounds() {
      try {
        const res = await fetch("/api/sounds?limit=5", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { sounds?: SoundItem[] };
        if (!cancelled) setSounds(Array.isArray(data.sounds) ? data.sounds.slice(0, 5) : []);
      } catch {
        if (!cancelled) setSounds([]);
      }
    }
    loadSounds();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch challenges for challenge tag
  useEffect(() => {
    let cancelled = false;
    async function loadChallenges() {
      try {
        const res = await fetch("/api/challenges?active=true", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { challenges?: ChallengeItem[] };
        if (!cancelled) setChallenges(Array.isArray(data.challenges) ? data.challenges : []);
      } catch {
        if (!cancelled) setChallenges([]);
      }
    }
    loadChallenges();
    return () => {
      cancelled = true;
    };
  }, []);

  // Attach preview stream to videoRef when not in previewUrl mode
  useEffect(() => {
    if (previewUrl) return;
    let stream: MediaStream | null = null;
    let alive = true;
    async function attachPreview() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.warn("Camera preview failed", err);
      }
    }
    attachPreview();
    return () => {
      alive = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (!isRecording) setMediaStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, previewUrl]);

  // Keep videoRef srcObject in sync when mediaStream changes
  useEffect(() => {
    if (previewUrl) return;
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, previewUrl]);

  // Cleanup previewUrl blob on unmount / change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    };
  }, [previewUrl, mediaStream]);

  // Keyboard: Space to toggle recording (a11y)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (isRecording) void stopRecording();
        else void startRecording();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, facingMode, duration]);

  // Timer for recordingTime (cap at duration and hard cap 60)
  useEffect(() => {
    if (!isRecording) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    const start = Date.now() - recordingTime * 1000;
    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      if (elapsed >= duration || elapsed >= 60) {
        setRecordingTime(Math.min(duration, 60));
        void stopRecording();
      } else {
        setRecordingTime(elapsed);
      }
    }, 250);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, duration]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      chunksRef.current = [];
      setChunks([]);
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          setChunks((prev) => [...prev, e.data]);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setIsRecording(false);
        setMediaRecorder(null);
        // stop live tracks but keep blob url for preview
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // keep recordingTime as final duration (at least 1)
        setRecordingTime((prev) => (prev === 0 ? 1 : prev));
        toast.success("Clip captured — ready to upload");
      };
      recorder.onerror = () => {
        toast.error("Recording failed");
        setIsRecording(false);
      };
      setMediaRecorder(recorder);
      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error("startRecording error", err);
      toast.error("Camera access denied or unavailable");
    }
  }, [facingMode, isRecording, previewUrl]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    } else {
      setIsRecording(false);
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      }
    }
  }, [mediaRecorder, mediaStream]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) void stopRecording();
    else void startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const handleFlip = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, []);

  const clearPreview = useCallback(() => {
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordingTime(0);
    setChunks([]);
    chunksRef.current = [];
  }, [previewUrl]);

  const handleGalleryPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    // estimate duration from file if possible; fallback to duration selection
    setRecordingTime((prev) => (prev > 0 ? prev : duration));
    toast.success("Gallery video loaded");
    // reset input
    e.target.value = "";
  }, [duration, previewUrl]);

  const handleUpload = useCallback(async () => {
    if (!previewUrl) {
      toast.error("Record or pick a video first");
      return;
    }
    if (isUploading) return;
    setIsUploading(true);
    try {
      let blob: Blob;
      let filename = `clip-${Date.now()}.webm`;
      let contentType = "video/webm";
      let size = 0;

      if (previewUrl.startsWith("blob:")) {
        const res = await fetch(previewUrl);
        blob = await res.blob();
        contentType = blob.type || "video/webm";
        size = blob.size;
        // infer extension
        if (contentType.includes("mp4")) filename = `clip-${Date.now()}.mp4`;
      } else {
        // remote url (duet/gallery remote) — synthesize blob info
        // fetch to get size if possible
        try {
          const r = await fetch(previewUrl);
          blob = await r.blob();
          contentType = blob.type || contentType;
          size = blob.size;
        } catch {
          size = 2_000_000;
          blob = new Blob([], { type: contentType });
        }
      }

      if (!size || size < 1) size = 1_000_000;

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType, size }),
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Upload failed");
      }
      const uploadData = (await uploadRes.json()) as { url: string; thumbnail?: string };
      const uploadUrl: string = uploadData.url;
      const thumbUrl: string = uploadData.thumbnail || uploadUrl;

      const clipPayload = {
        title: title.trim() || "Kinara Clip",
        description: description.trim() || "Captured on Kinara Camera Studio",
        videoUrl: uploadUrl,
        thumbnailUrl: thumbUrl,
        sound: selectedSound || "Original • Kinara",
        durationSec: Math.min(Math.max(recordingTime || duration, 1), 60),
        hashtags: selectedChallengeTag ? [selectedChallengeTag.replace(/^#/, "")] : [],
        city: "Nairobi",
      };

      const clipRes = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clipPayload),
      });
      if (!clipRes.ok) {
        const err = await clipRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Failed to publish clip");
      }
      const clipData = (await clipRes.json()) as { clip: unknown };
      toast.success("Clip published to Kinara");
      onUploaded?.(clipData.clip);
      onClose?.();
      // cleanup blob url after success
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  }, [previewUrl, isUploading, title, description, selectedSound, recordingTime, duration, selectedChallengeTag, onUploaded, onClose]);

  const filterLabel: Record<FilterOption, string> = {
    none: "None",
    sepia: "Sepia",
    contrast: "Contrast",
    bw: "B&W",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Camera Studio"
    >
      <div className="relative w-full max-w-[560px] max-h-[92vh] sm:max-h-[90vh] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0a1412] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label="Close Camera Studio"
              className="rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-slate-200 h-9 w-9 min-h-9 min-w-9"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-black/40 border border-white/[0.08] px-2.5 py-1">
              <Clock3 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              <span className="text-xs font-mono font-semibold text-white tabular-nums" aria-live="polite" aria-label={`Recording time ${formatTime(recordingTime)}`}>
                {formatTime(recordingTime)}
              </span>
              <span className="text-[10px] text-white/40">/ {formatTime(duration)}</span>
              {isRecording && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden />}
            </div>
            {/* mobile timer */}
            <span className="sm:hidden text-xs font-mono font-semibold text-white tabular-nums" aria-live="polite">
              {formatTime(recordingTime)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleFlip}
              aria-label={`Flip camera, currently ${facingMode === "user" ? "front" : "rear"} camera`}
              className="rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-slate-200 h-9 w-9 min-h-9 min-w-9"
            >
              <FlipHorizontal className="h-4 w-4" aria-hidden />
            </Button>

            <label htmlFor="filter-select" className="sr-only">
              Select filter
            </label>
            <div className="relative">
              <select
                id="filter-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterOption)}
                aria-label="Select video filter"
                className="appearance-none rounded-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-slate-200 text-xs font-medium pl-2.5 pr-7 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 h-9"
              >
                <option value="none" className="bg-zinc-900">
                  {filterLabel.none}
                </option>
                <option value="sepia" className="bg-zinc-900">
                  {filterLabel.sepia}
                </option>
                <option value="contrast" className="bg-zinc-900">
                  {filterLabel.contrast}
                </option>
                <option value="bw" className="bg-zinc-900">
                  {filterLabel.bw}
                </option>
              </select>
              <Sparkles className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-emerald-400" aria-hidden />
            </div>

            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
              <Camera className="h-3 w-3" aria-hidden /> STUDIO
            </span>
          </div>
        </header>

        {/* Sound picker + challenges */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-white/[0.06] bg-black/20 shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <Music className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden />
            <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase shrink-0">Sounds</span>
            <div
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 pb-0.5"
              role="listbox"
              aria-label="Select sound"
            >
              {sounds.length === 0 ? (
                <span className="text-xs text-white/40">No sounds — using Original</span>
              ) : (
                sounds.map((s) => (
                  <button
                    key={s.id}
                    role="option"
                    aria-selected={selectedSound === s.title || selectedSound === `${s.title} • ${s.artist}`}
                    onClick={() => setSelectedSound(`${s.title} • ${s.artist}`)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      selectedSound === s.title || selectedSound === `${s.title} • ${s.artist}`
                        ? "bg-emerald-500 text-black border-emerald-400"
                        : "bg-white/[0.06] text-slate-200 border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.14]"
                    }`}
                  >
                    <span className="max-w-[110px] truncate">{s.title}</span>
                    <span className="hidden sm:inline text-[10px] opacity-60 truncate">• {s.artist}</span>
                  </button>
                ))
              )}
              <button
                role="option"
                aria-selected={selectedSound === null || selectedSound === "Original • Kinara"}
                onClick={() => setSelectedSound(null)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  !selectedSound ? "bg-white text-black border-white" : "bg-white/[0.06] text-slate-300 border-white/[0.08] hover:bg-white/[0.10]"
                }`}
              >
                Original
              </button>
            </div>
          </div>
          {challenges.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase shrink-0">Challenge</span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
                <button
                  onClick={() => setSelectedChallengeTag(null)}
                  aria-label="No challenge tag"
                  aria-pressed={selectedChallengeTag === null}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${!selectedChallengeTag ? "bg-emerald-500 text-black border-emerald-400" : "bg-white/[0.06] text-slate-300 border-white/[0.08]"}`}
                >
                  None
                </button>
                {challenges.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChallengeTag(c.tag)}
                    aria-label={`Use challenge tag ${c.tag}`}
                    aria-pressed={selectedChallengeTag === c.tag}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${selectedChallengeTag === c.tag ? "bg-amber-400 text-black border-amber-300" : "bg-white/[0.06] text-amber-200 border-amber-500/30 hover:bg-amber-500/15"}`}
                  >
                    #{c.tag.replace(/^#/, "")}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedSound && (
            <p className="text-[11px] text-emerald-300/80 font-medium truncate" aria-live="polite">
              ♪ {selectedSound} {selectedChallengeTag ? `· #${selectedChallengeTag.replace(/^#/, "")}` : ""}
            </p>
          )}
        </div>

        {/* Main preview */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gradient-to-b from-[#0a1412] to-black">
          {/* Duet side-by-side */}
          {duetClipId ? (
            <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
              <div className="relative aspect-[9/12] bg-zinc-900 overflow-hidden">
                <video
                  src={duetUrl || undefined}
                  poster={duetUrl || undefined}
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                  aria-label="Duet original clip"
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white border border-white/10">ORIGINAL</span>
              </div>
              <div className="relative aspect-[9/12] bg-black overflow-hidden">
                {previewUrl ? (
                  <video
                    ref={previewVideoRef}
                    src={previewUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ filter: FILTER_STYLES[filter] }}
                    aria-label="Preview of your recording, duet side"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover bg-black"
                    style={{ filter: FILTER_STYLES[filter] }}
                    aria-label="Camera preview, duet side"
                  />
                )}
                <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-black">YOU</span>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
              <video
                ref={previewVideoRef}
                src={previewUrl}
                controls
                playsInline
                className="w-full h-[60vh] max-h-[420px] object-cover rounded-2xl bg-black"
                style={{ filter: FILTER_STYLES[filter] }}
                aria-label="Preview of recorded clip"
              />
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-black">
                  <Video className="h-3 w-3" aria-hidden /> {formatTime(recordingTime)} PREVIEW
                </span>
                {chunks.length > 0 && (
                  <span className="hidden sm:inline-flex rounded-full bg-black/60 backdrop-blur border border-white/10 px-2 py-1 text-[11px] font-mono text-white">{chunks.length} chunks</span>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={clearPreview}
                aria-label="Discard preview and re-record"
                className="absolute right-3 top-3 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-white backdrop-blur"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-[60vh] max-h-[420px] object-cover rounded-2xl bg-black"
                style={{ filter: FILTER_STYLES[filter] }}
                aria-label="Live camera preview"
              />
              {/* recording dot */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-lg"
                    aria-live="polite"
                    aria-label="Recording in progress"
                  >
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden />
                    REC {formatTime(recordingTime)}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="rounded-full bg-black/55 backdrop-blur border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                  {filter === "none" ? "No filter" : filterLabel[filter]} · {facingMode === "user" ? "Front" : "Rear"}
                </span>
                <span className="rounded-full bg-black/55 backdrop-blur border border-white/10 px-2 py-1 text-[11px] font-mono text-white/70">{duration}s max</span>
              </div>
            </div>
          )}

          {/* Title/description minimal for upload payload */}
          <div className="grid grid-cols-1 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] font-bold tracking-widest text-white/50 uppercase">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add a catchy title…"
                maxLength={100}
                aria-label="Clip title"
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold tracking-widest text-white/50 uppercase">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your moment…"
                maxLength={500}
                aria-label="Clip description"
                className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              />
            </label>
          </div>
        </div>

        {/* Controls */}
        <div className="shrink-0 border-t border-white/[0.06] bg-black/30 backdrop-blur p-3 sm:p-4 space-y-3">
          {/* Duration selector */}
          <div className="flex items-center justify-center gap-2" role="group" aria-label="Select recording duration">
            <span className="text-[11px] font-bold tracking-widest text-white/40 uppercase mr-1">Duration</span>
            {([15, 30, 60] as DurationOption[]).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                disabled={isRecording}
                aria-label={`Set duration to ${d} seconds`}
                aria-pressed={duration === d}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 ${
                  duration === d ? "bg-emerald-500 text-black border-emerald-400" : "bg-white/[0.06] text-slate-200 border-white/[0.08] hover:bg-white/[0.10]"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>

          {/* Main control row */}
          <div className="flex items-center justify-between gap-2">
            {/* Gallery pick */}
            <div className="flex flex-col items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleGalleryPick}
                aria-label="Pick video from gallery"
                tabIndex={-1}
              />
              <Button
                size="icon"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Pick video from gallery"
                className="rounded-2xl h-12 w-12 bg-white/[0.06] hover:bg-white/[0.10] border-white/[0.08] text-white"
              >
                <ImagePlus className="h-5 w-5" aria-hidden />
              </Button>
              <span className="text-[10px] font-medium text-white/50">Gallery</span>
            </div>

            {/* Record button — circular red, pulse when recording, Space to toggle */}
            <div className="flex flex-col items-center gap-1">
              <motion.button
                onClick={handleToggleRecording}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.code === "Space" || e.key === " ") {
                    e.preventDefault();
                    handleToggleRecording();
                  }
                }}
                aria-label={isRecording ? `Stop recording, ${formatTime(recordingTime)} elapsed` : "Start recording, press Space to toggle"}
                aria-pressed={isRecording}
                className={`relative h-[72px] w-[72px] rounded-full flex items-center justify-center border-[3px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1412] ${
                  isRecording
                    ? "bg-red-600 border-red-400 shadow-[0_0_24px_rgba(239,68,68,0.55)]"
                    : "bg-red-600 border-white/15 hover:border-white/25 hover:bg-red-500 shadow-[0_8px_24px_rgba(239,68,68,0.35)]"
                }`}
                animate={isRecording ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={isRecording ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                whileTap={{ scale: 0.96 }}
              >
                {isRecording ? (
                  <StopCircle className="h-8 w-8 text-white fill-white/20" aria-hidden />
                ) : (
                  <CircleDot className="h-8 w-8 text-white" aria-hidden />
                )}
                {isRecording && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full border border-red-400/50"
                    animate={{ scale: [1, 1.22], opacity: [0.7, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </motion.button>
              <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">{isRecording ? "Recording" : "Hold · Tap"}</span>
            </div>

            {/* Upload */}
            <div className="flex flex-col items-center gap-1">
              <Button
                size="icon"
                onClick={handleUpload}
                disabled={!previewUrl || isUploading}
                aria-label={isUploading ? "Uploading clip" : "Upload clip"}
                loading={isUploading}
                className="rounded-2xl h-12 w-12 bg-emerald-600 hover:bg-emerald-500 text-black border-emerald-500/30 disabled:opacity-40"
              >
                {!isUploading && <Upload className="h-5 w-5" aria-hidden />}
              </Button>
              <span className="text-[10px] font-medium text-white/50">Upload</span>
            </div>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-white/35 px-2">
            Premium dark studio · Space to record · Flip camera · Filters · Sounds from /api/sounds · Challenges tagged automatically
          </p>
        </div>
      </div>
    </div>
  );
}

export type { CameraStudioProps };
