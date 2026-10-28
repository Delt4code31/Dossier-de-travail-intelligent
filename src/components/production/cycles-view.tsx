"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, Lock, ShieldCheck, Undo2 } from "lucide-react"

import { ProgressBar, UserAvatar } from "@/components/common/bits"
import { CycleStatusBadge } from "@/components/common/status"
import { FilterChip } from "@/components/common/table-tools"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import {
  CURRENT_USER_ID,
  CYCLES,
  cycleAmount,
  cycleCounts,
  cycleStatus,
  getDossier,
  getUser,
  userShortName,
  type CycleProgress,
  type CycleStatus,
} from "@/lib/data"
import { DEMO_NOW, formatDate, formatEur } from "@/lib/format"
import { useAnnualFile } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type Filter = "tous" | CycleStatus

export function CyclesView({ id, target }: { id: string; target: string | null }) {
  const file = useAnnualFile(id)!
  const [filter, setFilter] = useState<Filter>("tous")
  const [openCycles, setOpenCycles] = useState<Set<string>>(() => {
    const open = new Set(file.cycles.filter((c) => ["a_faire", "en_cours"].includes(cycleStatus(c))).map((c) => c.code))
    if (target) open.add(target)
    return open
  })
  const readOnly = file.status === "depose"

  // Fait défiler jusqu'au cycle demandé dans l'URL (?cycle=A)
  useEffect(() => {
    if (target) document.getElementById(`cycle-${target}`)?.scrollIntoView({ block: "start", behavior: "smooth" })
  }, [target])

  const visible = file.cycles.filter((c) => filter === "tous" || cycleStatus(c) === filter)
  const countBy = (s: CycleStatus) => file.cycles.filter((c) => cycleStatus(c) === s && cycleCounts(c).applicable > 0).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border px-4 py-3">
        <div className="min-w-56 flex-1">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Avancement du dossier</span>
            <span className="tabular-nums">
              {file.progress.done}/{file.progress.applicable} contrôles · {file.progress.reviewed}/{file.progress.reviewable} cycles revus
            </span>
          </div>
          <ProgressBar value={file.progress.pct} tone={file.late ? "danger" : file.progress.pct === 100 ? "success" : "default"} />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={filter === "tous"} onClick={() => setFilter("tous")} label="Tous" count={file.cycles.length} />
          <FilterChip active={filter === "a_faire"} onClick={() => setFilter("a_faire")} label="À faire" count={countBy("a_faire")} />
          <FilterChip active={filter === "en_cours"} onClick={() => setFilter("en_cours")} label="En cours" count={countBy("en_cours")} />
          <FilterChip active={filter === "fait"} onClick={() => setFilter("fait")} label="Préparés" count={countBy("fait")} />
          <FilterChip active={filter === "revu"} onClick={() => setFilter("revu")} label="Revus" count={countBy("revu")} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpenCycles(openCycles.size ? new Set() : new Set(file.cycles.map((c) => c.code)))}
        >
          {openCycles.size ? "Tout replier" : "Tout déplier"}
        </Button>
      </div>

      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Lock className="size-4" />
          Dossier déposé : les cycles sont en lecture seule.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((c) => (
          <CycleCard
            key={c.code}
            fileId={file.id}
            cycle={c}
            dossierId={file.dossierId}
            open={openCycles.has(c.code)}
            onOpenChange={(o) => {
              const next = new Set(openCycles)
              if (o) next.add(c.code)
              else next.delete(c.code)
              setOpenCycles(next)
            }}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  )
}

function CycleCard({
  fileId,
  dossierId,
  cycle,
  open,
  onOpenChange,
  readOnly,
}: {
  fileId: string
  dossierId: string
  cycle: CycleProgress
  open: boolean
  onOpenChange: (open: boolean) => void
  readOnly: boolean
}) {
  const def = CYCLES.find((x) => x.code === cycle.code)!
  const setControl = useDemoStore((s) => s.setControl)
  const setReview = useDemoStore((s) => s.setReview)
  const setComment = useDemoStore((s) => s.setCycleComment)
  const counts = cycleCounts(cycle)
  const status = cycleStatus(cycle)
  const complete = Object.values(cycle.controls).every((s) => s !== "todo")
  const amount = getAmount(dossierId, cycle.code)
  const [draft, setDraft] = useState(cycle.comment)
  const me = getUser(CURRENT_USER_ID)!

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div id={`cycle-${cycle.code}`} className="scroll-mt-4 rounded-xl border bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-sm font-semibold">{cycle.code}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{def.name}</span>
            <span className="block truncate text-xs text-muted-foreground">Comptes {def.accounts}</span>
          </span>
          {amount && (
            <span className="hidden text-right md:block">
              <span className="block text-sm tabular-nums">{formatEur(amount.n)}</span>
              <span className="block text-xs text-muted-foreground tabular-nums">N-1 {formatEur(amount.n1)}</span>
            </span>
          )}
          <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
            {counts.applicable ? `${counts.done}/${counts.applicable}` : "—"}
          </span>
          <span className="w-20 text-right">
            {counts.applicable ? <CycleStatusBadge status={status} /> : <span className="text-xs text-muted-foreground">Sans objet</span>}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            <ul className="divide-y">
              {def.controls.map((ctrl) => {
                const state = cycle.controls[ctrl.id] ?? "todo"
                return (
                  <li key={ctrl.id} className={cn("flex items-center gap-3 px-4 py-2.5", state === "na" && "bg-muted/30")}>
                    <Checkbox
                      checked={state === "done"}
                      disabled={readOnly || state === "na"}
                      onCheckedChange={(checked) => setControl(fileId, ctrl.id, checked ? "done" : "todo")}
                      aria-label={ctrl.label}
                    />
                    <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{ctrl.id}</span>
                    <span className={cn("flex-1 text-sm", state === "na" && "text-muted-foreground line-through")}>{ctrl.label}</span>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-muted-foreground"
                        onClick={() => setControl(fileId, ctrl.id, state === "na" ? "todo" : "na")}
                      >
                        {state === "na" ? "Rétablir" : "Sans objet"}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className="grid gap-3 border-t px-4 py-3 lg:grid-cols-[1fr_auto]">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => draft !== cycle.comment && setComment(fileId, cycle.code, draft)}
                placeholder="Commentaire de travail sur le cycle (conclusion, points relevés…)"
                className="min-h-16 text-sm"
                disabled={readOnly}
              />
              <div className="flex flex-col justify-between gap-2 text-xs text-muted-foreground lg:w-64 lg:items-end">
                <div className="space-y-1 lg:text-right">
                  <div className="flex items-center gap-1.5 lg:justify-end">
                    {cycle.preparedBy && <UserAvatar userId={cycle.preparedBy} />}
                    {cycle.preparedBy && cycle.preparedAt
                      ? `Préparé par ${userShortName(cycle.preparedBy)} le ${formatDate(cycle.preparedAt)}`
                      : "Non préparé"}
                  </div>
                  <div className="flex items-center gap-1.5 lg:justify-end">
                    {cycle.reviewedBy && <UserAvatar userId={cycle.reviewedBy} />}
                    {cycle.reviewedBy && cycle.reviewedAt
                      ? `Revu par ${userShortName(cycle.reviewedBy)} le ${formatDate(cycle.reviewedAt)}`
                      : "Revue non faite"}
                  </div>
                </div>
                {!readOnly && counts.applicable > 0 &&
                  (cycle.reviewedBy ? (
                    <Button variant="outline" size="sm" onClick={() => setReview(fileId, cycle.code, null)}>
                      <Undo2 data-icon="inline-start" />
                      Retirer la revue
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!complete}
                      onClick={() => {
                        setReview(fileId, cycle.code, { by: CURRENT_USER_ID, at: DEMO_NOW.toISOString() })
                        toast.success(`Cycle ${def.name} revu`, { description: `Visa de revue apposé par ${me.firstName} ${me.lastName}.` })
                      }}
                    >
                      <ShieldCheck data-icon="inline-start" />
                      Viser la revue
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function getAmount(dossierId: string, code: string) {
  const d = getDossier(dossierId)
  return d ? cycleAmount(d, code) : null
}
