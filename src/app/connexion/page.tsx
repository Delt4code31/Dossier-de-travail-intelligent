import type { Metadata } from "next"
import Link from "next/link"

import { AppLogo } from "@/components/layout/logo"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Connexion" }

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" className="size-4" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

/** Écran de connexion (démo : le bouton ouvre directement l'application). */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-background p-8 shadow-sm">
        <AppLogo className="justify-center" />
        <div className="mt-6 space-y-1 text-center">
          <h1 className="text-lg font-semibold tracking-tight">Connexion</h1>
          <p className="text-sm text-muted-foreground">Accédez à vos dossiers avec votre compte du cabinet.</p>
        </div>
        <Button variant="outline" size="lg" className="mt-6 w-full" nativeButton={false} render={<Link href="/" />}>
          <MicrosoftMark />
          Continuer avec Microsoft
        </Button>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prototype — la connexion réelle utilisera le compte Microsoft 365 du cabinet.
        </p>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Cabinet Exemple · Expertise comptable</p>
    </div>
  )
}
