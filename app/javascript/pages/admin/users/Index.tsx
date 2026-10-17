import { Head, Link, router } from "@inertiajs/react"
import { ChevronRight, User as UserIcon } from "lucide-react"
import { AdminShell } from "@/components/AdminShell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { positionLabel } from "../../plantel/positions"
import { STATUS_LABEL, STATUS_TONE, formatDate, type UserRow } from "./status"

export default function AdminUsersIndex({ users }: { users: UserRow[] }) {
  const pending = users.filter((user) => user.status === "pending")

  return (
    <>
      <Head title="Cuentas">
        <meta name="description" content="Aprueba o rechaza solicitudes de cuenta del grupo." />
        <meta property="og:title" content="Cuentas" />
        <meta
          property="og:description"
          content="Aprueba o rechaza solicitudes de cuenta del grupo."
        />
      </Head>
      <AdminShell>
        <div className="border-b border-hairline pb-6">
          <h1>Cuentas</h1>
          <p className="mt-1">
            {users.length} {users.length === 1 ? "cuenta" : "cuentas"} en la app.
          </p>
        </div>

        <section className="mt-8">
          <h2>Solicitudes pendientes</h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No hay solicitudes por revisar.</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-page">
              {pending.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink-display">
                      {user.player?.name ?? user.email}
                    </div>
                    <div className="truncate text-xs text-ink-muted">
                      {user.player
                        ? `${user.player.age} años · ${positionLabel(user.player.position)} · ${user.email}`
                        : user.email}
                    </div>
                  </div>
                  <ReviewActions user={user} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2>Todas las cuentas</h2>
          <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-page">
            {users.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex items-center gap-3 px-4 py-3 no-underline hover:bg-surface"
                >
                  <UserIcon className="h-4 w-4 text-ink-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-display">
                      {user.email}
                    </div>
                    <div className="truncate text-xs text-ink-muted">
                      Se registró el {formatDate(user.created_at)}
                    </div>
                  </div>
                  {user.admin && <Badge tone="solid">Admin</Badge>}
                  <Badge tone={STATUS_TONE[user.status]}>{STATUS_LABEL[user.status]}</Badge>
                  <ChevronRight className="h-4 w-4 text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </AdminShell>
    </>
  )
}

export function ReviewActions({ user }: { user: UserRow }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {user.status !== "approved" && (
        <Button size="sm" onClick={() => router.patch(`/admin/users/${user.id}/aprobar`)}>
          Aprobar
        </Button>
      )}
      {user.status !== "rejected" && (
        <Button
          size="sm"
          variant="danger"
          onClick={() => router.patch(`/admin/users/${user.id}/rechazar`)}
        >
          Rechazar
        </Button>
      )}
    </div>
  )
}
