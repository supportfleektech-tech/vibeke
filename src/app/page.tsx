"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { UniversalSearchModal } from "@/components/layout/UniversalSearchModal";
import { ModuleCustomizerModal } from "@/components/dashboard/ModuleCustomizerModal";
import { DynamicHome } from "@/components/dashboard/DynamicHome";
import { LocalRadarMap } from "@/components/radar/LocalRadarMap";
import { CommunityView } from "@/components/communities/CommunityView";
import { MarketplaceView } from "@/components/marketplace/MarketplaceView";
import { BusinessView } from "@/components/business/BusinessView";
import { MessagingView } from "@/components/messaging/MessagingView";
import { JobsView } from "@/components/jobs/JobsView";
import { ProfileView } from "@/components/profile/ProfileView";
import { KinaraAICopilot } from "@/components/ai/KinaraAICopilot";
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

  // Data states
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [businesses, setBusinesses] = useState<BusinessStorefront[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [radar, setRadar] = useState<RadarPin[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [
          userRes,
          postsRes,
          commRes,
          marketRes,
          bizRes,
          msgRes,
          jobsRes,
          radarRes,
        ] = await Promise.all([
          fetch("/api/user").then((r) => r.json()),
          fetch("/api/posts").then((r) => r.json()),
          fetch("/api/communities").then((r) => r.json()),
          fetch("/api/marketplace").then((r) => r.json()),
          fetch("/api/businesses").then((r) => r.json()),
          fetch("/api/messages").then((r) => r.json()),
          fetch("/api/jobs").then((r) => r.json()),
          fetch("/api/radar").then((r) => r.json()),
        ]);

        if (userRes.user) setUser(userRes.user);
        if (postsRes.posts) setPosts(postsRes.posts);
        if (commRes.communities) setCommunities(commRes.communities);
        if (marketRes.items) setProducts(marketRes.items);
        if (bizRes.businesses) setBusinesses(bizRes.businesses);
        if (msgRes.messages) setMessages(msgRes.messages);
        if (jobsRes.jobs) setJobs(jobsRes.jobs);
        if (radarRes.radar) setRadar(radarRes.radar);
      } catch (err) {
        console.error("Failed to load initial platform data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

    // Adapt sections arrangement based on selected persona
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
  }

  function handleNavigate(view: string, extra?: any) {
    setCurrentView(view);
    if (extra?.communitySlug) {
      setActiveCommunitySlug(extra.communitySlug);
    }
    if (extra?.businessId) {
      setActiveBusinessId(extra.businessId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePostCreated(newPost: PostItem) {
    setPosts([newPost, ...posts]);
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
    } catch (err) {
      console.error("Failed to persist bio update:", err);
    }
  }

  if (loading) {
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
          unreadCount={2}
          activeVoiceCount={communities.filter((c) => c.activeVoice).length}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center / Primary Stage */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 min-w-0 max-w-5xl mx-auto">
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
