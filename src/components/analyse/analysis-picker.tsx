"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, CircleX, Sparkles, TriangleAlert } from "lucide-react"

import { Variation } from "@/components/common/bits"
import { PageContainer, PageHeader } from "@/components/common/page"
import { AnnualStatusBadge } from "@/components/common/status"
import { FilterChip, SearchInput, normalizeSearch } from "@/components/common/table-tools"
import { Button } from "@/components/ui/button"
import {
  CURRENT_USER_ID,
  checkCounts,
  computeIndicators,
  dossierTeamIds,
  getChecks,
  getFinancials,
} from "@/lib/data"
import { formatDate, formatEurCompact } from "@/lib/format"
import { useAnnualFiles, useMounted } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"

type Filter = "production" | "mes-dossiers" | "tous"

/** Choix du dossier à analyser. */
export function AnalysisPicker() {
  const files = useAnnualFiles()
  const activeId = useDemoStore((s) => s.activeDossierId)
  const mounted = useMounted()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("production")

  const rows = useMemo(
    () =>
      files.map((f) => {
        const { lines } = getFinancials(f.dossier)
        const n = computeIndicators(lines, "n")
        const n1 = computeIndicators(lines, "n1")
        const counts = checkCounts(getChecks(f.dossier))
        return { f, n, n1, counts }
      }),
    [files],
  )

  const filtered = rows
    .filter(({ f }) => {
      const q = normalizeSearch(query.trim())
      if (q && !normalizeSearch(f.dossier.name).includes(q) && !f.dossier.siren.includes(q)) return false
      if (filter === "production" && f.status === "depose") return false
      if (filter === "mes-dossiers" && !dossierTeamIds(f.dossier).includes(CURRENT_USER_ID)) return false
      return true
    })
    .sort((a, b) => b.counts.anomalie - a.counts.anomalie || a.f.dossier.name.localeCompare(b.f.dossier.name, "fr"))

  const resume = mounted && activeId ? rows.find((r) => r.f.dossierId === activeId) : undefined

  return (
    <PageContainer>
      <PageHeader
        title="Analyse"
        description="Analyse automatique des données comptables Pennylane : indicateurs, revue analytique N / N-1, contrôles et assistant IA. Choisissez un dossier."
      />

      {resume && (
        <Link
          href={`/analyse/${resume.f.dossierId}`}
          className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/60"
        >
          <Sparkles className="size-4 text-sky-500" />
          <span className="text-sm">
            Reprendre l&apos;analyse de <span className="font-semibold">{resume.f.dossier.name}</span>
          </span>
          <ArrowRight className="ml-auto size-4 text-muted-foreground" />
        </Link>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher (nom, SIREN)…" />
        <FilterChip active={filter === "production"} onClick={() => setFilter("production")} label="En production" count={rows.filter((r) => r.f.status !== "depose").length} />
        <FilterChip active={filter === "mes-dossiers"} onClick={() => setFilter("mes-dossiers")} label="Mes dossiers" count={rows.filter((r) => dossierTeamIds(r.f.dossier).includes(CURRENT_USER_ID)).length} />
        <FilterChip active={filter === "tous"} onClick={() => setFilter("tous")} label="Tous" count={rows.length} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {filtered.map(({ f, n, n1, counts }) => (
          <Link
            key={f.id}
            href={`/analyse/${f.dossierId}`}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{f.dossier.name}</div>
                <div className="text-xs text-muted-foreground">
                  {f.exercise.label} · clos le {formatDate(f.exercise.end)}
                </div>
              </div>
              <AnnualStatusBadge status={f.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Chiffre d&apos;affaires</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-semibold">{formatEurCompact(n.ca)}</span>
                  <Variation n={n.ca} n1={n1.ca} />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Résultat net</div>
                <div className="flex items-baseline gap-1.5">
                  <span className={n.resultatNet < 0 ? "text-base font-semibold text-red-600" : "text-base font-semibold"}>
                    {formatEurCompact(n.resultatNet)}
                  </span>
                  <Variation n={n.resultatNet} n1={n1.resultatNet} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t pt-3 text-xs">
              {counts.anomalie > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 font-medium text-red-700">
                  <CircleX className="size-3" /> {counts.anomalie} anomalie(s)
                </span>
              )}
              {counts.attention > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                  <TriangleAlert className="size-3" /> {counts.attention} à examiner
                </span>
              )}
              {counts.anomalie + counts.attention === 0 && <span className="text-muted-foreground">Aucune alerte</span>}
              <Button
                variant="ghost"
                size="xs"
                className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
                nativeButton={false}
                render={<span />}
              >
                Analyser
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </Link>
        ))}
      </div>
    </PageContainer>
  )
}
