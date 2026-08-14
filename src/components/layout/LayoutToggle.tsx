import { LayoutGrid, List } from "lucide-react";

export type ViewMode = "grid" | "compact";

interface LayoutToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function LayoutToggle({ viewMode, onViewModeChange }: LayoutToggleProps) {
  return (
    <div className="tabs--icons">
      <button
        className={`tabs__icon ${viewMode === "grid" ? "tabs__icon--active" : ""}`}
        onClick={() => onViewModeChange("grid")}
        title="Grid View"
        type="button"
      >
        <LayoutGrid size={16} />
      </button>
      <button
        className={`tabs__icon ${viewMode === "compact" ? "tabs__icon--active" : ""}`}
        onClick={() => onViewModeChange("compact")}
        title="Compact View"
        type="button"
      >
        <List size={16} />
      </button>
    </div>
  );
}