import React, { useState, useEffect, useCallback } from 'react';

interface DirectionFindingRendererProps {
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
  soundWave: '#3b82f6',
  shadow: '#ef4444',
  ear: '#22c55e',
};

const DirectionFindingRenderer: React.FC<DirectionFindingRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
  // Responsive detection
  const [isMobile, setIsMobile] = useState(false);
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

  // Simulation state
  const [frequency, setFrequency] = useState(2000); // Hz
  const [sourceAngle, setSourceAngle] = useState(45); // degrees from front
  const [headSize, setHeadSize] = useState(17); // cm (average head diameter)
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const [earCovered, setEarCovered] = useState<'none' | 'left' | 'right'>('none');

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Physics constants
  const SPEED_OF_SOUND = 343; // m/s at 20C
  const headDiameterM = headSize / 100; // Convert cm to m

  // Calculate wavelength
  const wavelength = SPEED_OF_SOUND / frequency;
  const wavelengthCm = wavelength * 100;

  // Calculate ITD (Interaural Time Difference)
  // ITD max ~ (head diameter / speed of sound) * sin(angle)
  const angleRad = (sourceAngle * Math.PI) / 180;
  const itdMs = ((headDiameterM / SPEED_OF_SOUND) * Math.sin(angleRad)) * 1000;

  // Calculate ILD (Interaural Level Difference)
  // ILD is frequency dependent - stronger at high frequencies
  // Simplified model: ILD increases with frequency and angle
  const headShadowFactor = Math.min(headDiameterM / wavelength, 3); // How many wavelengths fit in head
  const ildDb = headShadowFactor * Math.sin(angleRad) * 8; // Simplified approximation

  // Animation
  useEffect(() => {
    if (!isAnimating) return;
    const interval = setInterval(() => {
      setAnimationTime(prev => prev + 0.05);
    }, 50);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const predictions = [
    { id: 'same', label: 'Bass and treble are equally easy to locate' },
    { id: 'bass_easier', label: 'Bass is easier to locate because it penetrates better' },
    { id: 'treble_easier', label: 'Treble is easier to locate because of stronger head shadow' },
    { id: 'neither', label: 'Neither can be located accurately by ears alone' },
  ];

  const twistPredictions = [
    { id: 'same', label: 'Localization stays the same - one ear is enough' },
    { id: 'worse_horizontal', label: 'Worse for sounds on the covered side only' },
    { id: 'worse_all', label: 'Dramatically worse for all directions' },
    { id: 'better', label: 'Actually improves because less confusion' },
  ];

  const transferApplications = [
    {
      title: 'Surround Sound Systems',
      description: 'Home theater and gaming systems use multiple speakers to create spatial audio. They exploit ITD and ILD cues to place sounds around you.',
      question: 'Why do surround systems often use a single subwoofer rather than multiple bass speakers?',
      answer: 'Bass frequencies have long wavelengths that create weak head shadow and ITD cues. Our brains cannot localize bass well anyway, so one subwoofer placed anywhere sounds the same. Higher frequencies need proper speaker placement for localization.',
    },
    {
      title: 'Hearing Aids',
      description: 'Modern hearing aids use binaural processing - both aids communicate to preserve spatial cues. Early aids often only amplified one ear.',
      question: 'Why do audiologists strongly recommend hearing aids in both ears when needed?',
      answer: 'Single-ear amplification destroys the ITD and ILD differences that enable localization. Binaural hearing aids preserve or even enhance these cues, maintaining spatial awareness crucial for safety (traffic, voices) and speech comprehension in noise.',
    },
    {
      title: 'Animal Hunting and Predation',
      description: 'Owls can catch mice in complete darkness using sound alone. Their ears are asymmetrically placed on their skulls.',
      question: 'Why are owl ears at different heights on their head?',
      answer: 'Asymmetric ears create vertical ITD and ILD differences, not just horizontal. This gives owls 3D sound localization - they can determine both direction AND elevation of prey sounds with remarkable precision, even in total darkness.',
    },
    {
      title: 'Radar and Sonar Systems',
      description: 'Military systems use multiple receivers to locate targets. The same physics of time and intensity differences applies to electromagnetic and sound waves.',
      question: 'How do submarines locate other vessels using passive sonar?',
      answer: 'Submarines use hydrophone arrays (multiple underwater microphones) to measure time delays and intensity differences of incoming sounds. Like ears spaced apart, the array creates ITD/ILD-like cues that triangulate target position without revealing the submarine\'s location.',
    },
  ];

  const testQuestions = [
    {
      question: 'What creates the "head shadow" effect?',
      options: [
        { text: 'The head blocks high-frequency sounds better than low-frequency sounds', correct: true },
        { text: 'The head creates an echo that confuses localization', correct: false },
        { text: 'The head amplifies sounds on one side', correct: false },
        { text: 'The head changes the pitch of sounds', correct: false },
      ],
    },
    {
      question: 'ITD (Interaural Time Difference) is most useful for locating:',
      options: [
        { text: 'Only high-frequency sounds', correct: false },
        { text: 'Only low-frequency sounds', correct: false },
        { text: 'Sounds of any frequency', correct: true },
        { text: 'Only sounds directly in front', correct: false },
      ],
    },
    {
      question: 'ILD (Interaural Level Difference) is most effective at:',
      options: [
        { text: 'Low frequencies (bass)', correct: false },
        { text: 'High frequencies (treble)', correct: true },
        { text: 'All frequencies equally', correct: false },
        { text: 'Only ultrasonic frequencies', correct: false },
      ],
    },
    {
      question: 'Why is locating bass frequencies difficult?',
      options: [
        { text: 'Bass is too quiet to hear clearly', correct: false },
        { text: 'Bass wavelengths are larger than the head, creating weak shadow', correct: true },
        { text: 'Bass damages hearing localization', correct: false },
        { text: 'Bass travels slower than treble', correct: false },
      ],
    },
    {
      question: 'The maximum ITD for a human head is approximately:',
      options: [
        { text: '0.006 seconds (6 ms)', correct: false },
        { text: '0.0006 seconds (0.6 ms)', correct: true },
        { text: '0.06 seconds (60 ms)', correct: false },
        { text: '0.6 seconds (600 ms)', correct: false },
      ],
    },
    {
      question: 'Covering one ear dramatically worsens localization because:',
      options: [
        { text: 'Half the sound information is lost', correct: false },
        { text: 'Both ITD and ILD comparisons become impossible', correct: true },
        { text: 'The brain gets confused by asymmetric input', correct: false },
        { text: 'Sound cannot reach the covered ear at all', correct: false },
      ],
    },
    {
      question: 'A sound directly in front creates:',
      options: [
        { text: 'Maximum ITD and ILD', correct: false },
        { text: 'Zero ITD and zero ILD', correct: true },
        { text: 'Maximum ITD, zero ILD', correct: false },
        { text: 'Zero ITD, maximum ILD', correct: false },
      ],
    },
    {
      question: 'Why do surround sound systems typically use a single subwoofer?',
      options: [
        { text: 'Bass is expensive to produce', correct: false },
        { text: 'Bass cannot be localized well anyway', correct: true },
        { text: 'Multiple subwoofers would be too loud', correct: false },
        { text: 'Bass needs to be in the center for balance', correct: false },
      ],
    },
    {
      question: 'An owl\'s asymmetric ear placement provides:',
      options: [
        { text: 'Better hearing sensitivity', correct: false },
        { text: 'Vertical as well as horizontal localization', correct: true },
        { text: 'Protection from loud sounds', correct: false },
        { text: 'Improved echo cancellation', correct: false },
      ],
    },
    {
      question: 'For a 3000 Hz sound at 90 degrees to the side, the head shadow creates:',
      options: [
        { text: 'Only a time difference, no level difference', correct: false },
        { text: 'Both significant time and level differences', correct: true },
        { text: 'Only a level difference, no time difference', correct: false },
        { text: 'Neither time nor level differences', correct: false },
      ],
    },
  ];

  const handleTestAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...testAnswers];
    newAnswers[questionIndex] = optionIndex;
    setTestAnswers(newAnswers);
  };

  const submitTest = () => {
    let score = 0;
    testQuestions.forEach((q, i) => {
      if (testAnswers[i] !== null && q.options[testAnswers[i]!].correct) {
        score++;
      }
    });
    setTestScore(score);
    setTestSubmitted(true);
    if (score >= 8 && onCorrectAnswer) onCorrectAnswer();
  };

  const realWorldApps = [
    {
      icon: '📡',
      title: 'Radio Direction Finding',
      short: 'Navigation & Aviation',
      tagline: 'Finding signals in the electromagnetic wilderness',
      description: 'Radio Direction Finding (RDF) uses antenna arrays to determine the bearing of radio transmitters. By measuring phase differences and signal strength across multiple receivers - analogous to ITD and ILD in hearing - navigators can locate beacons, emergency signals, and communication sources with remarkable precision.',
      connection: 'Just as your ears compare arrival times and intensities to locate sounds, RDF systems compare signals across antenna elements. The same wave physics applies - longer wavelengths require larger antenna spacing for accurate direction finding, just as bass frequencies challenge our smaller-spaced ears.',
      howItWorks: 'Multiple antennas receive the same radio signal with slight time delays based on their positions relative to the source. A processor calculates the phase difference between antenna pairs, translating these into bearing angles. Modern systems use phased arrays with dozens of elements for sub-degree accuracy.',
      stats: [
        { value: '< 1°', label: 'Modern RDF Accuracy' },
        { value: '1906', label: 'Year RDF Invented' },
        { value: '500+ km', label: 'Long-range Detection' }
      ],
      examples: [
        'Aircraft VOR/DME navigation using ground-based radio beacons',
        'Maritime distress signal location for search and rescue',
        'Amateur radio "fox hunting" competitions for skill building',
        'Tracking wildlife with radio collar transmitters'
      ],
      companies: ['Rohde & Schwarz', 'Thales Group', 'L3Harris', 'Collins Aerospace', 'NARDA'],
      futureImpact: 'As autonomous vehicles and drones proliferate, RDF technology is evolving to enable precise localization without GPS dependency. Software-defined radio is making direction finding more accessible, while AI integration promises real-time tracking of multiple simultaneous signal sources.',
      color: '#3b82f6'
    },
    {
      icon: '🦁',
      title: 'Wildlife Tracking',
      short: 'Conservation Biology',
      tagline: 'Following nature\'s wanderers across continents',
      description: 'Wildlife biologists use radio telemetry and acoustic monitoring to track animal movements, study behavior patterns, and protect endangered species. Direction finding techniques allow researchers to locate tagged animals without disturbing them, collecting crucial data for conservation efforts.',
      connection: 'The direction finding principles mirror binaural hearing - researchers use directional antennas that act like ears, detecting signal strength differences (ILD equivalent) and sometimes phase differences (ITD equivalent) to triangulate animal positions. Animals themselves use similar acoustic localization to hunt and evade predators.',
      howItWorks: 'Animals wear small radio transmitters (VHF or satellite-based) that emit periodic signals. Researchers use handheld Yagi antennas or automated receiving stations to detect signals. By taking bearings from multiple locations, they triangulate the animal\'s position. Acoustic arrays can similarly locate animals by their vocalizations.',
      stats: [
        { value: '10,000+', label: 'Species Tracked via Radio' },
        { value: '5 grams', label: 'Smallest VHF Transmitter' },
        { value: '98%', label: 'Location Success Rate' }
      ],
      examples: [
        'Tracking elephant migration corridors across African savannas',
        'Monitoring endangered sea turtle nesting and ocean travels',
        'Locating wolf packs to study pack dynamics and territory',
        'Following bird migration routes spanning thousands of miles'
      ],
      companies: ['Lotek Wireless', 'Vectronic Aerospace', 'Advanced Telemetry Systems', 'Wildlife Computers'],
      futureImpact: 'Miniaturization and solar power are enabling lifetime tracking of smaller species. Satellite constellations like ICARUS provide global coverage, while AI analyzes movement patterns to predict poaching threats and climate adaptation. Passive acoustic monitoring is revolutionizing marine mammal research.',
      color: '#22c55e'
    },
    {
      icon: '🚁',
      title: 'Search and Rescue Operations',
      short: 'Emergency Response',
      tagline: 'When every minute counts in finding the lost',
      description: 'Search and Rescue (SAR) teams use radio direction finding to locate emergency beacons from downed aircraft, distressed vessels, lost hikers, and avalanche victims. The same principles that let us locate sounds enable rescuers to find people in life-threatening situations.',
      connection: 'SAR direction finding directly applies ITD/ILD concepts - emergency locator transmitters (ELTs) and personal locator beacons (PLBs) emit signals that rescuers locate by comparing reception across antenna elements. Just as covering one ear destroys localization, losing antenna diversity cripples rescue efforts.',
      howItWorks: 'Emergency beacons transmit on designated frequencies (406 MHz internationally). Satellites detect activations and provide initial position estimates. Ground teams then use portable direction finders with rotating loop antennas to home in on the signal, switching between antenna configurations to determine bearing like switching between ears.',
      stats: [
        { value: '48,000+', label: 'Lives Saved by COSPAS-SARSAT' },
        { value: '< 5 min', label: 'Initial Alert Time' },
        { value: '100 meters', label: 'Final Localization Accuracy' }
      ],
      examples: [
        'Locating aircraft emergency locator transmitters after crashes',
        'Finding avalanche victims using RECCO reflectors and transceivers',
        'Tracking distress signals from boats in maritime emergencies',
        'Locating hikers with personal locator beacons in wilderness'
      ],
      companies: ['ACR Electronics', 'McMurdo Group', 'RECCO AB', 'Garmin', 'Ocean Signal'],
      futureImpact: 'Next-generation beacons include return link capability to confirm rescue is underway. Drone-mounted direction finders can search vast areas quickly. Integration with smartphone emergency features extends protection to everyday adventures. AI-enhanced signal processing improves detection in challenging terrain.',
      color: '#ef4444'
    },
    {
      icon: '🎯',
      title: 'Electronic Warfare',
      short: 'Defense Technology',
      tagline: 'The invisible battlefield of signals and silence',
      description: 'Electronic Warfare (EW) encompasses detecting, locating, and countering hostile electromagnetic emissions. Military forces use sophisticated direction finding to identify enemy radar, communications, and jamming sources - turning the physics of wave propagation into tactical advantage.',
      connection: 'EW systems are essentially superhuman "ears" for radio waves. They measure microsecond time differences across antenna arrays (like ITD) and signal strength variations (like ILD) to pinpoint emitters. The challenge of localizing low-frequency signals mirrors why bass is hard to locate - physics imposes fundamental limits.',
      howItWorks: 'EW platforms carry antenna arrays spanning the electromagnetic spectrum. When hostile emissions are detected, digital receivers measure arrival time differences across the array with nanosecond precision. Sophisticated algorithms separate multiple simultaneous signals and calculate emitter locations, often from a single moving platform using time-difference-of-arrival techniques.',
      stats: [
        { value: '0.1°', label: 'Direction Finding Accuracy' },
        { value: '< 1 sec', label: 'Threat Detection Time' },
        { value: '18+ GHz', label: 'Frequency Coverage' }
      ],
      examples: [
        'Locating enemy air defense radar for suppression missions',
        'Detecting and geolocating adversary communications networks',
        'Identifying jamming sources to restore friendly communications',
        'Providing early warning of incoming radar-guided missiles'
      ],
      companies: ['Northrop Grumman', 'Raytheon', 'BAE Systems', 'Leonardo DRS', 'Elbit Systems'],
      futureImpact: 'Cognitive EW systems use AI to adapt in real-time to novel threats. Distributed sensing networks share data to achieve unprecedented localization accuracy. Quantum sensing promises detection capabilities approaching fundamental physical limits. The electromagnetic spectrum is becoming an increasingly contested domain.',
      color: '#8b5cf6'
    }
  ];

  const renderVisualization = (interactive: boolean) => {
    const width = 400;
    const height = 380;
    const centerX = width / 2;
    const centerY = height / 2;
    const headRadius = 50;
    const earOffset = 8;

    // Sound source position
    const sourceDistance = 140;
    const sourceX = centerX + sourceDistance * Math.sin(angleRad);
    const sourceY = centerY - sourceDistance * Math.cos(angleRad);

    // Calculate shadow region (cone behind head opposite to source)
    const shadowAngle = Math.PI / 3; // 60 degree shadow cone
    const shadowStartAngle = angleRad + Math.PI - shadowAngle / 2;
    const shadowEndAngle = angleRad + Math.PI + shadowAngle / 2;

    // Generate wave fronts with gradient
    const generateWaveFronts = () => {
      const waveFronts = [];
      const numWaves = 6;
      const waveSpacing = wavelengthCm * 2; // Scale for visualization

      for (let i = 0; i < numWaves; i++) {
        const baseRadius = (animationTime * 50 + i * waveSpacing) % (sourceDistance + 50);
        if (baseRadius > 10) {
          waveFronts.push(
            <circle
              key={`wave${i}`}
              cx={sourceX}
              cy={sourceY}
              r={baseRadius}
              fill="none"
              stroke="url(#dfWaveGradient)"
              strokeWidth={2.5}
              opacity={Math.max(0, 1 - baseRadius / (sourceDistance + 50))}
              filter="url(#dfWaveGlow)"
            />
          );
        }
      }
      return waveFronts;
    };

    // Intensity indicator calculation
    const leftEarX = centerX - headRadius - earOffset;
    const rightEarX = centerX + headRadius + earOffset;

    // Determine which ear is closer to source
    const leftEarDistance = Math.sqrt((leftEarX - sourceX) ** 2 + (centerY - sourceY) ** 2);
    const rightEarDistance = Math.sqrt((rightEarX - sourceX) ** 2 + (centerY - sourceY) ** 2);

    const nearEar = leftEarDistance < rightEarDistance ? 'left' : 'right';
    const leftIntensity = nearEar === 'left' ? 1 : Math.max(0.2, 1 - ildDb / 20);
    const rightIntensity = nearEar === 'right' ? 1 : Math.max(0.2, 1 - ildDb / 20);

    // Adjust for covered ear
    const effectiveLeftIntensity = earCovered === 'left' ? 0.1 : leftIntensity;
    const effectiveRightIntensity = earCovered === 'right' ? 0.1 : rightIntensity;

    // Signal strength for meter (0-100)
    const signalStrength = Math.round(100 * (1 - Math.abs(sourceAngle - 45) / 90));

    // Direction indicator angle (pointing toward source)
    const directionAngle = -sourceAngle + 90;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', borderRadius: '12px', maxWidth: '500px' }}
        >
          {/* Premium SVG Definitions */}
          <defs>
            {/* Antenna metallic gradient */}
            <linearGradient id="dfAntennaMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="25%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Head skin gradient */}
            <radialGradient id="dfHeadGradient" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="40%" stopColor="#57534e" />
              <stop offset="70%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#292524" />
            </radialGradient>

            {/* Ear gradient - healthy */}
            <radialGradient id="dfEarHealthy" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </radialGradient>

            {/* Ear gradient - covered/muted */}
            <radialGradient id="dfEarCovered" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="40%" stopColor="#64748b" />
              <stop offset="70%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>

            {/* Sound wave gradient */}
            <linearGradient id="dfWaveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="30%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#93c5fd" stopOpacity="1" />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>

            {/* Sound source gradient */}
            <radialGradient id="dfSoundSource" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="30%" stopColor="#60a5fa" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* Shadow region gradient */}
            <radialGradient id="dfShadowGradient" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
            </radialGradient>

            {/* Direction indicator gradient */}
            <linearGradient id="dfDirectionArrow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#a78bfa" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#c4b5fd" stopOpacity="1" />
              <stop offset="60%" stopColor="#a78bfa" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
            </linearGradient>

            {/* Signal strength meter gradient */}
            <linearGradient id="dfMeterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="40%" stopColor="#84cc16" />
              <stop offset="70%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            {/* Info panel gradient */}
            <linearGradient id="dfPanelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020617" stopOpacity="1" />
            </linearGradient>

            {/* Nose gradient */}
            <radialGradient id="dfNoseGradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#78716c" />
              <stop offset="60%" stopColor="#57534e" />
              <stop offset="100%" stopColor="#44403c" />
            </radialGradient>

            {/* Wave glow filter */}
            <filter id="dfWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Source glow filter */}
            <filter id="dfSourceGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Ear glow filter */}
            <filter id="dfEarGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Direction glow filter */}
            <filter id="dfDirectionGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Text shadow filter */}
            <filter id="dfTextShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.5" />
            </filter>

            {/* Inner glow for head */}
            <filter id="dfInnerGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Shadow region with gradient */}
          <path
            d={`M ${centerX} ${centerY}
                L ${centerX + 200 * Math.cos(shadowStartAngle)} ${centerY + 200 * Math.sin(shadowStartAngle)}
                A 200 200 0 0 1 ${centerX + 200 * Math.cos(shadowEndAngle)} ${centerY + 200 * Math.sin(shadowEndAngle)}
                Z`}
            fill="url(#dfShadowGradient)"
            opacity={0.5 + headShadowFactor * 0.15}
          />

          {/* RF Signal visualization - antenna array representation */}
          <g transform={`translate(${width - 35}, 90)`}>
            {/* Antenna base */}
            <rect x="-8" y="0" width="16" height="60" rx="3" fill="url(#dfAntennaMetallic)" />
            {/* Antenna elements */}
            <rect x="-15" y="5" width="30" height="4" rx="2" fill="url(#dfAntennaMetallic)" />
            <rect x="-12" y="20" width="24" height="4" rx="2" fill="url(#dfAntennaMetallic)" />
            <rect x="-9" y="35" width="18" height="4" rx="2" fill="url(#dfAntennaMetallic)" />
            {/* Antenna tip */}
            <circle cx="0" cy="-5" r="4" fill="url(#dfSoundSource)" filter="url(#dfSourceGlow)" />
          </g>

          {/* Signal strength meter */}
          <g transform={`translate(${width - 35}, 170)`}>
            {/* Meter background */}
            <rect x="-10" y="0" width="20" height="80" rx="4" fill="url(#dfPanelGradient)" stroke="#334155" strokeWidth="1" />
            {/* Meter fill */}
            <rect
              x="-6"
              y={80 - (signalStrength * 0.72)}
              width="12"
              height={signalStrength * 0.72}
              rx="2"
              fill="url(#dfMeterGradient)"
              opacity="0.9"
            />
            {/* Meter ticks */}
            {[0, 20, 40, 60, 80].map((tick, i) => (
              <line key={i} x1="-10" y1={80 - tick * 0.9} x2="-6" y2={80 - tick * 0.9} stroke="#64748b" strokeWidth="1" />
            ))}
          </g>

          {/* Sound waves with gradient and glow */}
          {isAnimating && generateWaveFronts()}

          {/* Direction indicator line with gradient */}
          <line
            x1={centerX}
            y1={centerY}
            x2={sourceX}
            y2={sourceY}
            stroke="url(#dfDirectionArrow)"
            strokeWidth={2}
            strokeDasharray="6,4"
            filter="url(#dfDirectionGlow)"
          />

          {/* Direction indicator arrow head */}
          <polygon
            points={`${sourceX},${sourceY} ${sourceX - 8},${sourceY + 12} ${sourceX + 8},${sourceY + 12}`}
            fill="url(#dfDirectionArrow)"
            transform={`rotate(${-sourceAngle}, ${sourceX}, ${sourceY})`}
            filter="url(#dfDirectionGlow)"
          />

          {/* Head (top view) with premium gradient */}
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={headRadius}
            ry={headRadius * 0.85}
            fill="url(#dfHeadGradient)"
            stroke="#78716c"
            strokeWidth={2}
            filter="url(#dfInnerGlow)"
          />

          {/* Nose indicator (shows front) with gradient */}
          <ellipse
            cx={centerX}
            cy={centerY - headRadius * 0.85 - 8}
            rx={8}
            ry={6}
            fill="url(#dfNoseGradient)"
            stroke="#78716c"
            strokeWidth={1.5}
          />

          {/* Left ear with gradient and glow */}
          <ellipse
            cx={leftEarX}
            cy={centerY}
            rx={8}
            ry={14}
            fill={earCovered === 'left' ? 'url(#dfEarCovered)' : 'url(#dfEarHealthy)'}
            stroke={earCovered === 'left' ? '#64748b' : '#22c55e'}
            strokeWidth={2}
            opacity={effectiveLeftIntensity}
            filter={earCovered === 'left' ? '' : 'url(#dfEarGlow)'}
          />
          {earCovered === 'left' && (
            <g>
              <line x1={leftEarX - 5} y1={centerY - 5} x2={leftEarX + 5} y2={centerY + 5} stroke="#ef4444" strokeWidth="2" />
              <line x1={leftEarX - 5} y1={centerY + 5} x2={leftEarX + 5} y2={centerY - 5} stroke="#ef4444" strokeWidth="2" />
            </g>
          )}

          {/* Right ear with gradient and glow */}
          <ellipse
            cx={rightEarX}
            cy={centerY}
            rx={8}
            ry={14}
            fill={earCovered === 'right' ? 'url(#dfEarCovered)' : 'url(#dfEarHealthy)'}
            stroke={earCovered === 'right' ? '#64748b' : '#22c55e'}
            strokeWidth={2}
            opacity={effectiveRightIntensity}
            filter={earCovered === 'right' ? '' : 'url(#dfEarGlow)'}
          />
          {earCovered === 'right' && (
            <g>
              <line x1={rightEarX - 5} y1={centerY - 5} x2={rightEarX + 5} y2={centerY + 5} stroke="#ef4444" strokeWidth="2" />
              <line x1={rightEarX - 5} y1={centerY + 5} x2={rightEarX + 5} y2={centerY - 5} stroke="#ef4444" strokeWidth="2" />
            </g>
          )}

          {/* Sound source with premium gradient and glow */}
          <circle
            cx={sourceX}
            cy={sourceY}
            r={14}
            fill="url(#dfSoundSource)"
            stroke="#93c5fd"
            strokeWidth={2}
            filter="url(#dfSourceGlow)"
          />
          {/* Pulsing ring around source when animating */}
          {isAnimating && (
            <circle
              cx={sourceX}
              cy={sourceY}
              r={18 + Math.sin(animationTime * 4) * 3}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={1.5}
              opacity={0.6 + Math.sin(animationTime * 4) * 0.3}
            />
          )}

          {/* ITD/ILD display panel with gradient */}
          <rect x={width - 130} y={10} width={120} height={70} rx={8} fill="url(#dfPanelGradient)" stroke="#334155" strokeWidth="1" />

          {/* Legend panel with gradient */}
          <rect x={10} y={height - 55} width={105} height={42} rx={6} fill="url(#dfPanelGradient)" stroke="#334155" strokeWidth="1" />
          <circle cx={24} cy={height - 40} r={6} fill="url(#dfSoundSource)" filter="url(#dfSourceGlow)" />
          <rect x={19} y={height - 25} width={10} height={10} fill="url(#dfShadowGradient)" rx="2" />
        </svg>

        {/* Text labels outside SVG using typo system */}
        <div style={{
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0 8px',
          marginTop: '-70px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Left info panel */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            paddingTop: '12px'
          }}>
            <span style={{ color: colors.textPrimary, fontSize: typo.small, fontWeight: 600 }}>
              Frequency: {frequency} Hz
            </span>
            <span style={{ color: colors.textSecondary, fontSize: typo.label }}>
              Wavelength: {wavelengthCm.toFixed(1)} cm
            </span>
            <span style={{ color: colors.textMuted, fontSize: typo.label }}>
              Head: {headSize} cm
            </span>
          </div>

          {/* Right info panel */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            textAlign: 'right',
            paddingTop: '12px'
          }}>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>
              ITD: {itdMs.toFixed(3)} ms
            </span>
            <span style={{ color: colors.textSecondary, fontSize: typo.small }}>
              ILD: {ildDb.toFixed(1)} dB
            </span>
            <span style={{
              color: headShadowFactor > 1 ? colors.success : colors.warning,
              fontSize: typo.label,
              fontWeight: 600
            }}>
              Shadow: {headShadowFactor > 1 ? 'Strong' : 'Weak'}
            </span>
          </div>
        </div>

        {/* Bottom labels */}
        <div style={{
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '0 8px',
          marginTop: '-30px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 100%)' }} />
              <span style={{ color: colors.textMuted, fontSize: typo.label }}>Sound source</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(239, 68, 68, 0.3)' }} />
              <span style={{ color: colors.textMuted, fontSize: typo.label }}>Shadow region</span>
            </div>
          </div>

          {/* Angle indicator */}
          <span style={{ color: colors.textMuted, fontSize: typo.small }}>
            Source angle: {sourceAngle} degrees from front
          </span>
        </div>

        {/* Ear labels */}
        <div style={{
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          justifyContent: 'center',
          gap: '80px',
          marginTop: '8px'
        }}>
          <span style={{ color: colors.textMuted, fontSize: typo.label, fontWeight: 600 }}>L</span>
          <span style={{ color: colors.textMuted, fontSize: typo.label, fontWeight: 600 }}>R</span>
        </div>

        {interactive && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isAnimating
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
                boxShadow: isAnimating
                  ? '0 4px 15px rgba(239, 68, 68, 0.4)'
                  : '0 4px 15px rgba(16, 185, 129, 0.4)',
              }}
            >
              {isAnimating ? 'Stop Waves' : 'Show Waves'}
            </button>
            <button
              onClick={() => {
                setFrequency(2000);
                setSourceAngle(45);
                setHeadSize(17);
                setEarCovered('none');
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${colors.accent}`,
                background: 'transparent',
                color: colors.accent,
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: typo.body,
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Sound Frequency: {frequency} Hz ({frequency < 500 ? 'Bass' : frequency < 2000 ? 'Mid' : 'Treble'})
        </label>
        <input
          type="range"
          min="100"
          max="8000"
          step="100"
          value={frequency}
          onChange={(e) => setFrequency(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: typo.label }}>
          <span>100 Hz (Bass)</span>
          <span>8000 Hz (Treble)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Source Angle: {sourceAngle} degrees from front
        </label>
        <input
          type="range"
          min="0"
          max="90"
          step="5"
          value={sourceAngle}
          onChange={(e) => setSourceAngle(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: typo.label }}>
          <span>0 degrees (Front)</span>
          <span>90 degrees (Side)</span>
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: typo.body }}>
          Head Diameter: {headSize} cm
        </label>
        <input
          type="range"
          min="12"
          max="22"
          step="1"
          value={headSize}
          onChange={(e) => setHeadSize(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.2)',
        padding: '12px',
        borderRadius: '8px',
        borderLeft: `3px solid ${colors.accent}`,
      }}>
        <div style={{ color: colors.textPrimary, fontSize: typo.body, marginBottom: '4px' }}>
          Head Shadow Effect:
        </div>
        <div style={{ color: colors.textSecondary, fontSize: typo.small }}>
          Wavelength ({wavelengthCm.toFixed(1)} cm) vs Head ({headSize} cm)
        </div>
        <div style={{
          color: headShadowFactor > 1 ? colors.success : colors.warning,
          fontSize: typo.small,
          marginTop: '4px'
        }}>
          {headShadowFactor > 1
            ? `Strong shadow - head blocks ~${Math.round(headShadowFactor)} wavelengths`
            : `Weak shadow - wavelength larger than head, sound bends around`
          }
        </div>
      </div>
    </div>
  );

  const renderEarControls = () => (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <label style={{ color: colors.textSecondary, fontSize: typo.body }}>Cover an ear:</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['none', 'left', 'right'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setEarCovered(option)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: earCovered === option ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
              background: earCovered === option ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: colors.textPrimary,
              cursor: 'pointer',
              fontSize: typo.body,
            }}
          >
            {option === 'none' ? 'Both Open' : option === 'left' ? 'Cover Left' : 'Cover Right'}
          </button>
        ))}
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
          background: canProceed
            ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
            : 'rgba(255,255,255,0.1)',
          color: canProceed ? 'white' : colors.textMuted,
          fontWeight: 'bold',
          cursor: canProceed ? 'pointer' : 'not-allowed',
          fontSize: typo.bodyLarge,
          boxShadow: canProceed ? '0 4px 15px rgba(139, 92, 246, 0.4)' : 'none',
        }}
      >
        {buttonText}
      </button>
    </div>
  );

  // HOOK PHASE
  if (phase === 'hook') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
            <h1 style={{ color: colors.accent, fontSize: typo.title, marginBottom: '8px' }}>
              Why is locating bass harder than treble?
            </h1>
            <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge, marginBottom: '24px' }}>
              Your ears are acoustic detectors with built-in direction finding
            </p>
          </div>

          {renderVisualization(true)}

          <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
            <div style={{
              background: colors.bgCard,
              padding: typo.cardPadding,
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.bodyLarge, lineHeight: 1.6 }}>
                Close your eyes and a friend snaps their fingers - you can point right at them.
                But when the bass kicks in at a concert, the thumping seems to come from everywhere.
                Why the difference?
              </p>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, marginTop: '12px' }}>
                The answer involves your head casting an acoustic "shadow."
              </p>
            </div>

            <div style={{
              background: 'rgba(139, 92, 246, 0.2)',
              padding: typo.cardPadding,
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.accent}`,
            }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
                Click "Show Waves" and drag the frequency slider to see how wavelength affects the head shadow!
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: typo.cardPadding,
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>What You're Looking At:</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.5 }}>
              A top-down view of a head with two ears. A sound source emits waves at a certain frequency.
              The red shaded area shows the "shadow" region where the head blocks sound.
              ITD shows time delay between ears; ILD shows volume difference.
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.heading }}>
              When you compare localizing bass (100-500 Hz) vs treble (2000+ Hz), which is easier?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {predictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPrediction(p.id)}
                  style={{
                    padding: typo.cardPadding,
                    borderRadius: '8px',
                    border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: prediction === p.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: typo.body,
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>Explore Head Shadow Effect</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
              Adjust frequency and angle to see how localization cues change
            </p>
          </div>

          {renderVisualization(true)}
          {renderControls()}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: typo.cardPadding,
            borderRadius: '12px',
          }}>
            <h4 style={{ color: colors.accent, marginBottom: '8px', fontSize: typo.body }}>Try These Experiments:</h4>
            <ul style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
              <li>Set frequency to 100 Hz (bass) - notice weak shadow</li>
              <li>Set frequency to 4000 Hz (treble) - notice strong shadow</li>
              <li>Move source to 90 degrees - maximum ITD and ILD</li>
              <li>Move source to 0 degrees (front) - zero ITD and ILD!</li>
            </ul>
          </div>
        </div>
        {renderBottomBar(false, true, 'Continue to Review')}
      </div>
    );
  }

  // REVIEW PHASE
  if (phase === 'review') {
    const wasCorrect = prediction === 'treble_easier';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
              Treble is easier to locate because high frequencies create stronger head shadow effects.
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>The Physics of Sound Localization</h3>
            <div style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>ITD (Interaural Time Difference):</strong> Sound
                reaches your near ear before your far ear. Maximum ITD is about 0.6-0.7 ms (head diameter / speed of sound).
                Your brain detects differences as small as 10 microseconds!
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>ILD (Interaural Level Difference):</strong> Your
                head casts an acoustic shadow, making sounds quieter at your far ear. This works best when the
                wavelength is smaller than your head (high frequencies).
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Why bass is hard:</strong> Bass wavelengths
                (e.g., 3.4m at 100 Hz) are much larger than your head (~17 cm). The sound simply bends around
                your head, creating almost no shadow or level difference.
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.heading }}>The Twist</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
              What happens if you cover one ear gently?
            </p>
          </div>

          {renderVisualization(false)}

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: typo.cardPadding,
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '8px', fontSize: typo.heading }}>The Setup:</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.5 }}>
              Imagine covering one ear with your hand or an earplug. You can still hear sounds,
              just muffled on one side. How does this affect your ability to locate sounds?
            </p>
          </div>

          <div style={{ padding: '0 16px 16px 16px' }}>
            <h3 style={{ color: colors.textPrimary, marginBottom: '12px', fontSize: typo.heading }}>
              When you cover one ear, localization becomes:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {twistPredictions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTwistPrediction(p.id)}
                  style={{
                    padding: typo.cardPadding,
                    borderRadius: '8px',
                    border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                    background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: colors.textPrimary,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: typo.body,
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
            <h2 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.heading }}>Test One-Ear Localization</h2>
            <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
              Cover an ear and observe how ITD and ILD information is lost
            </p>
          </div>

          {renderVisualization(true)}
          {renderEarControls()}
          {renderControls()}

          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            margin: '16px',
            padding: typo.cardPadding,
            borderRadius: '12px',
            borderLeft: `3px solid ${colors.warning}`,
          }}>
            <h4 style={{ color: colors.warning, marginBottom: '8px', fontSize: typo.body }}>Key Observation:</h4>
            <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
              With one ear covered, you lose the ability to compare arrival times (ITD) and
              loudness levels (ILD) between ears. The brain needs BOTH ears to triangulate sound position!
            </p>
          </div>
        </div>
        {renderBottomBar(false, true, 'See the Explanation')}
      </div>
    );
  }

  // TWIST REVIEW PHASE
  if (phase === 'twist_review') {
    const wasCorrect = twistPrediction === 'worse_all';

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{
            background: wasCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
            borderLeft: `4px solid ${wasCorrect ? colors.success : colors.error}`,
          }}>
            <h3 style={{ color: wasCorrect ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
              {wasCorrect ? 'Correct!' : 'Not Quite!'}
            </h3>
            <p style={{ color: colors.textPrimary, fontSize: typo.body }}>
              Covering one ear dramatically worsens localization for ALL directions!
            </p>
          </div>

          <div style={{
            background: colors.bgCard,
            margin: '16px',
            padding: '20px',
            borderRadius: '12px',
          }}>
            <h3 style={{ color: colors.warning, marginBottom: '12px', fontSize: typo.heading }}>Why Both Ears Matter</h3>
            <div style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7 }}>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>Comparison is key:</strong> Sound localization
                works by COMPARING signals between ears. One ear alone cannot determine if a sound is
                louder because it's closer or just a loud source far away.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.textPrimary }}>ITD requires timing reference:</strong> You
                need two ears to measure "the sound arrived HERE before THERE." With one ear, there's no reference.
              </p>
              <p>
                <strong style={{ color: colors.textPrimary }}>Real-world impact:</strong> People with
                single-sided deafness often struggle with sound localization and hearing speech in noisy
                environments, even though they can hear sounds perfectly well.
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
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: typo.pagePadding }}>
            <h2 style={{ color: colors.textPrimary, marginBottom: '8px', textAlign: 'center', fontSize: typo.heading }}>
              Real-World Applications
            </h2>
            <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontSize: typo.body }}>
              ITD and ILD principles are used everywhere from home theaters to hunting owls
            </p>
            <p style={{ color: colors.textMuted, fontSize: typo.label, textAlign: 'center', marginBottom: '16px' }}>
              Complete all 4 applications to unlock the test
            </p>
          </div>

          {transferApplications.map((app, index) => (
            <div
              key={index}
              style={{
                background: colors.bgCard,
                margin: '16px',
                padding: typo.cardPadding,
                borderRadius: '12px',
                border: transferCompleted.has(index) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.bodyLarge }}>{app.title}</h3>
                {transferCompleted.has(index) && <span style={{ color: colors.success, fontSize: typo.small }}>Completed</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '12px' }}>{app.description}</p>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                <p style={{ color: colors.accent, fontSize: typo.small, fontWeight: 'bold' }}>{app.question}</p>
              </div>
              {!transferCompleted.has(index) ? (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, index]))}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${colors.accent}`, background: 'transparent', color: colors.accent, cursor: 'pointer', fontSize: typo.small }}
                >
                  Reveal Answer
                </button>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${colors.success}` }}>
                  <p style={{ color: colors.textPrimary, fontSize: typo.small }}>{app.answer}</p>
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
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
            <div style={{
              background: testScore >= 8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              margin: '16px',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h2 style={{ color: testScore >= 8 ? colors.success : colors.error, marginBottom: '8px', fontSize: typo.heading }}>
                {testScore >= 8 ? 'Excellent!' : 'Keep Learning!'}
              </h2>
              <p style={{ color: colors.textPrimary, fontSize: typo.title, fontWeight: 'bold' }}>{testScore} / 10</p>
              <p style={{ color: colors.textSecondary, marginTop: '8px', fontSize: typo.body }}>
                {testScore >= 8 ? 'You\'ve mastered sound localization!' : 'Review the material and try again.'}
              </p>
            </div>
            {testQuestions.map((q, qIndex) => {
              const userAnswer = testAnswers[qIndex];
              const isCorrect = userAnswer !== null && q.options[userAnswer].correct;
              return (
                <div key={qIndex} style={{ background: colors.bgCard, margin: '16px', padding: typo.cardPadding, borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? colors.success : colors.error}` }}>
                  <p style={{ color: colors.textPrimary, marginBottom: '12px', fontWeight: 'bold', fontSize: typo.body }}>{qIndex + 1}. {q.question}</p>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} style={{ padding: '8px 12px', marginBottom: '4px', borderRadius: '6px', background: opt.correct ? 'rgba(16, 185, 129, 0.2)' : userAnswer === oIndex ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: opt.correct ? colors.success : userAnswer === oIndex ? colors.error : colors.textSecondary, fontSize: typo.small }}>
                      {opt.correct ? 'Correct: ' : userAnswer === oIndex ? 'Your answer: ' : ''}{opt.text}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {renderBottomBar(false, testScore >= 8, testScore >= 8 ? 'Complete Mastery' : 'Review & Retry')}
        </div>
      );
    }

    const currentQ = testQuestions[currentTestQuestion];
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: typo.pagePadding }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: colors.textPrimary, fontSize: typo.heading }}>Knowledge Test</h2>
              <span style={{ color: colors.textSecondary, fontSize: typo.body }}>{currentTestQuestion + 1} / {testQuestions.length}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
              {testQuestions.map((_, i) => (
                <div key={i} onClick={() => setCurrentTestQuestion(i)} style={{ flex: 1, height: '4px', borderRadius: '2px', background: testAnswers[i] !== null ? colors.accent : i === currentTestQuestion ? colors.textMuted : 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
              ))}
            </div>
            <div style={{ background: colors.bgCard, padding: '20px', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ color: colors.textPrimary, fontSize: typo.bodyLarge, lineHeight: 1.5 }}>{currentQ.question}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQ.options.map((opt, oIndex) => (
                <button key={oIndex} onClick={() => handleTestAnswer(currentTestQuestion, oIndex)} style={{ padding: typo.cardPadding, borderRadius: '8px', border: testAnswers[currentTestQuestion] === oIndex ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)', background: testAnswers[currentTestQuestion] === oIndex ? 'rgba(139, 92, 246, 0.2)' : 'transparent', color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', fontSize: typo.body }}>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: typo.pagePadding }}>
            <button onClick={() => setCurrentTestQuestion(Math.max(0, currentTestQuestion - 1))} disabled={currentTestQuestion === 0} style={{ padding: '12px 24px', borderRadius: '8px', border: `1px solid ${colors.textMuted}`, background: 'transparent', color: currentTestQuestion === 0 ? colors.textMuted : colors.textPrimary, cursor: currentTestQuestion === 0 ? 'not-allowed' : 'pointer', fontSize: typo.body }}>Previous</button>
            {currentTestQuestion < testQuestions.length - 1 ? (
              <button onClick={() => setCurrentTestQuestion(currentTestQuestion + 1)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', cursor: 'pointer', fontSize: typo.body, boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)' }}>Next</button>
            ) : (
              <button onClick={submitTest} disabled={testAnswers.includes(null)} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', background: testAnswers.includes(null) ? colors.textMuted : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer', fontSize: typo.body, boxShadow: testAnswers.includes(null) ? 'none' : '0 4px 15px rgba(16, 185, 129, 0.4)' }}>Submit Test</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MASTERY PHASE
  if (phase === 'mastery') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
          <div style={{ padding: typo.pagePadding, textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>Trophy</div>
            <h1 style={{ color: colors.success, marginBottom: '8px', fontSize: typo.title }}>Mastery Achieved!</h1>
            <p style={{ color: colors.textSecondary, marginBottom: '24px', fontSize: typo.body }}>You've mastered the physics of sound localization</p>
          </div>
          <div style={{ background: colors.bgCard, margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Key Concepts Mastered:</h3>
            <ul style={{ color: colors.textSecondary, lineHeight: 1.8, paddingLeft: '20px', margin: 0, fontSize: typo.body }}>
              <li>Head shadow effect and wavelength dependence</li>
              <li>Interaural Time Difference (ITD) - up to 0.6-0.7 ms</li>
              <li>Interaural Level Difference (ILD) - stronger at high frequencies</li>
              <li>Why bass is hard to localize (wavelength larger than head)</li>
              <li>Binaural hearing is essential for spatial awareness</li>
            </ul>
          </div>
          <div style={{ background: 'rgba(139, 92, 246, 0.2)', margin: '16px', padding: '20px', borderRadius: '12px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '12px', fontSize: typo.heading }}>Beyond the Basics:</h3>
            <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6 }}>
              The "Duplex Theory" explains that ITD dominates for low frequencies (below ~1500 Hz)
              while ILD dominates for high frequencies. The "cone of confusion" exists because sounds
              at different elevations can produce identical ITD/ILD - your brain uses pinna (outer ear)
              reflections to resolve vertical ambiguity!
            </p>
          </div>
          {renderVisualization(true)}
        </div>
        {renderBottomBar(false, true, 'Complete Game')}
      </div>
    );
  }

  return null;
};

export default DirectionFindingRenderer;
