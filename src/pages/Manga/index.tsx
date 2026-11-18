import { BookOpen } from "lucide-react";
import { useMangaList } from "../../hooks/useAniList";
import MediaLibrary from "../../components/media/MediaLibrary";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "CURRENT", label: "Reading" },
  { id: "COMPLETED", label: "Completed" },
  { id: "PLANNING", label: "Planning" },
  { id: "PAUSED", label: "Paused" },
  { id: "DROPPED", label: "Dropped" },
  { id: "REPEATING", label: "Repeating" },
];

export default function Manga() {
  return (
    <MediaLibrary
      mediaType="manga"
      title="Manga Library"
      subtitle="Your manga collection"
      icon={<BookOpen size={20} aria-hidden="true" />}
      statusTabs={STATUS_TABS}
      useList={useMangaList}
    />
  );
}
