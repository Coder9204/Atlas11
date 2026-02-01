'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// -----------------------------------------------------------------------------
// Network Congestion Physics - Complete 10-Phase Game
// Queue utilization near 1 makes latency explode (queueing theory)
// -----------------------------------------------------------------------------

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

interface NetworkCongestionRendererProps {
  onGameEvent?: (event: GameEvent) => void;
  gamePhase?: string;
}

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

// -----------------------------------------------------------------------------
// TEST QUESTIONS - 10 scenario-based multiple choice questions
// -----------------------------------------------------------------------------
const testQuestions = [
  {
    scenario: "A data center network switch is processing packets at 80% of its maximum capacity. Network engineers notice that average latency is 5ms. They consider adding more traffic to reach 95% utilization.",
    question: "What will happen to latency as utilization increases from 80% to 95%?",
    options: [
      { id: 'a', label: "Latency will increase proportionally (about 19% higher)" },
      { id: 'b', label: "Latency will explode exponentially, potentially 4x or more higher", correct: true },
      { id: 'c', label: "Latency will stay roughly the same since the switch has spare capacity" },
      { id: 'd', label: "Latency will decrease as the system becomes more efficient" }
    ],
    explanation: "According to queueing theory, latency follows ~1/(1-utilization). At 80% utilization, the factor is 5. At 95%, it becomes 20 - a 4x increase! This is why network engineers keep utilization well below 100%."
  },
  {
    scenario: "A company doubles their internet bandwidth from 1 Gbps to 2 Gbps. They expect latency to drop by half since packets should flow through faster.",
    question: "Why might doubling bandwidth NOT halve latency?",
    options: [
      { id: 'a', label: "The speed of light limits how fast packets can travel" },
      { id: 'b', label: "If utilization was already low, queuing delay was minimal - adding bandwidth doesn't help much", correct: true },
      { id: 'c', label: "Routers become confused with more bandwidth available" },
      { id: 'd', label: "TCP protocol forces a minimum latency regardless of bandwidth" }
    ],
    explanation: "Total latency = propagation delay + transmission delay + queueing delay. If utilization was already low (say 30%), queueing delay was small. Doubling bandwidth helps transmission delay but not propagation delay. The biggest improvements come when you reduce high utilization."
  },
  {
    scenario: "A video streaming service notices that during peak hours, some users experience 500ms latency spikes even though average latency is only 50ms. The p99 (99th percentile) latency is 10x the average.",
    question: "What causes this huge gap between average and p99 latency?",
    options: [
      { id: 'a', label: "Some users have slower internet connections" },
      { id: 'b', label: "Random bursts fill the queue, creating occasional long waits for unlucky packets", correct: true },
      { id: 'c', label: "The server prioritizes certain users over others" },
      { id: 'd', label: "Video packets are inherently more variable in latency" }
    ],
    explanation: "Network traffic is bursty. When a burst arrives, the queue fills rapidly, causing packets at the back to wait much longer. While most packets see short queues, the unlucky ones arriving during bursts experience tail latency. This is why p99 is often 5-20x the average."
  },
  {
    scenario: "An online game sends small 100-byte packets very frequently. A file transfer application sends large 1500-byte packets less frequently. Both use the same total bandwidth.",
    question: "How does packet size affect latency and jitter in a shared network?",
    options: [
      { id: 'a', label: "Large packets always have lower latency due to better efficiency" },
      { id: 'b', label: "Small packets experience more consistent latency; large packets cause more jitter for others", correct: true },
      { id: 'c', label: "Packet size has no effect on latency, only on throughput" },
      { id: 'd', label: "Small packets clog the network and should be avoided" }
    ],
    explanation: "Large packets occupy the link longer, causing other packets to wait. A 1500-byte packet at 1 Gbps takes 12 microseconds to transmit vs 0.8 microseconds for 100 bytes. This blocking time creates jitter. Small packets interleave better, giving more consistent timing crucial for real-time applications."
  },
  {
    scenario: "A router has a queue that can hold 1000 packets. During congestion, the queue fills completely. New packets are dropped (tail drop). TCP connections detect this and slow down.",
    question: "Why do modern routers use Active Queue Management (AQM) instead of simple tail drop?",
    options: [
      { id: 'a', label: "AQM uses less memory than maintaining a large queue" },
      { id: 'b', label: "AQM signals congestion early by dropping packets probabilistically, preventing the queue from filling completely", correct: true },
      { id: 'c', label: "AQM processes packets faster than tail drop" },
      { id: 'd', label: "Tail drop is actually better but AQM is cheaper to implement" }
    ],
    explanation: "Tail drop causes 'bufferbloat' - queues fill, latency spikes, then mass drops cause TCP synchronization. AQM (like RED, CoDel) drops packets probabilistically before the queue fills, maintaining lower latency and smoother flow. This keeps queues short while still absorbing bursts."
  },
  {
    scenario: "A network path has 5 router hops. Each router has a 10ms processing time. Engineers measure end-to-end latency at 150ms even though 5 x 10ms = 50ms processing.",
    question: "What causes the extra 100ms of latency beyond router processing time?",
    options: [
      { id: 'a', label: "Encryption overhead adds significant delay" },
      { id: 'b', label: "Queueing delay at each hop - packets wait behind others, adding cumulative delay", correct: true },
      { id: 'c', label: "The measurement tools introduce 100ms of overhead" },
      { id: 'd', label: "TCP acknowledgments traveling back consume the extra time" }
    ],
    explanation: "Each router has its own queue. If utilization is high, packets wait at each hop. The total queueing delay can exceed processing/transmission delay by 2-10x during congestion. This is why busy networks have much higher latency than their theoretical minimum."
  },
  {
    scenario: "A financial trading firm has two network paths to an exchange: Path A has 10ms latency with 1ms jitter. Path B has 8ms latency with 5ms jitter.",
    question: "For latency-sensitive trading, which path is likely better and why?",
    options: [
      { id: 'a', label: "Path B - lower average latency means faster trades on average" },
      { id: 'b', label: "Path A - consistent latency is more valuable than slightly lower average; predictability enables better optimization", correct: true },
      { id: 'c', label: "Neither - the difference is negligible at these scales" },
      { id: 'd', label: "Path B - high jitter means sometimes you get very fast latency" }
    ],
    explanation: "High-frequency trading values consistency. Path A's worst case is 11ms, Path B's is 13ms. More importantly, predictable latency enables optimization strategies. Jitter causes uncertainty in arrival times, which can mean missing trading opportunities or executing at wrong prices."
  },
  {
    scenario: "A CDN (Content Delivery Network) notices that adding more cache servers initially improved latency, but adding even more servers started making latency worse.",
    question: "Why might adding more servers increase latency after a certain point?",
    options: [
      { id: 'a', label: "More servers consume more electricity, heating the data center" },
      { id: 'b', label: "Load balancing and coordination overhead between servers creates additional queueing and processing delays", correct: true },
      { id: 'c', label: "Users get confused about which server to connect to" },
      { id: 'd', label: "Servers compete for the same network bandwidth" }
    ],
    explanation: "Adding servers requires load balancers, which introduce their own queues. Coordination between servers (cache coherence, session management) adds latency. At some point, the overhead of distributing work exceeds the benefit. This is Amdahl's law applied to distributed systems."
  },
  {
    scenario: "Two applications share a network link. App A uses TCP (which backs off during congestion). App B uses UDP and sends at a constant rate regardless of congestion.",
    question: "What happens to both applications during network congestion?",
    options: [
      { id: 'a', label: "Both experience equally degraded performance" },
      { id: 'b', label: "TCP (App A) backs off, giving UDP (App B) most of the bandwidth; UDP may still experience packet loss", correct: true },
      { id: 'c', label: "UDP automatically gets priority over TCP in all routers" },
      { id: 'd', label: "TCP will block UDP until congestion clears" }
    ],
    explanation: "TCP's congestion control backs off when it detects loss, reducing its send rate. UDP has no built-in congestion control and keeps sending. This means TCP 'yields' bandwidth to UDP during congestion. However, if queues overflow, UDP packets are dropped too. This is why QoS policies exist."
  },
  {
    scenario: "A network engineer implements Quality of Service (QoS) with priority queues: voice traffic gets highest priority, video gets medium, and data gets lowest. The link is 70% utilized.",
    question: "What is the key tradeoff of strict priority queuing?",
    options: [
      { id: 'a', label: "High-priority traffic always experiences zero latency" },
      { id: 'b', label: "Low-priority traffic can be starved if high-priority traffic is heavy; priorities must be carefully managed", correct: true },
      { id: 'c', label: "Priority queuing uses too much CPU to be practical" },
      { id: 'd', label: "All traffic classes get equal treatment regardless of priority setting" }
    ],
    explanation: "Strict priority means low-priority traffic only transmits when high-priority queues are empty. If voice/video traffic is heavy, data traffic can wait indefinitely (starvation). Modern QoS uses weighted fair queuing to guarantee minimum bandwidth for each class while still providing priority."
  }
];

// -----------------------------------------------------------------------------
// REAL WORLD APPLICATIONS - 4 detailed applications
// -----------------------------------------------------------------------------
const realWorldApps = [
  {
    icon: '🎮',
    title: 'Online Gaming Networks',
    short: 'Low latency for competitive gaming',
    tagline: 'Every millisecond counts in esports',
    description: 'Online games require consistent low latency (under 50ms) for responsive gameplay. Network congestion causes lag spikes that ruin the player experience. Game servers use sophisticated queue management to prioritize game traffic over background updates.',
    connection: 'The queueing theory you explored explains why games become unplayable during peak hours. When utilization spikes, latency explodes. Game developers use techniques like client-side prediction and lag compensation to mask network jitter.',
    howItWorks: 'Game traffic uses small, frequent UDP packets. Dedicated game servers have reserved bandwidth and priority queuing. Geographic server placement minimizes base latency. Matchmaking considers ping to ensure fair play.',
    stats: [
      { value: '<20ms', label: 'Pro gaming target', icon: '🎯' },
      { value: '64', label: 'Tick rate (Hz)', icon: '⚡' },
      { value: '$1.8B', label: 'Esports market', icon: '💰' }
    ],
    examples: ['Valorant', 'League of Legends', 'Counter-Strike', 'Fortnite'],
    companies: ['Riot Games', 'Valve', 'Epic Games', 'Activision'],
    futureImpact: 'Edge computing and 5G will enable cloud gaming with sub-10ms latency, making high-quality gaming accessible on any device.',
    color: '#10B981'
  },
  {
    icon: '📊',
    title: 'Financial Trading Networks',
    short: 'Microsecond latency for market advantage',
    tagline: 'Speed is literally money',
    description: 'High-frequency trading firms spend millions to shave microseconds off network latency. Queueing delays in network switches can mean the difference between profit and loss. Some firms colocate servers directly in exchange data centers.',
    connection: 'At high utilization, even small queues cause unpredictable delays. Trading firms maintain dedicated network paths at very low utilization (<20%) to ensure consistent latency. They measure p99.99 latency, not just averages.',
    howItWorks: 'Direct fiber routes between exchanges bypass internet routing. Custom network hardware with deterministic latency. FPGA-based switches with microsecond-level queuing. Real-time monitoring of every packet.',
    stats: [
      { value: '<1\u03BCs', label: 'Switch latency', icon: '⚡' },
      { value: '$300M', label: 'Network invest', icon: '💵' },
      { value: '99.999%', label: 'Uptime required', icon: '🎯' }
    ],
    examples: ['NYSE Colocation', 'CME Direct Connect', 'NASDAQ TotalView', 'Cross-exchange arbitrage'],
    companies: ['Citadel', 'Two Sigma', 'Jump Trading', 'Virtu Financial'],
    futureImpact: 'Quantum networks may eventually provide unhackable, ultra-low-latency financial infrastructure, though decades away from practical deployment.',
    color: '#3B82F6'
  },
  {
    icon: '☁️',
    title: 'Cloud Data Centers',
    short: 'Managing millions of concurrent connections',
    tagline: 'The backbone of the internet',
    description: 'Cloud providers like AWS, Google, and Azure run massive networks connecting millions of servers. Network congestion between racks and data centers can bottleneck entire applications. Sophisticated traffic engineering keeps utilization balanced.',
    connection: 'Data center networks use queueing theory to provision capacity. They maintain headroom (typically 50-60% utilization) to handle bursts. Spine-leaf topologies provide multiple paths, spreading traffic to avoid hot spots.',
    howItWorks: 'Software-defined networking (SDN) dynamically routes traffic. ECMP (Equal-Cost Multi-Path) spreads flows across links. Congestion control protocols like DCQCN prevent incast collapse. Real-time telemetry monitors queue depths.',
    stats: [
      { value: '400Gbps', label: 'Link speeds', icon: '🚀' },
      { value: '<1ms', label: 'Intra-DC latency', icon: '⏱️' },
      { value: 'Millions', label: 'Servers connected', icon: '🖥️' }
    ],
    examples: ['AWS Direct Connect', 'Google B4 Network', 'Azure ExpressRoute', 'Meta Fabric'],
    companies: ['Amazon', 'Google', 'Microsoft', 'Meta'],
    futureImpact: 'Optical switching and photonic computing will enable data centers with near-zero latency between any two servers, revolutionizing distributed computing.',
    color: '#8B5CF6'
  },
  {
    icon: '📱',
    title: 'Mobile Networks & 5G',
    short: 'Wireless congestion management',
    tagline: 'Sharing the airwaves fairly',
    description: '5G networks promise ultra-low latency but must manage congestion from millions of devices sharing limited spectrum. Network slicing creates virtual queues for different traffic types, ensuring critical applications get priority.',
    connection: 'Wireless networks face unique queueing challenges: spectrum is shared, interference causes retransmissions, and mobility means constantly changing conditions. Advanced schedulers optimize queue management in real-time.',
    howItWorks: 'Network slicing creates isolated virtual networks with guaranteed resources. Edge computing moves processing closer to users. Beamforming directs signals to reduce interference. Carrier aggregation bonds multiple frequencies.',
    stats: [
      { value: '<5ms', label: '5G target latency', icon: '📶' },
      { value: '1M/km\u00B2', label: 'Device density', icon: '📱' },
      { value: '20 Gbps', label: 'Peak speed', icon: '⚡' }
    ],
    examples: ['Verizon Ultra Wideband', 'T-Mobile 5G UC', 'Industrial IoT', 'Remote surgery'],
    companies: ['Qualcomm', 'Ericsson', 'Nokia', 'Samsung'],
    futureImpact: '6G research targets sub-millisecond latency and terabit speeds, enabling holographic communication and true digital twins of physical environments.',
    color: '#F59E0B'
  }
];

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------
const NetworkCongestionRenderer: React.FC<NetworkCongestionRendererProps> = ({ onGameEvent, gamePhase }) => {
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
  const [isMobile, setIsMobile] = useState(false);

  // Simulation state
  const [arrivalRate, setArrivalRate] = useState(50); // packets per second (0-100)
  const [serviceRate, setServiceRate] = useState(60); // max processing rate
  const [queueDepth, setQueueDepth] = useState(0);
  const [packets, setPackets] = useState<{ id: number; x: number; y: number; inQueue: boolean; processed: boolean }[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [throughputHistory, setThroughputHistory] = useState<number[]>([]);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [totalDropped, setTotalDropped] = useState(0);

  // Twist phase - packet size comparison
  const [packetSize, setPacketSize] = useState<'small' | 'large'>('small');
  const [jitterHistory, setJitterHistory] = useState<number[]>([]);

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
  const packetIdRef = useRef(0);

  // Responsive design
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationFrame(f => f + 1);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Calculate utilization and theoretical latency
  const utilization = Math.min(arrivalRate / serviceRate, 1);
  const theoreticalLatency = utilization < 1 ? 1 / (1 - utilization) : Infinity;
  const avgLatency = latencyHistory.length > 0 ? latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length : 0;
  const p99Latency = latencyHistory.length > 0 ? [...latencyHistory].sort((a, b) => a - b)[Math.floor(latencyHistory.length * 0.99)] || avgLatency : 0;

  // Queue simulation
  useEffect(() => {
    if (!isSimulating || (phase !== 'play' && phase !== 'twist_play')) return;

    const interval = setInterval(() => {
      // Simulate packet arrivals (Poisson-like)
      const arrivalProbability = arrivalRate / 100;
      if (Math.random() < arrivalProbability) {
        const newPacket = {
          id: packetIdRef.current++,
          x: 0,
          y: 50 + Math.random() * 20,
          inQueue: true,
          processed: false,
        };
        setPackets(prev => {
          if (prev.filter(p => p.inQueue && !p.processed).length < 20) {
            return [...prev, newPacket];
          } else {
            setTotalDropped(d => d + 1);
            return prev;
          }
        });
      }

      // Process packets from queue
      const processProbability = serviceRate / 100;
      if (Math.random() < processProbability) {
        setPackets(prev => {
          const queuedPackets = prev.filter(p => p.inQueue && !p.processed);
          if (queuedPackets.length > 0) {
            const processedId = queuedPackets[0].id;
            const latency = queuedPackets.length * (packetSize === 'large' ? 2 : 1);
            setLatencyHistory(h => [...h.slice(-49), latency]);
            setTotalProcessed(p => p + 1);

            // Calculate jitter
            if (latencyHistory.length > 0) {
              const jitter = Math.abs(latency - latencyHistory[latencyHistory.length - 1]);
              setJitterHistory(j => [...j.slice(-49), jitter]);
            }

            return prev.map(p =>
              p.id === processedId ? { ...p, inQueue: false, processed: true } : p
            );
          }
          return prev;
        });
      }

      // Update queue depth
      setPackets(prev => {
        const newQueueDepth = prev.filter(p => p.inQueue && !p.processed).length;
        setQueueDepth(newQueueDepth);
        setThroughputHistory(h => [...h.slice(-49), totalProcessed]);
        // Remove old processed packets
        return prev.filter(p => p.inQueue || animationFrame - (p as { id: number; frame?: number }).id < 50);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating, arrivalRate, serviceRate, phase, packetSize, animationFrame, totalProcessed, latencyHistory]);

  // Premium design colors
  const colors = {
    bgPrimary: '#0a0a0f',
    bgSecondary: '#12121a',
    bgCard: '#1a1a24',
    accent: '#06B6D4', // Cyan for network theme
    accentGlow: 'rgba(6, 182, 212, 0.3)',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#2a2a3a',
    packet: '#3B82F6',
    queue: '#F59E0B',
    processed: '#10B981',
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
    twist_play: 'Packet Size Lab',
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
    if (onGameEvent) {
      onGameEvent({
        eventType: 'phase_changed',
        gameType: 'network-congestion',
        gameTitle: 'Network Congestion Physics',
        details: { phase: p },
        timestamp: Date.now()
      });
    }
    setTimeout(() => { isNavigating.current = false; }, 300);
  }, [onGameEvent]);

  const nextPhase = useCallback(() => {
    const currentIndex = phaseOrder.indexOf(phase);
    if (currentIndex < phaseOrder.length - 1) {
      goToPhase(phaseOrder[currentIndex + 1]);
    }
  }, [phase, goToPhase, phaseOrder]);

  // Reset simulation
  const resetSimulation = useCallback(() => {
    setPackets([]);
    setLatencyHistory([]);
    setThroughputHistory([]);
    setJitterHistory([]);
    setQueueDepth(0);
    setTotalProcessed(0);
    setTotalDropped(0);
    packetIdRef.current = 0;
  }, []);

  // Get utilization status
  const getUtilizationStatus = () => {
    if (utilization < 0.5) return { status: 'Low', color: colors.success };
    if (utilization < 0.8) return { status: 'Moderate', color: colors.warning };
    if (utilization < 0.95) return { status: 'High', color: colors.error };
    return { status: 'Critical', color: '#FF0000' };
  };

  const utilizationStatus = getUtilizationStatus();

  // Queue Visualization Component
  const QueueVisualization = () => {
    const width = isMobile ? 340 : 500;
    const height = isMobile ? 200 : 250;

    const queuedPackets = packets.filter(p => p.inQueue && !p.processed);
    const maxQueueDisplay = 15;

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '12px' }}>
        <defs>
          <linearGradient id="queueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.success} stopOpacity="0.3" />
            <stop offset={`${utilization * 100}%`} stopColor={utilizationStatus.color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.bgSecondary} stopOpacity="0.3" />
          </linearGradient>
          <filter id="packetGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Incoming arrow */}
        <text x="20" y="30" fill={colors.textSecondary} fontSize="12">Incoming</text>
        <line x1="20" y1="height/2" x2="60" y2={height/2} stroke={colors.packet} strokeWidth="2" markerEnd="url(#arrow)" />
        <polygon points={`60,${height/2-5} 70,${height/2} 60,${height/2+5}`} fill={colors.packet} />

        {/* Queue box */}
        <rect
          x="80"
          y={height/2 - 40}
          width={width - 180}
          height="80"
          fill="url(#queueGradient)"
          stroke={utilizationStatus.color}
          strokeWidth="2"
          rx="8"
        />
        <text x="85" y={height/2 - 50} fill={colors.textSecondary} fontSize="11">Queue ({queueDepth} packets)</text>

        {/* Packets in queue */}
        {queuedPackets.slice(0, maxQueueDisplay).map((packet, i) => (
          <rect
            key={packet.id}
            x={90 + i * 18}
            y={height/2 - 15}
            width={14}
            height={30}
            fill={colors.packet}
            rx="3"
            filter="url(#packetGlow)"
            opacity={0.8 + Math.sin(animationFrame * 0.2 + i) * 0.2}
          />
        ))}
        {queuedPackets.length > maxQueueDisplay && (
          <text x={90 + maxQueueDisplay * 18 + 10} y={height/2 + 5} fill={colors.textMuted} fontSize="12">
            +{queuedPackets.length - maxQueueDisplay}
          </text>
        )}

        {/* Server */}
        <rect
          x={width - 90}
          y={height/2 - 30}
          width="60"
          height="60"
          fill={colors.bgSecondary}
          stroke={colors.success}
          strokeWidth="2"
          rx="8"
        />
        <text x={width - 75} y={height/2 + 5} fill={colors.success} fontSize="20" fontWeight="bold">S</text>
        <text x={width - 60} y={height/2 + 55} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Server</text>

        {/* Output arrow */}
        <polygon points={`${width - 20},${height/2-5} ${width - 10},${height/2} ${width - 20},${height/2+5}`} fill={colors.success} />
        <text x={width - 25} y="30" fill={colors.textSecondary} fontSize="12" textAnchor="end">Processed</text>

        {/* Utilization bar */}
        <rect x="80" y={height - 35} width={width - 180} height="10" rx="5" fill={colors.bgSecondary} />
        <rect
          x="80"
          y={height - 35}
          width={(width - 180) * utilization}
          height="10"
          rx="5"
          fill={utilizationStatus.color}
        />
        <text x="85" y={height - 10} fill={colors.textSecondary} fontSize="10">
          Utilization: {(utilization * 100).toFixed(0)}%
        </text>
      </svg>
    );
  };

  // Latency Chart Component
  const LatencyChart = () => {
    const width = isMobile ? 340 : 400;
    const height = 150;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxLatency = Math.max(...latencyHistory, 10);
    const points = latencyHistory.map((lat, i) => ({
      x: padding.left + (i / 49) * chartWidth,
      y: padding.top + chartHeight - (lat / maxLatency) * chartHeight,
    }));

    const pathD = points.length > 1
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
      : '';

    return (
      <svg width={width} height={height} style={{ background: colors.bgCard, borderRadius: '8px' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={frac}
            x1={padding.left}
            y1={padding.top + frac * chartHeight}
            x2={width - padding.right}
            y2={padding.top + frac * chartHeight}
            stroke={colors.border}
            strokeDasharray="3,3"
          />
        ))}

        {/* Latency line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={colors.warning}
            strokeWidth="2"
          />
        )}

        {/* P99 line */}
        {p99Latency > 0 && (
          <>
            <line
              x1={padding.left}
              y1={padding.top + chartHeight - (p99Latency / maxLatency) * chartHeight}
              x2={width - padding.right}
              y2={padding.top + chartHeight - (p99Latency / maxLatency) * chartHeight}
              stroke={colors.error}
              strokeDasharray="5,5"
              strokeWidth="1"
            />
            <text
              x={width - padding.right - 5}
              y={padding.top + chartHeight - (p99Latency / maxLatency) * chartHeight - 5}
              fill={colors.error}
              fontSize="9"
              textAnchor="end"
            >
              p99
            </text>
          </>
        )}

        {/* Labels */}
        <text x={padding.left - 5} y={padding.top + 5} fill={colors.textMuted} fontSize="9" textAnchor="end">{maxLatency.toFixed(0)}</text>
        <text x={padding.left - 5} y={height - padding.bottom} fill={colors.textMuted} fontSize="9" textAnchor="end">0</text>
        <text x={width / 2} y={height - 5} fill={colors.textSecondary} fontSize="10" textAnchor="middle">Latency (queue time units)</text>
      </svg>
    );
  };

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

  // Primary button style
  const primaryButtonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${colors.accent}, #0891B2)`,
    color: 'white',
    border: 'none',
    padding: isMobile ? '14px 28px' : '16px 32px',
    borderRadius: '12px',
    fontSize: isMobile ? '16px' : '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: `0 4px 20px ${colors.accentGlow}`,
    transition: 'all 0.2s ease',
  };

  // ---------------------------------------------------------------------------
  // PHASE RENDERS
  // ---------------------------------------------------------------------------

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          🌐📦
        </div>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.textPrimary, marginBottom: '16px' }}>
          Network Congestion Physics
        </h1>

        <p style={{
          ...typo.body,
          color: colors.textSecondary,
          maxWidth: '600px',
          marginBottom: '32px',
        }}>
          "If you add bandwidth, does latency always drop? The surprising answer reveals one of the most important principles in <span style={{ color: colors.accent }}>queueing theory</span>."
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
            "Network congestion is like traffic flow - it's not the road capacity that determines travel time, but how close you are to maximum capacity. At 95% utilization, adding one more car creates chaos."
          </p>
          <p style={{ ...typo.small, color: colors.textMuted, marginTop: '8px' }}>
            - Queueing Theory Fundamentals
          </p>
        </div>

        <button
          onClick={() => { playSound('click'); nextPhase(); }}
          style={primaryButtonStyle}
        >
          Explore Network Physics
        </button>

        {renderNavDots()}
      </div>
    );
  }

  // PREDICT PHASE
  if (phase === 'predict') {
    const options = [
      { id: 'a', text: 'Latency will increase linearly (double the traffic = double the latency)' },
      { id: 'b', text: 'Latency will explode exponentially as utilization approaches 100%', correct: true },
      { id: 'c', text: 'Latency will stay constant until the network is fully saturated' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.accent}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.accent}44`,
          }}>
            <p style={{ ...typo.small, color: colors.accent, margin: 0 }}>
              Make Your Prediction
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            A network switch can process 100 packets/second. Currently receiving 50 packets/second (50% utilization). What happens to latency as traffic increases toward 100%?
          </h2>

          {/* Simple diagram */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px' }}>📦📦📦</div>
                <p style={{ ...typo.small, color: colors.textMuted }}>Incoming Packets</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{
                background: colors.queue + '33',
                padding: '20px 30px',
                borderRadius: '8px',
                border: `2px solid ${colors.queue}`,
              }}>
                <div style={{ fontSize: '24px', color: colors.textPrimary }}>Queue</div>
                <p style={{ ...typo.small, color: colors.queue }}>Wait here...</p>
              </div>
              <div style={{ fontSize: '24px', color: colors.textMuted }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px' }}>🖥️</div>
                <p style={{ ...typo.small, color: colors.success }}>Process</p>
              </div>
            </div>
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

          {prediction && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Test My Prediction
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // PLAY PHASE - Interactive Queue Simulator
  if (phase === 'play') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Network Queue Simulator
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Adjust traffic load and watch how queue depth and latency respond
          </p>

          {/* Main visualization */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <QueueVisualization />
            </div>

            {/* Arrival rate slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Arrival Rate (packets/sec)</span>
                <span style={{ ...typo.small, color: colors.packet, fontWeight: 600 }}>{arrivalRate}</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                value={arrivalRate}
                onChange={(e) => setArrivalRate(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.packet} ${((arrivalRate - 10) / 85) * 100}%, ${colors.border} ${((arrivalRate - 10) / 85) * 100}%)`,
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Service rate slider */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Service Rate (max capacity)</span>
                <span style={{ ...typo.small, color: colors.success, fontWeight: 600 }}>{serviceRate}</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={serviceRate}
                onChange={(e) => setServiceRate(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: `linear-gradient(to right, ${colors.success} ${((serviceRate - 50) / 50) * 100}%, ${colors.border} ${((serviceRate - 50) / 50) * 100}%)`,
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Simulation controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setIsSimulating(!isSimulating);
                  playSound('click');
                }}
                style={{
                  background: isSimulating ? colors.error : colors.success,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {isSimulating ? 'Stop' : 'Start'} Simulation
              </button>
              <button
                onClick={() => {
                  resetSimulation();
                  playSound('click');
                }}
                style={{
                  background: colors.bgSecondary,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: utilizationStatus.color }}>{(utilization * 100).toFixed(0)}%</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Utilization</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.queue }}>{queueDepth}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Queue Depth</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{avgLatency.toFixed(1)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Avg Latency</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>{p99Latency.toFixed(1)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>p99 Latency</div>
              </div>
            </div>
          </div>

          {/* Latency chart */}
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <h3 style={{ ...typo.h3, color: colors.textPrimary, marginBottom: '12px' }}>
              Real-Time Latency
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <LatencyChart />
            </div>
          </div>

          {/* Discovery prompt */}
          {utilization > 0.85 && (
            <div style={{
              background: `${colors.error}22`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              <p style={{ ...typo.body, color: colors.error, margin: 0 }}>
                Notice how latency explodes as utilization exceeds 85%! This is the queueing theory principle at work.
              </p>
            </div>
          )}

          <button
            onClick={() => { playSound('success'); setIsSimulating(false); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Physics
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The M/M/1 Queue: Why Latency Explodes
          </h2>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ ...typo.body, color: colors.textSecondary }}>
              <p style={{ marginBottom: '16px' }}>
                <strong style={{ color: colors.textPrimary }}>The Fundamental Formula:</strong>
              </p>
              <div style={{
                background: colors.bgSecondary,
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '24px', color: colors.accent, fontFamily: 'monospace' }}>
                  Wait Time = 1 / (1 - Utilization)
                </span>
              </div>
              <p style={{ marginBottom: '16px' }}>
                At <span style={{ color: colors.success }}>50% utilization</span>: Wait = 1/(1-0.5) = <strong>2 units</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                At <span style={{ color: colors.warning }}>80% utilization</span>: Wait = 1/(1-0.8) = <strong>5 units</strong>
              </p>
              <p style={{ marginBottom: '16px' }}>
                At <span style={{ color: colors.error }}>95% utilization</span>: Wait = 1/(1-0.95) = <strong>20 units</strong>
              </p>
              <p>
                At <span style={{ color: '#FF0000' }}>99% utilization</span>: Wait = 1/(1-0.99) = <strong>100 units!</strong>
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
              Key Insight: The Non-Linear Surprise
            </h3>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong>Traffic is bursty.</strong> Random arrivals create momentary overloads even when average load is below capacity.
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, marginBottom: '8px' }}>
              <strong>Queues amplify variability.</strong> When the queue is non-empty, every new arrival adds to everyone's wait time.
            </p>
            <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
              <strong>Near-saturation is unstable.</strong> Small fluctuations cause wild swings in latency, creating the "latency explosion."
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Explore Packet Size Effects
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PREDICT PHASE
  if (phase === 'twist_predict') {
    const options = [
      { id: 'a', text: 'Large packets have lower latency because fewer packets need processing' },
      { id: 'b', text: 'Small packets have more consistent latency (lower jitter) but may have higher overhead', correct: true },
      { id: 'c', text: 'Packet size has no effect on latency, only on bandwidth usage' },
    ];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <div style={{
            background: `${colors.warning}22`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${colors.warning}44`,
          }}>
            <p style={{ ...typo.small, color: colors.warning, margin: 0 }}>
              New Variable: Packet Size
            </p>
          </div>

          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px' }}>
            An online game sends many small 100-byte packets. A file download sends fewer large 1500-byte packets. Same total data rate. How does packet size affect latency and jitter?
          </h2>

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

          {twistPrediction && (
            <button
              onClick={() => { playSound('success'); resetSimulation(); nextPhase(); }}
              style={primaryButtonStyle}
            >
              Compare Packet Sizes
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST PLAY PHASE
  if (phase === 'twist_play') {
    const avgJitter = jitterHistory.length > 0 ? jitterHistory.reduce((a, b) => a + b, 0) / jitterHistory.length : 0;

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
            Packet Size Comparison Lab
          </h2>
          <p style={{ ...typo.body, color: colors.textSecondary, textAlign: 'center', marginBottom: '24px' }}>
            Compare latency and jitter between small and large packets
          </p>

          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <QueueVisualization />
            </div>

            {/* Packet size toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '24px',
            }}>
              <button
                onClick={() => { setPacketSize('small'); resetSimulation(); }}
                style={{
                  background: packetSize === 'small' ? colors.accent : colors.bgSecondary,
                  color: packetSize === 'small' ? 'white' : colors.textSecondary,
                  border: `2px solid ${packetSize === 'small' ? colors.accent : colors.border}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Small Packets (100 bytes)
              </button>
              <button
                onClick={() => { setPacketSize('large'); resetSimulation(); }}
                style={{
                  background: packetSize === 'large' ? colors.warning : colors.bgSecondary,
                  color: packetSize === 'large' ? 'white' : colors.textSecondary,
                  border: `2px solid ${packetSize === 'large' ? colors.warning : colors.border}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Large Packets (1500 bytes)
              </button>
            </div>

            {/* Traffic rate */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ ...typo.small, color: colors.textSecondary }}>Traffic Load</span>
                <span style={{ ...typo.small, color: colors.packet, fontWeight: 600 }}>{arrivalRate}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                value={arrivalRate}
                onChange={(e) => setArrivalRate(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Simulation controls */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => {
                  setIsSimulating(!isSimulating);
                  playSound('click');
                }}
                style={{
                  background: isSimulating ? colors.error : colors.success,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {isSimulating ? 'Stop' : 'Start'} Simulation
              </button>
              <button
                onClick={() => {
                  resetSimulation();
                  playSound('click');
                }}
                style={{
                  background: colors.bgSecondary,
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reset
              </button>
            </div>

            {/* Jitter-focused stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.warning }}>{avgLatency.toFixed(1)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Avg Latency</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: `2px solid ${packetSize === 'large' ? colors.error : colors.success}`,
              }}>
                <div style={{ ...typo.h3, color: packetSize === 'large' ? colors.error : colors.success }}>
                  {avgJitter.toFixed(2)}
                </div>
                <div style={{ ...typo.small, color: colors.textMuted }}>Jitter (variation)</div>
              </div>
              <div style={{
                background: colors.bgSecondary,
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div style={{ ...typo.h3, color: colors.error }}>{p99Latency.toFixed(1)}</div>
                <div style={{ ...typo.small, color: colors.textMuted }}>p99 Latency</div>
              </div>
            </div>
          </div>

          {/* Insight about packet size */}
          <div style={{
            background: `${packetSize === 'large' ? colors.warning : colors.success}22`,
            border: `1px solid ${packetSize === 'large' ? colors.warning : colors.success}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <p style={{ ...typo.body, color: packetSize === 'large' ? colors.warning : colors.success, margin: 0 }}>
              {packetSize === 'large'
                ? 'Large packets block the queue longer, causing more variable (jittery) latency for following packets.'
                : 'Small packets interleave smoothly, giving more consistent timing crucial for real-time applications.'}
            </p>
          </div>

          <button
            onClick={() => { playSound('success'); setIsSimulating(false); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            Understand the Tradeoffs
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            The Complete Picture: Latency, Jitter & Tail Latency
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>📊</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Tail Latency (p99, p999)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Average latency hides the worst-case experience. <span style={{ color: colors.error }}>p99 latency</span> (99th percentile) is often 5-20x the average. For user-facing services, tail latency determines perceived quality. One slow request can ruin the entire page load.
              </p>
            </div>

            <div style={{
              background: colors.bgCard,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🔄</span>
                <h3 style={{ ...typo.h3, color: colors.textPrimary, margin: 0 }}>Jitter: The Hidden Enemy</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                For real-time applications (voice, video, gaming), <span style={{ color: colors.warning }}>consistent</span> latency matters more than low average latency. Jitter (variation in latency) causes stuttering, desync, and buffering. Small packets reduce jitter by preventing large blocking times.
              </p>
            </div>

            <div style={{
              background: `${colors.success}11`,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.success}33`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
                <h3 style={{ ...typo.h3, color: colors.success, margin: 0 }}>Active Queue Management (AQM)</h3>
              </div>
              <p style={{ ...typo.body, color: colors.textSecondary, margin: 0 }}>
                Modern routers use algorithms like <strong>CoDel</strong> and <strong>FQ-CoDel</strong> to keep queues short. Instead of letting queues fill and then dropping, they proactively manage queue depth to maintain low latency while still absorbing traffic bursts.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound('success'); nextPhase(); }}
            style={{ ...primaryButtonStyle, width: '100%' }}
          >
            See Real-World Applications
          </button>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TRANSFER PHASE
  if (phase === 'transfer') {
    const app = realWorldApps[selectedApp];
    const allAppsCompleted = completedApps.every(c => c);

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '800px', margin: '60px auto 0' }}>
          <h2 style={{ ...typo.h2, color: colors.textPrimary, marginBottom: '24px', textAlign: 'center' }}>
            Real-World Applications
          </h2>

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
                How Queueing Theory Connects:
              </h4>
              <p style={{ ...typo.small, color: colors.textSecondary, margin: 0 }}>
                {app.connection}
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
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
          </div>

          {allAppsCompleted && (
            <button
              onClick={() => { playSound('success'); nextPhase(); }}
              style={{ ...primaryButtonStyle, width: '100%' }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {renderNavDots()}
      </div>
    );
  }

  // TEST PHASE
  if (phase === 'test') {
    if (testSubmitted) {
      const passed = testScore >= 7;
      return (
        <div style={{
          minHeight: '100vh',
          background: colors.bgPrimary,
          padding: '24px',
        }}>
          {renderProgressBar()}

          <div style={{ maxWidth: '600px', margin: '60px auto 0', textAlign: 'center' }}>
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
                ? 'You understand network congestion physics!'
                : 'Review the concepts and try again.'}
            </p>

            {passed ? (
              <button
                onClick={() => { playSound('complete'); nextPhase(); }}
                style={primaryButtonStyle}
              >
                Complete Lesson
              </button>
            ) : (
              <button
                onClick={() => {
                  setTestSubmitted(false);
                  setTestAnswers(Array(10).fill(null));
                  setCurrentQuestion(0);
                  setTestScore(0);
                  goToPhase('hook');
                }}
                style={primaryButtonStyle}
              >
                Review & Try Again
              </button>
            )}
          </div>
          {renderNavDots()}
        </div>
      );
    }

    const question = testQuestions[currentQuestion];

    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bgPrimary,
        padding: '24px',
      }}>
        {renderProgressBar()}

        <div style={{ maxWidth: '700px', margin: '60px auto 0' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <span style={{ ...typo.small, color: colors.textSecondary }}>
              Question {currentQuestion + 1} of 10
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
                }}
              >
                Previous
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
                }}
              >
                Next
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
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${colors.bgPrimary} 0%, ${colors.bgSecondary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}>
        {renderProgressBar()}

        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 1s infinite',
        }}>
          🏆
        </div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>

        <h1 style={{ ...typo.h1, color: colors.success, marginBottom: '16px' }}>
          Network Congestion Master!
        </h1>

        <p style={{ ...typo.body, color: colors.textSecondary, maxWidth: '500px', marginBottom: '32px' }}>
          You now understand why bandwidth alone does not determine latency, and how queueing theory governs network performance.
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
              'Latency explodes as utilization approaches 100%',
              'The M/M/1 queue formula: 1/(1-utilization)',
              'Why p99 latency matters more than average',
              'How packet size affects jitter',
              'Active Queue Management (AQM) techniques',
              'Real-world applications in gaming, trading, and cloud',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: colors.success }}>✓</span>
                <span style={{ ...typo.small, color: colors.textSecondary }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => goToPhase('hook')}
            style={{
              padding: '14px 28px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.textSecondary,
              cursor: 'pointer',
            }}
          >
            Play Again
          </button>
          <a
            href="/"
            style={{
              ...primaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Return to Dashboard
          </a>
        </div>

        {renderNavDots()}
      </div>
    );
  }

  return null;
};

export default NetworkCongestionRenderer;
