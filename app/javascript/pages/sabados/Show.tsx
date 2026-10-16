import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { ArrowLeft, CalendarDays, Share2, Shuffle, Star, Trash2, Undo2, X } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useTimeLeft } from "@/hooks/use-time-left"
import { cn } from "@/lib/utils"
import { POSITIONS, positionLabel, type Position } from "../plantel/positions"
import {
  averages,
  balance,
  capitalize,
  formatDate,
  hasResult,
  resultText,
  shareText,
  sizeLabel,
  stateBadge,
  teamColor,
  teamSizes,
  TEAM_COLORS,
  whatsappUrl,
  type Matchday,
  type Member,
  type RosterPlayer,
  type Team,
  type TeamColor,
} from "./teams"

import type { PageProps } from "@/types/inertia"

const DESCRIPTION =
  "La reta en la cancha: palomea quién llegó, arma equipos parejos, ajústalos a mano y compártelos."

/** Where the Saturday is still being put together. The date is step one and
 *  lives in the dialog that opened it. */
type Step = "players" | "count" | "review"

const STEPS: { key: Step; label: string }[] = [
  { key: "players", label: "Jugadores" },
  { key: "count", label: "Equipos" },
  { key: "review", label: "Revisar" },
]

export type RatingsInfo = {
  open: boolean
  closes_at: string
  /** Who was there and still owes the group a rating. Names only. */
  pending: string[]
  /** Players at the game with no account, who cannot rate at all. */
  unlinked: number
}

type Props = {
  matchday: Matchday
  roster: RosterPlayer[]
  attendee_ids: number[]
  teams: Team[]
  /** How much each player's adjustment moved this Saturday. */
  changes: Record<string, number>
  ratings: RatingsInfo | null
  /** The team counts a Saturday can be split into — [2, 3, …]. */
  team_counts: number[]
  players_per_team: number
  can_edit: boolean
}

function initialStep(attendeeIds: number[], teams: Team[]): Step {
  if (teams.length > 0) return "review"
  if (attendeeIds.length > 0) return "count"
  return "players"
}

export default function SabadoShow({
  matchday,
  roster,
  attendee_ids,
  teams,
  changes,
  ratings,
  team_counts,
  players_per_team,
  can_edit,
}: Props) {
  const { props } = usePage<PageProps>()
  const byId = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster])

  const [checked, setChecked] = useState<number[]>(attendee_ids)
  const [arrangement, setArrangement] = useState<Team[]>(teams)
  const [history, setHistory] = useState<Team[][]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [step, setStep] = useState<Step>(() => initialStep(attendee_ids, teams))
  const [reopened, setReopened] = useState(false)

  // A reload (generate, confirm) brings a fresh split: start over from it.
  useEffect(() => {
    setChecked(attendee_ids)
    setArrangement(teams)
    setHistory([])
    setSelected(null)
    setStep(initialStep(attendee_ids, teams))
    setReopened(false)
  }, [attendee_ids, teams])

  const scored = hasResult(matchday)
  const confirmed = matchday.status === "played"
  // The wizard runs until the Saturday is confirmed — and again whenever the
  // admin reopens it, result or no result.
  const wizard = can_edit && (!confirmed || reopened)
  // Mirrors Matchday.suggested_team_count: as many sides as there are full
  // teams, inside what the jersey colors allow.
  const suggested = Math.min(
    Math.max(Math.floor(checked.length / players_per_team), team_counts[0]),
    team_counts[team_counts.length - 1],
  )
  // Every split the headcount allows, each with the sizes it would come out as.
  const options = team_counts
    .filter((count) => checked.length >= count * 2)
    .map((count) => ({ count, sizes: teamSizes(checked.length, count) }))
  const title = formatDate(matchday.played_on)
  const badge = stateBadge(matchday)

  function push(next: Team[]) {
    setHistory((h) => [...h, arrangement])
    setArrangement(next)
  }

  function undo() {
    if (history.length === 0) return
    setArrangement(history[history.length - 1])
    setHistory(history.slice(0, -1))
    setSelected(null)
  }

  function teamOf(playerId: number) {
    return arrangement.find((team) =>
      team.members.some((m) => m.player_id === playerId),
    )
  }

  function memberOf(playerId: number): Member | undefined {
    return teamOf(playerId)?.members.find((m) => m.player_id === playerId)
  }

  /** Tap one player then another to swap them; tap a team to move him there. */
  function tapPlayer(playerId: number) {
    if (!wizard) return
    if (selected === null) return setSelected(playerId)
    if (selected === playerId) return setSelected(null)

    const a = memberOf(selected)
    const b = memberOf(playerId)
    if (!a || !b) return setSelected(playerId)

    push(
      arrangement.map((team) => ({
        ...team,
        members: team.members.map((m) =>
          m.player_id === a.player_id
            ? { player_id: b.player_id, position: m.position }
            : m.player_id === b.player_id
              ? { player_id: a.player_id, position: m.position }
              : m,
        ),
      })),
    )
    setSelected(null)
  }

  function moveTo(color: TeamColor) {
    const member = selected === null ? undefined : memberOf(selected)
    if (!member || teamOf(member.player_id)?.color === color) return

    push(
      arrangement.map((team) => ({
        ...team,
        members:
          team.color === color
            ? [...team.members, member]
            : team.members.filter((m) => m.player_id !== member.player_id),
      })),
    )
    setSelected(null)
  }

  function changePosition(position: Position) {
    if (selected === null) return
    push(
      arrangement.map((team) => ({
        ...team,
        members: team.members.map((m) =>
          m.player_id === selected ? { ...m, position } : m,
        ),
      })),
    )
  }

  function generate(count: number) {
    router.post(`/sabados/${matchday.id}/generar`, {
      player_ids: checked,
      team_count: count,
    })
  }

  function confirm() {
    router.patch(`/sabados/${matchday.id}/confirmar`, { teams: arrangement })
  }

  function discard() {
    const warning = scored
      ? "Borrar esta reta también la saca del elo de todos. ¿Seguir?"
      : "¿Descartar esta reta? Se pierde lo armado."
    if (!window.confirm(warning)) return
    router.delete(`/sabados/${matchday.id}`)
  }

  function rebuild() {
    if (
      scored &&
      !window.confirm("Si vuelves a armar los equipos se borra el resultado. ¿Seguir?")
    ) {
      return
    }
    setReopened(true)
  }

  function changeDate(date: string) {
    router.patch(`/sabados/${matchday.id}`, { played_on: date })
  }

  function toggleRatings(open: boolean) {
    router.patch(`/sabados/${matchday.id}/calificaciones`, { open })
  }

  const unrated = roster.every((p) => p.overall === null)

  return (
    <>
      <Head title={capitalize(title)}>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="La reta" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <Link
          href="/sabados"
          className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted no-underline hover:text-ink-display"
        >
          <ArrowLeft className="h-4 w-4" /> Retas
        </Link>

        <PageHeader
          title={<span className="block first-letter:uppercase">{title}</span>}
          description={
            wizard
              ? STEP_HINTS[step]
              : `${matchday.attendee_count} jugadores en ${arrangement.length} equipos.`
          }
          actions={<Badge tone={badge.tone}>{badge.label}</Badge>}
        />

        {props.flash?.notice && (
          <p className="mt-6 text-sm text-accent">{props.flash.notice}</p>
        )}
        {props.flash?.alert && (
          <p className="mt-6 text-sm text-danger">{props.flash.alert}</p>
        )}

        {wizard ? (
          <>
            <Steps current={step} />

            {step === "players" && (
              <Attendance
                roster={roster}
                checked={checked}
                setChecked={setChecked}
                unrated={unrated}
                minimum={team_counts[0] * 2}
                onNext={() => setStep("count")}
              />
            )}

            {step === "count" && (
              <Distribution
                options={options}
                suggested={suggested}
                attendees={checked.length}
                minimum={team_counts[0] * 2}
                onBack={() => setStep("players")}
                onGenerate={generate}
              />
            )}

            {step === "review" && (
              <Teams
                arrangement={arrangement}
                byId={byId}
                canEdit
                selected={selected}
                onTapPlayer={tapPlayer}
                onMoveTo={moveTo}
                onChangePosition={changePosition}
                onClearSelection={() => setSelected(null)}
                canUndo={history.length > 0}
                onUndo={undo}
                onRegenerate={() => generate(matchday.team_count)}
                onBack={() => setStep("count")}
                onConfirm={confirm}
              />
            )}

            <Button className="mt-10" variant="ghost" onClick={discard}>
              <Trash2 className="h-4 w-4" /> Descartar reta
            </Button>
          </>
        ) : arrangement.length === 0 ? (
          <Roster roster={roster} checked={checked} />
        ) : (
          <>
            <Teams
              arrangement={arrangement}
              byId={byId}
              canEdit={false}
              selected={null}
              onTapPlayer={() => {}}
              onMoveTo={() => {}}
              onChangePosition={() => {}}
              onClearSelection={() => {}}
              canUndo={false}
              onUndo={() => {}}
              onRegenerate={() => {}}
              onBack={() => {}}
              onConfirm={() => {}}
            />

            {(scored || can_edit) && (
              <Result
                matchday={matchday}
                arrangement={arrangement}
                changes={changes}
                byId={byId}
                canEdit={can_edit}
              />
            )}

            {ratings && <Ratings ratings={ratings} />}

            <Button
              className="mt-6"
              variant="secondary"
              onClick={() =>
                window.open(whatsappUrl(shareText(matchday, arrangement, byId)), "_blank")
              }
            >
              <Share2 className="h-4 w-4" /> Compartir por WhatsApp
            </Button>

            {can_edit && (
              <Manage
                playedOn={matchday.played_on}
                ratingsOpen={!!ratings?.open}
                scored={scored}
                onRebuild={rebuild}
                onChangeDate={changeDate}
                onToggleRatings={toggleRatings}
                onDelete={discard}
              />
            )}
          </>
        )}
      </AppShell>
    </>
  )
}

const STEP_HINTS: Record<Step, string> = {
  players: "Palomea quién llegó.",
  count: "Elige en cuántos equipos se reparten.",
  review: "Revisa el reparto, muévelo a mano si hace falta y confirma.",
}

function Steps({ current }: { current: Step }) {
  const index = STEPS.findIndex((s) => s.key === current)
  return (
    <ol className="mt-6 flex items-center gap-2 text-xs">
      {STEPS.map((stepDef, i) => (
        <li key={stepDef.key} className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1",
              i === index
                ? "bg-accent-faded text-accent-display"
                : i < index
                  ? "text-ink-body"
                  : "text-ink-muted",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                i <= index ? "bg-accent text-page" : "bg-surface text-ink-muted",
              )}
            >
              {i + 1}
            </span>
            {stepDef.label}
          </span>
          {i < STEPS.length - 1 && <span className="text-ink-muted">·</span>}
        </li>
      ))}
    </ol>
  )
}

/** What everyone else sees: who showed up, nothing to tick. */
function Roster({ roster, checked }: { roster: RosterPlayer[]; checked: number[] }) {
  const present = roster.filter((p) => checked.includes(p.id))

  return (
    <div className="mt-6">
      {present.length === 0 ? (
        <p className="text-ink-muted">Todavía nadie palomea esta reta.</p>
      ) : (
        <>
          <p>Llegaron {present.length}.</p>
          <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-md border border-hairline">
            {present.map((player) => (
              <li key={player.id} className="px-4 py-3 text-sm text-ink-display">
                {player.name}{" "}
                <span className="text-ink-muted">· {positionLabel(player.position)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Step 2: who showed up. */
function Attendance({
  roster,
  checked,
  setChecked,
  unrated,
  minimum,
  onNext,
}: {
  roster: RosterPlayer[]
  checked: number[]
  setChecked: (next: number[]) => void
  unrated: boolean
  minimum: number
  onNext: () => void
}) {
  const enough = checked.length >= minimum

  function toggle(id: number) {
    setChecked(
      checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id],
    )
  }

  return (
    <div className="mt-6 pb-28">
      <div className="rounded-md border border-hairline bg-surface px-4 py-4">
        <div className="text-3xl font-semibold text-ink-display">{checked.length}</div>
        <p className="mt-0 text-sm text-ink-muted">
          {checked.length === 1 ? "jugador palomeado" : "jugadores palomeados"}
        </p>

        {unrated && (
          <p className="mt-2 text-sm text-signal-display">
            Nadie tiene calificaciones todavía, así que el reparto va a salir al azar.
          </p>
        )}
      </div>

      <ul className="mt-6 divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-page">
        {roster.map((player) => (
          <li key={player.id}>
            <label className="flex cursor-pointer items-center gap-4 px-4 py-4 font-normal text-ink-body hover:bg-surface">
              <Checkbox
                className="h-6 w-6"
                checked={checked.includes(player.id)}
                onChange={() => toggle(player.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink-display">
                  {player.name}
                </span>
                <span className="block truncate text-xs text-ink-muted">
                  {positionLabel(player.position)}
                  {player.overall !== null && ` · ${player.overall}`}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <BottomBar>
        {!enough && (
          <p className="mb-2 text-xs text-ink-muted">
            Se necesitan al menos {minimum} jugadores para armar equipos.
          </p>
        )}
        <Button className="w-full" disabled={!enough} onClick={onNext}>
          Siguiente
        </Button>
      </BottomBar>
    </div>
  )
}

/** Step 3: how many teams. Picking is just picking — nothing is built until
 *  "Armar equipos". */
function Distribution({
  options,
  suggested,
  attendees,
  minimum,
  onBack,
  onGenerate,
}: {
  options: { count: number; sizes: number[] }[]
  suggested: number
  attendees: number
  minimum: number
  onBack: () => void
  onGenerate: (count: number) => void
}) {
  const [count, setCount] = useState(() =>
    options.some((o) => o.count === suggested) ? suggested : (options[0]?.count ?? 0),
  )

  return (
    <div className="mt-6 pb-28">
      <div className="rounded-md border border-hairline bg-surface px-4 py-4">
        <fieldset>
          <legend>Distribución</legend>
          <p className="mt-1 text-sm text-ink-muted">
            {options.length > 0
              ? `${attendees} jugadores. Elige una opción y se arma el reparto más parejo que da el sistema.`
              : `Se necesitan al menos ${minimum} jugadores para armar equipos.`}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {options.map(({ count: option, sizes }) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === count}
                onClick={() => setCount(option)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-left",
                  option === count
                    ? "border-accent bg-accent-faded"
                    : "border-hairline bg-page hover:bg-surface",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink-display">
                    {option} equipos
                  </span>
                  <span className="block text-xs text-ink-muted">{sizeLabel(sizes)}</span>
                </span>
                {option === suggested && <Badge tone="accent">Sugerido</Badge>}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <BottomBar>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onBack}>
            Atrás
          </Button>
          <Button
            className="flex-1"
            disabled={options.length === 0}
            onClick={() => onGenerate(count)}
          >
            Armar equipos
          </Button>
        </div>
      </BottomBar>
    </div>
  )
}

function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-page px-4 py-3">
      <div className="mx-auto max-w-4xl">{children}</div>
    </div>
  )
}

/** Step 4: the split itself, with the verdict on how even it came out. */
function Teams({
  arrangement,
  byId,
  canEdit,
  selected,
  onTapPlayer,
  onMoveTo,
  onChangePosition,
  onClearSelection,
  canUndo,
  onUndo,
  onRegenerate,
  onBack,
  onConfirm,
}: {
  arrangement: Team[]
  byId: Map<number, RosterPlayer>
  canEdit: boolean
  selected: number | null
  onTapPlayer: (id: number) => void
  onMoveTo: (color: TeamColor) => void
  onChangePosition: (position: Position) => void
  onClearSelection: () => void
  canUndo: boolean
  onUndo: () => void
  onRegenerate: () => void
  onBack: () => void
  onConfirm: () => void
}) {
  const result = balance(arrangement, byId)
  const tone =
    result.level === "even" ? "accent" : result.level === "acceptable" ? "signal" : "danger"
  const selectedMember = arrangement
    .flatMap((team) => team.members)
    .find((m) => m.player_id === selected)

  return (
    <div className={cn("mt-6", canEdit && "pb-28")}>
      <div className="flex items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3">
        <Badge tone={tone}>{result.label}</Badge>
        <span className="text-sm text-ink-muted">
          Diferencia de {result.spread.toFixed(1)} puntos entre el equipo más fuerte y el más
          flojo.
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {arrangement.map((team) => (
          <TeamCard
            key={team.color}
            team={team}
            byId={byId}
            canEdit={canEdit}
            selected={selected}
            onTapPlayer={onTapPlayer}
            onMoveTo={onMoveTo}
            hasSelection={selected !== null}
          />
        ))}
      </div>

      {canEdit && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onRegenerate}>
              <Shuffle className="h-4 w-4" /> Regenerar
            </Button>
            <Button variant="secondary" disabled={!canUndo} onClick={onUndo}>
              <Undo2 className="h-4 w-4" /> Deshacer
            </Button>
          </div>

          <BottomBar>
            {selectedMember ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink-display">
                  {byId.get(selectedMember.player_id)?.name}
                </span>
                <Select
                  className="w-40"
                  aria-label="Posición del día"
                  value={selectedMember.position}
                  onChange={(e) => onChangePosition(e.target.value as Position)}
                >
                  {POSITIONS.map((position) => (
                    <option key={position.value} value={position.value}>
                      {position.label}
                    </option>
                  ))}
                </Select>
                <Button variant="ghost" size="icon" aria-label="Quitar selección" onClick={onClearSelection}>
                  <X className="h-4 w-4" />
                </Button>
                <span className="w-full text-xs text-ink-muted">
                  Toca a otro jugador para intercambiarlos, o el encabezado de un equipo para
                  moverlo ahí.
                </span>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onBack}>
                  Atrás
                </Button>
                <Button className="flex-1" onClick={onConfirm}>
                  Confirmar reta
                </Button>
              </div>
            )}
          </BottomBar>
        </>
      )}
    </div>
  )
}

/** Everything an admin can do to a Saturday already on the books. */
function Manage({
  playedOn,
  ratingsOpen,
  scored,
  onRebuild,
  onChangeDate,
  onToggleRatings,
  onDelete,
}: {
  playedOn: string
  ratingsOpen: boolean
  scored: boolean
  onRebuild: () => void
  onChangeDate: (date: string) => void
  onToggleRatings: (open: boolean) => void
  onDelete: () => void
}) {
  const [editingDate, setEditingDate] = useState(false)
  const [date, setDate] = useState(playedOn)

  return (
    <section className="mt-10 border-t border-hairline pt-6">
      <h2 className="mb-0">Gestionar</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Corregir lo que quedó mal: la fecha, quién llegó, las calificaciones.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => { setDate(playedOn); setEditingDate(true) }}>
          <CalendarDays className="h-4 w-4" /> Cambiar fecha
        </Button>
        <Button variant="secondary" onClick={onRebuild}>
          <Shuffle className="h-4 w-4" /> Volver a armar
        </Button>
        {scored && (
          <Button variant="secondary" onClick={() => onToggleRatings(!ratingsOpen)}>
            <Star className="h-4 w-4" />
            {ratingsOpen ? "Cerrar calificaciones" : "Reabrir calificaciones"}
          </Button>
        )}
        <Button variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> Borrar reta
        </Button>
      </div>

      <Dialog open={editingDate} onOpenChange={setEditingDate}>
        <DialogContent size="sm">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setEditingDate(false)
              onChangeDate(date)
            }}
          >
            <DialogHeader>
              <DialogTitle>Cambiar fecha</DialogTitle>
              <DialogDescription>
                Solo puede haber una reta por fecha.
              </DialogDescription>
            </DialogHeader>

            <div className="px-1 py-4">
              <label htmlFor="edit-played-on">Fecha</label>
              <Input
                id="edit-played-on"
                className="mt-1"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setEditingDate(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}

/** The twelve-hour window: who still owes the group a rating. */
function Ratings({ ratings }: { ratings: RatingsInfo }) {
  const left = useTimeLeft(ratings.closes_at)

  return (
    <section className="mt-6 rounded-md border border-hairline bg-surface p-4">
      <h2 className="mb-0">Calificaciones</h2>

      {ratings.open ? (
        <p className="mt-1 text-sm text-ink-muted">
          Abiertas{left && ` · cierran en ${left}`}. Los que jugaron se califican entre
          ellos.
        </p>
      ) : (
        <p className="mt-1 text-sm text-ink-muted">Cerradas. Esta reta ya quedó.</p>
      )}

      {ratings.pending.length > 0 ? (
        <>
          <p className="mt-3 text-sm text-ink-body">
            Faltan por calificar: {ratings.pending.join(", ")}.
          </p>
          {ratings.open && (
            <Link href="/calificar" className="mt-2 inline-block text-sm">
              Ir a calificar
            </Link>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-body">Ya calificaron todos.</p>
      )}

      {ratings.unlinked > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          {ratings.unlinked} de los que jugaron no tienen cuenta, así que no pueden
          calificar.
        </p>
      )}
    </section>
  )
}

/**
 * Goals with two teams, matches won with three — the PRD's two ways of closing a
 * Saturday. Clearing both fields wipes the result, which is also how the admin
 * unlocks the teams to build them again.
 */
function Result({
  matchday,
  arrangement,
  changes,
  byId,
  canEdit,
}: {
  matchday: Matchday
  arrangement: Team[]
  changes: Record<string, number>
  byId: Map<number, RosterPlayer>
  canEdit: boolean
}) {
  const scored = hasResult(matchday)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      TEAM_COLORS.map((color) => [color.value, matchday.result[color.value]?.toString() ?? ""]),
    ),
  )
  const colors = arrangement.map((team) => teamColor(team.color))
  const label = matchday.team_count === 2 ? "Goles" : "Partidos ganados"

  function save(next: Record<string, string>) {
    router.patch(`/sabados/${matchday.id}/resultado`, { result: next }, { preserveScroll: true })
  }

  const moved = Object.entries(changes)
    .map(([playerId, delta]) => ({ player: byId.get(Number(playerId)), delta }))
    .filter((row) => row.player)
    .sort((a, b) => b.delta - a.delta)

  return (
    <section className="mt-6 rounded-md border border-hairline bg-surface p-4">
      <h2 className="mb-0">Resultado</h2>

      {canEdit ? (
        <>
          <p className="mt-1 text-sm text-ink-muted">
            {matchday.team_count === 2
              ? "El marcador final. Una goleada mueve lo mismo que un partido cerrado."
              : "Cuántos partidos ganó cada equipo. Los empates no se registran."}
          </p>
          <div className="mt-4 space-y-3">
            {colors.map((color) => (
              <div key={color.value} className="flex items-center gap-3">
                <span className={cn("h-3 w-3 shrink-0 rounded-full", color.dot)} aria-hidden />
                <label htmlFor={`result-${color.value}`} className="flex-1">
                  {color.label}
                </label>
                <Input
                  id={`result-${color.value}`}
                  className="w-20"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`${label} de ${color.label}`}
                  value={values[color.value] ?? ""}
                  onChange={(e) =>
                    setValues({ ...values, [color.value]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => save(values)}>Guardar resultado</Button>
            {scored && (
              <Button
                variant="secondary"
                onClick={() => {
                  const cleared = Object.fromEntries(colors.map((c) => [c.value, ""]))
                  setValues(cleared)
                  save(cleared)
                }}
              >
                Borrar resultado
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            {scored
              ? "Borrarla también cierra las calificaciones y deshace el elo de esta reta."
              : "Al guardarlo se abren las calificaciones por 12 horas."}
          </p>
        </>
      ) : (
        <p className="mt-2 text-2xl font-semibold text-ink-display">{resultText(matchday)}</p>
      )}

      {moved.length > 0 && (
        <>
          <h3 className="mt-6 mb-0">Cómo se movieron</h3>
          <ul className="mt-2 divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-page">
            {moved.map(({ player, delta }) => (
              <li
                key={player!.id}
                className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-ink-display">{player!.name}</span>
                <span className={delta > 0 ? "text-accent-display" : "text-danger-display"}>
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function TeamCard({
  team,
  byId,
  canEdit,
  selected,
  hasSelection,
  onTapPlayer,
  onMoveTo,
}: {
  team: Team
  byId: Map<number, RosterPlayer>
  canEdit: boolean
  selected: number | null
  hasSelection: boolean
  onTapPlayer: (id: number) => void
  onMoveTo: (color: TeamColor) => void
}) {
  const { label, dot } = teamColor(team.color)
  const { overall } = averages(team, byId)
  const keeper = team.members.find((m) => m.position === "goalkeeper")
  const improvised =
    keeper && byId.get(keeper.player_id)?.position !== "goalkeeper"
      ? byId.get(keeper.player_id)?.name
      : null

  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-page">
      <button
        type="button"
        disabled={!canEdit || !hasSelection}
        onClick={() => onMoveTo(team.color)}
        className={cn(
          "flex w-full items-center gap-2 border-b border-hairline bg-surface px-4 py-3 text-left",
          canEdit && hasSelection && "cursor-pointer hover:bg-accent-faded",
        )}
      >
        <span className={cn("h-3 w-3 shrink-0 rounded-full", dot)} aria-hidden />
        <span className="flex-1 text-sm font-medium text-ink-display">{label}</span>
        <span className="text-sm text-ink-muted">
          {team.members.length} · {overall.toFixed(1)}
        </span>
      </button>

      <ul className="divide-y divide-hairline">
        {team.members.map((member) => {
          const player = byId.get(member.player_id)
          const isSelected = selected === member.player_id
          return (
            <li key={member.player_id}>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => onTapPlayer(member.player_id)}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-3 text-left",
                  canEdit && "cursor-pointer hover:bg-surface",
                  isSelected && "bg-accent-faded",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-sm text-ink-display">
                  {player?.name ?? "?"}
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {positionLabel(member.position)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {improvised && (
        <p className="border-t border-hairline px-4 py-2 text-xs text-signal-display">
          {improvised} va al arco sin ser portero de oficio.
        </p>
      )}
    </div>
  )
}
