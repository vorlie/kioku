// pages/calendar/Calendar.tsx

import { useEffect, useState } from "react";
import AiringCalendar from "../../components/calendar/AiringCalendar";
import { AiringSchedule, PageInfo } from "../../types/anilist";
import { invoke } from "@tauri-apps/api/core";

interface AiringSchedulePage {
  pageInfo: PageInfo;
  airingSchedules: AiringSchedule[];
}

export default function Calendar() {
  const [schedules, setSchedules] = useState<AiringSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeeklySchedule() {
      try {
        setIsLoading(true);
        
        // 1. Calculate boundaries for the current rolling week (7 days)
        const now = new Date();
        
        // Set start to the beginning of today (00:00:00)
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startTimeUnix = Math.floor(start.getTime() / 1000);
        
        // Set end to 7 days from now at the very end of the day (23:59:59)
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        const endTimeUnix = Math.floor(end.getTime() / 1000);

        const data = await invoke<AiringSchedulePage>("fetch_airing_calendar", {
          startTime: startTimeUnix,
          endTime: endTimeUnix,
        });

        console.log("Airing calendar response:", data);

        setSchedules(data.airingSchedules);
      } catch (err) {
        console.error("Failed to fetch airing schedules:", err);
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeeklySchedule();
  }, []);

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