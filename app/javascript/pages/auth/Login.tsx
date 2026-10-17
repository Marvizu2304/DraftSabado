import { FormEvent } from "react"
import { Head, Link, useForm, usePage } from "@inertiajs/react"
import { AuthShell } from "@/components/AuthShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { PageProps } from "@/types/inertia"

const DESCRIPTION =
  "Entra a tu cuenta para ver las retas del grupo, palomear asistencia y calificar a los demás."

export default function Login() {
  const { props } = usePage<PageProps>()
  const form = useForm({ email: "", password: "" })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    form.post("/login")
  }

  const baseError = props.errors?.base

  return (
    <>
      <Head title="Entrar">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Entrar" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>
      <AuthShell>
        <div className="text-center">
          <h2>Entrar</h2>
          <p className="mt-2 text-sm text-ink-muted">
            ¿Todavía no tienes cuenta? <Link href="/signup">Pide tu lugar</Link>
          </p>
        </div>

        {props.flash?.notice && (
          <p className="mt-4 text-center text-sm text-accent">
            {props.flash.notice}
          </p>
        )}
        {baseError && (
          <p className="mt-4 text-center text-sm text-danger-display">{baseError}</p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email">Correo</label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={form.data.email}
              onChange={(e) => form.setData("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password">Contraseña</label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.data.password}
              onChange={(e) => form.setData("password", e.target.value)}
            />
          </div>
          <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
            <Button type="submit" disabled={form.processing}>
              Entrar
            </Button>
            <Link href="/passwords/new" className="text-sm">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </AuthShell>
    </>
  )
}
