import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "compact";

interface LayoutToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function LayoutToggle({ viewMode, onViewModeChange }: LayoutToggleProps) {
  return (
    <div className="tabs--icons" role="group" aria-label="View layout">
      <button
        className={`tabs__icon ${viewMode === "grid" ? "tabs__icon--active" : ""}`}
        onClick={() => onViewModeChange("grid")}
        aria-label="Grid view"
        aria-pressed={viewMode === "grid"}
        title="Grid View"
        type="button"
      >
        <LayoutGrid size={16} aria-hidden="true" />
      </button>
      <button
        className={`tabs__icon ${viewMode === "compact" ? "tabs__icon--active" : ""}`}
        onClick={() => onViewModeChange("compact")}
        aria-label="Compact view"
        aria-pressed={viewMode === "compact"}
        title="Compact View"
        type="button"
      >
        <List size={16} aria-hidden="true" />
      </button>
    </div>
  );
}