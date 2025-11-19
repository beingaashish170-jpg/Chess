/**
 * Lightweight Web Speech API wrapper — speak only in browser.
 * This replaces earlier server-side Google TTS usage with a simple
 * client-side implementation that uses window.speechSynthesis.
 */

export interface SpeechOptions {
  text: string;
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

const hasSpeechSynthesis = (): boolean => {
  return typeof window !== "undefined" && "speechSynthesis" in window;
};

const createUtterance = (opts: SpeechOptions): SpeechSynthesisUtterance => {
  const u = new SpeechSynthesisUtterance(opts.text);
  u.lang = opts.lang || "en-US";
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  u.volume = opts.volume ?? 1;
  return u;
};

const speechService = {
  isSupportedBrowser(): boolean {
    return hasSpeechSynthesis();
  },

  speak(opts: SpeechOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!hasSpeechSynthesis()) {
        const msg = "Speech synthesis is not supported in this browser.";
        console.warn(msg);
        opts.onError?.(msg);
        return reject(new Error(msg));
      }

      try {
        const u = createUtterance(opts);

        u.onstart = () => opts.onStart?.();
        u.onend = () => {
          opts.onEnd?.();
          resolve();
        };
        u.onerror = (ev: any) => {
          const err = ev?.error || "unknown";
          opts.onError?.(String(err));
          reject(new Error(String(err)));
        };

        // Cancel any ongoing speech and speak
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        opts.onError?.(errMsg);
        reject(e);
      }
    });
  },

  stop(): void {
    if (hasSpeechSynthesis()) {
      window.speechSynthesis.cancel();
    }
  },

  pause(): void {
    if (hasSpeechSynthesis() && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  },

  resume(): void {
    if (hasSpeechSynthesis() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  },

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!hasSpeechSynthesis()) return [];
    return window.speechSynthesis.getVoices();
  },

  isSpeakingNow(): boolean {
    if (!hasSpeechSynthesis()) return false;
    return window.speechSynthesis.speaking;
  },
};

export default speechService;
