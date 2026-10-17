import type { Position } from "../../plantel/positions"

export type UserStatus = "pending" | "approved" | "rejected"

export type UserPlayer = {
  id: number
  name: string
  age: number
  position: Position
}

export type UserRow = {
  id: number
  email: string
  admin: boolean
  status: UserStatus
  player: UserPlayer | null
  created_at: string
}

export const STATUS_LABEL: Record<UserStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export const STATUS_TONE: Record<UserStatus, "signal" | "accent" | "danger"> = {
  pending: "signal",
  approved: "accent",
  rejected: "danger",
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
