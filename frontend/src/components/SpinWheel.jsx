import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function SpinWheel({
  roundNumber,
  selectedTopic,
  selectedIndex,
  spinDuration = 4, // in seconds
  remainingTopics = [],
  onSpinComplete
}) {
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTickSegmentRef = useRef(-1);
  const [selectedBannerText, setSelectedBannerText] = useState('SPINNING THE WHEEL...');
  const [isLanded, setIsLanded] = useState(false);

  // Color palette for wheel segments
  const segmentColors = ['#7c3aed', '#0891b2', '#db2777', '#d97706', '#059669', '#e11d48'];

  // Build segments from remainingTopics (only unused topics are sent by server)
  const topicIcons = {
    'AI Image': '🎨',
    'AI Movie': '🎬',
    'AI Music': '🎵',
    'Text-to-Video': '📹',
    'Meme': '🤪'
  };

  const segments = remainingTopics.map((t, idx) => ({
    name: t.name,
    color: segmentColors[idx % segmentColors.length],
    icon: topicIcons[t.name] || '🎯'
  }));

  // Programmatic synthesizers for audio ticks and bells
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playTick = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.015);
  };

  const playChime = () => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    // Nice game-show success chime
    const playNote = (freq, time, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);
      
      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur);
    };

    playNote(523.25, 0, 0.2); // C5
    playNote(659.25, 0.08, 0.2); // E5
    playNote(783.99, 0.16, 0.35); // G5
  };

  // Easing function: Quartic ease-out
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || segments.length === 0) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2;
    const numSegments = segments.length;
    const segmentAngle = (2 * Math.PI) / numSegments;

    // Draw wheel with only remaining topics
    const drawWheel = (rotationAngle) => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(rotationAngle);

      for (let i = 0; i < numSegments; i++) {
        const angleStart = i * segmentAngle;
        const angleEnd = (i + 1) * segmentAngle;
        const topic = segments[i];

        // Draw Slice
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius - 8, angleStart, angleEnd);
        ctx.closePath();
        ctx.fillStyle = topic.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Text
        ctx.save();
        ctx.rotate(angleStart + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Outfit';
        ctx.fillText(`${topic.icon} ${topic.name}`, radius - 28, 0);
        ctx.restore();
      }
      ctx.restore();
    };

    // Spin animation execution
    let startTime = null;
    const startAngle = 0;
    
    const targetSliceCenterOffset = (selectedIndex * segmentAngle) + (segmentAngle / 2);
    const totalSpins = 8;
    const targetAngle = (totalSpins * 2 * Math.PI) - (Math.PI / 2) - targetSliceCenterOffset;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = Math.min(elapsed / spinDuration, 1);
      const easedProgress = easeOutQuart(progress);
      
      const currentAngle = startAngle + (targetAngle - startAngle) * easedProgress;
      
      drawWheel(currentAngle);

      // Sound Tick
      const pointerAngle = -currentAngle - (Math.PI / 2);
      const normalizedAngle = ((pointerAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const currentSegmentUnderPointer = Math.floor(normalizedAngle / segmentAngle);

      if (currentSegmentUnderPointer !== lastTickSegmentRef.current && progress < 0.95) {
        playTick();
        lastTickSegmentRef.current = currentSegmentUnderPointer;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsLanded(true);
        setSelectedBannerText(`SELECTED: ${selectedTopic.toUpperCase()}`);
        playChime();
        if (onSpinComplete) {
          setTimeout(() => {
            onSpinComplete();
          }, 2000);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedIndex, spinDuration, segments.length]);

  return (
    <div className="container">
      <div className="glass-panel" style={{ maxWidth: '520px', textAlign: 'center' }}>
        <h2 className="round-title-label" style={{ fontSize: '14px', marginBottom: '8px' }}>
          Round {roundNumber} Topic Draw
        </h2>
        <h1 className="lobby-title" style={{ fontSize: '24px', marginBottom: '20px' }}>
          SPIN THE WHEEL FOR ROUND {roundNumber}
        </h1>

        <div className="wheel-outer-wrapper">
          <div className="wheel-pointer"></div>
          <div className="wheel-frame">
            <canvas 
              ref={canvasRef} 
              width={300} 
              height={300} 
              className="wheel-canvas"
            ></canvas>
            <div className="wheel-center-pin"></div>
          </div>
        </div>

        <motion.div 
          className="spin-announcement"
          animate={{ scale: isLanded ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.4 }}
          style={{ color: isLanded ? 'var(--state-success)' : 'var(--primary-purple)' }}
        >
          {selectedBannerText}
        </motion.div>
      </div>
    </div>
  );
}
