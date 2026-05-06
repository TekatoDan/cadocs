import { prisma } from "@/lib/prisma";
import { getAuthUser, getSupabaseClient } from "@/lib/auth";

const PRIVATE_VISIBILITY = "__VISIBILITY_PRIVATE__";

export function encodeContentDisposition(
  fileName: string,
  disposition: "attachment" | "inline"
) {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function getAuthorizedStorageFile(storagePath: string) {
  const user = await getAuthUser();

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

export async function fetchStorageFile(storagePath: string) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.storage
    .from("Cadocs-Bucket")
    .createSignedUrl(storagePath, 60);

  if (error) {
    throw new Error(error.message);
  }

  return fetch(data.signedUrl, { cache: "no-store" });
}
