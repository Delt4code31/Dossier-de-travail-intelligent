"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { CalendarClock, CircleX, MessageCircleQuestionMark, User } from "lucide-react"

import { ProgressBar, TeamAvatars } from "@/components/common/bits"
import { AnnualStatusBadge, DueDate } from "@/components/common/status"
import {
  DataPagination,
  FilterChip,
  InlineSelect,
  SearchInput,
  normalizeSearch,
  usePagination,
} from "@/components/common/table-tools"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ANNUAL_STATUS, CURRENT_USER_ID, dossierTeamIds, getUser, type AnnualStatus } from "@/lib/data"
import { formatDate, formatRelative } from "@/lib/format"
import { useAnnualFiles, type AnnualFileView } from "@/lib/hooks"

type Filter = "tous" | "mes-dossiers" | "a-traiter" | "retard" | "echeance"

const STATUS_OPTIONS: { value: "tous" | AnnualStatus; label: string }[] = [
  { value: "tous", label: "Tous" },
  ...(Object.entries(ANNUAL_STATUS) as [AnnualStatus, { label: string }][]).map(([value, s]) => ({ value, label: s.label })),
]

const TEAM_OPTIONS = [
  { value: "toutes", label: "Toutes" },
  { value: "pme", label: "Pôle PME" },
  { value: "tpe", label: "Pôle TPE & Indépendants" },
] as const

function sortFiles(a: AnnualFileView, b: AnnualFileView) {
  const doneA = a.status === "depose" ? 1 : 0
  const doneB = b.status === "depose" ? 1 : 0
  if (doneA !== doneB) return doneA - doneB
  if (doneA) return (b.filedAt ?? "").localeCompare(a.filedAt ?? "")
  return a.daysLeft - b.daysLeft
}

export function AnnualFilesList({ initialFilter, initialStatus }: { initialFilter?: string; initialStatus?: string }) {
  const router = useRouter()
  const files = useAnnualFiles()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>((initialFilter as Filter) ?? "tous")
  const [status, setStatus] = useState<"tous" | AnnualStatus>((initialStatus as AnnualStatus) ?? "tous")
  const [team, setTeam] = useState<"toutes" | "pme" | "tpe">("toutes")

  const counts = useMemo(
    () => ({
      tous: files.length,
      "mes-dossiers": files.filter((f) => dossierTeamIds(f.dossier).includes(CURRENT_USER_ID)).length,
      "a-traiter": files.filter((f) => f.status !== "depose").length,
      retard: files.filter((f) => f.late).length,
      echeance: files.filter((f) => f.status !== "depose" && f.daysLeft >= 0 && f.daysLeft <= 30).length,
    }),
    [files],
  )

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return files
      .filter((f) => {
        if (q && !normalizeSearch(f.dossier.name).includes(q) && !f.dossier.siren.includes(q)) return false
        if (filter === "mes-dossiers" && !dossierTeamIds(f.dossier).includes(CURRENT_USER_ID)) return false
        if (filter === "a-traiter" && f.status === "depose") return false
        if (filter === "retard" && !f.late) return false
        if (filter === "echeance" && !(f.status !== "depose" && f.daysLeft >= 0 && f.daysLeft <= 30)) return false
        if (status !== "tous" && f.status !== status) return false
        if (team !== "toutes" && getUser(f.dossier.team.associe)?.team !== team) return false
        return true
      })
      .sort(sortFiles)
  }, [files, query, filter, status, team])

  const pagination = usePagination(filtered, 10)

  const chips: { id: Filter; label: string; icon?: typeof User; tone?: "danger" }[] = [
    { id: "tous", label: "Tous" },
    { id: "mes-dossiers", label: "Mes dossiers", icon: User },
    { id: "a-traiter", label: "À traiter" },
    { id: "echeance", label: "Échéance < 30 j", icon: CalendarClock },
    { id: "retard", label: "En retard", icon: CalendarClock, tone: "danger" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); pagination.reset() }} placeholder="Rechercher (nom, SIREN)…" />
        {chips.map((c) => (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            onClick={() => {
              setFilter(c.id)
              pagination.reset()
            }}
            icon={c.icon}
            label={c.label}
            count={counts[c.id]}
            tone={c.tone}
          />
        ))}
        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <InlineSelect label="Statut" value={status} onChange={(v) => { setStatus(v); pagination.reset() }} options={STATUS_OPTIONS} />
          <InlineSelect label="Équipe" value={team} onChange={(v) => { setTeam(v); pagination.reset() }} options={[...TEAM_OPTIONS]} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Société</TableHead>
            <TableHead className="hidden xl:table-cell">SIREN</TableHead>
            <TableHead>Clôture</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-40">Avancement</TableHead>
            <TableHead>Équipe</TableHead>
            <TableHead>Échéance liasse</TableHead>
            <TableHead className="hidden 2xl:table-cell">Dernière activité</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.slice.map((f) => (
            <TableRow key={f.id} className="cursor-pointer" onClick={() => router.push(`/production/dossiers-annuels/${f.id}`)}>
              <TableCell className="max-w-72 font-medium">
                <span className="flex items-center gap-1.5">
                  <Link href={`/production/dossiers-annuels/${f.id}`} className="truncate" onClick={(e) => e.stopPropagation()}>
                    {f.dossier.name}
                  </Link>
                  {f.openPending > 0 && (
                    <Tooltip>
                      <TooltipTrigger render={<Badge variant="secondary" />}>
                        <MessageCircleQuestionMark />
                        {f.openPending}
                      </TooltipTrigger>
                      <TooltipContent>{f.openPending} point(s) en suspens</TooltipContent>
                    </Tooltip>
                  )}
                  {f.anomalies > 0 && (
                    <Tooltip>
                      <TooltipTrigger render={<Badge variant="destructive" />}>
                        <CircleX />
                        {f.anomalies}
                      </TooltipTrigger>
                      <TooltipContent>{f.anomalies} anomalie(s) détectée(s) par l&apos;analyse</TooltipContent>
                    </Tooltip>
                  )}
                </span>
              </TableCell>
              <TableCell className="hidden font-mono text-xs text-muted-foreground xl:table-cell">{f.dossier.siren}</TableCell>
              <TableCell className="text-sm tabular-nums">{formatDate(f.exercise.end)}</TableCell>
              <TableCell>
                <AnnualStatusBadge status={f.status} />
              </TableCell>
              <TableCell>
                <ProgressBar value={f.progress.pct} tone={f.late ? "danger" : f.progress.pct === 100 ? "success" : "default"} />
              </TableCell>
              <TableCell>
                <TeamAvatars team={f.dossier.team} />
              </TableCell>
              <TableCell>
                <DueDate date={f.status === "depose" && f.filedAt ? f.filedAt : f.dueDate} daysLeft={f.daysLeft} done={f.status === "depose"} />
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground 2xl:table-cell">{formatRelative(f.lastActivityAt)}</TableCell>
            </TableRow>
          ))}
          {pagination.slice.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                Aucun dossier ne correspond à ces filtres.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DataPagination {...pagination} noun="dossier(s)" />
      <p className="text-xs text-muted-foreground">
        Pour les dossiers déposés, la date indiquée est celle du dépôt de la liasse.
      </p>
    </div>
  )
}
