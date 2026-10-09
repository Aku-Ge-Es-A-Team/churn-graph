"use client";

import { useState, type FormEvent } from "react";
import { EvidenceGraph } from "@/components/evidence/evidence-graph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AskResult } from "@/server/ask/ask";

// Example questions to start from. PROPOSAL: the real preset buttons and answer cache belong to F-15.
const EXAMPLES = [
  "Why is C01 critical while the dashboard is green?",
  "Which account is most at risk of churning, and why?",
  "What was promised to C01, who approved it, and was it kept?",
  "What is the highest discount ever approved, by whom, and why?",
];

type State = { status: "idle" } | { status: "loading" } | { status: "error"; message: string } | { status: "done"; result: AskResult };

export function AskPanel() {
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [focusId, setFocusId] = useState<string | null>(null);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 3) return;
    setState({ status: "loading" });
    setFocusId(null);
    try {
      const response = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: trimmed }) });
      const body = await response.json();
      if (!response.ok) return setState({ status: "error", message: body.message ?? `The request failed (${response.status}).` });
      setState({ status: "done", result: body as AskResult });
    } catch {
      setState({ status: "error", message: "The server could not be reached. Try one of the example questions again in a moment." });
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(question);
  };

  const result = state.status === "done" ? state.result : null;
  // Clicking a chip highlights that node in the graph; otherwise every cited node is highlighted.
  const graph = result?.graph ? { ...result.graph, highlight: focusId ? [focusId] : result.graph.highlight } : null;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question about a customer account…" aria-label="Question" maxLength={500} />
        <Button type="submit" disabled={state.status === "loading"}>
          {state.status === "loading" ? "Searching evidence…" : "Ask"}
        </Button>
      </form>
      <ul className="flex flex-wrap gap-2" aria-label="Example questions">
        {EXAMPLES.map((example) => (
          <li key={example}>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setQuestion(example);
                void submit(example);
              }}
            >
              {example}
            </Button>
          </li>
        ))}
      </ul>

      {state.status === "idle" ? <p className="text-sm text-muted-foreground">Ask a question in plain English. Every sentence of the answer comes with the IDs of the graph records that support it.</p> : null}
      {state.status === "loading" ? <p className="text-sm text-muted-foreground">The assistant is querying the graph. This can take up to about 20 seconds.</p> : null}
      {state.status === "error" ? (
        <Card size="sm">
          <CardContent role="alert" className="text-sm">
            {state.message}
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{result.refused ? "No verified answer" : "Answer"}</CardTitle>
            {result.note ? <CardDescription>{result.note}</CardDescription> : null}
            {result.intent ? (
              <CardDescription data-testid="jev-intent">
                JEV AI classified this question as “{result.intent.intent.replace("_", " ")}” ({Math.round(result.intent.confidence * 100)}% confidence).
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {result.refused ? (
              <p className="text-sm">{result.answer}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {result.claims.map((claim, i) => (
                  <li key={i} className="flex flex-col gap-1.5 text-sm">
                    <span>{claim.text}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {claim.evidenceIds.map((id) => (
                        <button key={id} type="button" onClick={() => setFocusId(id)} aria-pressed={focusId === id} className="cursor-pointer">
                          <Badge className={focusId === id ? "bg-foreground text-background" : "bg-muted text-foreground"}>{id}</Badge>
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {graph && graph.nodes.length > 0 ? <EvidenceGraph key={`${result?.claims.length}-${graph.nodes.map((n) => n.id).join(",")}`} account="ask" initialPayload={graph} /> : null}
    </div>
  );
}
