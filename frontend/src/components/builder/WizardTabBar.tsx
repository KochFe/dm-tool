"use client";

import { useTranslations } from "next-intl";

interface WizardTabBarProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
  completedTabs: Set<number>;
}

const TAB_KEYS = [
  "basicsNumbered",
  "storyNumbered",
  "locationsNumbered",
  "charactersNumbered",
] as const;

export default function WizardTabBar({
  activeTab,
  onTabChange,
  completedTabs,
}: WizardTabBarProps) {
  const t = useTranslations("builder.tabs");
  return (
    <div className="flex border-b border-border">
      {TAB_KEYS.map((key, i) => {
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
            {t(key)}
            {isCompleted && !isActive && (
              <span className="ml-1 text-primary">&#10003;</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
