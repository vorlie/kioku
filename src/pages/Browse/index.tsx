import { useState } from "react";
import { useTrendingAnime, usePopularAnime } from "../../hooks/useAniList";
import MediaCard from "../../components/media/MediaCard";
import Tabs from "../../components/ui/Tabs";
import LayoutToggle, { ViewMode } from "../../components/layout/LayoutToggle";
import { Compass } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";

const BROWSE_TABS = [
  { id: "trending", label: "Trending" },
  { id: "popular", label: "Popular" },
];

export default function Browse() {
  const [activeTab, setActiveTab] = useState("trending");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const { results: trendingResults, isLoading: trendingLoading } =
    useTrendingAnime();
  const { results: popularResults, isLoading: popularLoading } =
    usePopularAnime();

  const results = activeTab === "trending" ? trendingResults : popularResults;
  const isLoading = activeTab === "trending" ? trendingLoading : popularLoading;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div>
      <PageHeader
        icon={<Compass size={20} />}
        title="Browse"
        subtitle="Discover anime and manga"
        actions={
          <LayoutToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        }
      >
        <Tabs
          tabs={BROWSE_TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </PageHeader>

      {isLoading ? (
        <div className="text-secondary">Loading anime...</div>
      ) : results && results.media.length === 0 ? (
        <div className="text-secondary">No anime found.</div>
      ) : results && results.media.length > 0 ? (
        <div>
          <p className="text-secondary section__title">
            {activeTab === "trending" ? "Trending" : "Popular"} anime
          </p>
          <div className={`media-layout-grid media-layout-grid--${viewMode}`}>
            {results.media.map((media) => (
              <MediaCard
                key={media.id}
                media={media}
                mediaType="anime"
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <p>Browse trending and popular anime</p>
        </div>
      )}
    </div>
  );
}
