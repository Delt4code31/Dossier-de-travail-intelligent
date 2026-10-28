"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronFirst, ChevronLast, ChevronRight, Plus } from "lucide-react"

import { NewDossierDialog } from "@/components/layout/new-dossier-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDemoStore } from "@/lib/store"
import { cn } from "@/lib/utils"

import { NAV, activeSection, isLinkActive, type NavSection } from "./nav-config"

/**
 * Navigation latérale façon Pennylane, avec le design de Fiscalis :
 * - une colonne de sections ;
 * - un panneau de sous-pages, épinglé (fixe) ou en survol.
 */
export function AppSidebar() {
  const pathname = usePathname()
  const active = activeSection(pathname)
  const pinned = useDemoStore((s) => s.navPinned)
  const setPinned = useDemoStore((s) => s.setNavPinned)
  // Panneau en survol, mémorisé avec la page où il a été ouvert (il se ferme au changement de page)
  const [hovered, setHovered] = useState<{ id: string; path: string } | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flyout = hovered?.path === pathname ? hovered.id : null
  const setFlyout = (id: string | null) => setHovered(id ? { id, path: pathname } : null)

  const docked = pinned && active?.groups ? active : null
  const flyoutSection = NAV.find((s) => s.id === flyout && s.groups && s.id !== docked?.id) ?? null

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  function open(section: NavSection) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setFlyout(section.groups ? section.id : null)
  }

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setFlyout(null), 180)
  }

  const top = NAV.filter((s) => s.position === "top")
  const bottom = NAV.filter((s) => s.position === "bottom")

  return (
    <div className="relative hidden h-full shrink-0 md:flex" onMouseLeave={scheduleClose}>
      <nav aria-label="Navigation principale" className="flex w-48 flex-col border-r bg-sidebar px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {top.map((s) => (
            <RailItem key={s.id} section={s} active={active?.id === s.id} expanded={flyout === s.id || docked?.id === s.id} onHover={() => open(s)} />
          ))}
        </ul>
        <ul className="mt-auto flex flex-col gap-0.5 border-t pt-3">
          {bottom.map((s) => (
            <RailItem key={s.id} section={s} active={active?.id === s.id} expanded={false} onHover={() => open(s)} />
          ))}
        </ul>
      </nav>

      {docked && <SectionPanel section={docked} pathname={pathname} pinned onTogglePin={() => setPinned(false)} />}

      {flyoutSection && (
        <div
          className="absolute inset-y-0 left-48 z-40 animate-in duration-150 fade-in-0 slide-in-from-left-1"
          onMouseEnter={() => closeTimer.current && clearTimeout(closeTimer.current)}
        >
          <SectionPanel
            section={flyoutSection}
            pathname={pathname}
            pinned={false}
            floating
            onTogglePin={() => {
              setPinned(true)
              setFlyout(null)
            }}
          />
        </div>
      )}
    </div>
  )
}

function RailItem({
  section,
  active,
  expanded,
  onHover,
}: {
  section: NavSection
  active: boolean
  expanded: boolean
  onHover: () => void
}) {
  const Icon = section.icon
  return (
    <li>
      <Link
        href={section.href}
        onMouseEnter={onHover}
        onFocus={onHover}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          active
            ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/10"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
        )}
      >
        <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
        <span className="flex-1 truncate">{section.label}</span>
        {section.groups && (
          <ChevronRight
            className={cn("size-3.5 text-muted-foreground/70 transition-transform", expanded && "translate-x-0.5 text-foreground")}
          />
        )}
      </Link>
    </li>
  )
}

function SectionPanel({
  section,
  pathname,
  pinned,
  floating = false,
  onTogglePin,
}: {
  section: NavSection
  pathname: string
  pinned: boolean
  floating?: boolean
  onTogglePin: () => void
}) {
  const [newOpen, setNewOpen] = useState(false)
  return (
    <aside
      aria-label={`Sous-menu ${section.label}`}
      className={cn("flex h-full w-56 flex-col border-r bg-background", floating && "shadow-xl shadow-foreground/5")}
    >
      <div className="flex h-12 items-center justify-between pr-2 pl-4">
        <span className="text-[15px] font-semibold tracking-tight">{section.label}</span>
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={pinned ? "Masquer le panneau" : "Épingler le panneau"} onClick={onTogglePin} />}
          >
            {pinned ? <ChevronFirst /> : <ChevronLast />}
          </TooltipTrigger>
          <TooltipContent side="right">{pinned ? "Masquer le panneau" : "Épingler le panneau"}</TooltipContent>
        </Tooltip>
      </div>

      {section.id === "production" && (
        <div className="px-3">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button className="w-full justify-center" />}>
              <Plus data-icon="inline-start" />
              Nouveau
              <ChevronDown data-icon="inline-end" className="opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-(--anchor-width)">
              <DropdownMenuItem onClick={() => setNewOpen(true)}>Dossier client</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/production/dossiers-annuels?statut=non_demarre" />}>
                Démarrer un dossier annuel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <NewDossierDialog open={newOpen} onOpenChange={setNewOpen} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-5 px-3">
        {section.groups?.map((g) => (
          <div key={g.label}>
            <div className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">{g.label}</div>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const active = isLinkActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-8 items-center rounded-md px-2 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        active ? "bg-muted font-medium text-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  )
}
