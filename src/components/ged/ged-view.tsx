"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  ArrowUpRight,
  ChevronRight,
  Cloud,
  Download,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Mail,
  Upload,
} from "lucide-react"

import { PageContainer, PageHeader } from "@/components/common/page"
import { InlineSelect, SearchInput, normalizeSearch } from "@/components/common/table-tools"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DOSSIERS, flattenFiles, getDossier, getGed, pathTo, type GedNode } from "@/lib/data"
import { DEMO_NOW, formatDateShort, formatNumber } from "@/lib/format"
import { useDemoStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type Source = "tous" | "pennylane" | "sharepoint"

const DOSSIER_OPTIONS = [...DOSSIERS]
  .sort((a, b) => a.name.localeCompare(b.name, "fr"))
  .map((d) => ({ value: d.id, label: d.name }))

function FileIcon({ node, className }: { node: GedNode; className?: string }) {
  if (node.kind === "folder") return <Folder className={cn("size-4 text-sky-600/80", className)} />
  switch (node.ext) {
    case "xlsx":
      return <FileSpreadsheet className={cn("size-4 text-emerald-600", className)} />
    case "docx":
      return <FileText className={cn("size-4 text-blue-600", className)} />
    case "jpg":
      return <FileImage className={cn("size-4 text-violet-500", className)} />
    case "txt":
      return <FileCode className={cn("size-4 text-neutral-500", className)} />
    case "msg":
      return <Mail className={cn("size-4 text-sky-600", className)} />
    default:
      return <FileText className={cn("size-4 text-red-500/80", className)} />
  }
}

function formatSize(kb?: number) {
  if (!kb) return "—"
  return kb >= 1024 ? `${formatNumber(kb / 1024, 1)} Mo` : `${formatNumber(kb)} Ko`
}

export function GedView({ dossierParam }: { dossierParam?: string }) {
  const router = useRouter()
  const activeId = useDemoStore((s) => s.activeDossierId)
  const setActive = useDemoStore((s) => s.setActiveDossier)
  const dossierId = dossierParam ?? activeId ?? DOSSIER_OPTIONS[0]!.value
  const dossier = getDossier(dossierId) ?? getDossier(DOSSIER_OPTIONS[0]!.value)!
  const tree = getGed(dossier.id)!
  const [source, setSource] = useState<Source>("tous")
  const [folderId, setFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [preview, setPreview] = useState<GedNode | null>(null)
  const [uploads, setUploads] = useState<Record<string, GedNode[]>>({})
  const fileInput = useRef<HTMLInputElement>(null)
  const sharepointLinked = dossier.sharepoint.status === "connecte"

  // Le sélecteur de société de l'en-tête affiche le dossier consulté
  useEffect(() => setActive(dossier.id), [dossier.id, setActive])

  // Racine virtuelle selon la source choisie
  const root: GedNode = useMemo(() => {
    const children =
      source === "pennylane" ? [tree.pennylane] : source === "sharepoint" ? [tree.sharepoint] : [tree.pennylane, tree.sharepoint]
    const withUploads = (n: GedNode): GedNode =>
      n.kind === "folder"
        ? { ...n, children: [...(n.children ?? []).map(withUploads), ...(uploads[n.id] ?? [])] }
        : n
    return {
      id: `${dossier.id}-root-${source}`,
      name: dossier.name,
      kind: "folder",
      source: "sharepoint",
      modifiedAt: DEMO_NOW.toISOString(),
      modifiedBy: "—",
      children: children.filter((c) => c.source !== "sharepoint" || sharepointLinked).map(withUploads),
    }
  }, [tree, source, dossier, uploads, sharepointLinked])

  const found = folderId ? pathTo(root, folderId) : []
  const path = found.length ? found : [root]
  const current = path[path.length - 1] ?? root
  const q = normalizeSearch(query.trim())
  const items = q
    ? flattenFiles(root).filter((f) => normalizeSearch(f.name).includes(q))
    : [...(current.children ?? [])].sort((a, b) => (a.kind === b.kind ? b.modifiedAt.localeCompare(a.modifiedAt) : a.kind === "folder" ? -1 : 1))

  const counts = {
    pennylane: flattenFiles(tree.pennylane).length,
    sharepoint: sharepointLinked ? flattenFiles(tree.sharepoint).length : 0,
  }

  function changeDossier(id: string) {
    setFolderId(null)
    setQuery("")
    router.replace(`/ged?d=${id}`, { scroll: false })
  }

  function onUpload(files: FileList | null) {
    if (!files?.length) return
    const target = current.id === root.id ? (sharepointLinked ? tree.sharepoint.id : tree.pennylane.id) : current.id
    const added: GedNode[] = Array.from(files).map((f, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: f.name,
      kind: "file",
      source: target.includes("-pl-") ? "pennylane" : "sharepoint",
      ext: (f.name.split(".").pop()?.toLowerCase() as GedNode["ext"]) ?? "pdf",
      sizeKb: Math.max(1, Math.round(f.size / 1024)),
      modifiedAt: DEMO_NOW.toISOString(),
      modifiedBy: "Yann Jammes",
    }))
    setUploads((u) => ({ ...u, [target]: [...(u[target] ?? []), ...added] }))
    toast.success(`${added.length} fichier(s) ajouté(s)`, { description: "Démo : le fichier reste dans votre navigateur et n'est envoyé nulle part." })
  }

  return (
    <PageContainer>
      <PageHeader
        title="GED"
        description="Tous les documents d'un dossier au même endroit : justificatifs de la GED Pennylane et dossiers de travail SharePoint du cabinet."
        actions={
          <>
            <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
            <Button onClick={() => fileInput.current?.click()}>
              <Upload data-icon="inline-start" />
              Déposer un fichier
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <InlineSelect value={dossier.id} onChange={changeDossier} options={DOSSIER_OPTIONS} className="min-w-72" />
        <ToggleGroup
          value={[source]}
          onValueChange={(v: string[]) => {
            if (!v[0]) return
            setSource(v[0] as Source)
            setFolderId(null)
          }}
          variant="outline"
          spacing={0}
        >
          <ToggleGroupItem value="tous" className="px-3">Tout</ToggleGroupItem>
          <ToggleGroupItem value="pennylane" className="px-3">GED Pennylane · {counts.pennylane}</ToggleGroupItem>
          <ToggleGroupItem value="sharepoint" className="px-3">SharePoint · {counts.sharepoint}</ToggleGroupItem>
        </ToggleGroup>
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un fichier…" className="lg:ml-auto" />
      </div>

      <div className="grid min-h-[480px] gap-4 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Arborescence" className="rounded-xl border p-2 text-sm">
          <TreeNode node={root} depth={0} activeId={current.id} onSelect={(id) => { setFolderId(id); setQuery("") }} expanded={new Set(path.map((p) => p.id))} />
          {!sharepointLinked && source !== "pennylane" && (
            <div className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
              Dossier SharePoint non relié.{" "}
              <Link href={`/production/parametrage/${dossier.id}`} className="font-medium underline underline-offset-2">
                Le lier
              </Link>
            </div>
          )}
        </nav>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-h-8 flex-wrap items-center gap-1 text-sm">
            {q ? (
              <span className="text-muted-foreground">
                {items.length} résultat(s) pour « {query} »
              </span>
            ) : (
              path.map((p, i) => (
                <span key={p.id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
                  <button
                    type="button"
                    onClick={() => setFolderId(i === 0 ? null : p.id)}
                    className={cn("rounded px-1 py-0.5 hover:bg-muted", i === path.length - 1 ? "font-medium" : "text-muted-foreground")}
                  >
                    {p.name}
                  </button>
                </span>
              ))
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Modifié le</TableHead>
                <TableHead className="hidden lg:table-cell">Modifié par</TableHead>
                <TableHead className="text-right">Taille</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((n) => (
                <TableRow
                  key={n.id}
                  className="cursor-pointer"
                  onClick={() => (n.kind === "folder" ? (setFolderId(n.id), setQuery("")) : setPreview(n))}
                >
                  <TableCell className="max-w-[28rem]">
                    <span className="flex items-center gap-2.5">
                      <FileIcon node={n} />
                      <span className="truncate">{n.name}</span>
                      {n.kind === "folder" && <span className="text-xs text-muted-foreground">{n.children?.length ?? 0}</span>}
                      {source === "tous" && n.kind === "file" && (
                        <span className="ml-1 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {n.source === "pennylane" ? "Pennylane" : "SharePoint"}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground tabular-nums md:table-cell">{formatDateShort(n.modifiedAt)}</TableCell>
                  <TableCell className="hidden truncate text-sm text-muted-foreground lg:table-cell">{n.modifiedBy}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{n.kind === "folder" ? "—" : formatSize(n.sizeKb)}</TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {q ? "Aucun fichier trouvé." : "Ce dossier est vide."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <FilePreview node={preview} dossierName={dossier.name} onClose={() => setPreview(null)} />
    </PageContainer>
  )
}

function TreeNode({
  node,
  depth,
  activeId,
  onSelect,
  expanded,
}: {
  node: GedNode
  depth: number
  activeId: string
  onSelect: (id: string | null) => void
  expanded: Set<string>
}) {
  const folders = (node.children ?? []).filter((c) => c.kind === "folder")
  const isOpen = depth === 0 || expanded.has(node.id)
  const active = node.id === activeId
  const Icon = depth === 0 ? Cloud : isOpen && folders.length ? FolderOpen : Folder
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(depth === 0 ? null : node.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left transition-colors",
          active ? "bg-muted font-medium" : "hover:bg-muted/60",
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <Icon className={cn("size-4 shrink-0", depth === 0 ? "text-muted-foreground" : "text-sky-600/80")} />
        <span className="truncate">{node.name}</span>
      </button>
      {isOpen && folders.map((f) => <TreeNode key={f.id} node={f} depth={depth + 1} activeId={activeId} onSelect={onSelect} expanded={expanded} />)}
    </div>
  )
}

function FilePreview({ node, dossierName, onClose }: { node: GedNode | null; dossierName: string; onClose: () => void }) {
  return (
    <Sheet open={!!node} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        {node && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2 pr-8">
                <FileIcon node={node} />
                <span className="truncate">{node.name}</span>
              </SheetTitle>
              <SheetDescription>
                {dossierName} · {node.source === "pennylane" ? "GED Pennylane" : "SharePoint"}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mx-auto flex aspect-[1/1.414] w-full max-w-sm flex-col rounded-md border bg-white p-5 shadow-sm">
                <div className="mb-4 h-3 w-2/3 rounded bg-muted" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="mb-2 h-2 rounded bg-muted/80" style={{ width: `${60 + ((i * 29) % 38)}%` }} />
                ))}
                <div className="mt-auto text-center text-[10px] text-muted-foreground">Aperçu de démonstration</div>
              </div>
              <dl className="mt-5 divide-y text-sm">
                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Modifié le</dt><dd className="tabular-nums">{formatDateShort(node.modifiedAt)}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Modifié par</dt><dd>{node.modifiedBy}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted-foreground">Taille</dt><dd className="tabular-nums">{formatSize(node.sizeKb)}</dd></div>
              </dl>
            </div>
            <SheetFooter className="flex-row justify-end border-t">
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={node.source === "pennylane" ? "https://app.pennylane.com/" : "https://www.office.com/launch/sharepoint"} target="_blank" rel="noreferrer" />}
              >
                {node.source === "pennylane" ? "Ouvrir dans Pennylane" : "Ouvrir dans SharePoint"}
                <ArrowUpRight data-icon="inline-end" />
              </Button>
              <Button onClick={() => toast.success("Téléchargement simulé")}>
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
