/**
 * SafeBus Shield - High-Decibel Vehicle Cabin Buzzer Alert System
 * ==============================================================
 * Multi-layer audio playback guaranteed to output directly through laptop speakers:
 *  1. Host System Channel: Sends POST /trigger_buzzer to Python microservice
 *     which plays buzzer_alarm.wav via Windows multimedia API (winsound).
 *  2. HTML5 Audio Channel: Plays /buzzer_alarm.wav via persistent DOM Audio element at 100% volume.
 *  3. Web Audio API Channel: Dual-tone synthesized alarm (900 Hz + 1200 Hz urgent pulses)
 *     with automated AudioContext unlocking.
 * 
 * Rules:
 *  - Strictly 3.0 seconds duration, non-looping.
 *  - Dispatches custom 'safebus-buzzer-state' window event so UI can display live visual indicators.
 */
import { CV_SERVICE_URL } from '../config';

let activeAudioContext = null;
let buzzerActive = false;
let stopTimer = null;
let audioUnlocked = false;
let persistentAudioEl = null;

// Initialize or retrieve persistent HTML5 Audio element
const getAudioElement = () => {
  if (typeof window === 'undefined') return null;
  if (!persistentAudioEl) {
    persistentAudioEl = new Audio('/buzzer_alarm.wav');
    persistentAudioEl.preload = 'auto';
    persistentAudioEl.volume = 1.0;
  }
  return persistentAudioEl;
};

// Auto-unlock AudioContext and HTML5 Audio permissions on first user gesture
export const unlockAudio = () => {
  if (audioUnlocked) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!activeAudioContext) {
        activeAudioContext = new AudioContextClass();
      }
      if (activeAudioContext.state === 'suspended') {
        activeAudioContext.resume().then(() => {
          audioUnlocked = true;
          window.dispatchEvent(new CustomEvent('safebus-audio-unlocked', { detail: { unlocked: true } }));
        }).catch(() => {});
      } else {
        audioUnlocked = true;
        window.dispatchEvent(new CustomEvent('safebus-audio-unlocked', { detail: { unlocked: true } }));
      }
    }

    // Warm up audio element with silent volume
    const audio = getAudioElement();
    if (audio) {
      audio.volume = 0.01;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 1.0;
        }).catch(() => {
          audio.volume = 1.0;
        });
      }
    }
  } catch (_) {}
};

export const isAudioUnlocked = () => audioUnlocked;

if (typeof window !== 'undefined') {
  const onUserInteraction = () => {
    unlockAudio();
    window.removeEventListener('click', onUserInteraction);
    window.removeEventListener('keydown', onUserInteraction);
    window.removeEventListener('touchstart', onUserInteraction);
    window.removeEventListener('pointerdown', onUserInteraction);
  };
  window.addEventListener('click', onUserInteraction, { once: true });
  window.addEventListener('keydown', onUserInteraction, { once: true });
  window.addEventListener('touchstart', onUserInteraction, { once: true });
  window.addEventListener('pointerdown', onUserInteraction, { once: true });
}

export const playAlertBuzzer = (durationSeconds = 3.0) => {
  if (buzzerActive) {
    return false;
  }

  buzzerActive = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('safebus-buzzer-state', { detail: { active: true, duration: durationSeconds } }));
    window.dispatchEvent(new CustomEvent('safebus-buzzer-activated', { detail: { active: true, duration: durationSeconds, timestamp: new Date().toLocaleTimeString() } }));
  }

  // Channel 1: Host Laptop Physical Speakers via Python Windows MultiMedia (winsound)
  try {
    fetch(`${CV_SERVICE_URL}/trigger_buzzer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {});
  } catch (_) {}

  // Channel 2: HTML5 Audio element playing full-volume master buzzer WAV
  try {
    const audioEl = getAudioElement() || new Audio('/buzzer_alarm.wav');
    audioEl.volume = 1.0;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});

    setTimeout(() => {
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch (_) {}
    }, durationSeconds * 1000);
  } catch (_) {}

  // Channel 3: Web Audio API Dual-Tone Pulsing Siren (900 Hz + 1200 Hz)
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const ctx = activeAudioContext && activeAudioContext.state !== 'closed'
        ? activeAudioContext
        : new AudioContextClass();
      activeAudioContext = ctx;

      const runPlayback = () => {
        const now = ctx.currentTime;
        const totalDuration = Math.max(1.0, durationSeconds);

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(900, now);
        osc2.frequency.setValueAtTime(1200, now);

        // 6 rapid alert pulses: 0.35s tone, 0.15s gap
        const pulseLen = 0.35;
        const pauseLen = 0.15;
        const cycle = pulseLen + pauseLen;

        gainNode.gain.setValueAtTime(0, now);
        for (let t = 0; t < totalDuration; t += cycle) {
          const startBeep = now + t;
          const endBeep = Math.min(startBeep + pulseLen, now + totalDuration);
          gainNode.gain.setValueAtTime(0.85, startBeep);
          gainNode.gain.setValueAtTime(0.0, endBeep);
        }
        gainNode.gain.setValueAtTime(0.0, now + totalDuration);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + totalDuration);
        osc2.stop(now + totalDuration);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(runPlayback).catch(() => {});
      } else {
        runPlayback();
      }
    }
  } catch (err) {
    console.warn("[SafeBus Buzzer] Web Audio API playback failed:", err);
  }

  // Strictly reset buzzer active state after durationSeconds
  stopTimer = setTimeout(() => {
    buzzerActive = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('safebus-buzzer-state', { detail: { active: false } }));
    }
  }, durationSeconds * 1000 + 100);

  return true;
};

export const stopAlertBuzzer = () => {
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }
  buzzerActive = false;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('safebus-buzzer-state', { detail: { active: false } }));
  }
};

export const isBuzzerPlaying = () => buzzerActive;
