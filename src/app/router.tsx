import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Layout from "../components/layout/Layout";

const Home = lazy(() => import("../pages/Home"));
const Anime = lazy(() => import("../pages/Anime"));
const AnimeDetail = lazy(() => import("../pages/Anime/Detail"));
const Manga = lazy(() => import("../pages/Manga"));
const MangaDetail = lazy(() => import("../pages/Manga/Detail"));
const Browse = lazy(() => import("../pages/Browse"));
const Calendar = lazy(() => import("../pages/Calendar"));
const Statistics = lazy(() => import("../pages/Statistics"));
const Activity = lazy(() => import("../pages/Activity"));
const Settings = lazy(() => import("../pages/Settings"));
const Playback = lazy(() => import("../pages/Playback"));

function RouteFallback() {
  return (
    <div className="page-state page-state--fullscreen">
      <Loader2 className="page-state__spinner" size={28} aria-hidden="true" />
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: withSuspense(<Home />),
      },
      {
        path: "anime",
        element: withSuspense(<Anime />),
      },
      {
        path: "anime/:id",
        element: withSuspense(<AnimeDetail />),
      },
      {
        path: "manga",
        element: withSuspense(<Manga />),
      },
      {
        path: "manga/:id",
        element: withSuspense(<MangaDetail />),
      },
      {
        path: "search",
        element: <Navigate to="/browse" replace />,
      },
      {
        path: "browse",
        element: withSuspense(<Browse />),
      },
      {
        path: "calendar",
        element: withSuspense(<Calendar />),
      },
      {
        path: "statistics",
        element: withSuspense(<Statistics />),
      },
      {
        path: "activity",
        element: withSuspense(<Activity />),
      },
      {
        path: "settings",
        element: withSuspense(<Settings />),
      },
      {
        path: "playback",
        element: withSuspense(<Playback />),
      },
    ],
  },
]);

export default router;
