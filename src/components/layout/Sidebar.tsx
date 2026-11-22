import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Clapperboard,
  Compass,
  History,
  Home,
  Play,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useNotificationsContext } from "../../context/NotificationContext";
import { useAuth } from "../../hooks/useAuth";
import Logo from "./Logo";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { path: "/", label: "Home", icon: Home, end: true },
      { path: "/browse", label: "Discover", icon: Compass },
    ],
  },
  {
    label: "Library",
    items: [
      { path: "/anime", label: "Anime", icon: Clapperboard },
      { path: "/manga", label: "Manga", icon: BookOpen },
      { path: "/calendar", label: "Calendar", icon: CalendarDays },
      { path: "/statistics", label: "Statistics", icon: BarChart3 },
    ],
  },
  {
    label: "Watch & Social",
    items: [
      { path: "/playback", label: "Playback", icon: Play },
      { path: "/activity", label: "Activity", icon: History },
      { path: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

export default function Sidebar() {
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useNotificationsContext();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Logo className="sidebar__brand-logo" />
        <span className="sidebar__brand-name">Kioku</span>
      </div>

      <nav className="sidebar__nav" aria-label="Primary navigation">
        {navGroups.map((group, groupIndex) => (
          <div className="sidebar__group" key={group.label ?? `group-${groupIndex}`}>
            {group.label && (
              <span className="sidebar__section-label">{group.label}</span>
            )}
            {group.items.map((item) => {
              const showBadge =
                item.path === "/notifications" && isAuthenticated && unreadCount > 0;
              const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);
              const linkLabel = showBadge
                ? `${item.label}, ${unreadCount} unread`
                : item.label;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="sidebar__link"
                  end={item.end}
                  title={linkLabel}
                  aria-label={linkLabel}
                >
                  <item.icon className="sidebar__icon" aria-hidden="true" />
                  <span className="sidebar__label">{item.label}</span>
                  {showBadge && (
                    <>
                      <span className="sidebar__badge" aria-hidden="true">
                        {badgeText}
                      </span>
                      <span className="sidebar__badge-dot" aria-hidden="true" />
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <NavLink to="/settings" className="sidebar__link" title="Settings">
          <Settings className="sidebar__icon" aria-hidden="true" />
          <span className="sidebar__label">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
