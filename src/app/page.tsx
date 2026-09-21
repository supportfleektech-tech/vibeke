"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { UniversalSearchModal } from "@/components/layout/UniversalSearchModal";
import { ModuleCustomizerModal } from "@/components/dashboard/ModuleCustomizerModal";
import { CommunityView } from "@/components/communities/CommunityView";
import { MarketplaceView } from "@/components/marketplace/MarketplaceView";
import { BusinessView } from "@/components/business/BusinessView";
import { JobsView } from "@/components/jobs/JobsView";
import { ProfileView } from "@/components/profile/ProfileView";
import { fetcher } from "@/lib/fetcher";
import {
  UserProfile,
  PostItem,
  CommunityItem,
  MarketplaceProduct,
  BusinessStorefront,
  MessageItem,
  JobListing,
  RadarPin,
  PersonaRole,
  DashboardSectionConfig
} from "@/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function SkeletonCard() {
  return (
    <div className="kinara-card rounded-2xl p-6 space-y-3 animate-pulse border border-white/5">
      <div className="h-4 bg-white/10 rounded w-1/3" />
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-5/6" />
      <div className="h-32 bg-white/5 rounded-xl" />
    </div>
  );
}

// Dynamic imports for heavy views
const DynamicHome = dynamic(() => import("@/components/dashboard/DynamicHome").then(m => m.DynamicHome), {
  loading: () => <SkeletonCard />,
});
const LocalRadarMap = dynamic(() => import("@/components/radar/LocalRadarMap").then(m => m.LocalRadarMap), {
  loading: () => <SkeletonCard />,
  ssr: false,
});
const MessagingView = dynamic(() => import("@/components/messaging/MessagingView").then(m => m.MessagingView), {
  loading: () => <SkeletonCard />,
});
const KinaraAICopilot = dynamic(() => import("@/components/ai/KinaraAICopilot").then(m => m.KinaraAICopilot), {
  loading: () => <SkeletonCard />,
  ssr: false,
});

const DEFAULT_SECTIONS: DashboardSectionConfig[] = [
  { id: "greeting", label: "Personalized Greeting & Status", icon: "👋", visible: true },
  { id: "trending", label: "Trending Pulses & Dispatches", icon: "🔥", visible: true },
  { id: "radar", label: "Local Radar & Proximity Map", icon: "📍", visible: true },
  { id: "communities", label: "Communities & Live Audio", icon: "👥", visible: true },
  { id: "jobs", label: "Opportunities & Careers", icon: "💼", visible: true },
  { id: "marketplace", label: "Curated Escrow Marketplace", icon: "🛒", visible: true },
  { id: "cinema", label: "KINARA Cinema & Spotlights", icon: "🎬", visible: true },
  { id: "messages", label: "Direct Dispatches Preview", icon: "💬", visible: true },
];

const STORAGE_KEYS = {
  sectionsConfig: "kinara:sectionsConfig",
  currentPersona: "kinara:currentPersona",
  selectedCity: "kinara:selectedCity",
  lowBandwidth: "kinara:lowBandwidth",
} as const;

const swrConfig = { revalidateOnFocus: false, dedupingInterval: 60000 };

export default function KinaraApp() {
  // Navigation & View state
  const [currentView, setCurrentView] = useState("home");
  const [currentPersona, setCurrentPersona] = useState<PersonaRole>("citizen");
  const [selectedCity, setSelectedCity] = useState("Nairobi");
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // View parameters for deep linking
  const [activeCommunitySlug, setActiveCommunitySlug] = useState<string | undefined>(undefined);
  const [activeBusinessId, setActiveBusinessId] = useState<string | undefined>(undefined);

  // Section configs for the modular dynamic home
  const [sectionsConfig, setSectionsConfig] = useState<DashboardSectionConfig[]>(DEFAULT_SECTIONS);
  const [hasHydrated, setHasHydrated] = useState(false);

  // SWR data fetching for 8 endpoints with caching
  const { data: userData, isLoading: userLoading } = useSWR<{ user: UserProfile }>("/api/user", fetcher, swrConfig);
  const { data: postsData, isLoading: postsLoading } = useSWR<{ posts: PostItem[]; nextCursor?: string | null }>("/api/posts?limit=20", fetcher, swrConfig);
  const { data: communitiesData, isLoading: commLoading } = useSWR<{ communities: CommunityItem[] }>("/api/communities", fetcher, swrConfig);
  const { data: marketplaceData, isLoading: marketLoading } = useSWR<{ items: MarketplaceProduct[]; data?: MarketplaceProduct[]; nextCursor?: string | null }>("/api/marketplace?limit=20", fetcher, swrConfig);
  const { data: businessesData, isLoading: bizLoading } = useSWR<{ businesses: BusinessStorefront[] }>("/api/businesses", fetcher, swrConfig);
  const { data: messagesData, isLoading: msgLoading } = useSWR<{ messages: MessageItem[] }>("/api/messages", fetcher, swrConfig);
  const { data: jobsData, isLoading: jobsLoading } = useSWR<{ jobs: JobListing[] }>("/api/jobs", fetcher, swrConfig);
  const { data: radarData, isLoading: radarLoading } = useSWR<{ radar: RadarPin[] }>("/api/radar", fetcher, swrConfig);

  const isInitialLoading = userLoading || postsLoading || commLoading || marketLoading || bizLoading || msgLoading || jobsLoading || radarLoading;

  // Local optimistic states synced from SWR
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [businesses, setBusinesses] = useState<BusinessStorefront[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [radar, setRadar] = useState<RadarPin[]>([]);
  const [postsNextCursor, setPostsNextCursor] = useState<string | null>(null);
  const [marketNextCursor, setMarketNextCursor] = useState<string | null>(null);

  // Sync SWR data to local state with nextCursor support
  useEffect(() => {
    if (userData?.user) setUser(userData.user);
  }, [userData]);
  useEffect(() => {
    if (postsData?.posts) {
      setPosts(postsData.posts);
      if ((postsData as any).nextCursor) setPostsNextCursor((postsData as any).nextCursor);
    }
  }, [postsData]);
  useEffect(() => {
    if (communitiesData?.communities) setCommunities(communitiesData.communities);
  }, [communitiesData]);
  useEffect(() => {
    if (marketplaceData) {
      const items = (marketplaceData as any).items ?? (marketplaceData as any).data ?? [];
      if (Array.isArray(items)) setProducts(items);
      if ((marketplaceData as any).nextCursor) setMarketNextCursor((marketplaceData as any).nextCursor);
    }
  }, [marketplaceData]);
  useEffect(() => {
    if (businessesData?.businesses) setBusinesses(businessesData.businesses);
  }, [businessesData]);
  useEffect(() => {
    if (messagesData?.messages) setMessages(messagesData.messages);
  }, [messagesData]);
  useEffect(() => {
    if (jobsData?.jobs) setJobs(jobsData.jobs);
  }, [jobsData]);
  useEffect(() => {
    if (radarData?.radar) setRadar(radarData.radar);
  }, [radarData]);

  // Derived unreadCount from messages (not hardcoded)
  const unreadCount = useMemo(() => messages.filter((m) => !m.isMe).length, [messages]);

  // Aria live toast state for screen readers
  const [liveToast, setLiveToast] = useState<string>("");

  function announceToast(message: string) {
    setLiveToast(message);
    window.setTimeout(() => setLiveToast(""), 1000);
  }

  function notifySuccess(msg: string) {
    toast.success(msg);
    announceToast(msg);
  }
  function notifyError(msg: string) {
    toast.error(msg);
    announceToast(msg);
  }

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    try {
      const savedSections = localStorage.getItem(STORAGE_KEYS.sectionsConfig);
      if (savedSections) {
        const parsed = JSON.parse(savedSections) as DashboardSectionConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) setSectionsConfig(parsed);
      }
      const savedPersona = localStorage.getItem(STORAGE_KEYS.currentPersona) as PersonaRole | null;
      if (savedPersona && ["citizen", "creator", "business", "student", "buyer"].includes(savedPersona)) {
        setCurrentPersona(savedPersona);
      }
      const savedCity = localStorage.getItem(STORAGE_KEYS.selectedCity);
      if (savedCity) setSelectedCity(savedCity);
      const savedLow = localStorage.getItem(STORAGE_KEYS.lowBandwidth);
      if (savedLow !== null) {
        setLowBandwidth(JSON.parse(savedLow));
      } else {
        const conn = (navigator as any)?.connection;
        const effectiveType: string | undefined = conn?.effectiveType;
        const saveData: boolean | undefined = conn?.saveData;
        if (effectiveType === "2g" || effectiveType === "slow-2g" || saveData === true) {
          setLowBandwidth(true);
        }
      }
    } catch (e) {
      console.warn("Failed to load persisted prefs:", e);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  // Persistence: Save to localStorage when values change (after hydration)
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.sectionsConfig, JSON.stringify(sectionsConfig));
    } catch {}
  }, [sectionsConfig, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.currentPersona, currentPersona);
    } catch {}
  }, [currentPersona, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.selectedCity, selectedCity);
    } catch {}
  }, [selectedCity, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.lowBandwidth, JSON.stringify(lowBandwidth));
    } catch {}
  }, [lowBandwidth, hasHydrated]);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Adaptive persona layout switching
  function handleSelectPersona(newRole: PersonaRole) {
    setCurrentPersona(newRole);

    if (newRole === "creator") {
      setSectionsConfig([
        { id: "greeting", label: "Personalized Greeting & Status", icon: "👋", visible: true },
        { id: "cinema", label: "KINARA Cinema & Creative Spotlights", icon: "🎬", visible: true },
        { id: "communities", label: "Communities & Live Audio Lounges", icon: "👥", visible: true },
        { id: "trending", label: "Trending Pulses & Dispatches", icon: "🔥", visible: true },
        { id: "messages", label: "Direct Dispatches Preview", icon: "💬", visible: true },
        { id: "marketplace", label: "Curated Escrow Marketplace", icon: "🛒", visible: false },
        { id: "radar", label: "Local Radar & Proximity Map", icon: "📍", visible: true },
        { id: "jobs", label: "Opportunities & Careers", icon: "💼", visible: false },
      ]);
    } else if (newRole === "business") {
      setSectionsConfig([
        { id: "greeting", label: "Personalized Greeting & Status", icon: "👋", visible: true },
        { id: "marketplace", label: "Curated Escrow Marketplace", icon: "🛒", visible: true },
        { id: "messages", label: "Direct Dispatches & Orders", icon: "💬", visible: true },
        { id: "radar", label: "Local Radar & Commercial Nodes", icon: "📍", visible: true },
        { id: "trending", label: "Trending Pulses & Dispatches", icon: "🔥", visible: true },
        { id: "communities", label: "Communities & Live Audio", icon: "👥", visible: true },
        { id: "jobs", label: "Opportunities & Careers", icon: "💼", visible: true },
        { id: "cinema", label: "KINARA Cinema & Spotlights", icon: "🎬", visible: false },
      ]);
    } else if (newRole === "student") {
      setSectionsConfig([
        { id: "greeting", label: "Personalized Greeting & Status", icon: "👋", visible: true },
        { id: "communities", label: "Study Pods & Communities", icon: "👥", visible: true },
        { id: "jobs", label: "Fellowships & Hackathons", icon: "💼", visible: true },
        { id: "trending", label: "Trending Pulses & Dispatches", icon: "🔥", visible: true },
        { id: "radar", label: "Local Radar & Study Spaces", icon: "📍", visible: true },
        { id: "cinema", label: "KINARA Cinema & Tech Spotlights", icon: "🎬", visible: true },
        { id: "marketplace", label: "Curated Escrow Marketplace", icon: "🛒", visible: false },
        { id: "messages", label: "Direct Dispatches Preview", icon: "💬", visible: true },
      ]);
    } else if (newRole === "buyer") {
      setSectionsConfig([
        { id: "greeting", label: "Personalized Greeting & Status", icon: "👋", visible: true },
        { id: "marketplace", label: "Curated Escrow Marketplace", icon: "🛒", visible: true },
        { id: "radar", label: "Nearby Drops & Artisan Studios", icon: "📍", visible: true },
        { id: "trending", label: "Trending Pulses & Dispatches", icon: "🔥", visible: true },
        { id: "messages", label: "Direct Dispatches Preview", icon: "💬", visible: true },
        { id: "communities", label: "Communities & Live Audio", icon: "👥", visible: true },
        { id: "cinema", label: "KINARA Cinema & Spotlights", icon: "🎬", visible: false },
        { id: "jobs", label: "Opportunities & Careers", icon: "💼", visible: false },
      ]);
    } else {
      setSectionsConfig(DEFAULT_SECTIONS);
    }
    notifySuccess(`Switched to ${newRole} persona`);
  }

  function handleNavigate(view: string, extra?: any) {
    setCurrentView(view);
    if (extra?.communitySlug) {
      setActiveCommunitySlug(extra.communitySlug);
    }
    if (extra?.businessId) {
      setActiveBusinessId(extra.businessId);
    }
    const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  }

  function handlePostCreated(newPost: PostItem) {
    setPosts([newPost, ...posts]);
    notifySuccess("Pulse dispatched to Sovereign Feed");
  }

  async function handleUpdateBio(newBio: string) {
    if (!user) return;
    setUser({ ...user, bio: newBio });
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: newBio }),
      });
      notifySuccess("Profile bio updated");
    } catch (err) {
      console.error("Failed to persist bio update:", err);
      notifyError("Failed to update bio");
    }
  }

  if (isInitialLoading && !hasHydrated) {
    // Keep existing pulse if no data yet and hydration pending; SWR will hydrate fast but preserve UX
  }
  if (isInitialLoading && posts.length === 0 && communities.length === 0 && !user) {
    return (
      <div className="min-h-screen bg-[#060b0b] flex flex-col items-center justify-center space-y-4">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-700 to-amber-600 p-[2px] shadow-2xl animate-pulse">
          <div className="w-full h-full bg-[#060d0d] rounded-[14px] flex items-center justify-center">
            <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 to-amber-300">
              K
            </span>
          </div>
        </div>
        <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Synchronizing Sovereign Core...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${lowBandwidth ? "low-bandwidth-mode" : ""}`}>
      {/* Aria-live region for toasts / screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveToast}
      </div>
      {postsNextCursor && <span data-testid="posts-next-cursor" className="hidden">{postsNextCursor}</span>}
      {marketNextCursor && <span data-testid="market-next-cursor" className="hidden">{marketNextCursor}</span>}
      {/* Top Header */}
      <Header
        currentPersona={currentPersona}
        onSelectPersona={handleSelectPersona}
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        lowBandwidth={lowBandwidth}
        onToggleLowBandwidth={() => setLowBandwidth(!lowBandwidth)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
        onNavigate={handleNavigate}
        user={user}
        onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          currentPersona={currentPersona}
          unreadCount={unreadCount}
          activeVoiceCount={communities.filter((c) => c.activeVoice).length}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center / Primary Stage */}
        <main id="main-content" className="flex-1 p-3 sm:p-6 md:p-8 min-w-0 max-w-5xl mx-auto">
          {currentView === "home" && (
            <DynamicHome
              user={user}
              posts={posts}
              communities={communities}
              products={products}
              jobs={jobs}
              radar={radar}
              messages={messages}
              sectionsConfig={sectionsConfig}
              currentPersona={currentPersona}
              selectedCity={selectedCity}
              onNavigate={handleNavigate}
              onPostCreated={handlePostCreated}
              onOpenCustomizer={() => setIsCustomizerOpen(true)}
            />
          )}

          {currentView === "radar" && (
            <div className="space-y-6">
              <LocalRadarMap
                pins={radar}
                selectedCity={selectedCity}
                onNavigate={handleNavigate}
              />
            </div>
          )}

          {currentView === "communities" && (
            <CommunityView
              communities={communities}
              posts={posts}
              user={user}
              onPostCreated={handlePostCreated}
              initialSlug={activeCommunitySlug}
            />
          )}

          {currentView === "marketplace" && (
            <MarketplaceView
              products={products}
              user={user}
              onNavigateMessage={() => setCurrentView("messaging")}
              selectedCity={selectedCity}
            />
          )}

          {currentView === "business" && (
            <BusinessView
              businesses={businesses}
              selectedCity={selectedCity}
              onNavigateMessage={() => setCurrentView("messaging")}
              initialBusinessId={activeBusinessId}
            />
          )}

          {currentView === "messaging" && (
            <MessagingView initialMessages={messages} user={user} />
          )}

          {currentView === "jobs" && (
            <JobsView jobs={jobs} selectedCity={selectedCity} />
          )}

          {currentView === "profile" && (
            <ProfileView
              user={user}
              posts={posts}
              onUpdateBio={handleUpdateBio}
            />
          )}

          {currentView === "ai" && (
            <KinaraAICopilot user={user} selectedCity={selectedCity} />
          )}
        </main>
      </div>

      {/* Universal Search Modal (Cmd+K) */}
      <UniversalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
        communities={communities}
        products={products}
        businesses={businesses}
        jobs={jobs}
        radar={radar}
      />

      {/* Modular Dashboard Customizer Modal */}
      <ModuleCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        sections={sectionsConfig}
        onUpdateSections={setSectionsConfig}
        onResetDefault={() => setSectionsConfig(DEFAULT_SECTIONS)}
      />
    </div>
  );
}
