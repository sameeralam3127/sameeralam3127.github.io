---
problem: >-
  Most Kubernetes auto-remediation tools act first and explain later, if at all.
  Restarting a crash-looping pod can destroy the evidence needed to understand it,
  restart a bare pod nobody can recreate, or loop forever. On-call engineers need a
  tool that understands a failure before touching anything, and that is honest
  about what it did.
approach:
  - "Safety over automation: pods without a controller are never deleted, every action is budgeted with `--max-restarts`, and `--dry-run` is first-class."
  - "Explainability over magic: every action carries its evidence (restart count, exit code, termination reason, owner), and every skip carries its reason."
  - "Truthful reporting: a dry run is never counted as a remediation, and report counters reflect what actually happened."
  - "Detectors are pure functions over pod state with no API calls, so they are trivially testable. A shared `Finding` type is the contract between detection, remediation and reporting."
  - "Resilience: a transient API error degrades one scan, never the process; retries use capped exponential backoff."
outcome:
  - "`kuberescue diagnose` explains five failure classes (CrashLoopBackOff, OOMKilled, ImagePullBackOff, Pending/FailedScheduling and stuck rollouts) with the events behind each, entirely read-only."
  - "Versioned JSON reports (`schemaVersion: v1alpha1`) and CI-friendly exit codes: `0` clean, `1` error, `2` findings."
  - "Runs in-cluster with namespaced RBAC (a Role, no ClusterRole), a non-root distroless image and `--dry-run` on by default."
  - "Released as prebuilt binaries with checksums and a container image on GHCR. Next milestones: a policy gate, an operator with CRDs, and Prometheus metrics."
diagram:
  title: KubeRescue — evidence → action → report
  stages:
    - label: observe
      nodes:
        - id: scan
          label: Engine.Scan
          caption: monitor · --interval 30s
          kind: trigger
          detail: The engine lists pods in the target namespace (optionally filtered by a label selector) on each interval, or once with --once. It works with in-cluster config or a local kubeconfig.
    - label: detect
      nodes:
        - id: detector
          label: Detector.Detect(pod)
          caption: pure function
          kind: process
          detail: Detectors are pure functions over pod state with no API calls. They emit a Finding carrying the evidence (container, restart count, last termination reason, exit code and owning controller).
        - id: diagnose
          label: diagnose (read-only)
          caption: + events · explanation
          kind: check
          detail: kuberescue diagnose reuses the same detectors in a read-only path that never calls remediate. It adds Kubernetes events and a plain-language explanation for each finding.
    - label: act
      nodes:
        - id: remediate
          label: remediate.RestartPod
          caption: budgeted · dry-run aware
          kind: process
          detail: Only controller-managed pods are restarted, since bare pods are never deleted. Actions are capped by --max-restarts per scan, and with --dry-run nothing changes. Every outcome is recorded as restarted, dry-run, skipped or failed.
    - label: report
      nodes:
        - id: report
          label: Report
          caption: text · json v1alpha1
          kind: output
          detail: Human-readable text, or versioned JSON for automation. Reports go to stdout and structured logs to stderr. Exit code 2 signals findings, so it can gate a CI job.
---

## In practice

Preview what KubeRescue would do. This changes nothing:

```bash
kuberescue monitor -n default --once --dry-run
```

Scan once and remediate, restarting at most three pods:

```bash
kuberescue monitor -n default --once --max-restarts 3
```

Every finding carries its evidence, so the output explains the action:

```text
CrashLoopBackOff  default/api-7c8f9f6d9b-x2q4m
  container=api restarts=7 lastReason=OOMKilled exitCode=137 owner=ReplicaSet/api-7c8f9f6d9b
  action: restarted

Summary: detected=1 restarted=1 skipped=0 failed=0
```

`diagnose` only reads pods, Deployments and events, and explains what it finds:

```text
$ kuberescue diagnose -n default
OOMKilled  default/api-7c8f9f6d9b-x2q4m container=api owner=ReplicaSet/api-7c8f9f6d9b
  container "api" was killed for exceeding its memory limit; raise the limit or
  investigate a possible memory leak.
  event: BackOff x3 — Back-off restarting failed container api in pod ...

Summary: detected=1
```

For automation, the JSON report is versioned and its counters are truthful. A dry run counts as `dry-run`, never as `restarted`:

```json
{
  "schemaVersion": "v1alpha1",
  "namespace": "default",
  "dryRun": true,
  "detected": 1,
  "restarted": 0,
  "findings": [
    {
      "pod": "api-7c8f9f6d9b-x2q4m",
      "reason": "CrashLoopBackOff",
      "restartCount": 7,
      "lastTerminationReason": "OOMKilled",
      "lastExitCode": 137,
      "ownerKind": "ReplicaSet"
    }
  ],
  "actions": [{ "pod": "api-7c8f9f6d9b-x2q4m", "outcome": "dry-run" }]
}
```
