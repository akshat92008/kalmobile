// Procedural Web Audio API synthesizer for Black Myth: Wukong — Ashen Mandate
import {
  FoleyMaterialKind,
  computeMaterialFoleySpec,
  computeSpatialAudioPanAndGain,
} from './particleAndAudioEngine';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private swingBuffers: { light: AudioBuffer | null; heavy: AudioBuffer | null } = {
    light: null,
    heavy: null,
  };
  public muted: boolean = false;
  public musicEnabled: boolean = true;
  private musicTimer: number | null = null;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getSwingBuffer(ctx: AudioContext, weight: 'light' | 'heavy'): AudioBuffer {
    const cached = this.swingBuffers[weight];
    if (cached && cached.sampleRate === ctx.sampleRate) {
      return cached;
    }
    const bufferSize = Math.floor(ctx.sampleRate * (weight === 'heavy' ? 0.24 : 0.12));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    this.swingBuffers[weight] = buffer;
    return buffer;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (mute) {
      this.stopMusic();
    } else if (this.musicEnabled) {
      this.startMusic();
    }
  }

  public playSwing(weight: 'light' | 'heavy' = 'light') {
    this.playWavSfx(
      SoundEngine.SFX_FILES.combatPunch,
      weight === 'heavy' ? 0.34 : 0.22,
      weight === 'heavy' ? 0.86 : 1.04
    );
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchVar = 0.92 + Math.random() * 0.16;

    // Reuse cached noise buffer for staff air whoosh (avoids per-swing Float32Array allocation)
    const buffer = this.getSwingBuffer(ctx, weight);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime((weight === 'heavy' ? 320 : 540) * pitchVar, now);
    filter.frequency.exponentialRampToValueAtTime((weight === 'heavy' ? 140 : 220) * pitchVar, now + (weight === 'heavy' ? 0.22 : 0.11));
    filter.Q.value = 2.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(weight === 'heavy' ? 0.22 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (weight === 'heavy' ? 0.24 : 0.12));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    noise.start(now);
  }

  public playHit(type: 'light' | 'heavy' | 'crit' | 'execute' = 'light') {
    this.playWavSfx(
      SoundEngine.SFX_FILES.bloodImpact,
      type === 'execute' ? 0.48 : type === 'heavy' || type === 'crit' ? 0.36 : 0.24,
      type === 'execute' ? 0.85 : type === 'heavy' ? 0.92 : 1.02
    );
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchVar = 0.93 + Math.random() * 0.14;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === 'light' ? 'triangle' : 'sawtooth';

    const startFreq = type === 'execute' ? 190 : type === 'heavy' ? 150 : type === 'crit' ? 240 : 125;
    const dur = type === 'execute' ? 0.38 : type === 'heavy' ? 0.26 : 0.12;

    osc.frequency.setValueAtTime(startFreq * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + dur);

    gain.gain.setValueAtTime(type === 'light' ? 0.16 : 0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);

    if (type !== 'light') {
      // Deep 45Hz-68Hz Sub-Bass Seismic Rumble for Heavy Parashu Slams & Executions
      const subBass = ctx.createOscillator();
      const subGain = ctx.createGain();
      subBass.type = 'sine';
      const subDur = type === 'execute' ? 0.48 : 0.34;
      subBass.frequency.setValueAtTime(type === 'execute' ? 68 : 58, now);
      subBass.frequency.exponentialRampToValueAtTime(28, now + subDur);
      subGain.gain.setValueAtTime(type === 'execute' ? 0.38 : 0.28, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + subDur);
      subBass.connect(subGain);
      subGain.connect(ctx.destination);
      subBass.start(now);
      subBass.stop(now + subDur);

      // Metallic bronze-iron ring overtone for Bloodforged Parashu Axe
      const ring = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime((type === 'execute' ? 580 : 440) * pitchVar, now);
      ring.frequency.exponentialRampToValueAtTime(220, now + dur * 1.2);
      ringGain.gain.setValueAtTime(0.12, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 1.2);
      ring.connect(ringGain);
      ringGain.connect(ctx.destination);
      ring.start(now);
      ring.stop(now + dur * 1.2);
    }
  }

  public playSpell(spell: 'immobilize' | 'parry' | 'clones' | 'gourd' | 'dodge' | 'transform') {
    if (spell === 'dodge') {
      this.playWavSfx(SoundEngine.SFX_FILES.dodgeJump, 0.26, 1.06);
    } else if (spell === 'transform') {
      this.playWavSfx(SoundEngine.SFX_FILES.ominousDrums, 0.38, 0.94);
    }
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (spell === 'immobilize') {
      // Golden singing bowl chord (定身术)
      [528, 792, 1056].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        gain.gain.setValueAtTime(0.11 / (idx + 1), now + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + 0.56);
      });
    } else if (spell === 'parry') {
      // Rock Solid (铜头铁臂) bronze gong impact
      [220, 330, 660].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.45);
        gain.gain.setValueAtTime(0.16 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
      });
    } else if (spell === 'clones') {
      // A Pluck of Many (身外身法) ascending pentatonic harp
      [293.66, 329.63, 392.0, 440.0, 587.33].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        gain.gain.setValueAtTime(0.11, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.34);
      });
    } else if (spell === 'gourd') {
      // Healing Gourd (九转紫金葫) warm harmonic chime
      [392, 587.33, 784].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.1, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + 0.46);
      });
    } else if (spell === 'dodge') {
      this.playWavSfx(SoundEngine.SFX_FILES.dodgeJump, 0.30, 1.12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.14);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (spell === 'transform') {
      [110, 165, 220, 440].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.6);
        gain.gain.setValueAtTime(0.09 / (idx + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.64);
      });
    }
  }

  public playTelegraph() {
    this.playWavSfx(SoundEngine.SFX_FILES.ominousDrums, 0.24, 1.1);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.28);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playGong(type: 'chamber' | 'victory' | 'defeat') {
    if (type === 'victory') {
      this.playWavSfx(SoundEngine.SFX_FILES.levelCompleted, 0.45, 1.0);
    } else if (type === 'defeat') {
      this.playWavSfx(SoundEngine.SFX_FILES.playerDefeat, 0.46, 0.96);
    } else {
      this.playWavSfx(SoundEngine.SFX_FILES.ominousDrums, 0.36, 1.0);
    }
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs =
      type === 'victory'
        ? [196, 293.66, 392, 587.33]
        : type === 'defeat'
        ? [146.83, 130.81, 98]
        : [146.83, 220, 293.66];

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.14 / (i + 1), now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + 1.15);
    });
  }

  public static readonly BGM_TRACKS = {
    beforeIronGate: '/assets/aistudio/Before_the_Iron_Gate.mp3',
    ironChariotsOfTheSun: '/assets/aistudio/Iron_Chariots_of_the_Sun.mp3',
    whereBronzeGodsWeep: '/assets/aistudio/Where_Bronze_Gods_Weep.mp3',
    judgmentAtRuinedGate: '/assets/aistudio/Judgment_at_the_Ruined_Gate.mp3',
    mahadevaRising: '/assets/aistudio/Ma_de_va_Rising.mp3',
    titansFinalStride: '/assets/aistudio/The_Titan_s_Final_Stride.mp3',
  } as const;

  public static readonly SFX_FILES = {
    combatPunch: '/audio/sfx/mixkit-martial-arts-fast-punch-2047.wav',
    bloodImpact: '/audio/sfx/mixkit-game-blood-pop-slide-2363.wav',
    ominousDrums: '/audio/sfx/mixkit-ominous-drums-227.wav',
    levelCompleted: '/audio/sfx/mixkit-game-level-completed-2059.wav',
    playerDefeat: '/audio/sfx/mixkit-player-losing-or-failing-2042.wav',
    dodgeJump: '/audio/sfx/mixkit-player-jumping-in-a-video-game-2043.wav',
  } as const;

  private sfxPool: Map<string, HTMLAudioElement[]> = new Map();

  private playWavSfx(url: string, volume: number = 0.3, playbackRate: number = 1.0) {
    if (this.muted || typeof window === 'undefined') return;
    try {
      let pool = this.sfxPool.get(url);
      if (!pool) {
        pool = [];
        this.sfxPool.set(url, pool);
      }
      let audio = pool.find((a) => a.paused || a.ended);
      if (!audio && pool.length < 4) {
        audio = new Audio(url);
        audio.preload = 'auto';
        pool.push(audio);
      }
      if (audio) {
        audio.currentTime = 0;
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.playbackRate = Math.max(0.5, Math.min(1.6, playbackRate * (0.94 + Math.random() * 0.12)));
        audio.play().catch(() => {});
      }
    } catch {
      // Ignore audio element errors in restricted contexts
    }
  }

  private trackDeck: Map<
    string,
    {
      audio: HTMLAudioElement;
      currentVol: number;
      targetVol: number;
      failed: boolean;
    }
  > = new Map();

  private activeTrackUrl: string = SoundEngine.BGM_TRACKS.beforeIronGate;
  private activeBaseVolume: number = 0.4;
  private duckMultiplier: number = 1.0;
  private customBgmUrl: string | null = null;
  private faderInterval: number | null = null;
  private currentContextMode: 'title' | 'prologue' | 'shrine' | 'playing' | 'paused' | 'victory' | 'defeat' | 'look' = 'title';
  private currentChamberId: number = 1;
  private currentIsBoss: boolean = false;
  private unlockListenersBound: boolean = false;

  private ensureUnlockListeners() {
    if (this.unlockListenersBound || typeof window === 'undefined') return;
    this.unlockListenersBound = true;

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.muted && this.musicEnabled) {
        this.ensureTrackPlaying(this.activeTrackUrl);
      }
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('pointermove', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  private getOrCreateTrack(url: string) {
    let entry = this.trackDeck.get(url);
    if (!entry && typeof window !== 'undefined') {
      const audio = new Audio(url);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
      const newEntry = {
        audio,
        currentVol: 0,
        targetVol: 0,
        failed: false,
      };
      audio.addEventListener('error', () => {
        newEntry.failed = true;
      });
      this.trackDeck.set(url, newEntry);
      entry = newEntry;
    }
    return entry;
  }

  public preloadAllSoundtracks() {
    if (typeof window === 'undefined') return;
    this.ensureUnlockListeners();
    Object.values(SoundEngine.BGM_TRACKS).forEach((url) => {
      this.getOrCreateTrack(url);
    });
    Object.values(SoundEngine.SFX_FILES).forEach((url) => {
      if (!this.sfxPool.has(url)) {
        const a = new Audio(url);
        a.preload = 'auto';
        this.sfxPool.set(url, [a]);
      }
    });
    this.ensureFaderLoop();
  }

  private ensureTrackPlaying(url: string) {
    if (this.muted || !this.musicEnabled || typeof window === 'undefined') return;
    const entry = this.getOrCreateTrack(url);
    if (!entry || entry.failed) return;
    if (entry.audio.paused) {
      entry.audio.volume = Math.max(0, Math.min(1, entry.currentVol));
      entry.audio.play().catch(() => {
        // Autoplay blocked until first interaction; unlock listener will start it smoothly
      });
    }
  }

  private resolveTrackForState(
    mode: 'title' | 'prologue' | 'shrine' | 'playing' | 'paused' | 'victory' | 'defeat' | 'look',
    chamberId: number,
    isBoss: boolean
  ): { url: string; baseVol: number; duck: number } {
    if (this.customBgmUrl) {
      return {
        url: this.customBgmUrl,
        baseVol: 0.42,
        duck: mode === 'paused' ? 0.35 : mode === 'look' ? 0.14 : 1.0,
      };
    }

    if (mode === 'title' || mode === 'prologue') {
      return { url: SoundEngine.BGM_TRACKS.beforeIronGate, baseVol: 0.40, duck: 1.0 };
    }
    if (mode === 'shrine') {
      return { url: SoundEngine.BGM_TRACKS.beforeIronGate, baseVol: 0.34, duck: 0.85 };
    }
    if (mode === 'defeat') {
      return { url: SoundEngine.BGM_TRACKS.whereBronzeGodsWeep, baseVol: 0.36, duck: 1.0 };
    }
    if (mode === 'victory') {
      return { url: SoundEngine.BGM_TRACKS.mahadevaRising, baseVol: 0.44, duck: 1.0 };
    }

    // Active combat / paused / look inside a chamber — hooked dynamic BGM progression
    const duck = mode === 'paused' ? 0.34 : mode === 'look' ? 0.12 : 1.0;
    if (isBoss || chamberId === 2 || chamberId === 8) {
      return { url: SoundEngine.BGM_TRACKS.titansFinalStride, baseVol: 0.46, duck };
    }
    if (chamberId === 1) {
      return { url: SoundEngine.BGM_TRACKS.ironChariotsOfTheSun, baseVol: 0.42, duck };
    }
    if (chamberId === 3) {
      return { url: SoundEngine.BGM_TRACKS.whereBronzeGodsWeep, baseVol: 0.40, duck };
    }
    if (chamberId <= 5) {
      return { url: SoundEngine.BGM_TRACKS.judgmentAtRuinedGate, baseVol: 0.42, duck };
    }
    if (chamberId === 6) {
      return { url: SoundEngine.BGM_TRACKS.ironChariotsOfTheSun, baseVol: 0.43, duck };
    }
    return { url: SoundEngine.BGM_TRACKS.mahadevaRising, baseVol: 0.44, duck };
  }

  /**
   * Smoothly transitions or ducks BGM without any abrupt stops or jarring cuts.
   */
  public syncBgmState(
    mode: 'title' | 'prologue' | 'shrine' | 'playing' | 'paused' | 'victory' | 'defeat' | 'look',
    chamberId: number = this.currentChamberId,
    isBoss: boolean = this.currentIsBoss
  ) {
    this.currentContextMode = mode;
    this.currentChamberId = chamberId;
    this.currentIsBoss = isBoss;

    this.ensureUnlockListeners();
    const resolved = this.resolveTrackForState(mode, chamberId, isBoss);
    this.activeTrackUrl = resolved.url;
    this.activeBaseVolume = resolved.baseVol;
    this.duckMultiplier = resolved.duck;

    // Update target volumes across all tracks in the deck
    this.trackDeck.forEach((entry, url) => {
      if (url === this.activeTrackUrl && !this.muted && this.musicEnabled) {
        entry.targetVol = this.activeBaseVolume * this.duckMultiplier;
      } else {
        entry.targetVol = 0;
      }
    });

    const activeEntry = this.getOrCreateTrack(this.activeTrackUrl);
    if (activeEntry) {
      activeEntry.targetVol =
        !this.muted && this.musicEnabled ? this.activeBaseVolume * this.duckMultiplier : 0;
    }

    if (!this.muted && this.musicEnabled) {
      this.ensureTrackPlaying(this.activeTrackUrl);
    }
    this.ensureFaderLoop();
  }

  private ensureFaderLoop() {
    if (this.faderInterval !== null || typeof window === 'undefined') return;
    // 50ms smooth crossfader & loop-boundary envelope (~2.2s full crossfade time)
    this.faderInterval = window.setInterval(() => {
      let anyActive = false;

      this.trackDeck.forEach((entry, url) => {
        const isTargetTrack = url === this.activeTrackUrl && !this.muted && this.musicEnabled;
        const desiredBase = isTargetTrack ? this.activeBaseVolume * this.duckMultiplier : 0;

        // Seamless loop tail/head envelope so MP3 looping is never abrupt
        let loopEnvelope = 1.0;
        if (isTargetTrack && !entry.audio.paused && Number.isFinite(entry.audio.duration) && entry.audio.duration > 8) {
          const rem = entry.audio.duration - entry.audio.currentTime;
          const pos = entry.audio.currentTime;
          if (rem < 2.6) {
            loopEnvelope = Math.max(0.18, rem / 2.6);
          } else if (pos < 1.8) {
            loopEnvelope = Math.max(0.18, pos / 1.8);
          }
        }

        entry.targetVol = desiredBase * loopEnvelope;

        // Smooth interpolation step (~2.2 seconds for 0 -> 0.42 crossfade)
        const diff = entry.targetVol - entry.currentVol;
        if (Math.abs(diff) > 0.002) {
          const stepRate = diff > 0 ? 0.011 : 0.013;
          if (Math.abs(diff) <= stepRate) {
            entry.currentVol = entry.targetVol;
          } else {
            entry.currentVol += Math.sign(diff) * stepRate;
          }
        } else {
          entry.currentVol = entry.targetVol;
        }

        const clampedVol = Math.max(0, Math.min(1, entry.currentVol));
        entry.audio.volume = clampedVol;

        if (clampedVol > 0.002) {
          anyActive = true;
          if (isTargetTrack && entry.audio.paused && !this.muted && this.musicEnabled) {
            entry.audio.play().catch(() => {});
          }
        } else if (!isTargetTrack && !entry.audio.paused && entry.targetVol === 0) {
          // Track has completely faded out to 0; pause cleanly without clicking
          entry.audio.pause();
        }
      });

      // Fallback procedural synth ONLY if the active MP3 failed to load
      const activeEntry = this.trackDeck.get(this.activeTrackUrl);
      if (activeEntry?.failed && !this.muted && this.musicEnabled && ! anyActive) {
        this.startFallbackSynth();
      }
    }, 50);
  }

  public setCustomBgmUrl(url: string | null) {
    this.customBgmUrl = url;
    this.syncBgmState(this.currentContextMode, this.currentChamberId, this.currentIsBoss);
  }

  public toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.musicEnabled;
  }

  public startMusic() {
    if (this.muted || !this.musicEnabled || typeof window === 'undefined') return;
    this.preloadAllSoundtracks();
    this.syncBgmState(this.currentContextMode, this.currentChamberId, this.currentIsBoss);
  }

  private startFallbackSynth() {
    if (this.musicTimer !== null || typeof window === 'undefined') return;
    const notes = [146.83, 155.56, 174.61, 196.0, 220.0, 233.08, 261.63, 220.0];
    let step = 0;
    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.musicEnabled) return;
      const activeEntry = this.trackDeck.get(this.activeTrackUrl);
      if (activeEntry && !activeEntry.failed && !activeEntry.audio.paused) return;
      const state = document.body.dataset.state || 'title';
      if (state === 'paused') return;
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const isPlaying = state === 'playing';

      if (step % 2 === 0) {
        const drone = ctx.createOscillator();
        const droneGain = ctx.createGain();
        drone.type = 'triangle';
        drone.frequency.setValueAtTime(73.42, now);
        droneGain.gain.setValueAtTime(0.001, now);
        droneGain.gain.linearRampToValueAtTime(isPlaying ? 0.04 : 0.028, now + 0.22);
        droneGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.55);
        drone.connect(droneGain);
        droneGain.connect(ctx.destination);
        drone.start(now);
        drone.stop(now + 1.6);
      }

      const freq = notes[step % notes.length];
      step++;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isPlaying ? 0.028 : 0.02, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.82);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.86);
    }, 820);
  }

  public stopMusic() {
    // Smoothly ramp all tracks to 0 rather than hard-cutting
    this.trackDeck.forEach((entry) => {
      entry.targetVol = 0;
      if (this.muted || !this.musicEnabled) {
        entry.currentVol = 0;
        entry.audio.volume = 0;
        entry.audio.pause();
      }
    });
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /**
   * Section 35: "The lullaby. Suvarna's tune. Solo female voice or sarangi.
   * It appears in the Mani's hum, in Ila's humming, and in the final walk."
   */
  public playSuvarnaLullaby() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const motif = [293.66, 311.13, 392.0, 349.23, 293.66];
    motif.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.34;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.085, t0 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.5);
    });
  }

  /**
   * Section 35: "The drum. Dundubhi's war-drum is the first thing the player hears
   * and the last thing the Council used to call the families."
   */
  public playDundubhiWarDrum() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.24].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + offset;
      osc.frequency.setValueAtTime(idx === 0 ? 92 : 116, start);
      osc.frequency.exponentialRampToValueAtTime(42, start + 0.32);
      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  /**
   * Section 35: "Look moments. Softly duck BGM and play resonant room tone."
   */
  public playLookRoomTone() {
    // Smoothly duck music rather than cutting it abruptly
    this.syncBgmState('look', this.currentChamberId, this.currentIsBoss);
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(146.83, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.038, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  /**
   * Pillar 3: 2.5D Stereo-Panned & Distance-Attenuated Material Foley Synthesizer
   * Distinguishes Flesh Cleave, Chola Bronze Armor, Obsidian Stone, Golden Parry, and Astral Spell impacts.
   */
  public playSpatialMaterialFoley(
    material: FoleyMaterialKind,
    sourceX: number,
    sourceY: number,
    listenerX: number,
    listenerY: number,
    viewportW: number = 1440
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const spatial = computeSpatialAudioPanAndGain({
      sourceX,
      sourceY,
      listenerX,
      listenerY,
      viewportW,
    });
    const spec = computeMaterialFoleySpec(material);
    const now = ctx.currentTime;
    const pitchJitter = 0.94 + Math.random() * 0.12;

    // StereoPannerNode for 2.5D spatial combat positioning
    const panner =
      typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(spatial.pan, now);
      panner.connect(ctx.destination);
    }
    const targetNode: AudioNode = panner ?? ctx.destination;

    // 1. Fundamental Material Body Oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type =
      material === 'bronze_armor' || material === 'golden_parry'
        ? 'triangle'
        : material === 'flesh_cleave'
        ? 'sawtooth'
        : 'sine';
    osc.frequency.setValueAtTime(spec.fundamentalHz * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(28, spec.subBassHz),
      now + spec.durationSec
    );
    gain.gain.setValueAtTime(0.18 * spatial.gainMultiplier, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + spec.durationSec);
    osc.connect(gain);
    gain.connect(targetNode);
    osc.start(now);
    osc.stop(now + spec.durationSec + 0.02);

    // 2. Metallic / Astral Overtone Ring
    const overtone = ctx.createOscillator();
    const overGain = ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(spec.overtoneHz * pitchJitter, now);
    overtone.frequency.exponentialRampToValueAtTime(
      spec.fundamentalHz * 0.75,
      now + spec.durationSec * 0.9
    );
    overGain.gain.setValueAtTime(
      (material === 'golden_parry' || material === 'bronze_armor' ? 0.14 : 0.07) *
        spatial.gainMultiplier,
      now
    );
    overGain.gain.exponentialRampToValueAtTime(0.001, now + spec.durationSec * 0.95);
    overtone.connect(overGain);
    overGain.connect(targetNode);
    overtone.start(now);
    overtone.stop(now + spec.durationSec);
  }
}

export const soundEngine = new SoundEngine();

