/**
 * High-frequency simulation store using React 19 useSyncExternalStore.
 * Three.js reads `getRuntime()` directly at 60 FPS with zero React re-renders;
 * HUD components subscribe to throttled UI snapshots (~10 Hz + instant on events).
 */

import { useSyncExternalStore } from "react";
import { createMissionRuntime, stepSimulation, triggerRoverAction } from "./sim/roverSimulation.js";

let runtime = null;
let snapshotVersion = 0;
let cachedSnapshot = null;
let lastEmitMs = 0;
const listeners = new Set();

function buildSnapshot() {
  if (!runtime) return null;
  return {
    version: snapshotVersion,
    missionId: runtime.missionId,
    planetId: runtime.planetId,
    planet: runtime.planet,
    depth: runtime.depth,
    severity: runtime.severity,
    seed: runtime.seed,
    status: runtime.status,
    failReason: runtime.failReason,
    paused: runtime.paused,
    elapsedSec: runtime.elapsedSec,
    tickIndex: runtime.tickIndex,
    totalTicks: runtime.timeline.length,
    timeline: runtime.timeline,
    visibleSeries: [...runtime.visibleSeries],
    oraclePins: runtime.oraclePins,
    zones: runtime.zones,
    rover: { ...runtime.rover, inZones: [...runtime.rover.inZones] },
    resources: { ...runtime.resources },
    telemetry: { ...runtime.telemetry },
    progress: {
      ...runtime.progress,
      sampledDecades: [...runtime.progress.sampledDecades],
    },
    alert: { ...runtime.alert },
    actionLog: [...runtime.actionLog],
    outcome: runtime.outcome ? { ...runtime.outcome } : null,
  };
}

function emit(force = false) {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (!force && now - lastEmitMs < 95) return;
  lastEmitMs = now;
  snapshotVersion += 1;
  cachedSnapshot = buildSnapshot();
  for (const cb of listeners) cb();
}

export function startMissionRuntime(config) {
  runtime = createMissionRuntime(config);
  emit(true);
  return runtime;
}

export function getRuntime() {
  return runtime;
}

export function tickRuntime(input, dt) {
  if (!runtime || runtime.status !== "playing" || runtime.paused) return;
  const prevTick = runtime.tickIndex;
  const prevStatus = runtime.status;
  const prevCode = runtime.alert.code;
  stepSimulation(runtime, input, dt);
  const urgent =
    runtime.tickIndex !== prevTick ||
    runtime.status !== prevStatus ||
    runtime.alert.code !== prevCode;
  emit(urgent);
}

export function dispatchAction(code) {
  if (!runtime) return;
  triggerRoverAction(runtime, code);
  emit(true);
}

export function togglePauseRuntime() {
  if (!runtime || runtime.status !== "playing") return;
  runtime.paused = !runtime.paused;
  emit(true);
}

export function markHintUsed() {
  if (!runtime) return;
  runtime.usedHint = true;
}

export function clearRuntime() {
  runtime = null;
  cachedSnapshot = null;
  emit(true);
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return cachedSnapshot;
}

export function useGameSnapshot() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
