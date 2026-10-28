"use client"

import Link from "next/link"
import { ArrowRight, CircleX, MessageCircleQuestionMark, TriangleAlert } from "lucide-react"

import { UserAvatar, Variation } from "@/components/common/bits"
import { Panel } from "@/components/common/page"
import { CycleStatusBadge, DueDate } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import {
  CYCLES,
  checkCounts,
  computeIndicators,
  cycleCounts,
  cycleStatus,
  getChecks,
  getFinancials,
  greffeDeadline,
  userName,
} from "@/lib/data"
import { daysUntil, formatDate, formatEurCompact } from "@/lib/format"
import { useAnnualFile } from "@/lib/hooks"
import { cn } from "@/lib/utils"

export function AnnualFileSynthese({ id }: { id: string }) {
  const file = useAnnualFile(id)!
  const d = file.dossier
  const { lines } = getFinancials(d)
  const n = computeIndicators(lines, "n")
  const n1 = computeIndicators(lines, "n1")
  const counts = checkCounts(getChecks(d))
  const base = `/production/dossiers-annuels/${id}`

  const figures = [
    { label: "Chiffre d'affaires", n: n.ca, n1: n1.ca, favorable: "up" as const },
    { label: "Résultat net", n: n.resultatNet, n1: n1.resultatNet, favorable: "up" as const },
    { label: "Capitaux propres", n: n.capitauxPropres, n1: n1.capitauxPropres, favorable: "up" as const },
    { label: "Trésorerie nette", n: n.tresorerieNette, n1: n1.tresorerieNette, favorable: "up" as const },
  ]

  const deadlines = [
    { label: "Dépôt de la liasse fiscale", date: file.dueDate, done: file.status === "depose" },
    { label: "Approbation des comptes (AG)", date: file.agDeadline, done: file.status === "depose" && daysUntil(file.agDeadline) < 0 },
    { label: "Dépôt des comptes au greffe", date: greffeDeadline(file.exercise.end), done: file.status === "depose" && daysUntil(greffeDeadline(file.exercise.end)) < 0 },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {figures.map((f) => (
          <div key={f.label} className="rounded-xl border px-4 py-3.5">
            <div className="text-xs font-medium text-muted-foreground">{f.label}</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className={cn("text-2xl font-semibold tracking-tight tabular-nums", f.n < 0 && "text-red-600")}>{formatEurCompact(f.n)}</span>
              <Variation n={f.n} n1={f.n1} favorable={f.favorable} />
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">N-1 : {formatEurCompact(f.n1)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Avancement par cycle"
          description={`${file.progress.done} / ${file.progress.applicable} contrôles préparés · ${file.progress.reviewed} / ${file.progress.reviewable} cycles revus`}
          action={
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`${base}/cycles`} />}>
              Ouvrir les cycles
            </Button>
          }
        >
          <ul className="divide-y">
            {file.cycles.map((c) => {
              const def = CYCLES.find((x) => x.code === c.code)!
              const cc = cycleCounts(c)
              const st = cycleStatus(c)
              const pct = cc.applicable ? Math.round((cc.done / cc.applicable) * 100) : 100
              return (
                <li key={c.code}>
                  <Link href={`${base}/cycles?cycle=${c.code}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-semibold">{c.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{def.name}</span>
                    {cc.applicable === 0 ? (
                      <span className="text-xs text-muted-foreground">Sans objet</span>
                    ) : (
                      <>
                        <span className="hidden w-28 sm:block">
                          <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                            <span className={cn("block h-full rounded-full", st === "revu" ? "bg-emerald-500" : "bg-foreground")} style={{ width: `${pct}%` }} />
                          </span>
                        </span>
                        <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                          {cc.done}/{cc.applicable}
                        </span>
                        <span className="w-20 text-right">
                          <CycleStatusBadge status={st} />
                        </span>
                        <span className="w-6">{c.reviewedBy && <UserAvatar userId={c.reviewedBy} />}</span>
                      </>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Échéances">
            <ul className="divide-y">
              {deadlines.map((dl) => (
                <li key={dl.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-sm">{dl.label}</span>
                  <DueDate date={dl.date} daysLeft={daysUntil(dl.date)} done={dl.done} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Analyse automatique" description="Contrôles réalisés sur les données Pennylane">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                  <CircleX className="size-3.5" /> {file.status === "depose" ? 0 : counts.anomalie} anomalie(s)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  <TriangleAlert className="size-3.5" /> {file.status === "depose" ? 0 : counts.attention} à examiner
                </span>
              </div>
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/analyse/${id}/controles`} />}>
                Voir les contrôles
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </Panel>

          <Panel title="Points en suspens">
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="inline-flex items-center gap-2 text-sm">
                <MessageCircleQuestionMark className="size-4 text-muted-foreground" />
                <span className="font-semibold tabular-nums">{file.openPending}</span> ouvert(s) sur {file.pending.length}
              </span>
              <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`${base}/points-en-suspens`} />}>
                Ouvrir
              </Button>
            </div>
          </Panel>

          <Panel title="Équipe">
            <ul className="divide-y">
              {[
                { role: "Collaborateur", id: d.team.collaborateur },
                { role: "Chef de mission", id: d.team.chefMission },
                { role: "Associé signataire", id: d.team.associe },
              ].map((m) => (
                <li key={m.role} className="flex items-center gap-3 px-4 py-2.5">
                  <UserAvatar userId={m.id} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{userName(m.id)}</div>
                    <div className="text-xs text-muted-foreground">{m.role}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Exercice précédent : {file.previousExercise.label.toLowerCase()} (clos le {formatDate(file.previousExercise.end)}).
      </p>
    </div>
  )
}
