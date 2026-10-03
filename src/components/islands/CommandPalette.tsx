import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { filterItems, PALETTE_OPEN_EVENT, type PaletteItem } from "@/lib/palette";
import { toggleTheme } from "@/lib/theme";

interface Props {
  items: PaletteItem[];
  email: string;
}

declare global {
  interface Window {
    /** Set by the header button if it is clicked before this island hydrates. */
    __paletteRequested?: boolean;
  }
}

/**
 * Ctrl/⌘+K command palette. Uses a native <dialog> for focus trapping, Escape
 * handling and inert background; the list follows the ARIA combobox pattern.
 */
export default function CommandPalette({ items, email }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState("");

  const results = useMemo(() => filterItems(items, query), [items, query]);

  const open = useCallback(() => {
    const el = dialog.current;
    if (!el || el.open) return;
    setQuery("");
    setActive(0);
    setNotice("");
    el.showModal();
    input.current?.focus();
  }, []);

  const close = useCallback(() => dialog.current?.close(), []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) close();
        else open();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener(PALETTE_OPEN_EVENT, open);
    if (window.__paletteRequested) {
      window.__paletteRequested = false;
      open();
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener(PALETTE_OPEN_EVENT, open);
    };
  }, [open, close]);

  // Keep the active option in view.
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const activate = async (item: PaletteItem | undefined) => {
    if (!item) return;
    if (item.action === "toggle-theme") {
      toggleTheme();
      close();
      return;
    }
    if (item.action === "copy-email") {
      try {
        await navigator.clipboard.writeText(email);
        setNotice(`Copied ${email}`);
      } catch {
        setNotice(email);
      }
      return;
    }
    if (item.href) {
      close();
      if (item.href.startsWith("/#") && window.location.pathname === "/") {
        const target = document.querySelector(item.href.slice(1));
        target?.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", item.href.slice(1));
      } else {
        window.location.assign(item.href);
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      void activate(results[active]);
    }
  };

  let lastGroup: string | null = null;

  return (
    <dialog
      ref={dialog}
      aria-label="Command palette"
      className="m-0 mx-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-md border border-line-strong bg-panel p-0 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === dialog.current) close();
      }}
    >
      <div className="flex items-center gap-2 border-b border-line px-4">
        <span className="font-mono text-sm text-ok" aria-hidden="true">
          ›
        </span>
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setNotice("");
          }}
          onKeyDown={onKeyDown}
          placeholder="Jump to a section, project or action…"
          className="h-12 min-w-0 flex-1 bg-transparent font-mono text-base text-text outline-none placeholder:text-muted sm:text-sm"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Search commands"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
          esc
        </kbd>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="Commands"
        className="max-h-[50vh] overflow-y-auto p-2"
      >
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">No matches for “{query}”</li>
        )}
        {results.map((item, i) => {
          const header = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <li key={item.id} role="presentation">
              {header && (
                <p
                  className="px-3 pt-2 pb-1 font-mono text-[10px] tracking-widest text-muted uppercase"
                  aria-hidden="true"
                >
                  {header}
                </p>
              )}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerMove={() => setActive(i)}
                onClick={() => void activate(item)}
                className={`flex cursor-pointer items-baseline gap-3 rounded px-3 py-2 text-sm ${i === active ? "bg-panel-2 text-accent" : "text-text"}`}
              >
                <span className="truncate">{item.label}</span>
                {item.hint && (
                  <span className="ml-auto shrink-0 truncate font-mono text-xs text-muted">
                    {item.hint}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-4 border-t border-line px-4 py-2 font-mono text-[11px] text-muted">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span className="ml-auto text-ok" role="status">
          {notice}
        </span>
      </div>
    </dialog>
  );
}
