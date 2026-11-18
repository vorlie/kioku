import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Building2,
  Clock3,
  Film,
  Layers,
  Loader2,
  LogIn,
  PieChart,
  Star,
  Tags,
} from "lucide-react";

import { useAuth } from "../../hooks/useAuth";
import { useViewer } from "../../hooks/useAniList";
import Tabs from "../../components/ui/Tabs";
import PageHeader from "../../components/layout/PageHeader";

type MediaType = "anime" | "manga";

const TYPE_TABS = [
  { id: "anime", label: "Anime" },
  { id: "manga", label: "Manga" },
];

export default function Statistics() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { viewer, isLoading, error } = useViewer();
  const [activeTypeTab, setActiveTypeTab] = useState<MediaType>("anime");

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="statistics-page">
        <PageHeader
          icon={<BarChart3 size={20} />}
          title="Library Insights"
          subtitle="A look at your anime and manga habits"
        />
        <div className="empty-state">
          <div className="empty-state__icon-box">
            <BarChart3 size={24} aria-hidden="true" />
          </div>
          <h2 className="empty-state__title">Connect your AniList account</h2>
          <p className="empty-state__description">
            Sign in to view your library statistics and score distributions.
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

  if (authLoading || isLoading) {
    return (
      <div className="page-state page-state--fullscreen">
        <Loader2 className="page-state__spinner" size={28} aria-hidden="true" />
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
  const scores = stats.scores ?? [];
  const formats = stats.formats ?? [];
  const statuses = stats.statuses ?? [];
  const studios = activeTypeTab === "anime" ? stats.studios ?? [] : [];

  const maxGenreCount = Math.max(
    ...genres.map((genre) => genre.count || 0),
    1,
  );

  const maxScoreCount = Math.max(
    ...scores.map((score) => score.count || 0),
    1,
  );

  const maxFormatCount = Math.max(
    ...formats.map((item) => item.count || 0),
    1,
  );

  const maxStatusCount = Math.max(
    ...statuses.map((item) => item.count || 0),
    1,
  );

  const maxStudioCount = Math.max(
    ...studios.map((item) => item.count || 0),
    1,
  );

  const formatEnumLabel = (value: string) =>
    value
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

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

        {scores.length > 0 && (
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
                  How you rate your {activeTypeTab}.
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

        {formats.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__header">
              <div className="stats-card__icon">
                <Layers size={17} />
              </div>

              <div>
                <h2 className="stats-card__title">Formats</h2>
                <p className="stats-card__description">
                  Breakdown by release format.
                </p>
              </div>
            </div>

            <div className="genre-list">
              {formats.slice(0, 6).map((item) => {
                const count = item.count || 0;
                const width = (count / maxFormatCount) * 100;

                return (
                  <div className="genre-row" key={item.format}>
                    <div className="genre-row__header">
                      <span className="genre-row__name">
                        {formatEnumLabel(item.format)}
                      </span>
                      <span className="genre-row__count">{count}</span>
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

        {statuses.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__header">
              <div className="stats-card__icon">
                <PieChart size={17} />
              </div>

              <div>
                <h2 className="stats-card__title">List statuses</h2>
                <p className="stats-card__description">
                  Distribution across your library.
                </p>
              </div>
            </div>

            <div className="genre-list">
              {statuses.map((item) => {
                const count = item.count || 0;
                const width = (count / maxStatusCount) * 100;

                return (
                  <div className="genre-row" key={item.status}>
                    <div className="genre-row__header">
                      <span className="genre-row__name">
                        {formatEnumLabel(item.status)}
                      </span>
                      <span className="genre-row__count">{count}</span>
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

        {studios.length > 0 && (
          <section className="stats-card">
            <div className="stats-card__header">
              <div className="stats-card__icon">
                <Building2 size={17} />
              </div>

              <div>
                <h2 className="stats-card__title">Top studios</h2>
                <p className="stats-card__description">
                  Animation studios you watch most.
                </p>
              </div>
            </div>

            <div className="genre-list">
              {studios.slice(0, 6).map((item) => {
                const count = item.count || 0;
                const width = (count / maxStudioCount) * 100;

                return (
                  <div className="genre-row" key={item.studio.id}>
                    <div className="genre-row__header">
                      <span className="genre-row__name">
                        {item.studio.name}
                      </span>
                      <span className="genre-row__count">{count}</span>
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