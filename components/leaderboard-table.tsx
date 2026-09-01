import type { ScoreEntry } from "@/lib/leaderboards";

/** 1 → "1ST", 2 → "2ND", 3 → "3RD", 42 → "42ND". */
function ordinal(n: number): string {
  const suffixes = ["TH", "ST", "ND", "RD"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

/** 3333360 → "3,333,360" (separador de miles estilo en-US). */
function formatScore(n: number): string {
  return n.toLocaleString("en-US");
}

/** "HOY" si la fecha es null o es la de hoy; si no, el string "YYYY-MM-DD". */
function formatDate(d: string | null): string {
  if (d === null) return "HOY";
  const today = new Date().toISOString().slice(0, 10);
  return d === today ? "HOY" : d;
}

/** Oro / plata / bronce para el top-3 en la variante "full". */
function rankColor(rank: number): string {
  if (rank === 1) return "text-tertiary-fixed [text-shadow:0_0_10px_#e3ec00]";
  if (rank === 2) return "text-primary [text-shadow:0_0_10px_#e9feff]";
  if (rank === 3) return "text-[#cd7f32] [text-shadow:0_0_10px_#cd7f32]";
  return "text-white";
}

const SCANLINES =
  "pointer-events-none absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(0,0,0,0.1)_1px,rgba(0,0,0,0.1)_2px)]";

type Props = {
  entries: ScoreEntry[];
  variant: "sidebar" | "full";
};

export function LeaderboardTable({ entries, variant }: Props) {
  if (variant === "sidebar") {
    const rows = entries.filter((entry) => !entry.isCurrentUser).slice(0, 5);
    return (
      <div className="relative h-full border border-primary-fixed-dim bg-surface-container">
        <div aria-hidden className={SCANLINES} />
        <div className="relative border-b border-primary-fixed-dim p-6">
          <h2 className="font-display text-headline-md uppercase tracking-[0.15em] text-tertiary">
            Mejores puntuaciones
          </h2>
        </div>
        <div className="relative p-6">
          <div className="mb-4 flex justify-between border-b border-primary-fixed-dim pb-2 font-body text-label-sm uppercase tracking-[0.1em] text-tertiary-fixed">
            <span className="w-12">Rango</span>
            <span className="flex-1">Jugador</span>
            <span className="text-right">Pts</span>
          </div>
          <ul className="space-y-3 font-body text-body-md">
            {rows.map((entry) => (
              <li
                key={`${entry.rank}-${entry.player}`}
                className="-mx-2 flex items-center justify-between p-2 transition-colors hover:bg-surface-variant"
              >
                <span className={`w-12 font-bold ${rankColor(entry.rank)}`}>
                  {ordinal(entry.rank)}
                </span>
                <span className="flex-1 uppercase tracking-wider text-on-surface-variant">
                  {entry.player}
                </span>
                <span className="text-right text-white">
                  {formatScore(entry.score)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto border border-primary-fixed-dim bg-surface-container p-6">
      <div aria-hidden className={SCANLINES} />
      <table className="relative w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-primary-fixed-dim font-display text-headline-md uppercase text-tertiary">
            <th className="px-4 py-4">Rango</th>
            <th className="px-4 py-4">Jugador</th>
            <th className="px-4 py-4 text-right">Puntuación</th>
            <th className="hidden px-4 py-4 text-right sm:table-cell">Fecha</th>
          </tr>
        </thead>
        <tbody className="font-body text-body-md text-white">
          {entries.map((entry) => (
            <tr
              key={`${entry.rank}-${entry.player}`}
              className={
                entry.isCurrentUser
                  ? "border-b-2 border-secondary-container bg-secondary-container/20 transition-colors hover:bg-secondary-container/30"
                  : "border-b border-surface-bright transition-colors hover:bg-surface-bright/50"
              }
            >
              <td
                className={`px-4 py-4 font-bold ${
                  entry.isCurrentUser
                    ? "text-white drop-shadow-[0_0_5px_#ffffff]"
                    : rankColor(entry.rank)
                }`}
              >
                {ordinal(entry.rank)}
              </td>
              <td className="px-4 py-4 font-bold uppercase text-white">
                <span className="flex items-center gap-2">
                  {entry.player}
                  {entry.isCurrentUser && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-secondary-container drop-shadow-[0_0_5px_#ff4d80]"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9.1l6.9-.8z" />
                    </svg>
                  )}
                </span>
              </td>
              <td
                className={`px-4 py-4 text-right font-bold ${
                  entry.isCurrentUser
                    ? "text-secondary-container drop-shadow-[0_0_5px_#ff4d80]"
                    : "text-primary-fixed"
                }`}
              >
                {formatScore(entry.score)}
              </td>
              <td className="hidden px-4 py-4 text-right sm:table-cell">
                {formatDate(entry.achievedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
