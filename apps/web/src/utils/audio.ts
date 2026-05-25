let sharedAudioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
}

/**
 * Ensure the AudioContext is in 'running' state before playing.
 * Returns a promise that resolves when ready.
 */
async function ensureAudioReady(): Promise<AudioContext> {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('[Audio] Failed to resume AudioContext:', e);
    }
  }
  return ctx;
}

export function playTone(
  freq: number,
  duration: number,
  volume: number,
  delay = 0,
  type: OscillatorType = 'sine'
) {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

export function playNewOrderAlert(volume: number) {
  if (volume === 0) return;

  // Ensure audio context is running before attempting playback
  ensureAudioReady().then(() => {
    // Three rising tones — urgent, attention-grabbing
    playTone(440, 0.15, volume, 0.0, 'square');
    playTone(550, 0.15, volume, 0.18, 'square');
    playTone(660, 0.3, volume, 0.36, 'square');

    // Repeat the alert after a short pause for maximum noticeability
    playTone(440, 0.15, volume, 0.8, 'square');
    playTone(550, 0.15, volume, 0.98, 'square');
    playTone(660, 0.3, volume, 1.16, 'square');
  });
}

export function playReadyAlert(volume: number) {
  if (volume === 0) return;
  // Soft two-tone confirmation
  playTone(880, 0.2, volume, 0.0);
  playTone(1100, 0.2, volume, 0.25);
}

/**
 * Aggressively unlock AudioContext on ANY user interaction.
 * Modern browsers (Chrome, Safari, especially on POS tablets)
 * require a user gesture before audio can play.
 *
 * We listen on multiple events and do NOT use { once: true }
 * because the AudioContext can re-suspend after the tab
 * goes to background and comes back.
 */
export function initAudioOnInteraction() {
  const unlock = () => {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(console.error);
    }
  };

  // Listen on ALL interaction types — never { once: true } because
  // the AudioContext can get re-suspended after tab sleep
  window.addEventListener('click', unlock);
  window.addEventListener('touchstart', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);

  // Also try to unlock when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      unlock();
    }
  });
}
