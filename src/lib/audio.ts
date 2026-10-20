// src/lib/audio.ts
export function playBeep(frequency = 880, duration = 0.15, type: OscillatorType = 'sine') {
    if (typeof window === 'undefined') return;
    
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
  
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
  
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  
    osc.connect(gain);
    gain.connect(ctx.destination);
  
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }