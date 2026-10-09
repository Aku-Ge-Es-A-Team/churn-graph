import { cn } from "@/lib/utils";

type Evidence = { y: number; title: string; detail: string; source: string };

// Kasus C01 dari dataset studi kasus (fiktif): dashboard bilang sehat, tiga sumber lain bertentangan.
const ACCOUNT = { cx: 560, cy: 270, r: 60 };
const EVIDENCE: Evidence[] = [
  { y: 96, title: "Champion left the company", detail: "Aug 15, now at a prospect", source: "contact history" },
  { y: 270, title: "Promised feature slipped", detail: "Jul 20, no new release date", source: "decision log" },
  { y: 444, title: "Competitor mentioned", detail: "Sep 18, by the new CFO", source: "meeting notes" },
];
const CARD = { x: 862, w: 290, h: 82 };

/** Versi layar kecil dari ilustrasi hero: isi yang sama, disusun sebagai daftar agar terbaca. */
export function HeroEvidenceList({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 py-2 text-paper", className)}>
      <div className="flex items-center justify-between border border-paper/20 px-4 py-3">
        <span className="text-[0.8rem] text-paper/60">CRM dashboard</span>
        <span className="flex items-center gap-2 font-heading text-lg">
          <span aria-hidden className="size-2 rounded-full bg-healthy" />
          Healthy
        </span>
      </div>
      <div className="flex items-center gap-3 px-1 py-2">
        <span aria-hidden className="size-3 rounded-full bg-signal ring-4 ring-signal/30" />
        <div>
          <p className="font-heading text-xl leading-tight">Kopi Lintas Nusantara</p>
          <p className="text-[0.8rem] text-[#e0806f]">Critical, renewal in 75 days</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {EVIDENCE.map((e) => (
          <li key={e.title} className="bg-paper px-4 py-3 text-ink">
            <p className="text-[0.72rem] text-graphite">{e.source}</p>
            <p className="font-heading text-[1.05rem] leading-snug">{e.title}</p>
            <p className="text-[0.8rem] text-graphite">{e.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ilustrasi hero (latar umber): satu akun, satu skor dashboard, dan tiga bukti yang membantahnya. */
export function HeroGraph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 540"
      className={cn("block h-auto w-full", className)}
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
          <circle cx="1" cy="1" r="1" className="fill-paper" opacity="0.08" />
        </pattern>
      </defs>
      <rect width="1200" height="540" fill="url(#hero-grid)" />

      {/* Dashboard -> akun: klaim yang keliru, garis putus-putus */}
      <path d={`M300 ${ACCOUNT.cy} H${ACCOUNT.cx - ACCOUNT.r - 10}`} className="stroke-paper" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="5 7" />
      <text x="385" y={ACCOUNT.cy - 14} className="fill-paper" fillOpacity="0.5" fontSize="13">
        health score
      </text>

      <rect x="64" y={ACCOUNT.cy - 54} width="236" height="108" rx="6" className="fill-umber stroke-paper" strokeOpacity="0.25" />
      <text x="90" y={ACCOUNT.cy - 18} className="fill-paper" fillOpacity="0.6" fontSize="14">
        CRM dashboard
      </text>
      <circle cx="96" cy={ACCOUNT.cy + 19} r="6" className="fill-healthy" />
      <text x="112" y={ACCOUNT.cy + 27} className="fill-paper font-heading" fontSize="26">
        Healthy
      </text>

      {/* Akun -> bukti */}
      {EVIDENCE.map((e) => {
        const sx = ACCOUNT.cx + ACCOUNT.r + 10;
        const mid = (sx + CARD.x) / 2;
        return (
          <g key={e.title}>
            <path
              d={`M${sx} ${ACCOUNT.cy} C${mid} ${ACCOUNT.cy} ${mid} ${e.y} ${CARD.x} ${e.y}`}
              fill="none"
              className="stroke-paper"
              strokeOpacity="0.55"
              strokeWidth="1.5"
            />
            <text x={CARD.x - 16} y={e.y > ACCOUNT.cy ? e.y + 22 : e.y - 10} className="fill-paper" fillOpacity="0.5" fontSize="13" textAnchor="end">
              {e.source}
            </text>
            <rect x={CARD.x} y={e.y - CARD.h / 2} width={CARD.w} height={CARD.h} rx="6" className="fill-paper" />
            <text x={CARD.x + 22} y={e.y - 5} className="fill-ink font-heading" fontSize="20">
              {e.title}
            </text>
            <text x={CARD.x + 22} y={e.y + 21} className="fill-graphite" fontSize="14">
              {e.detail}
            </text>
          </g>
        );
      })}

      {/* Akun */}
      <circle cx={ACCOUNT.cx} cy={ACCOUNT.cy} r={ACCOUNT.r} className="fill-umber stroke-paper" strokeWidth="1.5" />
      <circle cx={ACCOUNT.cx} cy={ACCOUNT.cy} r={ACCOUNT.r + 14} fill="none" className="stroke-signal" strokeWidth="1.5" strokeDasharray="2 6" />
      <circle cx={ACCOUNT.cx} cy={ACCOUNT.cy - 4} r="9" className="fill-signal" />
      <text x={ACCOUNT.cx} y={ACCOUNT.cy + 28} className="fill-paper" fontSize="13" textAnchor="middle" fillOpacity="0.7">
        C01
      </text>
      <text x={ACCOUNT.cx} y={ACCOUNT.cy + ACCOUNT.r + 46} className="fill-paper font-heading" fontSize="23" textAnchor="middle">
        Kopi Lintas Nusantara
      </text>
      <text x={ACCOUNT.cx} y={ACCOUNT.cy + ACCOUNT.r + 72} fill="#e0806f" fontSize="15" textAnchor="middle">
        Critical, renewal in 75 days
      </text>
    </svg>
  );
}
