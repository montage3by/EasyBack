// Web Audio API Synthesizer for high-precision, low-latency reaction game SFX

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.65;
  private suspenseOsc: OscillatorNode | null = null;
  private suspenseGain: GainNode | null = null;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();

      // Master Dynamics Compressor to prevent clipping during simultaneous multi-tone SFX
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

      // Master Gain Node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (muted) {
      this.stopSuspenseDrone();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Helper to create a quick noise burst transient for snappy percussive hits
   */
  private playNoiseBurst(duration = 0.03, volume = 0.15) {
    if (this.isMuted || !this.ctx || !this.compressor) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(volume * this.volume, this.ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.compressor);

      whiteNoise.start();
    } catch {
      // Audio buffer fallback
    }
  }

  // =========================================================================
  // 1. GAME START & ROUND START SOUND EFFECTS
  // =========================================================================

  /**
   * Distinct Cyber Battle Game Start Sound:
   * Multi-stage energizing battle fanfare with sub-bass drop kick, futuristic
   * frequency riser sweep, and resonant dual-tone battle alert chords.
   */
  public playGameStart() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx || !this.compressor) return;
      const now = ctx.currentTime;

      // 1. Transient sub-bass kick impact
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.24);

      kickGain.gain.setValueAtTime(this.volume * 0.85, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      kickOsc.connect(kickGain);
      kickGain.connect(this.compressor);
      kickOsc.start(now);
      kickOsc.stop(now + 0.32);

      // 2. Futuristic energy riser sweep
      const riserOsc = ctx.createOscillator();
      const riserFilter = ctx.createBiquadFilter();
      const riserGain = ctx.createGain();

      riserOsc.type = 'sawtooth';
      riserOsc.frequency.setValueAtTime(130, now);
      riserOsc.frequency.exponentialRampToValueAtTime(680, now + 0.28);

      riserFilter.type = 'lowpass';
      riserFilter.frequency.setValueAtTime(300, now);
      riserFilter.frequency.exponentialRampToValueAtTime(3200, now + 0.28);
      riserFilter.Q.setValueAtTime(5, now);

      riserGain.gain.setValueAtTime(0.001, now);
      riserGain.gain.linearRampToValueAtTime(this.volume * 0.35, now + 0.18);
      riserGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      riserOsc.connect(riserFilter);
      riserFilter.connect(riserGain);
      riserGain.connect(this.compressor);

      riserOsc.start(now);
      riserOsc.stop(now + 0.38);

      // 3. Crisp electronic duel chord chime (D4: 293.66Hz, A4: 440Hz, D5: 587.33Hz)
      const chord = [293.66, 440, 587.33];
      chord.forEach((freq, idx) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        const start = now + 0.18 + idx * 0.05;

        chordOsc.type = 'triangle';
        chordOsc.frequency.setValueAtTime(freq, start);

        chordGain.gain.setValueAtTime(this.volume * 0.45, start);
        chordGain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

        chordOsc.connect(chordGain);
        chordGain.connect(this.compressor!);

        chordOsc.start(start);
        chordOsc.stop(start + 0.48);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Countdown tick (3... 2... 1...)
   * Rising pitch with resonant percussive electronic rimshot
   */
  public playCountdownTick(count: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx || !this.compressor) return;
      const now = ctx.currentTime;

      // Base pitches: 3 -> 440Hz, 2 -> 554Hz (C#5), 1 -> 659Hz (E5)
      const pitches: Record<number, number> = { 3: 440, 2: 554.37, 1: 659.25 };
      const baseFreq = pitches[count] || 440;

      // Rimshot transient
      this.playNoiseBurst(0.02, 0.18);

      // Tuned resonance ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = count === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.06);

      gain.gain.setValueAtTime(this.volume * 0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Tension Suspense Drone during the unpredictable random delay (0.5s to 10.0s).
   * Low pulsing anticipation heartbeat that heightens competitive adrenaline.
   */
  public startSuspenseDrone() {
    if (this.isMuted) return;
    this.stopSuspenseDrone();

    try {
      const ctx = this.initContext();
      if (!ctx || !this.compressor) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, ctx.currentTime); // Low A1

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      // Pulsing heartbeat LFO
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(2.2, ctx.currentTime); // 2.2 Hz pulse
      lfoGain.gain.setValueAtTime(this.volume * 0.08, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.12, ctx.currentTime + 0.3);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);

      osc.start();
      lfo.start();

      this.suspenseOsc = osc;
      this.suspenseGain = gain;
    } catch {
      // Audio fallback
    }
  }

  public stopSuspenseDrone() {
    if (this.suspenseOsc && this.suspenseGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.suspenseGain.gain.setValueAtTime(this.suspenseGain.gain.value, now);
        this.suspenseGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        this.suspenseOsc.stop(now + 0.06);
      } catch {}
      this.suspenseOsc = null;
      this.suspenseGain = null;
    }
  }

  /**
   * Signal GO!
   * Piercing, instantaneous laser-snap trigger with microsecond attack
   */
  public playSignalGo() {
    this.stopSuspenseDrone();
    if (this.isMuted) return;

    try {
      const ctx = this.initContext();
      if (!ctx || !this.compressor) return;
      const now = ctx.currentTime;

      // Noise click burst for instantaneous sensory trigger
      this.playNoiseBurst(0.035, 0.45);

      // Primary punchy laser chirp (880Hz -> 2200Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(980, now);
      osc1.frequency.exponentialRampToValueAtTime(2400, now + 0.07);

      gain1.gain.setValueAtTime(this.volume * 0.8, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc1.connect(gain1);
      gain1.connect(this.compressor);

      // Secondary bright overtone (1650Hz -> 3300Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1480, now);
      osc2.frequency.exponentialRampToValueAtTime(3200, now + 0.06);

      gain2.gain.setValueAtTime(this.volume * 0.5, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc2.connect(gain2);
      gain2.connect(this.compressor);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.34);
      osc2.stop(now + 0.34);
    } catch {
      // Audio fallback
    }
  }

  // =========================================================================
  // 2. SUCCESS SOUND EFFECTS (ROUND POINT WON & GODLIKE SPEED & VICTORY)
  // =========================================================================

  /**
   * Distinct Success / Round Won Sound:
   * Harmonious, uplifting major chord chime with resonant high shimmer
   * and clean low punch. If reactionMs < 200ms, triggers extra godlike SFX!
   */
  public playSuccess(reactionMs?: number | null) {
    if (this.isMuted) return;
    this.stopSuspenseDrone();

    try {
      const ctx = this.initContext();
      if (!ctx || !this.compressor) return;
      const now = ctx.currentTime;

      const isGodlike = typeof reactionMs === 'number' && reactionMs > 0 && reactionMs < 200;

      // 1. Subtle warm bass confirmation punch
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(180, now);
      subOsc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      subGain.gain.setValueAtTime(this.volume * 0.45, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      subOsc.connect(subGain);
      subGain.connect(this.compressor);
      subOsc.start(now);
      subOsc.stop(now + 0.22);

      // 2. Ascending major arpeggio (C5: 523.25Hz, E5: 659.25Hz, G5: 783.99Hz, C6: 1046.5Hz)
      const arpeggioNotes = isGodlike 
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51] // C5, E5, G5, C6, E6
        : [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6

      arpeggioNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.055;
        const noteDuration = idx === arpeggioNotes.length - 1 ? 0.38 : 0.18;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(this.volume * 0.5, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + noteDuration);

        osc.connect(gain);
        gain.connect(this.compressor!);

        osc.start(start);
        osc.stop(start + noteDuration + 0.05);
      });

      // 3. Extra Godlike Reflex Shimmer (< 200ms)
      if (isGodlike) {
        this.playGodlikeShimmer(now + 0.15);
      }
    } catch {
      // Audio fallback
    }
  }

  /**
   * Alias for playSuccess to ensure full backward compatibility
   */
  public playPointWon(reactionMs?: number | null) {
    this.playSuccess(reactionMs);
  }

  /**
   * Supersonic sonic-boom shimmer when a player achieves sub-200ms speed
   */
  private playGodlikeShimmer(startTime: number) {
    if (!this.ctx || !this.compressor) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2093, startTime); // C7
      osc.frequency.exponentialRampToValueAtTime(1046.5, startTime + 0.35);

      gain.gain.setValueAtTime(this.volume * 0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(startTime);
      osc.stop(startTime + 0.42);
    } catch {}
  }

  /**
   * Match Victory Fanfare
   * Full champion celebration sequence with cascading celebratory fanfare
   */
  public playVictoryFanfare() {
    if (this.isMuted) return;
    this.stopSuspenseDrone();

    try {
      const ctx = this.initContext();
      if (!ctx || !this.compressor) return;
      const now = ctx.currentTime;

      // Multi-note champion sequence: C4, G4, C5, E5, G5, C6 triumph
      const notes = [
        { freq: 261.63, time: 0.0, dur: 0.16 }, // C4
        { freq: 392.00, time: 0.12, dur: 0.16 }, // G4
        { freq: 523.25, time: 0.24, dur: 0.2 }, // C5
        { freq: 659.25, time: 0.38, dur: 0.2 }, // E5
        { freq: 783.99, time: 0.52, dur: 0.25 }, // G5
        { freq: 1046.5, time: 0.70, dur: 0.75 }, // High C6 (sustained victory note)
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + time;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(this.volume * 0.55, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(this.compressor!);

        osc.start(start);
        osc.stop(start + dur + 0.05);
      });
    } catch {
      // Audio fallback
    }
  }

  // =========================================================================
  // 3. FALSE-START SOUND EFFECT
  // =========================================================================

  /**
   * Distinct False-Start Buzzer & Penalty SFX:
   * Harsh, dual-sawtooth tritone discord (130Hz + 184Hz, devil's interval)
   * rapidly modulated with a 28Hz tremolo buzzer rate, accompanied by a
   * sinking downward pitch slide and deep failure thud. Unmistakable penalty feel!
   */
  public playFalseStart() {
    this.stopSuspenseDrone();
    if (this.isMuted) return;

    try {
      const ctx = this.initContext();
      if (!ctx || !this.compressor) return;
      const now = ctx.currentTime;

      // 1. Initial glitch click burst
      this.playNoiseBurst(0.04, 0.4);

      // 2. Dual Sawtooth Tritone Discord (130Hz & 184Hz = Tritone dissonance)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const tritoneGain = ctx.createGain();
      const tritoneFilter = ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      // Pitch plunges downward (failure sensation)
      osc1.frequency.setValueAtTime(155, now);
      osc1.frequency.exponentialRampToValueAtTime(55, now + 0.45);

      osc2.frequency.setValueAtTime(218, now); // tritone interval
      osc2.frequency.exponentialRampToValueAtTime(78, now + 0.45);

      tritoneFilter.type = 'bandpass';
      tritoneFilter.frequency.setValueAtTime(420, now);
      tritoneFilter.frequency.exponentialRampToValueAtTime(160, now + 0.45);
      tritoneFilter.Q.setValueAtTime(3.5, now);

      // Rapid Buzzer Tremolo Modulation (28 Hz)
      const tremolo = ctx.createOscillator();
      const tremoloGain = ctx.createGain();
      tremolo.frequency.setValueAtTime(28, now);
      tremoloGain.gain.setValueAtTime(this.volume * 0.4, now);

      tritoneGain.gain.setValueAtTime(this.volume * 0.85, now);
      tritoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

      tremolo.connect(tremoloGain);
      tremoloGain.connect(tritoneGain.gain);

      osc1.connect(tritoneFilter);
      osc2.connect(tritoneFilter);
      tritoneFilter.connect(tritoneGain);
      tritoneGain.connect(this.compressor);

      osc1.start(now);
      osc2.start(now);
      tremolo.start(now);

      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
      tremolo.stop(now + 0.5);

      // 3. Deep sub-frequency penalty drop
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(95, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

      subGain.gain.setValueAtTime(this.volume * 0.6, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      subOsc.connect(subGain);
      subGain.connect(this.compressor);
      subOsc.start(now);
      subOsc.stop(now + 0.45);
    } catch {
      // Audio fallback
    }
  }

  // =========================================================================
  // 4. UI FEEDBACK SOUNDS
  // =========================================================================

  /**
   * Subtle UI Button Click
   */
  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx || !this.compressor) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.035);

      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  }
}

export const sound = new SoundEngine();
