/**
 * Sonido del juego con Web Audio: efectos y música generados por código (sin archivos ni licencias).
 * Si existe `public/audio/<clave>.mp3` y la clave aparece en `public/audio/manifest.json`,
 * se usa ese archivo en su lugar. La clave de la música es "music".
 */

export type Sfx =
  | "tap"
  | "click"
  | "coin"
  | "upgrade"
  | "milestone"
  | "hire"
  | "unlock"
  | "chest"
  | "gems"
  | "ability"
  | "error";

export const SFX_KEYS: Sfx[] = ["tap", "click", "coin", "upgrade", "milestone", "hire", "unlock", "chest", "gems", "ability", "error"];

/** Mínimo de milisegundos entre dos reproducciones del mismo efecto (evita saturar con muchas ventas). */
const THROTTLE: Partial<Record<Sfx, number>> = { coin: 90, tap: 40, click: 40 };

/** Frecuencia de una nota MIDI. */
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/* Música: progresión Cmaj7 – Am7 – Fmaj7 – G6, a 88 pulsaciones por minuto */
const BPM = 88;
const CHORDS = [
  [60, 64, 67, 71],
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [55, 59, 62, 64],
];
const BASS = [36, 33, 29, 31];
/** Melodía pentatónica: nota por corchea (null = silencio), 8 corcheas por compás. */
const MELODY: (number | null)[][] = [
  [76, null, 79, null, 81, 79, null, 76],
  [72, null, null, 76, null, 74, 72, null],
  [69, null, 72, null, 74, null, 72, 69],
  [71, 74, null, 76, null, null, 74, null],
];

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noise: AudioBuffer | null = null;
  private files = new Map<string, AudioBuffer>();
  private last = new Map<Sfx, number>();
  private musicTimer: number | null = null;
  private musicFile: AudioBufferSourceNode | null = null;
  private nextNote = 0;
  private step = 0;
  private ducked = false;
  private hidden = false;

  settings = { music: true, sfx: true };

  /** Los navegadores solo dejan sonar audio tras un toque: se llama en el primer gesto. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended" && !this.hidden) void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    void this.loadFiles().then(() => this.applyMusic());
  }

  private async loadFiles(): Promise<void> {
    if (!this.ctx) return;
    try {
      const res = await fetch("audio/manifest.json");
      if (!res.ok) return;
      const keys: unknown = await res.json();
      if (!Array.isArray(keys)) return;
      for (const key of keys) {
        if (typeof key !== "string") continue;
        try {
          const buf = await fetch(`audio/${key}.mp3`).then((r) => r.arrayBuffer());
          this.files.set(key, await this.ctx.decodeAudioData(buf));
        } catch {
          /* archivo que falta o no se puede leer: se usa el sonido generado */
        }
      }
    } catch {
      /* sin manifiesto: todo generado por código */
    }
  }

  setMusic(on: boolean): void {
    this.settings.music = on;
    this.applyMusic();
  }

  setSfx(on: boolean): void {
    this.settings.sfx = on;
  }

  /** Silencia todo mientras se ve un anuncio. */
  duck(on: boolean): void {
    this.ducked = on;
    this.applyMusic();
  }

  /** La app pasa a segundo plano o vuelve. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /* ---------- Efectos ---------- */

  play(name: Sfx, volume = 1): void {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx || this.ducked || this.hidden) return;
    const now = performance.now();
    const gap = THROTTLE[name] ?? 0;
    if (gap && now - (this.last.get(name) ?? 0) < gap) return;
    this.last.set(name, now);
    const file = this.files.get(name);
    if (file) {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      g.gain.value = volume;
      src.buffer = file;
      src.connect(g).connect(this.sfxBus);
      src.start();
      return;
    }
    const t = ctx.currentTime + 0.005;
    const v = volume;
    switch (name) {
      case "tap":
        this.tone(t, 520, 0.07, "sine", 0.22 * v, 880);
        break;
      case "click":
        this.tone(t, 1300, 0.035, "triangle", 0.08 * v);
        break;
      case "coin":
        this.tone(t, hz(83), 0.06, "square", 0.05 * v);
        this.tone(t + 0.06, hz(88), 0.16, "square", 0.05 * v);
        break;
      case "upgrade":
        [72, 76, 79].forEach((n, i) => this.tone(t + i * 0.055, hz(n + 12), 0.12, "triangle", 0.12 * v));
        break;
      case "milestone":
        [72, 76, 79, 84].forEach((n, i) => this.tone(t + i * 0.07, hz(n + 12), 0.2, "triangle", 0.13 * v));
        this.sparkle(t + 0.3, v);
        break;
      case "hire":
        [76, 79, 84].forEach((n, i) => this.tone(t + i * 0.08, hz(n), 0.25, "sine", 0.16 * v));
        break;
      case "unlock":
        [60, 64, 67, 72].forEach((n, i) => this.tone(t + i * 0.09, hz(n + 12), 0.16, "square", 0.05 * v));
        [60, 64, 67].forEach((n) => this.tone(t + 0.38, hz(n + 12), 0.5, "triangle", 0.09 * v));
        break;
      case "chest":
        this.whoosh(t, 0.35, 300, 3000, 0.12 * v);
        [79, 84, 88, 91].forEach((n, i) => this.tone(t + 0.3 + i * 0.07, hz(n), 0.22, "triangle", 0.12 * v));
        this.sparkle(t + 0.6, v);
        break;
      case "gems":
        this.sparkle(t, v);
        break;
      case "ability":
        this.whoosh(t, 0.4, 400, 4000, 0.14 * v);
        this.tone(t, 300, 0.4, "sawtooth", 0.05 * v, 1200);
        break;
      case "error":
        this.tone(t, 190, 0.14, "square", 0.06 * v, 130);
        break;
    }
  }

  private tone(t: number, freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, out?: AudioNode): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private sparkle(t: number, v: number): void {
    [96, 100, 103].forEach((n, i) => this.tone(t + i * 0.045, hz(n), 0.12, "sine", 0.07 * v));
  }

  private whoosh(t: number, dur: number, from: number, to: number, gain: number, out?: AudioNode): void {
    const ctx = this.ctx!;
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out ?? this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /* ---------- Música ---------- */

  private applyMusic(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const on = this.settings.music && !this.ducked;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.4);
    if (on && this.musicTimer === null && !this.musicFile) this.startMusic();
  }

  private startMusic(): void {
    const ctx = this.ctx!;
    const file = this.files.get("music");
    if (file) {
      const src = ctx.createBufferSource();
      src.buffer = file;
      src.loop = true;
      src.connect(this.musicBus);
      src.start();
      this.musicFile = src;
      return;
    }
    this.nextNote = ctx.currentTime + 0.1;
    this.step = 0;
    // Programador con margen: cada 25 ms deja preparadas las notas de los próximos 150 ms.
    this.musicTimer = window.setInterval(() => {
      while (this.nextNote < ctx.currentTime + 0.15) {
        this.scheduleStep(this.nextNote, this.step);
        this.nextNote += 60 / BPM / 2;
        this.step++;
      }
    }, 25);
  }

  /** Una corchea de la música: acorde, bajo, melodía, bombo y charles. */
  private scheduleStep(t: number, step: number): void {
    const bar = Math.floor(step / 8) % CHORDS.length;
    const e = step % 8;
    const bus = this.musicBus;
    const beat = 60 / BPM;
    if (e === 0) CHORDS[bar].forEach((n) => this.pad(t, hz(n), beat * 4));
    if (e === 0 || e === 3 || e === 4) this.tone(t, hz(BASS[bar]), beat * 0.9, "triangle", 0.14, undefined, bus);
    if (e === 0 || e === 4) this.tone(t, 110, 0.18, "sine", 0.18, 45, bus);
    if (e % 2 === 1) this.whoosh(t, 0.05, 6000, 9000, 0.025, bus);
    // La melodía entra una vuelta sí y otra no, para que no canse.
    const round = Math.floor(step / (8 * CHORDS.length));
    const note = MELODY[bar][e];
    if (round % 2 === 1 && note !== null) this.tone(t, hz(note), beat * 0.8, "sine", 0.06, undefined, bus);
  }

  private pad(t: number, freq: number, dur: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    f.type = "lowpass";
    f.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.35);
    g.gain.setValueAtTime(0.03, t + dur - 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

/** Instancia única para todo el juego. */
export const sound = new Sound();
