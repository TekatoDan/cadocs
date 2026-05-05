"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchDocuments } from "@/app/actions/search";
import type { SearchFilters } from "@/lib/types";

export function useSearchDocuments(
  teamId: string | null,
  query: string,
  filters: SearchFilters
) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const hasFilters = Object.values(filters).some(
    (v) => v !== "all" && v !== "any" && v !== "anyone" && v !== ""
  );
  const isActive = (debouncedQuery.length >= 3 || hasFilters) && !!teamId;

  return useQuery({
    queryKey: ["search", teamId, debouncedQuery, filters],
    queryFn: () => searchDocuments(teamId!, debouncedQuery, filters),
    enabled: isActive,
    placeholderData: (prev) => prev,
  });
}
