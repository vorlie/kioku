import { openExternalUrl } from "../../utils/safeUrl";
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
    await openExternalUrl(`https://anilist.co/${mediaType}/${mediaId}`);
  };

  return (
    <button type="button" onClick={handleOpen} className="button-secondary media-detail__action-button">
      <ExternalLink size={16} aria-hidden="true" />
      Open on AniList
    </button>
  );
}