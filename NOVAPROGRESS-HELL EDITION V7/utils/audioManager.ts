
/* RESPONSIVE NOTES:
   - Singleton for Intro Music (HTML5 Audio).
   - SILENT UI: All SFX methods are empty stubs.
   - Handles fade out on transition.
*/

class AudioManager {
  private music: HTMLAudioElement | null = null;
  private static instance: AudioManager;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public playIntroMusic(url: string, volume: number = 0.25) {
    // Prevent multiple instances
    if (this.music) return;

    try {
      this.music = new Audio(url);
      this.music.loop = true;
      this.music.volume = 0; // Start at 0 for fade in
      
      const playPromise = this.music.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Fade In
            this.fadeVolume(0, volume, 2000);
          })
          .catch((e) => {
            // Fix for "The play() request was interrupted by a call to pause()"
            // This happens when user skips/stops music while it's still loading/starting.
            if (e.name === 'AbortError') return;
            console.warn("Autoplay blocked or network error:", e);
          });
      }
    } catch (e) {
      console.warn("Audio initialization failed:", e);
    }
  }

  public stopIntroMusic() {
    this.fadeOutAndStop(800);
  }

  // STUB: Kept to prevent crashes in components calling playSfx
  public playSfx(key: string) {
    // SILENT UI ENFORCED - No operation
  }

  public fadeOutAndStop(durationMs: number = 1000) {
    if (!this.music) return;

    const startVol = this.music.volume;
    const steps = 20;
    const stepTime = durationMs / steps;
    const volStep = startVol / steps;

    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      if (!this.music) {
        clearInterval(fadeInterval);
        return;
      }

      currentStep++;
      const newVol = Math.max(0, startVol - (volStep * currentStep));
      
      // Safety check: ensure music element still exists before setting volume
      if (this.music) {
        this.music.volume = newVol;
      }

      if (currentStep >= steps || newVol <= 0.01) {
        if (this.music) {
          this.music.pause();
          this.music.src = '';
          this.music = null;
        }
        clearInterval(fadeInterval);
      }
    }, stepTime);
  }

  private fadeVolume(start: number, end: number, duration: number) {
    if (!this.music) return;
    
    const steps = 20;
    const stepTime = duration / steps;
    const volStep = (end - start) / steps;
    let currentStep = 0;

    this.music.volume = start;

    const interval = setInterval(() => {
      if (!this.music) {
        clearInterval(interval);
        return;
      }
      
      currentStep++;
      const newVol = Math.min(1, Math.max(0, start + (volStep * currentStep)));
      
      if (this.music) {
        this.music.volume = newVol;
      }

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepTime);
  }
}

export const audioManager = AudioManager.getInstance();
