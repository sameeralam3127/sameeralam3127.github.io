---
problem: >-
  Checking the health of a mixed Linux fleet (RHEL, Ubuntu, Fedora, SUSE) usually
  means a monitoring agent on every host, or a pile of per-distro scripts. Before
  and after a patch window you need to know which hosts need a reboot, which
  services failed and what regressed, and you need it as something you can attach
  to a change ticket.
approach:
  - "Agentless: everything runs over SSH from an Ansible control node, and nothing is installed on managed hosts."
  - "Read-only by default. Remediation is opt-in and bounded: exactly one restart per service that is enabled at boot and in a failed state."
  - "Four composable roles sharing one `linux_vitals_*` namespace: scan, heal, certs and report. Run them together or individually in your own playbooks."
  - "Every finding has a severity (`info`, `warning`, `critical`) and a stable `id`, and each host rolls up to its worst finding."
  - "Paths resolve from the inventory directory, so the same command works whether the collection came from Galaxy or a clone."
outcome:
  - "Published on Ansible Galaxy as `sameeralam3127.linux_vitals`."
  - "Tested on Ubuntu, Debian, Rocky, Fedora, Amazon Linux and openSUSE."
  - "One self-contained HTML dashboard per run (no CDN, no server) plus a JSON report (schema 2.0) and optional Slack, email or webhook summaries."
  - "Baseline/postcheck comparison for maintenance windows, with Regressed, Improved and New filters per host."
  - "Optional TLS checks catch expiring certificates, weak signatures and served-vs-on-disk mismatches."
diagram:
  title: LinuxVitals — agentless fleet health check
  stages:
    - label: control node
      nodes:
        - id: playbook
          label: healthcheck.yml
          caption: ansible-playbook
          kind: trigger
          detail: One playbook from the collection runs every role against the linux_servers inventory group. Every task is tagged, so you can run a slice, such as only kernel and reporting checks.
    - label: fleet
      nodes:
        - id: fleet
          label: managed hosts
          caption: SSH · agentless
          kind: external
          detail: Ubuntu/Debian (apt, reboot-required file), RHEL/Rocky/Alma and Fedora (dnf, needs-restarting) and openSUSE/SLES (zypper, needs-rebooting). Nothing is installed on targets.
    - label: scan
      nodes:
        - id: scan
          label: vitals_scan
          caption: read-only
          kind: check
          detail: Collects facts, services, memory, journal errors, running vs installed kernel, bootloader default, boot space and security state (SELinux, AppArmor, failed logins).
    - label: opt-in
      nodes:
        - id: heal
          label: vitals_heal
          caption: off by default
          kind: process
          detail: When enabled, attempts exactly one restart for each unit that is enabled at boot and failed, then re-checks required services so the dashboard shows the post-restart result.
        - id: certs
          label: vitals_certs
          caption: off by default
          kind: check
          detail: TLS expiry, weak signatures, obsolete TLS versions and mismatches between the certificate served and the one on disk.
    - label: report
      nodes:
        - id: report
          label: vitals_report
          caption: snapshot · compare · render
          kind: output
          detail: Renders a self-contained HTML dashboard and a schema 2.0 JSON report, compares against a baseline snapshot when given a maintenance id, and sends optional Slack, email or webhook summaries.
---

## In practice

Install from Galaxy and run against any inventory with a `linux_servers` group:

```bash
ansible-galaxy collection install sameeralam3127.linux_vitals
ansible-playbook -i inventory.ini sameeralam3127.linux_vitals.healthcheck
```

```ini
[linux_servers]
rhel01   ansible_host=192.0.2.10
ubuntu01 ansible_host=192.0.2.11

[linux_servers:vars]
ansible_user=automation
ansible_become=true
```

Self-healing is off until you opt in, and then it's deliberately narrow:

```yaml
linux_vitals_heal_enabled: true
```

For a patch window, run the baseline before and the postcheck after with the same maintenance id. The postcheck dashboard then shows what regressed:

```bash
MAINT_ID="$(date +%Y-%m-%d)-patch-window"

ansible-playbook -i inventory.ini sameeralam3127.linux_vitals.baseline \
  -e linux_vitals_maintenance_id="$MAINT_ID"

# ... do your maintenance ...

ansible-playbook -i inventory.ini sameeralam3127.linux_vitals.postcheck \
  -e linux_vitals_maintenance_id="$MAINT_ID"
```

Every task is tagged, so a focused run is cheap:

```bash
ansible-playbook -i inventory.ini playbooks/healthcheck.yml --tags kernel,reporting
```
