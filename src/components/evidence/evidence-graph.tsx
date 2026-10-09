"use client";

import "@xyflow/react/dist/style.css";
import { memo, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  SOURCE_STYLES,
  layoutFlowGraph,
  toFlowGraph,
  type EvidenceNodeData,
  type FlowNode,
} from "@/lib/evidence-graph";
import { signalLabel } from "@/lib/ranking";
import { compareSources, nodeProperties } from "@/lib/source-comparison";
import { cn } from "@/lib/utils";
import { GraphPayloadSchema, type GraphPayload, type Signal } from "@/types/graph";
import { EvidenceExplorer } from "./evidence-explorer";
import { SourceComparisonCard } from "./source-comparison-card";

type Status = "ready" | "loading" | "error";

const elk = new ELK();

/** Node kustom: warna tepi per sumber data, node yang disorot lebih tebal. */
const EvidenceNode = memo(function EvidenceNode({ data }: NodeProps<Node<EvidenceNodeData>>) {
  const color = SOURCE_STYLES[data.category].color;
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-center rounded-md border-2 bg-background px-3 text-left shadow-xs",
        data.highlighted ? "ring-2 ring-offset-2" : "opacity-75",
      )}
      style={{ borderColor: color, ["--tw-ring-color" as string]: color, width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-muted-foreground" />
      <span className="truncate text-[0.65rem] font-semibold uppercase tracking-wide" style={{ color }}>
        {data.label} · {data.id}
      </span>
      <span className="truncate text-xs text-foreground">{data.title}</span>
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-muted-foreground" />
    </div>
  );
});

const nodeTypes = { evidence: EvidenceNode };

/**
 * F-12 evidence graph viewer: ELK layered layout left to right, node colour per data source, derived relationships
 * dashed with their confidence, signal picker that reloads the path from `GET /api/evidence`, and a side panel with
 * the node properties and the F-06 "source A vs source B" card. Payloads above 80 nodes fall back to the list explorer.
 */
export function EvidenceGraph({ account, payload: initial, signals }: { account: string; payload: GraphPayload; signals: Signal[] }) {
  const [payload, setPayload] = useState(initial);
  const [signal, setSignal] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [selected, setSelected] = useState<string | null>(null);
  const [layout, setLayout] = useState<{ graph: ReturnType<typeof toFlowGraph>; nodes: FlowNode[] } | null>(null);

  const graph = useMemo(() => toFlowGraph(payload), [payload]);
  const signalCodes = useMemo(() => [...new Set(signals.map((s) => s.code))], [signals]);

  useEffect(() => {
    if (graph.tooLarge) return;
    let cancelled = false;
    layoutFlowGraph(graph, elk)
      .then((nodes) => {
        if (!cancelled) setLayout({ graph, nodes });
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [graph]);

  async function pickSignal(code: string | null) {
    setSignal(code);
    setSelected(null);
    if (!code) {
      setStatus("ready");
      setPayload(initial);
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(`/api/evidence?account=${encodeURIComponent(account)}&signal=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = GraphPayloadSchema.parse(await res.json());
      setPayload(next);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  // Layout belongs to the graph it was computed for; a stale layout is never drawn with new edges.
  const laidOut = layout && layout.graph === graph ? layout.nodes : null;
  const nodes: Node<EvidenceNodeData>[] = (laidOut ?? []).map((n) => ({ ...n, draggable: false }));
  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.data.label,
    labelStyle: { fontSize: 10 },
    labelBgPadding: [4, 2] as [number, number],
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
    style: { strokeWidth: 1.5, strokeDasharray: e.data.derived ? "6 4" : undefined },
  }));

  const node = payload.nodes.find((n) => n.id === selected) ?? null;
  const comparison = node ? compareSources(payload, node.id) : null;
  const sourceFiles = new Set([...payload.nodes.map((n) => n.source_file), ...payload.edges.map((e) => e.source_file)]);

  if (initial.nodes.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Evidence path</CardTitle>
          <CardDescription>No signals were triggered for this account, so there is no evidence path to show.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (graph.tooLarge) {
    return (
      <div className="flex flex-col gap-2">
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          This evidence path has {payload.nodes.length} nodes, more than the 80 the graph view draws. Showing it as a list instead.
        </p>
        <EvidenceExplorer payload={payload} signals={signals} />
      </div>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Evidence path</CardTitle>
        <CardDescription>
          {payload.nodes.length} nodes, {payload.edges.length} relationships from {sourceFiles.size} source files. Click a node to see where its records come from.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by signal">
          <Button size="sm" variant={signal ? "outline" : "default"} onClick={() => pickSignal(null)}>
            All signals
          </Button>
          {signalCodes.map((code) => (
            <Button key={code} size="sm" variant={signal === code ? "default" : "outline"} onClick={() => pickSignal(code)}>
              {signalLabel(code)}
            </Button>
          ))}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Source colours">
          {graph.categories.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: SOURCE_STYLES[c].color }} />
              {SOURCE_STYLES[c].label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <svg aria-hidden width="22" height="6">
              <path d="M0 3h22" stroke="currentColor" strokeDasharray="5 3" />
            </svg>
            Derived relationship (with confidence)
          </li>
        </ul>

        <div className="relative h-[560px] overflow-hidden rounded-lg border bg-muted/20">
          {status === "error" ? (
            <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <p>The evidence path could not be loaded from the graph.</p>
              <Button size="sm" variant="outline" onClick={() => pickSignal(signal)}>
                Try again
              </Button>
            </div>
          ) : status === "loading" || !laidOut ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
              Laying out the evidence path…
            </div>
          ) : graph.nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              There is no evidence path for this account and signal.
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.2}
              nodesConnectable={false}
              onNodeClick={(_, n) => setSelected(n.id)}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>
      </CardContent>

      <Sheet open={node !== null} onOpenChange={(open) => (open ? null : setSelected(null))}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {node ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Badge className="bg-muted text-foreground">{node.label}</Badge>
                  {node.id}
                </SheetTitle>
                <SheetDescription>
                  {node.source_file || "—"} · {node.source_id || "—"}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-6">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {nodeProperties(node).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
                {comparison ? (
                  <SourceComparisonCard comparison={comparison} />
                ) : (
                  <p className="text-xs text-muted-foreground">Only one source for this node, so there is nothing to compare.</p>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
