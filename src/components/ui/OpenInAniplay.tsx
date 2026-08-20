import { Play } from "lucide-react";

interface OpenInAniPlayProps {
  mediaId: number;
}

export default function OpenInAniPlay({
  mediaId,
}: OpenInAniPlayProps) {
  const open = () => {
    window.location.href = `aniplay://anime/${mediaId}`;
  };

  return (
    <button onClick={open} className="button-primary margin-top">
      <Play size={16} />
      Open in AniPlay
    </button>
  );
}