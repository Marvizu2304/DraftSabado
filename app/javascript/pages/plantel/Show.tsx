import { useState } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart } from "@/components/ui/line-chart"
import { cn } from "@/lib/utils"
import { POSITIONS, positionLabel, type PlayerDetail, type Position } from "./positions"
import {
  RANGES,
  toChartPoints,
  withinRange,
  type RangeValue,
} from "../evolucion/range"

import type { PageProps } from "@/types/inertia"

export default function PlantelShow({ player }: { player: PlayerDetail }) {
  const { props } = usePage<PageProps>()
  const isAdmin = !!props.current_user?.admin
  const [range, setRange] = useState<RangeValue>("all")
  const description = `Ficha de ${player.name}: edad, posición preferida y estado dentro del grupo.`

  const toggleActive = () => {
    router.patch(`/plantel/${player.id}`, { active: !player.active }, { preserveScroll: true })
  }

  return (
    <>
      <Head title={player.name}>
        <meta name="description" content={description} />
        <meta property="og:title" content={player.name} />
        <meta property="og:description" content={description} />
      </Head>
      <AppShell>
        <Link href="/plantel" className="inline-flex items-center gap-1 text-sm no-underline">
          <ArrowLeft className="h-4 w-4" />
          Plantel
        </Link>

        <div className="mt-4">
          <PageHeader
            title={player.name}
            description={`${player.age} años · ${positionLabel(player.position)}`}
            actions={
              isAdmin && (
                <>
                  <Button asChild variant="secondary">
                    <Link href={`/plantel/${player.id}/edit`} className="no-underline">
                      Editar
                    </Link>
                  </Button>
                  <Button variant={player.active ? "danger" : "secondary"} onClick={toggleActive}>
                    {player.active ? "Dar de baja" : "Reactivar"}
                  </Button>
                </>
              )
            }
          />
        </div>

        {props.flash?.notice && (
          <p className="mt-6 text-sm text-accent">{props.flash.notice}</p>
        )}

        <section className="mt-8 rounded-md border border-hairline bg-page p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="mb-0">Evolución</h2>
            {player.series.length > 0 && (
              <div className="flex gap-2">
                {RANGES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-xs",
                      range === option.value
                        ? "border-accent bg-accent-faded text-accent-display"
                        : "border-hairline bg-page text-ink-body hover:bg-surface",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <LineChart
            series={[
              {
                label: player.name,
                points: toChartPoints(withinRange([player.series], range)[0]),
              },
            ]}
            label={`Evolución de ${player.name} sábado a sábado`}
            empty="Todavía no hay sábados con resultado."
          />
        </section>

        <dl className="mt-8 divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-page">
          <Row label="Puntuación general">
            <Score value={player.overall} strong />
          </Row>
          <Row label="Ajuste por resultados">
            <Elo value={player.elo} />
          </Row>
          <Row label="Técnica">
            <Score value={player.technique} />
          </Row>
          <Row label="Físico">
            <Score value={player.physical} />
          </Row>
          <Row label="Calificaciones">
            {player.ratings_count === 0 ? (
              <span className="text-ink-muted">Nadie lo ha calificado</span>
            ) : (
              `${player.ratings_count} ${player.ratings_count === 1 ? "persona" : "personas"}`
            )}
          </Row>
          <Row label="Edad">{player.age} años</Row>
          <Row label="Posición preferida">{positionLabel(player.position)}</Row>
          <Row label="Dónde ha jugado">
            <PositionHistory history={player.position_history} />
          </Row>
          <Row label="Estado">
            {player.active ? (
              <Badge tone="accent">Activo</Badge>
            ) : (
              <Badge tone="muted">Dado de baja</Badge>
            )}
          </Row>
          <Row label="Cuenta ligada">
            {player.user_email ?? <span className="text-ink-muted">Sin cuenta</span>}
          </Row>
        </dl>
      </AppShell>
    </>
  )
}

function Elo({ value }: { value: number }) {
  if (value === 0) return <span className="text-ink-muted">Sin mover</span>
  return (
    <span className={value > 0 ? "text-accent-display" : "text-danger-display"}>
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}
    </span>
  )
}

function PositionHistory({ history }: { history: Partial<Record<Position, number>> }) {
  const played = POSITIONS.filter((position) => history[position.value])
  if (played.length === 0) return <span className="text-ink-muted">Todavía no juega un sábado</span>

  return <>{played.map((p) => `${p.label} ${history[p.value]}`).join(" · ")}</>
}

function Score({ value, strong }: { value: number | null; strong?: boolean }) {
  if (value === null) return <span className="text-ink-muted">—</span>
  return <span className={strong ? "text-lg font-semibold" : undefined}>{value}</span>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink-display">{children}</dd>
    </div>
  )
}
