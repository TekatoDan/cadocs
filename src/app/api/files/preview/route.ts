import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, getSupabaseClient } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_VISIBILITY = "__VISIBILITY_PRIVATE__";

function encodeContentDispositionFilename(fileName: string) {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    const storagePath = request.nextUrl.searchParams.get("path");

    if (!storagePath) {
      return new Response("Missing file path", { status: 400 });
    }

    const file = await prisma.file.findFirst({
      where: {
        storagePath,
        team: {
          members: {
            some: {
              userId: user.id,
              role: { not: "rejected" },
            },
          },
        },
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

    if (!file) {
      return new Response("File not found", { status: 404 });
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.storage
      .from("Cadocs-Bucket")
      .createSignedUrl(file.storagePath, 60);

    if (error) {
      return new Response(error.message, { status: 502 });
    }

    const upstream = await fetch(data.signedUrl, { cache: "no-store" });

    if (!upstream.ok || !upstream.body) {
      return new Response("Unable to load file preview", {
        status: upstream.status || 502,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || upstream.headers.get("Content-Type") || "application/octet-stream",
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": encodeContentDispositionFilename(file.name),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to load file preview:", error);
    return new Response("Unauthorized", { status: 401 });
  }
}
