"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowUpRight, Download, Eye, FileText, RefreshCw } from "lucide-react"

import { PageContainer, PageHeader } from "@/components/common/page"
import { FiscalDocStatusBadge, SyncStatus } from "@/components/common/status"
import {
  DataPagination,
  FilterChip,
  InlineSelect,
  SearchInput,
  normalizeSearch,
  usePagination,
} from "@/components/common/table-tools"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DOSSIERS,
  FISCAL_DOC_STATUS,
  FISCAL_DOC_TYPES,
  getDossier,
  getFiscalDocuments,
  type FiscalDocStatus,
  type FiscalDocType,
  type FiscalDocument,
} from "@/lib/data"
import { DEMO_NOW, formatDate, formatEur, formatNumber } from "@/lib/format"
import { useDemoStore } from "@/lib/store"

type TypeFilter = "tous" | FiscalDocType

const DOSSIER_OPTIONS = [
  { value: "tous", label: "Tous les dossiers" },
  ...[...DOSSIERS].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((d) => ({ value: d.id, label: d.name })),
]

const STATUS_OPTIONS: { value: "tous" | FiscalDocStatus; label: string }[] = [
  { value: "tous", label: "Tous" },
  ...(Object.entries(FISCAL_DOC_STATUS) as [FiscalDocStatus, string][]).map(([value, label]) => ({ value, label })),
]

export function DocumentsView({ dossierParam }: { dossierParam?: string }) {
  const router = useRouter()
  const docs = getFiscalDocuments()
  const syncedAt = useDemoStore((s) => s.syncs["documents"])
  const recordSync = useDemoStore((s) => s.recordSync)
  const [query, setQuery] = useState("")
  // Le dossier filtré vient de l'URL (?d=…) : le sélecteur de société de l'en-tête le met à jour
  const dossier = dossierParam ?? "tous"
  const setActive = useDemoStore((s) => s.setActiveDossier)
  // Le sélecteur de société de l'en-tête affiche le dossier filtré
  useEffect(() => setActive(dossier === "tous" ? null : dossier), [dossier, setActive])
  const setDossier = (v: string) => router.replace(v === "tous" ? "/documents" : `/documents?d=${v}`, { scroll: false })
  const [type, setType] = useState<TypeFilter>("tous")
  const [status, setStatus] = useState<"tous" | FiscalDocStatus>("tous")
  const [preview, setPreview] = useState<FiscalDocument | null>(null)
  const [syncing, setSyncing] = useState(false)

  // À traiter d'abord (en retard, à déposer, en préparation) par échéance, puis les dépôts récents
  const scoped = useMemo(() => {
    const rank = { en_retard: 0, a_deposer: 1, brouillon: 2, depose: 3 } as const
    return docs
      .filter((d) => dossier === "tous" || d.dossierId === dossier)
      .sort((a, b) =>
        rank[a.status] !== rank[b.status]
          ? rank[a.status] - rank[b.status]
          : a.status === "depose"
            ? (b.filedAt ?? "").localeCompare(a.filedAt ?? "")
            : a.dueDate.localeCompare(b.dueDate),
      )
  }, [docs, dossier])
  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return scoped.filter((doc) => {
      if (type !== "tous" && doc.type !== type && !(type === "is_solde" && doc.type === "is_acompte")) return false
      if (status !== "tous" && doc.status !== status) return false
      if (q) {
        const name = getDossier(doc.dossierId)?.name ?? ""
        if (!normalizeSearch(`${doc.label} ${doc.form} ${doc.period} ${name}`).includes(q)) return false
      }
      return true
    })
  }, [scoped, type, status, query])
  const pagination = usePagination(filtered, 10)

  const countType = (t: TypeFilter) =>
    scoped.filter((d) => t === "tous" || d.type === t || (t === "is_solde" && d.type === "is_acompte")).length

  function sync() {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      recordSync("documents", DEMO_NOW.toISOString())
      toast.success("Documents fiscaux à jour", { description: "Aucun nouveau document depuis la dernière récupération (démo)." })
    }, 1500)
  }

  const typeChips: { id: TypeFilter; label: string }[] = [
    { id: "tous", label: "Tous" },
    { id: "liasse", label: "Liasses" },
    { id: "tva", label: "TVA" },
    { id: "is_solde", label: "Impôt sur les sociétés" },
    { id: "cvae", label: "CVAE" },
    { id: "das2", label: "DAS2" },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Documents fiscaux"
        description="Liasses et déclarations récupérées automatiquement depuis Pennylane, pour tous les dossiers du portefeuille."
        actions={
          <>
            <SyncStatus status="connecte" at={syncedAt ?? new Date(DEMO_NOW.getTime() - 3 * 3600_000).toISOString()} label={syncedAt ? "récupéré à l'instant" : undefined} />
            <Button variant="outline" onClick={sync} disabled={syncing}>
              <RefreshCw data-icon="inline-start" className={syncing ? "animate-spin" : undefined} />
              Récupérer maintenant
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={query} onChange={(v) => { setQuery(v); pagination.reset() }} placeholder="Rechercher (document, société, formulaire)…" className="sm:w-80" />
          <InlineSelect value={dossier} onChange={(v) => { setDossier(v); pagination.reset() }} options={DOSSIER_OPTIONS} className="min-w-64" />
          <div className="lg:ml-auto">
            <InlineSelect label="Statut" value={status} onChange={(v) => { setStatus(v); pagination.reset() }} options={STATUS_OPTIONS} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeChips.map((c) => (
            <FilterChip key={c.id} active={type === c.id} onClick={() => { setType(c.id); pagination.reset() }} label={c.label} count={countType(c.id)} />
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            {dossier === "tous" && <TableHead>Société</TableHead>}
            <TableHead>Période</TableHead>
            <TableHead>Échéance</TableHead>
            <TableHead>Déposé le</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.slice.map((doc) => (
            <TableRow key={doc.id} className="cursor-pointer" onClick={() => setPreview(doc)}>
              <TableCell className="max-w-80">
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 shrink-0 text-red-500/80" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{doc.label}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{doc.form}</div>
                  </div>
                </div>
              </TableCell>
              {dossier === "tous" && <TableCell className="max-w-56 truncate text-sm">{getDossier(doc.dossierId)?.name}</TableCell>}
              <TableCell className="text-sm first-letter:uppercase">{doc.period}</TableCell>
              <TableCell className="text-sm tabular-nums">{formatDate(doc.dueDate)}</TableCell>
              <TableCell className="text-sm tabular-nums text-muted-foreground">{doc.filedAt ? formatDate(doc.filedAt) : "—"}</TableCell>
              <TableCell>
                <FiscalDocStatusBadge status={doc.status} />
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">{doc.amount !== null ? formatEur(doc.amount) : "—"}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Aperçu"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreview(doc)
                  }}
                >
                  <Eye />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {pagination.slice.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                Aucun document ne correspond à ces filtres.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <DataPagination {...pagination} noun="document(s)" />

      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
    </PageContainer>
  )
}

function DocumentPreview({ doc, onClose }: { doc: FiscalDocument | null; onClose: () => void }) {
  const d = doc ? getDossier(doc.dossierId) : null
  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        {doc && d && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle>{doc.label}</SheetTitle>
              <SheetDescription>
                {d.name} · <span className="font-mono">{doc.form}</span>
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              {/* Aperçu factice du formulaire */}
              <div className="mx-auto aspect-[1/1.414] w-full max-w-sm rounded-md border bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between border-b pb-3">
                  <div>
                    <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Direction générale des finances publiques</div>
                    <div className="mt-1 text-sm font-semibold">{FISCAL_DOC_TYPES[doc.type]}</div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {doc.form.split(" ")[0]}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-[11px]">
                  <div><span className="text-muted-foreground">Dénomination :</span> {d.name}</div>
                  <div><span className="text-muted-foreground">SIREN :</span> <span className="font-mono">{d.siren}</span></div>
                  <div className="first-letter:uppercase"><span className="text-muted-foreground">Période :</span> {doc.period}</div>
                </div>
                <div className="mt-4 space-y-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded bg-muted" style={{ maxWidth: `${55 + ((i * 37) % 40)}%` }} />
                      <div className="h-2 w-12 rounded bg-muted" />
                    </div>
                  ))}
                </div>
                {doc.amount !== null && (
                  <div className="mt-5 flex justify-between border-t pt-2 text-xs font-semibold">
                    <span>Montant</span>
                    <span className="tabular-nums">{formatEur(doc.amount)}</span>
                  </div>
                )}
                <div className="mt-6 text-center text-[10px] text-muted-foreground">Aperçu de démonstration</div>
              </div>
              <dl className="mt-5 divide-y text-sm">
                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Statut</dt><dd><FiscalDocStatusBadge status={doc.status} /></dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Échéance</dt><dd className="tabular-nums">{formatDate(doc.dueDate)}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Déposé le</dt><dd className="tabular-nums">{doc.filedAt ? formatDate(doc.filedAt) : "—"}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Taille</dt><dd className="tabular-nums">{formatNumber(doc.sizeKb)} Ko</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Source</dt><dd>Pennylane · déclarations</dd></div>
              </dl>
            </div>
            <SheetFooter className="flex-row justify-end border-t">
              <Button variant="outline" nativeButton={false} render={<a href="https://app.pennylane.com/" target="_blank" rel="noreferrer" />}>
                Ouvrir dans Pennylane
                <ArrowUpRight data-icon="inline-end" />
              </Button>
              <Button onClick={() => toast.success("Téléchargement simulé", { description: "En production, le PDF est récupéré depuis Pennylane." })}>
                <Download data-icon="inline-start" />
                Télécharger
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
