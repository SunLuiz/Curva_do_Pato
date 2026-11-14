import React, { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toCsv } from "../engine/trend";

const PAGE_SIZE = 100;

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function RawTable({ data, series = [], unit = "", frozenAt = "2026-11-14 15:04 UTC" }) {
  const [query, setQuery] = useState("");
  const [desc, setDesc] = useState(false);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim();
    const base = q ? series.filter((p) => p.t.includes(q)) : series;
    return desc ? [...base].reverse() : base;
  }, [series, query, desc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const regionId = data?.region?.id || "custom";
  const variable = data?.variable || "series";

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
        <div className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
          {series.length} monthly observations · source: NASA POWER · {data?._transport === "live_api" ? "live API" : `frozen ${frozenAt}`}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Filter month (e.g. 2024 or -01)"
            aria-label="Filter observations by year or month"
            style={{ width: 210 }}
          />
          <button
            type="button"
            className="pill"
            onClick={() => setDesc((d) => !d)}
          >
            Sort: {desc ? "Newest first" : "Oldest first"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "0.45rem 0.9rem", fontSize: "0.83rem" }}
            onClick={() => downloadBlob(toCsv(filtered, unit), `${regionId}_${variable}.csv`, "text/csv;charset=utf-8")}
          >
            <Download size={14} /> CSV
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "0.45rem 0.9rem", fontSize: "0.83rem" }}
            onClick={() =>
              downloadBlob(
                JSON.stringify({ ...data, series: filtered }, null, 2),
                `${regionId}_${variable}.json`,
                "application/json"
              )
            }
          >
            <Download size={14} /> JSON
          </button>
        </div>
      </div>

      <div className="raw-table-wrap">
        <table className="raw-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Month</th>
              <th>Observed ({unit})</th>
              <th>Sen Fit ({unit})</th>
              <th>Residual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((pt, idx) => {
              const residual = pt.sen !== undefined ? (pt.v - pt.sen).toFixed(3) : "—";
              return (
                <tr key={pt.t}>
                  <td className="mono" style={{ color: "var(--ink-faint)" }}>
                    {safePage * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="mono">{pt.t}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    {Number(pt.v).toFixed(4)}
                  </td>
                  <td className="mono" style={{ color: "var(--ink-soft)" }}>
                    {pt.sen !== undefined ? Number(pt.sen).toFixed(4) : "—"}
                  </td>
                  <td className="mono" style={{ color: "var(--ink-soft)" }}>
                    {residual}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
          <span className="mono">
            Page {safePage + 1} of {totalPages} ({filtered.length} rows)
          </span>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="pill"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev 100
            </button>
            <button
              type="button"
              className="pill"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next 100
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
