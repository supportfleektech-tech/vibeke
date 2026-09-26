// next-pwa ships no type declarations (unmaintained @5.6.0).
// Without this shim `tsc --noEmit` fails with TS7016 and `next build` aborts
// after a successful compile, which also breaks the Docker image build.
declare module "next-pwa" {
  import type { NextConfig } from "next";
  interface PWAOptions {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean | ((dev: boolean) => boolean);
    fallbacks?: { document?: string };
    runtimeCaching?: unknown[];
    buildExcludes?: (string | RegExp)[];
    manifest?: boolean | string;
    scope?: string;
    startUrl?: string;
    publicExcludes?: string[];
    workboxOptions?: Record<string, unknown>;
    [key: string]: unknown;
  }
  export default function withPWA(config?: PWAOptions): (nextConfig?: NextConfig) => NextConfig;
}
