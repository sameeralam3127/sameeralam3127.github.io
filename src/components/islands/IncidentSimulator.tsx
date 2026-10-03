import { useEffect, useRef, useState } from "react";
import incidents from "@/data/incidents.json";
import { choose, currentNode, startRun, tally, type RunState } from "@/lib/incident/engine";
import type { Evidence, OutcomeResult, Scenario, Verdict } from "@/lib/incident/types";
import MetricChart from "./MetricChart";

const scenarios = incidents as Scenario[];

const verdictStyle: Record<Verdict, { label: string; icon: string; border: string; text: string }> =
  {
    good: { label: "Good call", icon: "✓", border: "border-ok/50", text: "text-ok" },
    neutral: {
      label: "Works, with a cost",
      icon: "~",
      border: "border-warn/50",
      text: "text-warn",
    },
    bad: { label: "Costly move", icon: "✗", border: "border-crit/50", text: "text-crit" },
  };

const outcomeStyle: Record<OutcomeResult, { label: string; className: string }> = {
  resolved: { label: "RESOLVED", className: "border-ok text-ok" },
  mitigated: { label: "MITIGATED", className: "border-warn text-warn" },
  escalated: { label: "ESCALATED", className: "border-crit text-crit" },
};

function EvidenceBlock({ evidence }: { evidence: Evidence }) {
  if (evidence.type === "metric") {
    return (
      <MetricChart
        title={evidence.title}
        unit={evidence.unit}
        series={evidence.series}
        range={evidence.range}
        threshold={evidence.threshold}
      />
    );
  }
  const header = evidence.type === "command" ? evidence.command : evidence.title;
  const lines = evidence.type === "command" ? evidence.output : evidence.lines;
  return (
    <div className="min-w-0 rounded border border-line bg-bg/40">
      <p
        className="truncate border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted"
        title={header}
      >
        {evidence.type === "command" && <span className="text-ok">$ </span>}
        {header}
      </p>
      <pre
        className="overflow-x-auto p-3 font-mono text-[11.5px] leading-relaxed text-text"
        tabIndex={0}
      >
        {lines.map((l, i) => (
          <span
            key={i}
            className={`block ${l.startsWith("+") ? "text-ok" : l.startsWith("-") ? "text-crit" : /emerg|failed|OOMKilled|expired|Evicted/i.test(l) ? "text-warn" : ""}`}
          >
            {l || " "}
          </span>
        ))}
      </pre>
    </div>
  );
}

export default function IncidentSimulator() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  // Move focus to the new step so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus({ preventScroll: true });
    const top = root.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) root.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [run]);

  const begin = (s: Scenario) => {
    moved.current = true;
    setScenario(s);
    setRun(startRun(s));
  };

  const reset = () => {
    moved.current = false;
    setScenario(null);
    setRun(null);
  };

  if (!scenario || !run) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scenarios.map((s) => (
          <div key={s.id} className="panel flex flex-col p-4 sm:p-5">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span
                className={`rounded border px-1.5 py-0.5 ${s.severity === "SEV1" ? "border-crit text-crit" : "border-warn text-warn"}`}
              >
                {s.severity}
              </span>
              <span className="truncate text-muted">{s.service}</span>
              <span className="ml-auto shrink-0 text-muted">{s.pagedAt}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold text-text">{s.title}</h3>
            <p className="mt-2 flex-1 font-mono text-xs leading-relaxed text-muted">
              <span className="text-warn">ALERT </span>
              {s.alert}
            </p>
            <button
              type="button"
              onClick={() => begin(s)}
              className="mt-4 self-start rounded-full bg-btn px-4 py-2 font-mono text-sm font-medium text-btn-ink hover:opacity-85"
            >
              acknowledge page →
            </button>
          </div>
        ))}
      </div>
    );
  }

  const node = currentNode(scenario, run);
  const lastStep = run.steps[run.steps.length - 1];
  const counts = tally(run);

  return (
    <div ref={root} className="panel scroll-mt-20 overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 font-mono text-xs sm:px-5">
        <span
          className={`rounded border px-1.5 py-0.5 ${scenario.severity === "SEV1" ? "border-crit text-crit" : "border-warn text-warn"}`}
        >
          {scenario.severity}
        </span>
        <span className="text-text">{scenario.service}</span>
        <span className="text-muted">paged {scenario.pagedAt}</span>
        <span className="text-muted">
          clock <span className="text-text">T+{run.elapsed}m</span>
        </span>
        <span className="text-muted">
          decisions <span className="text-text">{run.steps.length}</span>
        </span>
        <button
          type="button"
          onClick={reset}
          className="ml-auto text-muted underline-offset-2 hover:text-text hover:underline"
        >
          {node.outcome ? "back to scenarios" : "abandon"}
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {lastStep && (
          <div
            className={`mb-5 rounded border-l-2 bg-panel-2 px-3 py-2.5 text-sm ${verdictStyle[lastStep.choice.verdict].border}`}
            role="status"
          >
            <p className={`font-mono text-xs ${verdictStyle[lastStep.choice.verdict].text}`}>
              {verdictStyle[lastStep.choice.verdict].icon}{" "}
              {verdictStyle[lastStep.choice.verdict].label}
              <span className="text-muted"> · +{lastStep.choice.minutes}m</span>
            </p>
            <p className="mt-1 text-muted">{lastStep.choice.feedback}</p>
          </div>
        )}

        {node.outcome ? (
          <div>
            <p
              className={`inline-block rounded border px-2 py-0.5 font-mono text-xs ${outcomeStyle[node.outcome.result].className}`}
            >
              {outcomeStyle[node.outcome.result].label}
            </p>
            <h3
              ref={heading}
              tabIndex={-1}
              className="mt-3 text-xl font-semibold text-text outline-none"
            >
              {node.outcome.title}
            </h3>
            <p className="mt-2 max-w-3xl leading-relaxed text-muted">{node.outcome.summary}</p>

            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-4">
              <div className="flex flex-col-reverse justify-end bg-panel p-3">
                <dt className="mt-1 text-xs text-muted">time on the clock</dt>
                <dd className="font-mono text-xl font-semibold text-text">{run.elapsed}m</dd>
              </div>
              <div className="flex flex-col-reverse justify-end bg-panel p-3">
                <dt className="mt-1 text-xs text-muted">good calls</dt>
                <dd className="font-mono text-xl font-semibold text-text">{counts.good}</dd>
              </div>
              <div className="flex flex-col-reverse justify-end bg-panel p-3">
                <dt className="mt-1 text-xs text-muted">with a cost</dt>
                <dd className="font-mono text-xl font-semibold text-text">{counts.neutral}</dd>
              </div>
              <div className="flex flex-col-reverse justify-end bg-panel p-3">
                <dt className="mt-1 text-xs text-muted">costly moves</dt>
                <dd className="font-mono text-xl font-semibold text-text">{counts.bad}</dd>
              </div>
            </dl>

            <h4 className="mt-6 font-mono text-xs text-muted">what to take away</h4>
            <ul className="mt-2 space-y-2 text-sm">
              {node.outcome.lessons.map((lesson) => (
                <li key={lesson} className="flex gap-2">
                  <span className="font-mono text-accent" aria-hidden="true">
                    ›
                  </span>
                  <span className="text-text">{lesson}</span>
                </li>
              ))}
            </ul>

            <h4 className="mt-6 font-mono text-xs text-muted">your timeline</h4>
            <ol className="mt-2 space-y-1.5 border-l border-line pl-4 font-mono text-xs">
              {run.steps.map((step, i) => (
                <li key={i} className="text-muted">
                  <span className={verdictStyle[step.choice.verdict].text}>
                    {verdictStyle[step.choice.verdict].icon}
                  </span>{" "}
                  <span className="text-text">{step.choice.label}</span> · +{step.choice.minutes}m
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => begin(scenario)}
                className="rounded-full bg-btn px-4 py-2 font-mono text-sm font-medium text-btn-ink hover:opacity-85"
              >
                replay
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border-2 border-text px-4 py-1.5 font-mono text-sm text-text transition-colors hover:bg-panel-2"
              >
                another scenario
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3
              ref={heading}
              tabIndex={-1}
              className="text-xl font-semibold text-text outline-none"
            >
              {node.title}
            </h3>
            <p className="mt-2 max-w-3xl leading-relaxed text-muted">{node.narrative}</p>

            {node.evidence && node.evidence.length > 0 && (
              <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {node.evidence.map((e, i) => (
                  <EvidenceBlock key={`${run.nodeId}-${i}`} evidence={e} />
                ))}
              </div>
            )}

            <fieldset className="mt-6">
              <legend className="font-mono text-xs text-muted">what do you do?</legend>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {node.choices?.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      moved.current = true;
                      setRun(choose(scenario, run, c.id));
                    }}
                    className="group flex items-start gap-3 rounded border border-line bg-panel-2 px-3 py-2.5 text-left text-sm text-text transition-colors hover:border-accent"
                  >
                    <span
                      className="mt-px font-mono text-xs text-muted group-hover:text-accent"
                      aria-hidden="true"
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </div>
    </div>
  );
}
