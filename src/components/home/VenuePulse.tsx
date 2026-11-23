"use client";

// "This venue, right now" — the live figures only a real venue can show, in the
// same KPI-tile vocabulary as the Operations / Connections / Agents headers.
// Every figure comes from a job-free read; a figure the venue couldn't provide
// is simply left out rather than shown as zero.
type Tile = { label: string; value: number; accent?: boolean };

export function VenuePulse({
  running,
  total,
  jobs,
  connections,
}: {
  running: number;
  total: number;
  jobs?: number;
  connections?: number;
}) {
  const tiles: Tile[] = [
    { label: "Agents running", value: running, accent: running > 0 },
    { label: "Agents total", value: total },
  ];
  if (typeof jobs === "number") tiles.push({ label: "Jobs run", value: jobs });
  if (typeof connections === "number") tiles.push({ label: "Connections", value: connections });

  // Nothing worth showing yet (fresh venue, no agents) — fold away.
  if (total === 0 && !jobs && !connections) return null;

  return (
    <section aria-labelledby="home-venue-pulse">
      <h2
        id="home-venue-pulse"
        className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        This venue, right now
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div
              className={`text-3xl font-semibold tabular-nums ${t.accent ? "text-primary" : "text-foreground"}`}
            >
              {t.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{t.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
