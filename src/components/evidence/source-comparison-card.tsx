import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SourceComparison, SourceGroup } from "@/lib/source-comparison";

function Column({ title, group }: { title: string; group: SourceGroup }) {
  return (
    <div className="flex min-w-0 flex-col gap-2" data-column={title}>
      <div className="flex items-center gap-2">
        <Badge className="bg-foreground text-background">{title}</Badge>
        <span className="truncate text-sm font-medium">{group.sourceFile}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {group.records.map((r) => (
          <li key={r.id} className="rounded-md border p-2 text-xs">
            <div className="font-medium break-words">{r.title}</div>
            {r.detail ? <div className="text-muted-foreground break-words">{r.detail}</div> : null}
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-muted-foreground">
              <dt>File</dt>
              <dd className="break-all">{r.sourceFile}</dd>
              <dt>ID</dt>
              <dd className="break-all">{r.sourceId ?? "—"}</dd>
              <dt>Date</dt>
              <dd>{r.date ?? "—"}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two records from different primary sources side by side (e.g. "CRM says champion" vs "work history says moved"). */
export function SourceComparisonCard({ comparison }: { comparison: SourceComparison }) {
  return (
    <Card size="sm" data-testid="source-comparison">
      <CardHeader>
        <CardTitle>Source A vs Source B</CardTitle>
        <CardDescription>Records about this node from different source files. Derived relationships are not counted as a source.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Column title="Source A" group={comparison.sourceA} />
          <Column title="Source B" group={comparison.sourceB} />
        </div>
        {comparison.other.length > 0 ? (
          <div className="text-xs text-muted-foreground">
            Other sources: {comparison.other.map((g) => `${g.sourceFile} (${g.records.length})`).join(", ")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
