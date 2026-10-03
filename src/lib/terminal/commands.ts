/**
 * The portfolio shell: a pure command interpreter. No DOM, no React — it maps
 * an input line to output lines plus an optional side effect, so it can be
 * unit-tested and reused (the command palette can run commands too).
 */
import type { Profile } from "@/data/profile";

export type Tone = "default" | "muted" | "accent" | "ok" | "warn" | "crit" | "info";

export interface Segment {
  text: string;
  tone?: Tone;
  href?: string;
}

export type Line = Segment[];

export type Effect =
  | { type: "clear" }
  | { type: "navigate"; href: string }
  | { type: "theme"; theme: "light" | "dark" | "toggle" };

export interface CommandResult {
  lines: Line[];
  effect?: Effect;
}

export interface ShellContext {
  profile: Profile;
  /** Project slugs that have a deep-dive page at /projects/<slug>/. */
  deepDives: string[];
  history: string[];
}

interface Command {
  name: string;
  summary: string;
  /** Shown in `help` and used for argument completion. */
  args?: (ctx: ShellContext) => string[];
  hidden?: boolean;
  run: (args: string[], ctx: ShellContext) => CommandResult;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const t = (text: string, tone?: Tone, href?: string): Segment => ({
  text,
  ...(tone ? { tone } : {}),
  ...(href ? { href } : {}),
});
const line = (...segments: (Segment | string)[]): Line =>
  segments.map((s) => (typeof s === "string" ? t(s) : s));
const blank: Line = [];
const out = (...lines: Line[]): CommandResult => ({ lines });

const pad = (text: string, width: number) => text.padEnd(width, " ");

const findProject = (ctx: ShellContext, query: string) => {
  const q = query.toLowerCase().replace(/\/$/, "");
  return ctx.profile.projects.find((p) => p.slug === q || p.name.toLowerCase() === q);
};

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

const commands: Command[] = [
  {
    name: "help",
    summary: "list available commands",
    run: () => {
      const visible = commands.filter((c) => !c.hidden);
      const width = Math.max(...visible.map((c) => c.name.length)) + 2;
      return out(
        line(t("available commands", "muted")),
        ...visible.map((c) => line(t(pad(c.name, width), "accent"), c.summary)),
        blank,
        line(t("tab completes · ↑/↓ history · ctrl+l clears", "muted")),
      );
    },
  },
  {
    name: "whoami",
    summary: "who is this?",
    run: (_, { profile }) =>
      out(
        line(t(profile.name, "accent"), " — ", profile.title),
        line(t(profile.headline, "muted")),
        line(t(`${profile.location} · ${profile.yearsExperience} years in production`, "muted")),
      ),
  },
  {
    name: "ls",
    summary: "list projects or skills (ls projects)",
    args: () => ["projects", "skills"],
    run: (args, ctx) => {
      const target = (args[0] ?? "").replace(/\/$/, "").replace(/^~\//, "");
      if (target === "" || target === "~") {
        return out(
          line(
            t("projects/", "info"),
            "  ",
            t("skills/", "info"),
            "  ",
            t("resume.docx", "default"),
          ),
        );
      }
      if (target === "projects") {
        const width = Math.max(...ctx.profile.projects.map((p) => p.slug.length)) + 2;
        return out(
          ...ctx.profile.projects
            .filter((p) => p.featured)
            .map((p) =>
              line(
                t(pad(`${p.slug}/`, width + 1), "info"),
                t(pad(p.statusNote ?? p.status, 20), p.status === "in-progress" ? "warn" : "ok"),
                t(p.tagline, "muted"),
              ),
            ),
          blank,
          line(t("open <project> for the deep dive", "muted")),
        );
      }
      if (target === "skills") return run("kubectl get skills", ctx);
      return out(line(t(`ls: ${args[0]}: No such file or directory`, "crit")));
    },
  },
  {
    name: "kubectl",
    summary: "kubectl get skills | projects",
    args: () => ["get skills", "get projects"],
    run: (args, ctx) => {
      const [verb, resource] = args;
      if (verb !== "get") {
        return out(
          line(t(`error: unknown command "${verb ?? ""}" — try: kubectl get skills`, "crit")),
        );
      }
      if (resource === "skills" || resource === "skill") {
        const width = Math.max(...ctx.profile.skills.map((s) => s.id.length)) + 3;
        return out(
          line(
            t(pad("NAMESPACE", width), "muted"),
            t(pad("READY", 8), "muted"),
            t("SKILLS", "muted"),
          ),
          ...ctx.profile.skills.map((s) =>
            line(
              t(pad(s.id, width), "info"),
              t(pad(`${s.items.length}/${s.items.length}`, 8), "ok"),
              s.items.join(", "),
            ),
          ),
        );
      }
      if (resource === "projects" || resource === "pods") {
        const featured = ctx.profile.projects.filter((p) => p.featured);
        const width = Math.max(...featured.map((p) => p.slug.length)) + 3;
        return out(
          line(t(pad("NAME", width), "muted"), t(pad("STATUS", 14), "muted"), t("STACK", "muted")),
          ...featured.map((p) =>
            line(
              t(pad(p.slug, width), "info"),
              t(
                pad(
                  p.status === "in-progress"
                    ? "Progressing"
                    : p.status === "rebuilding"
                      ? "Rebuilding"
                      : "Running",
                  14,
                ),
                p.status === "active" || p.status === "stable" ? "ok" : "warn",
              ),
              t(p.stack.slice(0, 3).join(", "), "muted"),
            ),
          ),
        );
      }
      return out(
        line(t(`error: the server doesn't have a resource type "${resource ?? ""}"`, "crit")),
      );
    },
  },
  {
    name: "cat",
    summary: "cat resume | principles | contact",
    args: () => ["resume", "principles", "contact"],
    run: (args, ctx) => {
      const file = (args[0] ?? "").replace(/\.(md|txt|docx)$/, "");
      const { profile } = ctx;
      if (file === "resume") {
        const lines: Line[] = [
          line(t(`# ${profile.name} — ${profile.title}`, "accent")),
          ...profile.summary.map((p) => line(t(p, "muted"))),
          blank,
          line(t("## experience", "accent")),
          ...profile.experience.map((r) =>
            line(
              t(pad(`${r.start} → ${r.end ?? "present"}`, 22), "muted"),
              `${r.title}, `,
              t(r.company, "info"),
            ),
          ),
          blank,
          line(t("## focus", "accent")),
          line(profile.focus.join(" · ")),
          blank,
          line("download: ", t("resume.docx", "accent", profile.resume.docx)),
        ];
        if (profile.resume.pdf)
          lines.push(line("          ", t("resume.pdf", "accent", profile.resume.pdf)));
        return { lines };
      }
      if (file === "principles") {
        return out(
          ...profile.principles.map((p) =>
            line(t("✓ ", "ok"), t(pad(p.property, 14), "accent"), t(p.summary, "muted")),
          ),
        );
      }
      if (file === "contact") {
        return out(
          line(
            t(pad("email", 18), "muted"),
            t(profile.contact.email, "accent", `mailto:${profile.contact.email}`),
          ),
          ...profile.contact.social.map((s) =>
            line(t(pad(s.label.toLowerCase(), 18), "muted"), t(s.handle, "accent", s.href)),
          ),
        );
      }
      if (!file) return out(line(t("usage: cat <resume|principles|contact>", "muted")));
      return out(line(t(`cat: ${args[0]}: No such file or directory`, "crit")));
    },
  },
  {
    name: "ansible-playbook",
    summary: "ansible-playbook hire-me.yml",
    args: () => ["hire-me.yml"],
    run: (args, { profile }) => {
      if (args[0] !== "hire-me.yml") {
        return out(
          line(t(`ERROR! the playbook: ${args[0] ?? ""} could not be found`, "crit")),
          line(t("try: ansible-playbook hire-me.yml", "muted")),
        );
      }
      const task = (name: string) => line(t(`TASK [${name}] `.padEnd(60, "*"), "default"));
      return out(
        line(t("PLAY [Bring Sameer onto the team] ".padEnd(60, "*"), "default")),
        blank,
        task("Gathering Facts"),
        line(t(`ok: [${profile.handle}]`, "ok")),
        blank,
        task("verify : experience"),
        line(t(`ok: [${profile.handle}] => years_in_production=${profile.yearsExperience}`, "ok")),
        blank,
        task("verify : skills"),
        line(
          t(
            `ok: [${profile.handle}] => namespaces=${profile.skills.length} focus="${profile.focus.slice(0, 4).join(", ")}…"`,
            "ok",
          ),
        ),
        blank,
        task("verify : principles"),
        line(
          t(
            `ok: [${profile.handle}] => ${profile.principles.map((p) => p.property).join(", ")}`,
            "ok",
          ),
        ),
        blank,
        task("contact : send email"),
        line(
          t(`changed: [${profile.handle}] => `, "warn"),
          t(profile.contact.email, "accent", `mailto:${profile.contact.email}`),
        ),
        blank,
        line(t("PLAY RECAP ".padEnd(60, "*"), "default")),
        line(
          t(pad(profile.handle, 18), "warn"),
          ": ",
          t("ok=4", "ok"),
          "  ",
          t("changed=1", "warn"),
          "  unreachable=0  ",
          t("failed=0", "ok"),
        ),
      );
    },
  },
  {
    name: "open",
    summary: "open <project> — read the deep dive",
    args: (ctx) => ctx.deepDives,
    run: (args, ctx) => {
      if (!args[0]) return out(line(t(`usage: open <${ctx.deepDives.join("|")}>`, "muted")));
      const project = findProject(ctx, args[0]);
      if (!project) return out(line(t(`open: ${args[0]}: no such project`, "crit")));
      if (ctx.deepDives.includes(project.slug)) {
        return {
          lines: [line(t(`opening /projects/${project.slug}/ …`, "muted"))],
          effect: { type: "navigate", href: `/projects/${project.slug}/` },
        };
      }
      if (project.repoPublic) {
        const href = `https://github.com/${project.repo}`;
        return {
          lines: [line(t(`no deep dive yet — opening ${href} …`, "muted"))],
          effect: { type: "navigate", href },
        };
      }
      return out(line(t(`${project.name}: deep dive coming soon (repository is private)`, "warn")));
    },
  },
  {
    name: "theme",
    summary: "theme [light|dark] — switch colour scheme",
    args: () => ["light", "dark"],
    run: (args) => {
      const choice = args[0];
      const theme = choice === "light" || choice === "dark" ? choice : "toggle";
      return {
        lines: [line(t(`theme → ${theme === "toggle" ? "toggled" : theme}`, "muted"))],
        effect: { type: "theme", theme },
      };
    },
  },
  {
    name: "incident",
    summary: "start the incident simulator",
    run: () => ({
      lines: [line(t("🔔 paging on-call… scrolling to the incident simulator", "warn"))],
      effect: { type: "navigate", href: "#incident" },
    }),
  },
  {
    name: "history",
    summary: "show command history",
    run: (_, ctx) =>
      out(
        ...(ctx.history.length
          ? ctx.history.map((h, i) => line(t(String(i + 1).padStart(4, " "), "muted"), "  ", h))
          : [line(t("no history yet", "muted"))]),
      ),
  },
  {
    name: "clear",
    summary: "clear the screen",
    run: () => ({ lines: [], effect: { type: "clear" } }),
  },
  // Hidden easter eggs and shell staples.
  {
    name: "pwd",
    summary: "",
    hidden: true,
    run: (_, { profile }) => out(line(`/home/${profile.handle.replace(/\d+$/, "")}`)),
  },
  { name: "date", summary: "", hidden: true, run: () => out(line(new Date().toUTCString())) },
  {
    name: "uptime",
    summary: "",
    hidden: true,
    run: (_, { profile }) =>
      out(
        line(
          `up ${profile.yearsExperience} years, load average: automation, reliability, security`,
        ),
      ),
  },
  { name: "echo", summary: "", hidden: true, run: (args) => out(line(args.join(" "))) },
  {
    name: "sudo",
    summary: "",
    hidden: true,
    run: () =>
      out(line(t("visitor is not in the sudoers file. This incident will be reported.", "crit"))),
  },
  {
    name: "exit",
    summary: "",
    hidden: true,
    run: () => out(line(t("there is no escape. try `help`.", "muted"))),
  },
  {
    name: "rm",
    summary: "",
    hidden: true,
    run: () =>
      out(line(t("rm: permission denied (this is a read-only filesystem, on purpose)", "crit"))),
  },
];

const byName = new Map(commands.map((c) => [c.name, c]));

/** Splits a command line on whitespace, honouring simple quotes. */
export const tokenize = (input: string): string[] =>
  [...input.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? "");

/** Runs one command line. Empty input yields no output. */
export function run(input: string, ctx: ShellContext): CommandResult {
  const [name, ...args] = tokenize(input.trim());
  if (!name) return { lines: [] };
  const command = byName.get(name.toLowerCase());
  if (!command) {
    return out(
      line(t(`zsh: command not found: ${name}`, "crit")),
      line(t("type `help` to see what this shell can do", "muted")),
    );
  }
  return command.run(args, ctx);
}

export const commandNames = (): string[] => commands.filter((c) => !c.hidden).map((c) => c.name);

export interface Completion {
  /** The input with the longest unambiguous completion applied. */
  value: string;
  /** All candidates when the completion is ambiguous. */
  options: string[];
}

/** Tab completion over command names and their known arguments. */
export function complete(input: string, ctx: ShellContext): Completion {
  const endsWithSpace = /\s$/.test(input);
  const tokens = tokenize(input);
  const current = endsWithSpace ? "" : (tokens.pop() ?? "");
  const head = tokens.join(" ");

  let candidates: string[];
  if (tokens.length === 0) {
    candidates = commandNames();
  } else {
    const command = byName.get(tokens[0]?.toLowerCase() ?? "");
    const argLine = [...tokens.slice(1), current].join(" ");
    // Complete multi-word argument patterns ("get skills") token by token.
    candidates = (command?.args?.(ctx) ?? [])
      .filter((a) => a.startsWith(argLine))
      .map((a) => a.split(" ")[tokens.length - 1] ?? "")
      .filter(Boolean);
  }

  const matches = [...new Set(candidates.filter((c) => c.startsWith(current)))];
  if (matches.length === 0) return { value: input, options: [] };

  const prefix = (s: string) => (head ? `${head} ${s}` : s);
  if (matches.length === 1) return { value: `${prefix(matches[0] ?? "")} `, options: [] };

  // Longest common prefix among the matches.
  let common = matches[0] ?? "";
  for (const m of matches) while (!m.startsWith(common)) common = common.slice(0, -1);
  return { value: common.length > current.length ? prefix(common) : input, options: matches };
}
