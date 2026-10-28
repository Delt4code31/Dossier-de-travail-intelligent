"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"

import { TeamAvatars } from "@/components/common/bits"
import { SyncStatus, ToneBadge } from "@/components/common/status"
import {
  DataPagination,
  FilterChip,
  InlineSelect,
  SearchInput,
  normalizeSearch,
  usePagination,
} from "@/components/common/table-tools"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MISSIONS, setupGaps, type MissionType } from "@/lib/data"
import { formatDate } from "@/lib/format"
import { lastClosedExercises } from "@/lib/data"
import { useDossiers } from "@/lib/hooks"

type Filter = "tous" | "a-completer" | "erreur"

const MISSION_OPTIONS: { value: "toutes" | MissionType; label: string }[] = [
  { value: "toutes", label: "Toutes" },
  ...(Object.entries(MISSIONS) as [MissionType, string][]).map(([value, label]) => ({ value, label })),
]

export function SetupList() {
  const dossiers = useDossiers()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("tous")
  const [mission, setMission] = useState<"toutes" | MissionType>("toutes")

  const rows = useMemo(
    () =>
      dossiers
        .map((d) => ({ d, gaps: setupGaps(d) }))
        .sort((a, b) => b.gaps.length - a.gaps.length || a.d.name.localeCompare(b.d.name, "fr")),
    [dossiers],
  )

  const filtered = rows.filter(({ d, gaps }) => {
    const q = normalizeSearch(query.trim())
    if (q && !normalizeSearch(d.name).includes(q) && !d.siren.includes(q)) return false
    if (filter === "a-completer" && gaps.length === 0) return false
    if (filter === "erreur" && d.pennylane.status !== "erreur") return false
    if (mission !== "toutes" && d.mission !== mission) return false
    return true
  })
  const pagination = usePagination(filtered, 10)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); pagination.reset() }} placeholder="Rechercher (nom, SIREN)…" />
        <FilterChip active={filter === "tous"} onClick={() => { setFilter("tous"); pagination.reset() }} label="Tous" count={rows.length} />
        <FilterChip
          active={filter === "a-completer"}
          onClick={() => { setFilter("a-completer"); pagination.reset() }}
          icon={TriangleAlert}
          label="À compléter"
          count={rows.filter((r) => r.gaps.length > 0).length}
        />
        <FilterChip
          active={filter === "erreur"}
          onClick={() => { setFilter("erreur"); pagination.reset() }}
          icon={CircleAlert}
          label="Erreur de synchronisation"
          count={rows.filter((r) => r.d.pennylane.status === "erreur").length}
          tone="danger"
        />
        <div className="lg:ml-auto">
          <InlineSelect label="Mission" value={mission} onChange={(v) => { setMission(v); pagination.reset() }} options={MISSION_OPTIONS} />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Société</TableHead>
            <TableHead className="hidden xl:table-cell">SIREN</TableHead>
            <TableHead>Clôture</TableHead>
            <TableHead className="hidden lg:table-cell">Mission</TableHead>
            <TableHead>Équipe</TableHead>
            <TableHead>Pennylane</TableHead>
            <TableHead>SharePoint</TableHead>
            <TableHead className="hidden 2xl:table-cell">Documents fiscaux</TableHead>
            <TableHead>Paramétrage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.slice.map(({ d, gaps }) => (
            <TableRow key={d.id} className="cursor-pointer" onClick={() => router.push(`/production/parametrage/${d.id}`)}>
              <TableCell className="max-w-64 font-medium">
                <Link href={`/production/parametrage/${d.id}`} className="block truncate" onClick={(e) => e.stopPropagation()}>
                  {d.name}
                </Link>
              </TableCell>
              <TableCell className="hidden font-mono text-xs text-muted-foreground xl:table-cell">{d.siren}</TableCell>
              <TableCell className="text-sm tabular-nums">{formatDate(lastClosedExercises(d).current.end).slice(0, 5)}</TableCell>
              <TableCell className="hidden text-sm lg:table-cell">{MISSIONS[d.mission]}</TableCell>
              <TableCell>
                <TeamAvatars team={d.team} />
              </TableCell>
              <TableCell>
                <SyncStatus status={d.pennylane.status} at={d.pennylane.lastSyncAt} label={d.pennylane.status === "erreur" ? "jeton expiré" : undefined} />
              </TableCell>
              <TableCell>
                <SyncStatus status={d.sharepoint.status} at={d.sharepoint.lastSyncAt} />
              </TableCell>
              <TableCell className="hidden 2xl:table-cell">
                <SyncStatus status="connecte" at={d.fiscalDocsSyncAt} />
              </TableCell>
              <TableCell>
                {gaps.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <CircleCheck className="size-3.5 text-emerald-500" />
                    Complet
                  </span>
                ) : (
                  <Tooltip>
                    <TooltipTrigger render={<span tabIndex={0} />}>
                      <ToneBadge tone="warning">
                        <TriangleAlert />
                        À compléter · {gaps.length}
                      </ToneBadge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <ul className="list-disc pl-3">
                        {gaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DataPagination {...pagination} noun="dossier(s)" />
    </div>
  )
}
