"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { CircleCheck, CircleX, Info, Sparkles } from "lucide-react"

import { Variation } from "@/components/common/bits"
import { Panel } from "@/components/common/page"
import { ChartContainer, ChartLegend, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { computeIndicators, getDossier, getFinancials } from "@/lib/data"
import { buildInsights, computeRatios, formatRatio } from "@/lib/analysis"
import { formatEur, formatEurCompact, formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

const N_COLOR = "#2a78d6" // série mise en avant (exercice N)
const N1_COLOR = "#c7c7c7" // exercice précédent, en retrait

export function AnalysisSynthese({ id }: { id: string }) {
  const d = getDossier(id)!
  const { lines, monthly } = getFinancials(d)
  const n = computeIndicators(lines, "n")
  const n1 = computeIndicators(lines, "n1")
  const ratios = computeRatios(d)
  const insights = buildInsights(d)
  const [view, setView] = useState("graphique")

  const tiles = [
    { label: "Chiffre d'affaires", n: n.ca, n1: n1.ca, sub: null },
    { label: "Excédent brut d'exploitation", n: n.ebe, n1: n1.ebe, sub: n.ca ? `${formatPct(n.ebe / n.ca, 1, false)} du CA` : null },
    { label: "Résultat net", n: n.resultatNet, n1: n1.resultatNet, sub: n.ca ? `${formatPct(n.resultatNet / n.ca, 1, false)} du CA` : null },
    { label: "Trésorerie nette", n: n.tresorerieNette, n1: n1.tresorerieNette, sub: null },
  ]

  const sig = [
    { label: "Chiffre d'affaires", n: n.ca, n1: n1.ca, strong: true },
    ...(n.margeCommerciale !== null ? [{ label: "Marge commerciale", n: n.margeCommerciale, n1: n1.margeCommerciale ?? 0, strong: false }] : []),
    { label: "Valeur ajoutée", n: n.valeurAjoutee, n1: n1.valeurAjoutee, strong: false },
    { label: "Excédent brut d'exploitation", n: n.ebe, n1: n1.ebe, strong: true },
    { label: "Résultat d'exploitation", n: n.resultatExploitation, n1: n1.resultatExploitation, strong: false },
    { label: "Résultat financier", n: n.resultatFinancier, n1: n1.resultatFinancier, strong: false },
    { label: "Résultat courant avant impôt", n: n.resultatCourant, n1: n1.resultatCourant, strong: false },
    { label: "Résultat net", n: n.resultatNet, n1: n1.resultatNet, strong: true },
    { label: "Capacité d'autofinancement", n: n.caf, n1: n1.caf, strong: false },
  ]

  const structure = [
    { label: "Capitaux propres", n: n.capitauxPropres, n1: n1.capitauxPropres, favorable: "up" as const },
    { label: "Dettes financières", n: n.endettement, n1: n1.endettement, favorable: "down" as const },
    { label: "Besoin en fonds de roulement", n: n.bfr, n1: n1.bfr, favorable: "down" as const },
    { label: "Trésorerie nette", n: n.tresorerieNette, n1: n1.tresorerieNette, favorable: "up" as const },
  ]

  const chartConfig = {
    n: { label: "Exercice N", color: N_COLOR },
    n1: { label: "Exercice N-1", color: N1_COLOR },
  } satisfies ChartConfig

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border px-4 py-3.5">
            <div className="text-xs font-medium text-muted-foreground">{t.label}</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className={cn("text-2xl font-semibold tracking-tight", t.n < 0 && "text-red-600")}>{formatEurCompact(t.n)}</span>
              <Variation n={t.n} n1={t.n1} />
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              N-1 : {formatEurCompact(t.n1)}
              {t.sub && ` · ${t.sub}`}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Chiffre d'affaires mensuel"
          description="Exercice N comparé à l'exercice N-1, mois par mois"
          action={
            <ToggleGroup value={[view]} onValueChange={(v: string[]) => v[0] && setView(v[0])} variant="outline" size="sm" spacing={0}>
              <ToggleGroupItem value="graphique" className="px-2 text-xs">Graphique</ToggleGroupItem>
              <ToggleGroupItem value="tableau" className="px-2 text-xs">Tableau</ToggleGroupItem>
            </ToggleGroup>
          }
        >
          {view === "graphique" ? (
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full px-2 pt-4 pb-1">
              <BarChart data={monthly} margin={{ left: 4, right: 8, top: 4, bottom: 0 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatEurCompact(v)} />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={({ active, payload, label }) => {
                    const p = payload?.[0]?.payload as (typeof monthly)[number] | undefined
                    if (!active || !p) return null
                    return (
                      <div className="grid gap-1 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-md">
                        <div className="font-medium first-letter:uppercase">{String(label)}</div>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-[2px]" style={{ background: N_COLOR }} />
                          N <span className="ml-auto pl-4 font-mono tabular-nums">{formatEur(p.n)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-[2px]" style={{ background: N1_COLOR }} />
                          N-1 <span className="ml-auto pl-4 font-mono tabular-nums">{formatEur(p.n1)}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <ChartLegend
                  verticalAlign="top"
                  align="right"
                  content={() => (
                    <div className="flex justify-end gap-4 pb-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px]" style={{ background: N_COLOR }} />Exercice N</span>
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px]" style={{ background: N1_COLOR }} />Exercice N-1</span>
                    </div>
                  )}
                />
                <Bar dataKey="n1" fill="var(--color-n1)" radius={[4, 4, 0, 0]} maxBarSize={14} />
                <Bar dataKey="n" fill="var(--color-n)" radius={[4, 4, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ChartContainer>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Mois</TableHead>
                  <TableHead className="text-right">N</TableHead>
                  <TableHead className="text-right">N-1</TableHead>
                  <TableHead className="pr-4 text-right">Variation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.map((m) => (
                  <TableRow key={m.label}>
                    <TableCell className="pl-4 first-letter:uppercase">{m.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatEur(m.n)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatEur(m.n1)}</TableCell>
                    <TableCell className="pr-4 text-right"><Variation n={m.n} n1={m.n1} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>

        <Panel
          title={
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-sky-500" />
              Points d&apos;attention
            </span>
          }
          description="Rédigés automatiquement à partir des données"
        >
          <ul className="divide-y">
            {insights.map((i) => (
              <li key={i.title} className="flex gap-3 px-4 py-3">
                {i.tone === "positive" ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                ) : i.tone === "negative" ? (
                  <CircleX className="mt-0.5 size-4 shrink-0 text-red-500" />
                ) : (
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium">{i.title}</div>
                  <div className="text-xs text-muted-foreground">{i.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Soldes intermédiaires de gestion">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Solde</TableHead>
                <TableHead className="text-right">N</TableHead>
                <TableHead className="text-right">N-1</TableHead>
                <TableHead className="text-right">Variation</TableHead>
                <TableHead className="pr-4 text-right">% du CA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sig.map((s) => (
                <TableRow key={s.label} className={cn(s.strong && "bg-muted/30")}>
                  <TableCell className={cn("pl-4", s.strong && "font-semibold")}>{s.label}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", s.n < 0 && "text-red-600", s.strong && "font-semibold")}>{formatEur(s.n)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatEur(s.n1)}</TableCell>
                  <TableCell className="text-right"><Variation n={s.n} n1={s.n1} /></TableCell>
                  <TableCell className="pr-4 text-right text-xs tabular-nums text-muted-foreground">{n.ca ? formatPct(s.n / n.ca, 1, false) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Structure financière">
            <Table>
              <TableBody>
                {structure.map((s) => (
                  <TableRow key={s.label}>
                    <TableCell className="pl-4">{s.label}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", s.n < 0 && "text-red-600")}>{formatEur(s.n)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatEur(s.n1)}</TableCell>
                    <TableCell className="pr-4 text-right"><Variation n={s.n} n1={s.n1} favorable={s.favorable} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
          <Panel title="Ratios clés">
            <Table>
              <TableBody>
                {ratios.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4">
                      <Tooltip>
                        <TooltipTrigger render={<span className="cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-4" />}>
                          {r.label}
                        </TooltipTrigger>
                        <TooltipContent>{r.help}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatRatio(r.n, r.unit)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatRatio(r.n1, r.unit)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      {r.n !== null && r.n1 !== null ? <Variation n={r.n} n1={r.n1} favorable={r.favorable} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
      </div>
    </div>
  )
}
