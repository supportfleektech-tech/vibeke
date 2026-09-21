import { auth } from "@/lib/auth";

export async function getCurrentUserId(): Promise<string> {
  try {
    const session = await auth();
    if (session && (session as any).userId) return (session as any).userId as string;
    if (session?.user?.email) return "usr_brian_mwangi";
  } catch {}
  // Fallback for demo - sovereign user
  return "usr_brian_mwangi";
}

export async function getCurrentUser() {
  const id = await getCurrentUserId();
  return { id, handle: "brianmwangi", name: "Brian Mwangi" };
}
