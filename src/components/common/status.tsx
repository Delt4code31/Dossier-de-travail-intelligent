import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleMinus,
  CircleX,
  Clock,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  ANNUAL_STATUS,
  CYCLE_STATUS,
  FISCAL_DOC_STATUS,
  PENDING_STATUS,
  type AnnualStatus,
  type CheckStatus,
  type ConnectionStatus,
  type CycleStatus,
  type FiscalDocStatus,
  type PendingStatus,
} from "@/lib/data"
import { formatDate, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Statut de synchronisation façon Fiscalis : ✓ vert + « il y a 13 min » */
export function SyncStatus({
  status,
  at,
  label,
  className,
}: {
  status: ConnectionStatus
  at?: string | null
  label?: string
  className?: string
}) {
  if (status === "non_connecte") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <CircleMinus className="size-3.5 text-amber-500" />
        {label ?? "non relié"}
      </span>
    )
  }
  if (status === "erreur") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-red-600", className)}>
        <CircleAlert className="size-3.5" />
        {label ?? "erreur"}
        {at && <span className="text-muted-foreground">· {formatRelative(at)}</span>}
      </span>
    )
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <CircleCheck className="size-3.5 text-emerald-500" />
      {label ?? (at ? formatRelative(at) : "connecté")}
    </span>
  )
}

const TONES = {
  neutral: "border-border bg-background text-muted-foreground",
  info: "bg-sky-50 text-sky-700",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  done: "bg-neutral-100 text-neutral-700",
  danger: "bg-red-50 text-red-700",
} as const

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONES
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn("border-transparent", TONES[tone], className)}>
      {children}
    </Badge>
  )
}

export function AnnualStatusBadge({ status }: { status: AnnualStatus }) {
  const s = ANNUAL_STATUS[status]
  const Icon = { non_demarre: CircleDashed, en_cours: CircleDot, en_revue: Clock, valide: CircleCheck, depose: CircleCheck }[status]
  return (
    <ToneBadge tone={s.tone}>
      <Icon />
      {s.label}
    </ToneBadge>
  )
}

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  const tone = ({ a_faire: "neutral", en_cours: "info", fait: "warning", revu: "success" } as const)[status]
  return <ToneBadge tone={tone}>{CYCLE_STATUS[status]}</ToneBadge>
}

export function CheckStatusIcon({ status, className }: { status: CheckStatus; className?: string }) {
  switch (status) {
    case "ok":
      return <CircleCheck className={cn("size-4 text-emerald-500", className)} />
    case "attention":
      return <TriangleAlert className={cn("size-4 text-amber-500", className)} />
    case "anomalie":
      return <CircleX className={cn("size-4 text-red-500", className)} />
    default:
      return <CircleMinus className={cn("size-4 text-muted-foreground/60", className)} />
  }
}

export const CHECK_LABEL: Record<CheckStatus, string> = {
  ok: "Conforme",
  attention: "À examiner",
  anomalie: "Anomalie",
  na: "Sans objet",
}

export function CheckStatusBadge({ status }: { status: CheckStatus }) {
  const tone = ({ ok: "success", attention: "warning", anomalie: "danger", na: "neutral" } as const)[status]
  return <ToneBadge tone={tone}>{CHECK_LABEL[status]}</ToneBadge>
}

export function FiscalDocStatusBadge({ status }: { status: FiscalDocStatus }) {
  const tone = ({ depose: "success", a_deposer: "info", brouillon: "neutral", en_retard: "danger" } as const)[status]
  return <ToneBadge tone={tone}>{FISCAL_DOC_STATUS[status]}</ToneBadge>
}

export function PendingStatusBadge({ status }: { status: PendingStatus }) {
  const tone = ({ ouvert: "info", relance: "warning", resolu: "success" } as const)[status]
  return <ToneBadge tone={tone}>{PENDING_STATUS[status]}</ToneBadge>
}

/** Échéance : date + « J-10 » ou « en retard » (rouge) */
export function DueDate({
  date,
  daysLeft,
  done,
  className,
}: {
  date: string
  daysLeft: number
  done?: boolean
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm whitespace-nowrap", className)}>
      <span className={cn("tabular-nums", done && "text-muted-foreground")}>{formatDate(date)}</span>
      {!done && daysLeft < 0 && (
        <Badge variant="destructive" className="tabular-nums">
          {Math.abs(daysLeft)} j de retard
        </Badge>
      )}
      {!done && daysLeft >= 0 && daysLeft <= 30 && (
        <Badge variant="secondary" className={cn("tabular-nums", daysLeft <= 10 && "bg-amber-50 text-amber-700")}>
          J-{daysLeft}
        </Badge>
      )}
    </span>
  )
}
