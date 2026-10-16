import { useState } from "react"
import { Head } from "@inertiajs/react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Checkbox } from "@/components/ui/checkbox"
import { LineChart, seriesColor } from "@/components/ui/line-chart"
import { cn } from "@/lib/utils"
import { RANGES, toChartPoints, withinRange, type RangeValue, type SeriesPoint } from "./range"

const DESCRIPTION =
  "Cómo ha cambiado la puntuación del grupo reta a reta: compara a varios jugadores en una sola gráfica."

// Past six the hues repeat and no line can be told from another.
const MAX_SELECTED = 6

type Player = {
  id: number
  name: string
  overall: number | null
  elo: number
  series: SeriesPoint[]
}

export default function EvolucionIndex({ players }: { players: Player[] }) {
  const withHistory = players.filter((player) => player.series.length > 0)
  const [selected, setSelected] = useState<number[]>(
    withHistory.slice(0, 3).map((player) => player.id),
  )
  const [range, setRange] = useState<RangeValue>("all")

  const chosen = withHistory.filter((player) => selected.includes(player.id))
  const ranged = withinRange(
    chosen.map((player) => player.series),
    range,
  )
  const series = chosen.map((player, index) => ({
    label: player.name,
    points: toChartPoints(ranged[index]),
  }))

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= MAX_SELECTED
          ? current
          : [...current, id],
    )
  }

  return (
    <>
      <Head title="Evolución">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Evolución" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <PageHeader
          title="Evolución"
          description="Elige a quién comparar y mira cómo se movieron sus puntuaciones."
        />

        {withHistory.length === 0 ? (
          <p className="mt-10 text-center text-ink-muted">
            Todavía no hay retas con resultado. En cuanto se capture el primero, aquí aparece la
            evolución del grupo.
          </p>
        ) : (
          <>
            <div className="mt-6 rounded-md border border-hairline bg-page p-4">
              <div className="mb-4 flex gap-2">
                {RANGES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-sm",
                      range === option.value
                        ? "border-accent bg-accent-faded text-accent-display"
                        : "border-hairline bg-page text-ink-body hover:bg-surface",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <LineChart
                series={series}
                label="Evolución de los jugadores elegidos"
                empty="Elige al menos un jugador."
              />
            </div>

            <h2 className="mt-8">Jugadores</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Hasta {MAX_SELECTED} a la vez. Llevas {selected.length}.
            </p>

            <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-page">
              {withHistory.map((player) => {
                const index = chosen.findIndex((p) => p.id === player.id)
                const checked = index !== -1
                return (
                  <li key={player.id}>
                    <label className="flex cursor-pointer items-center gap-4 px-4 py-3 font-normal text-ink-body hover:bg-surface">
                      <Checkbox
                        className="h-5 w-5"
                        checked={checked}
                        disabled={!checked && selected.length >= MAX_SELECTED}
                        onChange={() => toggle(player.id)}
                      />
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: checked ? seriesColor(index) : "var(--color-hairline)",
                        }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-display">
                        {player.name}
                      </span>
                      <span className="shrink-0 text-xs text-ink-muted">
                        {player.overall ?? "—"}
                        {player.elo !== 0 &&
                          ` · ${player.elo > 0 ? "+" : ""}${player.elo.toFixed(2)}`}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </AppShell>
    </>
  )
}
