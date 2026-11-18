import { Film } from "lucide-react";
import { useAnimeList } from "../../hooks/useAniList";
import MediaLibrary from "../../components/media/MediaLibrary";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "CURRENT", label: "Watching" },
  { id: "COMPLETED", label: "Completed" },
  { id: "PLANNING", label: "Planning" },
  { id: "PAUSED", label: "Paused" },
  { id: "DROPPED", label: "Dropped" },
  { id: "REPEATING", label: "Repeating" },
];

export default function Anime() {
  return (
    <MediaLibrary
      mediaType="anime"
      title="Anime Library"
      subtitle="Your anime collection"
      icon={<Film size={20} aria-hidden="true" />}
      statusTabs={STATUS_TABS}
      useList={useAnimeList}
    />
  );
}
