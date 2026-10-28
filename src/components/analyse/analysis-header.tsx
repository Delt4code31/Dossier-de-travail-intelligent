"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, FolderKanban, RefreshCw } from "lucide-react"

import { LineTabs } from "@/components/common/bits"
import { StatusPill } from "@/components/production/annual-file-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { checkCounts, getChecks } from "@/lib/data"
import { DEMO_NOW, formatDate, formatRelative } from "@/lib/format"
import { useAnnualFile } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"

export function AnalysisHeader({ id }: { id: string }) {
  const file = useAnnualFile(id)!
  const d = file.dossier
  const setActive = useDemoStore((s) => s.setActiveDossier)
  const recordSync = useDemoStore((s) => s.recordSync)
  const lastRun = useDemoStore((s) => s.syncs[`analyse:${id}`])
  const [running, setRunning] = useState(false)
  const counts = checkCounts(getChecks(d))
  const base = `/analyse/${id}`

  // Mémorise le dossier consulté pour le sélecteur de société
  useEffect(() => setActive(id), [id, setActive])

  function run() {
    setRunning(true)
    setTimeout(() => {
      setRunning(false)
      recordSync(`analyse:${id}`, DEMO_NOW.toISOString())
      toast.success("Analyse relancée", {
        description: "Balance, grand livre, factures et déclarations relus depuis Pennylane (démo).",
      })
    }, 1600)
  }

  return (
    <div className="border-b px-4 pt-5 sm:px-6">
      <Link href="/analyse" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-3.5" />
        Analyse
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{d.name}</h1>
          <Badge variant="outline" className="font-mono">
            {d.siren}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/production/dossiers-annuels/${id}`} />}>
            <FolderKanban data-icon="inline-start" />
            Dossier annuel
          </Button>
          <Button onClick={run} disabled={running}>
            <RefreshCw data-icon="inline-start" className={running ? "animate-spin" : undefined} />
            {running ? "Analyse en cours…" : "Relancer l'analyse"}
          </Button>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-muted-foreground">
          {file.exercise.label} (clos le {formatDate(file.exercise.end)}) comparé à {file.previousExercise.label.toLowerCase()}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <StatusPill
            tone={d.pennylane.status === "connecte" ? "green" : "red"}
            label="Données Pennylane"
            value={d.pennylane.status === "connecte" ? formatRelative(d.pennylane.lastSyncAt) : "synchro en erreur"}
          />
          <StatusPill tone="sky" label="Dernière analyse" value={lastRun ? "à l'instant" : formatRelative(file.lastActivityAt)} />
        </div>
      </div>
      <LineTabs
        className="mt-4"
        tabs={[
          { label: "Synthèse", href: base, exact: true },
          { label: "Revue analytique", href: `${base}/revue-analytique` },
          { label: "Contrôles", href: `${base}/controles`, count: counts.anomalie, tone: "danger" },
          { label: "Assistant IA", href: `${base}/assistant` },
        ]}
      />
    </div>
  )
}
