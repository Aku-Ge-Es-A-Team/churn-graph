"use client";

// Evidence graph viewer (F-12): draws the evidence subgraph of one account (React Flow + ELK layered, left to right).
import "@xyflow/react/dist/style.css";
import { Background, Controls, Handle, Position, ReactFlow, type NodeProps } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  MAX_NODES,
  NODE_HEIGHT,
  NODE_WIDTH,
  SOURCE_GROUPS,
  layoutNodes,
  toFlowGraph,
  type EvidenceFlowEdge,
  type EvidenceFlowNode,
} from "@/lib/graph-layout";
import { signalLabel } from "@/lib/ranking";
import { compareSources, nodeProperties } from "@/lib/source-comparison";
import type { GraphEdge, GraphPayload, Signal } from "@/types/graph";
import { SourceComparisonCard } from "./source-comparison-card";

function EvidenceNode({ data }: NodeProps<EvidenceFlowNode>) {
  const { node, group, highlighted } = data;
  return (
    <div
      className={`rounded-lg border bg-card px-2 py-1.5 text-card-foreground shadow-sm ${highlighted ? "ring-2 ring-foreground" : ""}`}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT, borderLeft: `6px solid ${group.color}` }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="truncate text-xs font-semibold">{node.id}</div>
      <div className="truncate text-[11px] text-muted-foreground">
        {node.label} · {group.label}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { evidence: EvidenceNode };

type ViewState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; payload: GraphPayload };

export function EvidenceGraph({ account, initialPayload, signals = [] }: { account: string; initialPayload: GraphPayload; signals?: Signal[] }) {
  const [signalCode, setSignalCode] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ status: "ready", payload: initialPayload });
  const [flow, setFlow] = useState<{ nodes: EvidenceFlowNode[]; edges: EvidenceFlowEdge[] }>({ nodes: [], edges: [] });
  const [selected, setSelected] = useState<{ kind: "node"; id: string } | { kind: "edge"; edge: GraphEdge } | null>(null);
  const cache = useRef(new Map<string, GraphPayload>());

  const payload = view.status === "ready" ? view.payload : null;
  const adapted = useMemo(() => (payload ? toFlowGraph(payload) : null), [payload]);

  useEffect(() => {
    if (!adapted || adapted.tooLarge) return;
    let cancelled = false;
    layoutNodes(adapted.nodes, adapted.edges).then((nodes) => {
      if (!cancelled) setFlow({ nodes, edges: adapted.edges });
    });
    return () => {
      cancelled = true;
    };
  }, [adapted]);

  const selectSignal = useCallback(
    async (code: string | null) => {
      setSignalCode(code);
      setSelected(null);
      if (code === null) return setView({ status: "ready", payload: initialPayload });
      const cached = cache.current.get(code);
      if (cached) return setView({ status: "ready", payload: cached });
      setView({ status: "loading" });
      try {
        const response = await fetch(`/api/evidence?account=${encodeURIComponent(account)}&signal=${encodeURIComponent(code)}`);
        if (!response.ok) throw new Error(`The evidence service answered ${response.status}.`);
        const next = (await response.json()) as GraphPayload;
        cache.current.set(code, next);
        setView({ status: "ready", payload: next });
      } catch (e) {
        setView({ status: "error", message: e instanceof Error ? e.message : "The evidence could not be loaded." });
      }
    },
    [account, initialPayload],
  );

  const selectedNode = selected?.kind === "node" ? (payload?.nodes.find((n) => n.id === selected.id) ?? null) : null;
  const comparison = payload && selectedNode ? compareSources(payload, selectedNode.id) : null;
  const sourceFiles = payload ? new Set([...payload.nodes.map((n) => n.source_file), ...payload.edges.map((e) => e.source_file)]) : new Set<string>();
  const uniqueSignalCodes = [...new Set(signals.map((s) => s.code))];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Evidence graph</CardTitle>
        <CardDescription>
          {payload ? `${payload.nodes.length} nodes, ${payload.edges.length} relationships from ${sourceFiles.size} source files. Dashed lines are derived relationships.` : "Evidence path of the selected signal."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {uniqueSignalCodes.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Signal filter">
            <Button size="sm" variant={signalCode === null ? "default" : "outline"} onClick={() => selectSignal(null)}>
              All signals
            </Button>
            {uniqueSignalCodes.map((code) => (
              <Button key={code} size="sm" variant={signalCode === code ? "default" : "outline"} onClick={() => selectSignal(code)}>
                {signalLabel(code)}
              </Button>
            ))}
          </div>
        ) : null}

        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Source legend">
          {SOURCE_GROUPS.map((g) => (
            <li key={g.key} className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: g.color }} aria-hidden />
              {g.label}
            </li>
          ))}
        </ul>

        <div className="h-[28rem] w-full rounded-lg border">
          {view.status === "loading" ? (
            <p className="p-4 text-sm text-muted-foreground">Loading the evidence…</p>
          ) : view.status === "error" ? (
            <div className="flex flex-col items-start gap-2 p-4 text-sm">
              <p role="alert">{view.message}</p>
              <Button size="sm" variant="outline" onClick={() => selectSignal(signalCode)}>
                Try again
              </Button>
            </div>
          ) : adapted?.tooLarge ? (
            <p className="p-4 text-sm" role="alert">
              This evidence path has {payload?.nodes.length} nodes, more than the {MAX_NODES} the viewer draws. Pick a single signal to narrow it down.
            </p>
          ) : payload && payload.nodes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No evidence path for this account or signal.</p>
          ) : (
            <ReactFlow
              nodes={flow.nodes}
              edges={flow.edges}
              nodeTypes={nodeTypes}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              minZoom={0.2}
              onNodeClick={(_, n) => setSelected({ kind: "node", id: n.id })}
              onEdgeClick={(_, e) => e.data && setSelected({ kind: "edge", edge: e.data.edge })}
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>
        {adapted && adapted.droppedEdges.length > 0 ? (
          <p className="text-xs text-muted-foreground">{adapted.droppedEdges.length} relationships were skipped because an endpoint is not in the evidence.</p>
        ) : null}
      </CardContent>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="overflow-y-auto p-4">
          {selectedNode ? (
            <>
              <SheetHeader className="p-0">
                <SheetTitle className="flex items-center gap-2">
                  <Badge className="bg-muted text-foreground">{selectedNode.label}</Badge>
                  {selectedNode.id}
                </SheetTitle>
                <SheetDescription>
                  {selectedNode.source_file ?? "—"} · {selectedNode.source_id ?? "—"}
                </SheetDescription>
              </SheetHeader>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {nodeProperties(selectedNode).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              {/* Slot of the F-06 card */}
              {comparison ? <SourceComparisonCard comparison={comparison} /> : <p className="text-xs text-muted-foreground">Only one source for this node, so there is nothing to compare.</p>}
            </>
          ) : selected?.kind === "edge" ? (
            <>
              <SheetHeader className="p-0">
                <SheetTitle>{selected.edge.type}</SheetTitle>
                <SheetDescription>
                  {selected.edge.source} → {selected.edge.target} · {selected.edge.source_file || "—"} · {selected.edge.source_id || "—"}
                </SheetDescription>
              </SheetHeader>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {selected.edge.derived ? (
                  <div className="contents">
                    <dt className="text-muted-foreground">derived</dt>
                    <dd>
                      {selected.edge.rule ?? "rule"} · confidence {selected.edge.confidence ?? "—"}
                    </dd>
                  </div>
                ) : null}
                {Object.entries(selected.edge.props).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
