"use client"

import Link from "next/link"
import { toast } from "sonner"
import { ChartLine, ChevronLeft, Send, ShieldCheck, Stamp, Play } from "lucide-react"

import { LineTabs } from "@/components/common/bits"
import { AnnualStatusBadge } from "@/components/common/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CURRENT_USER_ID, MISSIONS, TAX_REGIMES, getUser } from "@/lib/data"
import { DEMO_NOW, formatDate, formatRelative } from "@/lib/format"
import { useAnnualFile } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"
import { cn } from "@/lib/utils"

/** Pastille d'état (comme « Messages · il y a 15 min » dans Fiscalis) */
export function StatusPill({
  tone,
  label,
  value,
  href,
}: {
  tone: "green" | "amber" | "red" | "gray" | "sky"
  label: string
  value?: string
  href?: string
}) {
  const dot = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", gray: "bg-neutral-300", sky: "bg-sky-500" }[tone]
  const cls = "inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-xs whitespace-nowrap"
  const content = (
    <>
      <span className={cn("size-1.5 rounded-full", dot)} />
      <span className="font-medium">{label}</span>
      {value && <span className="text-muted-foreground">{value}</span>}
    </>
  )
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-muted")}>
      {content}
    </Link>
  ) : (
    <span className={cls}>{content}</span>
  )
}

export function AnnualFileHeader({ id }: { id: string }) {
  const file = useAnnualFile(id)!
  const setStatus = useDemoStore((s) => s.setStatus)
  const d = file.dossier
  const base = `/production/dossiers-annuels/${id}`
  const me = getUser(CURRENT_USER_ID)!
  const allPrepared = file.progress.done === file.progress.applicable
  const allReviewed = file.progress.reviewed === file.progress.reviewable

  function action() {
    switch (file.status) {
      case "non_demarre":
        return (
          <Button onClick={() => { setStatus(id, "en_cours"); toast.success("Dossier démarré", { description: "La demande de pièces de clôture peut être envoyée au client." }) }}>
            <Play data-icon="inline-start" />
            Démarrer le dossier
          </Button>
        )
      case "en_cours":
        return (
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={allPrepared ? -1 : 0} />}>
              <Button
                disabled={!allPrepared}
                onClick={() => { setStatus(id, "en_revue"); toast.success("Dossier envoyé en revue", { description: "Le chef de mission est notifié." }) }}
              >
                <Send data-icon="inline-start" />
                Envoyer en revue
              </Button>
            </TooltipTrigger>
            {!allPrepared && (
              <TooltipContent>Il reste {file.progress.applicable - file.progress.done} contrôle(s) à préparer</TooltipContent>
            )}
          </Tooltip>
        )
      case "en_revue":
        return (
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={allReviewed ? -1 : 0} />}>
              <Button
                disabled={!allReviewed}
                onClick={() => { setStatus(id, "valide"); toast.success("Dossier validé", { description: `Validé par ${me.firstName} ${me.lastName}. La liasse peut être déposée.` }) }}
              >
                <ShieldCheck data-icon="inline-start" />
                Valider le dossier
              </Button>
            </TooltipTrigger>
            {!allReviewed && (
              <TooltipContent>{file.progress.reviewable - file.progress.reviewed} cycle(s) encore à réviser</TooltipContent>
            )}
          </Tooltip>
        )
      case "valide":
        return (
          <Button onClick={() => { setStatus(id, "depose"); toast.success("Liasse marquée comme déposée", { description: `Dépôt enregistré le ${formatDate(DEMO_NOW.toISOString())}.` }) }}>
            <Stamp data-icon="inline-start" />
            Marquer comme déposé
          </Button>
        )
      default:
        return null
    }
  }

  const pennylaneTone = d.pennylane.status === "connecte" ? "green" : "red"
  const dueTone = file.status === "depose" ? "gray" : file.late ? "red" : file.daysLeft <= 15 ? "amber" : "green"

  return (
    <div className="border-b px-4 pt-5 sm:px-6">
      <Link href="/production/dossiers-annuels" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-3.5" />
        Dossiers annuels
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{d.name}</h1>
          <Badge variant="outline" className="font-mono">
            {d.siren}
          </Badge>
          <AnnualStatusBadge status={file.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/analyse/${id}`} />}>
            <ChartLine data-icon="inline-start" />
            Analyser
          </Button>
          {action()}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-sm text-muted-foreground">
          {file.exercise.label} · clos le {formatDate(file.exercise.end)} · {MISSIONS[d.mission]} · {TAX_REGIMES[d.taxRegime]}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <StatusPill
            tone={pennylaneTone}
            label="Pennylane"
            value={d.pennylane.status === "connecte" ? formatRelative(d.pennylane.lastSyncAt) : "erreur"}
            href="/admin"
          />
          <StatusPill
            tone={d.sharepoint.status === "connecte" ? "green" : "amber"}
            label="SharePoint"
            value={d.sharepoint.lastSyncAt ? formatRelative(d.sharepoint.lastSyncAt) : "non relié"}
            href={`/ged?d=${d.id}`}
          />
          <StatusPill
            tone={dueTone}
            label={file.status === "depose" ? "Déposé" : "Échéance"}
            value={file.status === "depose" && file.filedAt ? formatDate(file.filedAt) : `${formatDate(file.dueDate)}${file.late ? " · en retard" : ` · J-${file.daysLeft}`}`}
          />
        </div>
      </div>
      <LineTabs
        className="mt-4"
        tabs={[
          { label: "Synthèse", href: base, exact: true },
          { label: "Cycles de révision", href: `${base}/cycles`, count: file.progress.applicable - file.progress.done },
          { label: "Points en suspens", href: `${base}/points-en-suspens`, count: file.openPending, tone: "danger" },
          { label: "Historique", href: `${base}/historique` },
        ]}
      />
    </div>
  )
}
