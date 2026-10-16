// bm-design-system: line chart primitive
import * as React from "react";
import { cn } from "@/lib/utils";

export type ChartPoint = { x: string; y: number };
export type ChartSeries = { label: string; points: ChartPoint[] };

export interface LineChartProps extends React.HTMLAttributes<HTMLDivElement> {
  series: ChartSeries[];
  /** Shown instead of the chart when there is nothing to draw yet. */
  empty?: React.ReactNode;
  /** Hidden by default with a single line, since the label is in the heading. */
  legend?: boolean;
  /** Describes the chart for screen readers; the SVG itself is decorative. */
  label?: string;
}

// Six hues that hold up on the light and the dark page. Categorical colors are
// their own thing: the accent tokens only give one line, and two lines need to
// be told apart at a glance.
const HUES = [215, 25, 145, 300, 85, 255];

const PADDING = { top: 12, right: 12, bottom: 24, left: 32 };
const WIDTH = 600;
const HEIGHT = 240;

export function seriesColor(index: number) {
  return `oklch(65% 0.17 ${HUES[index % HUES.length]})`;
}

/** "5 sep" — short enough to sit under a tick on a phone. */
function tickLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

const LineChart = React.forwardRef<HTMLDivElement, LineChartProps>(
  (
    { series, empty = "Todavía no hay nada que graficar.", legend, label, className, ...props },
    ref,
  ) => {
    const dates = Array.from(
      new Set(series.flatMap((s) => s.points.map((p) => p.x))),
    ).sort();
    const values = series.flatMap((s) => s.points.map((p) => p.y));

    if (dates.length === 0 || values.length === 0) {
      return (
        <div ref={ref} className={cn("py-8 text-center text-sm text-ink-muted", className)} {...props}>
          {empty}
        </div>
      );
    }

    // A flat line should sit in the middle instead of hugging an edge.
    const low = Math.min(...values);
    const high = Math.max(...values);
    const span = Math.max(high - low, 0.5);
    const min = low - span * 0.15;
    const max = high + span * 0.15;

    const x = (iso: string) =>
      dates.length === 1
        ? (PADDING.left + WIDTH - PADDING.right) / 2
        : PADDING.left +
          (dates.indexOf(iso) / (dates.length - 1)) *
            (WIDTH - PADDING.left - PADDING.right);

    const y = (value: number) =>
      PADDING.top +
      ((max - value) / (max - min)) * (HEIGHT - PADDING.top - PADDING.bottom);

    const ticks = [min, (min + max) / 2, max];
    const xTicks =
      dates.length <= 3
        ? dates
        : [dates[0], dates[Math.floor((dates.length - 1) / 2)], dates[dates.length - 1]];

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={label ?? series.map((s) => s.label).join(", ")}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-hairline)"
              />
              <text
                x={PADDING.left - 6}
                y={y(tick) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-ink-muted)"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          ))}

          {xTicks.map((iso) => (
            <text
              key={iso}
              x={x(iso)}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize="11"
              fill="var(--color-ink-muted)"
            >
              {tickLabel(iso)}
            </text>
          ))}

          {series.map((line, index) => {
            const points = [...line.points].sort((a, b) => a.x.localeCompare(b.x));
            if (points.length === 0) return null;
            const color = seriesColor(index);
            const d = points
              .map((point, i) => `${i === 0 ? "M" : "L"} ${x(point.x)} ${y(point.y)}`)
              .join(" ");
            return (
              <g key={line.label}>
                <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
                {points.length <= 30 &&
                  points.map((point) => (
                    <circle
                      key={point.x}
                      cx={x(point.x)}
                      cy={y(point.y)}
                      r="3"
                      fill={color}
                    >
                      <title>{`${line.label} · ${tickLabel(point.x)}: ${point.y.toFixed(1)}`}</title>
                    </circle>
                  ))}
              </g>
            );
          })}
        </svg>

        {(legend ?? series.length > 1) && (
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {series.map((line, index) => (
              <li key={line.label} className="flex items-center gap-2 text-xs text-ink-body">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: seriesColor(index) }}
                  aria-hidden
                />
                {line.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
LineChart.displayName = "LineChart";

export { LineChart };
