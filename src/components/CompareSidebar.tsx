import { COMPARE_TABS, navigateCompareTab, type CompareTabId } from "../lib/compareNav";
import { VenueDuel } from "./VenueBrand";

interface CompareSidebarProps {
  active: CompareTabId;
}

export function CompareSidebar({ active }: CompareSidebarProps) {
  return (
    <nav className="compare-tabs" aria-label="Compare sections">
      <VenueDuel className="compare-tabs__duel" size="sm" showNames={false} />
      {COMPARE_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`compare-tab ${isActive ? "compare-tab--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => navigateCompareTab(tab.id)}
          >
            <span className="compare-tab__full">{tab.label}</span>
            <span className="compare-tab__short">{tab.short}</span>
          </button>
        );
      })}
    </nav>
  );
}