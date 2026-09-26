"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Credentials sign-in.
 *
 * `src/lib/auth.ts` fails closed: an unknown handle, an account with no password
 * hash, or a wrong password all produce the same "Invalid handle or password"
 * message so the form cannot be used to enumerate accounts.
 */
export default function SignInPage() {
  const router = useRouter();
  const [handle, setHandle] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!handle.trim() || !password) {
      setError("Enter your handle and password.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        handle: handle.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid handle or password.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the sign-in service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md kinara-card rounded-3xl border border-emerald-500/20 bg-[#0a1514] p-6 sm:p-8 space-y-6">
        <header className="space-y-2 text-center">
          <p className="font-mono text-xs font-bold tracking-widest text-emerald-400">
            KINARA • SOVEREIGN SIGN-IN
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Welcome back</h1>
          <p className="text-sm text-slate-400">
            Sign in to post, message, book and trade on Kinara.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="handle" className="block text-xs font-medium text-slate-300">
              Handle
            </label>
            <Input
              id="handle"
              name="handle"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={64}
              placeholder="brianmwangi"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-slate-300">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              error={error ?? undefined}
            />
          </div>

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            {submitting ? "Verifying…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Local demo accounts are created by the seeder. Set{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-emerald-300">SEED_PASSWORD</code>{" "}
          before running <code className="rounded bg-black/40 px-1 py-0.5 text-emerald-300">pnpm db:migrate</code>{" "}
          to give them a credential.
        </p>
      </section>
    </main>
  );
}
