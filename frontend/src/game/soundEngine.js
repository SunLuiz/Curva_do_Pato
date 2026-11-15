/**
 * Procedural Acoustic Engine (100% Web Audio API, zero external audio assets).
 * Synthesizes:
 *  1) 12-hole Transverse Ocarina (Helmholtz resonator: sine + subtle triangle + 5.5 Hz LFO breath + ADSR)
 *  2) Adaptive Chart Sonification (tempo/BPM, Dorian pitch, brightness & dynamic gain follow telemetry curve)
 *  3) Planetary Wind Generator (bandpass noise scaled by windMs * sqrt(rho) and attenuated inside shelter)
 *  4) Target Distance Sonar & Geotechnical Wheel-Slip Rumble
 */

export const OCARINA_NOTES = {
  D3: 146.83,
  A3: 220.0,
  D4: 293.66,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  Bb5: 932.33,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
};

export const OCARINA_N64_PADS = [
  { id: "A", note: "D5", labelEn: "A · D5", labelPt: "A · Ré5", freq: OCARINA_NOTES.D5, variant: "a" },
  { id: "C_DOWN", note: "F5", labelEn: "C▼ · F5", labelPt: "C▼ · Fá5", freq: OCARINA_NOTES.F5, variant: "c" },
  { id: "C_RIGHT", note: "A5", labelEn: "C▶ · A5", labelPt: "C▶ · Lá5", freq: OCARINA_NOTES.A5, variant: "c" },
  { id: "C_LEFT", note: "B5", labelEn: "C◀ · B5", labelPt: "C◀ · Si5", freq: OCARINA_NOTES.B5, variant: "c" },
  { id: "C_UP", note: "D6", labelEn: "C▲ · D6", labelPt: "C▲ · Ré6", freq: OCARINA_NOTES.D6, variant: "c" },
];

export const DORIAN_SCALE = [
  OCARINA_NOTES.D5,
  OCARINA_NOTES.E5,
  OCARINA_NOTES.F5,
  OCARINA_NOTES.G5,
  OCARINA_NOTES.A5,
  OCARINA_NOTES.B5,
  OCARINA_NOTES.C6,
  OCARINA_NOTES.D6,
];

// Gentle supporting arpeggio chords (root/fifth/octave) for Title Theme
const TITLE_CHORDS = [
  [OCARINA_NOTES.D3, OCARINA_NOTES.A3, OCARINA_NOTES.D4, OCARINA_NOTES.F4],
  [OCARINA_NOTES.G4 * 0.5, OCARINA_NOTES.D4, OCARINA_NOTES.G4, OCARINA_NOTES.A4],
];

export const OCARINA_MELODIES = {
  title: [
    [OCARINA_NOTES.A5, 0.52],
    [OCARINA_NOTES.D5, 0.82],
    [OCARINA_NOTES.F5, 0.24],
    [OCARINA_NOTES.G5, 0.24],
    [OCARINA_NOTES.A5, 1.02],
    [OCARINA_NOTES.A5, 0.52],
    [OCARINA_NOTES.D5, 0.82],
    [OCARINA_NOTES.F5, 0.24],
    [OCARINA_NOTES.G5, 0.24],
    [OCARINA_NOTES.E5, 1.12],
    [OCARINA_NOTES.A5, 0.52],
    [OCARINA_NOTES.D5, 0.82],
    [OCARINA_NOTES.F5, 0.24],
    [OCARINA_NOTES.G5, 0.24],
    [OCARINA_NOTES.A5, 0.78],
    [OCARINA_NOTES.D5, 0.48],
    [OCARINA_NOTES.C6, 0.44],
    [OCARINA_NOTES.Bb5, 0.24],
    [OCARINA_NOTES.A5, 0.28],
    [OCARINA_NOTES.G5, 0.38],
    [OCARINA_NOTES.F5, 0.48],
    [OCARINA_NOTES.D5, 1.25],
  ],
  lullaby: [
    [OCARINA_NOTES.B5, 0.58],
    [OCARINA_NOTES.D6, 0.32],
    [OCARINA_NOTES.A5, 0.88],
    [OCARINA_NOTES.G5, 0.28],
    [OCARINA_NOTES.A5, 0.28],
    [OCARINA_NOTES.B5, 0.58],
    [OCARINA_NOTES.D6, 0.32],
    [OCARINA_NOTES.A5, 1.35],
  ],
  time: [
    [OCARINA_NOTES.A5, 0.56],
    [OCARINA_NOTES.D5, 1.02],
    [OCARINA_NOTES.F5, 0.48],
    [OCARINA_NOTES.A5, 0.56],
    [OCARINA_NOTES.D5, 1.02],
    [OCARINA_NOTES.F5, 0.48],
    [OCARINA_NOTES.A5, 0.28],
    [OCARINA_NOTES.C6, 0.28],
    [OCARINA_NOTES.B5, 0.56],
    [OCARINA_NOTES.G5, 0.56],
    [OCARINA_NOTES.F5, 0.28],
    [OCARINA_NOTES.G5, 0.28],
    [OCARINA_NOTES.A5, 0.56],
    [OCARINA_NOTES.D5, 0.56],
    [OCARINA_NOTES.C5, 0.28],
    [OCARINA_NOTES.E5, 0.28],
    [OCARINA_NOTES.D5, 1.28],
  ],
};

// Simple 8-step melodic contour intervals modulated smoothly by telemetry level & slope
const TELEMETRY_PHRASE_OFFSETS = [0, 2, 1, 3, 2, 4, 2, 1];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Maps live chart curve height (normVal 0..1), instantaneous slope (-1..1),
 * and threshold proximity to musical tempo, Dorian note pitch, timbre & gain.
 */
export function computeCurveAudioParams({ normVal = 0.4, slope = 0, nearThreshold = false } = {}) {
  const norm = clamp(Number.isFinite(normVal) ? normVal : 0.4, 0, 1);
  const slopeClamped = clamp(Number.isFinite(slope) ? slope : 0, -1, 1);

  // Rising curve pushes tempo faster; falling/calm segments breathe slower
  const risePush = Math.max(0, slopeClamped) * 0.55;
  const calmPull = Math.max(0, -slopeClamped) * 0.24;
  const drive = clamp(0.48 * norm + risePush - calmPull, 0, 1);

  const bpm = Math.round(92 + drive * 116 + (nearThreshold ? 24 : 0));
  const stepIntervalSec = Number((60 / bpm).toFixed(4));

  const pitchFloat = clamp(norm + Math.max(0, slopeClamped) * 0.16, 0, 1);
  const scaleIdx = Math.min(DORIAN_SCALE.length - 1, Math.round(pitchFloat * (DORIAN_SCALE.length - 1)));
  const baseFreqHz = DORIAN_SCALE[scaleIdx];

  const gainScale = Number(clamp(0.36 + norm * 0.44 + Math.max(0, slopeClamped) * 0.2, 0.32, 1.0).toFixed(3));
  const filterCutoffHz = Math.round(1150 + norm * 1650 + (nearThreshold ? 520 : 0));
  const vibratoHz = Number((nearThreshold ? 7.8 : 5.2 + Math.max(0, slopeClamped) * 1.4).toFixed(2));
  const harmonicMix = Number((nearThreshold ? 0.19 : 0.11 + norm * 0.05).toFixed(3));

  return {
    bpm,
    stepIntervalSec,
    scaleIdx,
    baseFreqHz,
    gainScale,
    filterCutoffHz,
    vibratoHz,
    harmonicMix,
  };
}

/**
 * Computes planetary wind sound parameters from windMs, atmospheric density rho (kg/m³),
 * and rover shelter status. Enforces strict zero wind gain in vacuum (Moon rho = 0).
 */
export function computeWindAudioParams({ windMs = 0, rho = 0, sheltered = false } = {}) {
  if (!Number.isFinite(rho) || rho <= 0.001) {
    return { active: false, windGain: 0, filterFreqHz: 180, q: 1.0 };
  }
  const v = Math.max(0, Number.isFinite(windMs) ? windMs : 0);
  // Square-root perceptual scaling keeps thin Martian winds (rho=0.020) audible vs Earth (1.225)
  const rhoFactor = clamp(Math.sqrt(rho / 0.02) * 0.45, 0.25, 1.0);
  const shelterMult = sheltered ? 0.28 : 1.0;
  const windNorm = clamp(v / 10, 0, 1.25);

  const windGain = Number(clamp((0.024 + windNorm * 0.165) * rhoFactor * shelterMult, 0, 0.22).toFixed(4));
  const filterFreqHz = Math.round(170 + v * 64);
  const q = sheltered ? 1.8 : 3.6;

  return {
    active: true,
    windGain,
    filterFreqHz,
    q,
  };
}

/**
 * Computes acoustic proximity sonar pulse cadence/pitch and wheel traction/slip rumble.
 */
export function computeProximityAudioParams({ targetDist = 40, speed = 0, slipPct = 0 } = {}) {
  const dist = Math.max(0, Number.isFinite(targetDist) ? targetDist : 40);
  const prox = clamp(1 - dist / 48, 0, 1);

  const pingIntervalSec = Number((2.2 - prox * 1.82).toFixed(3));
  const pingFreqHz = Math.round(440 + prox * 440);
  const pingGain = Number((0.016 + prox * 0.052).toFixed(4));

  const absSpeed = Math.abs(Number.isFinite(speed) ? speed : 0);
  const highSlip = absSpeed > 0.25 && (slipPct || 0) >= 30;
  const rumbleIntervalSec = highSlip ? 0.14 : Number(Math.max(0.16, 0.42 - Math.min(8, absSpeed) * 0.025).toFixed(3));
  const slipGain = highSlip ? 0.062 : absSpeed > 0.35 ? 0.018 : 0;
  const slipPitchHz = highSlip ? 148 : 86;

  return {
    proximity: Number(prox.toFixed(3)),
    pingIntervalSec,
    pingFreqHz,
    pingGain,
    highSlip,
    rumbleIntervalSec,
    slipGain,
    slipPitchHz,
  };
}

class GameSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGainNode = null;
    this.compressorNode = null;
    this.windGainNode = null;
    this.windFilterNode = null;
    this.windSourceStarted = false;
    this.breathBuffer = null;

    this.muted = false;
    this.masterVolume = 0.78;
    this.musicEnabled = true;

    this.activeTheme = null;
    this.themeLoopTimer = null;
    this.themeCancelFns = new Set();

    // Adaptive telemetry scheduler timestamps (in AudioContext seconds)
    this.melodyStep = 0;
    this.nextCurveNoteAt = 0;
    this.nextSonarAt = 0;
    this.nextWheelAt = 0;
    this.lastCurveNorm = null;
    this.lastActiveGameAudioAt = 0;
  }

  getState() {
    return {
      muted: this.muted,
      volume: this.masterVolume,
      musicEnabled: this.musicEnabled,
      activeTheme: this.activeTheme,
    };
  }

  setMuted(val) {
    this.muted = Boolean(val);
    this._syncMasterOutput();
    if (this.muted) {
      this.stopMusic();
      this.silenceWind();
    }
  }

  setVolume(val) {
    const clamped = clamp(Number.isFinite(val) ? val : 0.78, 0, 1);
    this.masterVolume = clamped;
    this._syncMasterOutput();
  }

  setMusicEnabled(val) {
    this.musicEnabled = Boolean(val);
    if (!this.musicEnabled) {
      this.stopMusic();
    }
  }

  _syncMasterOutput() {
    if (!this.ctx || !this.masterGainNode) return;
    const now = this.ctx.currentTime;
    const target = this.muted ? 0 : this.masterVolume;
    this.masterGainNode.gain.setTargetAtTime(target, now, 0.03);
  }

  ensureCtx() {
    if (this.muted || typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
        this.compressorNode = this.ctx.createDynamicsCompressor();
        this.compressorNode.threshold.value = -16;
        this.compressorNode.knee.value = 18;
        this.compressorNode.ratio.value = 6;
        this.masterGainNode = this.ctx.createGain();
        this.masterGainNode.gain.value = this.muted ? 0 : this.masterVolume;
        this.compressorNode.connect(this.masterGainNode);
        this.masterGainNode.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _getBreathBuffer(ctx) {
    if (this.breathBuffer) return this.breathBuffer;
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      ch[i] = Math.random() * 2 - 1;
    }
    this.breathBuffer = buf;
    return buf;
  }

  _ensureWindNodes(ctx) {
    if (this.windSourceStarted || !ctx || !this.compressorNode) return;
    try {
      const src = ctx.createBufferSource();
      src.buffer = this._getBreathBuffer(ctx);
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 220;
      filter.Q.value = 3.2;

      const g = ctx.createGain();
      g.gain.value = 0;

      src.connect(filter);
      filter.connect(g);
      g.connect(this.compressorNode);
      src.start();

      this.windFilterNode = filter;
      this.windGainNode = g;
      this.windSourceStarted = true;
    } catch {
      // Ignore Web Audio graph error in constrained environments
    }
  }

  silenceWind() {
    if (!this.ctx || !this.windGainNode) return;
    try {
      this.windGainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
    } catch {
      // Ignore
    }
  }

  /**
   * 12-Hole Transverse Ocarina Synth (Helmholtz cavity):
   * pure sine fundamental + subtle triangle fipple harmonic + 5.5 Hz breath LFO + soft air attack + ADSR.
   */
  playOcarinaNote(
    freq = 587.33,
    duration = 0.5,
    startTimeOffset = 0,
    {
      gain = 0.24,
      vibratoHz = 5.5,
      harmonicMix = 0.12,
      filterCutoffHz = 2600,
      withBreath = true,
      registerCancel = false,
    } = {}
  ) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.compressorNode) return;
    try {
      const now = ctx.currentTime + Math.max(0, startTimeOffset);
      const dur = Math.max(0.09, duration);

      // Ceramic cavity main sine wave
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Subtle triangle fipple harmonic
      const harmonic = ctx.createOscillator();
      harmonic.type = "triangle";
      harmonic.frequency.setValueAtTime(freq, now);
      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(harmonicMix, now);

      // Natural breath vibrato LFO (~5.5 Hz)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(vibratoHz, now);
      lfoGain.gain.setValueAtTime(0.001, now);
      lfoGain.gain.linearRampToValueAtTime(Math.max(2.5, freq * 0.0052), now + Math.min(0.14, dur * 0.45));
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfoGain.connect(harmonic.frequency);

      // Gentle lowpass warmth filter
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(filterCutoffHz, now);

      // ADSR breath envelope
      const env = ctx.createGain();
      const attack = Math.min(0.06, dur * 0.28);
      const releaseAt = Math.max(now + attack + 0.01, now + dur - 0.08);
      env.gain.setValueAtTime(0.0005, now);
      env.gain.linearRampToValueAtTime(gain, now + attack);
      env.gain.setValueAtTime(gain * 0.86, releaseAt);
      env.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.02);

      osc.connect(lp);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(lp);
      lp.connect(env);
      env.connect(this.compressorNode);

      // Subtle ceramic wind-edge air chiff at attack
      let breathSrc = null;
      if (withBreath && dur >= 0.16) {
        breathSrc = ctx.createBufferSource();
        breathSrc.buffer = this._getBreathBuffer(ctx);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.setValueAtTime(Math.min(3400, freq * 2.1), now);
        bp.Q.setValueAtTime(2.5, now);
        const bg = ctx.createGain();
        bg.gain.setValueAtTime(0.0005, now);
        bg.gain.linearRampToValueAtTime(gain * 0.11, now + 0.018);
        bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
        breathSrc.connect(bp);
        bp.connect(bg);
        bg.connect(this.compressorNode);
        breathSrc.start(now);
        breathSrc.stop(now + 0.08);
      }

      osc.start(now);
      harmonic.start(now);
      lfo.start(now);

      const stopAt = now + dur + 0.03;
      osc.stop(stopAt);
      harmonic.stop(stopAt);
      lfo.stop(stopAt);

      if (registerCancel) {
        const cancelFn = () => {
          try {
            const t = ctx.currentTime;
            env.gain.cancelScheduledValues(t);
            env.gain.setTargetAtTime(0.0001, t, 0.025);
            osc.stop(t + 0.09);
            harmonic.stop(t + 0.09);
            lfo.stop(t + 0.09);
          } catch {
            // Ignore already stopped oscillators
          }
        };
        this.themeCancelFns.add(cancelFn);
        osc.onended = () => {
          this.themeCancelFns.delete(cancelFn);
        };
      }
    } catch {
      // Ignore Web Audio scheduling errors
    }
  }

  /**
   * Soft harp/strings arpeggio backing used under the Start Menu Ocarina Title Theme.
   */
  playHarpPadNote(freq = 293.66, duration = 0.85, startTimeOffset = 0, gain = 0.055) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.compressorNode) return;
    try {
      const now = ctx.currentTime + Math.max(0, startTimeOffset);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(980, now);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0005, now);
      env.gain.linearRampToValueAtTime(gain, now + 0.03);
      env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(lp);
      lp.connect(env);
      env.connect(this.compressorNode);
      osc.start(now);
      osc.stop(now + duration + 0.03);

      const cancelFn = () => {
        try {
          const t = ctx.currentTime;
          env.gain.cancelScheduledValues(t);
          env.gain.setTargetAtTime(0.0001, t, 0.02);
          osc.stop(t + 0.08);
        } catch {
          // Ignore
        }
      };
      this.themeCancelFns.add(cancelFn);
      osc.onended = () => {
        this.themeCancelFns.delete(cancelFn);
      };
    } catch {
      // Ignore
    }
  }

  stopMusic() {
    if (this.themeLoopTimer !== null) {
      clearTimeout(this.themeLoopTimer);
      this.themeLoopTimer = null;
    }
    this.activeTheme = null;
    for (const cancel of Array.from(this.themeCancelFns)) {
      cancel();
    }
    this.themeCancelFns.clear();
  }

  playOcarinaSequence(songKey = "title", { loop = false } = {}) {
    if (this.muted || !this.musicEnabled) return false;
    const notes = OCARINA_MELODIES[songKey];
    if (!notes) return false;
    const ctx = this.ensureCtx();
    if (!ctx) return false;

    this.stopMusic();
    this.activeTheme = songKey;

    const schedulePass = () => {
      if (this.muted || !this.musicEnabled || this.activeTheme !== songKey) return;
      let offset = 0.04;
      for (let i = 0; i < notes.length; i += 1) {
        const [freq, dur] = notes[i];
        this.playOcarinaNote(freq, dur, offset, {
          gain: 0.22,
          vibratoHz: 5.5,
          harmonicMix: 0.12,
          filterCutoffHz: 2500,
          withBreath: true,
          registerCancel: true,
        });

        // Layer gentle harp arpeggio notes on title theme
        if (songKey === "title") {
          const chord = TITLE_CHORDS[i < 10 ? 0 : 1];
          const chordFreq = chord[i % chord.length];
          this.playHarpPadNote(chordFreq, dur + 0.45, offset, 0.05);
        }
        offset += dur + 0.045;
      }

      if (loop) {
        this.themeLoopTimer = setTimeout(schedulePass, Math.round((offset + 0.45) * 1000));
      } else {
        this.themeLoopTimer = setTimeout(() => {
          if (this.activeTheme === songKey) this.activeTheme = null;
        }, Math.round((offset + 0.1) * 1000));
      }
    };

    schedulePass();
    return true;
  }

  /**
   * Synchronizes continuous planetary wind, adaptive Ocarina curve-following melody,
   * target proximity sonar, and wheel-slip rumble during active 3D gameplay.
   */
  updateGameplayAudio({
    normVal = 0.4,
    nearThreshold = false,
    windMs = 0,
    rho = 0,
    sheltered = false,
    targetDist = 40,
    speed = 0,
    slipPct = 0,
    paused = false,
    status = "playing",
  } = {}) {
    if (this.muted || paused || status !== "playing") {
      this.silenceWind();
      return;
    }

    const ctx = this.ensureCtx();
    if (!ctx || !this.compressorNode) return;

    this._ensureWindNodes(ctx);
    const now = ctx.currentTime;

    // 1) Continuous Wind Noise modulated by planetary density rho & windMs & shelter
    const windAudio = computeWindAudioParams({ windMs, rho, sheltered });
    if (this.windFilterNode && this.windGainNode) {
      this.windFilterNode.frequency.setTargetAtTime(windAudio.filterFreqHz, now, 0.12);
      this.windFilterNode.Q.setTargetAtTime(windAudio.q, now, 0.12);
      this.windGainNode.gain.setTargetAtTime(windAudio.windGain, now, 0.14);
    }

    // Estimate instantaneous slope from previous normalized telemetry frame
    const prevNorm = this.lastCurveNorm === null ? normVal : this.lastCurveNorm;
    const slope = clamp((normVal - prevNorm) * 14, -1, 1);
    this.lastCurveNorm = normVal;

    // 2) Adaptive Ocarina Song + Rhythm driven by chart rise/fall & level
    if (this.musicEnabled && this.activeTheme === null && now >= this.nextCurveNoteAt) {
      const curveAudio = computeCurveAudioParams({ normVal, slope, nearThreshold });
      const phraseDelta = TELEMETRY_PHRASE_OFFSETS[this.melodyStep % TELEMETRY_PHRASE_OFFSETS.length];
      const idx = clamp(curveAudio.scaleIdx + Math.round((phraseDelta - 2) * 0.5), 0, DORIAN_SCALE.length - 1);
      const freq = DORIAN_SCALE[idx];
      const noteDur = clamp(curveAudio.stepIntervalSec * 0.86, 0.14, 0.54);

      this.playOcarinaNote(freq, noteDur, 0, {
        gain: 0.125 * curveAudio.gainScale,
        vibratoHz: curveAudio.vibratoHz,
        harmonicMix: curveAudio.harmonicMix,
        filterCutoffHz: curveAudio.filterCutoffHz,
        withBreath: this.melodyStep % 2 === 0,
        registerCancel: false,
      });

      this.melodyStep += 1;
      this.nextCurveNoteAt = now + curveAudio.stepIntervalSec;
    }

    // 3) Target Distance Proximity Sonar & Wheel-Slip Tactile Rumble
    const proxAudio = computeProximityAudioParams({ targetDist, speed, slipPct });
    if (now >= this.nextSonarAt && targetDist < 70) {
      this.playTone({
        freq: proxAudio.pingFreqHz,
        endFreq: proxAudio.pingFreqHz * (proxAudio.proximity > 0.65 ? 1.12 : 1.0),
        duration: 0.11,
        type: "sine",
        gain: proxAudio.pingGain,
      });
      this.nextSonarAt = now + proxAudio.pingIntervalSec;
    }

    if (proxAudio.slipGain > 0 && now >= this.nextWheelAt) {
      this.playTone({
        freq: proxAudio.slipPitchHz,
        endFreq: proxAudio.highSlip ? 95 : 64,
        duration: 0.08,
        type: proxAudio.highSlip ? "sawtooth" : "triangle",
        gain: proxAudio.slipGain,
      });
      this.nextWheelAt = now + proxAudio.rumbleIntervalSec;
    }
  }

  stopAllLoops() {
    this.stopMusic();
    this.silenceWind();
    this.nextCurveNoteAt = 0;
    this.nextSonarAt = 0;
    this.nextWheelAt = 0;
    this.lastCurveNorm = null;
  }

  playTone({ freq = 440, endFreq = null, duration = 0.14, type = "sine", gain = 0.08 } = {}) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.compressorNode) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0005, now + duration);
      osc.connect(g);
      g.connect(this.compressorNode);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Ignore audio errors
    }
  }

  playThrustPulse() {
    const ctx = this.ensureCtx();
    if (!ctx || !this.compressorNode) return;
    try {
      const dur = 0.45;
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 260;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.compressorNode);
      src.start();
    } catch {
      // Ignore audio errors
    }
  }

  playActionClick(kind = "servo") {
    if (kind === "purge") {
      this.playTone({ freq: 720, endFreq: 1180, duration: 0.12, type: "triangle", gain: 0.08 });
      return;
    }
    if (kind === "dock") {
      this.playOcarinaNote(OCARINA_NOTES.A5, 0.24, 0, { gain: 0.18, withBreath: false });
      return;
    }
    this.playTone({ freq: 290, endFreq: 190, duration: 0.09, type: "square", gain: 0.05 });
  }

  playAlertWarning() {
    this.playTone({ freq: 620, endFreq: 490, duration: 0.16, type: "sawtooth", gain: 0.055 });
  }

  playMorphHum() {
    this.playOcarinaNote(OCARINA_NOTES.D5, 0.42, 0, { gain: 0.16 });
  }

  playOutcome(won) {
    this.stopMusic();
    this.silenceWind();
    if (won) {
      this.playOcarinaNote(OCARINA_NOTES.D5, 0.18, 0, { gain: 0.2 });
      this.playOcarinaNote(OCARINA_NOTES.F5, 0.18, 0.15, { gain: 0.2 });
      this.playOcarinaNote(OCARINA_NOTES.A5, 0.22, 0.3, { gain: 0.22 });
      this.playOcarinaNote(OCARINA_NOTES.D6, 0.55, 0.48, { gain: 0.26 });
    } else {
      this.playOcarinaNote(OCARINA_NOTES.F5, 0.22, 0, { gain: 0.2 });
      this.playOcarinaNote(OCARINA_NOTES.E5, 0.22, 0.2, { gain: 0.18 });
      this.playOcarinaNote(OCARINA_NOTES.D5, 0.52, 0.4, { gain: 0.2, vibratoHz: 3.5 });
    }
  }
}

export const soundEngine = new GameSoundEngine();
