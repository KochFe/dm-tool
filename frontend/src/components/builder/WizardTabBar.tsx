"use client";

interface WizardTabBarProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
  completedTabs: Set<number>;
}

const TAB_LABELS = ["1. Basics", "2. Story & Phases", "3. Locations", "4. Characters"];

export default function WizardTabBar({
  activeTab,
  onTabChange,
  completedTabs,
}: WizardTabBarProps) {
  return (
    <div className="flex border-b border-border">
      {TAB_LABELS.map((label, i) => {
        const isActive = activeTab === i;
        const isCompleted = completedTabs.has(i);
        return (
          <button
            key={i}
            onClick={() => onTabChange(i)}
            className={`px-5 py-3 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {label}
            {isCompleted && !isActive && (
              <span className="ml-1 text-primary">&#10003;</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
