import type { PageProps as InertiaPageProps } from "@inertiajs/core"

export type CurrentUser = {
  id: number
  email: string
  timezone: string | null
  admin: boolean
} | null

/** The nudge while a Saturday's twelve-hour rating window is open. */
export type RatingPrompt = {
  pending: number
  closes_at: string
} | null

export type SharedProps = {
  current_user: CurrentUser
  rating_prompt: RatingPrompt
  flash: {
    notice: string | null
    alert: string | null
  }
  errors: Record<string, string>
}

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> =
  SharedProps & T & InertiaPageProps
