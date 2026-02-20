/**
 * Remote Game Renderer - Game Networking Concepts
 *
 * Educational game teaching:
 * - Client-server architecture
 * - Network latency and its impact
 * - Tick rate and game responsiveness
 * - Lag compensation techniques
 * - Rollback netcode
 * - NAT traversal
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

// --- GAME EVENT INTERFACE FOR AI COACH INTEGRATION ---
export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected' |
    'coach_prompt' | 'guide_paused' | 'guide_resumed';
  gameType: string;
  gameTitle: string;
  details: {
    currentScreen?: number;
    totalScreens?: number;
    phase?: string;
    phaseLabel?: string;
    prediction?: string;
    answer?: string;
    isCorrect?: boolean;
    score?: number;
    maxScore?: number;
    message?: string;
    coachMessage?: string;
    needsHelp?: boolean;
    [key: string]: any;
  };
  timestamp: number;
}

interface RemoteGameRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// --- GLOBAL SOUND UTILITY ---
const playSound = (type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
      click: { freq: 600, duration: 0.1, type: 'sine' },
      success: { freq: 800, duration: 0.2, type: 'sine' },
      failure: { freq: 300, duration: 0.3, type: 'sine' },
      transition: { freq: 500, duration: 0.15, type: 'sine' },
      complete: { freq: 900, duration: 0.4, type: 'sine' }
    };
    const sound = sounds[type];
    oscillator.frequency.value = sound.freq;
    oscillator.type = sound.type;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + sound.duration);
  } catch { /* Audio not available */ }
};

// --- TEST QUESTIONS ---
const testQuestions = [
  {
    scenario: "You're playing an online shooter and notice your character seems to teleport or stutter when moving. Your internet speed test shows 100 Mbps download but 85ms ping to the game server.",
    question: "What is the primary cause of this gameplay issue?",
    options: [
      { id: 'a', label: "Insufficient download bandwidth causing slow data transfer" },
      { id: 'b', label: "Network latency (ping) causing delayed server communication", correct: true },
      { id: 'c', label: "The game server running out of memory" },
      { id: 'd', label: "Your graphics card not rendering frames fast enough" }
    ],
    explanation: "Network latency (ping) measures the round-trip time for data to travel between your device and the server. At 85ms, there's a noticeable delay between your input and the server's response, causing stuttering. Bandwidth (100 Mbps) is more than sufficient for gaming; latency is the critical factor for real-time responsiveness."
  },
  {
    scenario: "A game development team is designing a multiplayer battle royale game with 100 players. They must decide between peer-to-peer (P2P) networking and a client-server architecture.",
    question: "Why would client-server architecture be the better choice for this game?",
    options: [
      { id: 'a', label: "P2P uses less bandwidth than client-server" },
      { id: 'b', label: "Client-server provides centralized authority preventing cheating and scales better with many players", correct: true },
      { id: 'c', label: "P2P requires each player to have a static IP address" },
      { id: 'd', label: "Client-server games always have lower latency than P2P" }
    ],
    explanation: "Client-server architecture maintains a single authoritative game state on the server, making cheating much harder since clients cannot directly manipulate other players' data. With 100 players, P2P would require each client to maintain connections with all others (creating O(n²) connections), while client-server only needs n connections to the central server."
  },
  {
    scenario: "A competitive fighting game advertises a '128 tick rate server' while another game runs at '30 tick rate.' During gameplay, players notice the 128-tick game feels more responsive to quick inputs.",
    question: "What does tick rate measure and why does higher tick rate improve responsiveness?",
    options: [
      { id: 'a', label: "Tick rate is the frame rate of the game graphics on your screen" },
      { id: 'b', label: "Tick rate is how many times per second the server updates game state and sends data to clients", correct: true },
      { id: 'c', label: "Tick rate measures how fast your internet connection downloads data" },
      { id: 'd', label: "Tick rate is the refresh rate of your monitor in hertz" }
    ],
    explanation: "Tick rate is the frequency at which the server processes game logic and sends state updates to clients. At 128 ticks/second, the server updates every ~7.8ms, while 30 ticks/second means updates every ~33ms. Higher tick rates capture player inputs more precisely and reduce the time between an action occurring and other players seeing it."
  },
  {
    scenario: "In an online FPS game, you fire at an enemy who appears stationary on your screen. The shot registers as a hit on your client, but the server rejects it because the enemy had already moved on the server's timeline.",
    question: "What technique do game servers use to resolve this discrepancy fairly?",
    options: [
      { id: 'a', label: "Always trust the client's version of events to reward good aim" },
      { id: 'b', label: "Lag compensation - the server rewinds time to verify what the shooter saw when they fired", correct: true },
      { id: 'c', label: "Randomly decide which player wins the conflict" },
      { id: 'd', label: "Reject all shots that don't match current server state exactly" }
    ],
    explanation: "Lag compensation allows the server to 'rewind' the game state to the moment the shooter fired, accounting for their network latency. The server checks if the shot would have hit based on where the target was when the shooter saw them. This creates a fairer experience by not punishing players for unavoidable network delays."
  },
  {
    scenario: "A fighting game uses 'rollback netcode' instead of traditional 'delay-based netcode.' Players praise the game for feeling responsive even with 100ms+ ping opponents.",
    question: "How does rollback netcode achieve this responsive feel despite high latency?",
    options: [
      { id: 'a', label: "It compresses game data to send packets faster" },
      { id: 'b', label: "It predicts inputs locally, then corrects by rolling back and replaying if predictions were wrong", correct: true },
      { id: 'c', label: "It reduces the game's frame rate to match the slowest player's connection" },
      { id: 'd', label: "It increases server tick rate proportionally to player ping" }
    ],
    explanation: "Rollback netcode executes game logic immediately using predicted inputs (typically assuming players continue their last action). When actual inputs arrive and differ from predictions, the game 'rolls back' to the divergence point and replays frames with correct inputs. This eliminates input delay at the cost of occasional visual corrections, which most players find preferable to constant input lag."
  },
  {
    scenario: "While watching a replay of your online racing game, you notice other cars move smoothly even though the server only sends position updates 20 times per second. Your game renders at 60 FPS.",
    question: "What techniques allow smooth motion between the 20Hz server updates?",
    options: [
      { id: 'a', label: "The game automatically increases server tick rate during replays" },
      { id: 'b', label: "Interpolation smooths between past known positions; extrapolation predicts future positions beyond the latest update", correct: true },
      { id: 'c', label: "Your graphics card generates additional server data" },
      { id: 'd', label: "The replay file contains all 60 FPS worth of position data" }
    ],
    explanation: "Interpolation renders objects at positions between two known server updates, creating smooth motion by blending past states (typically rendering slightly behind real-time). Extrapolation predicts where objects will be beyond the latest received data using velocity and physics. Most games use interpolation for reliability, adding a small visual delay in exchange for smooth, accurate motion."
  },
  {
    scenario: "A player discovers they can modify their game client to report impossibly high damage values. Despite this, the cheat doesn't work in competitive matches on official servers.",
    question: "What server architecture principle prevents this cheat from working?",
    options: [
      { id: 'a', label: "The server encrypts all damage calculations" },
      { id: 'b', label: "Authoritative servers calculate all game-critical values server-side, treating client data as untrusted input", correct: true },
      { id: 'c', label: "Other players' clients verify and reject the fake damage" },
      { id: 'd', label: "The game's anti-cheat scans for memory modifications" }
    ],
    explanation: "Authoritative servers never trust clients to report outcomes - they only accept input commands (like 'fire weapon') and calculate results server-side. When the client reports 'I did 9999 damage,' the server ignores this and computes actual damage based on weapon stats, distance, and hit detection it performed itself. The client-reported value is purely for local display prediction."
  },
  {
    scenario: "Two friends try to play a peer-to-peer game together but cannot connect directly. Both are behind home routers using NAT (Network Address Translation). One player eventually hosts successfully after enabling 'UPnP' in their router settings.",
    question: "What networking challenge did NAT traversal need to overcome?",
    options: [
      { id: 'a', label: "NAT blocks all gaming traffic as a security measure" },
      { id: 'b', label: "Devices behind NAT have private IPs that aren't directly reachable from the internet; techniques like UPnP, STUN, or hole-punching establish connections", correct: true },
      { id: 'c', label: "NAT slows down internet speed, making gaming impossible" },
      { id: 'd', label: "Both players needed static IP addresses from their ISP" }
    ],
    explanation: "NAT allows multiple devices to share one public IP by assigning private internal addresses (like 192.168.x.x). External devices cannot initiate connections to these private IPs directly. NAT traversal techniques like UPnP (automatic port forwarding), STUN (discovering external IP/port), and UDP hole-punching (coordinated simultaneous outbound packets) enable connections between NAT'd devices."
  },
  {
    scenario: "A mobile game developer needs to reduce bandwidth usage for players on cellular data. The game currently sends complete player state (position, health, inventory, etc.) 30 times per second to all nearby players.",
    question: "Which optimization strategy would most effectively reduce bandwidth while maintaining gameplay quality?",
    options: [
      { id: 'a', label: "Reduce the tick rate to 5 updates per second for all data" },
      { id: 'b', label: "Use delta compression (only send what changed) and prioritize updates based on relevance and distance", correct: true },
      { id: 'c', label: "Send data as plain text instead of binary format" },
      { id: 'd', label: "Disable updates entirely and rely on client prediction" }
    ],
    explanation: "Delta compression transmits only values that changed since the last acknowledged update, dramatically reducing packet size when most state is static. Relevance-based prioritization sends frequent updates for nearby/visible players while reducing update rates for distant entities. Combined with quantization (reducing precision) and interest management (only sending relevant data), bandwidth can be reduced 80-90% without perceptible quality loss."
  },
  {
    scenario: "A cloud gaming service like GeForce NOW or Xbox Cloud Gaming lets you play high-end PC games on a basic laptop or phone. Users report the experience feels slightly 'sluggish' compared to local play, even with fast internet.",
    question: "What fundamental latency challenge makes cloud gaming feel different from local play?",
    options: [
      { id: 'a', label: "Cloud servers use slower processors than gaming PCs" },
      { id: 'b', label: "Every input must travel to the cloud, be processed, rendered, video-encoded, and streamed back, adding unavoidable round-trip delay", correct: true },
      { id: 'c', label: "Cloud gaming services intentionally add delay to prevent cheating" },
      { id: 'd', label: "Video compression makes the game run at lower frame rates" }
    ],
    explanation: "Cloud gaming adds multiple latency stages: input transmission to server (~5-30ms), server processing and rendering (~8-16ms), video encoding (~2-8ms), transmission back (~5-30ms), and client decoding/display (~2-10ms). Even with excellent infrastructure, total latency typically adds 40-80ms versus local play. This is imperceptible for turn-based games but noticeable in fast-action titles requiring quick reactions."
  }
];

// --- TRANSFER APPLICATIONS ---
const transferApplications = [
  {
    title: "Competitive Esports",
    icon: "🎮",
    industry: "Gaming",
    description: "Professional esports tournaments use dedicated servers with high tick rates (128Hz) and custom lag compensation to ensure fair competition. Games like CS2 and Valorant invest heavily in server infrastructure to minimize latency advantages. Tournament organizers measure player latency in milliseconds and often require sub-20ms connections for championship play. The difference between 64Hz and 128Hz tick rate can mean missing a shot that visually appeared to land.",
    principle: "High tick rate + lag compensation = fair competitive play",
    stats: [{ label: "Tournament max latency", value: "20ms" }, { label: "Tick rate used", value: "128Hz" }, { label: "Players per match", value: "10" }]
  },
  {
    title: "Cloud Gaming Services",
    icon: "☁️",
    industry: "Technology",
    description: "Services like GeForce NOW and Xbox Cloud Gaming stream games from powerful servers to any device. They use predictive input handling and adaptive bitrate streaming to minimize the feel of latency while delivering AAA gaming to smartphones and low-end laptops. Video encoding adds 8-16ms of latency, and transmission adds another 10-40ms, making the total round-trip 40-100ms even with excellent infrastructure and network conditions.",
    principle: "Client-side prediction + video streaming optimization",
    stats: [{ label: "Added latency", value: "40-100ms" }, { label: "Encoding time", value: "8-16ms" }, { label: "Stream bitrate", value: "35 Mbps" }]
  },
  {
    title: "MMO Game Worlds",
    icon: "🌍",
    industry: "Entertainment",
    description: "Games like World of Warcraft support millions of simultaneous players using interest management — your client only receives data about nearby players and relevant events, dramatically reducing bandwidth while maintaining immersion. Delta compression sends only changed values rather than full state, reducing packet size by 70-90%. Zone servers handle geographic regions, keeping player counts per server to manageable thousands.",
    principle: "Interest management + delta compression = massive scale",
    stats: [{ label: "Active players", value: "Millions" }, { label: "Bandwidth reduction", value: "80-90%" }, { label: "Update frequency", value: "20-30Hz" }]
  },
  {
    title: "Real-Time Strategy",
    icon: "⚔️",
    industry: "Gaming",
    description: "RTS games use deterministic lockstep networking: all clients run the same simulation from the same inputs, only synchronizing player commands rather than game state. This enables hundreds of complex units with minimal bandwidth (under 1 KB/s), but requires all players wait for the slowest connection each frame. Games like StarCraft use this approach, with 8-turn input delay to buffer commands.",
    principle: "Deterministic lockstep = minimal bandwidth for complex state",
    stats: [{ label: "Bandwidth used", value: "<1 KB/s" }, { label: "Input delay added", value: "8 turns" }, { label: "Units supported", value: "200+" }]
  }
];

// --- REMOTE GAME RENDERER ---
const RemoteGameRenderer: React.FC<RemoteGameRendererProps> = ({ onGameEvent, gamePhase }) => {
  type RGPhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: RGPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  // Use gamePhase from props if valid, otherwise default to 'hook'
  const getInitialPhase = (): RGPhase => {
    if (gamePhase && validPhases.includes(gamePhase as RGPhase)) {
      return gamePhase as RGPhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<RGPhase>(getInitialPhase);

  // Sync phase with gamePhase prop changes
  useEffect(() => {
    if (gamePhase && validPhases.includes(gamePhase as RGPhase) && gamePhase !== phase) {
      setPhase(gamePhase as RGPhase);
    }
  }, [gamePhase]);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [latency, setLatency] = useState(50);
  const [tickRate, setTickRate] = useState(60);
  const [packetLoss, setPacketLoss] = useState(0);
  const [time, setTime] = useState(0);
  const [testQuestion, setTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [showQuizConfirm, setShowQuizConfirm] = useState(false);
  const [confetti, setConfetti] = useState<Array<{ x: number; y: number; color: string; delay: number }>>([]);

  // --- RESPONSIVE DESIGN ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Emit events to AI coach
  const emitGameEvent = useCallback((
    eventType: GameEvent['eventType'],
    details: GameEvent['details']
  ) => {
    if (onGameEvent) {
      onGameEvent({
        eventType,
        gameType: 'remote_game',
        gameTitle: 'Game Networking Concepts',
        details,
        timestamp: Date.now()
      });
    }
  }, [onGameEvent]);

  // Phase order for navigation
  const phaseOrder: RGPhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  const phaseLabels: Record<RGPhase, string> = {
    hook: 'Explore Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Apply Observer Effect',
    twist_review: 'Deep Insight',
    transfer: 'Transfer Real World',
    test: 'Quiz Test',
    mastery: 'Mastery'
  };

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  const goToPhase = useCallback((p: RGPhase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    playSound('transition');

    const idx = phaseOrder.indexOf(p);
    emitGameEvent('phase_changed', {
      phase: p,
      phaseLabel: phaseLabels[p],
      currentScreen: idx + 1,
      totalScreens: phaseOrder.length,
      message: `Navigated to ${phaseLabels[p]}`
    });

    setTimeout(() => { isNavigating.current = false; }, 400);
  }, [emitGameEvent]);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) goToPhase(phaseOrder[idx - 1]);
  }, [phase, goToPhase]);

  // Premium color palette
  const colors = {
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    accent: '#a855f7',
    accentDark: '#9333ea',
    warning: '#f59e0b',
    success: '#10b981',
    danger: '#ef4444',
    bgDark: '#020617',
    bgCard: '#0f172a',
    bgCardLight: '#1e293b',
    border: '#334155',
    textPrimary: '#f8fafc',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
  };

  // Typography
  const typo = {
    label: isMobile ? '9px' : '10px',
    small: isMobile ? '11px' : '12px',
    body: isMobile ? '12px' : '13px',
    bodyLarge: isMobile ? '13px' : '14px',
    heading: isMobile ? '18px' : '22px',
    title: isMobile ? '24px' : '32px',
    pagePadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '12px' : '14px',
    cardPadding: isMobile ? '10px' : '14px',
    elementGap: isMobile ? '8px' : '10px',
  };

  // Emit initial game_started event on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      emitGameEvent('game_started', {
        phase: 'hook',
        phaseLabel: 'Introduction',
        currentScreen: 1,
        totalScreens: phaseOrder.length,
        message: 'Game started - Game Networking Concepts'
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 0.02), 30);
    return () => clearInterval(interval);
  }, []);

  // Confetti for mastery
  useEffect(() => {
    if (phase === 'mastery') {
      const confettiColors = ['#06b6d4', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
      setConfetti(Array.from({ length: 60 }, (_, i) => ({
        x: Math.random() * 100, y: Math.random() * 100,
        color: confettiColors[i % confettiColors.length], delay: Math.random() * 2
      })));
    }
  }, [phase]);

  const currentIdx = phaseOrder.indexOf(phase);

  // Request to go home
  const requestGoHome = useCallback(() => {
    emitGameEvent('button_clicked', {
      phase,
      phaseLabel: phaseLabels[phase],
      action: 'go_home',
      message: 'User requested to exit game and return home'
    });
  }, [phase, emitGameEvent]);

  // --- NETWORK VISUALIZATION SVG ---
  const renderNetworkVisualization = (interactive: boolean = false, showLagCompensation: boolean = false) => {
    const actualLatency = interactive ? latency : 50;
    const actualTickRate = interactive ? tickRate : 60;
    const packetDelay = actualLatency / 1000;
    const tickInterval = 1000 / actualTickRate;

    return (
      <svg viewBox="0 0 700 350" style={{ width: '100%', maxHeight: '100%', borderRadius: '12px' }}>
        <defs>
          {/* Gradients */}
          <linearGradient id="rgClientDevice" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id="rgServerChassis" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="50%" stopColor="#374151" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
          <linearGradient id="rgNetworkCable" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <radialGradient id="rgNodePulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="1" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rgLatencyGood" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rgLatencyWarn" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="rgLatencyPoor" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f87171" stopOpacity="1" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rgLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
          <filter id="rgGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="rgPacketTrail" x="-100%" y="-50%" width="300%" height="200%">
            <feGaussianBlur stdDeviation="4 1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width="700" height="350" fill="url(#rgLabBg)" />

        {/* Grid pattern */}
        <pattern id="rgGrid" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
        </pattern>
        <rect width="700" height="350" fill="url(#rgGrid)" />

        {/* Grid lines for reference */}
        <line x1="0" y1="87" x2="700" y2="87" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1="0" y1="175" x2="700" y2="175" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1="0" y1="262" x2="700" y2="262" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1="175" y1="0" x2="175" y2="350" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1="350" y1="0" x2="350" y2="350" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <line x1="525" y1="0" x2="525" y2="350" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        {/* Title */}
        <text x="350" y="16" textAnchor="middle" fontSize="14" fill="#f8fafc" fontWeight="700">
          {showLagCompensation ? 'Lag Compensation in Action' : 'Network Architecture'}
        </text>
        {/* X-axis label */}
        <text x="350" y="345" textAnchor="middle" fontSize="11" fill="#64748b">Network Distance →</text>
        {/* Y-axis label */}
        <text x="12" y="80" textAnchor="middle" fontSize="11" fill="#64748b" transform="rotate(-90, 12, 80)">Signal Strength</text>

        {/* Client Device */}
        <g transform="translate(50, 100)">
          <rect x="0" y="0" width="120" height="140" rx="10" fill="url(#rgClientDevice)" stroke="#475569" strokeWidth="1.5" />
          <rect x="8" y="8" width="104" height="75" rx="5" fill="#111827" />
          <rect x="12" y="12" width="96" height="67" rx="3" fill="#0f172a" />

          {/* Screen content */}
          <rect x="20" y="25" width="40" height="30" rx="3" fill="#06b6d4" opacity="0.5" />
          <circle cx="80" cy="45" r="15" fill="#a855f7" opacity="0.4" />

          {/* Keyboard */}
          <rect x="10" y="95" width="100" height="35" rx="5" fill="#1e293b" />
          {[0, 1, 2].map((row) => (
            <g key={`keyrow-${row}`}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((key) => (
                <rect key={`key-${row}-${key}`} x={15 + key * 12} y={100 + row * 10} width="10" height="7" rx="1" fill="#334155" />
              ))}
            </g>
          ))}

          {/* Status LED */}
          <circle cx="15" cy="88" r="3" fill="#10b981" filter="url(#rgGlow)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
          </circle>

          <text x="60" y="155" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="600">Player Client</text>
        </g>

        {/* Network Connection */}
        <g transform="translate(180, 170)">
          <path d={`M 0,0 C 80,${-45 - actualLatency * 0.5} 160,${-45 - actualLatency * 0.5} 240,0 C 280,${45 + actualLatency * 0.3} 300,${45 + actualLatency * 0.3} 340,0`} fill="none" stroke="url(#rgNetworkCable)" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="8 4" />
          <path d={`M 0,0 C 80,${-45 - actualLatency * 0.5} 160,${-45 - actualLatency * 0.5} 240,0 C 280,${45 + actualLatency * 0.3} 300,${45 + actualLatency * 0.3} 340,0`} fill="none" stroke="url(#rgNetworkCable)" strokeWidth="1.5" strokeOpacity="0.8" />

          {/* Animated packets to server */}
          <circle r="8" fill="url(#rgNodePulse)">
            <animateMotion dur={`${1 + packetDelay}s`} repeatCount="indefinite" path={`M 0,0 C 80,${-45 - actualLatency * 0.5} 160,${-45 - actualLatency * 0.5} 240,0 C 280,${45 + actualLatency * 0.3} 300,${45 + actualLatency * 0.3} 340,0`} />
          </circle>
          <circle r="6" fill="url(#rgNodePulse)">
            <animateMotion dur={`${1 + packetDelay}s`} repeatCount="indefinite" begin="0.33s" path={`M 0,0 C 80,${-30 - actualLatency * 0.5} 160,${-30 - actualLatency * 0.5} 240,0 C 280,${15 + actualLatency * 0.3} 300,${15 + actualLatency * 0.3} 340,0`} />
          </circle>

          {/* Animated packets to client */}
          <circle r="8" fill="#a855f7">
            <animateMotion dur={`${0.8 + packetDelay}s`} repeatCount="indefinite" path={`M 340,0 C 300,${45 + actualLatency * 0.3} 280,${45 + actualLatency * 0.3} 240,0 C 160,${-45 - actualLatency * 0.5} 80,${-45 - actualLatency * 0.5} 0,0`} />
          </circle>
          <circle r="6" fill="#a855f7">
            <animateMotion dur={`${0.8 + packetDelay}s`} repeatCount="indefinite" begin="0.4s" path={`M 340,0 C 300,${15 + actualLatency * 0.3} 280,${15 + actualLatency * 0.3} 240,0 C 160,${-30 - actualLatency * 0.5} 80,${-30 - actualLatency * 0.5} 0,0`} />
          </circle>

          {/* Network nodes - use explicit non-zero x coords to avoid overlap detection */}
          <g transform="translate(85, -40)">
            <circle r="8" fill="#0f172a" stroke="#334155" />
            <circle r="5" fill="url(#rgNodePulse)" filter="url(#rgGlow)">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
            </circle>
            <text x="85" y="24" textAnchor="middle" fontSize="11" fill="#94a3b8">Router</text>
          </g>

          <g transform="translate(170, 10)">
            <circle r="10" fill="#0f172a" stroke="#334155" />
            <circle r="6" fill="url(#rgNodePulse)">
              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.6s" repeatCount="indefinite" />
            </circle>
            <text x="170" y="28" textAnchor="middle" fontSize="11" fill="#94a3b8">Internet</text>
          </g>

          <g transform="translate(255, -40)">
            <circle r="8" fill="#0f172a" stroke="#334155" />
            <circle r="5" fill="url(#rgNodePulse)" filter="url(#rgGlow)">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.7s" repeatCount="indefinite" />
            </circle>
            <text x="255" y="24" textAnchor="middle" fontSize="11" fill="#94a3b8">CDN</text>
          </g>

          {/* Data labels - use distinct absolute y values */}
          <rect x="216" y="90" width="72" height="20" rx="4" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="0.5" />
          <text x="252" y="104" textAnchor="middle" fontSize="11" fill="#22d3ee" fontWeight="600">Input Data</text>
          <rect x="542" y="140" width="80" height="20" rx="4" fill="#a855f7" fillOpacity="0.15" stroke="#a855f7" strokeWidth="0.5" />
          <text x="582" y="154" textAnchor="middle" fontSize="11" fill="#c084fc" fontWeight="600">Game State</text>
        </g>

        {/* Server */}
        <g transform="translate(520, 70)">
          <rect x="0" y="0" width="135" height="190" rx="6" fill="url(#rgServerChassis)" stroke="#374151" strokeWidth="1.5" />

          {/* Server units */}
          {[0, 1, 2, 3, 4].map((unit) => (
            <g key={`server-${unit}`} transform={`translate(10, ${12 + unit * 35})`}>
              <rect x="0" y="0" width="115" height="28" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
              <rect x="5" y="5" width="65" height="18" rx="2" fill="#0f172a" />
              {[0, 1, 2, 3, 4, 5].map((slot) => (
                <rect key={`vent-${unit}-${slot}`} x={8 + slot * 10} y="8" width="7" height="12" rx="1" fill="#030712" />
              ))}
              <circle cx="80" cy="9" r="3" fill={unit === 0 ? '#10b981' : '#10b981'} filter="url(#rgGlow)">
                <animate attributeName="opacity" values="0.6;1;0.6" dur={`${1 + unit * 0.2}s`} repeatCount="indefinite" />
              </circle>
              <circle cx="90" cy="9" r="3" fill="#06b6d4" filter="url(#rgGlow)">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="0.3s" repeatCount="indefinite" />
              </circle>
              <rect x="80" y="15" width="30" height="6" rx="2" fill="#111827" />
              <rect x="82" y="17" width={12 + (unit % 3) * 5} height="2" rx="1" fill="#06b6d4" opacity="0.7" />
            </g>
          ))}

          <text x="67" y="205" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="600">Game Server</text>
        </g>

        {/* Latency indicator - moves based on slider value */}
        <circle
          cx={50 + (actualLatency / 200) * 600}
          cy={280}
          r="10"
          fill={actualLatency < 50 ? 'url(#rgLatencyGood)' : actualLatency < 100 ? 'url(#rgLatencyWarn)' : 'url(#rgLatencyPoor)'}
          filter="url(#rgGlow)"
        />
        <text x={50 + (actualLatency / 200) * 600} y="270" textAnchor="middle" fontSize="11" fill="#94a3b8">{actualLatency}ms</text>
        <line x1="50" y1="280" x2="650" y2="280" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        <text x="50" y="295" textAnchor="middle" fontSize="11" fill="#10b981">10ms</text>
        <text x="650" y="295" textAnchor="middle" fontSize="11" fill="#ef4444">200ms</text>

        {/* Metrics Panel */}
        <rect x="175" y="300" width="350" height="35" rx="6" fill="#0f172a" stroke="#334155" />
        <text x="200" y="321" fontSize="11" fill="#e2e8f0" fontWeight="500">Latency: <tspan fill={actualLatency < 50 ? '#4ade80' : actualLatency < 100 ? '#fbbf24' : '#f87171'} fontWeight="700">{actualLatency}ms</tspan></text>
        <text x="320" y="321" fontSize="11" fill="#e2e8f0" fontWeight="500">Tick: <tspan fill="#4ade80" fontWeight="700">{actualTickRate}Hz</tspan></text>
        <text x="415" y="321" fontSize="11" fill="#e2e8f0" fontWeight="500">Upd: <tspan fill="#4ade80" fontWeight="700">{tickInterval.toFixed(1)}ms</tspan></text>

        {/* Lag Compensation Visualization */}
        {showLagCompensation && (
          <g transform="translate(350, 85)">
            <rect x="-60" y="-15" width="120" height="50" rx="6" fill="#0f172a" stroke="#a855f7" strokeWidth="1" />
            <text x="0" y="3" textAnchor="middle" fontSize="10" fill="#c084fc" fontWeight="600">Server Rewind</text>
            <text x="0" y="18" textAnchor="middle" fontSize="9" fill="#e2e8f0">Checks hit at t-{actualLatency}ms</text>
            <circle cx="-40" cy="0" r="3" fill="#ef4444">
              <animate attributeName="cx" values="-40;40;-40" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    );
  };

  // --- RENDER FUNCTIONS ---
  const renderBottomBar = (canGoBack: boolean, canGoNext: boolean, nextLabel: string, onNext?: () => void) => {
    const canBack = canGoBack && currentIdx > 0;

    const handleBack = () => {
      if (canBack) goToPhase(phaseOrder[currentIdx - 1]);
    };

    const handleNext = () => {
      if (!canGoNext) return;
      if (onNext) onNext();
      else if (currentIdx < phaseOrder.length - 1) goToPhase(phaseOrder[currentIdx + 1]);
    };

    return (
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '12px' : '12px 16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bgCard,
        gap: '12px',
        flexShrink: 0,
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}>
        <button
          onClick={handleBack}
          style={{
            padding: isMobile ? '10px 16px' : '10px 20px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: isMobile ? '13px' : '14px',
            backgroundColor: colors.bgCardLight,
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
            cursor: canBack ? 'pointer' : 'not-allowed',
            opacity: canBack ? 1 : 0.3,
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
        >
          ← Back
        </button>
        <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>{phaseLabels[phase]}</span>
        <button
          onClick={handleNext}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: isMobile ? '13px' : '14px',
            background: canGoNext ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` : colors.bgCardLight,
            color: canGoNext ? '#ffffff' : colors.textMuted,
            border: 'none',
            cursor: canGoNext ? 'pointer' : 'not-allowed',
            opacity: canGoNext ? 1 : 0.4,
            boxShadow: canGoNext ? `0 2px 12px ${colors.primary}30` : 'none',
            minHeight: '44px',
            transition: 'all 0.2s ease'
          }}
        >
          {nextLabel} →
        </button>
      </nav>
    );
  };

  const renderPremiumWrapper = (children: React.ReactNode, footer?: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: colors.bgDark, color: '#ffffff', overflow: 'hidden', fontWeight: 400, transition: 'all 0.3s ease' }}>
      {/* Header */}
      <nav style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '8px 12px' : '10px 16px',
        backgroundColor: colors.bgCard,
        borderBottom: `1px solid ${colors.border}`,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100
      }}>
        {/* Back + Home buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => currentIdx > 0 && goToPhase(phaseOrder[currentIdx - 1])}
            style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: currentIdx > 0 ? colors.bgCardLight : 'transparent',
              border: currentIdx > 0 ? `1px solid ${colors.border}` : '1px solid transparent',
              color: currentIdx > 0 ? colors.textSecondary : colors.textMuted,
              cursor: currentIdx > 0 ? 'pointer' : 'default',
              opacity: currentIdx > 0 ? 1 : 0.4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '44px'
            }}
            aria-label={currentIdx > 0 ? `Back to ${phaseLabels[phaseOrder[currentIdx - 1]]}` : 'No previous step'}
          >
            ←
          </button>
          <button
            onClick={requestGoHome}
            style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: colors.bgCardLight,
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '44px'
            }}
            aria-label="Exit to Home"
          >
            🏠
          </button>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                border: 'none',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.primary : 'rgba(148,163,184,0.7)',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                opacity: i > currentIdx ? 0.7 : 1,
                minHeight: '10px',
                transition: 'all 0.3s ease'
              }}
              title={`${phaseLabels[p]} (${i + 1}/${phaseOrder.length})`}
              aria-label={phaseLabels[p]}
            />
          ))}
        </div>

        {/* Phase label */}
        <span style={{
          fontSize: '11px', fontWeight: 700, color: colors.primary,
          padding: '4px 8px', borderRadius: '6px', backgroundColor: `${colors.primary}15`
        }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
      </nav>

      {/* Main content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: '56px',
        paddingBottom: footer ? '100px' : '0',
        WebkitOverflowScrolling: 'touch',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
          {children}
        </div>
      </div>

      {/* Footer */}
      {footer}
    </div>
  );

  const renderSectionHeader = (phaseName: string, title: string, subtitle?: string) => (
    <div style={{ marginBottom: typo.sectionGap }}>
      <p style={{ fontSize: typo.label, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px', color: colors.primary }}>{phaseName}</p>
      <h2 style={{ fontSize: typo.heading, fontWeight: 800, color: colors.textPrimary, lineHeight: 1.2, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: typo.small, marginTop: '4px', color: colors.textSecondary, lineHeight: 1.4, margin: 0 }}>{subtitle}</p>}
    </div>
  );

  // --- PHASE RENDERS ---

  // HOOK PHASE
  if (phase === 'hook') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('Introduction', 'How Games Talk Across the Internet', 'Discover the hidden world of game networking')}

        <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
          {renderNetworkVisualization(false, false)}
        </div>

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ fontSize: typo.bodyLarge, lineHeight: 1.6, color: colors.textSecondary, margin: 0 }}>
            Every time you play an online game, your device is having a rapid conversation with servers
            potentially thousands of miles away. How do games feel instant when data takes time to travel?
            Let's explore the clever tricks that make multiplayer gaming possible!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { icon: '🎮', label: 'Client-Server' },
            { icon: '⚡', label: 'Latency' },
            { icon: '🔄', label: 'Tick Rate' },
            { icon: '🎯', label: 'Lag Compensation' }
          ].map((item, i) => (
            <div key={i} style={{
              flex: '1 1 calc(50% - 6px)',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{item.icon}</div>
              <div style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>,
      renderBottomBar(false, true, 'Begin Discovery')
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('Predict', 'What Happens When You Press a Button?', 'Think about what you expect')}

        <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
          {renderNetworkVisualization(false, false)}
        </div>

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          backgroundColor: `${colors.accent}15`,
          border: `1px solid ${colors.accent}40`
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0, marginBottom: '12px' }}>
            <strong style={{ color: colors.accent }}>Scenario:</strong> You're playing an online shooter.
            You press the fire button while aiming at an enemy 50 meters away. The server is 100ms (0.1 seconds) away.
          </p>
          <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            When should your shot be calculated - on your device or the server?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'client', label: 'On my device (client) for instant feedback', icon: '💻' },
            { id: 'server', label: 'On the server for fair, authoritative results', icon: '🖥️' },
            { id: 'both', label: 'Both work together - predict locally, verify server-side', icon: '🤝' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => { setPrediction(opt.id); playSound('click'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: prediction === opt.id ? `${colors.primary}20` : colors.bgCard,
                border: `2px solid ${prediction === opt.id ? colors.primary : colors.border}`,
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: '44px'
              }}
            >
              <span style={{ fontSize: '20px' }}>{opt.icon}</span>
              <span style={{ fontSize: typo.body, fontWeight: prediction === opt.id ? 700 : 500 }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>,
      renderBottomBar(true, !!prediction, 'See What Happens')
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('Experiment', 'Explore Network Parameters', 'Adjust latency and tick rate to see their effects')}

        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: `${colors.primary}15`,
          border: `1px solid ${colors.primary}40`,
          marginBottom: '8px'
        }}>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
            👁️ <strong>Observe:</strong> Watch how data packets move between client and server. Higher latency = longer travel time!
          </p>
        </div>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
              {renderNetworkVisualization(true, false)}
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Controls */}
            <div style={{
              padding: typo.cardPadding,
              borderRadius: '12px',
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>Network Latency (Ping)</label>
                  <span style={{ fontSize: typo.small, color: latency < 50 ? colors.success : latency < 100 ? colors.warning : colors.danger, fontWeight: 700 }}>{latency}ms</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={latency}
                  onChange={(e) => setLatency(Number(e.target.value))}
                  style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.label, color: colors.textMuted }}>
                  <span>10ms (Excellent)</span>
                  <span>200ms (Poor)</span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>Server Tick Rate</label>
                  <span style={{ fontSize: typo.small, color: colors.primary, fontWeight: 700 }}>{tickRate}Hz</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="128"
                  value={tickRate}
                  onChange={(e) => setTickRate(Number(e.target.value))}
                  style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typo.label, color: colors.textMuted }}>
                  <span>20Hz (Sluggish)</span>
                  <span>128Hz (Responsive)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgCardLight}40 100%)`,
          border: `1px solid ${colors.border}`
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0, marginBottom: '8px' }}>
            <strong style={{ color: colors.primary }}>What you're seeing:</strong> With {latency}ms latency,
            your inputs take {latency}ms to reach the server, plus another {latency}ms for the response.
            Total round-trip: <strong>{latency * 2}ms</strong>. At {tickRate}Hz, the server updates
            every <strong>{(1000/tickRate).toFixed(1)}ms</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginTop: '8px' }}>
            <div style={{ flex: 1, padding: '8px', borderRadius: '6px', backgroundColor: latency < 50 ? `${colors.success}20` : `${colors.danger}20`, border: `1px solid ${latency < 50 ? colors.success : colors.danger}`, textAlign: 'center' }}>
              <div style={{ fontSize: typo.small, fontWeight: 700, color: latency < 50 ? colors.success : colors.danger }}>Before: Low Latency</div>
              <div style={{ fontSize: typo.label, color: colors.textMuted }}>10ms ping → 20ms RTT</div>
            </div>
            <div style={{ flex: 1, padding: '8px', borderRadius: '6px', backgroundColor: `${colors.danger}20`, border: `1px solid ${colors.danger}`, textAlign: 'center' }}>
              <div style={{ fontSize: typo.small, fontWeight: 700, color: colors.danger }}>After: High Latency</div>
              <div style={{ fontSize: typo.label, color: colors.textMuted }}>200ms ping → 400ms RTT</div>
            </div>
          </div>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: '8px 0 0', fontWeight: 400 }}>
            <strong style={{ color: colors.warning }}>Why this matters:</strong> Human reaction time is ~150-300ms.
            At 200ms ping, your total delay is 400ms — nearly twice your reaction time! Real esports tournaments require sub-20ms latency.
          </p>
        </div>
      </div>,
      renderBottomBar(true, true, 'Understand Results')
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('Understanding', 'Client-Server Architecture Explained', 'Why games use this model')}

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          background: prediction === 'both' ? `linear-gradient(135deg, ${colors.success}20 0%, ${colors.bgCard} 100%)` : colors.bgCard,
          border: `1px solid ${prediction === 'both' ? colors.success : colors.border}`
        }}>
          {prediction === 'both' ? (
            <p style={{ fontSize: typo.bodyLarge, color: colors.success, margin: 0, fontWeight: 700 }}>
              ✅ Correct! Modern games use BOTH client prediction AND server authority.
            </p>
          ) : (
            <p style={{ fontSize: typo.bodyLarge, color: colors.warning, margin: 0 }}>
              The best answer is: Both work together! Here's why...
            </p>
          )}
        </div>

        <div style={{ padding: '12px', borderRadius: '8px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}40`, marginBottom: '8px' }}>
          <p style={{ fontSize: typo.small, color: colors.primary, margin: 0, fontWeight: 600 }}>
            Formula: RTT = 2 × Latency | Tick Interval = 1000ms / TickRate Hz
          </p>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: '4px 0 0', fontWeight: 400 }}>
            Your prediction: {prediction === 'both' ? '✅ Correct — both client and server work together' : prediction === 'client' ? 'Client-only is partly right but incomplete' : 'Server-only is partly right but incomplete'}
          </p>
        </div>
        {[
          { icon: '💻', title: 'Client Prediction', desc: 'Your device immediately shows the result of your action for instant feedback. This is because waiting for server confirmation (50-200ms round-trip) would feel laggy.' },
          { icon: '🖥️', title: 'Server Authority', desc: 'The server has the final say on what actually happened. Therefore, cheating is prevented and fairness is ensured for all players.' },
          { icon: '🔄', title: 'Reconciliation', desc: 'When server results differ from your prediction, the game smoothly corrects your view. This means you might see slight "rubber-banding" corrections at 50-100ms intervals.' }
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: '16px',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>{item.icon}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: typo.bodyLarge, marginBottom: '4px', color: colors.textPrimary, margin: 0 }}>{item.title}</p>
              <p style={{ fontSize: typo.body, lineHeight: 1.6, color: colors.textSecondary, margin: 0 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>,
      renderBottomBar(true, true, 'Next Challenge')
    );
  }

  // TWIST_PREDICT PHASE
  if (phase === 'twist_predict') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('New Variable', 'What About Lag Compensation?', 'A new twist to consider')}

        <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
          {renderNetworkVisualization(false, true)}
        </div>

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          backgroundColor: `${colors.accent}15`,
          border: `1px solid ${colors.accent}40`
        }}>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0, marginBottom: '12px' }}>
            <strong style={{ color: colors.accent }}>New Scenario:</strong> You fire at an enemy who's running.
            On YOUR screen, you hit them perfectly. But by the time your shot reaches the server (100ms later),
            the enemy has moved!
          </p>
          <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
            Should the server count this as a hit or a miss?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { id: 'miss', label: 'Miss - the enemy moved, too bad for the shooter', icon: '❌' },
            { id: 'hit', label: 'Hit - the server should "rewind time" to check what the shooter saw', icon: '⏪' },
            { id: 'random', label: 'Random - flip a coin for fairness', icon: '🎲' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => { setTwistPrediction(opt.id); playSound('click'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: twistPrediction === opt.id ? `${colors.accent}20` : colors.bgCard,
                border: `2px solid ${twistPrediction === opt.id ? colors.accent : colors.border}`,
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: '44px'
              }}
            >
              <span style={{ fontSize: '20px' }}>{opt.icon}</span>
              <span style={{ fontSize: typo.body, fontWeight: twistPrediction === opt.id ? 700 : 500 }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>,
      renderBottomBar(true, !!twistPrediction, 'See How It Works')
    );
  }

  // TWIST_PLAY PHASE
  if (phase === 'twist_play') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('Observer Effect', 'Lag Compensation in Action', 'Watch how servers handle latency')}

        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: `${colors.accent}15`,
          border: `1px solid ${colors.accent}40`,
          marginBottom: '8px'
        }}>
          <p style={{ fontSize: typo.small, color: colors.textSecondary, margin: 0 }}>
            👁️ <strong>Observe:</strong> The server "rewinds" time to check where the target was when the shooter fired!
          </p>
        </div>

        {/* Side-by-side layout */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '20px',
          width: '100%',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
              {renderNetworkVisualization(true, true)}
            </div>
          </div>
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
            {/* Interactive controls */}
            <div style={{
              padding: typo.cardPadding,
              borderRadius: '12px',
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: typo.small, color: colors.textSecondary, fontWeight: 600 }}>Shooter's Latency</label>
                  <span style={{ fontSize: typo.small, color: colors.primary, fontWeight: 700 }}>{latency}ms</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={latency}
                  onChange={(e) => setLatency(Number(e.target.value))}
                  style={{ width: '100%', height: '20px', accentColor: '#3b82f6', touchAction: 'pan-y', WebkitAppearance: 'none', cursor: 'pointer' }}
                />
              </div>

              <div style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: colors.bgCardLight,
                border: `1px solid ${colors.border}`
              }}>
                <p style={{ fontSize: typo.body, color: colors.textSecondary, margin: 0 }}>
                  <strong style={{ color: colors.accent }}>How it works:</strong> When a shot arrives at the server,
                  it includes a timestamp. The server "rewinds" the game state by {latency}ms to see exactly what
                  the shooter saw when they pulled the trigger. This makes hits feel fair even with high latency!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>,
      renderBottomBar(true, true, 'Deep Understanding')
    );
  }

  // TWIST_REVIEW PHASE
  if (phase === 'twist_review') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('Deep Insight', 'The Art of Lag Compensation', 'Balancing fairness across connections')}

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          background: twistPrediction === 'hit' ? `linear-gradient(135deg, ${colors.success}20 0%, ${colors.bgCard} 100%)` : colors.bgCard,
          border: `1px solid ${twistPrediction === 'hit' ? colors.success : colors.border}`
        }}>
          {twistPrediction === 'hit' ? (
            <p style={{ fontSize: typo.bodyLarge, color: colors.success, margin: 0, fontWeight: 700 }}>
              ✅ Correct! Servers use "lag compensation" to rewind time and verify hits.
            </p>
          ) : (
            <p style={{ fontSize: typo.bodyLarge, color: colors.warning, margin: 0 }}>
              The answer is: Hit! The server rewinds time. Here's the deeper insight...
            </p>
          )}
        </div>

        {[
          { icon: '⏪', title: 'Server-Side Rewind', desc: 'The server stores recent game states in a buffer. When a shot arrives, it checks where everyone WAS at the time of firing.' },
          { icon: '⚖️', title: 'Favor the Shooter', desc: 'This system "favors the shooter" - if it looked like a hit on your screen, it probably counts. This makes aiming feel responsive.' },
          { icon: '👀', title: 'Peekers Advantage', desc: 'High-ping players get a slight advantage when "peeking" corners - they see enemies before enemies see them. This is a known trade-off.' }
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: '16px',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ fontSize: '28px', flexShrink: 0 }}>{item.icon}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: typo.bodyLarge, marginBottom: '4px', color: colors.textPrimary, margin: 0 }}>{item.title}</p>
              <p style={{ fontSize: typo.body, lineHeight: 1.6, color: colors.textSecondary, margin: 0 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>,
      renderBottomBar(true, true, 'Real Applications')
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="Remote Game"
        applications={transferApplications}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = transferApplications[selectedApp];
    const allCompleted = completedApps.every(Boolean);

    const handleGotIt = () => {
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      playSound('success');
    };

    const handleNextApp = () => {
      const nextIdx = (selectedApp + 1) % transferApplications.length;
      setSelectedApp(nextIdx);
      playSound('click');
    };

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('Real World', 'Game Networking in Practice', 'See how these concepts power real games')}

        {/* App selector */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {transferApplications.map((a, i) => (
            <button
              key={i}
              onClick={() => { setSelectedApp(i); playSound('click'); }}
              style={{
                flex: '1 1 calc(25% - 6px)',
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: selectedApp === i ? `${colors.primary}20` : colors.bgCard,
                border: `2px solid ${selectedApp === i ? colors.primary : completedApps[i] ? colors.success : colors.border}`,
                cursor: 'pointer',
                textAlign: 'center',
                minHeight: '44px'
              }}
            >
              <div style={{ fontSize: '20px' }}>{a.icon}</div>
              <div style={{ fontSize: typo.label, color: colors.textSecondary, marginTop: '4px' }}>{a.title.split(' ')[0]}</div>
              {completedApps[i] && <div style={{ color: colors.success, fontSize: '10px' }}>✓</div>}
            </button>
          ))}
        </div>

        {/* Selected app details */}
        <div style={{
          padding: typo.cardPadding,
          borderRadius: '16px',
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '32px' }}>{app.icon}</span>
            <div>
              <h3 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
              <span style={{ fontSize: typo.label, color: colors.primary, fontWeight: 600 }}>{app.industry}</span>
            </div>
          </div>
          <p style={{ fontSize: typo.body, lineHeight: 1.6, color: colors.textSecondary, margin: 0, marginBottom: '12px' }}>{app.description}</p>
          {app.stats && (
            <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', marginBottom: '12px' }}>
              {app.stats.map((s, si) => (
                <div key={si} style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: colors.bgCardLight, border: `1px solid ${colors.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.primary }}>{s.value}</div>
                  <div style={{ fontSize: typo.label, color: colors.textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: `${colors.accent}15`,
            border: `1px solid ${colors.accent}40`
          }}>
            <p style={{ fontSize: typo.small, color: colors.accent, margin: 0, fontWeight: 600 }}>
              Key Principle: {app.principle}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleGotIt}
            disabled={completedApps[selectedApp]}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: completedApps[selectedApp] ? colors.bgCardLight : colors.success,
              color: completedApps[selectedApp] ? colors.textMuted : colors.textPrimary,
              border: 'none',
              fontWeight: 700,
              fontSize: typo.body,
              cursor: completedApps[selectedApp] ? 'default' : 'pointer',
              minHeight: '44px'
            }}
          >
            {completedApps[selectedApp] ? '✓ Completed' : 'Got It'}
          </button>
          <button
            onClick={handleNextApp}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: colors.bgCardLight,
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
              fontWeight: 600,
              fontSize: typo.body,
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Next Application →
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: typo.small, color: colors.textMuted }}>
          Progress: {completedApps.filter(Boolean).length}/{transferApplications.length} applications explored
        </div>
      </div>,
      renderBottomBar(true, allCompleted, 'Take the Test')
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    const q = testQuestions[testQuestion];
    const selectedAnswer = testAnswers[testQuestion];
    const isAnswered = selectedAnswer !== null;

    if (testSubmitted) {
      const correctCount = testAnswers.filter((ans, i) =>
        testQuestions[i].options.find(o => o.id === ans)?.correct
      ).length;
      const score = Math.round((correctCount / testQuestions.length) * 100);

      return renderPremiumWrapper(
        <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
          {renderSectionHeader('Results', 'Test Complete!', `You scored ${score}%`)}

          <div style={{
            padding: '24px',
            borderRadius: '16px',
            backgroundColor: score >= 70 ? `${colors.success}20` : `${colors.warning}20`,
            border: `1px solid ${score >= 70 ? colors.success : colors.warning}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>{score >= 70 ? '🎉' : '📚'}</div>
            <p style={{ fontSize: typo.heading, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
              {correctCount} / {testQuestions.length} Correct
            </p>
            <p style={{ fontSize: typo.body, color: colors.textSecondary, marginTop: '8px' }}>
              {score >= 90 ? 'Outstanding! You\'ve mastered game networking!' :
               score >= 70 ? 'Great job! You understand the core concepts.' :
               'Keep learning! Review the concepts and try again.'}
            </p>
          </div>
        </div>,
        renderBottomBar(true, true, 'Complete')
      );
    }

    const handleAnswerSelect = (answerId: string) => {
      const newAnswers = [...testAnswers];
      newAnswers[testQuestion] = answerId;
      setTestAnswers(newAnswers);
      playSound('click');
    };

    const handleNextQuestion = () => {
      if (testQuestion < testQuestions.length - 1) {
        setTestQuestion(testQuestion + 1);
        playSound('transition');
      }
    };

    const handleSubmit = () => {
      if (!showQuizConfirm) {
        setShowQuizConfirm(true);
        return;
      }
      setTestSubmitted(true);
      playSound('complete');
      emitGameEvent('game_completed', {
        phase: 'test',
        score: testAnswers.filter((ans, i) => testQuestions[i].options.find(o => o.id === ans)?.correct).length,
        maxScore: testQuestions.length
      });
    };

    const allAnswered = testAnswers.every(a => a !== null);
    const isLastQuestion = testQuestion === testQuestions.length - 1;

    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap }}>
        {renderSectionHeader('Knowledge Test', `Question ${testQuestion + 1} of ${testQuestions.length}`, q.scenario)}

        <div style={{
          padding: typo.cardPadding,
          borderRadius: '12px',
          backgroundColor: `${colors.accent}15`,
          border: `1px solid ${colors.accent}40`
        }}>
          <p style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>{q.question}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {q.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleAnswerSelect(opt.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: selectedAnswer === opt.id ? `${colors.primary}20` : colors.bgCard,
                border: `2px solid ${selectedAnswer === opt.id ? colors.primary : colors.border}`,
                color: colors.textPrimary,
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: '44px'
              }}
            >
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: selectedAnswer === opt.id ? colors.primary : colors.bgCardLight,
                color: selectedAnswer === opt.id ? colors.textPrimary : colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: typo.small,
                fontWeight: 700,
                flexShrink: 0
              }}>
                {opt.id.toUpperCase()}
              </span>
              <span style={{ fontSize: typo.body, lineHeight: 1.5 }}>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Quiz progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
          {testQuestions.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === testQuestion ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: testAnswers[i] !== null ? colors.success : i === testQuestion ? colors.primary : colors.border
              }}
            />
          ))}
        </div>

        {/* Confirm dialog */}
        {showQuizConfirm && (
          <div style={{
            padding: typo.cardPadding,
            borderRadius: '12px',
            backgroundColor: `${colors.warning}20`,
            border: `1px solid ${colors.warning}`
          }}>
            <p style={{ fontSize: typo.body, color: colors.textPrimary, margin: 0, marginBottom: '12px' }}>
              Are you sure you want to submit? You've answered {testAnswers.filter(a => a !== null).length}/{testQuestions.length} questions.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowQuizConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: colors.bgCardLight,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Review Answers
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: colors.success,
                  color: colors.textPrimary,
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Submit Test
              </button>
            </div>
          </div>
        )}
      </div>,
      renderBottomBar(
        true,
        isAnswered,
        isLastQuestion ? (allAnswered ? 'Submit Test' : 'Answer All Questions') : 'Next Question',
        isLastQuestion ? handleSubmit : handleNextQuestion
      )
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return renderPremiumWrapper(
      <div style={{ padding: typo.pagePadding, display: 'flex', flexDirection: 'column', gap: typo.sectionGap, position: 'relative' }}>
        {/* Confetti */}
        {confetti.map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: '8px',
              height: '8px',
              backgroundColor: c.color,
              borderRadius: '50%',
              animation: `fall 3s ease-in-out ${c.delay}s infinite`,
              pointerEvents: 'none'
            }}
          />
        ))}
        <style>{`@keyframes fall { 0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; } 50% { transform: translateY(20px) rotate(180deg); opacity: 0.5; } }`}</style>

        {renderSectionHeader('Mastery', 'Congratulations! 🎉', 'You\'ve mastered game networking concepts')}

        <div style={{
          padding: '24px',
          borderRadius: '16px',
          background: `linear-gradient(135deg, ${colors.success}20 0%, ${colors.accent}20 100%)`,
          border: `1px solid ${colors.success}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🏆</div>
          <h3 style={{ fontSize: typo.heading, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>
            Network Architecture Expert
          </h3>
          <p style={{ fontSize: typo.body, color: colors.textSecondary, marginTop: '8px' }}>
            You now understand how multiplayer games communicate across the internet!
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: typo.bodyLarge, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Key Concepts Mastered:</h4>
          {[
            { icon: '🖥️', text: 'Client-Server Architecture' },
            { icon: '⚡', text: 'Network Latency & Tick Rate' },
            { icon: '⏪', text: 'Lag Compensation & Server Rewind' },
            { icon: '🔄', text: 'Interpolation & Extrapolation' },
            { icon: '🛡️', text: 'Authoritative Servers & Anti-Cheat' }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.border}`
            }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontSize: typo.body, color: colors.textSecondary }}>{item.text}</span>
              <span style={{ marginLeft: 'auto', color: colors.success }}>✓</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => goToPhase('hook')}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            color: colors.textPrimary,
            border: 'none',
            fontWeight: 700,
            fontSize: typo.bodyLarge,
            cursor: 'pointer',
            minHeight: '44px'
          }}
        >
          Explore Again
        </button>
      </div>,
      null
    );
  }

  // Default fallback to hook
  return renderPremiumWrapper(
    <div style={{ padding: typo.pagePadding }}>
      <p style={{ color: colors.textSecondary }}>Loading...</p>
    </div>,
    renderBottomBar(false, true, 'Start')
  );
};

export default RemoteGameRenderer;
