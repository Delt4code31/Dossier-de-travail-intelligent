"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowRight, CalendarClock, FolderKanban, TriangleAlert } from "lucide-react"

import { ProgressBar, StatTile, UserAvatar } from "@/components/common/bits"
import { PageContainer, PageHeader, Panel } from "@/components/common/page"
import { AnnualStatusBadge, CheckStatusIcon, DueDate } from "@/components/common/status"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CURRENT_USER_ID,
  dossierTeamIds,
  getActivity,
  getDossier,
  getTasks,
  getTopAlerts,
  getUser,
  userName,
} from "@/lib/data"
import { DEMO_NOW, formatDate, formatDateLong, formatEur, formatRelative } from "@/lib/format"
import { useAnnualFiles, useMounted } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"
import { cn } from "@/lib/utils"

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function HomeView() {
  const files = useAnnualFiles()
  const me = getUser(CURRENT_USER_ID)!
  const doneTasks = useDemoStore((s) => s.doneTasks)
  const toggleTask = useDemoStore((s) => s.toggleTask)
  const mounted = useMounted()

  const mine = useMemo(
    () => files.filter((f) => dossierTeamIds(f.dossier).includes(CURRENT_USER_ID)),
    [files],
  )
  const open = mine
    .filter((f) => f.status !== "depose")
    .sort((a, b) => a.daysLeft - b.daysLeft)
  const late = open.filter((f) => f.late)
  const dueSoon = open.filter((f) => !f.late && f.daysLeft <= 30)
  const anomalies = open.reduce((s, f) => s + f.anomalies, 0)
  const alerts = getTopAlerts(
    mine.filter((f) => f.status !== "depose" || f.dossier.id === "cave-comptoir").map((f) => f.dossierId),
  )
  const myDossierIds = new Set(mine.map((f) => f.dossierId))
  const activity = getActivity()
    .filter((a) => !a.dossierId || myDossierIds.has(a.dossierId))
    .slice(0, 7)
  const tasks = getTasks()

  return (
    <PageContainer>
      <PageHeader
        title={`Bonjour ${me.firstName}`}
        description={
          <>
            {capitalize(formatDateLong(DEMO_NOW.toISOString()))} — voici l&apos;essentiel de
            votre portefeuille ({mine.length} dossiers).
          </>
        }
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/production/supervision" />}>
            Supervision du cabinet
            <ArrowRight data-icon="inline-end" />
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Dossiers en production"
          value={open.length}
          hint={`sur ${mine.length} dossiers suivis`}
          icon={FolderKanban}
          href="/production/dossiers-annuels?filtre=mes-dossiers"
        />
        <StatTile
          label="En retard"
          value={late.length}
          hint="échéance de liasse dépassée"
          tone={late.length ? "danger" : undefined}
          icon={CalendarClock}
          href="/production/dossiers-annuels?filtre=retard"
        />
        <StatTile
          label="Échéances à 30 jours"
          value={dueSoon.length}
          hint={dueSoon[0] ? `prochaine : ${formatDate(dueSoon[0].dueDate)}` : "aucune"}
          tone={dueSoon.length ? "warning" : undefined}
          icon={CalendarClock}
          href="/production/dossiers-annuels?filtre=echeance"
        />
        <StatTile
          label="Anomalies à traiter"
          value={anomalies}
          hint="détectées par l'analyse automatique"
          tone={anomalies ? "warning" : undefined}
          icon={TriangleAlert}
          href="/analyse"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Mes dossiers en cours"
          description="Dossiers annuels non déposés, par échéance"
          action={
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/production/dossiers-annuels?filtre=mes-dossiers" />}>
              Tout voir
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Société</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-40">Avancement</TableHead>
                <TableHead>Échéance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {open.map((f) => (
                <TableRow key={f.id} className="cursor-pointer">
                  <TableCell className="max-w-64 pl-4 font-medium">
                    <Link href={`/production/dossiers-annuels/${f.id}`} className="flex flex-col">
                      <span className="truncate">{f.dossier.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">Clôture {formatDate(f.exercise.end)}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <AnnualStatusBadge status={f.status} />
                  </TableCell>
                  <TableCell>
                    <ProgressBar value={f.progress.pct} tone={f.late ? "danger" : "default"} />
                  </TableCell>
                  <TableCell>
                    <DueDate date={f.dueDate} daysLeft={f.daysLeft} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>

        <Panel title="Mes tâches" description={`${tasks.length - (mounted ? doneTasks.length : 0)} à faire`}>
          <ul className="divide-y">
            {tasks.map((t) => {
              const done = mounted && doneTasks.includes(t.id)
              const d = getDossier(t.dossierId)
              return (
                <li key={t.id} className="flex items-start gap-3 px-4 py-3">
                  <Checkbox checked={done} onCheckedChange={() => toggleTask(t.id)} className="mt-0.5" aria-label={t.label} />
                  <div className="min-w-0 flex-1">
                    <Link href={t.href} className={cn("block text-sm hover:underline", done && "text-muted-foreground line-through")}>
                      {t.label}
                    </Link>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {d?.name} · {formatRelative(t.due)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Alertes d'analyse"
          description="Anomalies relevées automatiquement sur les données Pennylane"
          action={
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/analyse" />}>
              Ouvrir l&apos;analyse
            </Button>
          }
        >
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Aucune anomalie sur vos dossiers.</p>
          ) : (
            <ul className="divide-y">
              {alerts.map(({ dossier, check }) => (
                <li key={`${dossier.id}-${check.id}`}>
                  <Link href={`/analyse/${dossier.id}/controles`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                    <CheckStatusIcon status={check.status} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{check.label}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {dossier.name} — {check.summary}
                      </div>
                    </div>
                    {check.amount !== undefined && (
                      <span className="shrink-0 text-sm tabular-nums">{formatEur(check.amount)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Activité récente">
          <ul className="space-y-0 px-4 py-2">
            {activity.map((a) => {
              const d = a.dossierId ? getDossier(a.dossierId) : null
              return (
                <li key={a.id} className="flex gap-3 py-2">
                  {a.userId === "system" ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[10px] font-semibold text-sky-700">
                      PL
                    </span>
                  ) : (
                    <UserAvatar userId={a.userId} />
                  )}
                  <div className="min-w-0 text-sm">
                    <span className="font-medium">{a.userId === "system" ? "Pennylane" : userName(a.userId)}</span>{" "}
                    <span className="text-muted-foreground">{a.text}</span>
                    {d && <div className="truncate text-xs text-muted-foreground">{d.name}</div>}
                    <div className="text-[11px] text-muted-foreground/80">{formatRelative(a.at)}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <p className="text-xs text-muted-foreground">
        Données de démonstration — toutes les sociétés et tous les montants sont fictifs.
      </p>
    </PageContainer>
  )
}
