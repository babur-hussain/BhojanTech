let sharedAudioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
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
  // Three rising tones
  playTone(440, 0.15, volume, 0.0, 'square');
  playTone(550, 0.15, volume, 0.18, 'square');
  playTone(660, 0.3, volume, 0.36, 'square');
}

export function playReadyAlert(volume: number) {
  if (volume === 0) return;
  // Soft two-tone confirmation
  playTone(880, 0.2, volume, 0.0);
  playTone(1100, 0.2, volume, 0.25);
}

export function initAudioOnInteraction() {
  const unlock = () => { getAudioCtx(); };
  window.addEventListener('click', unlock, { once: true });
}
