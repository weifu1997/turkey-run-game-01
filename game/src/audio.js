// All sound is synthesized with WebAudio: no audio files, no network, and
// nothing to load. The context is created on the first user gesture, so a
// headless screenshot run never has to make one.

const MELODY = [
  // A cheerful little farm tune, one note a beat, looped quietly while playing.
  [523.25, 0.22], [659.25, 0.22], [783.99, 0.22], [659.25, 0.22],
  [587.33, 0.22], [659.25, 0.22], [523.25, 0.44], [0, 0.22],
  [523.25, 0.22], [659.25, 0.22], [880.0, 0.22], [783.99, 0.22],
  [659.25, 0.22], [587.33, 0.22], [659.25, 0.44], [0, 0.22],
];

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicOn = false;
    this.melodyStep = 0;
    this.nextNoteAt = 0;
  }

  // Call from a click or key press. Safe to call when there is no audio yet.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone(freq, seconds, type = 'sine', volume = 0.25, when = 0, slideTo = 0) {
    if (!this.ctx || !this.master) return;
    const start = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  jump() {
    this.tone(280, 0.16, 'sine', 0.22, 0, 620);
  }

  corn() {
    this.tone(880, 0.09, 'triangle', 0.22);
    this.tone(1318, 0.14, 'triangle', 0.2, 0.07);
  }

  feather() {
    this.tone(1046, 0.1, 'triangle', 0.22);
    this.tone(1318, 0.1, 'triangle', 0.22, 0.08);
    this.tone(1760, 0.18, 'triangle', 0.2, 0.16);
  }

  stumble() {
    this.tone(160, 0.22, 'sawtooth', 0.2, 0, 70);
    this.tone(90, 0.3, 'square', 0.14, 0.02, 50);
  }

  gobble() {
    // The turkey's own voice: a burst of short descending blips.
    let at = 0;
    for (let i = 0; i < 5; i += 1) {
      this.tone(420 - i * 45, 0.07, 'square', 0.16, at);
      at += 0.075;
    }
    this.tone(300, 0.22, 'square', 0.16, at, 140);
  }

  spotted() {
    this.tone(220, 0.12, 'square', 0.2);
    this.tone(330, 0.12, 'square', 0.2, 0.11);
    this.tone(440, 0.2, 'square', 0.22, 0.22);
  }

  hide() {
    this.tone(500, 0.12, 'sine', 0.16, 0, 300);
  }

  caught() {
    [392, 311, 233, 175].forEach((freq, i) => this.tone(freq, 0.28, 'sawtooth', 0.18, i * 0.22));
  }

  escaped() {
    [523, 659, 784, 1046, 1318].forEach((freq, i) => this.tone(freq, 0.22, 'triangle', 0.22, i * 0.11));
  }

  click() {
    this.tone(700, 0.05, 'sine', 0.15);
  }

  startMusic() {
    this.musicOn = true;
    this.melodyStep = 0;
    if (this.ctx) this.nextNoteAt = this.ctx.currentTime + 0.1;
  }

  stopMusic() {
    this.musicOn = false;
  }

  // Called once a frame while playing: schedules the tune's next notes.
  tickMusic() {
    if (!this.ctx || !this.musicOn) return;
    while (this.nextNoteAt < this.ctx.currentTime + 0.25) {
      const [freq, length] = MELODY[this.melodyStep % MELODY.length];
      if (freq > 0) this.tone(freq, length * 0.9, 'triangle', 0.07, this.nextNoteAt - this.ctx.currentTime);
      this.nextNoteAt += length;
      this.melodyStep += 1;
    }
  }
}
