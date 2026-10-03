import { describe, expect, it } from "vitest";
import incidents from "@/data/incidents.json";
import {
  choose,
  currentNode,
  isFinished,
  startRun,
  tally,
  validateScenario,
} from "@/lib/incident/engine";
import type { Scenario } from "@/lib/incident/types";

const scenarios = incidents as Scenario[];

describe("incident scenarios (data)", () => {
  it("has at least two scenarios with unique ids", () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(2);
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
  });

  it.each(scenarios.map((s) => [s.id, s] as const))(
    "%s is a valid, resolvable graph",
    (_, scenario) => {
      expect(validateScenario(scenario)).toEqual([]);
    },
  );

  it.each(scenarios.map((s) => [s.id, s] as const))(
    "%s has unique choice ids per node and sane costs",
    (_, scenario) => {
      for (const node of Object.values(scenario.nodes)) {
        const ids = (node.choices ?? []).map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const choice of node.choices ?? []) expect(choice.minutes).toBeGreaterThan(0);
      }
    },
  );

  it.each(scenarios.map((s) => [s.id, s] as const))(
    "%s metric series match their evidence shape",
    (_, scenario) => {
      for (const node of Object.values(scenario.nodes)) {
        for (const e of node.evidence ?? []) {
          if (e.type !== "metric") continue;
          expect(e.series.length).toBeGreaterThan(1);
          expect(e.range[0]).toMatch(/^\d{2}:\d{2}$/);
          expect(e.range[1]).toMatch(/^\d{2}:\d{2}$/);
        }
      }
    },
  );
});

describe("incident engine", () => {
  const scenario = scenarios[0] as Scenario;

  it("starts at the start node with a zeroed clock", () => {
    const state = startRun(scenario);
    expect(state.nodeId).toBe(scenario.start);
    expect(state.elapsed).toBe(0);
    expect(isFinished(scenario, state)).toBe(false);
  });

  it("advances, charges time and records verdicts", () => {
    let state = startRun(scenario);
    const first = currentNode(scenario, state).choices?.[0];
    expect(first).toBeDefined();
    state = choose(scenario, state, first?.id ?? "");
    expect(state.nodeId).toBe(first?.next);
    expect(state.elapsed).toBe(first?.minutes);
    expect(tally(state)[first?.verdict ?? "good"]).toBe(1);
  });

  it("is immutable", () => {
    const state = startRun(scenario);
    const id = currentNode(scenario, state).choices?.[0]?.id ?? "";
    choose(scenario, state, id);
    expect(state.steps).toHaveLength(0);
  });

  it("rejects unknown choices", () => {
    expect(() => choose(scenario, startRun(scenario), "nope")).toThrow(/no choice/);
  });

  it("can always reach an ending by taking the first option", () => {
    for (const s of scenarios) {
      let state = startRun(s);
      for (let i = 0; i < 20 && !isFinished(s, state); i++) {
        const choice = currentNode(s, state).choices?.[0];
        state = choose(s, state, choice?.id ?? "");
      }
      expect(isFinished(s, state), s.id).toBe(true);
    }
  });
});

describe("validateScenario", () => {
  it("catches broken links and dead ends", () => {
    const broken: Scenario = {
      id: "broken",
      title: "",
      severity: "SEV2",
      service: "",
      alert: "",
      pagedAt: "00:00",
      start: "a",
      nodes: {
        a: {
          title: "",
          narrative: "",
          choices: [
            { id: "x", label: "", next: "missing", minutes: 1, verdict: "good", feedback: "" },
          ],
        },
        b: { title: "", narrative: "" },
      },
    };
    const problems = validateScenario(broken);
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining("does not exist"),
        expect.stringContaining("dead end"),
        expect.stringContaining("no resolved ending"),
        expect.stringContaining("unreachable"),
      ]),
    );
  });
});
