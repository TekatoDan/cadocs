"use client";

import { useQuery } from "@tanstack/react-query";
import { searchDocuments } from "@/app/actions/search";
import type { SearchFilters } from "@/lib/types";

export function useSearchDocuments(
  teamId: string | null,
  query: string,
  filters: SearchFilters
) {
  const hasFilters = Object.values(filters).some(
    (v) => v !== "all" && v !== "any" && v !== "anyone"
  );
  const isActive = (query.length >= 3 || hasFilters) && !!teamId;

  return useQuery({
    queryKey: ["search", teamId, query, filters],
    queryFn: () => searchDocuments(teamId!, query, filters),
    enabled: isActive,
    placeholderData: (prev) => prev,
  });
}
