import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Rendered in the desktop table only — use when the mobile card already
   *  surfaces this via mobileTitle/mobileBadge/mobileExtra instead. */
  desktopOnly?: boolean;
};

/**
 * Renders as a real <table> on md+ screens and as stacked label/value cards
 * on mobile, from the same column definitions — so list data (teams,
 * participants, payments) never has to maintain two layouts by hand.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = "No records found.",
  skeletonRows = 5,
  mobileTitle,
  mobileBadge,
  mobileExtra,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
  skeletonRows?: number;
  mobileTitle?: (row: T) => ReactNode;
  mobileBadge?: (row: T) => ReactNode;
  mobileExtra?: (row: T) => ReactNode;
}) {
  if (loading) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: skeletonRows }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm font-medium text-white/80">No records found</p>
        <p className="mt-1 text-sm text-white/50">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-left text-[11px] uppercase tracking-wide text-white/45">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={rowKey(row, index)} className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 align-middle text-white/85 ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row, index) => (
          <div key={rowKey(row, index)} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {mobileTitle ? (
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-white">{mobileTitle(row)}</h3>
                {mobileBadge ? mobileBadge(row) : null}
              </div>
            ) : null}
            <div className={mobileTitle ? "mt-3 grid gap-2" : "grid gap-2"}>
              {columns
                .filter((col) => !col.desktopOnly)
                .map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-white/45">{col.header}</span>
                    <span className="text-right text-white/85">{col.render(row)}</span>
                  </div>
                ))}
            </div>
            {mobileExtra ? <div className="mt-3">{mobileExtra(row)}</div> : null}
          </div>
        ))}
      </div>
    </>
  );
}
