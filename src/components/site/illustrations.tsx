import { cn } from "@/lib/utils";

// Ilustrasi brand pengganti foto di referensi. Semua warna dari token brand (paper, umber, ink, signal, ...).
// Data yang dipakai berasal dari studi kasus KasirNusa (fiktif) sebagaimana tertulis di PRD.

const SOURCES = ["CRM", "Email & meetings", "Product usage", "Support tickets", "Contracts & billing", "Decision log"];

/** Enam sistem yang terpisah mengalir ke satu context graph; satu node bertentangan (merah). */
export function SourcesIllustration({ className }: { className?: string }) {
  const rowY = (i: number) => 92 + i * 78;
  const hub = { x: 470, y: 288 };
  const nodes = [
    { x: 420, y: 196 },
    { x: 540, y: 220 },
    { x: 395, y: 330 },
    { x: 560, y: 352 },
    { x: 482, y: 410 },
  ];
  return (
    <svg viewBox="0 0 640 600" className={cn("block h-full w-full", className)} role="img" aria-labelledby="sources-title">
      <title id="sources-title">Six separate systems flowing into one context graph</title>
      <rect width="640" height="600" className="fill-umber" />
      {SOURCES.map((s, i) => (
        <g key={s}>
          <rect x="40" y={rowY(i) - 20} width="170" height="40" rx="4" className="fill-paper" fillOpacity="0.07" />
          <text x="56" y={rowY(i) + 5} className="fill-paper" fontSize="15">
            {s}
          </text>
          <path
            d={`M210 ${rowY(i)} C330 ${rowY(i)} 340 ${hub.y} ${hub.x - 30} ${hub.y}`}
            fill="none"
            className="stroke-paper"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
        </g>
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <path d={`M${hub.x} ${hub.y} L${n.x} ${n.y}`} className="stroke-paper" strokeOpacity="0.6" strokeWidth="1.2" />
          <circle cx={n.x} cy={n.y} r="9" className={i === 1 ? "fill-signal" : "fill-paper"} />
        </g>
      ))}
      <circle cx={hub.x} cy={hub.y} r="26" className="fill-umber stroke-paper" strokeWidth="1.5" />
      <circle cx={hub.x} cy={hub.y} r="6" className="fill-paper" />
      <text x="40" y="560" className="fill-paper" fillOpacity="0.5" fontSize="13">
        6 sources, one graph
      </text>
    </svg>
  );
}

/** Dua catatan dari sumber berbeda yang saling membantah (kasus champion C01). */
export function ContradictionCloseup({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={cn("block h-full w-full", className)} role="img" aria-labelledby="contradiction-title">
      <title id="contradiction-title">The CRM still lists a champion who left the company</title>
      <rect width="400" height="400" className="fill-sand" />
      <g>
        <rect x="36" y="58" width="300" height="104" rx="4" className="fill-paper" />
        <text x="56" y="88" className="fill-graphite" fontSize="12">
          crm_accounts.csv
        </text>
        <text x="56" y="118" className="fill-ink font-heading" fontSize="19">
          Champion: Rina Hapsari
        </text>
        <text x="56" y="142" className="fill-graphite" fontSize="12">
          C01, snapshot Oct 1, 2026
        </text>
      </g>
      <g>
        <rect x="64" y="226" width="300" height="104" rx="4" className="fill-paper stroke-signal" strokeWidth="1.5" />
        <text x="84" y="256" className="fill-graphite" fontSize="12">
          contact_employment_history.csv
        </text>
        <text x="84" y="286" className="fill-ink font-heading" fontSize="19">
          Left on Aug 15, 2026
        </text>
        <text x="84" y="310" className="fill-graphite" fontSize="12">
          Now GM Operations at prospect P01
        </text>
      </g>
      <circle cx="200" cy="194" r="18" className="fill-signal" />
      <path d="M192 189h16M192 199h16M205 182l-10 24" className="stroke-paper" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Penurunan usage karena bug: outlet 4.12 turun, outlet kontrol datar (kasus C03, PRD F-18). */
export function UsageIllustration({ className }: { className?: string }) {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const x = (i: number) => 56 + i * 46;
  const affected = [113, 112, 114, 113, 108, 118, 113, 112, 113, 73, 74, 72];
  const control = [118, 116, 119, 118, 112, 121, 118, 117, 119, 117, 118, 116];
  const y = (v: number) => 360 - v * 2.2;
  const line = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  return (
    <svg viewBox="0 0 620 440" className={cn("block h-full w-full", className)} role="img" aria-labelledby="usage-title">
      <title id="usage-title">Usage drops only on outlets running version 4.12, while control outlets stay flat</title>
      <rect width="620" height="440" className="fill-umber" />
      <path d={`M${x(8.95)} 70V380`} className="stroke-signal" strokeDasharray="3 4" />
      <text x={x(8.95) + 8} y="84" fill="#e0806f" fontSize="12">
        Release 4.12, Jun 29
      </text>
      <path d={line(control)} fill="none" className="stroke-paper" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="6 5" />
      <path d={line(affected)} fill="none" className="stroke-paper" strokeWidth="2.5" />
      {months.map((m, i) => (
        <text key={m} x={x(i)} y="410" className="fill-paper" fillOpacity="0.45" fontSize="11" textAnchor="middle">
          {m}
        </text>
      ))}
      <text x="56" y="44" className="fill-paper" fillOpacity="0.7" fontSize="13">
        Transactions per outlet, illustrative
      </text>
      <text x={x(11)} y={y(72) + 26} className="fill-paper" fontSize="12" textAnchor="end">
        6 outlets on 4.12
      </text>
      <text x={x(11)} y={y(116) - 12} className="fill-paper" fillOpacity="0.55" fontSize="12" textAnchor="end">
        19 control outlets
      </text>
    </svg>
  );
}

/** Gambar garis jalur bukti C01, gaya sketsa di atas latar terang. */
export function EvidenceLineDrawing({ className }: { className?: string }) {
  const nodes = [
    { id: "C01", label: "Account C01", x: 120, y: 160 },
    { id: "K017", label: "Champion K017", x: 360, y: 70 },
    { id: "P01", label: "Prospect P01", x: 620, y: 70 },
    { id: "D", label: "Decision D-2025-11", x: 360, y: 250 },
    { id: "F7", label: "Feature FEAT-07", x: 620, y: 250 },
    { id: "I0331", label: "Meeting I0331", x: 880, y: 160 },
  ];
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edges: [string, string, boolean][] = [
    ["C01", "K017", false],
    ["K017", "P01", true],
    ["C01", "D", false],
    ["D", "F7", false],
    ["P01", "I0331", false],
    ["F7", "I0331", false],
  ];
  return (
    <svg viewBox="0 0 1000 330" className={cn("block h-auto w-full", className)} role="img" aria-labelledby="line-title">
      <title id="line-title">Evidence path for account C01 across contacts, decisions and meetings</title>
      {edges.map(([a, b, red]) => (
        <path
          key={`${a}-${b}`}
          d={`M${by[a].x} ${by[a].y} L${by[b].x} ${by[b].y}`}
          className={red ? "stroke-signal" : "stroke-ink"}
          strokeOpacity={red ? 1 : 0.55}
          strokeWidth="1.2"
          strokeDasharray={red ? "5 5" : undefined}
        />
      ))}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r="22" className="fill-paper stroke-ink" strokeWidth="1.2" />
          <circle cx={n.x} cy={n.y} r="4" className={n.id === "P01" ? "fill-signal" : "fill-ink"} />
          <text x={n.x} y={n.y + 46} className="fill-ink" fontSize="13" textAnchor="middle">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
