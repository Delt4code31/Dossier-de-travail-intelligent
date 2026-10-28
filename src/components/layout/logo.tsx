import Link from "next/link"

import { cn } from "@/lib/utils"

/** Nom de l'application, en lien vers l'accueil. */
export function CpaLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2 outline-none", className)}>
      <span className="text-base font-semibold whitespace-nowrap">Dossier de travail</span>
    </Link>
  )
}
