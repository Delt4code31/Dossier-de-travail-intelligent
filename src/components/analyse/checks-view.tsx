"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ChevronDown, MessageCirclePlus, Plug } from "lucide-react"

import { CHECK_LABEL, CheckStatusIcon } from "@/components/common/status"
import { FilterChip } from "@/components/common/table-tools"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CURRENT_USER_ID,
  CYCLES,
  checkCounts,
  getChecks,
  getDossier,
  type AutoCheck,
  type CheckStatus,
} from "@/lib/data"
import { DEMO_NOW, formatDate, formatEur } from "@/lib/format"
import { useAnnualFile } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type Filter = "alertes" | CheckStatus | "tous"

const ORDER: CheckStatus[] = ["anomalie", "attention", "ok", "na"]

export function ChecksView({ id }: { id: string }) {
  const d = getDossier(id)!
  const file = useAnnualFile(id)!
  const checks = getChecks(d)
  const counts = checkCounts(checks)
  const [filter, setFilter] = useState<Filter>(counts.anomalie + counts.attention > 0 ? "alertes" : "tous")

  const visible = checks
    .filter((c) => (filter === "tous" ? true : filter === "alertes" ? c.status === "anomalie" || c.status === "attention" : c.status === filter))
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === "alertes"} onClick={() => setFilter("alertes")} label="À traiter" count={counts.anomalie + counts.attention} />
        <FilterChip active={filter === "anomalie"} onClick={() => setFilter("anomalie")} label="Anomalies" count={counts.anomalie} tone="danger" />
        <FilterChip active={filter === "attention"} onClick={() => setFilter("attention")} label="À examiner" count={counts.attention} />
        <FilterChip active={filter === "ok"} onClick={() => setFilter("ok")} label="Conformes" count={counts.ok} />
        <FilterChip active={filter === "tous"} onClick={() => setFilter("tous")} label="Tous" count={checks.length} />
        <span className="ml-auto text-xs text-muted-foreground">{checks.length} contrôles exécutés sur les données Pennylane</span>
      </div>

      {file.status === "depose" && (
        <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Dossier déposé : les anomalies courantes ont été corrigées avant l&apos;arrêté des comptes.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {visible.map((c) => (
          <CheckCard key={c.id} check={c} fileId={file.id} canCreate={file.status !== "depose"} />
        ))}
        {visible.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucun contrôle dans cette catégorie.</p>}
      </div>
    </div>
  )
}

function CheckCard({ check, fileId, canCreate }: { check: AutoCheck; fileId: string; canCreate: boolean }) {
  const [open, setOpen] = useState(false)
  const addPending = useDemoStore((s) => s.addPending)
  const cycle = CYCLES.find((x) => x.code === check.cycle)
  const hasDetails = check.details.length > 0

  function createPending() {
    addPending({
      id: `${fileId}-chk-${check.id}-${Date.now()}`,
      annualFileId: fileId,
      kind: check.id === "justificatifs" ? "document" : "question",
      cycle: cycle ? cycle.code : null,
      label: `${check.label} — ${check.summary}`,
      status: "ouvert",
      createdAt: DEMO_NOW.toISOString(),
      createdBy: CURRENT_USER_ID,
      assignee: "client",
    })
    toast.success("Point en suspens créé", { description: "Il apparaît dans l'onglet « Points en suspens » du dossier annuel." })
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-xl border bg-card",
          check.status === "anomalie" && "border-red-200",
          check.status === "attention" && "border-amber-200",
        )}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <CheckStatusIcon status={check.status} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold">{check.label}</span>
              <span className="text-xs text-muted-foreground">{CHECK_LABEL[check.status]}</span>
              {cycle && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Cycle {cycle.code} — {cycle.name}</span>}
            </div>
            <div className="mt-0.5 text-sm text-foreground/80">{check.summary}</div>
            <div className="mt-1 text-xs text-muted-foreground">{check.description}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger render={<span tabIndex={0} className="hidden items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground md:inline-flex" />}>
                <Plug className="size-3" />
                {check.source}
              </TooltipTrigger>
              <TooltipContent>Outil du MCP Pennylane qui alimente ce contrôle en production</TooltipContent>
            </Tooltip>
            {(check.status === "anomalie" || check.status === "attention") && canCreate && (
              <Button variant="ghost" size="sm" onClick={createPending}>
                <MessageCirclePlus data-icon="inline-start" />
                Point en suspens
              </Button>
            )}
            {hasDetails && (
              <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Voir le détail" />}>
                <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
              </CollapsibleTrigger>
            )}
          </div>
        </div>
        {hasDetails && (
          <CollapsibleContent>
            <div className="border-t px-4 py-2">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1.5 text-left font-medium">Compte</th>
                    <th className="py-1.5 text-left font-medium">Libellé</th>
                    <th className="py-1.5 text-left font-medium">Date / note</th>
                    <th className="py-1.5 text-right font-medium">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {check.details.map((row, i) => (
                    <tr key={i}>
                      <td className="py-1.5 font-mono text-muted-foreground">{row.account ?? "—"}</td>
                      <td className="py-1.5">{row.label}</td>
                      <td className="py-1.5 text-muted-foreground">{row.date ? formatDate(row.date) : (row.note ?? "—")}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.amount !== undefined ? formatEur(row.amount, true) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  )
}
