import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CountdownTimer({ seconds }) {
  // Web Audio Synth for game show countdown sound effects
  useEffect(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
      };

      if (seconds > 0) {
        // Standard beep
        playTone(660, 0.12);
      } else if (seconds === 0) {
        // High-pitched launch tone
        playTone(990, 0.4);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by browser policy:', e.message);
    }
  }, [seconds]);

  // Calculate svg circle dash offsets for visual countdown ring
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (seconds / 5) * circumference;

  return (
    <div className="container">
      <div className="countdown-screen">
        <h2 className="glow-text-pink" style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '18px' }}>
          Get Ready!
        </h2>
        
        <div className="countdown-radial-box">
          <svg className="countdown-circle-svg" width="200" height="200">
            <circle
              cx="100"
              cy="100"
              r={radius}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="6"
              fill="transparent"
            />
            <motion.circle
              cx="100"
              cy="100"
              r={radius}
              stroke="var(--primary-purple)"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.8, ease: 'linear' }}
            />
          </svg>
          
          <AnimatePresence mode="wait">
            <motion.span 
              key={seconds}
              className="countdown-number"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {seconds > 0 ? seconds : 'GO'}
            </motion.span>
          </AnimatePresence>
        </div>

        <p className="glow-text" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          THE TOURNAMENT IS STARTING
        </p>
      </div>
    </div>
  );
}
