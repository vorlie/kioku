import { open } from "@tauri-apps/plugin-shell";
import { ExternalLink } from "lucide-react";

interface OpenInAniListProps {
  mediaId: number;
  mediaType: "anime" | "manga";
}

export default function OpenInAniList({
  mediaId,
  mediaType,
}: OpenInAniListProps) {
  const handleOpen = async () => {
    await open(`https://anilist.co/${mediaType}/${mediaId}`);
  };

  return (
    <button onClick={handleOpen} className="button-primary margin-top">
      <ExternalLink size={16} />
      Open on AniList
    </button>
  );
}