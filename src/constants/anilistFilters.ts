export const ANILIST_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
];

export const ANIME_FORMATS = [
  { id: "TV", label: "TV" },
  { id: "TV_SHORT", label: "TV Short" },
  { id: "MOVIE", label: "Movie" },
  { id: "SPECIAL", label: "Special" },
  { id: "OVA", label: "OVA" },
  { id: "ONA", label: "ONA" },
  { id: "MUSIC", label: "Music" },
];

export const MANGA_FORMATS = [
  { id: "MANGA", label: "Manga" },
  { id: "NOVEL", label: "Light Novel" },
  { id: "ONE_SHOT", label: "One Shot" },
];

export function getCurrentSeason(): { season: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (month >= 1 && month <= 3) return { season: "WINTER", year };
  if (month >= 4 && month <= 6) return { season: "SPRING", year };
  if (month >= 7 && month <= 9) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear() + 1;
  const years: number[] = [];
  for (let y = currentYear; y >= 1980; y--) {
    years.push(y);
  }
  return years;
}
