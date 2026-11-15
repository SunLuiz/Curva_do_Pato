import {
  RANKING_LIMITS,
  mergeRankingEntry,
  sanitizeRankingEntry,
  sortRankingRows,
} from "../src/engine/rankingModel.js";

const rateBuckets = new Map();
const MAX_POSTS_PER_MIN = 20;
const REQUEST_TIMEOUT_MS = 7500;

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function checkRateLimit(ip, now = Date.now()) {
  const recent = (rateBuckets.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= MAX_POSTS_PER_MIN) {
    rateBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return true;
}

export function detectRankingStorage(env = process.env) {
  const redisUrl = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
  const redisToken = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || "").trim();
  if (redisUrl && redisToken) {
    return {
      kind: "upstash_redis",
      url: redisUrl,
      token: redisToken,
      key: (env.RANKING_REDIS_KEY || "cockpit_omni:hall_of_fame:v1").trim(),
    };
  }

  const ghToken = (env.GITHUB_RANKING_TOKEN || "").trim();
  const gistId = (env.GITHUB_RANKING_GIST_ID || "").trim();
  if (ghToken && gistId) {
    return {
      kind: "github_gist",
      token: ghToken,
      gistId,
      filename: (env.GITHUB_RANKING_GIST_FILE || "curve_of_duck_ranking.json").trim(),
    };
  }

  if (ghToken) {
    const requestedBranch = (env.GITHUB_RANKING_BRANCH || "leaderboard-data").trim();
    const safeBranch =
      requestedBranch === "main" && env.ALLOW_MAIN_RANKING_BRANCH !== "1"
        ? "leaderboard-data"
        : requestedBranch;
    return {
      kind: "github_repo",
      token: ghToken,
      repo: (env.GITHUB_RANKING_REPO || "SunLuiz/Curva_do_Pato").trim(),
      branch: safeBranch,
      filePath: (env.GITHUB_RANKING_PATH || "hall_of_fame.json").trim().replace(/^\/+/, ""),
    };
  }

  return { kind: "unconfigured" };
}

function parseRowsJson(text) {
  try {
    const parsed = JSON.parse(text || "[]");
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rows) ? parsed.rows : [];
    const clean = [];
    for (const row of list) {
      const res = sanitizeRankingEntry(row);
      if (res.ok) clean.push(res.entry);
    }
    return sortRankingRows(clean).slice(0, RANKING_LIMITS.MAX_ROWS);
  } catch {
    return [];
  }
}

async function fetchWithTimeout(fetchImpl, url, options = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...options, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readUpstash(cfg, fetchImpl) {
  const res = await fetchWithTimeout(fetchImpl, `${cfg.url}/get/${encodeURIComponent(cfg.key)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
  });
  if (!res.ok) throw new Error(`Redis GET HTTP ${res.status}`);
  const data = await res.json();
  return { rows: parseRowsJson(data?.result || "[]"), sha: null };
}

async function writeUpstash(cfg, incoming, fetchImpl) {
  const current = await readUpstash(cfg, fetchImpl);
  const merged = mergeRankingEntry(current.rows, incoming, RANKING_LIMITS.MAX_ROWS);
  if (!merged.ok) return { ok: false, reason: merged.reason, rows: current.rows };

  const res = await fetchWithTimeout(fetchImpl, cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["SET", cfg.key, JSON.stringify(merged.rows)]),
  });
  if (!res.ok) throw new Error(`Redis SET HTTP ${res.status}`);
  return { ok: true, entry: merged.entry, rows: merged.rows };
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Cockpit-OMNI-Global-Leaderboard",
    "Content-Type": "application/json",
  };
}

async function readGist(cfg, fetchImpl) {
  const res = await fetchWithTimeout(fetchImpl, `https://api.github.com/gists/${cfg.gistId}`, {
    headers: githubHeaders(cfg.token),
  });
  if (!res.ok) throw new Error(`GitHub Gist GET HTTP ${res.status}`);
  const gist = await res.json();
  const targetFile =
    gist.files?.[cfg.filename] ||
    (gist.files ? gist.files[Object.keys(gist.files)[0]] : null);
  return { rows: parseRowsJson(targetFile?.content || "[]"), sha: null };
}

async function writeGist(cfg, incoming, fetchImpl) {
  const current = await readGist(cfg, fetchImpl);
  const merged = mergeRankingEntry(current.rows, incoming, RANKING_LIMITS.MAX_ROWS);
  if (!merged.ok) return { ok: false, reason: merged.reason, rows: current.rows };

  const res = await fetchWithTimeout(fetchImpl, `https://api.github.com/gists/${cfg.gistId}`, {
    method: "PATCH",
    headers: githubHeaders(cfg.token),
    body: JSON.stringify({
      files: {
        [cfg.filename]: {
          content: JSON.stringify(merged.rows, null, 2),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`GitHub Gist PATCH HTTP ${res.status}`);
  return { ok: true, entry: merged.entry, rows: merged.rows };
}

async function readGithubRepo(cfg, fetchImpl) {
  const apiUrl = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.filePath}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetchWithTimeout(fetchImpl, apiUrl, {
    headers: githubHeaders(cfg.token),
  });
  if (res.status === 404) {
    return { rows: [], sha: null };
  }
  if (!res.ok) throw new Error(`GitHub Contents GET HTTP ${res.status}`);
  const data = await res.json();
  const decoded = data?.content
    ? Buffer.from(String(data.content).replace(/\n/g, ""), "base64").toString("utf8")
    : "[]";
  return { rows: parseRowsJson(decoded), sha: data?.sha || null };
}

async function writeGithubRepo(cfg, incoming, fetchImpl) {
  const apiUrl = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.filePath}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await readGithubRepo(cfg, fetchImpl);
    const merged = mergeRankingEntry(current.rows, incoming, RANKING_LIMITS.MAX_ROWS);
    if (!merged.ok) return { ok: false, reason: merged.reason, rows: current.rows };

    const body = {
      message: `chore(ranking): sync global leaderboard (${merged.entry.name})`,
      content: Buffer.from(JSON.stringify(merged.rows, null, 2), "utf8").toString("base64"),
      branch: cfg.branch,
    };
    if (current.sha) {
      body.sha = current.sha;
    }

    const res = await fetchWithTimeout(fetchImpl, apiUrl, {
      method: "PUT",
      headers: githubHeaders(cfg.token),
      body: JSON.stringify(body),
    });
    if (res.ok) {
      return { ok: true, entry: merged.entry, rows: merged.rows };
    }
    if ((res.status === 409 || res.status === 422) && attempt < 2) {
      continue;
    }
    throw new Error(`GitHub Contents PUT HTTP ${res.status}`);
  }
  throw new Error("GitHub Contents conflict retry exhausted");
}

export function createRankingHandler({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  return async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    const storage = detectRankingStorage(env);

    if (req.method === "GET") {
      if (storage.kind === "unconfigured") {
        res.status(200).json({
          status: "unconfigured",
          storage: "unconfigured",
          rows: [],
          count: 0,
          note: "Configure GITHUB_RANKING_TOKEN (+ optional GITHUB_RANKING_GIST_ID) or UPSTASH_REDIS_REST_URL on Vercel to enable worldwide persistence.",
        });
        return;
      }

      try {
        const result =
          storage.kind === "upstash_redis"
            ? await readUpstash(storage, fetchImpl)
            : storage.kind === "github_gist"
              ? await readGist(storage, fetchImpl)
              : await readGithubRepo(storage, fetchImpl);
        res.status(200).json({
          status: "ok",
          storage: storage.kind,
          rows: result.rows,
          count: result.rows.length,
          syncedAt: new Date().toISOString(),
        });
      } catch (err) {
        res.status(502).json({
          status: "upstream_error",
          storage: storage.kind,
          detail: err?.message || "Failed to read global ranking store.",
          rows: [],
        });
      }
      return;
    }

    if (req.method === "POST") {
      const forwarded = req.headers?.["x-forwarded-for"];
      const ip =
        typeof forwarded === "string"
          ? forwarded.split(",")[0].trim()
          : req.socket?.remoteAddress || "unknown";
      if (!checkRateLimit(ip)) {
        res.status(429).json({
          status: "rate_limited",
          detail: "Too many leaderboard submissions. Try again in a moment.",
        });
        return;
      }

      let body = {};
      try {
        body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      } catch {
        res.status(400).json({ status: "invalid_json", detail: "Malformed JSON payload." });
        return;
      }

      const check = sanitizeRankingEntry(body);
      if (!check.ok) {
        res.status(400).json({ status: "rejected", reason: check.reason });
        return;
      }

      if (storage.kind === "unconfigured") {
        res.status(200).json({
          status: "unconfigured",
          persisted: false,
          storage: "unconfigured",
          entry: check.entry,
          rows: [check.entry],
        });
        return;
      }

      try {
        const writeResult =
          storage.kind === "upstash_redis"
            ? await writeUpstash(storage, check.entry, fetchImpl)
            : storage.kind === "github_gist"
              ? await writeGist(storage, check.entry, fetchImpl)
              : await writeGithubRepo(storage, check.entry, fetchImpl);

        if (!writeResult.ok) {
          res.status(400).json({ status: "rejected", reason: writeResult.reason });
          return;
        }

        res.status(200).json({
          status: "ok",
          persisted: true,
          storage: storage.kind,
          entry: writeResult.entry,
          rows: writeResult.rows,
          count: writeResult.rows.length,
          syncedAt: new Date().toISOString(),
        });
      } catch (err) {
        res.status(502).json({
          status: "upstream_error",
          persisted: false,
          storage: storage.kind,
          detail: err?.message || "Failed to persist global ranking.",
        });
      }
      return;
    }

    res.status(405).json({ status: "method_not_allowed", detail: "Use GET or POST." });
  };
}

export default createRankingHandler();
