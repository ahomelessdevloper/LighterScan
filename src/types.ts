export interface ExchangeStats {
  code: number;
  total: number;
  order_book_stats: OrderBookStat[];
  daily_usd_volume: number;
  daily_trades_count: number;
}

export interface OrderBookStat {
  symbol: string;
  last_trade_price: number;
  daily_trades_count: number;
  daily_base_token_volume: number;
  daily_quote_token_volume: number;
  daily_price_change: number;
}

export interface ExchangeMetric {
  timestamp: number; // unix seconds
  data: number;
}

export interface ExchangeMetricsResponse {
  code: number;
  metrics: ExchangeMetric[];
}

export type Period = 'h' | 'd' | 'w' | 'm' | 'q' | 'y' | 'all';

export type FlowMetricKind = 'inflow' | 'outflow';

export const FLOW_PERIODS: { value: Period; label: string }[] = [
  { value: 'w', label: '7D' },
  { value: 'm', label: '30D' },
  { value: 'q', label: '90D' },
  { value: 'y', label: '1Y' },
  { value: 'all', label: 'All' },
];
export type MetricKind =
  | 'volume'
  | 'trade_count'
  | 'open_interest'
  | 'tps'
  | 'active_account_count'
  | 'account_count'
  | 'liquidation_volume'
  | 'maker_fee'
  | 'taker_fee'
  | 'withdraw_fee'
  | 'buyback'
  | 'buyback_usdc'
  | 'fee_revenue';

export type DashboardMetricKind = MetricKind | 'capital_flow';

const LONG_METRIC_PERIODS: Period[] = ['w', 'm', 'q', 'y', 'all'];
const TPS_METRIC_PERIODS: Period[] = ['h', 'd', 'w'];

/** Periods supported by Lighter exchangeMetrics per kind (verified against API). */
export const METRIC_PERIOD_SUPPORT: Record<MetricKind, Period[]> = {
  volume: LONG_METRIC_PERIODS,
  trade_count: LONG_METRIC_PERIODS,
  open_interest: LONG_METRIC_PERIODS,
  tps: TPS_METRIC_PERIODS,
  active_account_count: LONG_METRIC_PERIODS,
  account_count: LONG_METRIC_PERIODS,
  liquidation_volume: LONG_METRIC_PERIODS,
  maker_fee: LONG_METRIC_PERIODS,
  taker_fee: LONG_METRIC_PERIODS,
  withdraw_fee: LONG_METRIC_PERIODS,
  buyback: LONG_METRIC_PERIODS,
  buyback_usdc: LONG_METRIC_PERIODS,
  fee_revenue: LONG_METRIC_PERIODS,
};

export function periodsForMetric(kind: DashboardMetricKind): { value: Period; label: string }[] {
  if (kind === 'capital_flow') return FLOW_PERIODS;
  const allowed = new Set(METRIC_PERIOD_SUPPORT[kind]);
  return PERIODS.filter((p) => allowed.has(p.value));
}

export function defaultPeriodForMetric(kind: DashboardMetricKind): Period {
  const options = periodsForMetric(kind);
  const preferred = options.find((p) => p.value === 'm') ?? options.find((p) => p.value === 'w');
  return preferred?.value ?? options[0]?.value ?? 'm';
}

export function isPeriodSupportedForMetric(kind: DashboardMetricKind, period: Period): boolean {
  return periodsForMetric(kind).some((p) => p.value === period);
}

export const METRIC_KINDS: { value: MetricKind; label: string; supportsMarket: boolean }[] = [
  { value: 'volume', label: 'Volume (USD)', supportsMarket: true },
  { value: 'trade_count', label: 'Trade Count', supportsMarket: true },
  { value: 'open_interest', label: 'Open Interest', supportsMarket: false },
  { value: 'tps', label: 'Transactions per Second', supportsMarket: false },
  { value: 'active_account_count', label: 'Active Accounts', supportsMarket: false },
  { value: 'account_count', label: 'Total Accounts', supportsMarket: false },
  { value: 'liquidation_volume', label: 'Liquidation Volume', supportsMarket: false },
  { value: 'maker_fee', label: 'Maker Fee', supportsMarket: false },
  { value: 'taker_fee', label: 'Taker Fee', supportsMarket: false },
  { value: 'withdraw_fee', label: 'Withdraw Fee', supportsMarket: false },
  { value: 'buyback', label: '$LIT Buybacks', supportsMarket: false },
  { value: 'buyback_usdc', label: 'Buyback (USDC)', supportsMarket: false },
  { value: 'fee_revenue', label: 'Revenue', supportsMarket: false },
];

export const PERIODS: { value: Period; label: string }[] = [
  { value: 'h', label: '1H' },
  { value: 'd', label: '24H' },
  { value: 'w', label: '7D' },
  { value: 'm', label: '30D' },
  { value: 'q', label: '90D' },
  { value: 'y', label: '1Y' },
  { value: 'all', label: 'All' },
];

