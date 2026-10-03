import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

interface Props {
  title: string;
  unit: string;
  series: number[];
  range: [string, string];
  threshold?: { value: number; label: string } | undefined;
}

const HEIGHT = 112;

/** "01:50" → minutes since midnight. */
const toMinutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toClock = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Single-series line chart for incident evidence: 2px line, 10% area wash,
 * threshold annotation, crosshair + tooltip on hover, arrow keys to read
 * points, and a text summary for screen readers.
 */
export default function MetricChart({ title, unit, series, range, threshold }: Props) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const top = Math.max(...series, threshold?.value ?? 0) * 1.15 || 1;
  const n = series.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => (1 - v / top) * 100;
  const line = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const area = `${line} L100,100 L0,100 Z`;

  const [start, end] = range.map(toMinutes) as [number, number];
  const timeAt = (i: number) => toClock(start + ((end - start) * i) / Math.max(1, n - 1));
  const last = series[n - 1] ?? 0;

  const onPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    setActive(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))));
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? n - 1;
    const next =
      event.key === "ArrowLeft" ? current - 1 : event.key === "ArrowRight" ? current + 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActive(Math.min(n - 1, Math.max(0, next)));
  };

  const activeValue = active === null ? undefined : series[active];
  const point = active !== null && activeValue !== undefined ? { i: active, v: activeValue } : null;

  return (
    <figure className="rounded border border-line bg-bg/40 p-3">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3 font-mono text-xs">
        <span className="text-muted">{title}</span>
        <span className="text-text">
          now {fmt(last)}
          {unit}
        </span>
      </figcaption>

      <div
        ref={box}
        className="relative outline-offset-2"
        style={{ height: HEIGHT }}
        tabIndex={0}
        role="img"
        aria-roledescription="line chart"
        aria-describedby={`${id}-summary`}
        onPointerMove={onPointer}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKey}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <line
            x1="0"
            x2="100"
            y1="100"
            y2="100"
            stroke="var(--c-line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {threshold && (
            <line
              x1="0"
              x2="100"
              y1={y(threshold.value)}
              y2={y(threshold.value)}
              stroke="var(--c-crit)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path d={area} fill="var(--c-accent)" fillOpacity="0.1" />
          <path
            d={line}
            fill="none"
            stroke="var(--c-accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {threshold && (
          <span
            className="absolute right-0 -translate-y-full pb-0.5 font-mono text-[10px] text-muted"
            style={{ top: `${y(threshold.value)}%` }}
            aria-hidden="true"
          >
            <span className="mr-1 inline-block h-px w-2.5 bg-crit align-middle" />
            {threshold.label}
          </span>
        )}

        {/* End dot with a surface ring */}
        <span
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-panel"
          style={{ left: `${x(n - 1)}%`, top: `${y(last)}%` }}
          aria-hidden="true"
        />

        {point && (
          <>
            <span
              className="pointer-events-none absolute inset-y-0 w-px bg-line-strong"
              style={{ left: `${x(point.i)}%` }}
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-panel"
              style={{ left: `${x(point.i)}%`, top: `${y(point.v)}%` }}
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute -top-1 z-10 rounded border border-line-strong bg-panel-2 px-2 py-1 font-mono text-[11px] whitespace-nowrap shadow-lg"
              style={{
                left: `${x(point.i)}%`,
                transform: `translate(${point.i > n / 2 ? "-100%" : "0"}, -100%)`,
              }}
              role="status"
            >
              <strong className="text-text">
                {fmt(point.v)}
                {unit}
              </strong>{" "}
              <span className="text-muted">at {timeAt(point.i)}</span>
            </span>
          </>
        )}
      </div>

      <div
        className="mt-1.5 flex justify-between font-mono text-[10px] text-muted"
        aria-hidden="true"
      >
        <span>{range[0]}</span>
        <span>{range[1]}</span>
      </div>
      <p id={`${id}-summary`} className="sr-only">
        {title} from {range[0]} to {range[1]}: started at {fmt(series[0] ?? 0)}
        {unit}, peaked at {fmt(Math.max(...series))}
        {unit}, now {fmt(last)}
        {unit}.{threshold ? ` Threshold: ${threshold.label}.` : ""} Use arrow keys to read each
        point.
      </p>
    </figure>
  );
}
