import type { ChartPoint } from "@/components/ui/line-chart"

export type SeriesPoint = { played_on: string; value: number }

export const RANGES = [
  { value: "3m", label: "3 meses", months: 3 },
  { value: "6m", label: "6 meses", months: 6 },
  { value: "all", label: "Todo", months: null },
] as const

export type RangeValue = (typeof RANGES)[number]["value"]

/**
 * The window is measured back from the last Saturday on record, not from today:
 * the same data always draws the same chart, which keeps the server's render and
 * the browser's agreeing.
 */
export function withinRange(series: SeriesPoint[][], range: RangeValue) {
  const months = RANGES.find((r) => r.value === range)?.months
  if (!months) return series

  const dates = series.flat().map((p) => p.played_on).sort()
  const last = dates[dates.length - 1]
  if (!last) return series

  // Plain string arithmetic, with no Date in sight: a time zone must not change
  // which Saturdays the chart shows.
  const [year, month, day] = last.split("-").map(Number)
  const shifted = (year * 12 + month - 1) - months
  const cutoff = [
    String(Math.floor(shifted / 12)).padStart(4, "0"),
    String((shifted % 12) + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-")
  return series.map((points) => points.filter((p) => p.played_on >= cutoff))
}

export function toChartPoints(points: SeriesPoint[]): ChartPoint[] {
  return points.map((p) => ({ x: p.played_on, y: p.value }))
}
