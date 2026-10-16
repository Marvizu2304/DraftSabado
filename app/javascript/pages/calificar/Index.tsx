import * as React from "react"
import { Head, Link } from "@inertiajs/react"
import { Check, LoaderCircle, TriangleAlert } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Slider } from "@/components/ui/slider"
import { positionLabel, type Position } from "../plantel/positions"
import { useTimeLeft } from "@/hooks/use-time-left"
import { formatDate } from "../sabados/teams"

const DESCRIPTION =
  "Califica la técnica y el físico de cada compañero del 1 al 10. Nadie ve quién puso qué: solo cuenta el promedio del grupo."

type Ratable = {
  id: number
  name: string
  position: Position
  technique: number | null
  physical: number | null
  /** Already rated for THIS Saturday, not just at some point in the past. */
  done: boolean
}

type Axis = "technique" | "physical"
type Status = "saving" | "saved" | "error"

const MIDPOINT = 5

function csrfToken() {
  return (
    document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ""
  )
}

export default function Calificar({
  linked,
  open,
  eligible,
  players,
  closes_at,
  played_on,
}: {
  linked: boolean
  /** Whether a Saturday's twelve-hour window is running right now. */
  open: boolean
  /** Whether this account played that Saturday, and so gets to rate. */
  eligible: boolean
  players: Ratable[]
  closes_at: string | null
  played_on: string | null
}) {
  const [values, setValues] = React.useState(() =>
    Object.fromEntries(
      players.map((p) => [p.id, { technique: p.technique, physical: p.physical }]),
    ) as Record<number, Record<Axis, number | null>>,
  )
  const [status, setStatus] = React.useState<Record<number, Status>>({})
  const timers = React.useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  React.useEffect(() => {
    const pending = timers.current
    return () => Object.values(pending).forEach(clearTimeout)
  }, [])

  const save = React.useCallback(
    (playerId: number, next: Record<Axis, number | null>) => {
      if (next.technique === null || next.physical === null) return

      setStatus((s) => ({ ...s, [playerId]: "saving" }))
      fetch("/calificar", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken(),
        },
        body: JSON.stringify({
          player_id: playerId,
          technique: next.technique,
          physical: next.physical,
        }),
      })
        .then((response) => {
          setStatus((s) => ({ ...s, [playerId]: response.ok ? "saved" : "error" }))
          if (response.ok) setSaved((ids) => (ids.includes(playerId) ? ids : [...ids, playerId]))
        })
        .catch(() => setStatus((s) => ({ ...s, [playerId]: "error" })))
    },
    [],
  )

  const change = (playerId: number, axis: Axis, value: number) => {
    setValues((current) => {
      const next = { ...current[playerId], [axis]: value }
      clearTimeout(timers.current[playerId])
      timers.current[playerId] = setTimeout(() => save(playerId, next), 400)
      return { ...current, [playerId]: next }
    })
  }

  const [saved, setSaved] = React.useState<number[]>(() =>
    players.filter((p) => p.done).map((p) => p.id),
  )
  const pending = players.filter((p) => !saved.includes(p.id)).length
  const left = useTimeLeft(closes_at)

  return (
    <>
      <Head title="Calificar">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Calificar" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <PageHeader
          title="Calificar"
          description="Del 1 al 10, como lo ves tú. Se guarda solo y nadie sabe quién puso qué."
        />

        {!linked ? (
          <p className="mt-10 text-center text-ink-muted">
            Tu cuenta todavía no está ligada a ningún jugador del plantel, así que no
            puedes calificar. Pídele al administrador que la ligue desde tu ficha en{" "}
            <Link href="/plantel">el plantel</Link>.
          </p>
        ) : open && !eligible ? (
          <p className="mt-10 text-center text-ink-muted">
            Las calificaciones de este sábado son solo para quienes jugaron, y tú no
            apareces en la lista de asistencia.
          </p>
        ) : players.length === 0 ? (
          <p className="mt-10 text-center text-ink-muted">
            {open
              ? "No hay nadie más a quién calificar de ese sábado."
              : "No hay calificaciones abiertas. Se abren al guardar el resultado de un sábado y duran 12 horas."}
          </p>
        ) : (
          <>
            <p className="mt-6 rounded-md border border-hairline bg-surface px-4 py-3 text-sm text-ink-body">
              {open && played_on && (
                <span className="block text-ink-display first-letter:uppercase">
                  {formatDate(played_on)}
                  {left ? ` · cierran en ${left}` : " · por cerrar"}
                </span>
              )}
              {pending === 0
                ? `Ya calificaste a los ${players.length}.`
                : `Te faltan ${pending} de ${players.length}.`}
            </p>

            <ul className="mt-6 space-y-3">
              {players.map((player) => (
                <li
                  key={player.id}
                  className="rounded-md border border-hairline bg-page p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <span className="truncate text-sm font-medium text-ink-display">
                        {player.name}
                      </span>
                      <span className="ml-2 text-xs text-ink-muted">
                        {positionLabel(player.position)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!saved.includes(player.id) &&
                        values[player.id].technique !== null &&
                        values[player.id].physical !== null && (
                          <button
                            type="button"
                            className="cursor-pointer text-xs text-ink-muted underline hover:text-ink-display"
                            onClick={() => save(player.id, values[player.id])}
                          >
                            Sigue igual
                          </button>
                        )}
                      <SaveStatus status={status[player.id]} />
                    </div>
                  </div>

                  <div className="mt-3 space-y-3">
                    <AxisRow
                      playerId={player.id}
                      axis="technique"
                      label="Técnica"
                      value={values[player.id].technique}
                      onChange={change}
                    />
                    <AxisRow
                      playerId={player.id}
                      axis="physical"
                      label="Físico"
                      value={values[player.id].physical}
                      onChange={change}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </AppShell>
    </>
  )
}

function AxisRow({
  playerId,
  axis,
  label,
  value,
  onChange,
}: {
  playerId: number
  axis: Axis
  label: string
  value: number | null
  onChange: (playerId: number, axis: Axis, value: number) => void
}) {
  const id = `${axis}-${playerId}`
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-16 shrink-0 font-normal text-ink-body">
        {label}
      </label>
      <Slider
        id={id}
        min={1}
        max={10}
        step={1}
        muted={value === null}
        value={value ?? MIDPOINT}
        onChange={(e) => onChange(playerId, axis, Number(e.target.value))}
      />
      <span
        className={
          value === null
            ? "w-6 shrink-0 text-right text-sm text-ink-muted"
            : "w-6 shrink-0 text-right text-sm font-medium text-ink-display"
        }
      >
        {value ?? "—"}
      </span>
    </div>
  )
}

function SaveStatus({ status }: { status?: Status }) {
  if (!status) return null
  if (status === "saving")
    return <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-ink-muted" />
  if (status === "saved")
    return (
      <span className="flex shrink-0 items-center gap-1 text-xs text-accent">
        <Check className="h-3.5 w-3.5" />
        Guardado
      </span>
    )
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-danger">
      <TriangleAlert className="h-3.5 w-3.5" />
      No se guardó
    </span>
  )
}
