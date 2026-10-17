import { Head, Link } from "@inertiajs/react"
import { AdminShell } from "@/components/AdminShell"
import { Badge } from "@/components/ui/badge"
import { positionLabel } from "../../plantel/positions"
import { ReviewActions } from "./Index"
import { STATUS_LABEL, STATUS_TONE, type UserRow } from "./status"

type UserDetail = UserRow & {
  timezone: string | null
  updated_at: string
}

export default function AdminUserShow({ user }: { user: UserDetail }) {
  return (
    <>
      <Head title={user.email}>
        <meta name="description" content={`Detalle de la cuenta ${user.email}.`} />
        <meta property="og:title" content={user.email} />
        <meta property="og:description" content={`Detalle de la cuenta ${user.email}.`} />
      </Head>
      <AdminShell>
        <div className="border-b border-hairline pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1>{user.player?.name ?? user.email}</h1>
              <p className="mt-1">Cuenta #{user.id}</p>
            </div>
            <div className="flex items-center gap-2">
              {user.admin && <Badge tone="solid">Admin</Badge>}
              <Badge tone={STATUS_TONE[user.status]}>{STATUS_LABEL[user.status]}</Badge>
              <Link
                href="/admin/users"
                className="text-sm text-ink-muted no-underline hover:text-ink-display"
              >
                Volver a cuentas
              </Link>
            </div>
          </div>
          <div className="mt-4">
            <ReviewActions user={user} />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[max-content_1fr]">
          <DetailRow label="Correo" value={user.email} />
          <DetailRow label="Estado" value={STATUS_LABEL[user.status]} />
          <DetailRow label="Jugador" value={user.player?.name ?? "—"} />
          <DetailRow label="Edad" value={user.player ? String(user.player.age) : "—"} />
          <DetailRow
            label="Posición"
            value={user.player ? positionLabel(user.player.position) : "—"}
          />
          <DetailRow label="Admin" value={user.admin ? "Sí" : "No"} />
          <DetailRow label="Zona horaria" value={user.timezone ?? "—"} />
          <DetailRow label="Se registró" value={formatDateTime(user.created_at)} />
          <DetailRow label="Última actualización" value={formatDateTime(user.updated_at)} />
        </dl>
      </AdminShell>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink-body">{value}</dd>
    </>
  )
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
