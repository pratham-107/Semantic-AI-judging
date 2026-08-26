// Procedural Web Audio API Sound and Lo-Fi Background Music Generator

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMusicPlaying = false;
  private musicVolume = 0.25;
  private sfxVolume = 0.4;
  private musicInterval: any = null;
  private noteIndex = 0;

  // Catchy, joyful Lo-Fi classroom melody notes (frequencies in Hz)
  // Pentatonic scale: C4, D4, E4, G4, A4, C5, D5, E5, G5
  private melody = [
    { note: 261.63, dur: 0.35 }, // C4
    { note: 329.63, dur: 0.35 }, // E4
    { note: 392.00, dur: 0.35 }, // G4
    { note: 523.25, dur: 0.70 }, // C5
    { note: 440.00, dur: 0.35 }, // A4
    { note: 392.00, dur: 0.35 }, // G4
    { note: 329.63, dur: 0.70 }, // E4
    { note: 293.66, dur: 0.35 }, // D4
    { note: 329.63, dur: 0.35 }, // E4
    { note: 392.00, dur: 0.35 }, // G4
    { note: 440.00, dur: 0.50 }, // A4
    { note: 392.00, dur: 0.50 }, // G4
    { note: 293.66, dur: 0.80 }, // D4
  ];

  private bassline = [
    130.81, // C3
    130.81,
    174.61, // F3
    174.61,
    196.00, // G3
    196.00,
    146.83, // D3
    196.00,
  ];

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play a soft mellow synthesizer tone
  private playSynthTone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.2) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Smooth attack and exponential decay
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainVal * this.musicVolume, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }

  // Background Music Loop
  public toggleBackgroundMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopBackgroundMusic();
      return false;
    } else {
      this.startBackgroundMusic();
      return true;
    }
  }

  public startBackgroundMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.getContext();

    let step = 0;
    this.musicInterval = setInterval(() => {
      if (!this.isMusicPlaying) return;

      // Play melody note
      const m = this.melody[this.noteIndex % this.melody.length];
      this.playSynthTone(m.note, m.dur * 1.2, 'sine', 0.22);
      // Subtle harmony chime
      if (step % 2 === 0) {
        this.playSynthTone(m.note * 1.5, m.dur * 0.8, 'triangle', 0.08);
      }

      // Play soft bass every 2 beats
      if (step % 2 === 0) {
        const bassFreq = this.bassline[(step / 2) % this.bassline.length];
        this.playSynthTone(bassFreq, 0.6, 'triangle', 0.25);
      }

      this.noteIndex = (this.noteIndex + 1) % this.melody.length;
      step++;
    }, 420);
  }

  public stopBackgroundMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public isPlaying(): boolean {
    return this.isMusicPlaying;
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
  }

  // Sound Effects

  // School bell ring (Game start / round end)
  public playSchoolBell() {
    try {
      const ctx = this.getContext();
      const freqs = [587.33, 880.00, 1174.66]; // D5, A5, D6 bell harmonics
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime);

        gain.gain.setValueAtTime(0.3 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2 + i * 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.6);
      });
    } catch {}
  }

  // Correct guess triumph chime
  public playCorrectChime() {
    try {
      const ctx = this.getContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C-E-G-C triumph chord
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.08);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.35 * this.sfxVolume, ctx.currentTime + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.65);
      });
    } catch {}
  }

  // Hot guess sizzle / warm chime
  public playHotGuess() {
    try {
      const ctx = this.getContext();
      const notes = [440, 554.37, 659.25]; // A major chime
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);

        gain.gain.setValueAtTime(0.2 * this.sfxVolume, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.4);
      });
    } catch {}
  }

  // Button click / chalk pop
  public playPop() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15 * this.sfxVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  }
}

export const soundManager = typeof window !== 'undefined' ? new SoundManager() : (null as any);
