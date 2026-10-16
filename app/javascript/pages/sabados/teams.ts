import { positionLabel, type Position } from "../plantel/positions"

/** Mirrors Team::COLORS, in the same order: the colors are what caps how many
 *  teams a Saturday can be split into. */
export const TEAM_COLORS = [
  { value: "red", label: "Rojos", emoji: "🔴", dot: "bg-jersey-red" },
  { value: "blue", label: "Azules", emoji: "🔵", dot: "bg-jersey-blue" },
  { value: "white", label: "Blancos", emoji: "⚪", dot: "bg-jersey-white border border-hairline" },
  { value: "black", label: "Negros", emoji: "⚫", dot: "bg-jersey-black border border-hairline" },
  { value: "orange", label: "Naranjas", emoji: "🟠", dot: "bg-jersey-orange" },
  { value: "green", label: "Verdes", emoji: "🟢", dot: "bg-jersey-green" },
] as const

export type TeamColor = (typeof TEAM_COLORS)[number]["value"]

// A player nobody has rated yet sits in the middle, same as TeamBuilder::MIDPOINT.
const MIDPOINT = 5

const EVEN = 0.3
const ACCEPTABLE = 0.6

export type RosterPlayer = {
  id: number
  name: string
  position: Position
  overall: number | null
  physical: number | null
  elo: number
}

export type Member = { player_id: number; position: Position }
export type Team = { color: TeamColor; members: Member[] }

/** Mirrors Matchday#state: how far along the Saturday is, start to finish. */
export type MatchdayState = "building" | "confirmed" | "rating" | "closed"

export type Matchday = {
  id: number
  played_on: string
  team_count: number
  status: "building" | "played"
  state: MatchdayState
  /** When the twelve-hour rating window shuts. Null until a result goes up. */
  ratings_close_at: string | null
  attendee_count: number
  /** Goals with two teams, matches won with three or more. Empty until it is captured. */
  result: Partial<Record<TeamColor, number>>
}

export function hasResult(matchday: Matchday) {
  return Object.keys(matchday.result).length > 0
}

/** "⚫ 5 - 3 ⚪" with two teams, "⚫ 3 · ⚪ 1 · 🟠 0" with three or more. */
export function resultText(matchday: Matchday) {
  const parts = TEAM_COLORS.filter((color) => matchday.result[color.value] !== undefined).map(
    (color) => `${color.emoji} ${matchday.result[color.value]}`,
  )
  return matchday.team_count === 2 ? parts.join(" - ") : parts.join(" · ")
}

/** The one label a Saturday carries, wherever it is listed. */
export function stateBadge(matchday: Matchday): {
  label: string
  tone: "accent" | "muted" | "signal"
} {
  switch (matchday.state) {
    case "rating":
      return { label: "Calificando", tone: "signal" }
    case "closed":
      return { label: "Cerrado", tone: "muted" }
    case "confirmed":
      return { label: "Confirmado", tone: "accent" }
    default:
      return { label: "Armando", tone: "muted" }
  }
}

export function teamColor(color: TeamColor) {
  return TEAM_COLORS.find((c) => c.value === color) ?? TEAM_COLORS[0]
}

export function averages(team: Team, byId: Map<number, RosterPlayer>) {
  if (team.members.length === 0) return { overall: 0, physical: 0, strength: 0 }
  let overall = 0
  let physical = 0
  let strength = 0
  for (const member of team.members) {
    const player = byId.get(member.player_id)
    overall += player?.overall ?? MIDPOINT
    physical += player?.physical ?? MIDPOINT
    // What TeamBuilder actually balances on: the ratings plus the adjustment.
    strength += (player?.overall ?? MIDPOINT) + (player?.elo ?? 0)
  }
  return {
    overall: overall / team.members.length,
    physical: physical / team.members.length,
    strength: strength / team.members.length,
  }
}

export type Balance = {
  spread: number
  level: "even" | "acceptable" | "uneven"
  label: string
}

/** How far apart the strongest and the weakest team are, on the 1-10 scale. */
export function balance(teams: Team[], byId: Map<number, RosterPlayer>): Balance {
  const values = teams.map((team) => averages(team, byId).strength)
  const spread = Math.max(...values) - Math.min(...values)
  if (spread < EVEN) return { spread, level: "even", label: "Parejo" }
  if (spread < ACCEPTABLE) return { spread, level: "acceptable", label: "Aceptable" }
  return { spread, level: "uneven", label: "Disparejo" }
}

/** 22 players into 3 teams is 8, 7 and 7. */
export function teamSizes(attendees: number, teamCount: number) {
  const base = Math.floor(attendees / teamCount)
  const extra = attendees % teamCount
  return Array.from({ length: teamCount }, (_, i) => base + (i < extra ? 1 : 0))
}

/** "7 por equipo", or "6, 5, 5, 5" when one team gets the odd man. */
export function sizeLabel(sizes: number[]) {
  return new Set(sizes).size === 1 ? `${sizes[0]} por equipo` : sizes.join(", ")
}

/** The Saturday the group is heading into — today when today is one. */
export function nextSaturday(from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7))
  return toISODate(date)
}

export function toISODate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Names and positions only — this is what lands in the group's WhatsApp. */
export function shareText(
  matchday: Matchday,
  teams: Team[],
  byId: Map<number, RosterPlayer>,
) {
  const blocks = teams.map((team) => {
    const { emoji, label } = teamColor(team.color)
    const lines = team.members.map((member) => {
      const name = byId.get(member.player_id)?.name ?? "?"
      return `• ${name} — ${positionLabel(member.position)}`
    })
    return [`${emoji} ${label.toUpperCase()}`, ...lines].join("\n")
  })
  return [`⚽ ${capitalize(formatDate(matchday.played_on))}`, ...blocks].join("\n\n")
}

export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
