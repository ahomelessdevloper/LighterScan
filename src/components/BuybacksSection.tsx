import { useCallback, useEffect, useState } from "react";
import {
  CompareLegend,
  MetricBarCard,
  RatioLineCard,
  useCompareCharts,
} from "./compare/shared";
import {
  buildBuybackBarMetrics,
  buildBuybackPercentCharts,
  fetchBuybacksDashboard,
  type BuybackPercentChart,
} from "../lib/buybacks";
import { LoadingState } from "./LoadingState";
import type { StatValue } from "../types/liveStats";

export function BuybacksSection() {
  const { tickSize, barHeight, isMobile } = useCompareCharts(null);
  const percentChartHeight = isMobile ? 200 : 230;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barMetrics, setBarMetrics] = useState<StatValue[]>([]);
  const [percentCharts, setPercentCharts] = useState<BuybackPercentChart[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const year = new Date().getUTCFullYear();
      const payload = await fetchBuybacksDashboard(year);
      setBarMetrics(buildBuybackBarMetrics(payload));
      setPercentCharts(buildBuybackPercentCharts(payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load buybacks");
      setBarMetrics([]);
      setPercentCharts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const failsafe = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 15_000);

    void loadData().finally(() => {
      if (!cancelled) window.clearTimeout(failsafe);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
    };
  }, [loadData]);

  if (loading) {
    return <LoadingState variant="page" label="Loading buybacks…" />;
  }

  return (
    <>
      {error ? <div className="buyback-error mb-3">{error}</div> : null}
      <CompareLegend />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {barMetrics.map((metric) => (
          <MetricBarCard
            key={metric.label}
            metric={metric}
            height={barHeight}
            tickSize={tickSize}
          />
        ))}
      </div>
      {percentCharts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mt-2.5 sm:mt-3">
          {percentCharts.map((chart) => (
            <RatioLineCard
              key={chart.label}
              label={chart.label}
              series={chart.series}
              latest={chart.latest}
              format="percent"
              height={percentChartHeight}
              tickSize={tickSize}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}