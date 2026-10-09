import type { ComponentType } from "react";
import { ActionIcon, AskIcon, CompareIcon, PathIcon, RadarIcon, TimelineIcon } from "@/components/brand/icons";
import { EvidenceLineDrawing, UsageIllustration } from "@/components/site/illustrations";
import { Container, SectionShell } from "@/components/site/section-shell";
import { sectionIds } from "@/lib/site-config";

type Feature = { icon: ComponentType<{ className?: string }>; title: string; body: string };

// Fitur sesuai PRD (F-11, F-12, F-06, F-09, F-19, F-14).
const FEATURES: Feature[] = [
  {
    icon: RadarIcon,
    title: "Risk radar",
    body: "All 40 accounts ranked by risk, with the dashboard colour beside our finding, so a green account that is really critical stands out.",
  },
  {
    icon: PathIcon,
    title: "Evidence path",
    body: "Open an account to see the path through contacts, contracts, decisions and tickets that explains its rank.",
  },
  {
    icon: CompareIcon,
    title: "Source A vs source B",
    body: "Two records that contradict each other, side by side, each with its file, ID and date.",
  },
  {
    icon: ActionIcon,
    title: "Retention actions",
    body: "Suggested actions grounded in past decisions, with who approved them and the cost against the revenue at risk.",
  },
  {
    icon: TimelineIcon,
    title: "Signal timeline",
    body: "When each signal first appeared, counted in days before the renewal date.",
  },
  {
    icon: AskIcon,
    title: "Ask the graph",
    body: "Ask a new question in plain language and get an answer that cites the node IDs behind it.",
  },
];

/** Features: pernyataan rata kanan, daftar fitur, gambar garis jalur bukti, dan contoh bug vs churn. */
export function FeaturesSection() {
  return (
    <SectionShell id={sectionIds.features} labelledBy="features-title">
      <Container>
        <div className="grid md:grid-cols-12">
          <h2
            id="features-title"
            className="font-heading text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[1.25] md:col-span-7 md:col-start-6"
          >
            Every warning arrives with the records behind it, so your team acts on facts instead of a colour.
          </h2>
        </div>

        <ul className="mt-16 grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3 md:mt-20">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-4 bg-paper p-7 md:p-9">
              <Icon className="size-7 text-ink" />
              <h3 className="font-heading text-[1.35rem] leading-tight">{title}</h3>
              <p className="text-[0.9rem] leading-[1.7] text-graphite">{body}</p>
            </li>
          ))}
        </ul>

        <figure className="mt-20 md:mt-28">
          {/* Di layar kecil gambar bisa digeser horizontal agar label node tetap terbaca. */}
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <EvidenceLineDrawing className="min-w-[720px]" />
          </div>
          <figcaption className="mt-6 text-center text-[0.82rem] text-graphite">
            The path for account C01: a champion who moved to a prospect, a discount tied to a feature that slipped,
            and a meeting where a competitor came up.
          </figcaption>
        </figure>

        <div className="mt-20 grid gap-8 md:mt-28 md:grid-cols-12 md:items-center">
          <div className="aspect-[31/22] overflow-hidden md:col-span-7">
            <UsageIllustration />
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <h3 className="font-heading text-[1.6rem] leading-tight">A drop in usage is not always churn.</h3>
            <p className="mt-4 text-[0.92rem] leading-[1.75] text-graphite">
              Account C03 looked like it was leaving: transactions fell by about a third. The graph shows the drop only
              on outlets running version 4.12, where offline sales failed to sync because of a known bug.
            </p>
            <p className="mt-3 text-[0.92rem] leading-[1.75] text-graphite">
              The right response is a bug fix and compensation, not a retention discount.
            </p>
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}
