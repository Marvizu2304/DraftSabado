import * as React from "react"
import { Head, router, usePage } from "@inertiajs/react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Slider } from "@/components/ui/slider"

import type { PageProps } from "@/types/inertia"

const DESCRIPTION =
  "Ajustes del grupo: cuánto pesan la técnica y el físico dentro de la puntuación general de cada jugador."

export default function Settings({
  technique_weight,
  elo_strength,
  can_edit,
}: {
  technique_weight: number
  elo_strength: number
  can_edit: boolean
}) {
  const { props } = usePage<PageProps>()
  const [weight, setWeight] = React.useState(technique_weight)
  const [strength, setStrength] = React.useState(elo_strength)

  React.useEffect(() => setWeight(technique_weight), [technique_weight])
  React.useEffect(() => setStrength(elo_strength), [elo_strength])

  const commit = () => {
    if (weight !== technique_weight) {
      router.patch("/settings", { technique_weight: weight }, { preserveScroll: true })
    }
  }

  const commitStrength = () => {
    if (strength !== elo_strength) {
      router.patch("/settings", { elo_strength: strength }, { preserveScroll: true })
    }
  }

  return (
    <>
      <Head title="Ajustes del grupo">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Ajustes del grupo" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <PageHeader
          title="Ajustes del grupo"
          description="Cómo se mezclan la técnica y el físico, y cuánto mueven los resultados del sábado."
        />

        {props.flash?.notice && (
          <p className="mt-6 text-sm text-accent">{props.flash.notice}</p>
        )}

        <div className="mt-8 rounded-md border border-hairline bg-page p-5">
          <label htmlFor="technique-weight">Peso de la técnica</label>
          <p className="mt-1 text-sm text-ink-muted">
            Lo que sobra es el peso del físico: entre los dos siempre suman 100%.
          </p>

          <div className="mt-4 flex items-baseline gap-6">
            <Weight label="Técnica" value={weight} />
            <Weight label="Físico" value={100 - weight} />
          </div>

          {can_edit ? (
            <div className="mt-4 flex items-center gap-3">
              <Slider
                id="technique-weight"
                min={0}
                max={100}
                step={5}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                onPointerUp={commit}
                onKeyUp={commit}
                onBlur={commit}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              Solo el administrador puede mover los pesos.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-md border border-hairline bg-page p-5">
          <label htmlFor="elo-strength">Fuerza del ajuste</label>
          <p className="mt-1 text-sm text-ink-muted">
            Cuánto mueve la puntuación de un jugador un partido parejo. Ganarle a un equipo más
            fuerte mueve más; perder contra uno más flojo, también.
          </p>

          <div className="mt-4 flex items-baseline gap-6">
            <div>
              <div className="text-2xl font-semibold text-ink-display">
                {(strength / 100).toFixed(2)}
              </div>
              <div className="text-xs text-ink-muted">puntos por partido parejo</div>
            </div>
          </div>

          {can_edit ? (
            <div className="mt-4 flex items-center gap-3">
              <Slider
                id="elo-strength"
                min={2}
                max={30}
                step={2}
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                onPointerUp={commitStrength}
                onKeyUp={commitStrength}
                onBlur={commitStrength}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              Solo el administrador puede mover la fuerza del ajuste.
            </p>
          )}
        </div>
      </AppShell>
    </>
  )
}

function Weight({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-ink-display">{value}%</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  )
}
