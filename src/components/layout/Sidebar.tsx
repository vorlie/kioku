import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Clapperboard,
  Compass,
  History,
  Home,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

const navItems: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/", label: "Home", icon: Home },
    { path: "/search", label: "Search", icon: Search },
  { path: "/anime", label: "Anime", icon: Clapperboard },
  { path: "/manga", label: "Manga", icon: BookOpen },
  { path: "/browse", label: "Browse", icon: Compass },
  { path: "/calendar", label: "Calendar", icon: CalendarDays },
  { path: "/statistics", label: "Statistics", icon: BarChart3 },
  { path: "/activity", label: "Activity", icon: History },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} className="sidebar__link">
            <item.icon className="sidebar__icon" aria-hidden="true" />
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
