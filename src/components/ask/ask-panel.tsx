"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircleIcon, SendIcon } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { citedIds, evidenceHref, statusCopy } from "@/lib/ask";
import { routes } from "@/lib/site-config";
import { AskResponseSchema, type AskResponse } from "@/types/graph";

type State = { kind: "idle" } | { kind: "loading"; question: string } | { kind: "error"; question: string; message: string } | { kind: "done"; question: string; response: AskResponse };

const TONE = { ok: "bg-emerald-600 text-white", warn: "bg-amber-400 text-black", error: "bg-destructive text-white" } as const;

function EvidenceChip({ id }: { id: string }) {
  const href = evidenceHref(id, routes.account);
  return href ? (
    <LinkButton href={href} size="xs" variant="outline">
      {id}
    </LinkButton>
  ) : (
    <Badge className="bg-muted font-mono text-foreground">{id}</Badge>
  );
}

/**
 * F-14 page (T13-07) with the F-15 preset buttons (T14-04): free question, 12 presets from docs/questions.md,
 * loading / empty / error states, the validated answer, and every claim with its evidence ID chips.
 * Presets call POST /api/ask for now; the F-15 answer cache (T14-01..03, backend) is not available yet.
 */
export function AskPanel({ presets }: { presets: readonly string[] }) {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);

  useEffect(() => {
    if (state.kind !== "loading") return;
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [state.kind]);

  async function ask(q: string) {
    const text = q.trim();
    if (text.length < 3) return;
    setQuestion(text);
    started.current = Date.now();
    setElapsed(0);
    setState({ kind: "loading", question: text });
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: text }) });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message = body && typeof body === "object" && "message" in body ? String((body as { message: unknown }).message) : `HTTP ${res.status}`;
        setState({ kind: "error", question: text, message });
        return;
      }
      const parsed = AskResponseSchema.safeParse(body);
      setState(parsed.success ? { kind: "done", question: text, response: parsed.data } : { kind: "error", question: text, message: "The answer had an unexpected format." });
    } catch {
      setState({ kind: "error", question: text, message: "The server could not be reached." });
    }
  }

  const loading = state.kind === "loading";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card size="sm" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Ask a question</CardTitle>
          <CardDescription>Answers come only from the graph. Every claim cites the node IDs behind it; claims without evidence are removed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <label htmlFor="ask-question" className="sr-only">
              Question
            </label>
            <textarea
              id="ask-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(question);
                }
              }}
              maxLength={500}
              rows={3}
              placeholder="For example: Why is C01 critical while its dashboard is green?"
              className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line · {question.trim().length}/500</p>
              <Button type="submit" disabled={loading || question.trim().length < 3}>
                {loading ? <LoaderCircleIcon className="animate-spin" /> : <SendIcon />}
                Ask the graph
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card size="sm" className="lg:row-span-2">
        <CardHeader>
          <CardTitle>Preset questions</CardTitle>
          <CardDescription>The 12 competency questions from docs/questions.md.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {presets.map((p) => (
              <li key={p}>
                <Button variant="outline" size="sm" className="h-auto w-full justify-start py-2 text-left whitespace-normal" disabled={loading} onClick={() => void ask(p)}>
                  {p}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section aria-live="polite" className="lg:col-span-2">
        {state.kind === "idle" ? (
          <Card size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">Type a question or pick a preset. Questions about any of the 40 accounts work, not only C01–C06.</p>
            </CardContent>
          </Card>
        ) : state.kind === "loading" ? (
          <Card size="sm">
            <CardContent className="flex items-center gap-3 text-sm" role="status">
              <LoaderCircleIcon className="size-5 animate-spin" />
              <span>
                Searching the graph for “{state.question}”… {elapsed}s <span className="text-muted-foreground">(usually around 20 seconds)</span>
              </span>
            </CardContent>
          </Card>
        ) : state.kind === "error" ? (
          <Card size="sm">
            <CardContent className="flex flex-col gap-3" role="alert">
              <p className="text-sm font-medium">The question could not be answered: {state.message}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void ask(state.question)}>
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnswerCard question={state.question} response={state.response} onAsk={(q) => void ask(q)} />
        )}
      </section>
    </div>
  );
}

function AnswerCard({ question, response, onAsk }: { question: string; response: AskResponse; onAsk: (q: string) => void }) {
  const copy = statusCopy(response.status);
  const ids = citedIds(response.claims);
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={TONE[copy.tone]}>{copy.title}</Badge>
          <span className="text-xs text-muted-foreground">
            {(response.durationMs / 1000).toFixed(1)}s · {response.claims.length} claims kept{response.discarded ? ` · ${response.discarded} removed` : ""}
          </span>
        </div>
        <CardTitle className="text-base">{question}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed whitespace-pre-line">{response.answer}</p>

        {response.claims.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {response.claims.map((c, i) => (
              <li key={i} className="rounded-lg border p-3 text-sm">
                <p>{c.text}</p>
                {c.quote ? <blockquote className="mt-1 border-l-2 pl-2 text-xs text-muted-foreground">“{c.quote}”</blockquote> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.evidenceIds.map((id) => (
                    <EvidenceChip key={id} id={id} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        {ids.length > 0 ? <p className="text-xs text-muted-foreground">Evidence cited: {ids.length} nodes.</p> : null}

        {response.presetSuggestions?.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">Try one of these instead:</p>
            <div className="flex flex-col gap-1.5">
              {response.presetSuggestions.map((p) => (
                <Button key={p} variant="outline" size="sm" className="h-auto justify-start py-1.5 text-left whitespace-normal" onClick={() => onAsk(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {response.note ? <p className="text-xs text-muted-foreground">{response.note}</p> : null}
      </CardContent>
    </Card>
  );
}
