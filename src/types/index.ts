export type PersonaRole = "citizen" | "creator" | "business" | "student" | "buyer";

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  cover: string;
  bio: string;
  role: PersonaRole;
  location: string;
  trustScore: number;
  verified: boolean;
  verificationType: string;
  followersCount: number;
  followingCount: number;
  marketplaceRating: string;
  skills: string; // JSON string or parsed array
  achievements: string; // JSON string or parsed array
}

export interface PostItem {
  id: number;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorTrust: number;
  authorVerified: boolean;
  content: string;
  category: string;
  city: string;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  mediaUrl?: string | null;
  mediaType: string;
  tags: string;
  pinned: boolean;
  createdAt: string;
}

export interface CommunityItem {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  avatar: string;
  banner: string;
  category: string;
  membersCount: number;
  activeVoice: boolean;
  voiceSpeakersCount: number;
  voiceRoomTopic?: string | null;
  city: string;
  rules: string;
}

export interface MarketplaceProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image: string;
  sellerName: string;
  sellerAvatar: string;
  sellerTrustScore: number;
  sellerVerified: boolean;
  city: string;
  neighborhood: string;
  distanceKm: string;
  deliverySpeed: string;
  aiPriceEstimate: string;
  escrowSecured: boolean;
  featured: boolean;
  rating: string;
  reviewsCount: number;
}

export interface BusinessStorefront {
  id: string;
  name: string;
  category: string;
  banner: string;
  avatar: string;
  headline: string;
  bio: string;
  city: string;
  neighborhood: string;
  rating: string;
  reviewsCount: number;
  verified: boolean;
  openHours: string;
  services: string; // JSON
  catalogCount: number;
  monthlyTransactions: number;
  phone: string;
  website: string;
}

export interface MessageItem {
  id: number;
  threadId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  type: string; // text | voice | offer | poll
  metadata?: string | null;
}

export interface JobListing {
  id: number;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  type: string;
  salary: string;
  category: string;
  tags: string;
  postedAt: string;
}

export interface RadarPin {
  id: number;
  type: "friend" | "business" | "event" | "deal" | "listing" | "service";
  name: string;
  avatar: string;
  city: string;
  neighborhood: string;
  lat: string;
  lng: string;
  distance: string;
  details: string;
  status: string;
}

export type DashboardSectionKey =
  | "greeting"
  | "trending"
  | "radar"
  | "communities"
  | "jobs"
  | "marketplace"
  | "cinema"
  | "messages"
  | "clips"
  | "stories"
  | "live"
  | "explore";

export interface DashboardSectionConfig {
  id: DashboardSectionKey;
  label: string;
  icon: string;
  visible: boolean;
}

export interface ClipItem {
  id: number;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorVerified: boolean;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  sound: string;
  soundTitle: string;
  durationSec: number;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount: number;
  views: number;
  hashtags: string[] | string;
  city: string;
  featured: boolean;
  createdAt: string;
}

export interface StoryItem {
  id: number;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption: string;
  expiresAt: string;
  viewedBy: string[] | string;
  createdAt: string;
}

export interface LiveItem {
  id: string;
  hostId: string;
  hostName: string;
  hostHandle: string;
  hostAvatar: string;
  title: string;
  category: string;
  description: string;
  thumbnail: string;
  status: "live" | "ended";
  viewersCount: number;
  likes: number;
  startedAt: string;
  endedAt?: string | null;
}

export interface HashtagItem {
  tag: string;
  count: number;
  trendingScore: number;
  category: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: number;
  userId: string;
  actorId?: string | null;
  actorName: string;
  actorAvatar: string;
  type: string;
  entityType: string;
  entityId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface BookmarkItem {
  id: number;
  userId: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  banner: string;
  location: string;
  city: string;
  category: string;
  startAt: string;
  endAt: string;
  organizerId?: string | null;
  attendeesCount: number;
  maxAttendees: number;
  price: number;
  createdAt: string;
}
