/**
 * `npm audit` gate: fails on any high or critical advisory that isn't in
 * .audit-allowlist.json, and on allowlist entries that have expired.
 *
 *   node scripts/audit.ts
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.ts";

interface AllowEntry {
  id: string;
  package: string;
  reason: string;
  expires: string;
}

interface AuditVia {
  url?: string;
  title?: string;
  severity?: string;
}

interface AuditReport {
  vulnerabilities: Record<string, { severity: string; via: (AuditVia | string)[] }>;
}

const BLOCKING = new Set(["high", "critical"]);
const allowlist = (
  JSON.parse(readFileSync(join(ROOT, ".audit-allowlist.json"), "utf8")) as {
    advisories: AllowEntry[];
  }
).advisories;

// npm audit exits non-zero when it finds anything; the JSON is still on stdout.
let raw: string;
try {
  raw = execFileSync("npm", ["audit", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (error) {
  raw = (error as { stdout?: string }).stdout ?? "";
}
const report = JSON.parse(raw) as AuditReport;

const today = new Date().toISOString().slice(0, 10);
const problems: string[] = [];
const accepted: string[] = [];

for (const [pkg, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vuln.via) {
    if (typeof via === "string") continue; // Points at another vulnerable package; reported there.
    if (!BLOCKING.has(via.severity ?? vuln.severity)) continue;
    const id = via.url?.split("/").pop() ?? "unknown";
    const entry = allowlist.find((a) => a.id === id && a.package === pkg);
    if (!entry) {
      problems.push(`${pkg}: ${via.severity} ${id} — ${via.title ?? ""}`);
    } else if (entry.expires < today) {
      problems.push(`${pkg}: ${id} allowlist entry expired on ${entry.expires}; re-review it`);
    } else {
      accepted.push(`${pkg}: ${id} (accepted until ${entry.expires})`);
    }
  }
}

for (const line of accepted) console.log(`accepted  ${line}`);
if (problems.length > 0) {
  for (const line of problems) console.error(`BLOCKING  ${line}`);
  process.exit(1);
}
console.log("npm audit: no unaccepted high or critical advisories");
