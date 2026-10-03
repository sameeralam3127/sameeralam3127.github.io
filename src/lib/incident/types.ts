/** Shape of `src/data/incidents.json`: branching, data-driven incident scenarios. */

export type Verdict = "good" | "neutral" | "bad";
export type OutcomeResult = "resolved" | "mitigated" | "escalated";

export type Evidence =
  | { type: "logs"; title: string; lines: string[] }
  | { type: "command"; command: string; output: string[] }
  | {
      type: "metric";
      title: string;
      unit: string;
      series: number[];
      /** Time labels for the first and last point, e.g. ["02:00", "02:14"]. */
      range: [string, string];
      threshold?: { value: number; label: string };
    };

export interface Choice {
  id: string;
  label: string;
  /** Node to move to. */
  next: string;
  /** Minutes this step costs on the incident clock. */
  minutes: number;
  verdict: Verdict;
  /** Why this was (or wasn't) a good call; shown after choosing. */
  feedback: string;
}

export interface Outcome {
  result: OutcomeResult;
  title: string;
  summary: string;
  lessons: string[];
}

export interface IncidentNode {
  title: string;
  narrative: string;
  evidence?: Evidence[];
  choices?: Choice[];
  /** Present on terminal nodes only. */
  outcome?: Outcome;
}

export interface Scenario {
  id: string;
  title: string;
  severity: "SEV1" | "SEV2";
  service: string;
  /** The page as it arrives, e.g. the alert summary. */
  alert: string;
  pagedAt: string;
  start: string;
  nodes: Record<string, IncidentNode>;
}
