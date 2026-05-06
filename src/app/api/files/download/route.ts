import { NextRequest } from "next/server";
import {
  encodeContentDisposition,
  FileAccessAuthError,
  fetchStorageFile,
  getAuthorizedStorageFile,
} from "../_lib";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const storagePath = request.nextUrl.searchParams.get("path");

    if (!storagePath) {
      return new Response("Missing file path", { status: 400 });
    }

    const authorizationHeader = request.headers.get("authorization");
    const file = await getAuthorizedStorageFile(storagePath, authorizationHeader);

    if (!file) {
      return new Response("File not found", { status: 404 });
    }

    const upstream = await fetchStorageFile(file.storagePath, authorizationHeader);

    if (!upstream.ok || !upstream.body) {
      return new Response("Unable to load file download", {
        status: upstream.status || 502,
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          file.mimeType ||
          upstream.headers.get("Content-Type") ||
          "application/octet-stream",
        "Cache-Control": "private, no-store",
        "Content-Disposition": encodeContentDisposition(file.name, "attachment"),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to download file:", error);
    const isUnauthorized = error instanceof FileAccessAuthError;
    return new Response(
      isUnauthorized ? "Unauthorized" : "Unable to load file download",
      { status: isUnauthorized ? 401 : 502 }
    );
  }
}
