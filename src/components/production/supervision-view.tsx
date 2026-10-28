"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { ProgressBar, UserAvatar } from "@/components/common/bits"
import { PageContainer, PageHeader, Panel } from "@/components/common/page"
import { AnnualStatusBadge, DueDate } from "@/components/common/status"
import { InlineSelect } from "@/components/common/table-tools"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ANNUAL_STATUS, getUser, userName, type AnnualStatus } from "@/lib/data"
import { DEMO_NOW, formatNumber } from "@/lib/format"
import { useAnnualFiles, type AnnualFileView } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/** Couleur de série unique (bleu validé : contraste ≥ 3:1, bande de luminosité) */
const SERIES = "#2a78d6"

const TEAM_OPTIONS = [
  { value: "toutes", label: "Toutes les équipes" },
  { value: "pme", label: "Pôle PME" },
  { value: "tpe", label: "Pôle TPE & Indépendants" },
] as const

const STATUS_ORDER: AnnualStatus[] = ["non_demarre", "en_cours", "en_revue", "valide", "depose"]

function ViewToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(v: string[]) => v[0] && onChange(v[0])}
      variant="outline"
      size="sm"
      spacing={0}
    >
      <ToggleGroupItem value="graphique" className="px-2 text-xs">
        Graphique
      </ToggleGroupItem>
      <ToggleGroupItem value="tableau" className="px-2 text-xs">
        Tableau
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export function SupervisionView() {
  const all = useAnnualFiles()
  const [team, setTeam] = useState<"toutes" | "pme" | "tpe">("toutes")
  const [progressView, setProgressView] = useState("graphique")
  const [monthView, setMonthView] = useState("graphique")

  const files = useMemo(
    () => all.filter((f) => team === "toutes" || getUser(f.dossier.team.associe)?.team === team),
    [all, team],
  )
  const open = files.filter((f) => f.status !== "depose")
  const late = open.filter((f) => f.late)
  const avg = open.length ? Math.round(open.reduce((s, f) => s + f.progress.pct, 0) / open.length) : 100

  // Charge par collaborateur
  const byCollaborator = useMemo(() => {
    const map = new Map<string, AnnualFileView[]>()
    for (const f of files) {
      const id = f.dossier.team.collaborateur
      map.set(id, [...(map.get(id) ?? []), f])
    }
    return [...map.entries()]
      .map(([id, list]) => {
        const active = list.filter((f) => f.status !== "depose")
        return {
          id,
          name: userName(id),
          short: getUser(id)?.firstName ?? id,
          total: list.length,
          byStatus: Object.fromEntries(STATUS_ORDER.map((s) => [s, list.filter((f) => f.status === s).length])) as Record<AnnualStatus, number>,
          late: list.filter((f) => f.late).length,
          active: active.length,
          avg: active.length ? Math.round(active.reduce((s, f) => s + f.progress.pct, 0) / active.length) : null,
        }
      })
      .sort((a, b) => b.active - a.active || a.name.localeCompare(b.name))
  }, [files])

  const progressData = byCollaborator.filter((c) => c.avg !== null).map((c) => ({ name: c.short, full: c.name, avg: c.avg!, active: c.active }))

  // Liasses déposées par mois (campagne 2026)
  const months = Array.from({ length: 10 }, (_, i) => new Date(Date.UTC(2026, i, 1)))
  const monthData = months.map((m) => {
    const count = files.filter((f) => {
      if (f.status !== "depose") return false
      const at = new Date(f.filedAt ?? DEMO_NOW.toISOString())
      return at.getUTCFullYear() === m.getUTCFullYear() && at.getUTCMonth() === m.getUTCMonth()
    }).length
    return {
      label: new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(m),
      full: new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(m),
      count,
    }
  })
  const maxMonth = Math.max(...monthData.map((m) => m.count))

  const upcoming = open.filter((f) => f.daysLeft <= 120).sort((a, b) => a.daysLeft - b.daysLeft)
  const atRisk = open
    .filter((f) => f.late || (f.daysLeft <= 15 && f.progress.pct < 70) || f.anomalies >= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const progressConfig = { avg: { label: "Avancement moyen", color: SERIES } } satisfies ChartConfig
  const monthConfig = { count: { label: "Liasses déposées", color: SERIES } } satisfies ChartConfig

  return (
    <PageContainer>
      <PageHeader
        title="Supervision"
        description="Vue d'ensemble de la production du cabinet : avancement, charge des équipes, échéances et dossiers à risque."
        actions={<InlineSelect value={team} onChange={setTeam} options={[...TEAM_OPTIONS]} className="min-w-52" />}
      />

      {/* Pipeline de production : le nombre est le graphique */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/production/dossiers-annuels?statut=${s}`}
            className="rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40"
          >
            <AnnualStatusBadge status={s} />
            <div className="mt-2 text-2xl font-semibold tracking-tight">{files.filter((f) => f.status === s).length}</div>
            <div className="text-xs text-muted-foreground">dossier(s)</div>
          </Link>
        ))}
        <div className={cn("rounded-xl border px-4 py-3", late.length && "border-red-200 bg-red-50/50")}>
          <span className="text-xs font-medium text-muted-foreground">En retard</span>
          <div className={cn("mt-2 text-2xl font-semibold tracking-tight", late.length && "text-red-600")}>{late.length}</div>
          <div className="text-xs text-muted-foreground">avancement moyen en cours : {avg} %</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Avancement moyen par collaborateur"
          description="Dossiers non déposés — part des contrôles préparés et des cycles revus"
          action={<ViewToggle value={progressView} onChange={setProgressView} />}
        >
          {progressView === "graphique" ? (
            <ChartContainer config={progressConfig} className="aspect-auto h-64 w-full px-2 pt-3">
              <BarChart data={progressData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }} barCategoryGap={10}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={64} />
                <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} %`} />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof progressData)[number] | undefined
                    if (!active || !p) return null
                    return (
                      <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-md">
                        <div className="font-medium">{p.full}</div>
                        <div className="text-muted-foreground">
                          {p.avg} % · {p.active} dossier(s) en production
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="avg" fill="var(--color-avg)" radius={[0, 4, 4, 0]} barSize={16}>
                  <LabelList dataKey="avg" position="right" formatter={(v) => `${v} %`} className="fill-foreground text-xs" />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Collaborateur</TableHead>
                  <TableHead className="text-right">Dossiers en production</TableHead>
                  <TableHead className="pr-4 text-right">Avancement moyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressData.map((p) => (
                  <TableRow key={p.full}>
                    <TableCell className="pl-4">{p.full}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.active}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{p.avg} %</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <Panel
          title="Liasses déposées par mois"
          description="Campagne fiscale 2026 — clôtures au 31/12/2025 et exercices décalés"
          action={<ViewToggle value={monthView} onChange={setMonthView} />}
        >
          {monthView === "graphique" ? (
            <ChartContainer config={monthConfig} className="aspect-auto h-64 w-full px-2 pt-3">
              <BarChart data={monthData} margin={{ left: 0, right: 8, top: 20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={({ active, payload }) => {
                    const p = payload?.[0]?.payload as (typeof monthData)[number] | undefined
                    if (!active || !p) return null
                    return (
                      <div className="rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-md">
                        <div className="font-medium first-letter:uppercase">{p.full}</div>
                        <div className="text-muted-foreground">{p.count} liasse(s) déposée(s)</div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} barSize={22}>
                  <LabelList
                    dataKey="count"
                    position="top"
                    className="fill-foreground text-xs"
                    formatter={(v) => (Number(v) === maxMonth && maxMonth > 0 ? String(v) : "")}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Mois</TableHead>
                  <TableHead className="pr-4 text-right">Liasses déposées</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthData.map((m) => (
                  <TableRow key={m.full}>
                    <TableCell className="pl-4 first-letter:uppercase">{m.full}</TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{m.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>

      <Panel title="Charge par collaborateur" description="Répartition des dossiers annuels par statut">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Collaborateur</TableHead>
              {STATUS_ORDER.map((s) => (
                <TableHead key={s} className="text-right">
                  {ANNUAL_STATUS[s].label}
                </TableHead>
              ))}
              <TableHead className="text-right">En retard</TableHead>
              <TableHead className="w-48 pr-4">Avancement moyen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byCollaborator.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-4">
                  <span className="flex items-center gap-2">
                    <UserAvatar userId={c.id} />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.total} dossiers</span>
                  </span>
                </TableCell>
                {STATUS_ORDER.map((s) => (
                  <TableCell key={s} className={cn("text-right tabular-nums", c.byStatus[s] === 0 && "text-muted-foreground/50")}>
                    {c.byStatus[s]}
                  </TableCell>
                ))}
                <TableCell className={cn("text-right tabular-nums", c.late ? "font-semibold text-red-600" : "text-muted-foreground/50")}>
                  {c.late}
                </TableCell>
                <TableCell className="pr-4">
                  {c.avg === null ? (
                    <span className="text-xs text-muted-foreground">Tout est déposé</span>
                  ) : (
                    <ProgressBar value={c.avg} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Dossiers à risque" description="En retard, échéance proche avec un avancement faible, ou anomalies nombreuses">
          {atRisk.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Aucun dossier à risque.</p>
          ) : (
            <ul className="divide-y">
              {atRisk.map((f) => (
                <li key={f.id}>
                  <Link href={`/production/dossiers-annuels/${f.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{f.dossier.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {userName(f.dossier.team.collaborateur)} · {f.progress.pct} % · {f.anomalies} anomalie(s) · {f.openPending} point(s) ouvert(s)
                      </div>
                    </div>
                    <DueDate date={f.dueDate} daysLeft={f.daysLeft} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Échéances des 120 prochains jours" description="Dépôt de la liasse fiscale">
          <Table>
            <TableBody>
              {upcoming.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="max-w-56 pl-4">
                    <Link href={`/production/dossiers-annuels/${f.id}`} className="block truncate text-sm font-medium hover:underline">
                      {f.dossier.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <AnnualStatusBadge status={f.status} />
                  </TableCell>
                  <TableCell className="w-36">
                    <ProgressBar value={f.progress.pct} tone={f.late ? "danger" : "default"} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DueDate date={f.dueDate} daysLeft={f.daysLeft} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">{formatNumber(files.length)} dossiers dans le périmètre sélectionné.</p>
    </PageContainer>
  )
}
