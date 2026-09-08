import { useState } from "react";
import { SectionHeading } from "./SectionHeading";
import { useInView } from "./useInView";
import { cn } from "../../lib/utils";
import { Modal } from "../common/Modal";
import type { PublicProblemStatement } from "../../services/problem-statement.service";

type DomainGroup = {
  domainId: number;
  domainName: string;
  statements: PublicProblemStatement[];
};

// The API already joins on domainId and orders by domain, so grouping here
// only has to bucket consecutive rows — no name matching, no re-sorting.
function groupByDomain(statements: PublicProblemStatement[]): DomainGroup[] {
  const groups: DomainGroup[] = [];
  const groupByDomainId = new Map<number, DomainGroup>();

  for (const statement of statements) {
    let group = groupByDomainId.get(statement.domainId);
    if (!group) {
      group = { domainId: statement.domainId, domainName: statement.domainName, statements: [] };
      groupByDomainId.set(statement.domainId, group);
      groups.push(group);
    }
    group.statements.push(statement);
  }

  return groups;
}

function ComingSoon() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-purple-400/30 bg-gradient-to-b from-purple-500/10 to-transparent p-10 text-center sm:p-14">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-purple-600/20 blur-[80px]" />
      <div className="relative">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 text-purple-100 ring-1 ring-purple-400/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8">
            <path d="M12 14v3m0-9h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mt-6 text-2xl font-bold text-white sm:text-3xl">Coming Soon</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
          We&apos;re crafting real-world problems across all ten domains.
          Stay tuned: they&apos;ll be announced right here before the
          competition begins.
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-100">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
          To Be Announced
        </span>
      </div>
    </div>
  );
}

function DomainStatementList({ group }: { group: DomainGroup }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="grid gap-3">
      {group.statements.map((statement) => {
        const expanded = expandedId === statement.id;
        return (
          <div
            key={statement.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-purple-400/30"
          >
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : statement.id)}
              aria-expanded={expanded}
              className="flex w-full items-start justify-between gap-3 p-4 text-left"
            >
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-purple-200">
                  {statement.problemStatementId}
                </span>
                <p className="mt-2 text-sm font-semibold leading-snug text-white sm:text-base">
                  {statement.title}
                </p>
              </div>
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className={cn(
                  "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
                  expanded ? "rotate-180 text-purple-300" : ""
                )}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {expanded ? (
              <p className="border-t border-white/10 px-4 py-4 text-sm leading-relaxed whitespace-pre-line text-slate-400">
                {statement.description}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ProblemStatements({
  statements,
  loaded,
}: {
  statements: PublicProblemStatement[];
  loaded: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [openDomainId, setOpenDomainId] = useState<number | null>(null);
  const groups = groupByDomain(statements);
  const hasStatements = loaded && groups.length > 0;
  const openGroup = groups.find((group) => group.domainId === openDomainId) ?? null;

  return (
    <section id="problems" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Problem Statements"
          title={
            hasStatements ? (
              <>
                Pick your <span className="text-gradient">problem</span>
              </>
            ) : (
              <>
                The challenges are{" "}
                <span className="text-gradient">coming soon</span>
              </>
            )
          }
          subtitle={
            hasStatements
              ? "Tap a domain to see its problem statements."
              : "Detailed problem statements across all domains will be revealed soon."
          }
        />

        <div
          ref={ref}
          className={cn("reveal mt-12", inView && "reveal-visible", !hasStatements && "mx-auto max-w-3xl")}
        >
          {!hasStatements ? (
            <ComingSoon />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group, i) => (
                <button
                  key={group.domainId}
                  type="button"
                  onClick={() => setOpenDomainId(group.domainId)}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-purple-400/40 hover:bg-white/[0.07] hover:shadow-[0_20px_60px_rgba(91,33,182,0.18)]"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-purple-600/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 text-purple-100 ring-1 ring-purple-400/30 transition group-hover:from-purple-600 group-hover:to-blue-600 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                        <path d="M9 12h6m-6 4h6M9 8h1M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-snug text-white sm:text-base">
                        {group.domainName}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {group.statements.length} problem{group.statements.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <span className="pointer-events-none absolute bottom-3 right-4 text-3xl font-black text-white/5 transition group-hover:text-white/10">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {openGroup ? (
        <Modal title={openGroup.domainName} onClose={() => setOpenDomainId(null)}>
          <DomainStatementList key={openGroup.domainId} group={openGroup} />
        </Modal>
      ) : null}
    </section>
  );
}
