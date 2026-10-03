/**
 * Pure state machine for the incident simulator. The React island only
 * renders state and calls `choose`; all rules live here so they are testable.
 */
import type { Choice, IncidentNode, Scenario, Verdict } from "./types";

export interface Step {
  from: string;
  choice: Choice;
}

export interface RunState {
  scenarioId: string;
  nodeId: string;
  /** Minutes elapsed on the incident clock. */
  elapsed: number;
  steps: Step[];
}

export const startRun = (scenario: Scenario): RunState => ({
  scenarioId: scenario.id,
  nodeId: scenario.start,
  elapsed: 0,
  steps: [],
});

export const currentNode = (scenario: Scenario, state: RunState): IncidentNode => {
  const node = scenario.nodes[state.nodeId];
  if (!node) throw new Error(`Scenario ${scenario.id} has no node "${state.nodeId}"`);
  return node;
};

export const isFinished = (scenario: Scenario, state: RunState): boolean =>
  Boolean(currentNode(scenario, state).outcome);

export function choose(scenario: Scenario, state: RunState, choiceId: string): RunState {
  const node = currentNode(scenario, state);
  const choice = node.choices?.find((c) => c.id === choiceId);
  if (!choice) throw new Error(`Node "${state.nodeId}" has no choice "${choiceId}"`);
  return {
    ...state,
    nodeId: choice.next,
    elapsed: state.elapsed + choice.minutes,
    steps: [...state.steps, { from: state.nodeId, choice }],
  };
}

export const tally = (state: RunState): Record<Verdict, number> => {
  const counts: Record<Verdict, number> = { good: 0, neutral: 0, bad: 0 };
  for (const step of state.steps) counts[step.choice.verdict]++;
  return counts;
};

/**
 * Structural checks for a scenario: every `next` points at a real node, every
 * non-terminal node has choices, and at least one "resolved" ending is
 * reachable from the start. Returns a list of problems (empty when valid).
 */
export function validateScenario(scenario: Scenario): string[] {
  const problems: string[] = [];
  const ids = new Set(Object.keys(scenario.nodes));
  if (!ids.has(scenario.start)) problems.push(`start node "${scenario.start}" is missing`);

  for (const [id, node] of Object.entries(scenario.nodes)) {
    if (node.outcome && node.choices?.length)
      problems.push(`"${id}" has both an outcome and choices`);
    if (!node.outcome && !node.choices?.length) problems.push(`"${id}" is a dead end`);
    for (const choice of node.choices ?? []) {
      if (!ids.has(choice.next)) problems.push(`"${id}" → "${choice.next}" does not exist`);
    }
  }

  // Breadth-first search from the start for a resolved ending.
  const seen = new Set<string>();
  const queue = [scenario.start];
  let resolvable = false;
  while (queue.length) {
    const id = queue.shift() ?? "";
    if (seen.has(id)) continue;
    seen.add(id);
    const node = scenario.nodes[id];
    if (!node) continue;
    if (node.outcome?.result === "resolved") resolvable = true;
    for (const choice of node.choices ?? []) queue.push(choice.next);
  }
  if (!resolvable) problems.push("no resolved ending is reachable");
  for (const id of ids) if (!seen.has(id)) problems.push(`"${id}" is unreachable`);

  return problems;
}
