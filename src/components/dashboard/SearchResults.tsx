"use client";

import React from "react";
import { Loader2, FileText, Lock, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchResult, TeamMember, UploadedFileRecord } from "@/lib/types";

interface SearchResultsProps {
  results: SearchResult[];
  searchQuery: string;
  isSearching: boolean;
  teamMembers: TeamMember[];
  currentUserId: string | undefined;
  onPreview: (file: UploadedFileRecord) => void;
  onDownload: (storagePath: string, fileName: string) => void;
}

function getOwnerName(
  createdBy: string | null,
  currentUserId: string | undefined,
  teamMembers: TeamMember[]
): string {
  if (!createdBy) return "Unknown";
  if (createdBy === currentUserId) return "Me";
  const member = teamMembers.find((m) => m.user_id === createdBy);
  if (member?.users) {
    return member.users.full_name || member.users.email;
  }
  return "Unknown";
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined,
  });
}

function highlightText(
  text: string,
  query: string
): React.ReactNode {
  if (!text || !query) return null;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    const snippet = text.slice(0, 150);
    return <span>{snippet}{text.length > 150 ? "..." : ""}</span>;
  }

  const snippetRadius = 75;
  const start = Math.max(0, matchIndex - snippetRadius);
  const end = Math.min(text.length, matchIndex + query.length + snippetRadius);
  const snippet = text.slice(start, end);
  const relativeMatchStart = matchIndex - start;
  const before = snippet.slice(0, relativeMatchStart);
  const match = snippet.slice(relativeMatchStart, relativeMatchStart + query.length);
  const after = snippet.slice(relativeMatchStart + query.length);

  return (
    <span>
      {start > 0 && "..."}
      {before}
      <mark className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-500/30 dark:text-yellow-200">
        {match}
      </mark>
      {after}
      {end < text.length && "..."}
    </span>
  );
}

export function SearchResults({
  results,
  searchQuery,
  isSearching,
  teamMembers,
  currentUserId,
  onPreview,
  onDownload,
}: SearchResultsProps) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Searching documents...
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
          No documents found
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Try adjusting your search query or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
        {results.length} result{results.length !== 1 ? "s" : ""} found
      </p>
      {results.map((result) => {
        const file = result.files;
        const isPrivate = file.description === "__VISIBILITY_PRIVATE__";
        const ownerName = getOwnerName(file.created_by, currentUserId, teamMembers);
        const timeAgo = formatTimeAgo(file.created_at);

        const fileRecord: UploadedFileRecord = {
          id: file.id,
          team_id: file.team_id,
          folder_id: null,
          name: file.name,
          description: file.description,
          storage_path: file.storage_path,
          size_bytes: file.size_bytes,
          mime_type: file.mime_type,
          status: "active",
          created_at: file.created_at,
          created_by: file.created_by,
        };

        return (
          <div
            key={result.id}
            className={cn(
              "rounded-lg border p-4 transition-colors",
              "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30",
              "dark:border-navy-700 dark:bg-navy-900 dark:hover:border-indigo-500/30 dark:hover:bg-navy-800/50"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                  <h3 className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {file.name}
                  </h3>
                  {isPrivate && (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{ownerName}</span>
                  <span>&middot;</span>
                  <span>{timeAgo}</span>
                </div>
                {result.content && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {highlightText(result.content, searchQuery)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPreview(fileRecord)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    "text-indigo-600 hover:bg-indigo-50",
                    "dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(file.storage_path, file.name)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    "text-slate-600 hover:bg-slate-100",
                    "dark:text-slate-400 dark:hover:bg-navy-800"
                  )}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
