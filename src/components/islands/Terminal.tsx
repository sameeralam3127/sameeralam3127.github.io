import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { profile } from "@/data/profile";
import { complete, run, type Effect, type Line, type Tone } from "@/lib/terminal/commands";
import { setTheme, toggleTheme } from "@/lib/theme";

interface Entry {
  id: number;
  command: string | null;
  lines: Line[];
}

interface Props {
  /** Project slugs that have deep-dive pages. */
  deepDives: string[];
}

const CHIPS = [
  "whoami",
  "ls projects",
  "kubectl get skills",
  "cat resume",
  "ansible-playbook hire-me.yml",
  "help",
];

const toneClass: Record<Tone, string> = {
  default: "text-text",
  muted: "text-muted",
  accent: "text-accent",
  ok: "text-ok",
  warn: "text-warn",
  crit: "text-crit",
  info: "text-info",
};

const PROMPT_USER = profile.handle.replace(/\d+$/, "");

function Prompt() {
  return (
    <span aria-hidden="true">
      <span className="text-ok">{PROMPT_USER}</span>
      <span className="text-muted">@infra:~$</span>{" "}
    </span>
  );
}

function OutputLine({ line }: { line: Line }) {
  if (line.length === 0) return <div className="h-[1.6em]" />;
  return (
    <div className="break-words whitespace-pre-wrap">
      {line.map((seg, i) =>
        seg.href ? (
          <a
            key={i}
            href={seg.href}
            className={`${toneClass[seg.tone ?? "default"]} underline decoration-current/40 underline-offset-2 hover:decoration-current`}
            {...(seg.href.endsWith(".docx") || seg.href.endsWith(".pdf") ? { download: true } : {})}
          >
            {seg.text}
          </a>
        ) : (
          <span key={i} className={toneClass[seg.tone ?? "default"]}>
            {seg.text}
          </span>
        ),
      )}
    </div>
  );
}

export default function Terminal({ deepDives }: Props) {
  const inputId = useId();
  const [entries, setEntries] = useState<Entry[]>(() => [
    {
      id: 0,
      command: null,
      lines: [
        [
          { text: `Last login: ${profile.location} · type `, tone: "muted" },
          { text: "help", tone: "accent" },
          { text: " or tap a command below", tone: "muted" },
        ],
      ],
    },
    { id: 1, command: "whoami", lines: run("whoami", { profile, deepDives, history: [] }).lines },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hint, setHint] = useState<string[]>([]);
  const nextId = useRef(2);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  // Keep the newest output in view (skip the initial render so the page doesn't jump).
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const applyEffect = useCallback((effect: Effect | undefined) => {
    if (!effect) return;
    switch (effect.type) {
      case "clear":
        setEntries([]);
        break;
      case "theme":
        if (effect.theme === "toggle") toggleTheme();
        else setTheme(effect.theme);
        break;
      case "navigate":
        if (effect.href.startsWith("#")) {
          document.querySelector(effect.href)?.scrollIntoView({ behavior: "smooth" });
          window.history.replaceState(null, "", effect.href);
        } else {
          window.setTimeout(() => window.location.assign(effect.href), 400);
        }
        break;
    }
  }, []);

  const execute = useCallback(
    (command: string) => {
      const trimmed = command.trim();
      const nextHistory = trimmed ? [...history, trimmed] : history;
      const result = run(trimmed, { profile, deepDives, history: nextHistory });
      if (result.effect?.type !== "clear") {
        setEntries((prev) => [
          ...prev,
          { id: nextId.current++, command: trimmed, lines: result.lines },
        ]);
      }
      setHistory(nextHistory);
      setCursor(null);
      setInput("");
      setHint([]);
      applyEffect(result.effect);
    },
    [applyEffect, deepDives, history],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      execute(input);
    } else if (event.key === "Tab" && input.trim() !== "") {
      // Only capture Tab when there is something to complete, so keyboard
      // users can still Tab out of an empty prompt.
      const result = complete(input, { profile, deepDives, history });
      if (result.value !== input || result.options.length > 0) {
        event.preventDefault();
        setInput(result.value);
        setHint(result.options);
      }
    } else if (event.key === "ArrowUp") {
      if (history.length === 0) return;
      event.preventDefault();
      const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setInput(history[next] ?? "");
    } else if (event.key === "ArrowDown") {
      if (cursor === null) return;
      event.preventDefault();
      const next = cursor + 1;
      if (next >= history.length) {
        setCursor(null);
        setInput("");
      } else {
        setCursor(next);
        setInput(history[next] ?? "");
      }
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setEntries([]);
    } else if (event.key === "c" && event.ctrlKey && !window.getSelection()?.toString()) {
      event.preventDefault();
      setEntries((prev) => [...prev, { id: nextId.current++, command: `${input}^C`, lines: [] }]);
      setInput("");
      setHint([]);
    }
  };

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="panel-title">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-crit/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-ok/80" />
        </span>
        <span className="truncate">~/{PROMPT_USER} — zsh</span>
        <span className="ml-auto hidden sm:inline">interactive</span>
      </div>

      {/* Clicking the output focuses the prompt (a mouse convenience); keyboard
          users reach the input directly with Tab. */}
      {/* eslint-disable-next-line jsx-a11y-x/click-events-have-key-events, jsx-a11y-x/no-static-element-interactions */}
      <div
        ref={scroller}
        className="h-72 overflow-y-auto p-4 font-mono text-[13px] leading-[1.6] sm:h-80 sm:p-5"
        onClick={() => {
          if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <div role="log" aria-live="polite" aria-label="Terminal output">
          {entries.map((entry) => (
            <div key={entry.id} className="mb-2">
              {entry.command !== null && (
                <div className="break-words whitespace-pre-wrap">
                  <Prompt />
                  <span className="text-text">{entry.command}</span>
                </div>
              )}
              {entry.lines.map((line, i) => (
                <OutputLine key={i} line={line} />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-baseline">
          <label htmlFor={inputId} className="shrink-0 whitespace-pre">
            <Prompt />
            <span className="sr-only">Terminal command</span>
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHint([]);
            }}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent font-mono text-base text-text caret-accent outline-none sm:text-[13px]"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-describedby={`${inputId}-hint`}
          />
        </div>
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted" aria-live="polite">
          {hint.length > 0 ? hint.join("   ") : ""}
        </p>
      </div>

      <div className="border-t border-line p-3">
        <p className="sr-only">Quick commands</p>
        <ul className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <li key={chip}>
              <button
                type="button"
                onClick={() => execute(chip)}
                className="rounded border border-line bg-panel-2 px-2 py-1 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {chip}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
