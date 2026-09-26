import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { runLoginAttempt } from "@/lib/login-throttle";
import { getClientIp } from "@/lib/ratelimit";

// Auth.js v5 - Credentials + JWT.
//
// This module fails closed:
//   * the JWT signing secret is NEVER a publicly-known placeholder
//   * login requires BOTH a known handle and a matching bcrypt hash
//   * there is no "demo"/"admin" account that skips password verification
//   * a user row without passwordHash cannot be logged into at all

const credentialsSchema = z.object({
  handle: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});

/**
 * Values that ship in `.env.example` / `docker-compose.yml` / older docs. They are
 * public by definition, so they can never be used to sign sessions - otherwise
 * anyone who has read the repo could forge a session token for any user.
 */
const KNOWN_INSECURE_SECRETS = new Set([
  "change-me-in-production-generate-32chars-min",
  "dev-secret-kinara-32-chars-minimum-for-testing",
]);

function resolveAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  const usable = !!secret && secret.length >= 32 && !KNOWN_INSECURE_SECRETS.has(secret);

  if (usable) return secret as string;

  // `next build` imports this module too. Fail the *server* on a weak secret, but do
  // not turn a configuration problem into an unbuildable image - the runtime check
  // below still fires the moment the production server boots.
  const building = (process.env.NEXT_PHASE ?? "").includes("phase-production-build");

  if (process.env.NODE_ENV === "production" && !building) {
    // Loud, early, and unrecoverable: a weak secret means forgeable sessions.
    throw new Error(
      "NEXTAUTH_SECRET must be set to a unique random value of at least 32 characters in production. " +
        "Generate one with: openssl rand -base64 48"
    );
  }

  // Development/test/build only: derive a per-process key so sessions are still signed
  // with something unpredictable (dev sessions simply reset when the server restarts).
  return randomBytes(32).toString("hex");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: resolveAuthSecret(),
  session: { strategy: "jwt" },
  // Auth.js requires trustHost:true to function at all - `assertConfig()` in
  // @auth/core rejects every request when it is false, with no host comparison
  // happening anywhere. It is a hard prerequisite, not a hardening knob.
  //
  // Correctness therefore rests on the deployment platform setting `Host` safely
  // (Vercel, and any reverse proxy that overwrites the header, do). If you terminate
  // TLS directly on Node without a proxy, do not expose the port publicly.
  trustHost: true,
  providers: [
    Credentials({
      name: "Kinara Sovereign",
      credentials: {
        handle: { label: "Handle", type: "text", placeholder: "brianmwangi" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { handle, password } = parsed.data;
        // Same trusted-last-hop derivation the rest of the API uses.
        const ip = getClientIp(request);

        // `/api/auth/*` is the raw NextAuth handler, so none of the per-route
        // rateLimit() calls cover sign-in - this is the only thing that does.
        return runLoginAttempt(handle, ip, async () => {
          const found = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              handle: users.handle,
              avatar: users.avatar,
              trustScore: users.trustScore,
              passwordHash: users.passwordHash,
            })
            .from(users)
            .where(eq(users.handle, handle))
            .limit(1);

          const user = found[0];
          // No such handle, or the account has never been given a credential: deny.
          // runLoginAttempt() still counts this as a failure, so a missing handle and
          // a wrong password are indistinguishable from the outside.
          if (!user || !user.passwordHash) return null;

          const match = await bcrypt.compare(password, user.passwordHash);
          if (!match) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            handle: user.handle,
            image: user.avatar,
            trustScore: user.trustScore,
          };
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.handle = (user as { handle?: string }).handle;
        token.trustScore = (user as { trustScore?: number }).trustScore;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        const s = session as unknown as Record<string, unknown>;
        s.userId = token.id;
        s.handle = token.handle;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
