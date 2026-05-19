export interface SearchableContentChunk {
  id: string;
  content: string;
  pageNumber?: number | null;
  section?: string | null;
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getSearchTerms(query: string) {
  return Array.from(
    new Set(
      normalizeSearchText(query)
        .split(" ")
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
    )
  );
}

export function matchesSearchTerms(
  content: string,
  normalizedQuery: string,
  terms: string[]
) {
  const normalizedContent = normalizeSearchText(content);
  if (!normalizedQuery && terms.length === 0) return true;
  if (normalizedQuery && normalizedContent.includes(normalizedQuery)) return true;
  return terms.length > 0 && terms.every((term) => normalizedContent.includes(term));
}

export function selectBestContentMatch(
  chunks: SearchableContentChunk[],
  normalizedQuery: string,
  terms: string[]
) {
  const phraseMatch = chunks.find((chunk) =>
    normalizedQuery
      ? normalizeSearchText(chunk.content).includes(normalizedQuery)
      : false
  );
  if (phraseMatch) return phraseMatch;

  const allTermMatch = chunks.find((chunk) =>
    terms.length > 0
      ? terms.every((term) => normalizeSearchText(chunk.content).includes(term))
      : false
  );
  if (allTermMatch) return allTermMatch;

  const partialMatch = chunks.find((chunk) =>
    terms.some((term) => normalizeSearchText(chunk.content).includes(term))
  );
  return partialMatch ?? chunks[0] ?? null;
}
