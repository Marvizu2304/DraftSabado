/** "3 h 20 min" until the deadline, or null once it is behind us. */
export function timeLeft(iso: string | null, now = Date.now()) {
  if (!iso) return null
  const minutes = Math.floor((new Date(iso).getTime() - now) / 60000)
  if (minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`
}
