import { useParams } from "react-router-dom";
import { useAnime, useAnimeList, useUpdateEntry } from "../../hooks/useAniList";
import MediaDetail from "../../components/media/MediaDetail";

export default function AnimeDetail() {
  const { id } = useParams<{ id: string }>();

  const { anime, isLoading, error } = useAnime(Number(id));
  const { list } = useAnimeList();
  const { updateEntry, isLoading: isUpdating } = useUpdateEntry();

  if (!anime && !isLoading) {
    return (
      <MediaDetail
        media={anime}
        list={list}
        isLoading={isLoading}
        error={error}
        mediaType="anime"
        progressLabel="Episode"
        backRoute="/anime"
        progressTotal={undefined}
        meta={[]}
        updateEntry={updateEntry}
        isUpdating={isUpdating}
      />
    );
  }

  return (
    <MediaDetail
      media={anime}
      list={list}
      isLoading={isLoading}
      error={error}
      mediaType="anime"
      progressLabel="Episode"
      progressTotal={anime?.episodes}
      meta={[
        anime?.episodes && `${anime.episodes} episodes`,
        anime?.duration && `${anime.duration} min`,
        anime?.status,
        anime?.format,
        anime?.season &&
          anime?.seasonYear &&
          `${anime.season} ${anime.seasonYear}`,
      ]}
      updateEntry={updateEntry}
      isUpdating={isUpdating}
      backRoute="/anime"
    />
  );
}
