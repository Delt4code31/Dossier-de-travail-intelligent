"use client"

import Link from "next/link"
import { Fragment, useState } from "react"
import { toast } from "sonner"
import { ChevronRight, Flag, MessageSquareText, Sparkles } from "lucide-react"

import { Variation } from "@/components/common/bits"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getFinancials, groupRows, type GroupRow } from "@/lib/data"
import { isSignificant } from "@/lib/analysis"
import { formatEur, formatPct } from "@/lib/format"
import { useDossier, useMounted } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type Section = "resultat" | "bilan"

/** Commentaire proposé : explique la variation par le compte qui y contribue le plus. */
function suggestComment(row: GroupRow) {
  const delta = row.n - row.n1
  const top = [...row.lines]
    .map((l) => ({ l, d: (l.n - l.n1) * row.group.sign }))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0]
  const dir = delta >= 0 ? "Hausse" : "Baisse"
  const rel = row.n1 !== 0 ? ` (${formatPct(delta / Math.abs(row.n1))})` : ""
  const detail = top ? `, principalement sur le compte ${top.l.account} ${top.l.label.toLowerCase()} (${top.d >= 0 ? "+" : "−"}${formatEur(Math.abs(top.d))})` : ""
  return `${dir} de ${formatEur(Math.abs(delta))}${rel}${detail}. À confirmer avec le client.`
}

export function AnalyticReview({ id }: { id: string }) {
  const d = useDossier(id)!
  const { lines } = getFinancials(d)
  const rows = groupRows(lines)
  const comments = useDemoStore((s) => s.analyticComments)
  const setComment = useDemoStore((s) => s.setAnalyticComment)
  const mounted = useMounted()
  const [section, setSection] = useState<Section>("resultat")
  const [onlySignificant, setOnlySignificant] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)

  const sectionRows = rows.filter((r) =>
    section === "resultat" ? ["produits", "charges"].includes(r.group.section) : ["actif", "passif"].includes(r.group.section),
  )
  const visible = sectionRows.filter((r) => !onlySignificant || isSignificant(r, d))
  const significantCount = sectionRows.filter((r) => isSignificant(r, d)).length
  const commentOf = (groupId: string) => (mounted ? comments[`${id}:${groupId}`] : undefined)

  function generate() {
    let added = 0
    for (const r of sectionRows.filter((r) => isSignificant(r, d))) {
      if (!commentOf(r.group.id)) {
        setComment(id, r.group.id, suggestComment(r))
        added++
      }
    }
    toast.success(added ? `${added} commentaire(s) proposé(s)` : "Toutes les variations significatives sont déjà commentées", {
      description: added ? "Relisez et complétez-les avant de les intégrer à la note de synthèse." : undefined,
    })
  }

  const subtitles: Record<string, string> = {
    produits: "Produits",
    charges: "Charges",
    actif: "Actif",
    passif: "Passif",
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup value={[section]} onValueChange={(v: string[]) => v[0] && setSection(v[0] as Section)} variant="outline" spacing={0}>
          <ToggleGroupItem value="resultat" className="px-3">Compte de résultat</ToggleGroupItem>
          <ToggleGroupItem value="bilan" className="px-3">Bilan</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id="only-sig" checked={onlySignificant} onCheckedChange={setOnlySignificant} />
          <Label htmlFor="only-sig" className="font-normal">
            Variations significatives uniquement ({significantCount})
          </Label>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Seuils : {formatPct(d.thresholds?.variationPct ?? 0.1, 0, false)} et {formatEur(d.thresholds?.variationAmount ?? Math.max(1_000, Math.round(d.revenue * 0.005)))}
            {!d.thresholds && " (par défaut)"} ·{" "}
            <Link href={`/production/parametrage/${id}`} className="underline underline-offset-2 hover:text-foreground">
              modifier
            </Link>
          </span>
          <Button variant="outline" onClick={generate}>
            <Sparkles data-icon="inline-start" className="text-sky-500" />
            Proposer les commentaires
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Regroupement</TableHead>
            <TableHead className="text-right">N</TableHead>
            <TableHead className="text-right">N-1</TableHead>
            <TableHead className="text-right">Variation</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="w-10" />
            <TableHead className="w-[28%]">Commentaire</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(section === "resultat" ? ["produits", "charges"] : ["actif", "passif"]).map((sec) => {
            const secRows = visible.filter((r) => r.group.section === sec)
            if (secRows.length === 0) return null
            const totalN = secRows.reduce((s, r) => s + r.n, 0)
            const totalN1 = secRows.reduce((s, r) => s + r.n1, 0)
            return (
              <Fragment key={sec}>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableCell className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{subtitles[sec]}</TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums">{onlySignificant ? "" : formatEur(totalN)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-muted-foreground">{onlySignificant ? "" : formatEur(totalN1)}</TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
                {secRows.map((r) => {
                  const open = expanded.has(r.group.id)
                  const sig = isSignificant(r, d)
                  const delta = r.n - r.n1
                  const comment = commentOf(r.group.id)
                  const favorable = sec === "charges" || sec === "passif" ? "down" : "up"
                  return (
                    <Fragment key={r.group.id}>
                      <TableRow className={cn(sig && "bg-amber-50/40")}>
                        <TableCell>
                          <button
                            type="button"
                            className="flex items-center gap-1.5 text-left font-medium"
                            onClick={() => {
                              const next = new Set(expanded)
                              if (open) next.delete(r.group.id)
                              else next.add(r.group.id)
                              setExpanded(next)
                            }}
                            aria-expanded={open}
                          >
                            <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
                            {r.group.label}
                            <span className="text-xs font-normal text-muted-foreground">({r.lines.length})</span>
                          </button>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatEur(r.n)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{formatEur(r.n1)}</TableCell>
                        <TableCell className="text-right tabular-nums">{delta >= 0 ? "+" : "−"}{formatEur(Math.abs(delta))}</TableCell>
                        <TableCell className="text-right">
                          <Variation n={r.n} n1={r.n1} favorable={sec === "actif" || sec === "passif" ? "neutral" : favorable} />
                        </TableCell>
                        <TableCell>
                          {sig && (
                            <Tooltip>
                              <TooltipTrigger render={<span tabIndex={0} className="inline-flex" />}>
                                <Flag className="size-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>Variation significative : à justifier</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {editing === r.group.id ? (
                            <Textarea
                              autoFocus
                              defaultValue={comment ?? ""}
                              className="min-h-16 text-xs"
                              onBlur={(e) => {
                                setComment(id, r.group.id, e.target.value)
                                setEditing(null)
                              }}
                            />
                          ) : comment ? (
                            <button type="button" className="text-left text-xs text-foreground/80 hover:text-foreground" onClick={() => setEditing(r.group.id)}>
                              {comment}
                            </button>
                          ) : (
                            <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setEditing(r.group.id)}>
                              <MessageSquareText data-icon="inline-start" />
                              {sig ? "Justifier" : "Commenter"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {open &&
                        r.lines.map((l) => (
                          <TableRow key={l.account} className="bg-muted/20 text-xs hover:bg-muted/30">
                            <TableCell className="pl-10">
                              <span className="font-mono text-muted-foreground">{l.account}</span> {l.label}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatEur(l.n * r.group.sign)}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">{formatEur(l.n1 * r.group.sign)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {(l.n - l.n1) * r.group.sign >= 0 ? "+" : "−"}
                              {formatEur(Math.abs((l.n - l.n1) * r.group.sign))}
                            </TableCell>
                            <TableCell className="text-right">
                              <Variation n={l.n * r.group.sign} n1={l.n1 * r.group.sign} favorable="neutral" />
                            </TableCell>
                            <TableCell colSpan={2} />
                          </TableRow>
                        ))}
                    </Fragment>
                  )
                })}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">
        Soldes issus de la balance générale Pennylane. Une variation est significative lorsqu&apos;elle dépasse à la fois le seuil en
        pourcentage et le seuil en euros du dossier.
      </p>
    </div>
  )
}
