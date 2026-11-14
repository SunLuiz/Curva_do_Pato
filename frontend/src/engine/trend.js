// Client-side statistical engine: Seasonal & Original Mann-Kendall + Deseasonalized Theil-Sen
// Runs over sliced date ranges or seasonal filters directly in the browser (n <= 504 -> < 40 ms).

function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const ans =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? ans : 2 - ans;
}

function twoSidedNormalP(z) {
  if (!Number.isFinite(z)) return 1;
  return Math.max(0, Math.min(1, erfc(Math.abs(z) / Math.SQRT2)));
}

function mkCore(values) {
  const n = values.length;
  if (n < 3) return { s: 0, varS: 0, denom: 0, tau: 0, p: 1, trend: "no trend" };

  let s = 0;
  for (let i = 0; i < n - 1; i += 1) {
    const vi = values[i];
    for (let j = i + 1; j < n; j += 1) {
      const diff = values[j] - vi;
      if (diff > 0) s += 1;
      else if (diff < 0) s -= 1;
    }
  }

  // Tie group correction
  const sorted = [...values].sort((a, b) => a - b);
  let tieVar = 0;
  let tiePairs = 0;
  let run = 1;
  for (let i = 1; i <= n; i += 1) {
    if (i < n && sorted[i] === sorted[i - 1]) {
      run += 1;
    } else {
      if (run > 1) {
        tieVar += run * (run - 1) * (2 * run + 5);
        tiePairs += (run * (run - 1)) / 2;
      }
      run = 1;
    }
  }

  const totalPairs = (n * (n - 1)) / 2;
  const varS = (n * (n - 1) * (2 * n + 5) - tieVar) / 18;
  const z = s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;
  const p = varS > 0 ? twoSidedNormalP(z) : 1;
  const denom = Math.sqrt(totalPairs * Math.max(1, totalPairs - tiePairs));
  const tau = denom > 0 ? s / denom : 0;
  const trend = p < 0.05 ? (s > 0 ? "increasing" : "decreasing") : "no trend";
  return { s, varS, denom: totalPairs, tau, p, trend };
}

function medianSorted(arr) {
  const n = arr.length;
  if (!n) return 0;
  const mid = n >> 1;
  return n % 2 === 1 ? arr[mid] : 0.5 * (arr[mid - 1] + arr[mid]);
}

function theilSenWithCI(yValues) {
  const n = yValues.length;
  const m = (n * (n - 1)) / 2;
  const slopes = new Float64Array(m);
  let k = 0;
  for (let i = 0; i < n - 1; i += 1) {
    const yi = yValues[i];
    for (let j = i + 1; j < n; j += 1) {
      slopes[k++] = (yValues[j] - yi) / (j - i);
    }
  }
  slopes.sort();
  const slope = medianSorted(slopes);

  // Scipy-compatible 95% confidence interval index bounds
  const z95 = 1.959963984540054;
  const sigma = Math.sqrt((n * (n - 1) * (2 * n + 5)) / 18);
  const ru = Math.round((m + z95 * sigma) / 2);
  const rl = Math.round((m - z95 * sigma) / 2);
  const loIdx = Math.max(0, Math.min(m - 1, rl));
  const hiIdx = Math.max(0, Math.min(m - 1, ru));
  const lo = slopes[loIdx];
  const hi = slopes[hiIdx];

  // Median intercept: median(y_i - slope * i)
  const intercepts = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    intercepts[i] = yValues[i] - slope * i;
  }
  intercepts.sort();
  const intercept = medianSorted(intercepts);

  return { slope, lo, hi, intercept };
}

function roundTo(val, digits) {
  const f = 10 ** digits;
  return Math.round(val * f) / f;
}

/**
 * Compute Seasonal & Original Mann-Kendall + Deseasonalized Theil-Sen over
 * a slice of series points `[{ t: "YYYY-MM", v: number }]`.
 */
export function computeTrend(series, { monthFilter = null, minObs = 24 } = {}) {
  const filtered = monthFilter
    ? series.filter((pt) => Number(pt.t.slice(5, 7)) === monthFilter && Number.isFinite(pt.v))
    : series.filter((pt) => Number.isFinite(pt.v));

  const n = filtered.length;
  if (n < minObs) {
    return {
      stats: { status: "insufficient", n },
      series: filtered,
    };
  }

  const vals = filtered.map((p) => p.v);
  const orig = mkCore(vals);
  const rawSen = theilSenWithCI(vals);

  const isFullMonthly = !monthFilter && n >= 24;
  let primaryTau = orig.tau;
  let primaryP = orig.p;
  let primaryTrend = orig.trend;
  let primarySlope = rawSen.slope;
  let primaryLo = rawSen.lo;
  let primaryHi = rawSen.hi;
  let stepsPerDecade = monthFilter ? 10 : 120;
  let method = monthFilter
    ? "Mann-Kendall + Theil-Sen (Single-Month Slice, 95% CI)"
    : "Original Mann-Kendall + Theil-Sen (95% CI)";

  if (isFullMonthly) {
    // Group by calendar month (0..11)
    const buckets = Array.from({ length: 12 }, () => []);
    for (const pt of filtered) {
      const m = Number(pt.t.slice(5, 7)) - 1;
      if (m >= 0 && m < 12) buckets[m].push(pt.v);
    }

    let sTotal = 0;
    let varTotal = 0;
    let denomTotal = 0;
    const monthMeans = new Float64Array(12);
    for (let m = 0; m < 12; m += 1) {
      const b = buckets[m];
      if (b.length) {
        monthMeans[m] = b.reduce((a, c) => a + c, 0) / b.length;
      }
      if (b.length >= 2) {
        const res = mkCore(b);
        sTotal += res.s;
        varTotal += res.varS;
        denomTotal += res.denom;
      }
    }

    const zSeas =
      varTotal > 0
        ? sTotal > 0
          ? (sTotal - 1) / Math.sqrt(varTotal)
          : sTotal < 0
            ? (sTotal + 1) / Math.sqrt(varTotal)
            : 0
        : 0;
    primaryP = varTotal > 0 ? twoSidedNormalP(zSeas) : 1;
    primaryTau = denomTotal > 0 ? sTotal / denomTotal : 0;
    primaryTrend = primaryP < 0.05 ? (sTotal > 0 ? "increasing" : "decreasing") : "no trend";

    const anomalies = filtered.map((pt) => {
      const m = Number(pt.t.slice(5, 7)) - 1;
      return pt.v - monthMeans[m];
    });
    const anomSen = theilSenWithCI(anomalies);
    primarySlope = anomSen.slope;
    primaryLo = anomSen.lo;
    primaryHi = anomSen.hi;
    method = "Seasonal Mann-Kendall (period=12) + Deseasonalized Theil-Sen (95% CI)";
  }

  const annotated = filtered.map((pt, i) => ({
    t: pt.t,
    v: pt.v,
    sen: roundTo(rawSen.intercept + rawSen.slope * i, 4),
  }));

  return {
    stats: {
      status: "ok",
      method,
      n,
      tau: roundTo(primaryTau, 3),
      p_value: Number(primaryP.toExponential(3)),
      trend: primaryTrend,
      significant_5pct: primaryP < 0.05,
      slope_per_decade: roundTo(primarySlope * stepsPerDecade, 4),
      ci_95_per_decade: [
        roundTo(primaryLo * stepsPerDecade, 4),
        roundTo(primaryHi * stepsPerDecade, 4),
      ],
      total_change: roundTo(primarySlope * n, 3),
      original_tau: roundTo(orig.tau, 3),
      original_p_value: Number(orig.p.toExponential(3)),
      original_trend: orig.trend,
      original_slope_per_decade: roundTo(rawSen.slope * stepsPerDecade, 4),
      sen_line: {
        intercept: roundTo(rawSen.intercept, 4),
        slope_per_step: roundTo(rawSen.slope, 6),
      },
      start: filtered[0].t,
      end: filtered[n - 1].t,
    },
    series: annotated,
  };
}

export function toCsv(series, unit) {
  const rows = [["month", `value (${unit})`, "sen_fit"]];
  for (const p of series) {
    rows.push([p.t, p.v, p.sen ?? ""]);
  }
  return rows.map((r) => r.join(",")).join("\n");
}

export function fmtP(p) {
  if (p === null || p === undefined || Number.isNaN(p)) return "n/a";
  if (p === 0 || p < 1e-16) return "< 1e-16";
  if (p < 0.001) return p.toExponential(2);
  return Number(p).toFixed(3);
}

export function humanVerdict(stats, regionName, variableLabel, unit) {
  if (!stats || stats.status !== "ok") {
    return {
      headline: `Not enough observations (${stats?.n ?? 0}) to test significance.`,
      detail: "Expand the year range to at least 24 monthly steps for Seasonal Mann-Kendall.",
      tone: "null",
    };
  }
  const dir = stats.slope_per_decade > 0 ? "rising" : "falling";
  const sign = stats.total_change > 0 ? "+" : "";
  if (stats.significant_5pct) {
    return {
      headline: `Yes — ${regionName} ${variableLabel.toLowerCase()} is ${dir} significantly.`,
      detail: `Over ${stats.start} to ${stats.end} (n=${stats.n}), the deseasonalized shift is ${sign}${stats.total_change} ${unit} (p = ${fmtP(stats.p_value)}, alpha = 0.05).`,
      tone: "sig",
    };
  }
  return {
    headline: `No significant trend detected in ${regionName} (${variableLabel}).`,
    detail: `Observed fluctuations cannot be separated from natural variability at alpha = 0.05 (p = ${fmtP(stats.p_value)}).`,
    tone: "null",
  };
}

export async function probeBackend(base = "", timeoutMs = 4000) {
  const cleanBase = String(base || "").replace(/\/$/, "");
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(`${cleanBase}/healthz`, { signal: ac.signal });
    if (!r.ok) {
      return {
        live: false,
        reason: r.status === 500 && !cleanBase ? "no backend server attached" : `HTTP ${r.status}`,
      };
    }
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      return { live: false, reason: "static SPA rewrite (no backend)" };
    }
    const body = await r.json();
    return body?.status === "ok" ? { live: true, service: body.service || "Cockpit-OMNI" } : { live: false, reason: "unexpected payload" };
  } catch (_err) {
    return { live: false, reason: "unreachable" };
  } finally {
    clearTimeout(t);
  }
}
