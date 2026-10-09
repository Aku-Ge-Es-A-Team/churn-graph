"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signalLabel } from "@/lib/ranking";
import { compareSources, nodeProperties } from "@/lib/source-comparison";
import type { GraphPayload, Signal } from "@/types/graph";
import { SourceComparisonCard } from "./source-comparison-card";

/**
 * Evidence explorer. The interactive graph viewer (F-12) is not part of this scope; this list occupies the same slot:
 * pick a signal to highlight its evidence nodes, click a node to open its side panel with properties and the F-06 card.
 */
export function EvidenceExplorer({ payload, signals }: { payload: GraphPayload; signals: Signal[] }) {
  const [signalKey, setSignalKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const active = signals.find((s) => `${s.code}|${s.since}` === signalKey) ?? null;
  const highlighted = useMemo(() => new Set(active ? active.evidenceIds : payload.highlight), [active, payload.highlight]);
  const visibleNodes = payload.nodes.filter((n) => highlighted.has(n.id));
  const byLabel = Map.groupBy(visibleNodes, (n) => n.label);
  const node = payload.nodes.find((n) => n.id === selected) ?? null;
  const comparison = node ? compareSources(payload, node.id) : null;
  const sourceFiles = new Set([...payload.nodes.map((n) => n.source_file), ...payload.edges.map((e) => e.source_file)]);

  if (payload.nodes.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Evidence path</CardTitle>
          <CardDescription>No signals were triggered for this account, so there is no evidence path to show.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Evidence path</CardTitle>
        <CardDescription>
          {payload.meta.nodeCount} nodes, {payload.meta.edgeCount} relationships from {sourceFiles.size} source files.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={active ? "outline" : "default"} onClick={() => setSignalKey(null)}>
            All signals
          </Button>
          {signals.map((s) => {
            const key = `${s.code}|${s.since}`;
            return (
              <Button key={key} size="sm" variant={signalKey === key ? "default" : "outline"} onClick={() => setSignalKey(key)}>
                {signalLabel(s.code)}
              </Button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-3">
            {[...byLabel.entries()].map(([label, nodes]) => (
              <div key={label}>
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {label} ({nodes.length})
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {nodes.map((n) => (
                    <li key={n.id}>
                      <Button size="xs" variant={selected === n.id ? "default" : "outline"} onClick={() => setSelected(n.id)} aria-pressed={selected === n.id}>
                        {n.id}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <aside aria-label="Node details" className="min-w-0 rounded-lg border p-3">
            {!node ? (
              <p className="text-sm text-muted-foreground">Select a node to see its properties and where each record comes from.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-muted text-foreground">{node.label}</Badge>
                    <span className="font-medium">{node.id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {node.source_file} · {node.source_id}
                  </div>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {nodeProperties(node).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
                {comparison ? <SourceComparisonCard comparison={comparison} /> : <p className="text-xs text-muted-foreground">Only one source for this node, so there is nothing to compare.</p>}
              </div>
            )}
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}
