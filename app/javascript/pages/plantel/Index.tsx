import { useState } from "react"
import { Head, Link, usePage } from "@inertiajs/react"
import { ChevronRight, Plus, Search } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { positionLabel, type Player } from "./positions"

import type { PageProps } from "@/types/inertia"

const DESCRIPTION =
  "Todos los jugadores del grupo: nombre, edad y posición, con buscador para encontrar a cualquiera en segundos."

export default function PlantelIndex({ players }: { players: Player[] }) {
  const { props } = usePage<PageProps>()
  const isAdmin = !!props.current_user?.admin
  const [query, setQuery] = useState("")
  const [showInactive, setShowInactive] = useState(false)

  const visible = players
    .filter((player) => showInactive || player.active)
    .filter((player) => player.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1) || a.name.localeCompare(b.name))

  const activeCount = players.filter((player) => player.active).length

  return (
    <>
      <Head title="Plantel">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Plantel" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AppShell>
        <PageHeader
          title="Plantel"
          description={`${activeCount} ${activeCount === 1 ? "jugador activo" : "jugadores activos"} en el grupo.`}
          actions={
            isAdmin && (
              <Button asChild>
                <Link href="/plantel/new" className="no-underline">
                  <Plus className="h-4 w-4" />
                  Nuevo jugador
                </Link>
              </Button>
            )
          }
        />

        {props.flash?.notice && (
          <p className="mt-6 text-sm text-accent">{props.flash.notice}</p>
        )}

        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre"
              aria-label="Buscar jugador por nombre"
              className="pl-9"
            />
          </div>
          <label className="flex items-center gap-2 font-normal text-ink-body">
            <Checkbox
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Ver también las bajas
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 text-center text-ink-muted">
            {players.length === 0
              ? "Todavía no hay jugadores en el plantel."
              : "Ningún jugador coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-page">
            {visible.map((player) => (
              <li key={player.id}>
                <Link
                  href={`/plantel/${player.id}`}
                  className="flex items-center gap-3 px-4 py-4 no-underline hover:bg-surface"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-display">
                      {player.name}
                    </div>
                    <div className="truncate text-xs text-ink-muted">
                      {player.age} años · {positionLabel(player.position)}
                    </div>
                  </div>
                  {!player.active && <Badge tone="muted">Baja</Badge>}
                  <span
                    className={
                      player.overall === null
                        ? "shrink-0 text-base text-ink-muted"
                        : "shrink-0 text-base font-semibold text-ink-display"
                    }
                    title="Puntuación general"
                  >
                    {player.overall ?? "—"}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AppShell>
    </>
  )
}
