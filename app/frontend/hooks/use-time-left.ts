import * as React from "react"
import { timeLeft } from "@/lib/time"

/**
 * The countdown to a deadline, ticking every minute. Null on the first render
 * — the clock is only read in an effect, so the server and the browser always
 * agree on what to paint first.
 */
export function useTimeLeft(iso: string | null) {
  const [left, setLeft] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!iso) return setLeft(null)

    const tick = () => setLeft(timeLeft(iso))
    tick()
    const timer = setInterval(tick, 60_000)
    return () => clearInterval(timer)
  }, [iso])

  return left
}
