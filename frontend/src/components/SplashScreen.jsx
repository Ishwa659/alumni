import React from 'react';
import { motion } from 'framer-motion';

export default function SplashScreen({ onStart }) {
  return (
    <div className="splash-screen">
      {/* Background image */}
      <div className="splash-bg">
        <img 
          src="/ai_tech_war_splash.png" 
          alt="AI Tech War" 
          className="splash-bg__image"
        />
        <div className="splash-bg__overlay" />
      </div>

      {/* Content overlay */}
      <div className="splash-content">
        <motion.div
          className="splash-badge"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          ALUMNI MEET 2026
        </motion.div>

        <motion.h1
          className="splash-title"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.7, type: 'spring', stiffness: 80 }}
        >
          AI TECH WAR
        </motion.h1>

        <motion.p
          className="splash-tagline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          5 Rounds. Infinite Knowledge. One Champion.
        </motion.p>

        <motion.button
          className="splash-start-btn"
          onClick={onStart}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.5 }}
          whileHover={{ scale: 1.08, boxShadow: '0 0 40px rgba(124, 58, 237, 0.6)' }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="splash-start-btn__icon">⚡</span>
          START
        </motion.button>

        <motion.div
          className="splash-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.5 }}
        >
          Powered by AI &bull; Built for Champions
        </motion.div>
      </div>
    </div>
  );
}
