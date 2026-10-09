import { cn } from "@/lib/utils";

type Evidence = { y: number; title: string; detail: string; source: string };

// Kasus C01 dari dataset studi kasus (fiktif): dashboard bilang sehat, tiga sumber lain bertentangan.
const ACCOUNT = { cx: 560, cy: 280, r: 62 };
const EVIDENCE: Evidence[] = [
  { y: 104, title: "Champion left the company", detail: "Aug 15, now at a prospect", source: "contact history" },
  { y: 280, title: "Promised feature slipped", detail: "Jul 20, no new release date", source: "decision log" },
  { y: 456, title: "Competitor mentioned", detail: "Sep 18, by the new CFO", source: "meeting notes" },
];
const CARD = { x: 862, w: 290, h: 82 };

/** Ilustrasi hero: satu akun, satu skor dashboard, dan tiga bukti yang membantahnya. */
export function HeroGraph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 560"
      className={cn("block h-auto w-full font-sans", className)}
      role="img"
      aria-labelledby="hero-graph-title hero-graph-desc"
    >
      <title id="hero-graph-title">An account the dashboard calls healthy</title>
      <desc id="hero-graph-desc">
        The health score marks Kopi Lintas Nusantara as healthy, while contact history, the decision log and meeting
        notes show that its champion left, a promised feature slipped, and a competitor was mentioned.
      </desc>

      <defs>
        <pattern id="hero-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="white" opacity="0.09" />
        </pattern>
      </defs>
      <rect width="1200" height="560" fill="url(#hero-grid)" />

      {/* Dashboard -> akun: klaim yang keliru, garis putus-putus */}
      <path d={`M300 280 H${ACCOUNT.cx - ACCOUNT.r - 8}`} stroke="white" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="5 7" />
      <text x="385" y="266" fill="white" fillOpacity="0.45" fontSize="13">
        health score
      </text>

      <g>
        <rect x="64" y="226" width="236" height="108" rx="18" fill="black" stroke="white" strokeOpacity="0.22" />
        <text x="90" y="262" fill="white" fillOpacity="0.55" fontSize="14">
          CRM dashboard
        </text>
        <circle cx="96" cy="299" r="6" className="fill-healthy" />
        <text x="112" y="307" fill="white" fontSize="26" className="font-heading">
          Healthy
        </text>
      </g>

      {/* Akun -> bukti */}
      {EVIDENCE.map((e) => {
        const sx = ACCOUNT.cx + ACCOUNT.r + 8;
        const mid = (sx + CARD.x) / 2;
        return (
          <g key={e.title}>
            <path
              d={`M${sx} ${ACCOUNT.cy} C${mid} ${ACCOUNT.cy} ${mid} ${e.y} ${CARD.x} ${e.y}`}
              fill="none"
              stroke="white"
              strokeOpacity="0.6"
              strokeWidth="1.5"
            />
            {/* Label di sisi garis yang menjauhi kurva: di atas untuk kartu atas/tengah, di bawah untuk kartu bawah. */}
            <text x={CARD.x - 16} y={e.y > ACCOUNT.cy ? e.y + 22 : e.y - 10} fill="white" fillOpacity="0.45" fontSize="13" textAnchor="end">
              {e.source}
            </text>
            <rect x={CARD.x} y={e.y - CARD.h / 2} width={CARD.w} height={CARD.h} rx="18" fill="white" />
            <text x={CARD.x + 22} y={e.y - 5} fill="black" fontSize="20" fontWeight="500" className="font-heading">
              {e.title}
            </text>
            <text x={CARD.x + 22} y={e.y + 20} fill="black" fillOpacity="0.55" fontSize="14">
              {e.detail}
            </text>
          </g>
        );
      })}

      {/* Akun */}
      <circle cx={ACCOUNT.cx} cy={ACCOUNT.cy} r={ACCOUNT.r} fill="black" stroke="white" strokeWidth="1.5" />
      <circle cx={ACCOUNT.cx} cy={ACCOUNT.cy} r={ACCOUNT.r + 14} fill="none" className="stroke-signal" strokeWidth="1.5" strokeDasharray="2 6" />
      <circle cx={ACCOUNT.cx} cy={ACCOUNT.cy - 4} r="9" className="fill-signal" />
      <text x={ACCOUNT.cx} y={ACCOUNT.cy + 28} fill="white" fontSize="13" textAnchor="middle" fillOpacity="0.7">
        C01
      </text>
      <text x={ACCOUNT.cx} y={ACCOUNT.cy + ACCOUNT.r + 46} fill="white" fontSize="23" textAnchor="middle" className="font-heading">
        Kopi Lintas Nusantara
      </text>
      <text x={ACCOUNT.cx} y={ACCOUNT.cy + ACCOUNT.r + 72} className="fill-signal" fontSize="15" textAnchor="middle">
        Critical, renewal in 75 days
      </text>
    </svg>
  );
}
