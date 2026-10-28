import { FolderOpen } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

/** Logo de l'application : pictogramme neutre suivi du nom « Dossier de travail ». */
export function AppLogo({ className, showApp = true }: { className?: string; showApp?: boolean }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2 outline-none", className)}>
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <FolderOpen className="size-4" />
      </span>
      {showApp && <span className="text-sm font-semibold whitespace-nowrap">Dossier de travail</span>}
    </Link>
  )
}
