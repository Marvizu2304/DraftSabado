import * as React from "react"
import { Link, usePage } from "@inertiajs/react"
import { Star } from "lucide-react"
import { MainNav } from "@/components/MainNav"
import { useTimeLeft } from "@/hooks/use-time-left"
import type { PageProps } from "@/types/inertia"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page text-ink-body">
      <MainNav />
      <main className="min-w-0 flex-1">
        <RatingPrompt />
        <div className="px-6 py-8 sm:px-10">
          <div className="mx-auto max-w-4xl">{children}</div>
        </div>
      </main>
    </div>
  )
}

/** While a Saturday's window is open and this player still owes ratings. */
function RatingPrompt() {
  const { props, url } = usePage<PageProps>()
  const prompt = props.rating_prompt
  if (!prompt || url.startsWith("/calificar")) return null

  const left = useTimeLeft(prompt.closes_at)

  return (
    <Link
      href="/calificar"
      className="flex items-center justify-center gap-2 border-b border-hairline bg-accent-faded px-4 py-2 text-center text-sm text-accent-display no-underline hover:brightness-95"
    >
      <Star className="h-4 w-4 shrink-0" />
      Te faltan {prompt.pending} por calificar
      {left && ` · cierran en ${left}`}
    </Link>
  )
}
