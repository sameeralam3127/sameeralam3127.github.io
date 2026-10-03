/**
 * Architecture diagrams as data: an ordered list of stages, each holding one
 * or more nodes that run side by side. Rendered by ArchitectureDiagram.astro.
 */

export type NodeKind = "trigger" | "process" | "check" | "store" | "output" | "external";

export interface DiagramNode {
  id: string;
  label: string;
  /** Short mono caption under the label, e.g. a command or tool. */
  caption?: string | undefined;
  /** Shown in the detail pane when the node is selected. */
  detail: string;
  kind: NodeKind;
}

export interface DiagramStage {
  label: string;
  nodes: DiagramNode[];
}

export interface Diagram {
  id: string;
  title: string;
  stages: DiagramStage[];
}
