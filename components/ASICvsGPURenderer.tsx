'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

import { theme } from '../lib/theme';
import { useViewport } from '../hooks/useViewport';
// ─────────────────────────────────────────────────────────────────────────────
// ASIC vs GPU - Complete 10-Phase Game
// Understanding computing hardware tradeoffs: specialization vs flexibility
// ─────────────────────────────────────────────────────────────────────────────

export interface GameEvent {
  eventType: 'screen_change' | 'prediction_made' | 'answer_submitted' | 'slider_changed' |
    'button_clicked' | 'game_started' | 'game_completed' | 'hint_requested' |
    'correct_answer' | 'incorrect_answer' | 'phase_changed' | 'value_changed' |
    'selection_made' | 'timer_expired' | 'achievement_unlocked' | 'struggle_detected';
  gameType: string;
  gameTitle: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ASICvsGPURendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG VISUALIZATION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface HardwareVisualizationProps {
  workloadVolume: number;
  algorithmStability: number;
  powerBudget: number;
  selectedHardware: 'asic' | 'gpu' | 'fpga';
  showControls?: boolean;
  animationFrame: number;
}

const HardwareVisualization: React.FC<HardwareVisualizationProps> = ({
  workloadVolume,
  algorithmStability,
  powerBudget,
  selectedHardware,
  showControls = false,
  animationFrame,
}) => {
  // Calculate metrics for visualization
  const asicEfficiency = Math.min(100, (workloadVolume / 100) * (algorithmStability / 100) * 100 + 20);
  const gpuEfficiency = Math.max(20, 100 - workloadVolume * 0.6);
  const fpgaEfficiency = Math.min(80, 40 + (workloadVolume / 100) * 30);

  const asicPower = 100 - powerBudget * 0.3;
  const gpuPower = 30 + powerBudget * 0.2;
  const fpgaPower = 60;

  // Animation offset for subtle movement
  const animOffset = Math.sin(animationFrame * 0.05) * 2;

  return (
    <svg
      viewBox="0 0 500 350"
      style={{ width: '100%', maxWidth: '500px', height: 'auto' }}
      preserveAspectRatio="xMidYMid meet"
     role="img" aria-label="A S I Cvs G P U visualization">
      <defs>
        <linearGradient id="asicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="gpuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="fpgaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="shadow">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
      </defs>

      {/* Background */}
      <rect x="0" y="0" width="500" height="350" fill="#0a0a0f" rx="8"/>

      {/* Grid lines */}
      <g stroke="#1a1a24" strokeWidth="1" opacity="0.6">
        {[50, 100, 150, 200, 250, 300].map(y => (
          <line key={y} x1="60" y1={y} x2="480" y2={y} strokeDasharray="4,4" />
        ))}
        {[60, 160, 260, 360, 460].map(x => (
          <line key={x} x1={x} y1="50" x2={x} y2="300" strokeDasharray="4,4" />
        ))}
      </g>

      {/* Title */}
      <text x="250" y="30" textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="bold">
        Hardware Performance Comparison
      </text>

      {/* Y-axis label */}
      <text x="25" y="175" textAnchor="middle" fill="#e2e8f0" fontSize="12" transform="rotate(-90, 25, 175)">
        Efficiency Score
      </text>

      {/* X-axis labels */}
      <text x="120" y="325" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="600">ASIC</text>
      <text x="260" y="325" textAnchor="middle" fill="#8B5CF6" fontSize="13" fontWeight="600">GPU</text>
      <text x="400" y="325" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="600">FPGA</text>

      {/* ASIC Chip visualization */}
      <g transform={`translate(80, ${150 - asicEfficiency + animOffset})`} filter="url(#shadow)">
        <rect x="0" y="0" width="80" height="80" fill="url(#asicGradient)" rx="4"
              stroke={selectedHardware === 'asic' ? '#fff' : 'none'} strokeWidth="2"/>
        {/* Chip die pattern */}
        <g fill="#0a0a0f" opacity="0.3">
          {[10, 30, 50].map(x => [10, 30, 50].map(y => (
            <rect key={`${x}-${y}`} x={x} y={y} width="15" height="15" rx="2"/>
          )))}
        </g>
        {/* Pins */}
        {[0, 20, 40, 60].map(pos => (
          <g key={pos}>
            <rect x={pos + 5} y="-8" width="10" height="8" fill="#94a3b8"/>
            <rect x={pos + 5} y="80" width="10" height="8" fill="#94a3b8"/>
          </g>
        ))}
      </g>
      <text x="120" y={150 - asicEfficiency + animOffset + 95} textAnchor="middle" fill="#e2e8f0" fontSize="11">
        {asicEfficiency.toFixed(0)}%
      </text>

      {/* GPU visualization */}
      <g transform={`translate(220, ${150 - gpuEfficiency * 0.8 + animOffset})`} filter="url(#shadow)">
        <rect x="0" y="0" width="80" height="100" fill="url(#gpuGradient)" rx="4"
              stroke={selectedHardware === 'gpu' ? '#fff' : 'none'} strokeWidth="2"/>
        {/* GPU cores grid */}
        <g fill="#0a0a0f" opacity="0.3">
          {[8, 28, 48, 68].map(x => [8, 28, 48, 68, 88].map(y => (
            y < 90 && <rect key={`${x}-${y}`} x={x} y={y} width="12" height="12" rx="1"/>
          )))}
        </g>
        {/* Fan */}
        <circle cx="40" cy="50" r="25" fill="none" stroke="#c4b5fd" strokeWidth="2"/>
        <polygon points="40,30 55,50 40,70 25,50" fill="#c4b5fd" opacity="0.5"/>
      </g>
      <text x="260" y={150 - gpuEfficiency * 0.8 + animOffset + 115} textAnchor="middle" fill="#e2e8f0" fontSize="11">
        {gpuEfficiency.toFixed(0)}%
      </text>

      {/* FPGA visualization */}
      <g transform={`translate(360, ${150 - fpgaEfficiency * 0.9 + animOffset})`} filter="url(#shadow)">
        <rect x="0" y="0" width="80" height="80" fill="url(#fpgaGradient)" rx="4"
              stroke={selectedHardware === 'fpga' ? '#fff' : 'none'} strokeWidth="2"/>
        {/* Configurable logic blocks */}
        <g fill="#fcd34d" opacity="0.4">
          {[5, 25, 45, 65].map(x => [5, 25, 45, 65].map(y => (
            <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" rx="1"/>
          )))}
        </g>
        {/* Interconnect lines */}
        <g stroke="#fcd34d" strokeWidth="1" opacity="0.6">
          <line x1="10" y1="40" x2="70" y2="40"/>
          <line x1="40" y1="10" x2="40" y2="70"/>
        </g>
      </g>
      <text x="400" y={150 - fpgaEfficiency * 0.9 + animOffset + 95} textAnchor="middle" fill="#e2e8f0" fontSize="11">
        {fpgaEfficiency.toFixed(0)}%
      </text>

      {/* Performance bars */}
      <text x="60" y="260" fill="#94a3b8" fontSize="11">Performance</text>
      <rect x="120" y="250" width={asicEfficiency * 1.2} height="12" fill="url(#asicGradient)" rx="2"/>
      <rect x="260" y="250" width={gpuEfficiency * 0.8} height="12" fill="url(#gpuGradient)" rx="2"/>
      <rect x="400" y="250" width={fpgaEfficiency * 0.9} height="12" fill="url(#fpgaGradient)" rx="2"/>

      {/* Power consumption indicators */}
      <text x="60" y="285" fill="#94a3b8" fontSize="11">Power Draw</text>
      <rect x="120" y="275" width={asicPower * 0.6} height="12" fill="#10B981" opacity="0.6" rx="2"/>
      <rect x="260" y="275" width={gpuPower * 1.2} height="12" fill="#8B5CF6" opacity="0.6" rx="2"/>
      <rect x="400" y="275" width={fpgaPower} height="12" fill="#F59E0B" opacity="0.6" rx="2"/>

      {/* Legend */}
      <rect x="380" y="30" width="110" height="80" fill="#12121a" rx="4" stroke="#2a2a3a"/>
      <text x="440" y="45" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="600">Legend</text>
      <circle cx="395" cy="60" r="5" fill="#10B981"/>
      <text x="405" y="64" fill="#e2e8f0" fontSize="11">ASIC</text>
      <circle cx="395" cy="78" r="5" fill="#8B5CF6"/>
      <text x="405" y="82" fill="#e2e8f0" fontSize="11">GPU</text>
      <circle cx="395" cy="96" r="5" fill="#F59E0B"/>
      <text x="405" y="100" fill="#e2e8f0" fontSize="11">FPGA</text>

      {/* Control indicator when showing interactive mode */}
      {/* ASIC efficiency curve (reference) */}
      <path
        d="M60 290 L100 280 L140 265 L180 245 L220 220 L260 190 L300 155 L340 120 L380 90 L420 65 L460 50"
        fill="none"
        stroke="rgba(16, 185, 129, 0.2)"
        strokeWidth="2"
        strokeDasharray="6,3"
      />

      {/* Formula: Efficiency = f(Volume, Stability, Power) */}
      <rect x="120" y="330" width="260" height="18" rx="4" fill="rgba(139, 92, 246, 0.1)" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="1" />
      <text x="250" y="343" textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="600">
        Efficiency = f(Volume × Stability / Power)
      </text>

      {showControls && (
        <g>
          <rect x="10" y="310" width="100" height="20" fill="#3B82F6" opacity="0.2" rx="4"/>
          <text x="60" y="324" textAnchor="middle" fill="#3B82F6" fontSize="11">
            Interactive
          </text>
        </g>
      )}
    </svg>
  );
};

// Sound utility
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

// ─────────────────────────────────────────────────────────────────────────────
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// ─────────────────────────────────────────────────────────────────────────────
const testQuestions = [
  {
    scenario: "A cryptocurrency startup is choosing hardware for mining Bitcoin. They calculate that GPUs would cost $100,000 and generate $50,000/year in coins, while ASICs would cost $500,000 but generate $400,000/year.",
    question: "Why might the much more expensive ASIC option actually be the better investment?",
    options: [
      { id: 'a', label: "ASICs are newer technology and more reliable" },
      { id: 'b', label: "ASICs deliver 8x the performance per dollar for this fixed algorithm, paying back the investment faster", correct: true },
      { id: 'c', label: "GPUs consume too much electricity to be profitable" },
      { id: 'd', label: "Bitcoin mining requires ASIC by protocol rules" }
    ],
    explanation: "For a fixed, unchanging algorithm like Bitcoin's SHA-256, ASICs can be 100-1000x more efficient than GPUs. Despite higher upfront costs, the dramatically higher performance per watt and per dollar makes them economically superior at scale. The key is that the algorithm never changes."
  },
  {
    scenario: "A video streaming company processes millions of videos daily. They're deciding between GPU servers and custom video encoding ASICs. Their encoding algorithm was last updated 2 years ago.",
    question: "What factor most strongly favors the ASIC approach here?",
    options: [
      { id: 'a', label: "The algorithm is stable and unlikely to change significantly", correct: true },
      { id: 'b', label: "ASICs are always faster than GPUs" },
      { id: 'c', label: "GPUs can't process video data" },
      { id: 'd', label: "ASICs are cheaper to manufacture" }
    ],
    explanation: "Algorithm stability is the key factor for ASIC adoption. Video codecs like H.264/H.265 have been standardized for years. When the algorithm won't change, the high NRE (Non-Recurring Engineering) costs of ASIC development can be amortized over millions of chips, making them highly cost-effective."
  },
  {
    scenario: "An AI startup is training cutting-edge neural networks. They notice that the model architectures change every 3-6 months as research advances. They're considering building a custom AI training ASIC.",
    question: "Why might this be a risky investment?",
    options: [
      { id: 'a', label: "ASICs can't perform neural network calculations" },
      { id: 'b', label: "Rapidly evolving algorithms may make the ASIC obsolete before recouping NRE costs", correct: true },
      { id: 'c', label: "Training requires more memory than ASICs can provide" },
      { id: 'd', label: "GPUs are always better for AI workloads" }
    ],
    explanation: "ASIC development takes 2-3 years and costs $50-500M in NRE. If AI architectures fundamentally change (e.g., from transformers to something new), the ASIC optimized for the old approach becomes a very expensive paperweight. Google's TPUs work because they target stable, well-understood operations."
  },
  {
    scenario: "A company is choosing between a GPU ($1,000, 300W, flexible) and an ASIC ($500, 30W, fixed function) for their data center. They need to run a specific machine learning inference workload 24/7.",
    question: "Beyond upfront cost, what makes the ASIC more attractive for this specific use case?",
    options: [
      { id: 'a', label: "The ASIC can be upgraded with software updates" },
      { id: 'b', label: "10x lower power consumption means massive electricity savings and simpler cooling", correct: true },
      { id: 'c', label: "ASICs have longer warranty periods" },
      { id: 'd', label: "The GPU would overheat in continuous operation" }
    ],
    explanation: "Power efficiency is often the dominant factor at scale. A 270W savings per chip means $236/year in electricity at $0.10/kWh. With thousands of chips running 24/7, power and cooling costs dwarf hardware costs. ASICs typically achieve 10-100x better performance per watt for their target workload."
  },
  {
    scenario: "A smartphone manufacturer wants to add AI features. They can either use the phone's existing GPU or add a dedicated Neural Processing Unit (NPU) - essentially a small AI ASIC.",
    question: "Why do most flagship phones now include dedicated NPUs despite having capable GPUs?",
    options: [
      { id: 'a', label: "GPUs can't run neural networks on mobile devices" },
      { id: 'b', label: "NPUs perform AI tasks with 5-10x less power, preserving battery life", correct: true },
      { id: 'c', label: "NPUs are required by app store policies" },
      { id: 'd', label: "Adding an NPU is cheaper than upgrading the GPU" }
    ],
    explanation: "Mobile devices are extremely power-constrained. An NPU can run AI tasks like face detection or voice recognition continuously while using a fraction of the power a GPU would need. This enables always-on AI features without destroying battery life—the key tradeoff in mobile computing."
  },
  {
    scenario: "Bitcoin mining used to be profitable on GPUs, but today GPU miners lose money while ASIC miners profit. The Bitcoin algorithm (SHA-256) hasn't changed since 2009.",
    question: "What economic principle explains why GPUs were pushed out of Bitcoin mining?",
    options: [
      { id: 'a', label: "ASICs create economies of scale that GPUs cannot match for fixed algorithms", correct: true },
      { id: 'b', label: "GPU manufacturers stopped supporting mining" },
      { id: 'c', label: "Bitcoin changed its rules to require ASICs" },
      { id: 'd', label: "GPUs became more expensive over time" }
    ],
    explanation: "For any fixed algorithm, ASICs will eventually dominate due to their superior efficiency. As ASIC miners drove up difficulty and competition, the bar for profitability rose. GPUs couldn't compete on performance-per-watt, making them economically unviable. This is why some cryptocurrencies use 'ASIC-resistant' algorithms."
  },
  {
    scenario: "Google developed TPUs (Tensor Processing Units) specifically for TensorFlow machine learning operations. They've now deployed multiple generations of TPUs in their data centers.",
    question: "How did Google balance ASIC specialization with the risk of algorithm changes?",
    options: [
      { id: 'a', label: "They made TPUs as general-purpose as GPUs" },
      { id: 'b', label: "They optimized for common, stable primitives (matrix multiply) rather than specific models", correct: true },
      { id: 'c', label: "They only use TPUs for algorithms they control and won't change" },
      { id: 'd', label: "They built software to emulate old TPU versions on new hardware" }
    ],
    explanation: "TPUs are optimized for matrix multiplication and convolution—fundamental operations that underlie most ML models regardless of architecture. By targeting stable computational primitives rather than specific model structures, TPUs remain useful even as model architectures evolve. This is strategic ASIC design."
  },
  {
    scenario: "A gaming console manufacturer is designing their next system. Games will evolve over the 7-year console lifespan, but rendering fundamentals (shaders, textures, triangles) remain stable.",
    question: "Why do gaming consoles use custom semi-specialized chips rather than pure ASICs or pure GPUs?",
    options: [
      { id: 'a', label: "Console chips balance specialization for known workloads with programmability for evolving games", correct: true },
      { id: 'b', label: "Pure ASICs are too expensive for consumer products" },
      { id: 'c', label: "GPUs can't be integrated into custom chips" },
      { id: 'd', label: "Consoles don't need specialized hardware" }
    ],
    explanation: "Console APUs represent a middle ground: they include fixed-function units for stable operations (video decode, audio processing) while maintaining programmable GPU cores for evolving game graphics. This captures ASIC efficiency where possible while preserving flexibility where needed."
  },
  {
    scenario: "A network equipment company offers two router options: one using a programmable network processor (like a specialized GPU), another using fixed-function ASICs. The ASIC router costs 30% less and uses 50% less power.",
    question: "What scenario would justify paying more for the programmable option?",
    options: [
      { id: 'a', label: "When network protocols are expected to change or new features will be needed", correct: true },
      { id: 'b', label: "When maximum raw throughput is the only priority" },
      { id: 'c', label: "When the router will be used in harsh environments" },
      { id: 'd', label: "When the network traffic volume is very high" }
    ],
    explanation: "Programmable network processors (NPUs) allow software updates to support new protocols, security features, or traffic patterns. If your network needs might evolve—new encryption standards, SDN capabilities, or custom processing—the flexibility premium is worthwhile. Pure ASIC routers are cheaper but frozen in functionality."
  },
  {
    scenario: "An engineer is designing a system for edge AI inference. They must choose between an FPGA (reprogrammable hardware), a GPU, and an ASIC. Production volume will be 10,000 units.",
    question: "At this production volume, which option likely offers the best balance of cost and performance?",
    options: [
      { id: 'a', label: "ASIC, because it's always the cheapest option" },
      { id: 'b', label: "GPU, because it requires no hardware development" },
      { id: 'c', label: "FPGA, offering better efficiency than GPU without ASIC's massive NRE costs", correct: true },
      { id: 'd', label: "A combination of all three working together" }
    ],
    explanation: "ASICs require $50-500M NRE, making them uneconomical below ~100,000+ units. GPUs are flexible but power-hungry. FPGAs offer a middle path: near-ASIC efficiency with much lower development costs, making them ideal for medium volumes. The optimal choice depends on volume, power constraints, and algorithm stability."
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// REAL WORLD APPLICATIONS - 4 detailed applications
// ─────────────────────────────────────────────────────────────────────────────
const realWorldApps = [
  {
    icon: '⛏️',
    title: 'Cryptocurrency Mining',
    short: 'SHA-256 hash computation at scale',
    tagline: 'Where algorithm stability created an ASIC empire',
    description: 'Bitcoin mining represents the purest ASIC use case. SHA-256 hashing has remained unchanged since 2009, allowing ASIC designers to achieve 100,000x better efficiency than CPUs. Modern mining ASICs compute trillions of hashes per second while consuming minimal power.',
    connection: 'Bitcoin\'s fixed algorithm created ideal ASIC conditions: massive scale, stable workload, and energy costs dominating economics. Miners who adopted ASICs earliest gained insurmountable advantages, pushing GPU miners out entirely.',
    howItWorks: 'Mining ASICs contain thousands of identical SHA-256 engines operating in parallel. They strip away everything a general-purpose chip needs—instruction decoders, caches, branch predictors—keeping only hash computation logic. The result is extreme efficiency.',
    stats: [
      { value: '100,000x', label: 'Efficiency vs CPU', icon: '⚡' },
      { value: '140 TH/s', label: 'Per ASIC hashrate', icon: '🔢' },
      { value: '3,400W', label: 'Power consumption', icon: '🔌' }
    ],
    examples: ['Bitmain Antminer S19', 'MicroBT Whatsminer M50', 'Canaan Avalon', 'Custom mining farms'],
    companies: ['Bitmain', 'MicroBT', 'Canaan', 'Intel (discontinued)'],
    futureImpact: 'As Bitcoin mining rewards decrease, only the most efficient ASICs will remain profitable. Some cryptocurrencies deliberately use ASIC-resistant algorithms to maintain GPU mining.',
    color: '#F59E0B'
  },
  {
    icon: '🧠',
    title: 'AI Accelerators (TPUs/NPUs)',
    short: 'Matrix math at unprecedented scale',
    tagline: 'Teaching silicon to think efficiently',
    description: 'AI accelerators like Google\'s TPU and Apple\'s Neural Engine are ASICs optimized for the matrix multiplications underlying deep learning. By focusing on a small set of operations (matmul, convolution, activation), they achieve 10-50x better efficiency than GPUs.',
    connection: 'The key insight was that while AI models change, the underlying math operations remain stable. TPUs optimize for matrix operations, not specific architectures—remaining useful across different model types from CNNs to Transformers.',
    howItWorks: 'AI ASICs use systolic arrays—grids of multiply-accumulate units that pass data between neighbors. This reduces memory bandwidth needs and keeps data flowing continuously. Specialized memory hierarchies further optimize tensor operations.',
    stats: [
      { value: '275 TFLOPS', label: 'TPU v4 performance', icon: '🚀' },
      { value: '90%', label: 'Utilization efficiency', icon: '📈' },
      { value: '5x', label: 'Perf/watt vs GPU', icon: '⚡' }
    ],
    examples: ['Google TPU v4', 'Apple Neural Engine', 'Tesla Dojo', 'AWS Inferentia'],
    companies: ['Google', 'Apple', 'Tesla', 'Amazon'],
    futureImpact: 'As AI becomes ubiquitous, dedicated accelerators will appear everywhere—phones, cars, appliances. The efficiency gap between specialized and general-purpose hardware will widen.',
    color: '#8B5CF6'
  },
  {
    icon: '🎬',
    title: 'Video Encoding/Decoding',
    short: 'Real-time media processing',
    tagline: 'Streaming billions of hours efficiently',
    description: 'Video codecs like H.264, H.265, and AV1 have complex, standardized algorithms that remain stable for decades. Dedicated video ASICs in phones, TVs, and data centers process video with a fraction of the power a CPU or GPU would need.',
    connection: 'Video codec standards take years to develop and remain fixed once published. This stability makes them perfect ASIC targets. Every smartphone contains video ASICs that enable hours of playback on a single charge.',
    howItWorks: 'Video ASICs implement specific codec algorithms in hardware: motion estimation, discrete cosine transform, entropy encoding. Fixed-function blocks process video frames through a pipeline, achieving real-time performance at minimal power.',
    stats: [
      { value: '8K60', label: 'Real-time encoding', icon: '🎥' },
      { value: '1/50th', label: 'Power vs software', icon: '🔋' },
      { value: '100M+', label: 'Chips shipped/year', icon: '📦' }
    ],
    examples: ['Netflix encoding farms', 'YouTube upload processing', 'Phone video recording', 'Streaming set-top boxes'],
    companies: ['Broadcom', 'Qualcomm', 'MediaTek', 'Apple'],
    futureImpact: 'New codecs like AV1 and VVC will require new ASICs, but the 10-year codec lifecycle justifies the investment. Real-time 8K and VR streaming will depend on ASIC efficiency.',
    color: '#EC4899'
  },
  {
    icon: '🌐',
    title: 'Network Processing',
    short: 'Packet forwarding at line rate',
    tagline: '400Gbps requires specialized silicon',
    description: 'High-speed network switches and routers use ASICs to forward packets at rates no CPU could match. These chips process billions of packets per second, implementing routing tables, access control, and quality of service in fixed-function hardware.',
    connection: 'Core networking protocols (Ethernet, IP) are stable and well-defined, making them ideal ASIC targets. The tradeoff emerges in software-defined networking, where programmable alternatives sacrifice some performance for flexibility.',
    howItWorks: 'Network ASICs contain specialized packet parsers, lookup engines (using TCAMs for routing tables), and traffic managers. They process packets through a pipeline, making forwarding decisions in nanoseconds at wire speed.',
    stats: [
      { value: '25.6 Tbps', label: 'Switch capacity', icon: '🔀' },
      { value: '<500ns', label: 'Forwarding latency', icon: '⏱️' },
      { value: '1000W', label: 'Power for Tbps', icon: '⚡' }
    ],
    examples: ['Data center switches', 'Internet backbone routers', '5G base stations', 'Cloud load balancers'],
    companies: ['Broadcom', 'Cisco', 'Juniper', 'Mellanox (NVIDIA)'],
    futureImpact: 'Programmable ASICs (P4 switches) are blending ASIC efficiency with programmability. This hybrid approach may define next-generation networking, balancing speed with adaptability.',
    color: '#10B981'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const ASICvsGPURenderer: React.FC<ASICvsGPURendererProps> = ({ onGameEvent, gamePhase }) => {
  type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
  const validPhases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

  const getInitialPhase = (): Phase => {
    if (gamePhase && validPhases.includes(gamePhase as Phase)) {
      return gamePhase as Phase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const { isMobile } = useViewport();
// Simulation state
  const [workloadVolume, setWorkloadVolume] = useState(30); // Production volume (thousands)
  const [algorithmStability, setAlgorithmStability] = useState(70); // Years until change (0-100 scale)
  const [powerBudget, setPowerBudget] = useState(40); // Power constraint strictness
  const [selectedHardware, setSelectedHardware] = useState<'asic' | 'gpu' | 'fpga'>('gpu');
  const [animationFrame, setAnimationFrame] = useState(0);

  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Transfer state
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);

  // Navigation ref
  const isNavigating = useRef(false);

  // Responsive design
// Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Premium design colors - using bright text for accessibility
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#3B82F6', // Blue for computing/tech
    accentGlow: 'rgba(59, 130, 246, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#e2e8f0', // Bright secondary text for contrast (brightness ~230)
    textMuted: '#cbd5e1', // Brighter muted text (brightness ~200)
    border: '#2a2a3a',
    asic: '#10B981', // Green for ASIC
    gpu: '#8B5CF6', // Purple for GPU
    fpga: '#F59E0B', // Orange for FPGA
  };

  const typo = {
    h1: { fontSize: isMobile ? '28px' : '36px', fontWeight: 800, lineHeight: 1.2 },
    h2: { fontSize: isMobile ? '22px' : '28px', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: isMobile ? '18px' : '22px', fontWeight: 600, lineHeight: 1.4 },
    body: { fontSize: isMobile ? '15px' : '17px', fontWeight: 400, lineHeight: 1.6 },
    small: { fontSize: isMobile ? '13px' : '14px', fontWeight: 400, lineHeight: 1.5 },
  };

  // Phase navigation
  const phaseOrder: Phase[] = validPhases;
  const phaseLabels: Record<Phase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Twist Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery'
  };

  const goToPhase = useCallback((p: Phase) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    playSound('transition');
    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, []);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase]);

  // Calculate hardware metrics based on sliders
  const calculateMetrics = useCallback(() => {
    // ASIC metrics
    const asicNRE = 100; // $100M base NRE
    const asicUnitCost = 50; // $50 per chip
    const asicPerformance = 100; // Baseline performance
    const asicPowerEfficiency = 10; // Very efficient
    const asicFlexibility = 0; // No flexibility

    // GPU metrics
    const gpuNRE = 0; // No NRE (buy off shelf)
    const gpuUnitCost = 1000; // $1000 per unit
    const gpuPerformance = 10; // Much lower for specific workload
    const gpuPowerEfficiency = 1; // Reference efficiency
    const gpuFlexibility = 100; // Fully flexible

    // FPGA metrics
    const fpgaNRE = 5; // $5M NRE
    const fpgaUnitCost = 500; // $500 per unit
    const fpgaPerformance = 30; // Middle ground
    const fpgaPowerEfficiency = 5; // Middle ground
    const fpgaFlexibility = 70; // Mostly flexible

    const volume = workloadVolume * 1000; // Actual unit count
    const stabilityYears = (algorithmStability / 100) * 10; // 0-10 years
    const powerWeight = powerBudget / 50; // 0-2x weight on power

    // Calculate total cost of ownership
    const asicTotalCost = (asicNRE * 1000000 / Math.max(volume, 1)) + asicUnitCost;
    const gpuTotalCost = gpuUnitCost;
    const fpgaTotalCost = (fpgaNRE * 1000000 / Math.max(volume, 1)) + fpgaUnitCost;

    // Calculate effective value (performance * stability factor / cost, weighted by power)
    const stabilityFactor = stabilityYears / 5; // Normalized
    const asicValue = (asicPerformance * stabilityFactor * (asicPowerEfficiency * powerWeight)) / asicTotalCost;
    const gpuValue = (gpuPerformance * gpuFlexibility / 100 * (gpuPowerEfficiency * powerWeight)) / gpuTotalCost;
    const fpgaValue = (fpgaPerformance * fpgaFlexibility / 100 * (fpgaPowerEfficiency * powerWeight)) / fpgaTotalCost;

    // Normalize to 0-100 scale
    const maxValue = Math.max(asicValue, gpuValue, fpgaValue, 0.01);

    return {
      asic: {
        nre: asicNRE,
        unitCost: asicUnitCost,
        totalCost: asicTotalCost,
        performance: asicPerformance,
        powerEfficiency: asicPowerEfficiency,
        flexibility: asicFlexibility,
        value: (asicValue / maxValue) * 100,
        recommendation: asicValue >= gpuValue && asicValue >= fpgaValue
      },
      gpu: {
        nre: gpuNRE,
        unitCost: gpuUnitCost,
        totalCost: gpuTotalCost,
        performance: gpuPerformance,
        powerEfficiency: gpuPowerEfficiency,
        flexibility: gpuFlexibility,
        value: (gpuValue / maxValue) * 100,
        recommendation: gpuValue > asicValue && gpuValue >= fpgaValue
      },
      fpga: {
        nre: fpgaNRE,
        unitCost: fpgaUnitCost,
        totalCost: fpgaTotalCost,
        performance: fpgaPerformance,
        powerEfficiency: fpgaPowerEfficiency,
        flexibility: fpgaFlexibility,
        value: (fpgaValue / maxValue) * 100,
        recommendation: fpgaValue > asicValue && fpgaValue > gpuValue
      }
    };
  }, [workloadVolume, algorithmStability, powerBudget]);

  const metrics = calculateMetrics();

  // Progress bar component
  const renderProgressBar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: colors.bgSecondary,
      zIndex: 100,
    }}>
      <div style={{
        height: '100%',
        width: `${((phaseOrder.indexOf(phase) + 1) / phaseOrder.length) * 100}%`,
        background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );

  // Navigation dots
  const renderNavDots = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 0',
    }}>
      {phaseOrder.map((p, i) => (
        <button
          key={p}
          onClick={() => goToPhase(p)}
          style={{
            width: phase === p ? '24px' : '8px',
            height: '8px',
            borderRadius: '4px',
            border: 'none',
            background: phaseOrder.indexOf(phase) >= i ? colors.accent : colors.border,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          aria-label={phaseLabels[p]}
        />
      ))}
    </div>
  );

  // Primary button style - minHeight 44px for touch targets
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #2563EB)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Secondary button style
  const secondaryButtonStyle: React.CSSProperties = {
    background: 'transparent',
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '44px',
  };

  // Fixed navigation bar component
  const NavigationBar: React.FC<{ showBack?: boolean; onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean }> = ({
    showBack = true,
    onBack,
    onNext,
    nextLabel = 'Next',
    nextDisabled = false,
  }) => (
    <nav style={{
      position: 'sticky',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.bgSecondary,
      borderTop: `1px solid ${colors.border}`,
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      zIndex: 1000,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
    }}>
      {showBack ? (
        <button
          onClick={onBack}
          style={{
            ...secondaryButtonStyle,
            flex: 1,
            maxWidth: '150px',
          }}
        >
          ← Back
        </button>
      ) : <div style={{ flex: 1, maxWidth: '150px' }} />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          style={{
            ...primaryButtonStyle,
            flex: 2,
            opacity: nextDisabled ? 0.5 : 1,
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {nextLabel}
        </button>
      )}
    </nav>
  );

  // Comparison visualization component
  const ComparisonVisualization = () => {
    const width = isMobile ? 320 : 500;
    const barHeight = 30;
    const gap = 60;

    return (
      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px', textAlign: 'center' }}>
          Hardware Comparison
        </h3>

        {/* Performance bars */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>Performance (for target workload)</span>
          </div>

          {/* ASIC */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.asic, width: '50px' }}>ASIC</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${metrics.asic.performance}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.asic}, ${colors.asic}88)`,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>100x</span>
          </div>

          {/* FPGA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.fpga, width: '50px' }}>FPGA</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${metrics.fpga.performance}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.fpga}, ${colors.fpga}88)`,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>30x</span>
          </div>

          {/* GPU */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...typo.small, color: colors.gpu, width: '50px' }}>GPU</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${metrics.gpu.performance}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.gpu}, ${colors.gpu}88)`,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>10x</span>
          </div>
        </div>

        {/* Power Efficiency bars */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>Power Efficiency (perf/watt)</span>
          </div>

          {/* ASIC */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.asic, width: '50px' }}>ASIC</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${metrics.asic.powerEfficiency * 10}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.asic}, ${colors.asic}88)`,
                borderRadius: '4px',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>10x</span>
          </div>

          {/* FPGA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.fpga, width: '50px' }}>FPGA</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${metrics.fpga.powerEfficiency * 10}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.fpga}, ${colors.fpga}88)`,
                borderRadius: '4px',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>5x</span>
          </div>

          {/* GPU */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...typo.small, color: colors.gpu, width: '50px' }}>GPU</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${metrics.gpu.powerEfficiency * 10}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.gpu}, ${colors.gpu}88)`,
                borderRadius: '4px',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>1x</span>
          </div>
        </div>

        {/* Flexibility bars */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>Flexibility (adaptability to changes)</span>
          </div>

          {/* GPU */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.gpu, width: '50px' }}>GPU</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${metrics.gpu.flexibility}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.gpu}, ${colors.gpu}88)`,
                borderRadius: '4px',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>Full</span>
          </div>

          {/* FPGA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ ...typo.small, color: colors.fpga, width: '50px' }}>FPGA</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${metrics.fpga.flexibility}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.fpga}, ${colors.fpga}88)`,
                borderRadius: '4px',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>High</span>
          </div>

          {/* ASIC */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ ...typo.small, color: colors.asic, width: '50px' }}>ASIC</span>
            <div style={{ flex: 1, height: barHeight, background: colors.bgSecondary, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(metrics.asic.flexibility, 2)}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${colors.asic}, ${colors.asic}88)`,
                borderRadius: '4px',
              }} />
            </div>
            <span style={{ ...typo.small, color: colors.textMuted, width: '40px' }}>None</span>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingBottom: '16px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ marginTop: '40px', marginBottom: '24px' }}>
          <HardwareVisualization
            workloadVolume={50}
            algorithmStability={80}
            powerBudget={50}
            selectedHardware="gpu"
            showControls={false}
            animationFrame={animationFrame}
          />
        </div>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          ASIC vs GPU: The Great Tradeoff
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '24px',
        }}>
          Why can a $500 Bitcoin mining chip outperform a $10,000 GPU? The answer reveals the fundamental tradeoff between <span style={{ color: colors.asic }}>specialization</span> and <span style={{ color: colors.gpu }}>flexibility</span>.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '500px',
          border: `1px solid ${colors.border}`,
        }}>
          <p style={{ ...typo.small, color: colors.textSecondary, fontStyle: 'italic' }}>
            "The best tool is usually the one built for exactly one job—unless that job might change tomorrow."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            — Hardware Engineering Wisdom
          </p>
        </div>

        {renderNavDots()}

        <NavigationBar
          showBack={false}
          onNext={() => { playSound('click'); nextPhase(); }}
          nextLabel="Start Exploring →"
        />
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'GPUs are always better because they can run any algorithm' },
      { id: 'b', text: 'ASICs are always better because they\'re more efficient' },
      { id: 'c', text: 'The best choice depends on algorithm stability, volume, and power constraints' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '40px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              🤔 Make Your Prediction - Step 1 of 3
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            A company needs to process a specific computation 24/7. Should they use an ASIC (custom chip) or a GPU (graphics card)?
          </h2>

          <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
            Look at the hardware comparison below. Consider what factors might affect the choice between specialized and general-purpose hardware.
          </p>

          {/* SVG Visualization - static for predict phase */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <HardwareVisualization
              workloadVolume={50}
              algorithmStability={80}
              powerBudget={50}
              selectedHardware="gpu"
              showControls={false}
              animationFrame={0}
            />
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setPrediction(opt.id); }}
                style={{
                  background: prediction === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${prediction === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: prediction === opt.id ? colors.accent : colors.bgSecondary,
                  color: prediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {renderNavDots()}

        <NavigationBar
          showBack={true}
          onBack={() => goToPhase('hook')}
          onNext={prediction ? () => { playSound('success'); nextPhase(); } : undefined}
          nextLabel="Test My Prediction →"
          nextDisabled={!prediction}
        />
      </div>
    );
  }

  // PLAY PHASE - Interactive Comparison
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: colors.bgPrimary,
        overflow: 'hidden',
      }}>
        {renderProgressBar()}
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '44px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px' }}>

        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Explore ASIC vs GPU Tradeoffs
          </h2>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.success}15`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.success }}>What to Watch:</strong> Adjust the sliders below and observe how the efficiency scores change. Notice how high volume and algorithm stability increase ASIC advantage, while flexibility needs favor GPUs.
            </p>
            <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px', margin: 0 }}>
              <strong>Performance per Watt</strong> is defined as the ratio of computational output to energy consumed. This is why engineers design ASICs for power-critical applications used in data centers and mobile devices.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, Controls right */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
          {/* Left: SVG visualization */}
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {/* SVG Visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: isMobile ? '0' : '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <HardwareVisualization
              workloadVolume={workloadVolume}
              algorithmStability={algorithmStability}
              powerBudget={powerBudget}
              selectedHardware={selectedHardware}
              showControls={true}
              animationFrame={animationFrame}
            />
          </div>
          </div>

          {/* Right: Controls panel */}
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          {/* Sliders */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Workload Volume slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>📦 Production Volume</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }} data-slider-value="true">
                  {workloadVolume}K units
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={workloadVolume}
                onChange={(e) => setWorkloadVolume(Math.round(parseFloat(e.target.value)))}
                onInput={(e) => setWorkloadVolume(Math.round(parseFloat((e.target as HTMLInputElement).value)))}
                data-testid="production-slider"
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.accent} ${workloadVolume}%, ${colors.border} ${workloadVolume}%)`,
                  cursor: 'pointer',
                  touchAction: 'pan-y' as const,
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.accent,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Low (GPU wins)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>High (ASIC wins)</span>
              </div>
            </div>

            {/* Algorithm Stability slider */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>🔒 Algorithm Stability</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                  {algorithmStability < 30 ? 'Changes often' : algorithmStability < 70 ? 'Somewhat stable' : 'Very stable'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={algorithmStability}
                onChange={(e) => setAlgorithmStability(Math.round(parseFloat(e.target.value)))}
                onInput={(e) => setAlgorithmStability(Math.round(parseFloat((e.target as HTMLInputElement).value)))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.warning} ${algorithmStability}%, ${colors.border} ${algorithmStability}%)`,
                  cursor: 'pointer',
                  touchAction: 'pan-y' as const,
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.warning,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Changing (GPU wins)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Fixed (ASIC wins)</span>
              </div>
            </div>

            {/* Power Budget slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>⚡ Power Constraints</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                  {powerBudget < 30 ? 'Unlimited' : powerBudget < 70 ? 'Moderate' : 'Strict'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={powerBudget}
                onChange={(e) => setPowerBudget(Math.round(parseFloat(e.target.value)))}
                onInput={(e) => setPowerBudget(Math.round(parseFloat((e.target as HTMLInputElement).value)))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.success} ${powerBudget}%, ${colors.border} ${powerBudget}%)`,
                  cursor: 'pointer',
                  touchAction: 'pan-y' as const,
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.success,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ ...typo.small, color: colors.textMuted }}>Flexible (GPU ok)</span>
                <span style={{ ...typo.small, color: colors.textMuted }}>Tight (ASIC wins)</span>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div style={{
            background: metrics.asic.recommendation ? `${colors.asic}22` : metrics.fpga.recommendation ? `${colors.fpga}22` : `${colors.gpu}22`,
            border: `2px solid ${metrics.asic.recommendation ? colors.asic : metrics.fpga.recommendation ? colors.fpga : colors.gpu}`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: colors.textPrimary, margin: 0 }}>
              <strong>Recommended:</strong>{' '}
              <span style={{ color: metrics.asic.recommendation ? colors.asic : metrics.fpga.recommendation ? colors.fpga : colors.gpu }}>
                {metrics.asic.recommendation ? 'ASIC' : metrics.fpga.recommendation ? 'FPGA' : 'GPU'}
              </span>
              {' '}—{' '}
              {metrics.asic.recommendation
                ? 'High volume + stable algorithm + power constraints favor dedicated silicon'
                : metrics.fpga.recommendation
                  ? 'Medium volume with some flexibility needs favor reprogrammable hardware'
                  : 'Low volume or changing algorithms favor general-purpose flexibility'}
            </p>
          </div>
          </div>{/* Right: Controls panel */}
          </div>{/* Side-by-side flex container */}
        </div>

        {renderNavDots()}
        </div>{/* scroll wrapper */}

        <NavigationBar
          showBack={true}
          onBack={() => goToPhase('predict')}
          onNext={() => { playSound('success'); nextPhase(); }}
          nextLabel="Understand the Economics →"
        />
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Why Specialization Wins (Sometimes)
          </h2>

          {/* SVG visualization for review */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <HardwareVisualization
              workloadVolume={80}
              algorithmStability={90}
              powerBudget={70}
              selectedHardware="asic"
              showControls={false}
              animationFrame={0}
            />
          </div>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Efficiency Spectrum:</strong> As you observed in the experiment, the optimal hardware choice depends on your specific situation.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.gpu }}>GPUs</span> are like Swiss Army knives—they can do many things reasonably well, but they carry overhead for every capability they might need.
              </p>
              <p style={{ marginBottom: '16px' }}>
                <span style={{ color: colors.asic }}>ASICs</span> are like surgical scalpels—they do exactly one thing, but they do it with maximum efficiency because they contain nothing extraneous.
              </p>
              <p>
                <span style={{ color: colors.fpga }}>FPGAs</span> are in between—customizable hardware that can be reconfigured, offering a middle ground in efficiency and flexibility.
              </p>
            </div>
          </div>

          <div style={{
            background: `${colors.accent}11`,
            border: `1px solid ${colors.accent}33`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.accent, marginBottom: '12px' }}>
              💡 Key Insight: NRE Economics
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong>NRE (Non-Recurring Engineering)</strong> costs for ASIC development = $50-500 million. This only makes sense if you can spread that cost across millions of chips AND your algorithm won't change for years.
            </p>
          </div>

          {/* Cost breakdown */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              borderTop: `3px solid ${colors.gpu}`,
            }}>
              <div style={{ ...typo.h3, color: colors.gpu }}>$0</div>
              <div style={{ ...typo.small, color: colors.textSecondary }}>GPU NRE</div>
              <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>Buy off the shelf</div>
            </div>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              borderTop: `3px solid ${colors.fpga}`,
            }}>
              <div style={{ ...typo.h3, color: colors.fpga }}>$5M</div>
              <div style={{ ...typo.small, color: colors.textSecondary }}>FPGA NRE</div>
              <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>Design + validation</div>
            </div>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              borderTop: `3px solid ${colors.asic}`,
            }}>
              <div style={{ ...typo.h3, color: colors.asic }}>$100M+</div>
              <div style={{ ...typo.small, color: colors.textSecondary }}>ASIC NRE</div>
              <div style={{ ...typo.small, color: colors.textMuted, marginTop: '4px' }}>Mask + fab + design</div>
            </div>
          </div>
        </div>

        {renderNavDots()}

        <NavigationBar
          showBack={true}
          onBack={() => goToPhase('play')}
          onNext={() => { playSound('success'); nextPhase(); }}
          nextLabel="Explore Algorithm Risk →"
        />
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'The ASIC continues to work but becomes less optimal over time' },
      { id: 'b', text: 'The ASIC becomes completely worthless—it can only run the old algorithm' },
      { id: 'c', text: 'A software update can reprogram the ASIC for the new algorithm' },
    ];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '40px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              ⚠️ New Variable: Algorithm Changes - Step 1 of 2
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '16px' }}>
            A company built a $100M ASIC for their AI algorithm. Two years later, researchers discover a fundamentally better approach. What happens to their ASIC investment?
          </h2>

          {/* SVG Visualization - static for twist_predict phase */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <HardwareVisualization
              workloadVolume={90}
              algorithmStability={20}
              powerBudget={50}
              selectedHardware="asic"
              showControls={false}
              animationFrame={0}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { playSound('click'); setTwistPrediction(opt.id); }}
                style={{
                  background: twistPrediction === opt.id ? `${colors.warning}22` : colors.bgCard,
                  border: `2px solid ${twistPrediction === opt.id ? colors.warning : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: twistPrediction === opt.id ? colors.warning : colors.bgSecondary,
                  color: twistPrediction === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '28px',
                  marginRight: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.body }}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {renderNavDots()}

        <NavigationBar
          showBack={true}
          onBack={() => goToPhase('review')}
          onNext={twistPrediction ? () => { playSound('success'); nextPhase(); } : undefined}
          nextLabel="See the Impact →"
          nextDisabled={!twistPrediction}
        />
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '900px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            The Economics Decision Lab
          </h2>

          {/* Observation guidance */}
          <div style={{
            background: `${colors.success}15`,
            border: `1px solid ${colors.success}33`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong style={{ color: colors.success }}>What to Watch:</strong> Explore how volume and stability affect your investment decision. Try adjusting the sliders to see when ASIC investment becomes risky.
            </p>
          </div>

          {/* Side-by-side layout: SVG left, Controls right */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '12px' : '20px',
            width: '100%',
            alignItems: isMobile ? 'center' : 'flex-start',
          }}>
          {/* Left: SVG visualization */}
          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>
          {/* SVG Visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: isMobile ? '0' : '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <HardwareVisualization
              workloadVolume={workloadVolume}
              algorithmStability={algorithmStability}
              powerBudget={powerBudget}
              selectedHardware={selectedHardware}
              showControls={true}
              animationFrame={animationFrame}
            />
          </div>
          </div>{/* Left: SVG visualization */}

          {/* Right: Controls panel */}
          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            {/* Interactive scenario visualization */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '20px',
              marginBottom: '24px',
            }}>
              {/* Volume impact */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                  Cost per Unit at Different Volumes
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>1K units:</span>
                    <span style={{ ...typo.small, color: colors.asic }}>ASIC: $100,050</span>
                    <span style={{ ...typo.small, color: colors.gpu }}>GPU: $1,000</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>100K units:</span>
                    <span style={{ ...typo.small, color: colors.asic }}>ASIC: $1,050</span>
                    <span style={{ ...typo.small, color: colors.gpu }}>GPU: $1,000</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>1M units:</span>
                    <span style={{ ...typo.small, color: colors.asic }}>ASIC: $150</span>
                    <span style={{ ...typo.small, color: colors.gpu }}>GPU: $1,000</span>
                  </div>
                </div>
              </div>

              {/* Risk visualization */}
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
              }}>
                <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '12px' }}>
                  Algorithm Change Risk
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ ...typo.small, color: colors.textMuted }}>If algorithm changes:</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...typo.small, color: colors.asic }}>ASIC:</span>
                    <span style={{ ...typo.small, color: colors.error }}>Total loss ($100M+)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...typo.small, color: colors.fpga }}>FPGA:</span>
                    <span style={{ ...typo.small, color: colors.warning }}>Reprogram (weeks)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ ...typo.small, color: colors.gpu }}>GPU:</span>
                    <span style={{ ...typo.small, color: colors.success }}>Software update (hours)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Value calculation sliders */}
            <h4 style={{ ...typo.small, color: colors.textSecondary, marginBottom: '16px' }}>
              Adjust Your Scenario:
            </h4>

            {/* Volume slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>📦 Expected Volume</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>{workloadVolume}K units</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={workloadVolume}
                onChange={(e) => setWorkloadVolume(Math.round(parseFloat(e.target.value)))}
                onInput={(e) => setWorkloadVolume(Math.round(parseFloat((e.target as HTMLInputElement).value)))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y' as const,
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.accent,
                }}
              />
            </div>

            {/* Stability slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>🔒 Algorithm Lifespan</span>
                <span style={{ ...typo.small, color: colors.accent, fontWeight: 600 }}>
                  {Math.round(algorithmStability / 10)} years
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={algorithmStability}
                onChange={(e) => setAlgorithmStability(Math.round(parseFloat(e.target.value)))}
                onInput={(e) => setAlgorithmStability(Math.round(parseFloat((e.target as HTMLInputElement).value)))}
                style={{
                  width: '100%',
                  height: '20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  touchAction: 'pan-y' as const,
                  WebkitAppearance: 'none' as const,
                  accentColor: colors.accent,
                }}
              />
            </div>

            {/* Value comparison */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: metrics.asic.recommendation ? `${colors.asic}22` : colors.bgPrimary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                border: `2px solid ${metrics.asic.recommendation ? colors.asic : 'transparent'}`,
              }}>
                <div style={{ ...typo.h3, color: colors.asic }}>{metrics.asic.value.toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>ASIC Value</div>
              </div>
              <div style={{
                background: metrics.fpga.recommendation ? `${colors.fpga}22` : colors.bgPrimary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                border: `2px solid ${metrics.fpga.recommendation ? colors.fpga : 'transparent'}`,
              }}>
                <div style={{ ...typo.h3, color: colors.fpga }}>{metrics.fpga.value.toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>FPGA Value</div>
              </div>
              <div style={{
                background: metrics.gpu.recommendation ? `${colors.gpu}22` : colors.bgPrimary,
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                border: `2px solid ${metrics.gpu.recommendation ? colors.gpu : 'transparent'}`,
              }}>
                <div style={{ ...typo.h3, color: colors.gpu }}>{metrics.gpu.value.toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>GPU Value</div>
              </div>
            </div>
          </div>
          </div>{/* Right: Controls panel */}
          </div>{/* Side-by-side flex container */}
        </div>

        {renderNavDots()}

        <NavigationBar
          showBack={true}
          onBack={() => goToPhase('twist_predict')}
          onNext={() => { playSound('success'); nextPhase(); }}
          nextLabel="Understand the Strategy →"
        />
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Strategic ASIC Design
          </h2>

          {/* SVG visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <HardwareVisualization
              workloadVolume={70}
              algorithmStability={85}
              powerBudget={60}
              selectedHardware="fpga"
              showControls={false}
              animationFrame={0}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Target Stable Primitives</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Smart ASIC designers target <span style={{ color: colors.success }}>stable computational primitives</span> rather than specific algorithms. Google's TPUs optimize for matrix multiplication—an operation that underlies many AI models regardless of architecture.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Volume Thresholds</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                General rule: ASICs need <span style={{ color: colors.warning }}>100K+ units</span> to justify NRE costs. FPGAs work well for 1K-100K units. GPUs are ideal for prototyping and low-volume production. The formula: Total Cost = NRE / Volume + Unit Cost
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💡</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Hybrid Approaches</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Many modern chips combine strategies: <strong>fixed-function ASIC blocks</strong> for stable operations (video decode, encryption) with <strong>programmable cores</strong> for evolving workloads. Gaming consoles and smartphones use this approach.
              </p>
            </div>
          </div>
        </div>

        {renderNavDots()}

        <NavigationBar
          showBack={true}
          onBack={() => goToPhase('twist_play')}
          onNext={() => { playSound('success'); nextPhase(); }}
          nextLabel="See Real-World Applications →"
        />
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    return (
      <TransferPhaseView
        conceptName="A S I Cvs G P U"
        applications={realWorldApps}
        onComplete={() => goToPhase('test')}
        isMobile={isMobile}
        colors={colors}
        typo={typo}
        playSound={playSound}
      />
    );
  }

  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const completedCount = completedApps.filter(c => c).length;
    const allAppsCompleted = completedApps.every(c => c);

    const handleGotIt = () => {
      playSound('click');
      const newCompleted = [...completedApps];
      newCompleted[selectedApp] = true;
      setCompletedApps(newCompleted);
      // Auto-advance to next incomplete app
      const nextIncomplete = completedApps.findIndex((c, i) => !c && i !== selectedApp);
      if (nextIncomplete !== -1) {
        setSelectedApp(nextIncomplete);
      }
    };

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '40px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

          {/* Progress indicator */}
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Application {selectedApp + 1} of {realWorldApps.length} — {completedCount} of {realWorldApps.length} completed
          </p>

          {/* App selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {realWorldApps.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('click');
                  setSelectedApp(i);
                  const newCompleted = [...completedApps];
                  newCompleted[i] = true;
                  setCompletedApps(newCompleted);
                }}
                style={{
                  background: selectedApp === i ? `${a.color}22` : colors.bgCard,
                  border: `2px solid ${selectedApp === i ? a.color : completedApps[i] ? colors.success : colors.border}`,
                  borderRadius: '12px',
                  padding: '16px 8px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  minHeight: '44px',
                }}
              >
                {completedApps[i] && (
                  <div style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: colors.success,
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}>
                    ✓
                  </div>
                )}
                <div style={{ fontSize: '28px', marginBottom: '4px' }}>{a.icon}</div>
                <div style={{ ...typo.small, color: colors.textPrimary, fontWeight: 500 }}>
                  {a.title.split(' ').slice(0, 2).join(' ')}
                </div>
              </button>
            ))}
          </div>

          {/* Selected app details */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            borderLeft: `4px solid ${app.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <span style={{ fontSize: '48px' }}>{app.icon}</span>
              <div>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>{app.title}</h3>
                <p style={{ ...typo.small, color: app.color, margin: 0 }}>{app.tagline}</p>
              </div>
            </div>

            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '16px' }}>
              {app.description}
            </p>

            <div style={{
              background: colors.bgSecondary,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <h4 style={{ ...typo.small, color: colors.accent, marginBottom: '8px', fontWeight: 600 }}>
                Why It Works:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}>
              {app.stats.map((stat, i) => (
                <div key={i} style={{
                  background: colors.bgSecondary,
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                  <div style={{ ...typo.h3, color: app.color }}>{stat.value}</div>
                  <div style={{ ...typo.small, color: colors.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Got It button for current app */}
            {!completedApps[selectedApp] && (
              <button
                onClick={handleGotIt}
                style={{
                  ...primaryButtonStyle,
                  width: '100%',
                  background: `linear-gradient(135deg, ${app.color}, ${app.color}88)`,
                }}
              >
                Got It! Continue →
              </button>
            )}
            {completedApps[selectedApp] && !allAppsCompleted && (
              <p style={{ ...typo.small, color: colors.success, textAlign: 'center', margin: 0 }}>
                ✓ Completed — Select another application above
              </p>
            )}
          </div>
        </div>

        {renderNavDots()}

        <NavigationBar
          showBack={true}
          onBack={() => goToPhase('twist_review')}
          onNext={allAppsCompleted ? () => { playSound('success'); nextPhase(); } : undefined}
          nextLabel="Take the Knowledge Test →"
          nextDisabled={!allAppsCompleted}
        />
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100dvh',
          background: colors.bgPrimary,
          padding: '24px',
          paddingBottom: '16px',
          overflowY: 'auto',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '40px auto 0', textAlign: 'center' }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
            }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ ...typo.h2, color: passed ? colors.success : colors.warning }}>
              {passed ? 'Excellent!' : 'Keep Learning!'}
            </h2>
            <p style={{ ...typo.h1, color: colors.textPrimary, margin: '16px 0' }}>
              {testScore} / 10
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '32px' }}>
              {passed
                ? 'You\'ve mastered ASIC vs GPU tradeoffs!'
                : 'Review the concepts and try again.'}
            </p>
          </div>
          {renderNavDots()}

          <NavigationBar
            showBack={!passed}
            onBack={() => {
              setTestSubmitted(false);
              setTestAnswers(Array(10).fill(null));
              setCurrentQuestion(0);
              setTestScore(0);
              goToPhase('hook');
            }}
            onNext={passed ? () => { playSound('complete'); nextPhase(); } : undefined}
            nextLabel={passed ? "Complete Lesson →" : "Review & Try Again"}
          />
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100dvh',
        background: colors.bgPrimary,
        padding: '24px',
        paddingBottom: '16px',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '40px auto 0' }}>
          {/* Progress with Q number */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.h3, color: colors.accent, fontWeight: 700 }}>
              Q{currentQuestion + 1} of 10
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: i === currentQuestion
                    ? colors.accent
                    : testAnswers[i]
                      ? colors.success
                      : colors.border,
                }} />
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            borderLeft: `3px solid ${colors.accent}`,
          }}>
            <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '20px' }}>
            {question.question}
          </h3>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {question.options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  playSound('click');
                  const newAnswers = [...testAnswers];
                  newAnswers[currentQuestion] = opt.id;
                  setTestAnswers(newAnswers);
                }}
                style={{
                  background: testAnswers[currentQuestion] === opt.id ? `${colors.accent}22` : colors.bgCard,
                  border: `2px solid ${testAnswers[currentQuestion] === opt.id ? colors.accent : colors.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: testAnswers[currentQuestion] === opt.id ? colors.accent : colors.bgSecondary,
                  color: testAnswers[currentQuestion] === opt.id ? 'white' : colors.textSecondary,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}>
                  {opt.id.toUpperCase()}
                </span>
                <span style={{ color: colors.textPrimary, ...typo.small }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQuestion > 0 && (
              <button
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                ← Previous
              </button>
            )}
            {currentQuestion < 9 ? (
              <button
                onClick={() => testAnswers[currentQuestion] && setCurrentQuestion(currentQuestion + 1)}
                disabled={!testAnswers[currentQuestion]}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers[currentQuestion] ? colors.accent : colors.border,
                  color: 'white',
                  cursor: testAnswers[currentQuestion] ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Next Question
              </button>
            ) : (
              <button
                onClick={() => {
                  const score = testAnswers.reduce((acc, ans, i) => {
                    const correct = testQuestions[i].options.find(o => o.correct)?.id;
                    return acc + (ans === correct ? 1 : 0);
                  }, 0);
                  setTestScore(score);
                  setTestSubmitted(true);
                  playSound(score >= 7 ? 'complete' : 'failure');
                }}
                disabled={testAnswers.some(a => a === null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: testAnswers.every(a => a !== null) ? colors.success : colors.border,
                  color: 'white',
                  cursor: testAnswers.every(a => a !== null) ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  minHeight: '44px',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        paddingBottom: '16px',
        textAlign: 'center',
        overflowY: 'auto',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginTop: '40px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Hardware Architecture Expert!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand the critical tradeoffs between ASICs, GPUs, and FPGAs—knowledge essential for hardware design decisions.
        </p>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          maxWidth: '400px',
        }}>
          <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '16px' }}>
            You Learned:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
            {[
              'When ASICs beat GPUs (stable algorithms, high volume)',
              'NRE economics and volume thresholds',
              'Power efficiency advantages of specialization',
              'Risk of algorithm changes obsoleting hardware',
              'Hybrid approaches combining fixed + programmable',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {renderNavDots()}

        <NavigationBar
          showBack={true}
          onBack={() => goToPhase('hook')}
          onNext={() => { window.location.href = '/'; }}
          nextLabel="Return to Dashboard"
        />
      </div>
    );
  }

  return null;
};

export default ASICvsGPURenderer;
