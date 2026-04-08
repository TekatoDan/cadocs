import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Ensures the authenticated user has a profile in public.users.
 * Called on first load — replaces the need for a database trigger.
 */
export async function ensureUserProfile() {
  const user = await getAuthUser();

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
      },
    });
  }

  return user;
}

export async function getSupabaseClient() {
  return createClient();
}
