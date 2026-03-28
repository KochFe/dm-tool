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
    <div className="flex border-b border-gray-700">
      {TAB_LABELS.map((label, i) => {
        const isActive = activeTab === i;
        const isCompleted = completedTabs.has(i);
        return (
          <button
            key={i}
            onClick={() => onTabChange(i)}
            className={`px-5 py-3 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
              isActive
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
            }`}
          >
            {label}
            {isCompleted && !isActive && (
              <span className="ml-1 text-amber-500">&#10003;</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
