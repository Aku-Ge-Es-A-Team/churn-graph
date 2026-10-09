import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { graphC01Fixture } from "@/fixtures/graph-c01";
import { riskRowsFixture } from "@/fixtures/risk-rows";
import type { GraphPayload } from "@/types/graph";

// Skeleton /akun/[id] (T00-11): fixture sementara; diganti getAccountEvidence() di F-08.
const graphFixtures: Record<string, GraphPayload> = { C01: graphC01Fixture };

// Area yang diisi fitur lain; dibiarkan kosong bernama di skeleton.
const AREA_KOSONG = [
  { id: "viewer", judul: "Penampil graph", fitur: "F-12" },
  { id: "tindakan", judul: "Kartu tindakan", fitur: "F-09" },
  { id: "grafik", judul: "Grafik usage vs rilis", fitur: "F-18" },
  { id: "timeline", judul: "Timeline", fitur: "F-19" },
];

function AkunDetail({ id }: { id: string }) {
  const row = riskRowsFixture.find((r) => r.id === id);
  const graph = graphFixtures[id];
  const namaNode = new Map(graph?.nodes.map((n) => [n.id, n.label]) ?? []);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">
          {id}
          {row ? ` · ${row.nama}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {row ? `Level ${row.level} · dashboard ${row.dashboard} · data fixture (sementara)` : "Akun tidak ada di fixture."}
        </p>
      </div>

      {!graph ? (
        <p className="rounded-lg border p-6 text-center text-muted-foreground">
          Belum ada jalur bukti untuk akun {id}.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Node ({graph.nodes.length})</CardTitle>
              <CardDescription>Disorot: {graph.highlight.join(", ")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {graph.nodes.map((n) => (
                  <li key={n.key} className={graph.highlight.includes(n.id) ? "font-medium" : undefined}>
                    <span className="tabular-nums">{n.id}</span> <span className="text-muted-foreground">:{n.label}</span>{" "}
                    {typeof n.props.nama === "string" ? n.props.nama : typeof n.props.subjek === "string" ? n.props.subjek : typeof n.props.judul === "string" ? n.props.judul : ""}
                    <span className="block text-xs text-muted-foreground">
                      {String(n.props.source_file)} · {String(n.props.source_id)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Relasi ({graph.edges.length})</CardTitle>
              <CardDescription>Relasi turunan diberi tanda &ldquo;turunan&rdquo;.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {graph.edges.map((e) => (
                  <li key={e.key}>
                    ({e.from}
                    <span className="text-muted-foreground">:{namaNode.get(e.from)}</span>)-[:{e.type}]→({e.to}
                    <span className="text-muted-foreground">:{namaNode.get(e.to)}</span>)
                    {e.derived ? <span className="ml-1 text-xs text-muted-foreground">turunan</span> : null}
                    <span className="block text-xs text-muted-foreground">
                      {String(e.props.source_file)} · {String(e.props.source_id)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {AREA_KOSONG.map((area) => (
          <section
            key={area.id}
            aria-label={area.judul}
            data-area={area.id}
            className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"
          >
            <span className="font-medium text-foreground">{area.judul}</span>
            <span>Belum dibangun ({area.fitur})</span>
          </section>
        ))}
      </div>
    </>
  );
}

export default function AkunPage({ params }: PageProps<"/akun/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Kembali ke peringkat
      </Link>
      {/* cacheComponents: params adalah data runtime, aksesnya wajib di dalam Suspense */}
      <Suspense fallback={<p className="text-muted-foreground">Memuat akun…</p>}>
        {params.then(({ id }) => (
          <AkunDetail id={id} />
        ))}
      </Suspense>
    </main>
  );
}
