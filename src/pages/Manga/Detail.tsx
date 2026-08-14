import { useParams, useNavigate } from "react-router-dom";
import { useManga, useMangaList, useUpdateEntry } from "../../hooks/useAniList";
import MediaDetail from "../../components/media/MediaDetail";

export default function MangaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { manga, isLoading, error } = useManga(Number(id));
  const { list } = useMangaList();
  const { updateEntry, isLoading: isUpdating } = useUpdateEntry();
  if (isLoading)
    return (
      <div className="page-state page-state--fullscreen">
        Loading manga details...
      </div>
    );
  if (error || !manga)
    return (
      <div className="empty-state">
        <div className="error-message section__title">
          {error || "Manga not found"}
        </div>
        <button className="button-primary" onClick={() => navigate("/manga")}>
          Back to Library
        </button>
      </div>
    );
  return (
    <MediaDetail
      media={manga}
      list={list}
      isLoading={isLoading}
      error={error}
      mediaType="manga"
      progressLabel="Chapter"
      progressTotal={manga?.chapters}
      meta={[
        manga?.chapters && `${manga.chapters} chapters`,
        manga?.volumes && `${manga.volumes} volumes`,
        manga?.status,
        manga?.format,
      ]}
      updateEntry={updateEntry}
      isUpdating={isUpdating}
      backRoute="/manga"
    />
  );
}
