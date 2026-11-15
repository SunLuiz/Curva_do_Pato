const rateBuckets = new Map();
const MAX_PER_MIN = 5;

const GROUNDED_TELEMETRY = `
Verified Cockpit-OMNI Telemetry (NASA POWER MERRA-2/CERES 1984-2025, n=504, Seasonal MK alpha=0.05):
- campinas/T2M: slope=+0.4091 C/dec, total=+1.718 C, 95% CI=[0.3329, 0.4891], tau=0.293, p<1e-16 (significant increasing)
- campinas/PRECTOTCORR: slope=-0.2724 mm/day/dec, total=-1.144 mm/day, p=1.59e-6 (significant decreasing)
- campinas/RH2M: slope=-1.6601 %/dec, total=-6.972 %, p<1e-16 (significant decreasing)
- campinas/ALLSKY_SFC_SW_DWN: slope=+0.1621 MJ/m2/day/dec, p=0.0008616 (Seasonal MK significant; naive MK p=0.1968 misses it)
- campinas/CLRSKY_SFC_SW_DWN: slope=+0.1897 MJ/m2/day/dec, p<1e-16 (aerosol/clear-sky brightening)
- campinas/CLOUD_ATTEN_PCT: slope=+0.0378 %/dec, p=0.9476 (NO trend)
- petrolina/T2M: slope=+0.3012 C/dec, total=+1.265 C, p=4.663e-15 (significant increasing)
- petrolina/CLOUD_ATTEN_PCT: slope=-0.9647 %/dec, p=2.833e-9 (cloud thinning); CLRSKY p=0.2901 (NO trend)
- manaus/T2M: slope=+0.3065 C/dec, total=+1.287 C, tau=0.381, p<1e-16
- manaus/PRECTOTCORR: slope=-0.4673 mm/day/dec, total=-1.963 mm/day, p=4.238e-11
- manaus/CLOUD_ATTEN_PCT: slope=-0.8552 %/dec, p=3.015e-8 (cloud thinning); CLRSKY p=0.7686 (NO trend)
- WS2M (wind speed 2m): NO significant trend anywhere (Campinas p=0.489, Petrolina p=0.1734, Manaus p=0.4512) -> CANNOT predict wind ramps.
- FIRMS frozen snapshot: 3,313 detections across Brazil (0 within 150 km of Campinas, mean FRP 3.06 MW).
- Scope bounds: NISAR and ECOSTRESS are CMR-cataloged roadmap items; space analog feeds connect DSN Now, OSDR OSD-615, and CelesTrak GP JSON.
`.trim();

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (rateBuckets.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= MAX_PER_MIN) {
    rateBuckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ detail: "Method not allowed" });
    return;
  }

  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    res.status(429).json({ detail: "Rate limit exceeded (max 5 live questions per minute per IP)." });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const question = String(body.question || "").trim().slice(0, 300);
  const name = String(body.name || "Visitor").trim().slice(0, 40) || "Visitor";
  const depth = ["explorer", "analyst", "specialist"].includes(body.depth) ? body.depth : "explorer";
  const lang = String(body.lang || "en").toLowerCase().startsWith("pt") ? "pt" : "en";
  const summary = String(body.summary || "").slice(0, 400);
  const route = String(body.route || "/cockpit").slice(0, 60);

  if (!question) {
    res.status(400).json({ detail: "'question' must not be blank." });
    return;
  }

  const gonkaBase = (process.env.GONKA_BASE_URL || "https://api.gonkarouter.io/v1").trim().replace(/\/$/, "");
  const providers = [
    {
      name: "gonka",
      key: (process.env.GONKA_API_KEY || "").trim(),
      endpoint: `${gonkaBase}/chat/completions`,
      model: process.env.GONKA_MODEL || "deepseek-ai/DeepSeek-V4-Flash-0731",
      maxTokens: 700,
      timeoutMs: 8000,
    },
    {
      name: "groq",
      key: (process.env.GROQ_API_KEY || "").trim(),
      endpoint: "https://api.groq.com/openai/v1/chat/completions",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      maxTokens: 350,
      timeoutMs: 10000,
    },
    {
      name: "openrouter",
      key: (process.env.OPENROUTER_API_KEY || "").trim(),
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
      maxTokens: 350,
      timeoutMs: 12000,
    },
  ].filter((p) => p.key);

  if (!providers.length) {
    res.status(503).json({
      detail: "No live LLM provider key configured on Vercel server; use the 10 cache-verified answers.",
    });
    return;
  }

  const langRule =
    lang === "pt"
      ? "Respond strictly in clear Brazilian Portuguese (PT-BR)."
      : "Respond strictly in clear plain English.";
  const systemPrompt =
    "You are the Cockpit-OMNI Data Detective Tutor (NASA Space Apps 2026). " +
    "Cite ONLY verified numbers from the telemetry block below, state null limits honestly, " +
    "keep answers concise (<= 5 sentences), and " +
    `${langRule}\n\n${GROUNDED_TELEMETRY}`;
  const userPrompt = `Detective: ${name}\nTrack: ${depth}\nLanguage: ${lang}\nPage: ${route}\nMemory: ${summary || "none"}\n\nQuestion: ${question}`;

  let lastErr = "provider unreachable";
  for (const p of providers) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), p.timeoutMs);
    try {
      const r = await fetch(p.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${p.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: p.model,
          temperature: 0.2,
          max_tokens: p.maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: ac.signal,
      });
      if (!r.ok) {
        lastErr = `HTTP ${r.status}`;
        continue;
      }
      const data = await r.json();
      const msg = data?.choices?.[0]?.message || {};
      const answer = String(msg.content || msg.reasoning || "").trim();
      if (answer) {
        res.status(200).json({ answer, provider: p.name, model: p.model, depth, lang });
        return;
      }
    } catch (err) {
      lastErr = err?.message || "timeout";
    } finally {
      clearTimeout(timer);
    }
  }

  res.status(502).json({ detail: `Upstream tutor providers failed: ${lastErr}` });
}
