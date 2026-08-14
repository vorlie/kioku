import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { AiringSchedule } from "../../types/anilist";
import PageHeader from "../layout/PageHeader";

interface AiringCalendarProps {
  schedules: AiringSchedule[];
  isLoading: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Airing now";

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0
      ? `in ${days}d ${remainingHours}h`
      : `in ${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `in ${hours}h ${remainingMinutes}m`
      : `in ${hours}h`;
  }

  return `in ${Math.max(1, minutes)}m`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function AiringCalendar({
  schedules,
  isLoading,
}: AiringCalendarProps) {
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  /*
   * Build the seven days from the schedule itself.
   *
   * This is preferable to simply using Sun → Sat because the API is
   * returning a rolling seven-day window starting from today.
   */
  const calendarDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + index);

      return date;
    });
  }, []);

  const filteredItems = useMemo(() => {
    return schedules
      .filter((item) => {
        const airingDate = new Date(item.airingAt * 1000);
        return isSameDate(airingDate, selectedDate);
      })
      .toSorted((a, b) => a.airingAt - b.airingAt);
  }, [schedules, selectedDate]);

  const selectedDayLabel = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <div className="calendar-container">
        <PageHeader
            icon={<CalendarDays size={20} />}
            title="Release Calendar"
            subtitle="Anime airing over the next seven days"
            meta={selectedDayLabel}
          />

        <div className="calendar-days">
          {Array.from({ length: 7 }).map((_, index) => (
            <div className="calendar-day calendar-day--skeleton" key={index}>
              <span />
              <span />
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="calendar-card calendar-card--skeleton" key={index}>
              <div className="calendar-card__poster" />
              <div className="calendar-card__body">
                <div className="calendar-skeleton-line calendar-skeleton-line--long" />
                <div className="calendar-skeleton-line calendar-skeleton-line--short" />
                <div className="calendar-skeleton-line calendar-skeleton-line--tiny" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <PageHeader
        icon={<CalendarDays size={20} />}
        title="Release Calendar"
        subtitle="Anime airing over the next seven days"
        meta={selectedDayLabel}
      />

      <div className="calendar-days" role="tablist">
        {calendarDays.map((date) => {
          const active = isSameDate(date, selectedDate);
          const isToday = isSameDate(date, today);

          const dayName = DAY_NAMES[date.getDay()];
          const dayNumber = date.getDate();

          return (
            <button
              key={date.toISOString()}
              type="button"
              role="tab"
              aria-selected={active}
              className={`calendar-day ${
                active ? "calendar-day--active" : ""
              } ${isToday ? "calendar-day--today" : ""}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className="calendar-day__name">{dayName}</span>

              <span className="calendar-day__number">{dayNumber}</span>

              {isToday && <span className="calendar-day__indicator" />}
            </button>
          );
        })}
      </div>

      <div className="calendar-content">
        <div className="calendar-content__header">
          <div>
            <h3 className="calendar-content__title">
              {selectedDayLabel}
            </h3>

            <span className="calendar-content__count">
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "release" : "releases"}
            </span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="calendar-empty">
            <div className="calendar-empty__icon">
              <CalendarDays size={24} />
            </div>

            <h3>No releases scheduled</h3>

            <p>
              There are no anime scheduled to air on this day.
            </p>
          </div>
        ) : (
          <div className="calendar-grid">
            {filteredItems.map((item) => {
              const { media, episode, airingAt } = item;

              const title =
                media.title.userPreferred ||
                media.title.english ||
                media.title.romaji ||
                media.title.native ||
                "Unknown title";

              const airingDate = new Date(airingAt * 1000);

              const cover =
                media.coverImage.large ||
                media.coverImage.medium ||
                "";

              /*
               * Some AniList responses may not expose timeUntilAiring
               * depending on the model being used. Calculate it locally
               * as a fallback.
               */
              const timeUntilAiring = Math.floor(
                airingAt - Date.now() / 1000
              );

              const countdown = formatCountdown(timeUntilAiring);

              return (
                <Link
                  key={item.id}
                  to={`/anime/${media.id}`}
                  className="calendar-card"
                >
                  <div className="calendar-card__poster">
                    {cover ? (
                      <img
                        src={cover}
                        alt={title}
                        className="calendar-card__image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="calendar-card__poster-placeholder">
                        <CalendarDays size={22} />
                      </div>
                    )}
                  </div>

                  <div className="calendar-card__body">
                    <div className="calendar-card__meta">
                      <span className="calendar-card__countdown">
                        {countdown}
                      </span>

                      {media.format && (
                        <span className="calendar-card__format">
                          {media.format}
                        </span>
                      )}
                    </div>

                    <h3
                      className="calendar-card__title"
                      title={title}
                    >
                      {title}
                    </h3>

                    <div className="calendar-card__episode">
                      Episode {episode}
                    </div>

                    <div className="calendar-card__date">
                      {formatDate(airingDate)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}