/**
 * Gentle synthesized sound effects (no audio files).
 * Everything is built from oscillators and filtered noise on demand.
 */
export class SoundKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this._noise = null;
    /** MediaStream destination so recordings can include the sounds. */
    this.streamDest = null;
  }

  /** Create the AudioContext lazily, after a user gesture. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.32 : 0;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    try {
      this.streamDest = this.ctx.createMediaStreamDestination();
      comp.connect(this.streamDest);
    } catch {
      this.streamDest = null;
    }
    // Two seconds of pre-baked white noise for splashes and whooshes.
    const len = this.ctx.sampleRate * 2;
    this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this._noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.32 : 0, t, 0.05);
  }

  get audioTrack() {
    return this.streamDest?.stream.getAudioTracks()[0] || null;
  }

  _tone({ type = 'sine', from = 440, to = from, dur = 0.2, gain = 0.4, delay = 0, curve = 'exp', attack = 0.005 }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noiseBurst({ dur = 0.15, gain = 0.3, freq = 1800, q = 0.8, type = 'bandpass', delay = 0, sweepTo = null }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this._noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
  }

  play(name, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const v = opts.volume ?? 1;
    switch (name) {
      case 'pick': // soft two-note plink
        this._tone({ from: 660, to: 720, dur: 0.09, gain: 0.25 * v });
        this._tone({ from: 880, to: 990, dur: 0.14, gain: 0.22 * v, delay: 0.08 });
        break;
      case 'grab': // little squeeze
        this._tone({ type: 'triangle', from: 380, to: 300, dur: 0.12, gain: 0.18 * v });
        break;
      case 'lift':
        this._noiseBurst({ dur: 0.35, gain: 0.06 * v, freq: 600, sweepTo: 2400, q: 1.2 });
        break;
      case 'dip': // bloop + splash
        this._tone({ from: 320, to: 140, dur: 0.22, gain: 0.3 * v });
        this._noiseBurst({ dur: 0.28, gain: 0.12 * v, freq: 2200, q: 0.6, delay: 0.02 });
        break;
      case 'drip':
        this._tone({ from: 1500 + Math.random() * 600, to: 900, dur: 0.07, gain: 0.12 * v });
        break;
      case 'bite': // thump + crunch-less soft "nom"
        this._tone({ from: 150, to: 70, dur: 0.16, gain: 0.5 * v });
        this._noiseBurst({ dur: 0.08, gain: 0.18 * v, freq: 900, q: 0.5, type: 'lowpass' });
        this._tone({ type: 'triangle', from: 230, to: 210, dur: 0.32, gain: 0.12 * v, delay: 0.14, attack: 0.05 });
        break;
      case 'yum': // little contented hum
        this._tone({ type: 'triangle', from: 280, to: 330, dur: 0.22, gain: 0.1 * v, delay: 0, attack: 0.05 });
        this._tone({ type: 'triangle', from: 330, to: 300, dur: 0.3, gain: 0.1 * v, delay: 0.2, attack: 0.05 });
        break;
      case 'gulp':
        this._tone({ from: 420, to: 160, dur: 0.16, gain: 0.25 * v });
        this._tone({ from: 700, to: 1200, dur: 0.1, gain: 0.08 * v, delay: 0.15 });
        break;
      case 'gasp': // tiny surprised blips from the audience
        this._tone({ from: 1100, to: 1500, dur: 0.06, gain: 0.07 * v, delay: opts.delay || 0 });
        break;
      case 'boing':
        this._tone({ from: 220, to: 520, dur: 0.12, gain: 0.22 * v, curve: 'lin' });
        this._tone({ from: 520, to: 260, dur: 0.22, gain: 0.18 * v, delay: 0.11, curve: 'lin' });
        break;
      case 'hop':
        this._tone({ from: 500, to: 760, dur: 0.07, gain: 0.05 * v });
        break;
      case 'refill': // gentle chord arpeggio
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this._tone({ type: 'triangle', from: f, dur: 0.35, gain: 0.12 * v, delay: i * 0.07, attack: 0.02 })
        );
        break;
      case 'click':
        this._tone({ from: 900, to: 700, dur: 0.04, gain: 0.08 * v });
        break;
      case 'shutter':
        this._noiseBurst({ dur: 0.05, gain: 0.1 * v, freq: 3000, q: 1 });
        this._tone({ from: 1200, to: 800, dur: 0.06, gain: 0.08 * v, delay: 0.05 });
        break;
      default:
        break;
    }
  }
}
