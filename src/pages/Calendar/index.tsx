import { useMemo } from "react";
import AiringCalendar from "../../components/calendar/AiringCalendar";
import { useAiringCalendar } from "../../hooks/useAniList";

export default function Calendar() {
  const { startTime, endTime } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startUnix = Math.floor(start.getTime() / 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const endUnix = Math.floor(end.getTime() / 1000);
    return { startTime: startUnix, endTime: endUnix };
  }, []);

  const { schedules, isLoading, error } = useAiringCalendar(startTime, endTime);

  return (
    <div className="page-container">
      {error ? (
        <div className="empty-state">
          <div className="error-message section__title">{error}</div>
        </div>
      ) : (
        <AiringCalendar schedules={schedules} isLoading={isLoading} />
      )}
    </div>
  );
}
