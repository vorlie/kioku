interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`tabs__button${activeTab === tab.id ? " tabs__button--active" : ""}`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="tabs__count">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
