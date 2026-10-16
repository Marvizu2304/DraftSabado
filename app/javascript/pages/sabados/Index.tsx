import * as React from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { CalendarPlus, ChevronRight } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  formatDate,
  hasResult,
  nextSaturday,
  resultText,
  stateBadge,
  type Matchday,
} from "./teams"

import type { PageProps } from "@/types/inertia"

const DESCRIPTION =
  "Los sábados del grupo: quiénes llegaron, cómo quedaron los equipos y el reparto de cada jornada."

export default function SabadosIndex({ matchdays }: { matchdays: Matchday[] }) {
  const { props } = usePage<PageProps>()
  const isAdmin = !!props.current_user?.admin
  const [opening, setOpening] = React.useState(false)

  return (
    <>
      <Head title="Sábados">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Sábados" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <PageHeader
          title="Sábados"
          description="Abre la jornada del día, palomea quién llegó y arma los equipos."
          actions={
            isAdmin && (
              <Button onClick={() => setOpening(true)}>
                <CalendarPlus className="h-4 w-4" />
                Nuevo sábado
              </Button>
            )
          }
        />

        <NewMatchdayDialog open={opening} onOpenChange={setOpening} />

        {props.flash?.notice && (
          <p className="mt-6 text-sm text-accent">{props.flash.notice}</p>
        )}
        {props.flash?.alert && (
          <p className="mt-6 text-sm text-danger">{props.flash.alert}</p>
        )}

        {matchdays.length === 0 ? (
          <p className="mt-10 text-center text-ink-muted">
            Todavía no hay ningún sábado.
            {isAdmin && " Toca «Nuevo sábado» cuando estés en la cancha."}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-page">
            {matchdays.map((matchday) => {
              const badge = stateBadge(matchday)
              return (
                <li key={matchday.id}>
                  <Link
                    href={`/sabados/${matchday.id}`}
                    className="flex items-center gap-3 px-4 py-4 no-underline hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink-display first-letter:uppercase">
                        {formatDate(matchday.played_on)}
                      </div>
                      <div className="truncate text-xs text-ink-muted">
                        {matchday.attendee_count === 0
                          ? "Sin palomear"
                          : `${matchday.attendee_count} jugadores · ${matchday.team_count} equipos`}
                      </div>
                      {hasResult(matchday) && (
                        <div className="truncate text-xs text-ink-display">
                          {resultText(matchday)}
                        </div>
                      )}
                    </div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </AppShell>
    </>
  )
}

/** Step one of the wizard: which Saturday this is. */
function NewMatchdayDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [date, setDate] = React.useState(nextSaturday)

  // Reopening the dialog should land on the upcoming Saturday again.
  React.useEffect(() => {
    if (open) setDate(nextSaturday())
  }, [open])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    router.post("/sabados", { played_on: date })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Nuevo sábado</DialogTitle>
            <DialogDescription>
              La fecha de la jornada. Viene puesto el sábado más próximo.
            </DialogDescription>
          </DialogHeader>

          <div className="px-1 py-4">
            <label htmlFor="played-on">Fecha</label>
            <Input
              id="played-on"
              className="mt-1"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Abrir sábado</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
