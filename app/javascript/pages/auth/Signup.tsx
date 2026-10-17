import { FormEvent, useEffect } from "react"
import { Head, Link, useForm, usePage } from "@inertiajs/react"
import { AuthShell } from "@/components/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { POSITIONS, type Position } from "../plantel/positions"

import type { PageProps } from "@/types/inertia"

const DESCRIPTION =
  "Pide tu lugar en el grupo: deja tus datos de jugador y un admin aprueba tu cuenta."

export default function Signup() {
  const { props } = usePage<PageProps>()
  const form = useForm({
    name: "",
    age: "",
    position: "midfielder" as Position,
    email: "",
    password: "",
    timezone: "",
  })

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) form.setData("timezone", tz)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    form.post("/signup")
  }

  const errors = props.errors ?? {}

  return (
    <>
      <Head title="Crear cuenta">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Crear cuenta" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AuthShell>
        <div className="text-center">
          <h2>Pide tu lugar</h2>
          <p className="mt-2 text-sm text-ink-muted">
            ¿Ya tienes cuenta? <Link href="/login">Entra aquí</Link>
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="name">Nombre</label>
            <Input
              id="name"
              autoComplete="name"
              autoFocus
              required
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
              onChange={(e) => form.setData("position", e.target.value as Position)}
            >
              {POSITIONS.map((position) => (
                <option key={position.value} value={position.value}>
                  {position.label}
                </option>
              ))}
            </Select>
            {errors.position && (
              <p className="text-xs text-danger-display">{errors.position}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email">Correo</label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              aria-invalid={!!errors.email}
              value={form.data.email}
              onChange={(e) => form.setData("email", e.target.value)}
            />
            {errors.email && <p className="text-xs text-danger-display">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="password">Contraseña</label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!errors.password}
              value={form.data.password}
              onChange={(e) => form.setData("password", e.target.value)}
            />
            {errors.password && (
              <p className="text-xs text-danger-display">{errors.password}</p>
            )}
          </div>

          <p className="text-xs text-ink-muted">
            Tu cuenta queda pendiente hasta que un admin del grupo la apruebe.
          </p>

          <Button type="submit" disabled={form.processing}>
            Enviar solicitud
          </Button>
        </form>
      </AuthShell>
    </>
  )
}
