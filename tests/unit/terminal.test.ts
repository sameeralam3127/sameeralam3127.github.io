import { describe, expect, it } from "vitest";
import { profile } from "@/data/profile";
import { commandNames, complete, run, tokenize, type ShellContext } from "@/lib/terminal/commands";

const ctx: ShellContext = {
  profile,
  deepDives: ["kuberescue", "linuxvitals", "ipmg"],
  history: [],
};

const text = (input: string) =>
  run(input, ctx)
    .lines.map((line) => line.map((s) => s.text).join(""))
    .join("\n");

describe("terminal commands", () => {
  it("supports every command from the brief", () => {
    for (const command of [
      "whoami",
      "ls projects",
      "kubectl get skills",
      "cat resume",
      "ansible-playbook hire-me.yml",
      "help",
    ]) {
      expect(text(command), command).not.toContain("command not found");
    }
  });

  it("whoami prints the public title", () => {
    expect(text("whoami")).toContain(profile.title);
  });

  it("help lists every visible command", () => {
    const help = text("help");
    for (const name of commandNames()) expect(help).toContain(name);
  });

  it("ls projects lists every featured project", () => {
    const output = text("ls projects");
    for (const p of profile.projects.filter((p) => p.featured)) expect(output).toContain(p.slug);
  });

  it("kubectl get skills prints one row per skill group", () => {
    const output = text("kubectl get skills");
    for (const group of profile.skills) expect(output).toContain(group.id);
  });

  it("cat resume links the resume download", () => {
    const links = run("cat resume", ctx)
      .lines.flat()
      .filter((s) => s.href);
    expect(links.map((l) => l.href)).toContain(profile.resume.docx);
  });

  it("ansible-playbook ends with a clean recap", () => {
    expect(text("ansible-playbook hire-me.yml")).toMatch(/failed=0/);
    expect(text("ansible-playbook site.yml")).toContain("could not be found");
  });

  it("reports unknown commands like a shell", () => {
    expect(text("rm -rf /")).toContain("permission denied");
    expect(text("frobnicate")).toContain("command not found: frobnicate");
  });

  it("produces effects instead of touching the DOM", () => {
    expect(run("clear", ctx).effect).toEqual({ type: "clear" });
    expect(run("theme light", ctx).effect).toEqual({ type: "theme", theme: "light" });
    expect(run("theme", ctx).effect).toEqual({ type: "theme", theme: "toggle" });
    expect(run("theme system", ctx).effect).toEqual({ type: "theme", theme: "system" });
    expect(run("open kuberescue", ctx).effect).toEqual({
      type: "navigate",
      href: "/projects/kuberescue/",
    });
  });

  it("does not navigate to private repositories", () => {
    const privateProject = profile.projects.find(
      (p) => p.featured && !p.repoPublic && !ctx.deepDives.includes(p.slug),
    );
    if (!privateProject) return;
    expect(run(`open ${privateProject.slug}`, ctx).effect).toBeUndefined();
  });

  it("ignores blank input", () => {
    expect(run("   ", ctx)).toEqual({ lines: [] });
  });
});

describe("tokenize", () => {
  it("splits on whitespace and honours quotes", () => {
    expect(tokenize(`echo "hello world" 'a b' c`)).toEqual(["echo", "hello world", "a b", "c"]);
  });
});

describe("tab completion", () => {
  it.each([
    ["k", "kubectl "],
    ["kubectl g", "kubectl get "],
    ["kubectl get s", "kubectl get skills "],
    ["ls p", "ls projects "],
    ["cat r", "cat resume "],
    ["ansible-playbook h", "ansible-playbook hire-me.yml "],
    ["open k", "open kuberescue "],
  ])("%s → %s", (input, expected) => {
    expect(complete(input, ctx).value).toBe(expected);
  });

  it("offers options when ambiguous", () => {
    const result = complete("c", ctx);
    expect(result.value).toBe("c");
    expect(result.options).toEqual(expect.arrayContaining(["cat", "clear"]));
  });

  it("leaves unknown input unchanged", () => {
    expect(complete("zzz", ctx)).toEqual({ value: "zzz", options: [] });
  });
});
