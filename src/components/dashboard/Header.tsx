"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Filter,
  Moon,
  Sun,
  Settings2,
  Menu,
  Clock,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { SearchFilters, ColumnConfig, TeamMember } from "@/lib/types";

interface HeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchFilters: SearchFilters;
  onSearchFiltersChange: (filters: SearchFilters) => void;
  isSearching: boolean;
  columns: ColumnConfig;
  onColumnsChange: (columns: ColumnConfig) => void;
  teamMembers: TeamMember[];
  currentUserId: string | undefined;
  onMobileMenuOpen: () => void;
}

const RECENT_SEARCHES_KEY = "cadocs-recent-searches";
const MAX_RECENT_SEARCHES = 5;

export default function Header({
  title,
  searchQuery,
  onSearchChange,
  searchFilters,
  onSearchFiltersChange,
  isSearching,
  columns,
  onColumnsChange,
  teamMembers,
  currentUserId,
  onMobileMenuOpen,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const columnDropdownRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchSuggestions(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target as Node)
      ) {
        setShowSearchFilters(false);
      }
      if (
        columnDropdownRef.current &&
        !columnDropdownRef.current.contains(e.target as Node)
      ) {
        setShowColumnDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addRecentSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      const updated = [
        query,
        ...recentSearches.filter((s) => s !== query),
      ].slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    },
    [recentSearches]
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < recentSearches.length) {
        const selected = recentSearches[activeSuggestionIndex];
        onSearchChange(selected);
        addRecentSearch(selected);
      } else {
        addRecentSearch(searchQuery);
      }
      setShowSearchSuggestions(false);
      searchInputRef.current?.blur();
    } else if (e.key === "Escape") {
      setShowSearchSuggestions(false);
      searchInputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < recentSearches.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSearchChange(suggestion);
    addRecentSearch(suggestion);
    setShowSearchSuggestions(false);
  };

  const activeFilterEntries = [
    searchFilters.fileType && searchFilters.fileType !== "all"
      ? `Type: ${searchFilters.fileType}`
      : null,
    searchFilters.dateModified && searchFilters.dateModified !== "any"
      ? `Date: ${searchFilters.dateModified}`
      : null,
    searchFilters.owner && searchFilters.owner !== "anyone" ? "Owner: custom" : null,
    searchFilters.fileSize && searchFilters.fileSize !== "any"
      ? `Size: ${searchFilters.fileSize}`
      : null,
    searchFilters.tags ? `Tag: ${searchFilters.tags}` : null,
  ].filter(Boolean) as string[];

  // When arrow keys select a suggestion, apply it
  useEffect(() => {
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < recentSearches.length) {
      // Don't auto-apply, just highlight
    }
  }, [activeSuggestionIndex, recentSearches]);

  return (
    <header className="sticky top-0 z-10 flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-navy-800/70 dark:bg-navy-950/85 sm:flex-nowrap sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className="app-focus-ring rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-slate-200"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          {title}
        </h1>
      </div>

      {/* Right side */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        {/* Search */}
        <div
          ref={searchContainerRef}
          className="relative order-last flex w-full sm:order-none sm:w-auto"
        >
          <div className="relative flex w-full items-center sm:w-auto">
            {isSearching ? (
              <Loader2 className="absolute left-4 h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <Search className="absolute left-4 h-4 w-4 text-slate-400" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => {
                setShowSearchSuggestions(true);
                setActiveSuggestionIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              className="app-focus-ring h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-2 pl-11 pr-11 text-sm font-medium text-slate-900 shadow-inner transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:shadow-sm dark:border-navy-700 dark:bg-navy-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-600 dark:focus:bg-navy-900 dark:focus:ring-indigo-900/30 sm:w-56 sm:focus:w-80"
            />
            {/* Filter button */}
            <div ref={filterDropdownRef} className="absolute right-2">
              <button
                onClick={() => setShowSearchFilters(!showSearchFilters)}
                className={`app-focus-ring rounded-xl p-1.5 transition-colors ${
                  searchFilters.fileType ||
                  searchFilters.dateModified ||
                  searchFilters.owner ||
                  searchFilters.fileSize ||
                  searchFilters.tags
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                title="Search filters"
                aria-label="Search filters"
              >
                <Filter className="h-4 w-4" />
              </button>

              {/* Filter dropdown */}
              {showSearchFilters && (
                <div className="absolute right-0 top-full mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-navy-700 dark:bg-navy-900">
                  <div className="space-y-3">
                    {/* File Type */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        File Type
                      </label>
                      <select
                        value={searchFilters.fileType || ""}
                        onChange={(e) =>
                          onSearchFiltersChange({
                            ...searchFilters,
                            fileType: e.target.value || undefined,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                      >
                        <option value="">All types</option>
                        <option value="pdf">PDF</option>
                        <option value="document">Document</option>
                        <option value="spreadsheet">Spreadsheet</option>
                        <option value="image">Image</option>
                      </select>
                    </div>

                    {/* Date Modified */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        Date Modified
                      </label>
                      <select
                        value={searchFilters.dateModified || ""}
                        onChange={(e) =>
                          onSearchFiltersChange({
                            ...searchFilters,
                            dateModified: e.target.value || undefined,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                      >
                        <option value="">Any time</option>
                        <option value="today">Today</option>
                        <option value="7days">Last 7 days</option>
                        <option value="30days">Last 30 days</option>
                        <option value="year">This year</option>
                      </select>
                    </div>

                    {/* Owner */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        Owner
                      </label>
                      <select
                        value={searchFilters.owner || ""}
                        onChange={(e) =>
                          onSearchFiltersChange({
                            ...searchFilters,
                            owner: e.target.value || undefined,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                      >
                        <option value="">Anyone</option>
                        {currentUserId && <option value={currentUserId}>Me</option>}
                        {teamMembers
                          .filter((m) => m.user_id !== currentUserId)
                          .map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {member.users?.full_name || member.users?.email || "Unknown"}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* File size */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        File Size
                      </label>
                      <select
                        value={searchFilters.fileSize || "any"}
                        onChange={(e) =>
                          onSearchFiltersChange({
                            ...searchFilters,
                            fileSize: e.target.value || "any",
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                      >
                        <option value="any">Any size</option>
                        <option value="small">Below 1 MB</option>
                        <option value="medium">1 - 10 MB</option>
                        <option value="large">Above 10 MB</option>
                      </select>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        Tag
                      </label>
                      <input
                        value={searchFilters.tags || ""}
                        onChange={(e) =>
                          onSearchFiltersChange({
                            ...searchFilters,
                            tags: e.target.value,
                          })
                        }
                        placeholder="e.g. invoice"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onSearchFiltersChange({
                        fileType: "all",
                        dateModified: "any",
                        owner: "anyone",
                        fileSize: "any",
                        tags: "",
                      })
                    }
                    className="mt-3 app-muted-button w-full py-1.5 text-xs"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent search suggestions */}
          {showSearchSuggestions && recentSearches.length > 0 && !searchQuery && (
            <div className="absolute left-0 top-full mt-2 w-full rounded-xl border border-slate-200 bg-white py-2 shadow-xl dark:border-navy-700 dark:bg-navy-900">
              <div className="px-3 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                Recent searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => handleSuggestionClick(search)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    index === activeSuggestionIndex
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-navy-800"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {search}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeFilterEntries.length > 0 && (
          <div className="hidden items-center gap-1.5 lg:flex">
            {activeFilterEntries.slice(0, 3).map((entry) => (
              <span
                key={entry}
                className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300"
              >
                {entry}
              </span>
            ))}
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="app-focus-ring rounded-xl border border-transparent p-2 text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-700 hover:shadow-sm dark:text-slate-400 dark:hover:border-navy-700 dark:hover:bg-navy-800 dark:hover:text-slate-200"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>

        {/* Column config */}
        <div ref={columnDropdownRef} className="relative">
          <button
            onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className="app-focus-ring rounded-xl border border-transparent p-2 text-slate-500 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-700 hover:shadow-sm dark:text-slate-400 dark:hover:border-navy-700 dark:hover:bg-navy-800 dark:hover:text-slate-200"
            title="Column settings"
            aria-label="Column settings"
          >
            <Settings2 className="h-5 w-5" />
          </button>

          {showColumnDropdown && (
            <div className="absolute right-0 top-full mt-3 w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-navy-700 dark:bg-navy-900">
              <div className="mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                Visible columns
              </div>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={columns.owner}
                    onChange={(e) =>
                      onColumnsChange({ ...columns, owner: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-navy-600"
                  />
                  Owner
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={columns.lastModified}
                    onChange={(e) =>
                      onColumnsChange({
                        ...columns,
                        lastModified: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-navy-600"
                  />
                  Last Modified
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={columns.size}
                    onChange={(e) =>
                      onColumnsChange({ ...columns, size: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-navy-600"
                  />
                  Size
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
