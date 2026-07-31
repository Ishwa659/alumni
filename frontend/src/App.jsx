import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Brain, Cpu, MessageSquare, Eye, Scale, Users, Zap, Trophy,
  Volume2, VolumeX, Flame, Sparkles, ArrowRight, ArrowLeft,
  Check, X, Radio, Play, Award, HelpCircle
} from 'lucide-react';

const TOPICS = [
  { id: 'nn', name: 'Neural Networks', tag: 'Where the vibes (and gradients) flow', icon: Brain, signal: 3 },
  { id: 'ml', name: 'Machine Learning', tag: "It's learning. We promise.", icon: Cpu, signal: 4 },
  { id: 'llm', name: 'LLMs & Chatbots', tag: 'Definitely not written by one of these', icon: MessageSquare, signal: 5 },
  { id: 'cv', name: 'Computer Vision', tag: 'Teaching pixels to see the light', icon: Eye, signal: 3 },
  { id: 'ethics', name: 'AI Ethics', tag: 'The homework nobody skips anymore', icon: Scale, signal: 2 },
];

const QUESTIONS = {
  nn: [
    { q: "What's the basic computational unit of a neural network called?", options: ['Neuron', 'Byte', 'Node.js', 'Pixel'], correct: 0 },
    { q: 'Which function introduces non-linearity into a neural network?', options: ['Activation function', 'Loss function', 'Cost function', 'Hash function'], correct: 0 },
    { q: 'What algorithm trains networks by propagating error backward through the layers?', options: ['Backpropagation', 'Forward propagation', 'Quicksort', 'Bubble sort'], correct: 0 },
    { q: "What do we call the layers sitting between a network's input and output?", options: ['Hidden layers', 'Ozone layers', 'Middle management', 'Buffer layers'], correct: 0 },
    { q: "What's it called when a model memorizes training data but flops on new data?", options: ['Overfitting', 'Underfitting', 'Overthinking', 'Ghosting'], correct: 0 },
  ],
  ml: [
    { q: 'Which approach trains a model on labeled input-output pairs?', options: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Procrastination'], correct: 0 },
    { q: 'Which approach finds hidden structure in unlabeled data?', options: ['Unsupervised learning', 'Supervised learning', 'Semi-supervised learning', 'Guesswork'], correct: 0 },
    { q: "What's the process of adjusting a model's internal parameters called?", options: ['Training', 'Compiling', 'Formatting', 'Debugging'], correct: 0 },
    { q: 'Which technique curbs overfitting by penalizing large weights?', options: ['Regularization', 'Normalization', 'Compression', 'Deletion'], correct: 0 },
    { q: 'What do we call data held back purely to evaluate a model?', options: ['Test set', 'Training set', 'Backup set', 'Cheat sheet'], correct: 0 },
  ],
  llm: [
    { q: "What does 'GPT' stand for?", options: ['Generative Pre-trained Transformer', 'General Purpose Text', 'Graph Processing Tool', 'Global Prompt Tracker'], correct: 0 },
    { q: 'Which architecture, introduced in 2017, underlies most modern LLMs?', options: ['Transformer', 'Recurrent network', 'Decision tree', 'Spreadsheet'], correct: 0 },
    { q: 'Which mechanism lets a transformer weigh how relevant words are to each other?', options: ['Attention', 'Reflection', 'Compression', 'Indexing'], correct: 0 },
    { q: 'What do we call further training a pretrained model on a narrower dataset?', options: ['Fine-tuning', 'Overclocking', 'Rebooting', 'Downsizing'], correct: 0 },
    { q: 'What term describes an LLM confidently stating something false?', options: ['Hallucination', 'Improvisation', 'Daydreaming', 'Buffering'], correct: 0 },
  ],
  cv: [
    { q: 'Which network type is the go-to for image recognition?', options: ['Convolutional Neural Network', 'Recurrent Neural Network', 'Decision Tree', 'Spreadsheet Network'], correct: 0 },
    { q: "What's it called when an image is split into meaningful regions?", options: ['Image segmentation', 'Image compression', 'Image rotation', 'Image deletion'], correct: 0 },
    { q: 'Which technique locates objects in an image using bounding boxes?', options: ['Object detection', 'Object rejection', 'Object naming', 'Object hoarding'], correct: 0 },
    { q: 'Which CNN operation shrinks the spatial size of feature maps?', options: ['Pooling', 'Stretching', 'Cropping', 'Rendering'], correct: 0 },
    { q: 'Which dataset kickstarted a landmark image-classification competition?', options: ['ImageNet', 'WordNet', 'SkyNet', 'Ethernet'], correct: 0 },
  ],
  ethics: [
    { q: 'What term describes an AI system producing unfair outcomes for certain groups?', options: ['Algorithmic bias', 'Algorithmic charm', 'Data drama', 'Model mood'], correct: 0 },
    { q: "What's it called when we try to understand how a model reached its decision?", options: ['Explainability', 'Guesswork', 'Mind reading', 'Reverse psychology'], correct: 0 },
    { q: "What term describes keeping a human involved in an AI's decision loop?", options: ['Human-in-the-loop', 'Human-on-hold', 'Human-in-denial', 'Human-out-of-office'], correct: 0 },
    { q: 'What do we call do inputs deliberately crafted to trick a model into a wrong answer?', options: ['Adversarial examples', 'Practice questions', 'Pop quizzes', 'Rhetorical questions'], correct: 0 },
    { q: "Which principle is about keeping an AI system's goals matched to human values?", options: ['AI alignment', 'AI branding', 'AI networking', 'AI parking'], correct: 0 },
  ],
};

const BOT_POOL = [
  { name: 'Byte_Sized', avatar: '\u{1F916}' },
  { name: 'Ctrl_Alt_Defeat', avatar: '\u{1F47E}' },
  { name: '404_NotFound', avatar: '\u{1F6F8}' },
  { name: 'OverfitOverlord', avatar: '\u{1F9E0}' },
  { name: 'GradientGary', avatar: '\u{1F3AF}' },
];

const TICKER_MESSAGES = [
  "BREAKING \u2014 local student claims to 'basically be an LLM'",
  '42 neurons fired during the making of this ticker',
  'warning: overconfidence in AI trivia may cause smugness',
  'rumor has it the leaderboard remembers everything',
  'sponsored by caffeine and 47 open browser tabs',
  'this app has zero hallucinations. probably.',
];

const CORRECT_LINES = [
  'Correct \u2014 the machines approve.',
  'Correct \u2014 no notes.',
  'Correct \u2014 you just out-trained a model.',
  'Correct \u2014 certified big brain moment.',
];

const WRONG_LINES = [
  'Incorrect \u2014 even a coin flip beats that.',
  "Incorrect \u2014 that's a hallucination.",
  'Incorrect \u2014 back to the training set with you.',
  'Incorrect \u2014 the bots are judging you.',
];

const TIMEOUT_LINE = "Time's up \u2014 the clock wasn't bluffing.";

const BADGES = [
  { id: 'finisher', name: 'Gradient Descender', desc: 'Completed a full match', icon: Trophy },
  { id: 'streak', name: 'Streak Machine', desc: '3+ correct in a row', icon: Flame },
  { id: 'perfect', name: 'No Hallucinations', desc: 'Perfect 5/5 score', icon: Sparkles },
  { id: 'speed', name: 'Quick Draw', desc: 'Averaged under 7s a question', icon: Zap },
];

const QUESTION_TIME = 15;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildMatchQuestions(topicId) {
  const base = shuffle(QUESTIONS[topicId]);
  return base.map((item) => {
    const withFlag = item.options.map((opt, i) => ({ opt, isCorrect: i === item.correct }));
    const shuffled = shuffle(withFlag);
    return {
      q: item.q,
      options: shuffled.map((o) => o.opt),
      correct: shuffled.findIndex((o) => o.isCorrect),
    };
  });
}

function pickBots() {
  return shuffle(BOT_POOL).slice(0, 2);
}

function SignalBars({ level }) {
  return (
    <span className="at-signal" aria-label={`Signal level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`at-signal-bar${n <= level ? ' at-signal-bar-on' : ''}`}
          style={{ height: `${4 + n * 3}px` }}
        />
      ))}
    </span>
  );
}

function Ticker() {
  const line = TICKER_MESSAGES.concat(TICKER_MESSAGES).join('   \u2022   ');
  return (
    <div className="at-ticker">
      <span className="at-ticker-tag"><Radio size={12} /> LIVE</span>
      <div className="at-ticker-window">
        <div className="at-ticker-track">{line}</div>
      </div>
    </div>
  );
}

function OnAirDot() {
  return (
    <span className="at-onair">
      <span className="at-onair-dot" />
      ON AIR
    </span>
  );
}

export default function AITriviaArena() {
  const [screen, setScreen] = useState('home');
  const [playerName, setPlayerName] = useState('');
  const [topicId, setTopicId] = useState(null);
  const [bots, setBots] = useState([]);
  const [matchQuestions, setMatchQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [timeUsedTotal, setTimeUsedTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [botStatus, setBotStatus] = useState({});
  const [muted, setMuted] = useState(false);

  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const audioCtxRef = useRef(null);
  const getCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((freq, duration, type = 'sine', gainStart = 0.16, delay = 0) => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(gainStart, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  }, [getCtx]);

  const playCorrect = useCallback(() => {
    playTone(523.25, 0.12, 'sine', 0.15, 0);
    playTone(783.99, 0.16, 'sine', 0.15, 0.09);
  }, [playTone]);

  const playWrong = useCallback(() => {
    playTone(220, 0.22, 'sawtooth', 0.1, 0);
    playTone(164.81, 0.28, 'sawtooth', 0.1, 0.08);
  }, [playTone]);

  const playTick = useCallback(() => {
    playTone(880, 0.05, 'square', 0.05, 0);
  }, [playTone]);

  const playBadge = useCallback(() => {
    playTone(523.25, 0.1, 'triangle', 0.14, 0);
    playTone(659.25, 0.1, 'triangle', 0.14, 0.1);
    playTone(987.77, 0.22, 'triangle', 0.16, 0.2);
  }, [playTone]);

  function handleAnswer(index) {
    if (answered) return;
    setAnswered(true);
    setSelected(index);
    const current = matchQuestions[qIndex];
    const isCorrect = index === current.correct;
    setTimeUsedTotal((t) => t + (QUESTION_TIME - timeLeft));
    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setMaxStreak((m) => Math.max(m, next));
        return next;
      });
      setFeedback(pick(CORRECT_LINES));
      playCorrect();
    } else {
      setStreak(0);
      setFeedback(index === null ? TIMEOUT_LINE : pick(WRONG_LINES));
      playWrong();
    }
    setTimeout(() => {
      if (qIndex + 1 < matchQuestions.length) {
        setQIndex((i) => i + 1);
        setSelected(null);
        setAnswered(false);
        setFeedback('');
        setTimeLeft(QUESTION_TIME);
      } else {
        setScreen('results');
      }
    }, 1500);
  }

  // countdown timer during quiz
  useEffect(() => {
    if (screen !== 'quiz' || answered) return undefined;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return undefined;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, timeLeft, answered]);

  // low-time tick sound
  useEffect(() => {
    if (screen === 'quiz' && !answered && timeLeft > 0 && timeLeft <= 4) {
      playTick();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // bot "thinking -> answered" simulation per question
  useEffect(() => {
    if (screen !== 'quiz' || bots.length === 0) return undefined;
    const initial = {};
    bots.forEach((b) => { initial[b.name] = 'thinking'; });
    setBotStatus(initial);
    const timers = bots.map((b) => setTimeout(() => {
      setBotStatus((prev) => ({ ...prev, [b.name]: 'answered' }));
    }, 700 + Math.random() * 2600));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, qIndex, bots]);

  function startQuickMatch() {
    beginMatch(pick(TOPICS).id);
  }

  function goToLobby() {
    setScreen('lobby');
  }

  function beginMatch(id) {
    const ctx = getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    setTopicId(id);
    setBots(pickBots());
    setScreen('matching');
    setTimeout(() => {
      setMatchQuestions(buildMatchQuestions(id));
      setQIndex(0);
      setScore(0);
      setStreak(0);
      setMaxStreak(0);
      setTimeUsedTotal(0);
      setSelected(null);
      setAnswered(false);
      setFeedback('');
      setTimeLeft(QUESTION_TIME);
      setScreen('quiz');
    }, 1700);
  }

  const stats = useMemo(() => ({
    score,
    maxStreak,
    avgTime: matchQuestions.length ? timeUsedTotal / matchQuestions.length : 0,
  }), [score, maxStreak, timeUsedTotal, matchQuestions.length]);

  const earnedBadges = useMemo(() => {
    if (screen !== 'results') return [];
    return BADGES.filter((b) => {
      if (b.id === 'finisher') return true;
      if (b.id === 'streak') return stats.maxStreak >= 3;
      if (b.id === 'perfect') return stats.score === 5;
      if (b.id === 'speed') return stats.avgTime > 0 && stats.avgTime < 7;
      return false;
    });
  }, [screen, stats]);

  useEffect(() => {
    if (screen === 'results' && earnedBadges.length > 0) {
      playBadge();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const leaderboard = useMemo(() => {
    if (screen !== 'results') return [];
    const mock = [
      { name: 'Byte_Sized', score: 4 },
      { name: 'GradientGary', score: 3 },
      { name: 'Ctrl_Alt_Defeat', score: 2 },
    ];
    const entries = [...mock, { name: playerName.trim() || 'Challenger', score, isPlayer: true }];
    return entries.sort((a, b) => b.score - a.score);
  }, [screen, score, playerName]);

  function commentaryLine() {
    if (score === 5) return 'Certified AGI. Ship it.';
    if (score >= 4) return "Suspiciously good. We're watching you.";
    if (score >= 2) return 'Solid \u2014 somewhere between rule-based and revolutionary.';
    return 'Needs more training data. Rewatch a few explainer videos and requeue.';
  }

  const topic = TOPICS.find((t) => t.id === topicId);
  const TopicIcon = topic ? topic.icon : null;
  const currentQuestion = matchQuestions[qIndex];
  const timerPct = (timeLeft / QUESTION_TIME) * 100;
  const timerState = timeLeft <= 4 ? 'danger' : timeLeft <= 8 ? 'warn' : 'ok';

  return (
    <div className="at-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        .at-root {
          --void: #030712;
          --void-card: rgba(17, 24, 39, 0.7);
          --steel: rgba(31, 41, 55, 0.55);
          --steel-hover: rgba(55, 65, 81, 0.8);
          --signal: hsl(263, 90%, 60%);
          --signal-2: hsl(245, 90%, 65%);
          --signal-glow: rgba(124, 92, 255, 0.25);
          --coral: #ff4a6b;
          --coral-glow: rgba(255, 74, 107, 0.25);
          --lime: #10B981;
          --lime-glow: rgba(16, 185, 129, 0.25);
          --cloud: #f9fafb;
          --cloud-dim: #9ca3af;
          position: relative;
          min-height: 100vh;
          background-color: var(--void);
          color: var(--cloud);
          font-family: 'Outfit', sans-serif;
          overflow-x: hidden;
          padding: 24px 16px 48px;
          box-sizing: border-box;
          background-image: 
            radial-gradient(circle at 10% 20%, hsla(263, 70%, 30%, 0.15) 0%, transparent 45%),
            radial-gradient(circle at 90% 80%, hsla(245, 70%, 30%, 0.15) 0%, transparent 45%);
          background-attachment: fixed;
        }

        .at-root *, .at-root *::before, .at-root *::after { box-sizing: border-box; }
        .at-display { font-family: 'Space Grotesk', sans-serif; font-weight: 700; letter-spacing: -0.02em; }
        .at-mono { font-family: 'JetBrains Mono', monospace; }

        /* Background glow effect orbs */
        .at-bg-glow { position: fixed; width: 500px; height: 500px; border-radius: 50%; filter: blur(140px); pointer-events: none; z-index: 0; }
        .at-bg-glow-1 { background: var(--signal); top: -200px; left: -150px; opacity: 0.25; animation: floatOrb 18s ease-in-out infinite alternate; }
        .at-bg-glow-2 { background: var(--coral); bottom: -200px; right: -150px; opacity: 0.15; animation: floatOrb 22s ease-in-out infinite alternate-reverse; }

        @keyframes floatOrb {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-40px) scale(1.15); }
        }

        .at-screen { 
          position: relative; 
          z-index: 1; 
          max-width: 680px; 
          margin: 0 auto; 
          display: flex; 
          flex-direction: column; 
          gap: 24px;
          animation: pageEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes pageEntrance {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .at-topbar { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          width: 100%; 
          padding: 8px 0;
        }

        .at-wordmark { 
          font-family: 'JetBrains Mono', monospace; 
          font-size: 13px; 
          font-weight: 700;
          letter-spacing: 0.35em; 
          color: var(--cloud-dim);
          text-shadow: 0 0 10px rgba(255,255,255,0.1);
        }

        .at-icon-btn {
          width: 40px; 
          height: 40px; 
          border-radius: 12px;
          display: inline-flex; 
          align-items: center; 
          justify-content: center;
          background: var(--void-card); 
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--cloud); 
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          backdrop-filter: blur(12px);
        }
        .at-icon-btn:hover { 
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--signal);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px var(--signal-glow);
        }

        .at-onair { 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
          font-family: 'JetBrains Mono', monospace; 
          font-size: 12px; 
          font-weight: 700;
          letter-spacing: 0.25em; 
          color: var(--coral); 
          margin-bottom: 16px; 
          padding: 6px 14px;
          background: rgba(255, 74, 107, 0.08);
          border: 1px solid rgba(255, 74, 107, 0.2);
          border-radius: 99px;
        }
        .at-onair-dot { 
          width: 8px; 
          height: 8px; 
          border-radius: 50%; 
          background: var(--coral); 
          animation: at-pulse 1.8s ease-out infinite; 
          box-shadow: 0 0 10px var(--coral);
        }
        
        @keyframes at-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,74,107,0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255,74,107,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,74,107,0); }
        }

        .at-hero { 
          text-align: center; 
          padding: 40px 24px; 
          display: flex; 
          flex-direction: column; 
          align-items: center;
          background: var(--void-card);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 32px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        .at-hero-title { 
          font-size: clamp(36px, 8vw, 52px); 
          line-height: 1.05; 
          margin: 0;
          font-weight: 800;
        }
        .at-accent-text { 
          background: linear-gradient(135deg, var(--signal-2), #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .at-hero-tag { 
          color: var(--cloud-dim); 
          font-size: 16px; 
          max-width: 440px; 
          margin: 16px 0 32px; 
          line-height: 1.5;
        }

        .at-hero-form { display: flex; flex-direction: column; align-items: center; gap: 16px; width: 100%; max-width: 400px; }
        
        .at-input {
          width: 100%; 
          padding: 14px 18px; 
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.4); 
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--cloud); 
          font-family: inherit; 
          font-size: 16px;
          outline: none; 
          transition: all 0.25s ease;
        }
        .at-input::placeholder { color: rgba(255, 255, 255, 0.35); }
        .at-input:focus { 
          border-color: var(--signal); 
          box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.15), 0 0 15px var(--signal-glow);
          background: rgba(0, 0, 0, 0.5);
        }

        .at-hero-actions { display: flex; flex-direction: column; gap: 12px; width: 100%; }

        .at-btn {
          display: inline-flex; 
          align-items: center; 
          justify-content: center;
          gap: 10px;
          padding: 14px 24px; 
          border-radius: 14px;
          font-family: inherit; 
          font-weight: 700; 
          font-size: 15px;
          border: 1px solid transparent; 
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
        }
        .at-btn:active { transform: scale(0.97); }
        
        .at-btn-primary { 
          background: linear-gradient(135deg, var(--signal), #5b21b6); 
          color: white; 
          box-shadow: 0 5px 20px rgba(124, 92, 255, 0.3);
        }
        .at-btn-primary:hover { 
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(124, 92, 255, 0.4);
          filter: brightness(1.1);
        }
        
        .at-btn-outline { 
          background: rgba(255, 255, 255, 0.03); 
          border-color: rgba(255, 255, 255, 0.08); 
          color: var(--cloud); 
          backdrop-filter: blur(8px);
        }
        .at-btn-outline:hover { 
          background: rgba(255, 255, 255, 0.08); 
          border-color: var(--signal);
          transform: translateY(-2px);
        }

        .at-ticker {
          display: flex; 
          align-items: center; 
          gap: 12px;
          background: var(--void-card); 
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 99px; 
          padding: 10px 10px 10px 18px;
          max-width: 520px; 
          margin: 16px auto 0; 
          width: 100%;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }
        .at-ticker-tag {
          display: inline-flex; 
          align-items: center; 
          gap: 6px;
          background: var(--coral); 
          color: var(--void); 
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; 
          font-weight: 800; 
          letter-spacing: 0.1em;
          padding: 5px 12px; 
          border-radius: 99px; 
          flex-shrink: 0;
          box-shadow: 0 2px 10px var(--coral-glow);
        }
        .at-ticker-window { overflow: hidden; flex: 1; }
        .at-ticker-track {
          white-space: nowrap; 
          font-family: 'JetBrains Mono', monospace; 
          font-size: 12px; 
          color: var(--cloud-dim);
          display: inline-block; 
          animation: at-ticker-scroll 24s linear infinite;
        }
        @keyframes at-ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        .at-section-title { font-size: 28px; text-align: center; margin: 12px 0 4px; }
        .at-section-sub { color: var(--cloud-dim); text-align: center; margin: 0 0 16px; font-size: 15px; }

        .at-topic-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
        
        .at-topic-card {
          display: flex; 
          flex-direction: column; 
          align-items: flex-start; 
          gap: 12px;
          background: var(--void-card); 
          border: 1px solid rgba(255, 255, 255, 0.05); 
          border-radius: 20px;
          padding: 22px; 
          text-align: left; 
          cursor: pointer; 
          color: var(--cloud);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }
        .at-topic-card::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          border: 2px solid transparent;
          pointer-events: none;
          transition: border-color 0.3s;
        }
        .at-topic-card:hover { 
          transform: translateY(-6px); 
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3), 0 0 20px var(--signal-glow);
        }
        .at-topic-card:hover::after {
          border-color: var(--signal);
        }
        .at-topic-icon { 
          width: 44px; 
          height: 44px; 
          border-radius: 12px; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          background: rgba(124, 92, 255, 0.12); 
          color: var(--signal-2); 
          border: 1px solid rgba(124, 92, 255, 0.2);
        }
        .at-topic-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px; }
        .at-topic-tag { color: var(--cloud-dim); font-size: 13.5px; line-height: 1.4; }

        .at-signal { display: inline-flex; align-items: flex-end; gap: 3px; margin-top: auto; }
        .at-signal-bar { width: 5px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); display: inline-block; }
        .at-signal-bar-on { background: var(--signal-2); box-shadow: 0 0 8px var(--signal-glow); }

        .at-matching { align-items: center; text-align: center; padding-top: 80px; }
        .at-radar { position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; }
        .at-radar-ring { position: absolute; inset: 0; border: 2px dashed var(--signal); border-radius: 50%; animation: at-radar 2.4s linear infinite; opacity: 0; }
        .at-radar-ring-2 { animation-delay: 0.8s; }
        .at-radar-ring-3 { animation-delay: 1.6s; }
        @keyframes at-radar { 0% { transform: scale(0.3) rotate(0deg); opacity: 0.8; } 100% { transform: scale(1.5) rotate(360deg); opacity: 0; } }
        .at-radar-core { 
          width: 70px; 
          height: 70px; 
          border-radius: 50%; 
          background: var(--void-card); 
          border: 2px solid var(--signal); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: var(--signal-2); 
          box-shadow: 0 0 25px var(--signal-glow);
          z-index: 10;
        }
        .at-matching-text { font-size: 19px; font-weight: 600; margin: 0; }
        .at-matching-sub { color: var(--cloud-dim); font-family: 'JetBrains Mono', monospace; font-size: 14px; margin-top: 8px; }

        .at-quiz-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .at-quiz-meta, .at-quiz-stats { display: flex; align-items: center; gap: 12px; }
        .at-chip { 
          background: rgba(124, 92, 255, 0.1); 
          border: 1px solid rgba(124, 92, 255, 0.25); 
          padding: 6px 14px; 
          border-radius: 99px; 
          font-size: 13px; 
          font-weight: 600;
          color: var(--signal-2); 
        }
        .at-qcount { font-size: 14px; color: var(--cloud-dim); font-weight: 500; }
        .at-streak { display: inline-flex; align-items: center; gap: 6px; color: var(--cloud-dim); font-size: 14px; }
        .at-streak-hot { color: var(--coral); filter: drop-shadow(0 0 8px var(--coral-glow)); }
        .at-score { font-size: 14px; color: #34d399; font-weight: 700; }

        .at-timer-track { height: 8px; border-radius: 99px; background: rgba(255, 255, 255, 0.05); overflow: hidden; margin-top: 8px; }
        .at-timer-fill { height: 100%; border-radius: 99px; transition: width 1s linear, background 0.3s ease; }
        .at-timer-ok { background: #10B981; box-shadow: 0 0 10px var(--lime-glow); }
        .at-timer-warn { background: #fbbf24; box-shadow: 0 0 10px rgba(251, 191, 36, 0.25); }
        .at-timer-danger { background: var(--coral); box-shadow: 0 0 10px var(--coral-glow); }
        .at-timer-note { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--coral); text-align: right; margin: -12px 0 0; font-weight: 700; }

        .at-question-card { 
          background: var(--void-card); 
          border: 1px solid rgba(255, 255, 255, 0.06); 
          border-radius: 24px; 
          padding: 32px; 
          backdrop-filter: blur(20px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        .at-question-text { 
          font-family: 'Space Grotesk', sans-serif; 
          font-size: 22px; 
          font-weight: 700; 
          margin: 0 0 24px; 
          line-height: 1.4; 
        }
        .at-options { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        
        .at-option {
          display: flex; 
          align-items: center; 
          gap: 12px;
          background: rgba(255, 255, 255, 0.02); 
          border: 1px solid rgba(255, 255, 255, 0.08); 
          border-radius: 16px;
          padding: 16px 18px; 
          text-align: left; 
          color: var(--cloud); 
          cursor: pointer;
          font-family: inherit; 
          font-size: 15px;
          font-weight: 500;
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
        }
        .at-option:hover:not(:disabled) { 
          border-color: var(--signal); 
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-2px); 
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .at-option:disabled { cursor: default; }
        .at-option-letter { 
          font-family: 'JetBrains Mono', monospace; 
          font-size: 12px; 
          color: var(--signal-2); 
          background: rgba(124, 92, 255, 0.1);
          width: 22px; 
          height: 22px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0; 
          border: 1px solid rgba(124, 92, 255, 0.2);
        }
        .at-option-correct { 
          border-color: var(--lime) !important; 
          background: rgba(16, 185, 129, 0.08) !important; 
          color: var(--lime) !important; 
          box-shadow: 0 0 15px var(--lime-glow) !important;
        }
        .at-option-wrong { 
          border-color: var(--coral) !important; 
          background: rgba(255, 74, 107, 0.08) !important; 
          color: var(--coral) !important; 
          box-shadow: 0 0 15px var(--coral-glow) !important;
        }
        .at-feedback { 
          margin: 20px 0 0; 
          font-size: 15px; 
          color: var(--cloud-dim); 
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .at-opponents { 
          background: var(--void-card); 
          border: 1px solid rgba(255, 255, 255, 0.05); 
          border-radius: 20px; 
          padding: 16px 20px; 
          backdrop-filter: blur(12px);
        }
        .at-opponents-label { 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
          font-size: 13px; 
          color: var(--cloud-dim); 
          margin-bottom: 12px; 
          font-weight: 600;
        }
        .at-opponents-list { display: flex; flex-wrap: wrap; gap: 12px; }
        
        .at-opponent { 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
          font-size: 13px; 
          color: var(--cloud-dim); 
          background: rgba(255, 255, 255, 0.03); 
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 99px; 
          padding: 6px 14px 6px 8px; 
          transition: all 0.2s;
        }
        .at-opponent-avatar { font-size: 16px; }
        .at-opponent-status { font-family: 'JetBrains Mono', monospace; font-size: 11px; opacity: 0.7; }
        .at-opponent-done {
          background: rgba(16, 185, 129, 0.06);
          border-color: rgba(16, 185, 129, 0.2);
          color: var(--lime);
        }
        .at-opponent-done .at-opponent-status { color: var(--lime); font-weight: 700; }

        .at-results { text-align: center; }
        .at-results-eyebrow { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.25em; font-size: 12px; color: var(--cloud-dim); margin: 16px 0 0; font-weight: 700; }
        .at-results-score { font-size: clamp(64px, 15vw, 92px); margin: 4px 0 0; font-weight: 800; line-height: 1; }
        .at-results-outof { font-size: 0.4em; color: var(--cloud-dim); font-weight: 500; }
        .at-results-line { color: var(--cloud-dim); margin: 8px 0 24px; font-size: 16px; line-height: 1.5; }

        .at-badges { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
        
        .at-badge {
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          text-align: center;
          gap: 8px;
          background: var(--void-card); 
          border: 1px solid rgba(255, 255, 255, 0.04); 
          border-radius: 18px;
          padding: 20px 14px; 
          color: var(--cloud-dim); 
          opacity: 0.4;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          backdrop-filter: blur(10px);
        }
        .at-badge-on { 
          opacity: 1; 
          color: var(--cloud); 
          border-color: var(--signal); 
          box-shadow: 0 10px 25px rgba(124, 92, 255, 0.15);
          background: rgba(124, 92, 255, 0.05);
        }
        .at-badge-on svg { color: #fbbf24; filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.4)); }
        .at-badge-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 13.5px; }
        .at-badge-desc { font-size: 11px; color: var(--cloud-dim); line-height: 1.3; }

        .at-leaderboard { 
          background: var(--void-card); 
          border: 1px solid rgba(255, 255, 255, 0.05); 
          border-radius: 20px; 
          padding: 10px; 
          text-align: left; 
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        }
        .at-lb-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; transition: background 0.2s; }
        .at-lb-row-player { 
          background: rgba(124, 92, 255, 0.12); 
          border: 1px solid rgba(124, 92, 255, 0.25); 
          box-shadow: 0 4px 15px rgba(124, 92, 255, 0.1);
        }
        .at-lb-rank { width: 24px; color: var(--cloud-dim); font-size: 14px; font-weight: 700; }
        .at-lb-name { flex: 1; font-size: 15px; font-weight: 600; }
        .at-lb-score { font-size: 14px; color: #10B981; font-weight: 700; }

        .at-results-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 24px; }

        .at-root button:focus-visible, .at-root input:focus-visible { outline: 2px solid var(--signal-2); outline-offset: 2px; }

        @media (max-width: 560px) {
          .at-options { grid-template-columns: 1fr; }
          .at-results-actions { flex-direction: column; }
          .at-btn { width: 100%; justify-content: center; }
        }

        @media (prefers-reduced-motion: reduce) {
          .at-root *, .at-root *::before, .at-root *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      <div className="at-bg-glow at-bg-glow-1" />
      <div className="at-bg-glow at-bg-glow-2" />

      {screen === 'home' && (
        <div className="at-screen at-home">
          <div className="at-topbar">
            <span className="at-wordmark">ARENA</span>
            <button className="at-icon-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <div className="at-hero">
            <OnAirDot />
            <h1 className="at-display at-hero-title">
              AI TRIVIA <span className="at-accent-text">ARENA</span>
            </h1>
            <p className="at-hero-tag">Where humans and language models fight for bragging rights.</p>

            <div className="at-hero-form">
              <input
                className="at-input"
                type="text"
                maxLength={18}
                placeholder="Enter your arena name"
                aria-label="Enter your arena name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <div className="at-hero-actions">
                <button className="at-btn at-btn-primary" onClick={startQuickMatch}>
                  <Zap size={18} /> Quick Match
                </button>
                <button className="at-btn at-btn-outline" onClick={goToLobby}>
                  <Users size={18} /> Create Room
                </button>
                <button className="at-btn at-btn-outline" onClick={goToLobby}>
                  <ArrowRight size={18} /> Join Room
                </button>
              </div>
            </div>
          </div>

          <Ticker />
        </div>
      )}

      {screen === 'lobby' && (
        <div className="at-screen at-lobby">
          <div className="at-topbar">
            <button className="at-icon-btn" onClick={() => setScreen('home')} aria-label="Back to home">
              <ArrowLeft size={18} />
            </button>
            <span className="at-wordmark">ARENA</span>
            <span style={{ width: 36 }} />
          </div>
          <h2 className="at-display at-section-title">Pick your battlefield</h2>
          <p className="at-section-sub">Five channels. Twenty-five questions. Zero mercy.</p>
          <div className="at-topic-grid">
            {TOPICS.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} className="at-topic-card" onClick={() => beginMatch(t.id)}>
                  <span className="at-topic-icon"><Icon size={22} /></span>
                  <span className="at-topic-name">{t.name}</span>
                  <span className="at-topic-tag">{t.tag}</span>
                  <SignalBars level={t.signal} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {screen === 'matching' && (
        <div className="at-screen at-matching">
          <div className="at-radar">
            <span className="at-radar-ring" />
            <span className="at-radar-ring at-radar-ring-2" />
            <span className="at-radar-ring at-radar-ring-3" />
            <span className="at-radar-core">{TopicIcon && <TopicIcon size={26} />}</span>
          </div>
          <p className="at-matching-text">{"Scanning the arena for worthy opponents..."}</p>
          <p className="at-matching-sub">{topic ? topic.name : ''}</p>
        </div>
      )}

      {screen === 'quiz' && currentQuestion && (
        <div className="at-screen at-quiz">
          <div className="at-quiz-header">
            <div className="at-quiz-meta">
              <span className="at-chip">{topic ? topic.name : ''}</span>
              <span className="at-mono at-qcount">Q{qIndex + 1}/{matchQuestions.length}</span>
            </div>
            <div className="at-quiz-stats">
              <span className={`at-streak${streak >= 3 ? ' at-streak-hot' : ''}`}>
                <Flame size={16} /> {streak}
              </span>
              <span className="at-mono at-score">{score} pts</span>
              <button className="at-icon-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>

          <div>
            <div className="at-timer-track">
              <div className={`at-timer-fill at-timer-${timerState}`} style={{ width: `${timerPct}%` }} />
            </div>
            {timerState === 'danger' && !answered && <p className="at-timer-note">brace yourself</p>}
          </div>

          <div className="at-question-card">
            <p className="at-question-text">{currentQuestion.q}</p>
            <div className="at-options">
              {currentQuestion.options.map((opt, i) => {
                let state = '';
                if (answered) {
                  if (i === currentQuestion.correct) state = 'correct';
                  else if (i === selected) state = 'wrong';
                }
                return (
                  <button
                    key={i}
                    className={`at-option${state ? ` at-option-${state}` : ''}`}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                  >
                    <span className="at-option-letter">{String.fromCharCode(65 + i)}</span>
                    <span className="at-option-text">{opt}</span>
                    {state === 'correct' && <Check size={18} />}
                    {state === 'wrong' && <X size={18} />}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className="at-feedback">
                {selected === currentQuestion.correct ? <Award size={18} className="at-streak-hot" /> : <HelpCircle size={18} className="at-timer-danger" />}
                {feedback}
              </p>
            )}
          </div>

          <div className="at-opponents">
            <span className="at-opponents-label"><Users size={14} /> In the arena</span>
            <div className="at-opponents-list">
              {bots.map((b) => (
                <span key={b.name} className={`at-opponent${botStatus[b.name] === 'answered' ? ' at-opponent-done' : ''}`}>
                  <span className="at-opponent-avatar">{b.avatar}</span>
                  {b.name.replace(/_/g, ' ')}
                  <span className="at-opponent-status">{botStatus[b.name] === 'answered' ? 'answered' : "thinking..."}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {screen === 'results' && (
        <div className="at-screen at-results">
          <p className="at-results-eyebrow">MATCH COMPLETE</p>
          <h2 className="at-display at-results-score">{score}<span className="at-results-outof">/{matchQuestions.length || 5}</span></h2>
          <p className="at-results-line">{commentaryLine()}</p>

          <div className="at-badges">
            {BADGES.map((b) => {
              const earned = earnedBadges.some((e) => e.id === b.id);
              const Icon = b.icon;
              return (
                <div key={b.id} className={`at-badge${earned ? ' at-badge-on' : ''}`}>
                  <Icon size={20} />
                  <span className="at-badge-name">{b.name}</span>
                  <span className="at-badge-desc">{b.desc}</span>
                </div>
              );
            })}
          </div>

          <div className="at-leaderboard">
            {leaderboard.map((row, i) => (
              <div key={row.name + i} className={`at-lb-row${row.isPlayer ? ' at-lb-row-player' : ''}`}>
                <span className="at-mono at-lb-rank">{i + 1}</span>
                <span className="at-lb-name">{row.name}</span>
                <span className="at-mono at-lb-score">{row.score}</span>
              </div>
            ))}
          </div>

          <div className="at-results-actions">
            <button className="at-btn at-btn-primary" onClick={() => beginMatch(topicId)}>
              <Play size={18} /> Rematch
            </button>
            <button className="at-btn at-btn-outline" onClick={() => setScreen('home')}>
              <ArrowLeft size={18} /> Back to arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
