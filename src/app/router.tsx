import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Home from "../pages/Home";
import Anime from "../pages/Anime";
import AnimeDetail from "../pages/Anime/Detail";
import Manga from "../pages/Manga";
import MangaDetail from "../pages/Manga/Detail";
import Search from "../pages/Search";
import Browse from "../pages/Browse";
import Calendar from "../pages/Calendar";
import Statistics from "../pages/Statistics";
import Activity from "../pages/Activity";
import Settings from "../pages/Settings";
import Playback from "../pages/Playback";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "anime",
        element: <Anime />,
      },
      {
        path: "anime/:id",
        element: <AnimeDetail />,
      },
      {
        path: "manga",
        element: <Manga />,
      },
      {
        path: "manga/:id",
        element: <MangaDetail />,
      },
      {
        path: "search",
        element: <Search />,
      },
      {
        path: "browse",
        element: <Browse />,
      },
      {
        path: "calendar",
        element: <Calendar />,
      },
      {
        path: "statistics",
        element: <Statistics />,
      },
      {
        path: "activity",
        element: <Activity />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "playback",
        element: <Playback />,
      }
    ],
  },
]);

export default router;
