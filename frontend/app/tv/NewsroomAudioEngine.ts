// Web Audio API Synthesizer for Authentic Broadcast Newsroom Sounds
// Generates breaking news stinger chimes, control room ambiance, and wire teletype clicks

export class NewsroomAudioEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private teletypeTimer: number | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  // Play authentic broadcast news fanfare stinger (BBC/CNN style 3-tone harmonic chime)
  playBreakingChime() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chords = [
      { freq: 440.0, time: 0.00, dur: 0.22, gain: 0.18 }, // A4
      { freq: 554.37, time: 0.15, dur: 0.24, gain: 0.20 }, // C#5
      { freq: 659.25, time: 0.32, dur: 0.30, gain: 0.22 }, // E5
      { freq: 880.0, time: 0.50, dur: 0.70, gain: 0.25 }, // A5 (high resolve)
    ];

    chords.forEach(({ freq, time, dur, gain }) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      g.gain.setValueAtTime(0.001, now + time);
      g.gain.linearRampToValueAtTime(gain, now + time + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(g);
      g.connect(this.ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  }

  // Subtle teletype sound simulating wire room tickers
  playTeletypeClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + Math.random() * 400, now);

    g.gain.setValueAtTime(0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(g);
    g.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  // Start continuous subtle newsroom studio ambiance
  startAmbience() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || this.ambientGain) return;

    const now = this.ctx.currentTime;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.015, now);

    // Warm studio room tone
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc1.type = 'sine';
    this.ambientOsc1.frequency.setValueAtTime(55, now); // 55Hz subtle room acoustic

    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientOsc2.type = 'triangle';
    this.ambientOsc2.frequency.setValueAtTime(110, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, now);

    this.ambientOsc1.connect(filter);
    this.ambientOsc2.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.ctx.destination);

    this.ambientOsc1.start();
    this.ambientOsc2.start();

    // Random subtle teletype clicks every 2-5 seconds
    if (typeof window !== 'undefined') {
      const clickLoop = () => {
        if (Math.random() > 0.4) {
          this.playTeletypeClick();
        }
        this.teletypeTimer = window.setTimeout(clickLoop, 2000 + Math.random() * 3000);
      };
      this.teletypeTimer = window.setTimeout(clickLoop, 1500);
    }
  }

  stopAmbience() {
    if (this.teletypeTimer && typeof window !== 'undefined') {
      window.clearTimeout(this.teletypeTimer);
      this.teletypeTimer = null;
    }
    try {
      this.ambientOsc1?.stop();
      this.ambientOsc2?.stop();
      this.ambientOsc1?.disconnect();
      this.ambientOsc2?.disconnect();
      this.ambientGain?.disconnect();
    } catch {
      // ignore
    }
    this.ambientGain = null;
    this.ambientOsc1 = null;
    this.ambientOsc2 = null;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAmbience();
    } else {
      this.startAmbience();
    }
  }

  destroy() {
    this.stopAmbience();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
