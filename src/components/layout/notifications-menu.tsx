"use client"

import Link from "next/link"
import { Bell, CalendarClock, CircleCheck, FileText, RefreshCw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NOTIFICATIONS, type AppNotification } from "@/lib/data"
import { formatRelative } from "@/lib/format"
import { useMounted } from "@/lib/hooks"
import { useDemoStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const ICONS: Record<AppNotification["kind"], { icon: typeof Bell; className: string }> = {
  sync: { icon: RefreshCw, className: "text-sky-600 bg-sky-50" },
  echeance: { icon: CalendarClock, className: "text-red-600 bg-red-50" },
  validation: { icon: CircleCheck, className: "text-emerald-600 bg-emerald-50" },
  document: { icon: FileText, className: "text-neutral-600 bg-neutral-100" },
  alerte: { icon: TriangleAlert, className: "text-amber-600 bg-amber-50" },
}

export function NotificationsMenu() {
  const read = useDemoStore((s) => s.readNotifications)
  const markRead = useDemoStore((s) => s.markNotificationsRead)
  const mounted = useMounted()
  const unread = mounted ? NOTIFICATIONS.filter((n) => !read.includes(n.id)).length : NOTIFICATIONS.length

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" className="relative text-muted-foreground" aria-label={`Notifications (${unread} non lues)`} />}
      >
        <Bell />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-semibold text-red-600 ring-2 ring-background">
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          <Button variant="ghost" size="xs" onClick={() => markRead(NOTIFICATIONS.map((n) => n.id))} disabled={unread === 0}>
            Tout marquer comme lu
          </Button>
        </div>
        <ul className="max-h-[420px] overflow-y-auto py-1">
          {NOTIFICATIONS.map((n) => {
            const { icon: Icon, className } = ICONS[n.kind]
            const isUnread = mounted && !read.includes(n.id)
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => markRead([n.id])}
                  className="flex gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", className)}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-sm", isUnread ? "font-semibold" : "font-medium")}>{n.title}</span>
                      {isUnread && <span className="size-1.5 shrink-0 rounded-full bg-sky-500" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.description}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground/80">{formatRelative(n.at)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
