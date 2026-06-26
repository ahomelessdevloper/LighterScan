export function DashboardTooltip({
  active,
  payload,
  label,
  valueLabel,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string;
  valueLabel: string;
  formatValue: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const raw = payload[0]?.value;
  const num = typeof raw === "number" ? raw : Number(raw ?? 0);
  if (!Number.isFinite(num)) return null;

  return (
    <div className="chart-tooltip">
      {label ? <p className="chart-tooltip__label">{label}</p> : null}
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__name">{valueLabel}</span>
        <span className="chart-tooltip__value">{formatValue(num)}</span>
      </div>
    </div>
  );
}