"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowUpRight, Bot, Cloud, Landmark, RefreshCw, RotateCcw, ScrollText } from "lucide-react"

import { PageContainer, PageHeader, Panel } from "@/components/common/page"
import { SyncStatus, ToneBadge } from "@/components/common/status"
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
import { DOSSIERS } from "@/lib/data"
import { DEMO_NOW, formatDateTime } from "@/lib/format"
import { useDemoStore } from "@/lib/store"

function minutesAgo(m: number) {
  return new Date(DEMO_NOW.getTime() - m * 60_000).toISOString()
}

const RUNS = [
  { at: minutesAgo(17), source: "Pennylane — comptabilité", result: "29 dossiers à jour · 1 en erreur", ok: false, duration: "2 min 41 s" },
  { at: minutesAgo(60 * 3 + 12), source: "Pennylane — documents fiscaux", result: "14 nouveaux documents", ok: true, duration: "48 s" },
  { at: minutesAgo(60 * 4), source: "SharePoint — arborescences", result: "26 dossiers synchronisés", ok: true, duration: "1 min 05 s" },
  { at: minutesAgo(60 * 24 + 17), source: "Pennylane — comptabilité", result: "30 dossiers à jour", ok: true, duration: "2 min 37 s" },
  { at: minutesAgo(60 * 27 + 12), source: "Pennylane — documents fiscaux", result: "3 nouveaux documents", ok: true, duration: "51 s" },
]

export function AdminView() {
  const reset = useDemoStore((s) => s.reset)
  const recordSync = useDemoStore((s) => s.recordSync)
  const lastManual = useDemoStore((s) => s.syncs["pennylane:all"])
  const [syncing, setSyncing] = useState(false)
  const errors = DOSSIERS.filter((d) => d.pennylane.status === "erreur").length
  const linkedSharepoint = DOSSIERS.filter((d) => d.sharepoint.status === "connecte").length

  function syncAll() {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      recordSync("pennylane:all", DEMO_NOW.toISOString())
      toast.success("Synchronisation lancée sur les 30 dossiers", { description: "Démo : aucune donnée n'est réellement récupérée." })
    }, 1600)
  }

  return (
    <PageContainer>
      <PageHeader title="Admin" description="Connexions de l'outil, synchronisations et paramètres généraux du cabinet." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted"><Landmark className="size-4" /></span>
            <div className="text-sm font-semibold">Pennylane</div>
            <span className="ml-auto"><SyncStatus status="connecte" at={lastManual ?? minutesAgo(17)} /></span>
          </div>
          <p className="text-xs text-muted-foreground">
            API cabinet (Firm API) : {DOSSIERS.length} dossiers liés{errors ? `, ${errors} en erreur (jeton expiré)` : ""}. Synchronisation chaque nuit à 6 h et à la demande.
          </p>
          <Button variant="outline" size="sm" className="mt-auto self-start" onClick={syncAll} disabled={syncing}>
            <RefreshCw data-icon="inline-start" className={syncing ? "animate-spin" : undefined} />
            Tout synchroniser
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted"><Cloud className="size-4" /></span>
            <div className="text-sm font-semibold">Microsoft 365 · SharePoint</div>
            <span className="ml-auto"><SyncStatus status="connecte" at={minutesAgo(240)} /></span>
          </div>
          <p className="text-xs text-muted-foreground">
            Site « Cabinet Exemple - Dossiers clients » : {linkedSharepoint} dossiers reliés sur {DOSSIERS.length}. Connexion des utilisateurs par leur compte Microsoft.
          </p>
          <Button variant="outline" size="sm" className="mt-auto self-start" nativeButton={false} render={<a href="https://www.office.com/launch/sharepoint" target="_blank" rel="noreferrer" />}>
            Ouvrir SharePoint
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted"><Bot className="size-4" /></span>
            <div className="text-sm font-semibold">Assistant IA (Claude)</div>
            <span className="ml-auto"><ToneBadge tone="neutral">Démo</ToneBadge></span>
          </div>
          <p className="text-xs text-muted-foreground">
            Claude interroge Pennylane via le MCP, en lecture seule. À activer avec une clé API Anthropic du cabinet (voir le guide de mise en
            production).
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Dernières synchronisations" description="Récupération automatique des données">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Résultat</TableHead>
                <TableHead className="pr-4 text-right">Durée</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RUNS.map((r) => (
                <TableRow key={r.at + r.source}>
                  <TableCell className="pl-4 text-sm tabular-nums">{formatDateTime(r.at)}</TableCell>
                  <TableCell className="text-sm">{r.source}</TableCell>
                  <TableCell>
                    <SyncStatus status={r.ok ? "connecte" : "erreur"} label={r.result} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-sm text-muted-foreground tabular-nums">{r.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Paramètres généraux">
            <div className="divide-y">
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <Label htmlFor="sso">Connexion Microsoft obligatoire</Label>
                  <p className="text-xs text-muted-foreground">Pas de mot de passe propre à l&apos;outil</p>
                </div>
                <Switch id="sso" defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <Label htmlFor="ro">Accès Pennylane en lecture seule</Label>
                  <p className="text-xs text-muted-foreground">L&apos;outil n&apos;écrit jamais dans la comptabilité</p>
                </div>
                <Switch id="ro" defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <Label htmlFor="nightly">Synchronisation nocturne</Label>
                  <p className="text-xs text-muted-foreground">Chaque jour à 6 h</p>
                </div>
                <Switch id="nightly" defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">Seuils proposés par défaut</div>
                  <p className="text-xs text-muted-foreground">Signification ≈ 1 % du CA · variation 10 %</p>
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Démonstration">
            <div className="flex flex-col gap-3 p-4">
              <p className="text-xs text-muted-foreground">
                Vos manipulations (contrôles cochés, commentaires, points ajoutés…) sont gardées dans ce navigateur. Réinitialisez pour repartir des
                données d&apos;origine.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => {
                  reset()
                  toast.success("Données de démonstration réinitialisées")
                }}
              >
                <RotateCcw data-icon="inline-start" />
                Réinitialiser la démo
              </Button>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ScrollText className="size-3.5" />
                Version prototype 0.1 — octobre 2026
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </PageContainer>
  )
}
