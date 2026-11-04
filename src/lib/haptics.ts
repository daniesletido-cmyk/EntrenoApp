/**
 * iOS Haptic & Tactile Feedback Engine
 * Proporciona respuesta háptica nativa vía Taptic Engine / Web Audio API
 * para botones, pestañas de navegación y teclados de seguridad en iPhone / PWA.
 */

class HapticEngine {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Genera un pulso micro-acústico sutil en los transductores del altavoz del iPhone
   * que simula un "tap" mecánico nativo de iOS cuando navigator.vibrate no está disponible.
   */
  private playClick(freq = 180, duration = 0.012, gainValue = 0.08) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  light() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(12); } catch {}
    }
    this.playClick(240, 0.008, 0.05);
  }

  medium() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(22); } catch {}
    }
    this.playClick(180, 0.014, 0.08);
  }

  heavy() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(35); } catch {}
    }
    this.playClick(130, 0.022, 0.12);
  }

  selection() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(8); } catch {}
    }
    this.playClick(280, 0.006, 0.04);
  }

  success() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([15, 60, 25]); } catch {}
    }
    this.playClick(220, 0.01, 0.06);
    setTimeout(() => this.playClick(320, 0.012, 0.08), 65);
  }

  warning() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([30, 80, 30]); } catch {}
    }
    this.playClick(160, 0.02, 0.09);
    setTimeout(() => this.playClick(140, 0.02, 0.09), 90);
  }

  error() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([40, 50, 40, 50, 40]); } catch {}
    }
    this.playClick(120, 0.03, 0.12);
    setTimeout(() => this.playClick(100, 0.03, 0.12), 60);
  }
}

export const haptics = new HapticEngine();
