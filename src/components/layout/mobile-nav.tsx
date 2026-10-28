"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu } from "lucide-react"

import { CpaLogo } from "@/components/layout/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { NAV, activeSection, isLinkActive } from "./nav-config"

/** Menu de navigation sur téléphone / petite tablette. */
export function MobileNav() {
  const pathname = usePathname()
  const active = activeSection(pathname)
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}>
        <Menu />
      </Button>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle render={<div />}>
            <CpaLogo />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 overflow-y-auto p-2">
          {NAV.map((s) => {
            const Icon = s.icon
            const isActive = active?.id === s.id
            return (
              <div key={s.id}>
                <Link
                  href={s.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium",
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {s.label}
                </Link>
                {s.groups && (
                  <div className="mb-1 ml-9 flex flex-col border-l pl-2">
                    {s.groups.flatMap((g) => g.items).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex h-8 items-center rounded-md px-2 text-sm",
                          isLinkActive(pathname, item.href) ? "font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
