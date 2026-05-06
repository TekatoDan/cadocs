import { prisma } from "@/lib/prisma";
import { getAuthUser, getSupabaseClient } from "@/lib/auth";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const PRIVATE_VISIBILITY = "__VISIBILITY_PRIVATE__";
const STORAGE_BUCKET = "Cadocs-Bucket";

export class FileAccessAuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "FileAccessAuthError";
  }
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

async function getAuthUserForRequest(authorizationHeader: string | null) {
  const accessToken = getBearerToken(authorizationHeader);
  if (!accessToken) {
    try {
      return await getAuthUser();
    } catch {
      throw new FileAccessAuthError();
    }
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) throw new FileAccessAuthError();
  return user;
}

async function getStorageClientForRequest(authorizationHeader: string | null) {
  const accessToken = getBearerToken(authorizationHeader);
  if (!accessToken) return getSupabaseClient();

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

export function encodeContentDisposition(
  fileName: string,
  disposition: "attachment" | "inline"
) {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function getAuthorizedStorageFile(
  storagePath: string,
  authorizationHeader: string | null
) {
  const user = await getAuthUserForRequest(authorizationHeader);

  return prisma.file.findFirst({
    where: {
      storagePath,
      OR: [
        { description: null },
        { description: { not: PRIVATE_VISIBILITY } },
        { description: PRIVATE_VISIBILITY, createdBy: user.id },
      ],
    },
    select: {
      name: true,
      mimeType: true,
      storagePath: true,
    },
  });
}

export async function fetchStorageFile(
  storagePath: string,
  authorizationHeader: string | null
) {
  const supabase = await getStorageClientForRequest(authorizationHeader);
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error) {
    throw new Error(error.message);
  }

  return fetch(data.signedUrl, { cache: "no-store" });
}
