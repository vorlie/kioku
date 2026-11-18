import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Loader2, LogIn, Search, X } from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import type { MediaListEntry } from "../../types/anilist";
import Tabs from "../ui/Tabs";
import MediaCard from "./MediaCard";
import LayoutToggle, { type ViewMode } from "../layout/LayoutToggle";
import PageHeader from "../layout/PageHeader";

interface StatusTab {
  id: string;
  label: string;
}

const SORT_OPTIONS = [
  { id: "updated", label: "Recently Updated" },
  { id: "title", label: "Title" },
  { id: "score", label: "Score" },
  { id: "progress", label: "Progress" },
];

interface MediaLibraryProps {
  mediaType: "anime" | "manga";
  title: string;
  subtitle: string;
  icon: ReactNode;
  statusTabs: StatusTab[];
  useList: (status?: string) => {
    list: MediaListEntry[];
    isLoading: boolean;
    error: string | null;
  };
}

export default function MediaLibrary({
  mediaType,
  title,
  subtitle,
  icon,
  statusTabs,
  useList,
}: MediaLibraryProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterQuery, setFilterQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { list, isLoading, error } = useList();

  const tabsWithCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of list) {
      if (entry.status) {
        counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
      }
    }
    return statusTabs.map((tab) => ({
      ...tab,
      count: tab.id === "all" ? list.length : (counts.get(tab.id) ?? 0),
    }));
  }, [list, statusTabs]);

  const sortedList = useMemo(() => {
    const normalizedFilter = filterQuery.trim().toLowerCase();

    const filtered = list.filter((entry) => {
      if (activeTab !== "all" && entry.status !== activeTab) return false;
      if (!normalizedFilter) return true;
      const titles = [
        entry.media?.title.userPreferred,
        entry.media?.title.english,
        entry.media?.title.romaji,
        entry.media?.title.native,
      ];
      return titles.some((t) => t?.toLowerCase().includes(normalizedFilter));
    });

    const dir = sortDir === "asc" ? 1 : -1;

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "title": {
          const titleA =
            a.media?.title.userPreferred || a.media?.title.english || "";
          const titleB =
            b.media?.title.userPreferred || b.media?.title.english || "";
          return titleA.localeCompare(titleB) * dir;
        }
        case "score":
          return ((a.score || 0) - (b.score || 0)) * dir;
        case "progress":
          return ((a.progress || 0) - (b.progress || 0)) * dir;
        case "updated":
        default:
          return ((a.updatedAt || 0) - (b.updatedAt || 0)) * dir;
      }
    });
  }, [activeTab, filterQuery, list, sortBy, sortDir]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div>
        <PageHeader icon={icon} title={title} subtitle={subtitle} />
        <div className="empty-state">
          <div className="empty-state__icon-box">{icon}</div>
          <h2 className="empty-state__title">Connect your AniList account</h2>
          <p className="empty-state__description">
            Sign in to view and manage your {mediaType} library.
          </p>
          <button
            type="button"
            className="button-primary"
            onClick={() => navigate("/settings")}
          >
            <LogIn size={16} aria-hidden="true" />
            Connect AniList Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        actions={
          <div className="library-actions">
            <div className="library-filter">
              <Search size={15} className="library-filter__icon" aria-hidden="true" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={`Filter ${mediaType}...`}
                className="form-input library-filter__input"
                aria-label={`Filter ${mediaType} library`}
              />
              {filterQuery && (
                <button
                  type="button"
                  className="library-filter__clear"
                  onClick={() => setFilterQuery("")}
                  aria-label="Clear filter"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <LayoutToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            <div className="library-sort">
              <select
                value={sortBy}
                onChange={(e) => {
                  const next = e.target.value;
                  setSortBy(next);
                  setSortDir(next === "title" ? "asc" : "desc");
                }}
                className="form-select"
                aria-label="Sort library"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="button-icon"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                aria-label={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                {sortDir === "asc" ? (
                  <ArrowUp size={16} aria-hidden="true" />
                ) : (
                  <ArrowDown size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        }
      >
        <Tabs
          tabs={tabsWithCounts}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </PageHeader>

      {isLoading ? (
        <div className="page-state">
          <Loader2 className="page-state__spinner" size={28} aria-hidden="true" />
          <p className="page-state__description">
            Loading your {mediaType} library...
          </p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state__icon-box">{icon}</div>
          <h2 className="empty-state__title">
            Unable to load {mediaType} library
          </h2>
          <p className="empty-state__description">{error}</p>
        </div>
      ) : sortedList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon-box">{icon}</div>
          <h2 className="empty-state__title">No {mediaType} found</h2>
          <p className="empty-state__description">
            {filterQuery.trim()
              ? `No ${mediaType} matched "${filterQuery.trim()}".`
              : `There are no ${mediaType} entries in this category yet.`}
          </p>
        </div>
      ) : (
        <div className={`media-layout-grid media-layout-grid--${viewMode}`}>
          {sortedList.map((entry) => (
            <MediaCard
              key={entry.id}
              entry={entry}
              mediaType={mediaType}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
