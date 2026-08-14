# Kioku

A modern desktop client for [AniList](https://anilist.co), built to make managing your anime and manga library feel fast, clean, and native.

Kioku focuses on providing a polished desktop experience for browsing, tracking, and managing your AniList library without relying on the AniList web interface.

## Features

- **Anime library**
  - Browse and filter your anime list
  - Track watching, completed, planning, paused, dropped, and repeating entries
  - Grid and list views
  - Sorting and status filtering

- **Manga library**
  - Browse and manage your manga list
  - Track reading progress and status
  - Grid and list views
  - Sorting and filtering

- **Search**
  - Search AniList for anime and manga
  - Switch between anime and manga results
  - Multiple media viewing modes

- **Dashboard**
  - AniList profile overview
  - Library statistics
  - Favourite anime and manga
  - Currently watching library
  - Quick overview of your AniList activity

- **Media details**
  - Cover and banner artwork
  - Scores, genres, studios, formats, and status
  - Full descriptions
  - Personal progress tracking
  - AniList media relations
  - Quick progress controls

- **Activity (WORK IN PROGRESS)**
  - View your AniList activity and timeline

- **Settings**
  - AniList account management
  - Theme selection
  - Application information

- **Custom themes**
  - AniList Dark
  - AniList Light
  - Catppuccin
  - Espresso
  - Latte
  - OLED / Black

## Tech Stack

- **Tauri 2**
- **React**
- **TypeScript**
- **Rust**
- **AniList GraphQL API**
- **Lucide React**

## Design

Kioku uses a custom design system built around reusable design tokens and component-specific styles.

The interface is designed around:

- Dark, layered surfaces
- Rounded panels and cards
- Consistent spacing and typography
- Configurable accent colors
- Theme-aware semantic colors
- Responsive media grids
- Desktop-first navigation and layouts

The goal is to make Kioku feel like a dedicated media-management application rather than a web wrapper around AniList.

## Project Status

Kioku is currently in active development.

The core AniList integration and library management functionality are being developed alongside an ongoing UI redesign.

Expect things to change while the project is being built.

## Development

Clone the repository and install the dependencies:

```bash
git clone https://github.com/vorlie/kioku.git
cd kioku
npm install
```

Start the development application:

```bash
npm run tauri dev
```

Build a production version:

```bash
npm run tauri build
```

> Development requirements may vary depending on your operating system and Tauri's current requirements.

## AniList

Kioku uses the [AniList GraphQL API](https://docs.anilist.co/) for account, library, media, and activity data.

You need to connect an AniList account from within Kioku to synchronize your personal library.

## License

License information will be added later.
