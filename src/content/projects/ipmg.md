---
problem: >-
  Ping sweeps tell you what's up right now. The question people who look after a
  network actually have is "what changed since yesterday?": which host went
  offline, which address moved, whose latency jumped. Tools like `nmap -sn` and
  `fping` don't keep history or tell you what changed.
approach:
  - "Store every scan in a local SQLite history, shared by the CLI and the web UI, so any two scans can be compared."
  - "Classify every change by severity: a host going offline is `critical`; a new host, moved IP or changed status is `warning`; recovery, a renamed host or a latency shift is `info`."
  - "Report latency changes only when they clear both an absolute (5 ms) and a relative (25%) threshold, which keeps normal jitter out of reports."
  - "Make it automatable: exit codes for cron and CI, and notifications to Slack, Teams, a webhook or email filtered by severity."
  - "Expose results to existing observability: an optional Prometheus `/metrics` endpoint with bounded cardinality (host series carry only `source` and `ip`)."
outcome:
  - "Published on PyPI as `ipmg`. Parallel ping sweeps over IPs, CIDR blocks and ranges (IPv4 and IPv6), with reverse DNS."
  - "Change reports with severities, exportable as Markdown, JSON or CSV, plus Excel/CSV/JSON/Markdown scan reports."
  - "IPMG Web: a local dashboard that works offline, with a Changes view comparing any two scans."
  - "v3.0 is in progress."
diagram:
  title: IPMG — scan, store, compare, alert
  stages:
    - label: targets
      nodes:
        - id: targets
          label: targets
          caption: file · CIDR · --discover
          kind: trigger
          detail: IPs, CIDR blocks and ranges from a file or the command line, or --discover to scan the network you're on. IPv4 and IPv6 are supported.
    - label: scan
      nodes:
        - id: sweep
          label: parallel ping sweep
          caption: --threads · reverse DNS
          kind: process
          detail: One system ping per host, run in parallel with a bounded thread pool, plus reverse DNS for hostnames. Optional TCP connect checks on common ports.
    - label: store
      nodes:
        - id: history
          label: scan history
          caption: SQLite · ~/.ipmg/dashboard.db
          kind: store
          detail: Every scan is stored locally and shared by the CLI and IPMG Web, so any two scans can be compared later. By default, comparisons only use scans of the same target source.
    - label: compare
      nodes:
        - id: diff
          label: ipmg diff
          caption: critical · warning · info
          kind: check
          detail: Compares two scans and classifies every change by severity. Latency changes must clear both an absolute and a relative threshold to count.
    - label: deliver
      nodes:
        - id: reports
          label: reports
          caption: xlsx · csv · json · md
          kind: output
          detail: Scan reports and change summaries in Excel, CSV, JSON and Markdown that you can hand to someone.
        - id: alerts
          label: alerts & metrics
          caption: slack · teams · webhook · /metrics
          kind: output
          detail: Notifications for changes at or above --notify-severity, and an optional Prometheus endpoint so results land in existing dashboards and alert rules.
---

## In practice

```bash
pip install ipmg
ipmg --discover             # scan the network you are on, right now
ipmg --discover --compare   # later: scan again and see what changed
```

Compare any two stored scans. `--fail-on-change` turns it into a CI or cron gate:

```bash
ipmg --input targets.txt --compare    # compare with the previous scan
ipmg diff 12 14                       # compare two specific scans
ipmg diff --fail-on-change            # exit 2 when anything changed (CI)
```

Only send the changes that matter:

```bash
ipmg --input targets.txt --interval 15 --notify-slack
ipmg diff --notify-webhook https://ops.example.com/ipmg --notify-severity critical
```

Results can feed the Prometheus and alerting setup you already have:

```yaml
# an alert rule: a host that stopped answering
groups:
  - name: ipmg
    rules:
      - alert: HostDown
        expr: ipmg_host_up == 0
        for: 10m
        annotations:
          summary: "{{ $labels.ip }} ({{ $labels.source }}) is not answering ping"
```
