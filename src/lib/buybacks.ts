import type { StatValue, TimeSeriesPoint } from "../types/liveStats";

const BUYBACK_API_PROXY = "/buyback-api";
const BUYBACK_API_DIRECT = "https://lighter-vs-hyperliquid.vercel.app/api";
const FETCH_TIMEOUT_MS = 10_000;

export interface BuybackSummaryResponse {
  base_asset: string;
  year: number;
  market_cap?: { usd?: number };
  percent_market_cap_bought?: number;
  percent_supply_bought?: number;
  summary?: {
    total_base?: number;
    total_quote?: number;
  };
}

export interface BuybackMarketHistory {
  lighterCirculatingSupply: number | null;
  lighterFdvSupply: number | null;
  hypeCirculatingSupply: number | null;
  hypeFdvSupply: number | null;
  latestLighterMcap: number | null;
  latestHypeMcap: number | null;
  latestLighterFdv: number | null;
  latestHypeFdv: number | null;
}

export interface BuybackDailyRow {
  date: string;
  base_amount: number;
  quote_amount: number;
  timestamp?: number;
}

export interface BuybackDailyResponse {
  base_asset: string;
  year: number;
  days: number;
  rows: BuybackDailyRow[];
}

export interface BuybacksDashboardPayload {
  year: number;
  days: number;
  summary: { lit: BuybackSummaryResponse | null; hype: BuybackSummaryResponse | null };
  daily: { lit: BuybackDailyResponse | null; hype: BuybackDailyResponse | null };
  market: BuybackMarketHistory | null;
}

export interface BuybackPercentChart {
  label: string;
  series: TimeSeriesPoint[];
  latest: StatValue;
}

interface CoinGeckoCoin {
  market_data?: {
    circulating_supply?: number;
    total_supply?: number;
    max_supply?: number;
    current_price?: { usd?: number };
    market_cap?: { usd?: number };
  };
}

async function fetchJson<T>(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok || (payload as { error?: string }).error) {
      throw new Error((payload as { error?: string }).error || `HTTP ${res.status}`);
    }
    return payload;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchBuybackApi<T>(path: string): Promise<T> {
  try {
    return await fetchJson<T>(`${BUYBACK_API_PROXY}${path}`);
  } catch {
    return fetchJson<T>(`${BUYBACK_API_DIRECT}${path}`);
  }
}

async function fetchBuybackSummary(
  asset: string,
  year: number,
  days: number
): Promise<BuybackSummaryResponse> {
  const params = new URLSearchParams({
    base_asset: asset,
    year: String(year),
    days: String(days),
  });
  return fetchBuybackApi<BuybackSummaryResponse>(`/buybacks-summary?${params}`);
}

async function fetchBuybackDaily(
  asset: string,
  year: number,
  days: number
): Promise<BuybackDailyResponse> {
  const params = new URLSearchParams({
    base_asset: asset,
    year: String(year),
    days: String(days),
  });
  return fetchBuybackApi<BuybackDailyResponse>(`/buybacks-daily?${params}`);
}

async function fetchCoinGeckoCoin(coinId: string): Promise<CoinGeckoCoin> {
  try {
    return await fetchJson<CoinGeckoCoin>(
      `/coingecko-api/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );
  } catch {
    return {};
  }
}

function fdvFromCoin(coin: CoinGeckoCoin): number | null {
  const supply = coin.market_data?.max_supply ?? coin.market_data?.total_supply ?? null;
  const price = coin.market_data?.current_price?.usd ?? null;
  if (supply == null || price == null || supply <= 0 || price <= 0) return null;
  return supply * price;
}

export async function fetchBuybackMarketHistory(): Promise<BuybackMarketHistory> {
  const [lighterCoin, hypeCoin] = await Promise.all([
    fetchCoinGeckoCoin("lighter"),
    fetchCoinGeckoCoin("hyperliquid"),
  ]);

  const lighterTotal =
    lighterCoin.market_data?.max_supply ?? lighterCoin.market_data?.total_supply ?? null;
  const hypeTotal = hypeCoin.market_data?.max_supply ?? hypeCoin.market_data?.total_supply ?? null;

  return {
    lighterCirculatingSupply: lighterCoin.market_data?.circulating_supply ?? null,
    lighterFdvSupply: lighterTotal,
    hypeCirculatingSupply: hypeCoin.market_data?.circulating_supply ?? null,
    hypeFdvSupply: hypeTotal,
    latestLighterMcap: lighterCoin.market_data?.market_cap?.usd ?? null,
    latestHypeMcap: hypeCoin.market_data?.market_cap?.usd ?? null,
    latestLighterFdv: fdvFromCoin(lighterCoin),
    latestHypeFdv: fdvFromCoin(hypeCoin),
  };
}

export async function fetchBuybacksDashboard(
  year: number,
  days = 365
): Promise<BuybacksDashboardPayload> {
  const [litSummary, hypeSummary, litDaily, hypeDaily, market] = await Promise.all([
    fetchBuybackSummary("LIT", year, days).catch(() => null),
    fetchBuybackSummary("HYPE", year, days).catch(() => null),
    fetchBuybackDaily("LIT", year, days).catch(() => null),
    fetchBuybackDaily("HYPE", year, days).catch(() => null),
    fetchBuybackMarketHistory().catch(() => null),
  ]);

  return {
    year,
    days,
    summary: { lit: litSummary, hype: hypeSummary },
    daily: { lit: litDaily, hype: hypeDaily },
    market,
  };
}

function pctOfBase(base: number | null | undefined, whole: number | null | undefined): number | null {
  if (base == null || whole == null || whole <= 0 || !Number.isFinite(base)) return null;
  return (base / whole) * 100;
}

function pctOfQuote(
  quote: number | null | undefined,
  valuation: number | null | undefined
): number | null {
  if (quote == null || valuation == null || valuation <= 0 || !Number.isFinite(quote)) return null;
  return (quote / valuation) * 100;
}

function rowTimestamp(row: BuybackDailyRow): number {
  if (row.timestamp != null && Number.isFinite(row.timestamp)) {
    return Math.floor(row.timestamp);
  }
  return Math.floor(Date.parse(`${row.date}T00:00:00Z`) / 1000);
}

function buildCumulativePercentMap(
  rows: BuybackDailyRow[] | undefined,
  compute: (cumBase: number, cumQuote: number) => number | null
): Map<number, number | null> {
  const sorted = [...(rows ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const result = new Map<number, number | null>();
  let cumBase = 0;
  let cumQuote = 0;

  for (const row of sorted) {
    cumBase += row.base_amount;
    cumQuote += row.quote_amount;
    result.set(rowTimestamp(row), compute(cumBase, cumQuote));
  }

  return result;
}

function mergePercentSeries(
  litMap: Map<number, number | null>,
  hypeMap: Map<number, number | null>
): TimeSeriesPoint[] {
  const timestamps = [...new Set([...litMap.keys(), ...hypeMap.keys()])].sort((a, b) => a - b);
  let lastLit: number | null = null;
  let lastHype: number | null = null;

  return timestamps.map((timestamp) => {
    if (litMap.has(timestamp)) lastLit = litMap.get(timestamp) ?? lastLit;
    if (hypeMap.has(timestamp)) lastHype = hypeMap.get(timestamp) ?? lastHype;
    return { timestamp, lighter: lastLit, hyperliquid: lastHype };
  });
}

function latestFromSeries(label: string, series: TimeSeriesPoint[]): StatValue {
  const last = series.at(-1);
  return {
    label,
    lighter: last?.lighter ?? null,
    hyperliquid: last?.hyperliquid ?? null,
    format: "percent",
  };
}

export function buildBuybackPercentCharts(payload: BuybacksDashboardPayload): BuybackPercentChart[] {
  const market = payload.market;
  const litRows = payload.daily.lit?.rows;
  const hypeRows = payload.daily.hype?.rows;

  const chartDefs: Array<{
    label: string;
    lit: Map<number, number | null>;
    hype: Map<number, number | null>;
  }> = [
    {
      label: "% Circulating Supply",
      lit: buildCumulativePercentMap(litRows, (base) =>
        pctOfBase(base, market?.lighterCirculatingSupply)
      ),
      hype: buildCumulativePercentMap(hypeRows, (base) =>
        pctOfBase(base, market?.hypeCirculatingSupply)
      ),
    },
    {
      label: "% Total Supply",
      lit: buildCumulativePercentMap(litRows, (base) => pctOfBase(base, market?.lighterFdvSupply)),
      hype: buildCumulativePercentMap(hypeRows, (base) => pctOfBase(base, market?.hypeFdvSupply)),
    },
    {
      label: "% Market Cap",
      lit: buildCumulativePercentMap(litRows, (_base, quote) =>
        pctOfQuote(quote, market?.latestLighterMcap ?? payload.summary.lit?.market_cap?.usd)
      ),
      hype: buildCumulativePercentMap(hypeRows, (_base, quote) =>
        pctOfQuote(quote, market?.latestHypeMcap ?? payload.summary.hype?.market_cap?.usd)
      ),
    },
    {
      label: "% FDV",
      lit: buildCumulativePercentMap(litRows, (_base, quote) =>
        pctOfQuote(quote, market?.latestLighterFdv)
      ),
      hype: buildCumulativePercentMap(hypeRows, (_base, quote) =>
        pctOfQuote(quote, market?.latestHypeFdv)
      ),
    },
  ];

  return chartDefs
    .map(({ label, lit, hype }) => {
      const series = mergePercentSeries(lit, hype);
      return series.length
        ? { label, series, latest: latestFromSeries(label, series) }
        : null;
    })
    .filter((chart): chart is BuybackPercentChart => chart != null);
}

export function buildBuybackBarMetrics(payload: BuybacksDashboardPayload): StatValue[] {
  return buildBuybackCompareMetrics(payload).filter((metric) => metric.format !== "percent");
}

export function buildBuybackCompareMetrics(payload: BuybacksDashboardPayload): StatValue[] {
  const lit = payload.summary.lit;
  const hype = payload.summary.hype;
  const market = payload.market;

  const litBase = lit?.summary?.total_base ?? null;
  const hypeBase = hype?.summary?.total_base ?? null;
  const litQuote = lit?.summary?.total_quote ?? null;
  const hypeQuote = hype?.summary?.total_quote ?? null;

  const tokenFormat = {
    format: "token" as const,
    tokens: { lighter: "LIT", hyperliquid: "HYPE" },
  };

  return [
    {
      label: "YTD Buybacks",
      lighter: litBase,
      hyperliquid: hypeBase,
      ...tokenFormat,
    },
    {
      label: "YTD Buybacks (USD)",
      lighter: litQuote,
      hyperliquid: hypeQuote,
      format: "currency",
    },
    {
      label: "% Circulating Supply",
      lighter: pctOfBase(litBase, market?.lighterCirculatingSupply),
      hyperliquid: pctOfBase(hypeBase, market?.hypeCirculatingSupply),
      format: "percent",
    },
    {
      label: "% Total Supply",
      lighter: lit?.percent_supply_bought ?? pctOfBase(litBase, market?.lighterFdvSupply),
      hyperliquid: hype?.percent_supply_bought ?? pctOfBase(hypeBase, market?.hypeFdvSupply),
      format: "percent",
    },
    {
      label: "% Market Cap",
      lighter:
        lit?.percent_market_cap_bought ??
        pctOfQuote(litQuote, market?.latestLighterMcap ?? lit?.market_cap?.usd),
      hyperliquid:
        hype?.percent_market_cap_bought ??
        pctOfQuote(hypeQuote, market?.latestHypeMcap ?? hype?.market_cap?.usd),
      format: "percent",
    },
    {
      label: "% FDV",
      lighter: pctOfQuote(litQuote, market?.latestLighterFdv),
      hyperliquid: pctOfQuote(hypeQuote, market?.latestHypeFdv),
      format: "percent",
    },
  ];
}