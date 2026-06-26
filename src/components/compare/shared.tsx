import { useMemo, useRef } from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ChartDownloadButton } from "../ChartDownloadButton";
import { chartDownloadFilename } from "../../lib/chartDownload";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate, formatStatValue, ratioChartDefinitions } from "../../lib/compareFormat";
import type { LiveComparisonPayload, StatValue, TimeSeriesPoint } from "../../types/liveStats";
import { VenueLegendItem, VenueLogo, venueDisplayName } from "../VenueBrand";

export const LIGHTER_COLOR = "#22d3ee";
export const HYPERLIQUID_COLOR = "#4ade80";

export const BAR_CURSOR = { fill: "rgba(34, 211, 238, 0.06)", stroke: "transparent" };
export const CHART_CURSOR = {
  stroke: "#32354a",
  strokeWidth: 1,
  strokeDasharray: "4 4",
  fill: "rgba(34, 211, 238, 0.05)",
};

export function CompareTooltip({
  active,
  payload,
  label,
  format = "number",
  tokens,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  format?: StatValue["format"];
  tokens?: StatValue["tokens"];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="compare-tooltip">
      {label && <p className="compare-tooltip__label">{label}</p>}
      {payload.map((entry, i) => {
        const rawName =
          (entry as { payload?: { name?: string } }).payload?.name ?? entry.name;
        const name = venueDisplayName(rawName);
        const tokenSymbol =
          rawName === "Lighter" ? tokens?.lighter : tokens?.hyperliquid;
        return (
          <p key={`${rawName}-${i}`} className="compare-tooltip__row" style={{ color: entry.color }}>
            <span>{name}</span>
            <span className="compare-tooltip__value">
              {formatStatValue(entry.value ?? null, format, tokenSymbol)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

export function CompareLegend() {
  return (
    <div className="venue-legend-row mb-3 sm:mb-4">
      <VenueLegendItem venue="lighter" />
      <VenueLegendItem venue="hyperliquid" />
    </div>
  );
}

export function ComparePageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="compare-page-head mb-4 sm:mb-5">
      <h1 className="compare-page-head__title">{title}</h1>
      {subtitle && <p className="compare-page-head__sub">{subtitle}</p>}
    </header>
  );
}

export function ComingSoonPanel({ title }: { title: string }) {
  return (
    <article className="compare-soon card p-6 sm:p-8">
      <h2 className="compare-soon__title">{title}</h2>
    </article>
  );
}

export { useIsMobile } from "../../hooks/useIsMobile";

export function availableMetrics(metrics: StatValue[]): StatValue[] {
  return metrics.filter((m) => m.lighter != null || m.hyperliquid != null);
}

function isMobileTickWidth(tickSize: number) {
  return tickSize <= 8 ? 42 : 56;
}

function MetricValues({ metric }: { metric: StatValue }) {
  return (
    <div className="metric-venue-values mb-2">
      <span className="metric-venue-values__side metric-venue-values__side--lighter">
        <VenueLogo venue="lighter" size="xs" />
        <span className="metric-venue-values__name">Lighter</span>
        <span className="metric-venue-values__val">
          {formatStatValue(metric.lighter, metric.format, metric.tokens?.lighter)}
        </span>
      </span>
      <span className="metric-venue-values__side metric-venue-values__side--hyperliquid">
        <VenueLogo venue="hyperliquid" size="xs" />
        <span className="metric-venue-values__name">Hyperliquid</span>
        <span className="metric-venue-values__val">
          {formatStatValue(metric.hyperliquid, metric.format, metric.tokens?.hyperliquid)}
        </span>
      </span>
    </div>
  );
}

export function MetricBarCard({
  metric,
  height,
  tickSize,
  filename,
}: {
  metric: StatValue;
  height: number;
  tickSize: number;
  filename?: string;
}) {
  const captureRef = useRef<HTMLElement>(null);
  const data = [
    { name: "Lighter", value: metric.lighter ?? 0, fill: LIGHTER_COLOR },
    { name: "Hyperliquid", value: metric.hyperliquid ?? 0, fill: HYPERLIQUID_COLOR },
  ];

  return (
    <article ref={captureRef} className="card p-2.5 sm:p-3 downloadable-block">
      <ChartDownloadButton
        targetRef={captureRef}
        filename={filename ?? chartDownloadFilename(metric.label)}
        className="downloadable-block__dl"
      />
      <h4 className="text-xs sm:text-sm font-normal text-white mb-1 pr-8">{metric.label}</h4>
      <MetricValues metric={metric} />
      <div className="compare-chart chart-surface" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 2, right: 2, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#24263a" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#71717a", fontSize: tickSize }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: tickSize }}
              tickLine={false}
              axisLine={false}
              width={isMobileTickWidth(tickSize)}
              tickFormatter={(v) =>
                formatStatValue(
                  Number(v),
                  metric.format,
                  metric.format === "token" ? "" : undefined
                )
              }
            />
            <Tooltip
              content={<CompareTooltip format={metric.format} tokens={metric.tokens} />}
              cursor={BAR_CURSOR}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} activeBar={false}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function lineTickFormatter(value: number, format: StatValue["format"]): string {
  if (format === "percent") return `${Number(value).toFixed(2)}%`;
  if (format === "ratio") return `${Number(value).toFixed(1)}x`;
  return formatStatValue(Number(value), format);
}

function lineChartValues(series: TimeSeriesPoint[]): number[] {
  return series
    .flatMap((point) => [point.lighter, point.hyperliquid])
    .filter((value): value is number => value != null && Number.isFinite(value));
}

function lineChartYDomain(
  series: TimeSeriesPoint[],
  format: StatValue["format"]
): [number, number] | undefined {
  const values = lineChartValues(series);
  if (!values.length) return undefined;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.abs(max) * 0.08, format === "percent" ? 0.15 : 0.5);
  const pad = span * 0.14;
  const floor = format === "percent" || format === "ratio" ? Math.max(0, min - pad) : min - pad;

  return [floor, max + pad];
}

const LINE_CHART_MARGIN = { top: 14, right: 18, left: 2, bottom: 10 };

type LineChartRow = {
  time: string;
  lighter: number | null;
  hyperliquid: number | null;
};

type LineDotProps = {
  cx?: number;
  cy?: number;
  index?: number;
  value?: number;
};

function makeChangeDot(
  color: string,
  dataKey: "lighter" | "hyperliquid",
  data: LineChartRow[]
) {
  return (props: LineDotProps) => {
    const { cx, cy, index, value } = props;
    if (cx == null || cy == null || index == null || value == null || !Number.isFinite(value)) {
      return null;
    }

    const prev = index > 0 ? data[index - 1]?.[dataKey] : null;
    if (prev != null && prev === value) return null;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        fill={color}
        stroke="#0a0b12"
        strokeWidth={1}
      />
    );
  };
}

export function RatioLineCard({
  label,
  series,
  height,
  tickSize,
  filename,
  format = "ratio",
  latest,
}: {
  label: string;
  series: TimeSeriesPoint[];
  height: number;
  tickSize: number;
  filename?: string;
  format?: StatValue["format"];
  latest?: StatValue;
}) {
  const captureRef = useRef<HTMLElement>(null);
  const chartData = useMemo(
    () =>
      (series ?? []).map((point) => ({
        time: formatChartDate(point.timestamp),
        lighter: point.lighter,
        hyperliquid: point.hyperliquid,
      })),
    [series]
  );
  const yDomain = useMemo(() => lineChartYDomain(series, format), [series, format]);
  const lighterDot = useMemo(() => makeChangeDot(LIGHTER_COLOR, "lighter", chartData), [chartData]);
  const hyperliquidDot = useMemo(
    () => makeChangeDot(HYPERLIQUID_COLOR, "hyperliquid", chartData),
    [chartData]
  );

  return (
    <article ref={captureRef} className="card p-2.5 sm:p-3 downloadable-block">
      <ChartDownloadButton
        targetRef={captureRef}
        filename={filename ?? chartDownloadFilename(label)}
        className="downloadable-block__dl"
      />
      <h4 className="text-xs sm:text-sm font-normal text-white mb-1 pr-8">{label}</h4>
      {latest ? <MetricValues metric={latest} /> : null}
      <div className="compare-chart compare-chart--line chart-surface" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={LINE_CHART_MARGIN}>
            <CartesianGrid strokeDasharray="2 2" stroke="#24263a" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "#71717a", fontSize: tickSize }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              padding={{ left: 16, right: 16 }}
              dy={4}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: tickSize }}
              tickLine={false}
              axisLine={false}
              width={isMobileTickWidth(tickSize) + 6}
              domain={yDomain}
              tickFormatter={(v) => lineTickFormatter(Number(v), format)}
              tickCount={format === "percent" ? 5 : 6}
            />
            <Tooltip content={<CompareTooltip format={format} />} cursor={CHART_CURSOR} />
            <Line
              type="monotone"
              dataKey="lighter"
              name="lighter"
              stroke={LIGHTER_COLOR}
              strokeWidth={2}
              dot={lighterDot}
              activeDot={{ r: 4, stroke: "#0a0b12", strokeWidth: 1, fill: LIGHTER_COLOR }}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="hyperliquid"
              name="hyperliquid"
              stroke={HYPERLIQUID_COLOR}
              strokeWidth={2}
              dot={hyperliquidDot}
              activeDot={{ r: 4, stroke: "#0a0b12", strokeWidth: 1, fill: HYPERLIQUID_COLOR }}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function FeesAreaChart({
  payload,
  height,
  tickSize,
}: {
  payload: LiveComparisonPayload;
  height: number;
  tickSize: number;
}) {
  const feesChartData = useMemo(
    () =>
      payload.volume_chart.map((point) => ({
        time: formatChartDate(point.timestamp),
        lighter: point.lighter,
        hyperliquid: point.hyperliquid,
      })),
    [payload]
  );

  return (
    <article className="card p-2.5 sm:p-3">
      <div className="compare-chart chart-surface" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={feesChartData} margin={{ top: 2, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="lighterFees" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LIGHTER_COLOR} stopOpacity={0.4} />
                <stop offset="100%" stopColor={LIGHTER_COLOR} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="hyperFees" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HYPERLIQUID_COLOR} stopOpacity={0.4} />
                <stop offset="100%" stopColor={HYPERLIQUID_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#24263a" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#71717a", fontSize: tickSize }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: tickSize }}
              tickLine={false}
              axisLine={false}
              width={isMobileTickWidth(tickSize)}
              tickFormatter={(v) => formatStatValue(Number(v), "currency")}
            />
            <Tooltip content={<CompareTooltip format="currency" />} cursor={CHART_CURSOR} />
            <Area
              type="monotone"
              dataKey="lighter"
              name="lighter"
              stroke={LIGHTER_COLOR}
              fill="url(#lighterFees)"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="hyperliquid"
              name="hyperliquid"
              stroke={HYPERLIQUID_COLOR}
              fill="url(#hyperFees)"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export function useCompareCharts(payload: LiveComparisonPayload | null) {
  const isMobile = useIsMobile();
  const barHeight = isMobile ? 150 : 160;
  const lineHeight = isMobile ? 190 : 200;
  const areaHeight = isMobile ? 220 : 240;
  const tickSize = isMobile ? 10 : 10;

  const headline = useMemo(
    () => (payload ? availableMetrics(payload.headline) : []),
    [payload]
  );

  const valuationBars = useMemo(() => {
    if (!payload?.valuation) return [];
    return availableMetrics([payload.valuation.market_cap, payload.valuation.fdv]);
  }, [payload]);

  const ratioCharts = useMemo(() => ratioChartDefinitions(payload?.valuation), [payload]);

  return {
    isMobile,
    barHeight,
    lineHeight,
    areaHeight,
    tickSize,
    headline,
    valuationBars,
    ratioCharts,
  };
}