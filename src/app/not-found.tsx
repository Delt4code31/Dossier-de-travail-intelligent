import Link from "next/link"

import { CpaLogo } from "@/components/layout/logo"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <CpaLogo />
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Page introuvable</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Ce dossier ou cette page n&apos;existe pas (ou plus).</p>
      <Button nativeButton={false} render={<Link href="/" />}>
        Retour à l&apos;accueil
      </Button>
    </div>
  )
}
