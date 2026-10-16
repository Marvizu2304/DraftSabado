import { FormEvent } from "react"
import { Head, Link, useForm, usePage } from "@inertiajs/react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { POSITIONS, type PlayerDetail } from "./positions"

import type { PageProps } from "@/types/inertia"

type LinkableUser = { id: number; email: string }

export default function PlantelForm({
  player,
  linkable_users,
}: {
  player: PlayerDetail | null
  linkable_users: LinkableUser[]
}) {
  const { props } = usePage<PageProps>()
  const errors = props.errors ?? {}
  const editing = !!player
  const title = editing ? `Editar a ${player.name}` : "Nuevo jugador"
  const description = editing
    ? "Cambia los datos del jugador o liga su cuenta."
    : "Da de alta a un jugador con su nombre, edad y posición preferida."

  const form = useForm({
    name: player?.name ?? "",
    age: player?.age ? String(player.age) : "",
    position: player?.position ?? "midfielder",
    user_id: player?.user_id ? String(player.user_id) : "",
    active: player?.active ?? true,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (editing) form.patch(`/plantel/${player.id}`)
    else form.post("/plantel")
  }

  return (
    <>
      <Head title={title}>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Head>
      <AppShell>
        <PageHeader title={title} description={description} />

        <form onSubmit={submit} className="mt-8 max-w-md space-y-5">
          <div className="space-y-2">
            <label htmlFor="name">Nombre</label>
            <Input
              id="name"
              required
              autoFocus
              aria-invalid={!!errors.name}
              value={form.data.name}
              onChange={(e) => form.setData("name", e.target.value)}
            />
            {errors.name && <p className="text-xs text-danger-display">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="age">Edad</label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              min={10}
              max={99}
              required
              aria-invalid={!!errors.age}
              value={form.data.age}
              onChange={(e) => form.setData("age", e.target.value)}
            />
            {errors.age && <p className="text-xs text-danger-display">{errors.age}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="position">Posición preferida</label>
            <Select
              id="position"
              aria-invalid={!!errors.position}
              value={form.data.position}
              onChange={(e) => form.setData("position", e.target.value as PlayerDetail["position"])}
            >
              {POSITIONS.map((position) => (
                <option key={position.value} value={position.value}>
                  {position.label}
                </option>
              ))}
            </Select>
            {errors.position && <p className="text-xs text-danger-display">{errors.position}</p>}
          </div>

          {editing && (
            <>
              <div className="space-y-2">
                <label htmlFor="user_id">Cuenta ligada</label>
                <Select
                  id="user_id"
                  value={form.data.user_id}
                  onChange={(e) => form.setData("user_id", e.target.value)}
                >
                  <option value="">Sin cuenta</option>
                  {linkable_users.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {user.email}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-ink-muted">
                  Liga al jugador con la cuenta que usa para entrar a la app.
                </p>
              </div>

              <label className="flex items-center gap-2 font-normal text-ink-body">
                <Checkbox
                  checked={form.data.active}
                  onChange={(e) => form.setData("active", e.target.checked)}
                />
                Sigue en el grupo
              </label>
            </>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={form.processing}>
              {editing ? "Guardar cambios" : "Dar de alta"}
            </Button>
            <Button asChild variant="ghost">
              <Link
                href={editing ? `/plantel/${player.id}` : "/plantel"}
                className="no-underline"
              >
                Cancelar
              </Link>
            </Button>
          </div>
        </form>
      </AppShell>
    </>
  )
}
