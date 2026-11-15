export default function handler(_req, res) {
  const hasKey = Boolean(
    (process.env.GONKA_API_KEY || "").trim() ||
      (process.env.GROQ_API_KEY || "").trim() ||
      (process.env.OPENROUTER_API_KEY || "").trim()
  );
  // Only declare "ok" (live FastAPI routes attached) when ENABLE_LIVE_BACKEND === "1".
  // Returning HTTP 200 in open snapshot mode avoids spurious 503 console/banner errors.
  const enableLive = process.env.ENABLE_LIVE_BACKEND === "1";

  res.setHeader("Cache-Control", "no-store");
  if (!enableLive) {
    res.status(200).json({
      status: "offline_snapshot",
      mode: "open_zero_key_browser",
      service: "Cockpit-OMNI Static + Open CORS",
      live_ai: hasKey,
      reason: "open zero-key browser mode (no FastAPI backend attached)",
    });
    return;
  }

  res.status(200).json({
    status: "ok",
    version: "0.2.0",
    service: "Cockpit-OMNI Serverless",
    live_ai: hasKey,
  });
}
