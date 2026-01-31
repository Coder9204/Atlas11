'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface NetworkLatencyRendererProps {
  phase: 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#8b5cf6',
  accentGlow: 'rgba(139, 92, 246, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  fiber: '#22d3ee',
  packet: '#a78bfa',
  server: '#64748b',
};

// Speed of light in fiber (approx 2/3 of c due to refractive index)
const SPEED_OF_LIGHT_FIBER = 200000; // km/s
const SPEED_OF_LIGHT_VACUUM = 299792; // km/s

// City distances (approximate fiber distances in km)
const cities = [
  { name: 'New York', lat: 40.7, lon: -74.0 },
  { name: 'London', lat: 51.5, lon: -0.1 },
  { name: 'Tokyo', lat: 35.7, lon: 139.7 },
  { name: 'Sydney', lat: -33.9, lon: 151.2 },
  { name: 'San Francisco', lat: 37.8, lon: -122.4 },
];

// Approximate fiber distances (km) - these are longer than straight-line due to cable routes
const fiberDistances: Record<string, number> = {
  'New York-London': 5600,
  'New York-Tokyo': 15000,
  'New York-Sydney': 18000,
  'New York-San Francisco': 4200,
  'London-Tokyo': 14500,
  'London-Sydney': 21000,
  'London-San Francisco': 8700,
  'Tokyo-Sydney': 9500,
  'Tokyo-San Francisco': 9000,
  'Sydney-San Francisco': 12500,
};

const NetworkLatencyRenderer: React.FC<NetworkLatencyRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Simulation state
  const [sourceCity, setSourceCity] = useState(0);
  const [destCity, setDestCity] = useState(1);
  const [packetSize, setPacketSize] = useState(1500); // bytes
  const [bandwidth, setBandwidth] = useState(1000); // Mbps
  const [numHops, setNumHops] = useState(15);
  const [processingDelay, setProcessingDelay] = useState(0.1); // ms per hop
  const [animationFrame, setAnimationFrame] = useState(0);
  const [packetInFlight, setPacketInFlight] = useState(false);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Calculate latency components
  const getDistance = () => {
    const key1 = `${cities[sourceCity].name}-${cities[destCity].name}`;
    const key2 = `${cities[destCity].name}-${cities[sourceCity].name}`;
    return fiberDistances[key1] || fiberDistances[key2] || 1000;
  };

  const distance = getDistance();
  const propagationDelay = (distance / SPEED_OF_LIGHT_FIBER) * 1000; // ms
  const serialization = (packetSize * 8) / (bandwidth * 1000); // ms
  const routerProcessing = numHops * processingDelay; // ms
  const totalOneWay = propagationDelay + serialization + routerProcessing;
  const roundTrip = totalOneWay * 2;
  const theoreticalMin = (distance / SPEED_OF_LIGHT_VACUUM) * 1000 * 2; // theoretical RTT at c

  // Animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (packetInFlight) {
      interval = setInterval(() => {
        setAnimationFrame(prev => {
          if (prev >= 100) {
            setPacketInFlight(false);
            return 0;
          }
          return prev + 2;
        });
      }, totalOneWay / 50);
    }
    return () => clearInterval(interval);
  }, [packetInFlight, totalOneWay]);

  const predictions = [
    { id: 'instant', label: 'Instant - electricity and light travel at light speed' },
    { id: 'very_small', label: 'Less than 1ms - modern networks are very fast' },
    { id: 'tens', label: 'Tens of milliseconds - limited by speed of light in fiber' },
    { id: 'seconds', label: 'Several seconds - data must be processed many times' },
  ];

  const twistPredictions = [
    { id: 'overcome', label: 'Better technology can overcome the light speed limit' },
    { id: 'no_effect', label: 'Distance has no effect on modern fiber networks' },
    { id: 'hard_floor', label: 'Geographic distance sets an absolute minimum latency floor' },
    { id: 'satellites', label: 'Satellite links can bypass the distance problem' },
  ];

  const transferApplications = [
    {
      title: 'High-Frequency Trading',
      description: 'Stock traders pay millions for microseconds of advantage. Why does physical location matter so much?',
      answer: 'At 200,000 km/s in fiber, each 100km adds 0.5ms of latency. Firms build data centers feet away from exchanges. Microwave towers (faster than fiber!) connect Chicago to NYC. Even a 1ms advantage can mean millions in profit.',
    },
    {
      title: 'Online Gaming',
      description: 'Gamers obsess over "ping" times. Why do players in Australia struggle with US servers?',
      answer: 'Sydney to LA is ~12,500km by fiber = 62.5ms one-way minimum at light speed. Add router hops and processing: 150-200ms RTT is typical. Thats 6-7 frames at 30fps - noticeable input lag that affects competitive play.',
    },
    {
      title: 'Content Delivery Networks',
      description: 'CDNs like Cloudflare have servers in 300+ cities. Why not just use one big data center?',
      answer: 'A user 5000km away has 50ms+ propagation delay. CDNs cache content at "edge" locations close to users, often within 50km. This reduces latency from 100+ ms to under 10ms, making websites feel instant.',
    },
    {
      title: 'Mars Communication',
      description: 'Mars rovers cant be controlled in real-time. Why is there such a long delay?',
      answer: 'Mars is 55-400 million km from Earth. At light speed, thats 3-22 MINUTES one-way! Round-trip communication takes 6-44 minutes. Rovers must operate autonomously because real-time control is physically impossible.',
    },
  ];

  const testQuestions = [
    {
      question: 'Light travels through fiber optic cable at approximately:',
      options: [
        { text: 'Speed of light in vacuum (300,000 km/s)', correct: false },
        { text: '2/3 speed of light (~200,000 km/s)', correct: true },
        { text: 'Half speed of light (150,000 km/s)', correct: false },
        { text: '10% speed of light (30,000 km/s)', correct: false },
      ],
    },
    {
      question: 'Propagation delay across 10,000 km of fiber is approximately:',
      options: [
        { text: '0.5 ms', correct: false },
        { text: '5 ms', correct: false },
        { text: '50 ms', correct: true },
        { text: '500 ms', correct: false },
      ],
    },
    {
      question: 'What component of latency can be improved with faster hardware?',
      options: [
        { text: 'Propagation delay', correct: false },
        { text: 'Serialization and processing delay', correct: true },
        { text: 'Speed of light limit', correct: false },
        { text: 'Geographic distance', correct: false },
      ],
    },
    {
      question: 'Why do high-frequency traders prefer microwave links over fiber?',
      options: [
        { text: 'Microwave can carry more data', correct: false },
        { text: 'Microwave travels at c in air (faster than light in glass)', correct: true },
        { text: 'Microwave equipment is cheaper', correct: false },
        { text: 'Microwave has better security', correct: false },
      ],
    },
    {
      question: 'Round-trip time (RTT) from New York to London (5600km) has a minimum of:',
      options: [
        { text: '~28 ms (at fiber speed)', correct: false },
        { text: '~37 ms (at fiber speed)', correct: false },
        { text: '~56 ms (at fiber speed)', correct: true },
        { text: '~112 ms (at fiber speed)', correct: false },
      ],
    },
    {
      question: 'Serialization delay for a 1500-byte packet on a 100 Mbps link is:',
      options: [
        { text: '0.012 ms', correct: false },
        { text: '0.12 ms', correct: true },
        { text: '1.2 ms', correct: false },
        { text: '12 ms', correct: false },
      ],
    },
    {
      question: 'Why cant satellites in geostationary orbit provide low-latency internet?',
      options: [
        { text: 'Satellites move too fast', correct: false },
        { text: '35,786 km altitude means 240ms+ round trip', correct: true },
        { text: 'Radio waves are slower than light', correct: false },
        { text: 'Atmospheric interference', correct: false },
      ],
    },
    {
      question: 'Low Earth Orbit (LEO) satellite constellations like Starlink improve latency because:',
      options: [
        { text: 'They use faster radio frequencies', correct: false },
        { text: 'They orbit at ~550km vs 35,786km altitude', correct: true },
        { text: 'They bypass the speed of light limit', correct: false },
        { text: 'They dont need routing', correct: false },
      ],
    },
    {
      question: 'What is the theoretical minimum RTT to Mars at closest approach (55 million km)?',
      options: [
        { text: 'About 3 seconds', correct: false },
        { text: 'About 30 seconds', correct: false },
        { text: 'About 6 minutes', correct: true },
        { text: 'About 30 minutes', correct: false },
      ],
    },
    {
      question: 'CDNs reduce latency primarily by:',
      options: [
        { text: 'Using faster fiber connections', correct: false },
        { text: 'Compressing data more efficiently', correct: false },
        { text: 'Caching content closer to users geographically', correct: true },
        { text: 'Bypassing internet routing', correct: false },
      ],
    },
  ];

  const handleTestAnswer = useCallback((questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  }, [testAnswers]);

  const submitTest = useCallback(() => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 7 && onCorrectAnswer) onCorrectAnswer();
    else if (score < 7 && onIncorrectAnswer) onIncorrectAnswer();
  }, [testAnswers, testQuestions, onCorrectAnswer, onIncorrectAnswer]);

  const renderVisualization = (interactive: boolean) => {
    const width = 700;
    const height = 400;

    // City positions on visualization - adjusted for wider canvas
    const cityPositions = [
      { x: 120, y: 160 },  // New York
      { x: 300, y: 100 },  // London
      { x: 550, y: 130 }, // Tokyo
      { x: 500, y: 300 }, // Sydney
      { x: 80, y: 220 },  // San Francisco
    ];

    const srcPos = cityPositions[sourceCity];
    const dstPos = cityPositions[destCity];
    const packetProgress = animationFrame / 100;
    const packetX = srcPos.x + (dstPos.x - srcPos.x) * packetProgress;
    const packetY = srcPos.y + (dstPos.y - srcPos.y) * packetProgress;

    // Calculate control point for curved path
    const midX = (srcPos.x + dstPos.x) / 2;
    const midY = (srcPos.y + dstPos.y) / 2;
    const curveOffset = -40; // Curve upward
    const ctrlX = midX;
    const ctrlY = midY + curveOffset;

    // Bezier curve position calculation
    const getBezierPoint = (t: number) => {
      const x = (1-t)*(1-t)*srcPos.x + 2*(1-t)*t*ctrlX + t*t*dstPos.x;
      const y = (1-t)*(1-t)*srcPos.y + 2*(1-t)*t*ctrlY + t*t*dstPos.y;
      return { x, y };
    };
    const packetPos = getBezierPoint(packetProgress);

    // Calculate path length approximation for latency indicator spacing
    const pathLength = Math.sqrt(Math.pow(dstPos.x - srcPos.x, 2) + Math.pow(dstPos.y - srcPos.y, 2));
    const hopCount = Math.min(numHops, Math.floor(pathLength / 40)); // Limit visible hops

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '16px', maxWidth: '750px' }}
        >
          <defs>
            {/* Premium background gradient */}
            <linearGradient id="netlBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#030712" />
              <stop offset="25%" stopColor="#0a1628" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="75%" stopColor="#0a1628" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Server device gradient - metallic blue */}
            <linearGradient id="netlServerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="25%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="75%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>

            {/* Client device gradient - emerald */}
            <linearGradient id="netlClientGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="25%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="75%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Destination device gradient - rose/red */}
            <linearGradient id="netlDestGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9f1239" />
              <stop offset="25%" stopColor="#e11d48" />
              <stop offset="50%" stopColor="#fb7185" />
              <stop offset="75%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>

            {/* Inactive node gradient - slate */}
            <linearGradient id="netlInactiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Fiber optic cable gradient - cyan with depth */}
            <linearGradient id="netlFiberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="20%" stopColor="#22d3ee" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="80%" stopColor="#22d3ee" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
            </linearGradient>

            {/* Active fiber path gradient - brighter */}
            <linearGradient id="netlActiveFiberGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="15%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="35%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="50%" stopColor="#a5f3fc" stopOpacity="1" />
              <stop offset="65%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
            </linearGradient>

            {/* Data packet radial gradient - glowing core */}
            <radialGradient id="netlPacketGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="20%" stopColor="#a5f3fc" stopOpacity="1" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#0891b2" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
            </radialGradient>

            {/* Packet trail gradient */}
            <linearGradient id="netlPacketTrail" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#67e8f9" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0.9" />
            </linearGradient>

            {/* Router hop indicator gradient - amber */}
            <radialGradient id="netlRouterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* World map gradient */}
            <linearGradient id="netlMapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#334155" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.3" />
            </linearGradient>

            {/* Info panel gradient */}
            <linearGradient id="netlInfoPanelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
            </linearGradient>

            {/* Glow filter for nodes */}
            <filter id="netlNodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong glow for active elements */}
            <filter id="netlActiveGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Packet glow filter */}
            <filter id="netlPacketFilter" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="3" result="blur1" />
              <feGaussianBlur stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle inner shadow for panels */}
            <filter id="netlInnerShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feOffset dx="0" dy="1" />
              <feComposite in="SourceGraphic" operator="over" />
            </filter>

            {/* Fiber cable pattern */}
            <pattern id="netlFiberPattern" patternUnits="userSpaceOnUse" width="20" height="4">
              <rect width="20" height="4" fill="transparent" />
              <rect x="0" y="1" width="15" height="2" rx="1" fill="#22d3ee" opacity="0.6" />
            </pattern>
          </defs>

          {/* Premium dark background */}
          <rect width={width} height={height} fill="url(#netlBgGradient)" />

          {/* Subtle grid pattern */}
          <g opacity="0.1">
            {Array.from({ length: 15 }).map((_, i) => (
              <line key={`vgrid-${i}`} x1={i * 50} y1="0" x2={i * 50} y2={height} stroke="#64748b" strokeWidth="0.5" />
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`hgrid-${i}`} x1="0" y1={i * 50} x2={width} y2={i * 50} stroke="#64748b" strokeWidth="0.5" />
            ))}
          </g>

          {/* World map outline - stylized ellipse */}
          <ellipse cx={350} cy={190} rx={300} ry={160} fill="url(#netlMapGradient)" stroke="#334155" strokeWidth="1" strokeDasharray="8,4" opacity="0.5" />

          {/* Draw all fiber connections faintly */}
          {cityPositions.map((src, i) =>
            cityPositions.map((dst, j) => {
              if (i >= j) return null;
              const mx = (src.x + dst.x) / 2;
              const my = (src.y + dst.y) / 2 - 20;
              return (
                <path
                  key={`fiber-${i}-${j}`}
                  d={`M ${src.x} ${src.y} Q ${mx} ${my} ${dst.x} ${dst.y}`}
                  fill="none"
                  stroke="url(#netlFiberGradient)"
                  strokeWidth="1.5"
                  opacity="0.15"
                />
              );
            })
          )}

          {/* Active connection path with glow */}
          <g>
            {/* Outer glow */}
            <path
              d={`M ${srcPos.x} ${srcPos.y} Q ${ctrlX} ${ctrlY} ${dstPos.x} ${dstPos.y}`}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="8"
              opacity="0.2"
              filter="url(#netlActiveGlow)"
            />
            {/* Main fiber cable */}
            <path
              d={`M ${srcPos.x} ${srcPos.y} Q ${ctrlX} ${ctrlY} ${dstPos.x} ${dstPos.y}`}
              fill="none"
              stroke="url(#netlActiveFiberGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Inner bright core */}
            <path
              d={`M ${srcPos.x} ${srcPos.y} Q ${ctrlX} ${ctrlY} ${dstPos.x} ${dstPos.y}`}
              fill="none"
              stroke="#a5f3fc"
              strokeWidth="1"
              opacity="0.8"
            />
          </g>

          {/* Router hop indicators along path */}
          {Array.from({ length: hopCount }).map((_, i) => {
            const t = (i + 1) / (hopCount + 1);
            const hopPos = getBezierPoint(t);
            const isPacketNear = packetInFlight && Math.abs(packetProgress - t) < 0.08;
            return (
              <g key={`hop-${i}`}>
                <circle
                  cx={hopPos.x}
                  cy={hopPos.y}
                  r={isPacketNear ? 6 : 4}
                  fill={isPacketNear ? "url(#netlRouterGlow)" : "#475569"}
                  filter={isPacketNear ? "url(#netlNodeGlow)" : undefined}
                  opacity={isPacketNear ? 1 : 0.6}
                />
                {isPacketNear && (
                  <circle
                    cx={hopPos.x}
                    cy={hopPos.y}
                    r={10}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1"
                    opacity="0.5"
                  >
                    <animate attributeName="r" from="6" to="14" dur="0.3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="0.3s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          {/* City nodes - premium server/client visualization */}
          {cityPositions.map((pos, i) => {
            const isSource = i === sourceCity;
            const isDest = i === destCity;
            const isActive = isSource || isDest;
            const nodeSize = isActive ? 18 : 12;
            const gradient = isSource ? "url(#netlClientGradient)" : isDest ? "url(#netlDestGradient)" : "url(#netlInactiveGradient)";

            return (
              <g key={`city-${i}`}>
                {/* Outer glow ring for active nodes */}
                {isActive && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeSize + 8}
                    fill="none"
                    stroke={isSource ? "#10b981" : "#e11d48"}
                    strokeWidth="2"
                    opacity="0.3"
                    filter="url(#netlNodeGlow)"
                  />
                )}

                {/* Main node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={nodeSize}
                  fill={gradient}
                  stroke={isActive ? "#ffffff" : "#64748b"}
                  strokeWidth={isActive ? 2 : 1}
                  filter={isActive ? "url(#netlNodeGlow)" : undefined}
                />

                {/* Server/Client icon inside */}
                {isActive && (
                  <g>
                    {/* Server rack lines */}
                    <rect x={pos.x - 6} y={pos.y - 6} width="12" height="3" rx="1" fill="#ffffff" opacity="0.9" />
                    <rect x={pos.x - 6} y={pos.y - 1} width="12" height="3" rx="1" fill="#ffffff" opacity="0.7" />
                    <rect x={pos.x - 6} y={pos.y + 4} width="12" height="3" rx="1" fill="#ffffff" opacity="0.5" />
                  </g>
                )}

                {/* City label */}
                <text
                  x={pos.x}
                  y={pos.y + nodeSize + 16}
                  textAnchor="middle"
                  fill={isActive ? "#f8fafc" : "#94a3b8"}
                  fontSize={isActive ? "11" : "9"}
                  fontWeight={isActive ? "bold" : "normal"}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {cities[i].name}
                </text>

                {/* Role label for active nodes */}
                {isSource && (
                  <text x={pos.x} y={pos.y - nodeSize - 8} textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">
                    SOURCE
                  </text>
                )}
                {isDest && (
                  <text x={pos.x} y={pos.y - nodeSize - 8} textAnchor="middle" fill="#e11d48" fontSize="9" fontWeight="bold">
                    DESTINATION
                  </text>
                )}
              </g>
            );
          })}

          {/* Data packet animation */}
          {packetInFlight && (
            <g>
              {/* Packet trail effect */}
              {Array.from({ length: 8 }).map((_, i) => {
                const trailT = Math.max(0, packetProgress - i * 0.03);
                const trailPos = getBezierPoint(trailT);
                return (
                  <circle
                    key={`trail-${i}`}
                    cx={trailPos.x}
                    cy={trailPos.y}
                    r={8 - i}
                    fill="#22d3ee"
                    opacity={(8 - i) / 20}
                  />
                );
              })}

              {/* Main packet glow */}
              <circle
                cx={packetPos.x}
                cy={packetPos.y}
                r={16}
                fill="url(#netlPacketGlow)"
                filter="url(#netlPacketFilter)"
              />

              {/* Packet core */}
              <circle
                cx={packetPos.x}
                cy={packetPos.y}
                r={6}
                fill="#ffffff"
              />

              {/* Packet icon - data bits */}
              <g transform={`translate(${packetPos.x}, ${packetPos.y})`}>
                <rect x="-3" y="-3" width="2" height="2" fill="#06b6d4" />
                <rect x="1" y="-3" width="2" height="2" fill="#06b6d4" />
                <rect x="-3" y="1" width="2" height="2" fill="#06b6d4" />
                <rect x="1" y="1" width="2" height="2" fill="#06b6d4" />
              </g>

              {/* Expanding pulse ring */}
              <circle
                cx={packetPos.x}
                cy={packetPos.y}
                r={12}
                fill="none"
                stroke="#67e8f9"
                strokeWidth="2"
                opacity="0.6"
              >
                <animate attributeName="r" from="8" to="25" dur="0.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.8" to="0" dur="0.6s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* Title */}
          <text x={350} y={28} textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
            Network Latency Visualization
          </text>
          <text x={350} y={46} textAnchor="middle" fill="#94a3b8" fontSize="12" fontFamily="system-ui, -apple-system, sans-serif">
            {cities[sourceCity].name} to {cities[destCity].name}
          </text>

          {/* Info panel at bottom */}
          <g>
            <rect x={50} y={height - 70} width={width - 100} height={55} rx="12" fill="url(#netlInfoPanelGradient)" stroke="#334155" strokeWidth="1" />

            {/* Distance info */}
            <text x={150} y={height - 45} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="system-ui, -apple-system, sans-serif">
              FIBER DISTANCE
            </text>
            <text x={150} y={height - 28} textAnchor="middle" fill="#22d3ee" fontSize="16" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
              {distance.toLocaleString()} km
            </text>

            {/* Theoretical minimum */}
            <text x={350} y={height - 45} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="system-ui, -apple-system, sans-serif">
              SPEED OF LIGHT LIMIT
            </text>
            <text x={350} y={height - 28} textAnchor="middle" fill="#8b5cf6" fontSize="16" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
              {theoreticalMin.toFixed(1)} ms RTT (theoretical)
            </text>

            {/* Actual RTT */}
            <text x={550} y={height - 45} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="system-ui, -apple-system, sans-serif">
              ESTIMATED RTT
            </text>
            <text x={550} y={height - 28} textAnchor="middle" fill="#10b981" fontSize="16" fontWeight="bold" fontFamily="system-ui, -apple-system, sans-serif">
              {roundTrip.toFixed(1)} ms
            </text>
          </g>

          {/* Latency component legend */}
          <g transform="translate(580, 80)">
            <rect x="-10" y="-10" width="110" height="100" rx="8" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" strokeWidth="1" />
            <text x="45" y="8" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold">LATENCY BREAKDOWN</text>

            <circle cx="8" cy="28" r="4" fill="#22d3ee" />
            <text x="18" y="32" fill="#94a3b8" fontSize="8">Propagation</text>
            <text x="95" y="32" textAnchor="end" fill="#22d3ee" fontSize="8" fontWeight="bold">{propagationDelay.toFixed(1)}ms</text>

            <circle cx="8" cy="48" r="4" fill="#f59e0b" />
            <text x="18" y="52" fill="#94a3b8" fontSize="8">Serialization</text>
            <text x="95" y="52" textAnchor="end" fill="#f59e0b" fontSize="8" fontWeight="bold">{serialization.toFixed(2)}ms</text>

            <circle cx="8" cy="68" r="4" fill="#8b5cf6" />
            <text x="18" y="72" fill="#94a3b8" fontSize="8">Processing</text>
            <text x="95" y="72" textAnchor="end" fill="#8b5cf6" fontSize="8" fontWeight="bold">{routerProcessing.toFixed(1)}ms</text>
          </g>
        </svg>

        {interactive && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(6, 182, 212, 0.1))', padding: '10px 14px', borderRadius: '10px', textAlign: 'center', minWidth: '85px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>PROPAGATION</div>
              <div style={{ color: colors.fiber, fontSize: '16px', fontWeight: 'bold' }}>{propagationDelay.toFixed(1)} ms</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1))', padding: '10px 14px', borderRadius: '10px', textAlign: 'center', minWidth: '85px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SERIALIZATION</div>
              <div style={{ color: colors.warning, fontSize: '16px', fontWeight: 'bold' }}>{serialization.toFixed(2)} ms</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1))', padding: '10px 14px', borderRadius: '10px', textAlign: 'center', minWidth: '85px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>PROCESSING</div>
              <div style={{ color: colors.accent, fontSize: '16px', fontWeight: 'bold' }}>{routerProcessing.toFixed(1)} ms</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1))', padding: '10px 14px', borderRadius: '10px', textAlign: 'center', minWidth: '85px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ color: colors.textMuted, fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>RTT TOTAL</div>
              <div style={{ color: colors.success, fontSize: '16px', fontWeight: 'bold' }}>{roundTrip.toFixed(1)} ms</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '13px' }}>
            Source: {cities[sourceCity].name}
          </label>
          <select
            value={sourceCity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val !== destCity) setSourceCity(val);
            }}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              background: colors.bgCard,
              color: colors.textPrimary,
              border: `1px solid ${colors.accent}`,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {cities.map((c, i) => (
              <option key={i} value={i} disabled={i === destCity}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '13px' }}>
            Destination: {cities[destCity].name}
          </label>
          <select
            value={destCity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val !== sourceCity) setDestCity(val);
            }}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              background: colors.bgCard,
              color: colors.textPrimary,
              border: `1px solid ${colors.accent}`,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {cities.map((c, i) => (
              <option key={i} value={i} disabled={i === sourceCity}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => {
          setAnimationFrame(0);
          setPacketInFlight(true);
        }}
        disabled={packetInFlight}
        style={{
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: packetInFlight ? colors.textMuted : colors.accent,
          color: 'white',
          fontWeight: 'bold',
          cursor: packetInFlight ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {packetInFlight ? 'Packet in Transit...' : 'Send Test Packet'}
      </button>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Bandwidth: {bandwidth} Mbps
        </label>
        <input
          type="range"
          min="10"
          max="10000"
          step="10"
          value={bandwidth}
          onChange={(e) => setBandwidth(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Router Hops: {numHops}
        </label>
        <input
          type="range"
          min="1"
          max="30"
          step="1"
          value={numHops}
          onChange={(e) => setNumHops(parseInt(e.target.value))}
          style={{ width: '100%', WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
          Latency Breakdown:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: '11px', fontFamily: 'monospace' }}>
          <div>Propagation = Distance / Speed = {distance}km / {SPEED_OF_LIGHT_FIBER}km/s = {propagationDelay.toFixed(1)}ms</div>
          <div style={{ marginTop: '4px' }}>Serialization = Bits / Rate = {packetSize * 8}b / {bandwidth}Mb/s = {serialization.toFixed(3)}ms</div>
          <div style={{ marginTop: '4px' }}>Processing = {numHops} hops x {processingDelay}ms = {routerProcessing.toFixed(1)}ms</div>
          <div style={{ marginTop: '8px', color: colors.success, fontWeight: 'bold' }}>
            Round Trip = 2 x ({propagationDelay.toFixed(1)} + {serialization.toFixed(2)} + {routerProcessing.toFixed(1)}) = {roundTrip.toFixed(1)}ms
          </div>
        </div>
      </div>
    </div>
  );

  const renderBottomBar = (disabled: boolean, canProceed: boolean, buttonText: string) => (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      background: colors.bgDark,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 1000,
    }}>
      <button
        onClick={onPhaseComplete}
        disabled={disabled && !canProceed}
        style={{
          padding: '12px 32px',
          borderRadius: '8px',
          border: 'none',
          background: canProceed ? colors.accent : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>-</div>
            <h1 style={{ color: colors.accent, fontSize: '28px', marginBottom: '8px' }}>
              Network Latency Physics
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: '18px', marginBottom: '24px' }}>
              Why is there always some delay, even with fiber?
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.6 }}>
                Even with perfectly optimized networks, theres an absolute minimum delay
                that no technology can overcome. Its set by a fundamental law of physics:
                nothing travels faster than light.
              </p>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '12px' }}>
                This limit affects everything from gaming to stock trading.
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: '14px' }}>
                Try different city pairs to see how distance affects minimum latency!
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Make a Prediction')}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Scenario:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              You send a single packet from New York to London through the fastest fiber
              optic cable available. The distance is about 5,600 km through undersea cable.
              How long does it take for the packet to arrive and a response to return?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What is the minimum round-trip time?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!prediction, 'Test My Prediction')}
      </div>
    );
  }

  // PLAY PHASE
  if (phase === 'play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px' }}>Explore Network Latency</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Adjust routes and parameters to understand each delay component
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px' }}>Experiments to Try:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Compare NY-London (~56ms) vs NY-Tokyo (~150ms)</li>
              <li>Set bandwidth to 10 Mbps - watch serialization increase</li>
              <li>Add 30 router hops - see processing delay compound</li>
              <li>Notice: propagation dominates on long routes!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'tens';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              NY to London takes ~56ms minimum RTT - limited by the speed of light in fiber!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>The Physics of Network Latency</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Three Delay Components:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li><strong>Propagation:</strong> Distance / Speed of light in medium (~200,000 km/s in fiber)</li>
                <li><strong>Serialization:</strong> Packet size / Link bandwidth (time to put bits on wire)</li>
                <li><strong>Processing:</strong> Router/switch lookup and forwarding time per hop</li>
              </ul>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Hard Limit:</strong> Light travels at ~200,000
                km/s in fiber (2/3 of c due to glass refractive index). This cannot be improved!
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>What CAN Be Improved:</strong> Serialization
                (more bandwidth) and processing (faster routers). But propagation delay is physics.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Next: A Twist!')}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Twist</h2>
            <p style={{ color: colors.textSecondary }}>
              Can better technology beat the speed of light?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px' }}>The Challenge:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.5 }}>
              A high-frequency trading firm wants to reduce their NY-London latency below
              the current 56ms minimum. They have unlimited budget for the best technology
              available. What are the limits?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px' }}>
              What determines the absolute minimum latency?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {renderBottomBar(true, !!twistPrediction, 'Test My Prediction')}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px' }}>The Speed of Light Limit</h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Compare theoretical minimum vs actual achievable latency
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px' }}>Key Insight:</h4>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              The theoretical minimum RTT (at c in vacuum) is {theoreticalMin.toFixed(1)}ms.
              Fiber achieves {propagationDelay.toFixed(1)}ms x 2 = {(propagationDelay * 2).toFixed(1)}ms
              because light slows to ~2/3c in glass. HFT firms use microwave towers (signals travel
              at c in air!) to shave off precious milliseconds. But even radio waves cannot beat
              the straight-line distance limit of {theoreticalMin.toFixed(1)}ms!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'hard_floor';

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px' }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary }}>
              Geographic distance creates an absolute floor - physics cant be cheated!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px' }}>Why Distance is Destiny</h3>
            <div style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>The Ultimate Limit:</strong> Even if we had
                perfect quantum entanglement communication, we couldnt send information faster than light.
                This is Einsteins cosmic speed limit.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Real-World Impact:</strong> High-frequency
                traders build data centers as close to exchanges as physically possible. Some firms run
                microwave towers along great-circle paths to beat fiber by a few milliseconds.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>LEO Satellites:</strong> Starlink at 550km
                altitude beats geostationary satellites (35,786km) but still loses to terrestrial fiber
                for short distances. Physics always wins.
              </p>
            </div>
          </div>
        </div>
        {renderBottomBar(false, true, 'Apply This Knowledge')}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px' }}>
              How latency physics shapes global infrastructure
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: '16px',
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: '16px' }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success }}>Completed</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    fontSize: '13px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: '13px' }}>{app.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {renderBottomBar(transferCompleted.size < 4, transferCompleted.size >= 4, 'Take the Test')}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 7 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 7 ? colors.success : colors.error, marginBottom: '8px' }}>
                {testScore >= 7 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                {testScore >= 7 ? 'You understand network latency physics!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: '16px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold' }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary }}>
                      {opt.correct ? 'Correct' : userAnswer === oIndex ? 'Your answer' : ''} {opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 7, testScore >= 7 ? 'Complete Mastery' : 'Review and Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentTestQuestion(i)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: '16px', lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button
                  key={oIndex}
                  onClick={() => handleTestAnswer(currentTestQuestion, oIndex)}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
            <button
              onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))}
              disabled={currentTestQuestion === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.textMuted}`,
                background: 'transparent',
                color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={submitTest}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>-</div>
            <h1 style={{ color: colors.success, marginBottom: '8px' }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px' }}>
              You understand network latency physics
            </p>
          </div>

          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Light travels at ~200,000 km/s in fiber (2/3 of c)</li>
              <li>Propagation delay = Distance / Speed of light</li>
              <li>Serialization delay = Bits / Bandwidth</li>
              <li>Geographic distance sets an absolute latency floor</li>
              <li>No technology can exceed the speed of light</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px' }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6 }}>
              The speed of light limit has profound implications beyond networking. Its why
              controlling Mars rovers requires autonomous AI - the 6-44 minute round-trip
              makes real-time control impossible. Its why stock exchanges matter where they
              are located. And its why truly global real-time collaboration will always have
              some fundamental latency - physics itself sets the rules.
            </p>
          </div>

          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete')}
      </div>
    );
  }

  return null;
};

export default NetworkLatencyRenderer;
