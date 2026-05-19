"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import {
  getSearchTerms,
  matchesSearchTerms,
  normalizeSearchText,
  selectBestContentMatch,
} from "@/lib/search-match";
import type { SearchFilters, SearchResult } from "@/lib/types";

function containsInsensitive(field: string, value: string) {
  return { [field]: { contains: value, mode: "insensitive" as const } };
}

function buildAnyTextSearchFilter(field: string, query: string, terms: string[]) {
  const conditions: any[] = [containsInsensitive(field, query)];
  for (const term of terms) {
    if (term.toLowerCase() !== query.toLowerCase()) {
      conditions.push(containsInsensitive(field, term));
    }
  }
  return conditions.length === 1 ? conditions[0] : { OR: conditions };
}

function buildNameSearchFilter(field: string, query: string, terms: string[]) {
  const conditions: any[] = [containsInsensitive(field, query)];
  if (terms.length > 0) {
    conditions.push({
      AND: terms.map((term) => containsInsensitive(field, term)),
    });
  }
  return conditions.length === 1 ? conditions[0] : { OR: conditions };
}

export async function searchDocuments(
  teamId: string,
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  const user = await getAuthUser();
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const hasFilters =
    filters &&
    Object.values(filters).some(
      (v) => v !== "all" && v !== "any" && v !== "anyone" && v !== ""
    );

  if (!hasQuery && !hasFilters) return [];

  const searchTerms = getSearchTerms(trimmedQuery);
  const normalizedQuery = normalizeSearchText(trimmedQuery);

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
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
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

  if (filters?.fileSize && filters.fileSize !== "any") {
    if (filters.fileSize === "small") {
      extraFilters.sizeBytes = { lt: 1 * 1024 * 1024 };
    } else if (filters.fileSize === "medium") {
      extraFilters.sizeBytes = { gte: 1 * 1024 * 1024, lte: 10 * 1024 * 1024 };
    } else if (filters.fileSize === "large") {
      extraFilters.sizeBytes = { gt: 10 * 1024 * 1024 };
    }
  }

  if (filters?.tags) {
    extraFilters.name = { contains: filters.tags, mode: "insensitive" };
  }

  const folderFilters: any = {};
  if (filters?.dateModified && filters.dateModified !== "any") {
    folderFilters.createdAt = extraFilters.createdAt;
  }
  if (filters?.owner && filters.owner !== "anyone") {
    folderFilters.createdBy = filters.owner;
  }

  const results: SearchResult[] = [];
  const seenFileIds = new Set<string>();

  if (hasQuery) {
    // Search document contents
    const contentMatches = await prisma.documentContent.findMany({
      where: {
        AND: [buildAnyTextSearchFilter("content", trimmedQuery, searchTerms)],
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
            indexingStatus: true,
            indexingError: true,
            indexedAt: true,
            createdAt: true,
            createdBy: true,
            description: true,
          },
        },
      },
      orderBy: [{ fileId: "asc" }, { chunkIndex: "asc" }],
      take: 200,
    });

    const contentMatchesByFile = new Map<
      string,
      {
        chunks: {
          id: string;
          content: string;
          pageNumber: number | null;
          section: string | null;
        }[];
        file: (typeof contentMatches)[number]["file"];
      }
    >();

    for (const match of contentMatches) {
      const group = contentMatchesByFile.get(match.file.id);
      if (group) {
        group.chunks.push({
          id: match.id,
          content: match.content,
          pageNumber: match.pageNumber,
          section: match.section,
        });
      } else {
        contentMatchesByFile.set(match.file.id, {
          chunks: [
            {
              id: match.id,
              content: match.content,
              pageNumber: match.pageNumber,
              section: match.section,
            },
          ],
          file: match.file,
        });
      }
    }

    for (const match of contentMatchesByFile.values()) {
      if (seenFileIds.has(match.file.id)) continue;
      const combinedContent = match.chunks.map((chunk) => chunk.content).join("\n\n");
      if (!matchesSearchTerms(combinedContent, normalizedQuery, searchTerms)) {
        continue;
      }

      const bestChunk =
        selectBestContentMatch(match.chunks, normalizedQuery, searchTerms) ??
        match.chunks[0];

      seenFileIds.add(match.file.id);
      results.push({
        id: bestChunk.id,
        type: "file",
        content: bestChunk.content,
        page_number: bestChunk.pageNumber,
        section: bestChunk.section,
        files: {
          id: match.file.id,
          name: match.file.name,
          team_id: match.file.teamId,
          storage_path: match.file.storagePath,
          mime_type: match.file.mimeType,
          size_bytes: Number(match.file.sizeBytes),
          indexing_status: match.file.indexingStatus,
          indexing_error: match.file.indexingError,
          indexed_at: match.file.indexedAt?.toISOString() ?? null,
          created_at: match.file.createdAt.toISOString(),
          created_by: match.file.createdBy,
          description: match.file.description,
        },
      });
      if (results.length >= 20) break;
    }

    // Search folder names
    const archiveFolder = await prisma.folder.findFirst({
      where: { teamId, parentId: null, name: ".archive" },
      select: { id: true },
    });

    const folderMatches = await prisma.folder.findMany({
      where: {
        teamId,
        AND: [buildNameSearchFilter("name", trimmedQuery, searchTerms)],
        NOT: [
          { name: ".archive" },
          ...(archiveFolder ? [{ parentId: archiveFolder.id }] : []),
        ],
        ...folderFilters,
      },
      orderBy: { name: "asc" },
      take: 20,
    });

    for (const folder of folderMatches) {
      results.push({
        id: `folder-${folder.id}`,
        type: "folder",
        content: "",
        folder: {
          id: folder.id,
          team_id: folder.teamId,
          name: folder.name,
          parent_id: folder.parentId,
          created_at: folder.createdAt.toISOString(),
          created_by: folder.createdBy,
        },
      });
    }

    // Search file names
    const nameMatches = await prisma.file.findMany({
      where: {
        teamId,
        status: { not: "archived" },
        AND: [buildNameSearchFilter("name", trimmedQuery, searchTerms)],
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
          type: "file",
          content: "",
          files: {
            id: file.id,
            name: file.name,
            team_id: file.teamId,
            storage_path: file.storagePath,
            mime_type: file.mimeType,
            size_bytes: Number(file.sizeBytes),
            indexing_status: file.indexingStatus,
            indexing_error: file.indexingError,
            indexed_at: file.indexedAt?.toISOString() ?? null,
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
        type: "file",
        content: "",
        files: {
          id: file.id,
          name: file.name,
          team_id: file.teamId,
          storage_path: file.storagePath,
          mime_type: file.mimeType,
          size_bytes: Number(file.sizeBytes),
          indexing_status: file.indexingStatus,
          indexing_error: file.indexingError,
          indexed_at: file.indexedAt?.toISOString() ?? null,
          created_at: file.createdAt.toISOString(),
          created_by: file.createdBy,
          description: file.description,
        },
      });
    }
  }

  return results;
}
