"use client"

import { CircleCheck, FileUp, RefreshCw, ShieldCheck, Stamp } from "lucide-react"

import { UserAvatar } from "@/components/common/bits"
import { CYCLES, getActivity, userName } from "@/lib/data"
import { formatDateTime } from "@/lib/format"
import { useAnnualFile } from "@/lib/hooks"

interface Entry {
  at: string
  userId: string | null
  text: string
  icon?: typeof CircleCheck
}

/** Journal du dossier : qui a fait quoi, et quand (traçabilité). */
export function HistoryView({ id }: { id: string }) {
  const file = useAnnualFile(id)!
  const entries: Entry[] = []

  for (const a of getActivity().filter((x) => x.dossierId === id)) {
    entries.push({ at: a.at, userId: a.userId, text: a.text })
  }
  for (const c of file.cycles) {
    const name = CYCLES.find((x) => x.code === c.code)?.name
    if (c.preparedAt && c.preparedBy) entries.push({ at: c.preparedAt, userId: c.preparedBy, text: `a terminé la préparation du cycle ${name}`, icon: CircleCheck })
    if (c.reviewedAt && c.reviewedBy) entries.push({ at: c.reviewedAt, userId: c.reviewedBy, text: `a visé la revue du cycle ${name}`, icon: ShieldCheck })
  }
  if (file.filedAt) entries.push({ at: file.filedAt, userId: file.dossier.team.associe, text: "a déposé la liasse fiscale", icon: Stamp })
  entries.push({
    at: new Date(new Date(file.exercise.end).getTime() + 12 * 86_400_000).toISOString(),
    userId: null,
    text: "Balance et grand livre importés depuis Pennylane",
    icon: RefreshCw,
  })
  entries.push({
    at: new Date(new Date(file.exercise.end).getTime() + 15 * 86_400_000).toISOString(),
    userId: file.dossier.team.collaborateur,
    text: "a envoyé la demande de pièces de clôture au client",
    icon: FileUp,
  })
  entries.sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="max-w-3xl">
      <ol className="relative ml-3 border-l">
        {entries.map((e, i) => {
          const Icon = e.icon
          return (
            <li key={i} className="relative pb-5 pl-6 last:pb-0">
              <span className="absolute top-0.5 -left-3 flex size-6 items-center justify-center rounded-full bg-background ring-4 ring-background">
                {e.userId && e.userId !== "system" ? (
                  <UserAvatar userId={e.userId} />
                ) : (
                  <span className="flex size-6 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                    {Icon ? <Icon className="size-3.5" /> : <RefreshCw className="size-3.5" />}
                  </span>
                )}
              </span>
              <div className="text-sm">
                <span className="font-medium">{e.userId && e.userId !== "system" ? userName(e.userId) : "Pennylane"}</span>{" "}
                <span className="text-muted-foreground">{e.text}</span>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">{formatDateTime(e.at)}</div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
