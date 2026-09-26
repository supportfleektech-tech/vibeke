import { users } from "@/db/schema";

/**
 * User columns that are safe to return to any caller.
 *
 * `passwordHash` must never leave the server under any circumstance, and `email` is
 * private profile data. Every route that returns a user row should project through
 * one of these maps instead of using `db.select().from(users)`, which is `SELECT *`.
 */
export const publicUserColumns = {
  id: users.id,
  name: users.name,
  handle: users.handle,
  avatar: users.avatar,
  cover: users.cover,
  bio: users.bio,
  role: users.role,
  location: users.location,
  trustScore: users.trustScore,
  verified: users.verified,
  verificationType: users.verificationType,
  followersCount: users.followersCount,
  followingCount: users.followingCount,
  marketplaceRating: users.marketplaceRating,
  skills: users.skills,
  achievements: users.achievements,
  preferences: users.preferences,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

/** Additional columns returned only to the authenticated owner of the row. */
export const privateUserColumns = {
  ...publicUserColumns,
  email: users.email,
} as const;

/** Row shape produced by `publicUserColumns` - i.e. a user minus every secret field. */
export type PublicUser = Omit<typeof users.$inferSelect, "passwordHash" | "email">;
