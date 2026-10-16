export const POSITIONS = [
  { value: "goalkeeper", label: "Portero" },
  { value: "defender", label: "Defensa" },
  { value: "midfielder", label: "Medio" },
  { value: "forward", label: "Delantero" },
] as const

export type Position = (typeof POSITIONS)[number]["value"]

export type Player = {
  id: number
  name: string
  age: number
  position: Position
  active: boolean
  overall: number | null
}

export type PlayerDetail = Player & {
  user_id: number | null
  user_email: string | null
  technique: number | null
  physical: number | null
  ratings_count: number
  elo: number
  series: { played_on: string; value: number }[]
  position_history: Partial<Record<Position, number>>
}

export function positionLabel(position: string) {
  return POSITIONS.find((p) => p.value === position)?.label ?? position
}
