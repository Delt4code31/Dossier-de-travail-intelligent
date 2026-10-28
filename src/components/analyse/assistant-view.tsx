"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Bot, Check, LoaderCircle, Plug, ShieldCheck, Sparkles } from "lucide-react"

import { UserAvatar } from "@/components/common/bits"
import { Panel } from "@/components/common/page"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { answer, SUGGESTIONS, type AnswerBlock } from "@/lib/assistant"
import { CURRENT_USER_ID, getChecks, getDossier, getFinancials } from "@/lib/data"
import { cn } from "@/lib/utils"

interface Message {
  id: number
  role: "user" | "assistant"
  text?: string
  tools?: string[]
  blocks?: AnswerBlock[]
  /** Étape d'affichage : outils appelés un à un, puis texte révélé progressivement */
  toolsDone?: number
  revealed?: number
}

/** Horloge de l'animation (appelée uniquement depuis les gestionnaires d'événements) */
const clock = () => performance.now()

const blockLength = (blocks: AnswerBlock[]) =>
  blocks.reduce((s, b) => s + (b.type === "p" ? b.text.length : b.items.join(" ").length), 0)

/** Tronque les blocs aux `revealed` premiers caractères (effet de rédaction). */
function sliceBlocks(blocks: AnswerBlock[], revealed: number): AnswerBlock[] {
  const out: AnswerBlock[] = []
  let budget = revealed
  for (const b of blocks) {
    if (budget <= 0) break
    if (b.type === "p") {
      out.push({ type: "p", text: b.text.slice(0, budget) })
      budget -= b.text.length
    } else {
      const items: string[] = []
      for (const item of b.items) {
        if (budget <= 0) break
        items.push(item.slice(0, budget))
        budget -= item.length
      }
      out.push({ type: "ul", items })
    }
  }
  return out
}

function RevealedBlocks({ blocks, revealed }: { blocks: AnswerBlock[]; revealed: number }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {sliceBlocks(blocks, revealed).map((b, i) =>
        b.type === "p" ? (
          <p key={i}>{b.text}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  )
}

export function AssistantView({ id }: { id: string }) {
  const d = getDossier(id)!
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextId = useRef(1)
  const bottom = useRef<HTMLDivElement>(null)
  const { lines } = getFinancials(d)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
  }, [])

  // Suit la conversation (pas de défilement tant qu'aucune question n'a été posée)
  useEffect(() => {
    if (messages.length) bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [messages])

  function ask(question: string) {
    if (!question.trim() || busy) return
    const res = answer(d, question.trim())
    const total = blockLength(res.blocks)
    const now = nextId.current
    nextId.current += 2
    setMessages((m) => [
      ...m,
      { id: now, role: "user", text: question.trim() },
      { id: now + 1, role: "assistant", tools: res.tools, blocks: res.blocks, toolsDone: 0, revealed: 0 },
    ])
    setInput("")
    setBusy(true)
    // Animation : chaque outil MCP « s'exécute », puis le texte s'écrit progressivement
    // Calée sur le temps écoulé : reste fluide même si le navigateur ralentit les minuteries
    const assistantId = now + 1
    const startedAt = clock()
    const TOOL_MS = 280
    const CHARS_PER_MS = 0.4
    timer.current = setInterval(() => {
      const elapsed = clock() - startedAt
      const toolsDone = Math.min(res.tools.length, Math.floor(elapsed / TOOL_MS))
      const writing = elapsed - res.tools.length * TOOL_MS
      const revealed = writing > 0 ? Math.min(total, Math.round(writing * CHARS_PER_MS)) : 0
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, toolsDone, revealed } : msg)))
      if (revealed >= total && toolsDone >= res.tools.length) {
        if (timer.current) clearInterval(timer.current)
        setBusy(false)
      }
    }, 40)
  }

  return (
    <div className="grid flex-1 gap-6 xl:grid-cols-[1fr_320px]">
      <div className="flex min-h-[560px] flex-col rounded-xl border bg-card">
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <Sparkles className="size-5" />
              </span>
              <div>
                <div className="text-base font-semibold">Posez une question sur {d.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  L&apos;assistant lit la comptabilité du dossier dans Pennylane et répond en citant ses sources.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="font-normal" onClick={() => ask(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end gap-2">
                <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.text}</div>
                <UserAvatar userId={CURRENT_USER_ID} />
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                  <Bot className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  {m.tools && m.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.tools.map((t, i) => {
                        const done = i < (m.toolsDone ?? 0)
                        const running = i === (m.toolsDone ?? 0)
                        return (
                          <span
                            key={t}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px]",
                              done ? "text-muted-foreground" : running ? "text-foreground" : "text-muted-foreground/50",
                            )}
                          >
                            {done ? <Check className="size-3 text-emerald-500" /> : running ? <LoaderCircle className="size-3 animate-spin" /> : <Plug className="size-3" />}
                            pennylane · {t}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {m.blocks && (m.revealed ?? 0) > 0 && <RevealedBlocks blocks={m.blocks} revealed={m.revealed ?? 0} />}
                </div>
              </div>
            ),
          )}
          <div ref={bottom} />
        </div>
        <form
          className="border-t p-3"
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
        >
          <div className="flex items-end gap-2 rounded-xl border px-3 py-2 focus-within:ring-3 focus-within:ring-ring/50">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  ask(input)
                }
              }}
              placeholder="Ex. : Comment évolue la trésorerie ? Quelles questions poser au client ?"
              className="min-h-10 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
              rows={1}
            />
            <Button type="submit" size="icon-sm" disabled={!input.trim() || busy} aria-label="Envoyer">
              <ArrowUp />
            </Button>
          </div>
          {messages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <Button key={s} variant="ghost" size="xs" className="font-normal text-muted-foreground" onClick={() => ask(s)} disabled={busy}>
                  {s}
                </Button>
              ))}
            </div>
          )}
        </form>
      </div>

      <div className="flex flex-col gap-6">
        <Panel title="Comment ça marche">
          <div className="space-y-3 p-4 text-sm text-muted-foreground">
            <p>
              L&apos;assistant s&apos;appuie sur <span className="font-medium text-foreground">Claude</span> relié au{" "}
              <span className="font-medium text-foreground">MCP Pennylane</span> : il choisit lui-même les données à consulter (balance,
              grand livre, factures, déclarations) puis rédige la réponse.
            </p>
            <p className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              Lecture seule : l&apos;assistant ne modifie jamais la comptabilité.
            </p>
            <p className="rounded-md bg-muted px-2.5 py-2 text-xs">
              Démo : les réponses sont générées à partir des données fictives du dossier, sans appel à l&apos;IA.
            </p>
          </div>
        </Panel>
        <Panel title="Contexte du dossier">
          <ul className="divide-y text-sm">
            <li className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Comptes de la balance</span><span className="tabular-nums">{lines.length}</span></li>
            <li className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Exercices comparés</span><span>N et N-1</span></li>
            <li className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Contrôles automatiques</span><span className="tabular-nums">{getChecks(d).length}</span></li>
            <li className="flex justify-between px-4 py-2.5"><span className="text-muted-foreground">Seuils du dossier</span><span>{d.thresholds ? "définis" : "par défaut"}</span></li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}
