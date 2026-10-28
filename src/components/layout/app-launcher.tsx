"use client"

import { ArrowUpRight, Check, LayoutGrid } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const APPS = [
  {
    name: "Dossier de travail",
    description: "Analyse des dossiers via Pennylane",
    href: null,
    mark: "dt",
  },
  {
    name: "Pennylane",
    description: "Production comptable",
    href: "https://app.pennylane.com/",
    mark: "pl",
  },
]

/** Lanceur des applications de du cabinet. */
export function AppLauncher() {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="Applications du cabinet" />}
            />
          }
        >
          <LayoutGrid />
        </TooltipTrigger>
        <TooltipContent>Applications du cabinet</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 gap-1 p-1.5">
        <div className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">Applications du cabinet</div>
        {APPS.map((app) => {
          const content = (
            <>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold tracking-tight",
                  app.href ? "bg-muted text-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                {app.mark}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{app.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{app.description}</span>
              </span>
              {app.href ? (
                <ArrowUpRight className="size-4 text-muted-foreground" />
              ) : (
                <Check className="size-4 text-foreground" />
              )}
            </>
          )
          return app.href ? (
            <a
              key={app.name}
              href={app.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
            >
              {content}
            </a>
          ) : (
            <div key={app.name} className="flex items-center gap-3 rounded-md bg-muted/60 px-2 py-2">
              {content}
            </div>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
