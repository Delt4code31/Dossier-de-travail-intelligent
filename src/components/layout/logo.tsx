import Link from "next/link"

import { cn } from "@/lib/utils"

/** Logo « cpa. » identique à Fiscalis, suivi du nom de l'application. */
export function CpaLogo({ className, showApp = true }: { className?: string; showApp?: boolean }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2 outline-none", className)}>
      <span className="text-xl font-extrabold tracking-tight">
        cpa<span className="text-sky-500">.</span>
      </span>
      {showApp && (
        <>
          <span aria-hidden className="text-lg font-light text-border">
            /
          </span>
          <span className="text-sm font-medium whitespace-nowrap">Dossier de travail</span>
        </>
      )}
    </Link>
  )
}
