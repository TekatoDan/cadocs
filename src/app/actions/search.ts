"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { SearchFilters, SearchResult } from "@/lib/types";

export async function searchDocuments(
  teamId: string,
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  const user = await getAuthUser();
  const hasQuery = query.trim().length > 0;
  const hasFilters =
    filters &&
    Object.values(filters).some(
      (v) => v !== "all" && v !== "any" && v !== "anyone"
    );

  if (!hasQuery && !hasFilters) return [];

  // Build visibility filter
  const visibilityFilter = [
    { description: null },
    { description: { not: "__VISIBILITY_PRIVATE__" } },
    { description: "__VISIBILITY_PRIVATE__", createdBy: user.id },
  ];

  // Build extra filters
  const extraFilters: any = {};
  if (filters?.fileType && filters.fileType !== "all") {
    if (filters.fileType === "pdf") extraFilters.mimeType = "application/pdf";
    else if (filters.fileType === "image")
      extraFilters.mimeType = { startsWith: "image/" };
    else if (filters.fileType === "document")
      extraFilters.mimeType = {
        in: [
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
      };
    else if (filters.fileType === "spreadsheet")
      extraFilters.mimeType = {
        in: [
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
        ],
      };
  }

  if (filters?.dateModified && filters.dateModified !== "any") {
    const now = new Date();
    const threshold = new Date();
    if (filters.dateModified === "today") threshold.setHours(0, 0, 0, 0);
    else if (filters.dateModified === "7days")
      threshold.setDate(now.getDate() - 7);
    else if (filters.dateModified === "30days")
      threshold.setDate(now.getDate() - 30);
    else if (filters.dateModified === "year")
      threshold.setFullYear(now.getFullYear() - 1);
    extraFilters.createdAt = { gte: threshold };
  }

  if (filters?.owner && filters.owner !== "anyone") {
    extraFilters.createdBy = filters.owner;
  }

  const results: SearchResult[] = [];
  const seenFileIds = new Set<string>();

  if (hasQuery) {
    // Search document contents
    const contentMatches = await prisma.documentContent.findMany({
      where: {
        content: { contains: query, mode: "insensitive" },
        file: {
          teamId,
          status: { not: "archived" },
          OR: visibilityFilter,
          ...extraFilters,
        },
      },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            teamId: true,
            storagePath: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
            createdBy: true,
            description: true,
          },
        },
      },
      take: 20,
    });

    for (const match of contentMatches) {
      seenFileIds.add(match.file.id);
      results.push({
        id: match.id,
        content: match.content,
        files: {
          id: match.file.id,
          name: match.file.name,
          team_id: match.file.teamId,
          storage_path: match.file.storagePath,
          mime_type: match.file.mimeType,
          size_bytes: Number(match.file.sizeBytes),
          created_at: match.file.createdAt.toISOString(),
          created_by: match.file.createdBy,
          description: match.file.description,
        },
      });
    }

    // Search file names
    const nameMatches = await prisma.file.findMany({
      where: {
        teamId,
        status: { not: "archived" },
        name: { contains: query, mode: "insensitive" },
        OR: visibilityFilter,
        ...extraFilters,
      },
      take: 20,
    });

    for (const file of nameMatches) {
      if (!seenFileIds.has(file.id)) {
        seenFileIds.add(file.id);
        results.push({
          id: `name-${file.id}`,
          content: "",
          files: {
            id: file.id,
            name: file.name,
            team_id: file.teamId,
            storage_path: file.storagePath,
            mime_type: file.mimeType,
            size_bytes: Number(file.sizeBytes),
            created_at: file.createdAt.toISOString(),
            created_by: file.createdBy,
            description: file.description,
          },
        });
      }
    }
  } else {
    // Filters only
    const files = await prisma.file.findMany({
      where: {
        teamId,
        status: { not: "archived" },
        OR: visibilityFilter,
        ...extraFilters,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    for (const file of files) {
      results.push({
        id: file.id,
        content: "",
        files: {
          id: file.id,
          name: file.name,
          team_id: file.teamId,
          storage_path: file.storagePath,
          mime_type: file.mimeType,
          size_bytes: Number(file.sizeBytes),
          created_at: file.createdAt.toISOString(),
          created_by: file.createdBy,
          description: file.description,
        },
      });
    }
  }

  return results;
}
