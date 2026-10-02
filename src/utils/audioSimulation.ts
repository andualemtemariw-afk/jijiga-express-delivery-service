/**
 * Audio simulation utility using Web Audio API
 * Generates subtle authentic courier walkie-talkie chimes and speech-like carrier tones
 * for voice notes without relying on external assets.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('Web Audio API not supported or blocked:', e);
    return null;
  }
}

/**
 * Plays a realistic two-tone walkie-talkie squelch / radio chime for voice notes
 */
export function playVoiceNoteChime(type: 'start' | 'stop' | 'radio_burst') {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'start') {
      // Pleasant rising dispatch chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'stop') {
      // Pleasant descending chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      // Radio squelch tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(900, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.16);
    }
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

/**
 * Simulates speech formants during voice note playback
 */
export function playVoiceCarrierSnippet(durationSeconds: number, onEnd?: () => void): () => void {
  const ctx = getAudioContext();
  if (!ctx) {
    const timeout = setTimeout(() => {
      onEnd?.();
    }, durationSeconds * 1000);
    return () => clearTimeout(timeout);
  }

  try {
    playVoiceNoteChime('start');

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.08, now);
    masterGain.connect(ctx.destination);

    // Warm carrier tones simulating speech formant modulation
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(220, now);
    osc2.frequency.setValueAtTime(440, now);

    // Filter to make it sound like telephony / radio voice band (300Hz - 3400Hz)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1100, now);
    bandpass.Q.setValueAtTime(1.5, now);

    osc1.connect(bandpass);
    osc2.connect(bandpass);
    bandpass.connect(masterGain);

    const safeDuration = Math.min(durationSeconds, 15);
    osc1.start(now + 0.05);
    osc2.start(now + 0.05);

    // Fade out softly at the end
    masterGain.gain.setValueAtTime(0.08, now + safeDuration - 0.2);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + safeDuration);

    osc1.stop(now + safeDuration);
    osc2.stop(now + safeDuration);

    const timeout = setTimeout(() => {
      playVoiceNoteChime('radio_burst');
      onEnd?.();
    }, safeDuration * 1000);

    return () => {
      clearTimeout(timeout);
      try {
        masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc1.stop(ctx.currentTime + 0.06);
        osc2.stop(ctx.currentTime + 0.06);
      } catch {
        // already stopped
      }
    };
  } catch (e) {
    console.warn('Voice carrier error:', e);
    const timeout = setTimeout(() => onEnd?.(), durationSeconds * 1000);
    return () => clearTimeout(timeout);
  }
}
