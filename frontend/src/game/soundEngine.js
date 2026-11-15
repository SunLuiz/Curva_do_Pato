/**
 * Zero-asset procedural Web Audio API synthesizer for Narrative Intro & Rover 3D.
 * Respects mute state and gracefully no-ops in headless/restricted contexts.
 */

class GameSoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  setMuted(val) {
    this.muted = Boolean(val);
  }

  ensureCtx() {
    if (this.muted || typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playTone({ freq = 440, endFreq = null, duration = 0.14, type = "sine", gain = 0.08 } = {}) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
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
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Ignore audio errors
    }
  }

  playThrustPulse() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
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
      g.gain.value = 0.14;
      src.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      src.start();
    } catch {
      // Ignore audio errors
    }
  }

  playActionClick(kind = "servo") {
    if (kind === "purge") {
      this.playTone({ freq: 720, endFreq: 1180, duration: 0.12, type: "triangle", gain: 0.07 });
      return;
    }
    if (kind === "dock") {
      this.playTone({ freq: 380, endFreq: 660, duration: 0.2, type: "sine", gain: 0.09 });
      return;
    }
    this.playTone({ freq: 290, endFreq: 190, duration: 0.09, type: "square", gain: 0.04 });
  }

  playAlertWarning() {
    this.playTone({ freq: 620, endFreq: 490, duration: 0.16, type: "sawtooth", gain: 0.045 });
  }

  playMorphHum() {
    this.playTone({ freq: 180, endFreq: 360, duration: 0.35, type: "sine", gain: 0.06 });
  }

  playOutcome(won) {
    if (won) {
      this.playTone({ freq: 523.25, duration: 0.14, type: "triangle", gain: 0.08 });
      setTimeout(() => this.playTone({ freq: 659.25, duration: 0.16, type: "triangle", gain: 0.08 }), 110);
      setTimeout(() => this.playTone({ freq: 783.99, duration: 0.26, type: "triangle", gain: 0.09 }), 230);
    } else {
      this.playTone({ freq: 310, endFreq: 140, duration: 0.36, type: "sawtooth", gain: 0.06 });
    }
  }
}

export const soundEngine = new GameSoundEngine();
