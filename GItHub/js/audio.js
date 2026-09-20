// Web Audio API Synthesizer - Zero external audio file dependencies
class SoundEffectsEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.initUserGesture();
  }

  initUserGesture() {
    const unlock = () => {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1, pitchDecay = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      if (pitchDecay) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.2), this.ctx.currentTime + duration);
      }

      gainNode.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio synthesis note failed", e);
    }
  }

  playKudosChime() {
    if (this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.2, 0.12);
      }, idx * 60);
    });
  }

  playAttackSound(isCritical = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isCritical ? 'sawtooth' : 'square';
      const startFreq = isCritical ? 900 : 600;
      const endFreq = isCritical ? 150 : 200;
      const dur = isCritical ? 0.3 : 0.18;

      osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + dur);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }

  playVictoryFanfare() {
    if (this.isMuted) return;
    const melody = [
      { f: 523.25, d: 0.12 }, // C
      { f: 659.25, d: 0.12 }, // E
      { f: 783.99, d: 0.12 }, // G
      { f: 1046.50, d: 0.35 } // High C
    ];
    let time = 0;
    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.f, 'triangle', note.d, 0.15);
      }, time);
      time += note.d * 1000 + 40;
    });
  }

  playClickSound() {
    this.playTone(800, 'sine', 0.04, 0.05);
  }

  playErrorSound() {
    this.playTone(180, 'sawtooth', 0.2, 0.15, true);
  }

  playSuccessSound() {
    this.playTone(880, 'sine', 0.1, 0.08);
    setTimeout(() => this.playTone(1320, 'sine', 0.18, 0.08), 80);
  }
}

window.soundFX = new SoundEffectsEngine();
