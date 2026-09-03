import type { SoundPack } from "../../shared/settings";

interface SoundConfig {
  pack: SoundPack;
  volume: number;
  errorSound: boolean;
}

/**
 * Keypress feedback, synthesised with the Web Audio API rather than shipped as
 * audio files: no assets to bundle, no `media-src` in the CSP, and latency low
 * enough that the sound lands with the keystroke.
 */
export class SoundPlayer {
  private context: AudioContext | undefined;
  private config: SoundConfig = { pack: "off", volume: 0.4, errorSound: true };
  private noise: AudioBuffer | undefined;

  configure(config: SoundConfig): void {
    this.config = config;
  }

  press(correct: boolean): void {
    if (this.config.pack === "off" || this.config.volume <= 0) {
      return;
    }

    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (!correct && this.config.errorSound) {
      this.error(context);
      return;
    }

    switch (this.config.pack) {
      case "click":
        this.click(context, 2200, 0.02);
        break;
      case "typewriter":
        this.click(context, 1100, 0.035);
        this.tone(context, 180, 0.05, "triangle", 0.35);
        break;
      case "beep":
        this.tone(context, 880, 0.045, "sine", 0.5);
        break;
    }
  }

  /** Plays once when a test is completed. */
  finish(): void {
    if (this.config.pack === "off" || this.config.volume <= 0) {
      return;
    }
    const context = this.ensureContext();
    if (!context) {
      return;
    }

    this.tone(context, 660, 0.09, "sine", 0.5);
    window.setTimeout(() => this.tone(context, 990, 0.12, "sine", 0.5), 90);
  }

  private error(context: AudioContext): void {
    this.tone(context, 150, 0.09, "square", 0.5);
  }

  /** A short filtered noise burst: the "mechanical" part of a key press. */
  private click(context: AudioContext, cutoff: number, duration: number): void {
    const source = context.createBufferSource();
    source.buffer = this.ensureNoise(context);

    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = cutoff;

    const gain = context.createGain();
    this.envelope(context, gain, duration, 0.6);

    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + duration);
  }

  private tone(
    context: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType,
    level: number,
  ): void {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const gain = context.createGain();
    this.envelope(context, gain, duration, level);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  /** Fast attack, exponential decay — anything slower sounds like a smear. */
  private envelope(context: AudioContext, gain: GainNode, duration: number, level: number): void {
    const peak = Math.max(0.0001, this.config.volume * level);
    const now = context.currentTime;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  }

  private ensureNoise(context: AudioContext): AudioBuffer {
    if (!this.noise) {
      const length = Math.floor(context.sampleRate * 0.05);
      this.noise = context.createBuffer(1, length, context.sampleRate);
      const channel = this.noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        channel[i] = Math.random() * 2 - 1;
      }
    }
    return this.noise;
  }

  private ensureContext(): AudioContext | undefined {
    if (!this.context) {
      try {
        this.context = new AudioContext();
      } catch {
        return undefined;
      }
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
    return this.context;
  }
}

export const sounds = new SoundPlayer();
