// Auth.js v5 - Credentials + JWT - zero budget, no external service
// For sovereign demo, we use a single verified user (usr_brian_mwangi) as mock session.
// In production, replace with real DB lookup + bcrypt.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email().optional(),
  handle: z.string().optional(),
  password: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-kinara-32-chars-minimum-for-testing",
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Kinara Sovereign",
      credentials: {
        handle: { label: "Handle", type: "text", placeholder: "brianmwangi" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Demo: accept any handle, return sovereign user
        // Replace with db lookup + bcrypt compare in prod
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const handle = (credentials as any)?.handle || "brianmwangi";
        // Hardcoded sovereign identity
        return {
          id: "usr_brian_mwangi",
          name: "Brian Mwangi",
          email: "brian@kinara.ke",
          handle,
          image: "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
          trustScore: 98,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.handle = (user as any).handle;
        token.trustScore = (user as any).trustScore;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).userId = token.id as string;
        (session as any).handle = token.handle as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/api/auth/signin",
  },
});
