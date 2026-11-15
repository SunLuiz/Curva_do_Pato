export default function handler(_req, res) {
  const hasKey = Boolean(
    (process.env.GONKA_API_KEY || "").trim() ||
      (process.env.GROQ_API_KEY || "").trim() ||
      (process.env.OPENROUTER_API_KEY || "").trim()
  );
  const enableLive = hasKey || process.env.ENABLE_LIVE_BACKEND === "1";

  res.setHeader("Cache-Control", "no-store");
  if (!enableLive) {
    res.status(503).json({
      status: "offline_snapshot",
      reason: "static snapshot mode (no AI key configured in environment)",
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
