import test from "node:test";
import assert from "node:assert/strict";

import {
  RANKING_LIMITS,
  mergeRankingEntry,
  mergeRankingLists,
  sanitizeRankingEntry,
} from "./rankingModel.js";
import {
  DEFAULT_GLOBAL_RANKING_URL,
  fetchGlobalRanking,
  resolveRankingEndpoint,
  submitGlobalRanking,
} from "./rankingClient.js";
import { buildRankingEntry, loadProfile, saveProfile } from "../academy/storage.js";
import { createRankingHandler, detectRankingStorage } from "../../api/ranking.js";

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test("rankingModel preserves monotonic high-scores and prevents same-name collisions via pilotId", () => {
  const first = mergeRankingEntry([], {
    pilotId: "p_player_one_uuid",
    name: "Ana",
    depth: "analyst",
    xp: 320,
    stars: 9,
    masteredCount: 2,
    missionsWon: 2,
    badgesCount: 3,
  });
  assert.equal(first.ok, true);
  assert.equal(first.rows.length, 1);

  // Different user with same display name "Ana" must NOT overwrite the first Ana
  const second = mergeRankingEntry(first.rows, {
    pilotId: "p_player_two_uuid",
    name: "Ana",
    depth: "explorer",
    xp: 480,
    stars: 12,
    masteredCount: 3,
    missionsWon: 4,
    badgesCount: 5,
  });
  assert.equal(second.ok, true);
  assert.equal(second.rows.length, 2);
  assert.equal(second.rows[0].pilotId, "p_player_two_uuid");
  assert.equal(second.rows[1].pilotId, "p_player_one_uuid");

  // Same pilotId sending lower partial XP keeps historical high-score monotonically
  const retryLower = mergeRankingEntry(second.rows, {
    pilotId: "p_player_two_uuid",
    name: "Ana Silva",
    xp: 100,
    stars: 3,
    masteredCount: 1,
    missionsWon: 1,
  });
  assert.equal(retryLower.ok, true);
  assert.equal(retryLower.entry.xp, 480);
  assert.equal(retryLower.entry.stars, 12);
  assert.equal(retryLower.entry.name, "Ana Silva");

  // Reject out-of-bounds tampered payloads
  const cheat = sanitizeRankingEntry({
    pilotId: "p_cheater_1234",
    name: "Cheater",
    xp: RANKING_LIMITS.MAX_XP + 1,
    stars: 3,
  });
  assert.equal(cheat.ok, false);
  assert.equal(cheat.reason, "XP_OUT_OF_BOUNDS");

  // Two-list merge combines remote and local pilots cleanly
  const mergedBoth = mergeRankingLists(second.rows, [
    { pilotId: "p_local_only_99", name: "Bruno", xp: 400, stars: 10, masteredCount: 2, missionsWon: 3 },
  ]);
  assert.equal(mergedBoth.length, 3);
  assert.equal(mergedBoth[1].name, "Bruno");
});

test("resolveRankingEndpoint shares www.curveofduck.xyz for local clones and /api/ranking on Vercel", () => {
  assert.equal(
    resolveRankingEndpoint({ envUrl: "", loc: { hostname: "www.curveofduck.xyz" } }),
    "/api/ranking"
  );
  assert.equal(
    resolveRankingEndpoint({ envUrl: "", loc: { hostname: "curva-do-pato.vercel.app" } }),
    "/api/ranking"
  );
  assert.equal(
    resolveRankingEndpoint({ envUrl: "", loc: { hostname: "localhost" } }),
    DEFAULT_GLOBAL_RANKING_URL
  );
  assert.equal(
    resolveRankingEndpoint({ envUrl: "https://custom.example.com/api/ranking/", loc: { hostname: "localhost" } }),
    "https://custom.example.com/api/ranking"
  );
});

test("detectRankingStorage prioritizes Upstash Redis -> GitHub Gist -> GitHub Repo -> unconfigured", () => {
  assert.equal(detectRankingStorage({}).kind, "unconfigured");
  assert.equal(detectRankingStorage({ GITHUB_RANKING_TOKEN: "ghp_test" }).branch, "leaderboard-data");
  assert.equal(
    detectRankingStorage({ GITHUB_RANKING_TOKEN: "ghp_test", GITHUB_RANKING_BRANCH: "main" }).branch,
    "leaderboard-data"
  );
  assert.equal(
    detectRankingStorage({ GITHUB_RANKING_TOKEN: "ghp_test", GITHUB_RANKING_GIST_ID: "abc123" }).kind,
    "github_gist"
  );
  assert.equal(
    detectRankingStorage({
      UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "tok",
      GITHUB_RANKING_TOKEN: "ghp_test",
    }).kind,
    "upstash_redis"
  );
});

test("Vercel ranking handler supports CORS, GitHub Gist read/write, GitHub 409 retry, and unconfigured fallback", async () => {
  // 1. Unconfigured fallback returns 200 transparently (never 500) with open CORS
  const unconfHandler = createRankingHandler({ env: {} });
  const getUnconf = createMockRes();
  await unconfHandler({ method: "GET", headers: {} }, getUnconf);
  assert.equal(getUnconf.statusCode, 200);
  assert.equal(getUnconf.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(getUnconf.body.status, "unconfigured");

  // 2. GitHub Gist driver read + POST persistence round-trip
  let gistRows = [
    {
      pilotId: "p_global_seeded_1",
      name: "Dr. Elena",
      depth: "specialist",
      xp: 640,
      stars: 18,
      masteredCount: 4,
      missionsWon: 4,
      badgesCount: 6,
      updatedAt: "2026-11-15T12:00:00.000Z",
    },
  ];
  const gistFetch = async (_url, opts = {}) => {
    if (opts.method === "PATCH") {
      const parsed = JSON.parse(opts.body);
      gistRows = JSON.parse(parsed.files["curve_of_duck_ranking.json"].content);
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        files: { "curve_of_duck_ranking.json": { content: JSON.stringify(gistRows) } },
      }),
    };
  };

  const gistHandler = createRankingHandler({
    env: { GITHUB_RANKING_TOKEN: "tok", GITHUB_RANKING_GIST_ID: "gist99" },
    fetchImpl: gistFetch,
  });

  const postRes = createMockRes();
  await gistHandler(
    {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.2" },
      body: {
        pilotId: "p_remote_joao_2",
        name: "Joao Pedro",
        depth: "analyst",
        xp: 720,
        stars: 15,
        masteredCount: 3,
        missionsWon: 5,
      },
    },
    postRes
  );
  assert.equal(postRes.statusCode, 200);
  assert.equal(postRes.body.persisted, true);
  assert.equal(postRes.body.storage, "github_gist");
  assert.equal(postRes.body.rows[0].name, "Joao Pedro");
  assert.equal(postRes.body.rows[1].name, "Dr. Elena");

  // 3. GitHub Repo driver handles concurrent 409 SHA conflict retry cleanly
  let putCalls = 0;
  let repoSha = "sha_1";
  let repoContent = Buffer.from(JSON.stringify(gistRows), "utf8").toString("base64");
  const repoFetch = async (_url, opts = {}) => {
    if (opts.method === "PUT") {
      putCalls += 1;
      if (putCalls === 1) {
        repoSha = "sha_2";
        return { ok: false, status: 409 };
      }
      const parsed = JSON.parse(opts.body);
      repoContent = parsed.content;
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ sha: repoSha, content: repoContent }),
    };
  };

  const repoHandler = createRankingHandler({
    env: { GITHUB_RANKING_TOKEN: "tok", GITHUB_RANKING_REPO: "SunLuiz/Curva_do_Pato" },
    fetchImpl: repoFetch,
  });
  const retryRes = createMockRes();
  await repoHandler(
    {
      method: "POST",
      headers: { "x-forwarded-for": "10.0.0.3" },
      body: { pilotId: "p_maria_3333", name: "Maria Clara", xp: 510, stars: 11, masteredCount: 2, missionsWon: 3 },
    },
    retryRes
  );
  assert.equal(putCalls, 2);
  assert.equal(retryRes.statusCode, 200);
  assert.equal(retryRes.body.storage, "github_repo");
  assert.equal(retryRes.body.rows.length, 3);
});

test("rankingClient syncs global leaderboard cleanly and falls back gracefully offline", async () => {
  const mem = createMemoryStorage();
  const initial = loadProfile(mem);
  assert.ok(initial.pilotId.startsWith("p_"));

  const saved = saveProfile(
    {
      ...initial,
      name: "Commander Ana",
      xp: 250,
      stars: 6,
      game: { missions: { M1: { won: true, stars: 3 } } },
    },
    mem
  );
  const entry = buildRankingEntry(saved);
  assert.equal(entry.missionsWon, 1);
  assert.equal(entry.xp, 250);

  // Offline / unreachable endpoint falls back smoothly without throwing
  const offline = await fetchGlobalRanking({
    store: mem,
    fetchImpl: async () => {
      throw new Error("Network offline");
    },
  });
  assert.equal(offline.mode, "local_only");
  assert.equal(offline.rows.length, 1);
  assert.equal(offline.rows[0].name, "Commander Ana");

  // Online mock server merges remote players with local player and caches locally
  const remoteRows = [
    {
      pilotId: "p_remote_carlos",
      name: "Carlos Orbita",
      depth: "specialist",
      xp: 890,
      stars: 21,
      masteredCount: 5,
      missionsWon: 5,
      updatedAt: "2026-11-15T14:00:00.000Z",
    },
  ];
  const onlineSubmit = await submitGlobalRanking(saved, {
    store: mem,
    fetchImpl: async (_url, opts) => {
      const body = JSON.parse(opts.body);
      const merged = mergeRankingLists(remoteRows, [body]);
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          status: "ok",
          persisted: true,
          storage: "github_gist",
          rows: merged,
          syncedAt: "2026-11-15T17:00:00.000Z",
        }),
      };
    },
  });
  assert.equal(onlineSubmit.mode, "global_live");
  assert.equal(onlineSubmit.storage, "github_gist");
  assert.equal(onlineSubmit.rows.length, 2);
  assert.equal(onlineSubmit.rows[0].name, "Carlos Orbita");
  assert.equal(onlineSubmit.rows[1].name, "Commander Ana");
});
