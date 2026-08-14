import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Clock3,
  Film,
  Star,
  Tags,
} from "lucide-react";

import { useViewer } from "../../hooks/useAniList";
import Tabs from "../../components/ui/Tabs";
import PageHeader from "../../components/layout/PageHeader";

type MediaType = "anime" | "manga";

const TYPE_TABS = [
  { id: "anime", label: "Anime" },
  { id: "manga", label: "Manga" },
];

export default function Statistics() {
  const { viewer, isLoading, error } = useViewer();
  const [activeTypeTab, setActiveTypeTab] = useState<MediaType>("anime");

  if (isLoading) {
    return (
      <div className="page-state">
        <div className="page-state__title">Analyzing your library...</div>
        <div className="page-state__description">
          Gathering your AniList statistics.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state page-state--error">
        <div className="page-state__title">
          Unable to load statistics
        </div>
        <div className="page-state__description">
          {error}
        </div>
      </div>
    );
  }

  if (!viewer?.statistics) {
    return (
      <div className="page-state">
        <div className="page-state__title">
          No statistics available
        </div>
        <div className="page-state__description">
          AniList didn't return any statistical data for your account.
        </div>
      </div>
    );
  }

  const stats =
    activeTypeTab === "anime"
      ? viewer.statistics.anime
      : viewer.statistics.manga;

  if (!stats) {
    return (
      <div className="page-state">
        <div className="page-state__title">
          No {activeTypeTab} statistics
        </div>
      </div>
    );
  }

  const formatTime = (minutes: number) => {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const genres = stats.genres ?? [];
  const scores = activeTypeTab === "anime"
    ? stats.scores ?? []
    : [];

  const maxGenreCount = Math.max(
    ...genres.map((genre) => genre.count || 0),
    1,
  );

  const maxScoreCount = Math.max(
    ...scores.map((score) => score.count || 0),
    1,
  );

  return (
    <div className="statistics-page">
      <PageHeader
        icon={<BarChart3 size={20} />}
        title="Library Insights"
        subtitle={
          activeTypeTab === "anime"
            ? "A look at your anime watching habits"
            : "A look at your manga reading habits"
        }
      >
        <Tabs
          tabs={TYPE_TABS}
          activeTab={activeTypeTab}
          onTabChange={(id) => setActiveTypeTab(id as MediaType)}
        />
      </PageHeader>

      {/* Overview */}
      <section className="stats-section">
        <div className="stats-section__header">
          <div>
            <h2 className="stats-section__title">Overview</h2>
            <p className="stats-section__description">
              Your overall {activeTypeTab} activity.
            </p>
          </div>
        </div>

        <div className="stats-metrics">
          <MetricCard
            icon={
              activeTypeTab === "anime"
                ? <Film size={19} />
                : <BookOpen size={19} />
            }
            value={stats.count || 0}
            label="Titles"
          />

          <MetricCard
            icon={<Star size={19} />}
            value={(stats.meanScore || 0).toFixed(1)}
            label="Average score"
          />

          {activeTypeTab === "anime" ? (
            <MetricCard
              icon={<Clock3 size={19} />}
              value={formatTime(stats.minutesWatched || 0)}
              label="Time watched"
            />
          ) : (
            <MetricCard
              icon={<BarChart3 size={19} />}
              value={stats.chaptersRead || 0}
              label="Chapters read"
            />
          )}
        </div>
      </section>

      {/* Charts */}
      <div className="stats-grid">
        {genres.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__header">
              <div className="stats-card__icon">
                <Tags size={17} />
              </div>

              <div>
                <h2 className="stats-card__title">Top genres</h2>
                <p className="stats-card__description">
                  Your most common genres.
                </p>
              </div>
            </div>

            <div className="genre-list">
              {genres.slice(0, 6).map((genre) => {
                const count = genre.count || 0;
                const width = (count / maxGenreCount) * 100;

                return (
                  <div
                    className="genre-row"
                    key={genre.genre}
                  >
                    <div className="genre-row__header">
                      <span className="genre-row__name">
                        {genre.genre}
                      </span>

                      <span className="genre-row__count">
                        {count}
                      </span>
                    </div>

                    <div className="genre-row__track">
                      <div
                        className="genre-row__bar"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTypeTab === "anime" && scores.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__header">
              <div className="stats-card__icon">
                <Star size={17} />
              </div>

              <div>
                <h2 className="stats-card__title">
                  Score distribution
                </h2>
                <p className="stats-card__description">
                  How you rate your anime.
                </p>
              </div>
            </div>

            <div className="score-chart">
              {scores.map((score) => {
                const count = score.count || 0;
                const height = (count / maxScoreCount) * 100;

                return (
                  <div
                    className="score-column"
                    key={score.score}
                  >
                    <div className="score-column__bar-area">
                      <div
                        className="score-column__bar"
                        style={{ height: `${height}%` }}
                        title={`${count} titles scored ${score.score}`}
                      />
                    </div>

                    <span className="score-column__label">
                      {score.score}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}

function MetricCard({
  icon,
  value,
  label,
}: MetricCardProps) {
  return (
    <div className="stats-metric">
      <div className="stats-metric__icon">
        {icon}
      </div>

      <div className="stats-metric__content">
        <span className="stats-metric__value">
          {value}
        </span>

        <span className="stats-metric__label">
          {label}
        </span>
      </div>
    </div>
  );
}