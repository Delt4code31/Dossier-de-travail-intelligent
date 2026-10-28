"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Pastille de filtre (« Toutes », « Nouveaux · 138 »…) comme Fiscalis */
export function FilterChip({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  tone,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  label: string
  count?: number
  tone?: "danger"
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      aria-pressed={active}
      className={cn("font-normal", !active && tone === "danger" && "text-red-600")}
    >
      {Icon && <Icon className="size-3.5" />}
      {label}
      {count !== undefined && <span className={cn("tabular-nums", active ? "text-primary-foreground/70" : "text-muted-foreground")}>· {formatNumber(count)}</span>}
    </Button>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Rechercher…",
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <InputGroup className={cn("w-full sm:w-64", className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </InputGroup>
  )
}

/** Liste déroulante compacte avec libellé (« Synchronisation : Toutes ») */
export function InlineSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label?: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs whitespace-nowrap text-muted-foreground">{label}</span>}
      <Select items={options} value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className={cn("min-w-36", className)} size="default">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function normalizeSearch(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

export function usePagination<T>(items: T[], initialSize = 10) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(initialSize)
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(page, pages)
  const slice = useMemo(() => items.slice((current - 1) * size, current * size), [items, current, size])
  return {
    slice,
    page: current,
    pages,
    size,
    total: items.length,
    setPage,
    setSize: (s: number) => {
      setSize(s)
      setPage(1)
    },
    reset: () => setPage(1),
  }
}

/** Pied de tableau : « 1–10 sur 30 dossiers » · Lignes par page · ‹ 1 / 3 › */
export function DataPagination({
  page,
  pages,
  size,
  total,
  setPage,
  setSize,
  noun = "élément(s)",
}: {
  page: number
  pages: number
  size: number
  total: number
  setPage: (p: number) => void
  setSize: (s: number) => void
  noun?: string
}) {
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(total, page * size)
  const sizes = [10, 25, 50].map((s) => ({ value: String(s), label: String(s) }))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {formatNumber(from)}–{formatNumber(to)} sur {formatNumber(total)} {noun}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span>Lignes par page</span>
          <Select items={sizes} value={String(size)} onValueChange={(v) => setSize(Number(v))}>
            <SelectTrigger size="sm" className="w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Page précédente">
            <ChevronLeft />
          </Button>
          <span className="min-w-12 text-center tabular-nums">
            {page} / {pages}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Page suivante">
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
