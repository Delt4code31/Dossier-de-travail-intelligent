"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getUser, userName } from "@/lib/data"
import { formatPct, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Barre d'avancement fine + pourcentage */
export function ProgressBar({
  value,
  tone = "default",
  className,
  showLabel = true,
}: {
  value: number
  tone?: "default" | "danger" | "success"
  className?: string
  showLabel?: boolean
}) {
  const color = tone === "danger" ? "bg-red-500" : tone === "success" ? "bg-emerald-500" : "bg-foreground"
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {showLabel && <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{value} %</span>}
    </div>
  )
}

export function UserAvatar({ userId, size = "sm", className }: { userId: string; size?: "sm" | "default"; className?: string }) {
  const u = getUser(userId)
  const name = userName(userId)
  return (
    <Avatar size={size} className={className}>
      <AvatarFallback className={cn("font-medium", u?.team === "pme" ? "bg-sky-50 text-sky-700" : "bg-neutral-100 text-neutral-700")}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

/** Équipe d'un dossier : collaborateur, chef de mission, associé */
export function TeamAvatars({ team }: { team: { collaborateur: string; chefMission: string; associe: string } }) {
  const members = [
    { id: team.collaborateur, role: "Collaborateur" },
    { id: team.chefMission, role: "Chef de mission" },
    { id: team.associe, role: "Associé signataire" },
  ]
  return (
    <div className="flex -space-x-1.5">
      {members.map((m) => (
        <Tooltip key={m.role}>
          <TooltipTrigger render={<span className="rounded-full ring-2 ring-background" tabIndex={0} />}>
            <UserAvatar userId={m.id} />
          </TooltipTrigger>
          <TooltipContent>
            {userName(m.id)} — {m.role}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

/** Tuile de chiffre clé */
export function StatTile({
  label,
  value,
  hint,
  tone,
  href,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: "danger" | "warning" | "success"
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <Icon
            className={cn(
              "size-4",
              tone === "danger" ? "text-red-500" : tone === "warning" ? "text-amber-500" : tone === "success" ? "text-emerald-500" : "text-muted-foreground",
            )}
          />
        )}
      </div>
      <div className={cn("mt-1.5 text-2xl font-semibold tracking-tight tabular-nums", tone === "danger" && "text-red-600")}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </>
  )
  const cls = "block rounded-xl border bg-card px-4 py-3.5 transition-colors"
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-muted/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/**
 * Variation N / N-1 en %. `favorable` indique si une hausse est une bonne nouvelle
 * (vert) ou non (rouge), ex. une hausse des charges est défavorable.
 */
export function Variation({
  n,
  n1,
  favorable = "up",
  className,
}: {
  n: number
  n1: number
  favorable?: "up" | "down" | "neutral"
  className?: string
}) {
  if (n1 === 0) return <span className={cn("text-xs text-muted-foreground", className)}>—</span>
  const v = (n - n1) / Math.abs(n1)
  const up = v > 0.0005
  const down = v < -0.0005
  const good = favorable === "neutral" ? null : favorable === "up" ? up : down
  const color = !up && !down ? "text-muted-foreground" : good === null ? "text-foreground" : good ? "text-emerald-600" : "text-red-600"
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", color, className)}>
      <Icon className="size-3.5" />
      {formatPct(v)}
    </span>
  )
}

/** Onglets soulignés pilotés par l'URL (comme la fiche société de Fiscalis) */
export function LineTabs({
  tabs,
  className,
}: {
  tabs: { label: string; href: string; count?: number; tone?: "danger" | "default"; exact?: boolean }[]
  className?: string
}) {
  const pathname = usePathname()
  return (
    <nav className={cn("no-scrollbar -mb-px flex gap-1 overflow-x-auto", className)}>
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <Badge variant={t.tone === "danger" ? "destructive" : "secondary"} className="tabular-nums">
                {t.count}
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
