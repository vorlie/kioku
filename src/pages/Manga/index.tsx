import { useState } from "react";
import { useMangaList } from "../../hooks/useAniList";
import Tabs from "../../components/ui/Tabs";
import MediaCard from "../../components/media/MediaCard";
import LayoutToggle, { ViewMode } from "../../components/layout/LayoutToggle";
import { BookOpen } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "CURRENT", label: "Reading" },
  { id: "COMPLETED", label: "Completed" },
  { id: "PLANNING", label: "Planning" },
  { id: "PAUSED", label: "Paused" },
  { id: "DROPPED", label: "Dropped" },
  { id: "REPEATING", label: "Repeating" },
];

const SORT_OPTIONS = [
  { id: "updated", label: "Recently Updated" },
  { id: "title", label: "Title" },
  { id: "score", label: "Score" },
  { id: "progress", label: "Progress" },
];

export default function Manga() {
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { list, isLoading, error } = useMangaList(
    activeTab === "all" ? undefined : activeTab,
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleSortChange = (sortId: string) => {
    setSortBy(sortId);
  };

  const sortedList = [...(list || [])].sort((a, b) => {
    switch (sortBy) {
      case "title":
        const titleA =
          a.media?.title.userPreferred || a.media?.title.english || "";
        const titleB =
          b.media?.title.userPreferred || b.media?.title.english || "";
        return titleA.localeCompare(titleB);
      case "score":
        return (b.score || 0) - (a.score || 0);
      case "progress":
        return (b.progress || 0) - (a.progress || 0);
      case "updated":
      default:
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    }
  });

  return (
    <div>
      <PageHeader
        icon={<BookOpen size={20} />}
        title="Manga Library"
        subtitle="Your manga collection"
        actions={
          <>
            <LayoutToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="form-select"
              aria-label="Sort library"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </>
        }
      >
        <Tabs
          tabs={STATUS_TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </PageHeader>
      {isLoading ? (
        <div className="text-secondary">Loading your manga library...</div>
      ) : error ? (
        <div className="error-message">Error loading library: {error}</div>
      ) : sortedList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📭</div>
          <p>No manga found in this category.</p>
        </div>
      ) : (
        <div className={`media-layout-grid media-layout-grid--${viewMode}`}>
          {sortedList.map((entry) => (
            <MediaCard
              key={entry.id}
              entry={entry}
              mediaType="manga"
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
