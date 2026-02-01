'use client';

import React, { useState, useEffect, useCallback } from 'react';

// =============================================================================
// FRESNEL ZONES RENDERER - RADIO WAVE PROPAGATION
// =============================================================================
// Educational visualization demonstrating Fresnel zones and their importance
// in radio wave propagation, microwave links, and wireless communications.
// =============================================================================

interface FresnelZonesRendererProps {
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
  zone1: '#22d3ee',
  zone2: '#a78bfa',
  zone3: '#f472b6',
  signal: '#fbbf24',
};

const FresnelZonesRenderer: React.FC<FresnelZonesRendererProps> = ({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}) => {
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

  // Simulation state
  const [frequency, setFrequency] = useState(2.4); // GHz
  const [distance, setDistance] = useState(1000); // meters
  const [obstacleHeight, setObstacleHeight] = useState(0); // percentage of first Fresnel zone
  const [showZones, setShowZones] = useState(3);

  // Phase-specific state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestQuestion, setCurrentTestQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testScore, setTestScore] = useState(0);

  // Calculate Fresnel zone radius at midpoint
  // r_n = sqrt(n * wavelength * d1 * d2 / (d1 + d2))
  // At midpoint: d1 = d2 = D/2, so r_n = sqrt(n * wavelength * D / 4)
  const wavelength = 0.3 / frequency; // c / f, in meters (c = 3e8 m/s, f in GHz)
  const fresnelRadius1 = Math.sqrt(wavelength * distance / 4); // First Fresnel zone radius at midpoint
  const fresnelRadius2 = Math.sqrt(2 * wavelength * distance / 4);
  const fresnelRadius3 = Math.sqrt(3 * wavelength * distance / 4);

  // Signal loss calculation based on obstruction
  const clearanceRatio = 1 - (obstacleHeight / 100);
  const signalLoss = obstacleHeight > 60 ?
    6 + (obstacleHeight - 60) * 0.5 : // Significant loss when more than 60% obstructed
    obstacleHeight > 0 ? obstacleHeight * 0.1 : 0; // Minor loss for partial obstruction

  // =============================================================================
  // REAL WORLD APPLICATIONS
  // =============================================================================

  const realWorldApps = [
    {
      icon: '📡',
      title: 'Microwave Link Planning',
      short: 'Telecommunications',
      tagline: 'Ensuring clear paths for wireless backhaul',
      description: 'Microwave links form the backbone of cellular networks, connecting cell towers to the core network. Engineers must carefully plan these point-to-point links to ensure the first Fresnel zone remains at least 60% clear of obstructions. A single tree or building in the wrong place can degrade a multi-gigabit link to unusable levels, making Fresnel zone analysis critical for network reliability.',
      connection: 'Radio waves don\'t travel in pencil-thin beams - they spread out in an ellipsoidal pattern described by Fresnel zones. The first Fresnel zone contains most of the signal energy, and any obstruction within it causes diffraction losses. Understanding this physics allows engineers to calculate minimum antenna heights, required clearances, and predict signal quality before installing expensive equipment.',
      howItWorks: 'Engineers use path profile analysis software to map terrain and obstacles between two points. They calculate the first Fresnel zone radius at every point along the path using r = sqrt(n*lambda*d1*d2/(d1+d2)). Antenna heights are chosen to maintain 60-100% first zone clearance, accounting for Earth curvature (K-factor) and worst-case atmospheric refraction. Link budget calculations then predict received signal strength.',
      stats: [
        { value: '60%', label: 'Minimum first Fresnel zone clearance required' },
        { value: '80 GHz', label: 'E-band frequencies for 10+ Gbps links' },
        { value: '50 km', label: 'Maximum practical microwave link distance' }
      ],
      examples: [
        'Cellular backhaul connecting thousands of cell towers to fiber networks',
        'Enterprise campus links between buildings avoiding trenching costs',
        'Broadcasting studio-to-transmitter links for live television',
        'Emergency services networks requiring rapid deployment without fiber'
      ],
      companies: ['Ericsson', 'Nokia', 'Huawei', 'Cambium Networks', 'Ceragon'],
      futureImpact: 'As 5G networks densify with small cells, microwave and millimeter-wave backhaul will become even more critical. AI-powered planning tools will automatically optimize link placement, while adaptive beamforming will dynamically adjust to changing obstruction conditions like seasonal foliage growth.',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: '💡',
      title: 'Fresnel Lens Design',
      short: 'Lighting',
      tagline: 'Bending light with elegant simplicity',
      description: 'Fresnel lenses collapse the curved surface of a conventional lens into concentric rings, dramatically reducing thickness and weight while maintaining optical power. Invented by Augustin-Jean Fresnel for lighthouses in 1822, these lenses revolutionized maritime safety by creating powerful beams visible for 20+ miles. Today they\'re found in everything from overhead projectors to solar concentrators.',
      connection: 'The Fresnel zone concept in wave propagation shares its mathematical foundation with Fresnel lens design - both involve understanding how waves add constructively or destructively based on path length differences. In lenses, the concentric rings are spaced so light from each ring arrives in phase at the focal point, creating constructive interference just like the zones in radio propagation.',
      howItWorks: 'A Fresnel lens divides a conventional lens surface into concentric annular sections. Each ring has the same focal length but reduced thickness - only the refracting surface angle matters, not the lens thickness. Light passing through adjacent rings travels different path lengths but arrives at the focus with the same phase (or differs by exactly one wavelength), creating constructive interference. Modern manufacturing uses precision molding or diamond turning to create rings as fine as 0.1mm.',
      stats: [
        { value: '90%', label: 'Weight reduction vs conventional lens' },
        { value: '1000x', label: 'Solar concentration achievable' },
        { value: '0.1mm', label: 'Finest groove pitch in precision lenses' }
      ],
      examples: [
        'Lighthouse beacons visible 20+ nautical miles at sea',
        'Theatrical stage lighting with smooth, controllable beams',
        'Solar concentrators for photovoltaic and thermal energy',
        'VR headset lenses reducing weight and eye strain'
      ],
      companies: ['Fresnel Technologies', 'Edmund Optics', 'Carclo Optics', 'Orafol', 'Ntkj'],
      futureImpact: 'Metalenses using nanostructured surfaces will eventually replace Fresnel lenses for many applications, offering even thinner profiles and wavelength-scale control. However, Fresnel lenses will remain dominant for large-aperture, low-cost applications like solar concentration and automotive lighting.',
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: '🔭',
      title: 'Radio Telescope Arrays',
      short: 'Astronomy',
      tagline: 'Seeing the universe in radio waves',
      description: 'Radio telescope arrays like ALMA and the VLA combine signals from multiple antennas spread across kilometers to achieve angular resolution impossible with single dishes. The spacing between antennas must account for Fresnel zones to properly combine wavefronts and avoid destructive interference. This technique, called aperture synthesis, has revealed black holes, pulsars, and the cosmic microwave background.',
      connection: 'When radio waves from a distant cosmic source reach an array, each antenna samples a different part of the incoming wavefront. The signals must be combined with precise time delays accounting for path length differences - essentially reconstructing what a dish the size of the entire array would see. Fresnel zone concepts help determine optimal antenna placement and the transition between near-field and far-field imaging.',
      howItWorks: 'Each antenna pair forms a "baseline" that samples one spatial frequency of the sky brightness distribution. Signals are timestamped with atomic clocks and combined in a correlator that compensates for geometric delays. The array\'s resolution equals that of a single dish with diameter equal to the maximum baseline. For sources in the near field (within the Fresnel distance D^2/lambda), wavefront curvature must be corrected. Aperture synthesis builds up a complete image by observing as Earth rotates, filling in the UV plane.',
      stats: [
        { value: '16 km', label: 'Maximum VLA baseline for milliarcsecond resolution' },
        { value: '66', label: 'Antennas in ALMA array at 5000m elevation' },
        { value: '10,000 km', label: 'Very Long Baseline Interferometry Earth-spanning baselines' }
      ],
      examples: [
        'First image of a black hole by Event Horizon Telescope array',
        'Mapping cosmic microwave background anisotropies',
        'Detecting pulsars and fast radio bursts from distant galaxies',
        'SETI searches scanning for extraterrestrial signals'
      ],
      companies: ['NRAO', 'ESO', 'CSIRO', 'MIT Haystack Observatory', 'JAXA'],
      futureImpact: 'The Square Kilometre Array (SKA) will be the world\'s largest radio telescope, with thousands of antennas across Australia and South Africa. Space-based arrays will achieve baselines larger than Earth, potentially imaging exoplanet surfaces and testing general relativity near black holes.',
      color: 'from-purple-500 to-indigo-500'
    },
    {
      icon: '📶',
      title: 'Wireless Network Planning',
      short: 'IT Infrastructure',
      tagline: 'Designing reliable WiFi coverage',
      description: 'Enterprise wireless networks require careful RF planning to ensure consistent coverage and throughput. Fresnel zone analysis helps network engineers understand why WiFi signals degrade around obstacles, across open spaces, and through different materials. Modern site surveys combine Fresnel calculations with ray-tracing to predict coverage before deploying access points.',
      connection: 'WiFi signals at 2.4 GHz and 5 GHz have Fresnel zones measured in meters - significant compared to room dimensions. A conference table, partial wall, or even groups of people can obstruct the first Fresnel zone and cause signal degradation. Understanding this explains why a "clear" line of sight isn\'t enough for reliable wireless performance.',
      howItWorks: 'Network planners use predictive modeling software that calculates Fresnel zones between each access point and potential client locations. At 2.4 GHz over 50 meters, the first Fresnel zone radius at midpoint is about 1.8 meters - a significant volume. The software accounts for furniture, walls (with material-specific attenuation), and people as obstructions. Access point placement is optimized to maintain adequate Fresnel clearance while minimizing co-channel interference.',
      stats: [
        { value: '1.8m', label: 'First Fresnel zone radius at 50m on 2.4 GHz' },
        { value: '-67 dBm', label: 'Minimum signal for reliable voice/video' },
        { value: '25%', label: 'Capacity loss from poor Fresnel clearance' }
      ],
      examples: [
        'Stadium WiFi serving 80,000 simultaneous users',
        'Hospital networks requiring coverage in every room',
        'Warehouse logistics tracking with real-time inventory',
        'Smart factory IoT connecting thousands of sensors'
      ],
      companies: ['Cisco Meraki', 'Aruba Networks', 'Ekahau', 'iBwave', 'NetAlly'],
      futureImpact: 'WiFi 7 and beyond will use wider channels and higher frequencies where Fresnel zones are smaller but attenuation is higher. AI-driven networks will continuously optimize based on real-time Fresnel zone obstruction from people movement, automatically adjusting power and steering clients to maintain quality of service.',
      color: 'from-emerald-500 to-teal-500'
    }
  ];

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================

  const predictions = [
    { id: 'line_only', label: 'Only the direct line-of-sight path matters for signal quality' },
    { id: 'wider_zone', label: 'Radio waves need clearance in a wider zone around the direct path' },
    { id: 'frequency_irrelevant', label: 'The clearance needed is the same regardless of frequency' },
    { id: 'obstacles_block', label: 'Any obstacle touching the path completely blocks the signal' },
  ];

  const twistPredictions = [
    { id: 'same_zone', label: 'Higher frequencies need the same Fresnel zone clearance' },
    { id: 'larger_zone', label: 'Higher frequencies need larger Fresnel zone clearance' },
    { id: 'smaller_zone', label: 'Higher frequencies need smaller Fresnel zone clearance' },
    { id: 'no_zones', label: 'Higher frequencies don\'t have Fresnel zones' },
  ];

  const transferApplications = [
    {
      title: 'Cellular Network Backhaul',
      description: 'Cell towers connect to the core network using microwave links that must clear buildings and terrain.',
      question: 'Why do engineers raise antennas higher than seemingly necessary for line-of-sight?',
      answer: 'The first Fresnel zone forms an ellipsoid around the path that can be tens of meters wide at midpoint. Antennas must be high enough to keep this zone 60%+ clear of obstacles, not just the geometric line.',
    },
    {
      title: 'Long-Distance WiFi Bridges',
      description: 'Outdoor WiFi can span several kilometers between buildings using directional antennas.',
      question: 'Why might a WiFi bridge work perfectly in winter but have problems in summer?',
      answer: 'Trees in the Fresnel zone that are bare in winter grow leaves in summer, obstructing more of the zone. Even partial obstruction causes signal degradation through diffraction losses.',
    },
    {
      title: 'Drone Communication Links',
      description: 'UAVs need reliable command and video links across varying distances and terrain.',
      question: 'How does flying altitude affect Fresnel zone clearance for a drone\'s radio link?',
      answer: 'Higher altitude increases clearance above ground obstacles, but the Fresnel zone radius also increases with distance. Optimal altitude balances clearance against zone size and path loss.',
    },
    {
      title: 'Maritime and Offshore Communications',
      description: 'Ships and oil platforms use microwave and satellite links where water creates a reflective surface.',
      question: 'Why is Fresnel zone analysis especially important over water?',
      answer: 'Water is highly reflective at radio frequencies. Signals reflecting off the water surface can interfere destructively with direct signals. Antenna heights must ensure the reflection point is outside critical Fresnel zones.',
    },
  ];

  const testQuestions = [
    {
      question: 'What is the first Fresnel zone?',
      options: [
        { text: 'The area where radio waves are completely blocked', correct: false },
        { text: 'An ellipsoidal region where path lengths differ by less than half a wavelength from the direct path', correct: true },
        { text: 'The maximum range of a radio transmitter', correct: false },
        { text: 'The antenna\'s radiation pattern', correct: false },
      ],
    },
    {
      question: 'What percentage of the first Fresnel zone should ideally be clear for a microwave link?',
      options: [
        { text: '20%', correct: false },
        { text: '40%', correct: false },
        { text: '60% or more', correct: true },
        { text: '100% is always required', correct: false },
      ],
    },
    {
      question: 'How does frequency affect the Fresnel zone radius?',
      options: [
        { text: 'Higher frequency = larger Fresnel zone', correct: false },
        { text: 'Higher frequency = smaller Fresnel zone', correct: true },
        { text: 'Frequency has no effect on Fresnel zone size', correct: false },
        { text: 'Only the first zone is affected by frequency', correct: false },
      ],
    },
    {
      question: 'What happens when an obstacle partially blocks the first Fresnel zone?',
      options: [
        { text: 'Signal is completely blocked', correct: false },
        { text: 'Signal experiences diffraction loss and degradation', correct: true },
        { text: 'Signal quality improves due to focusing', correct: false },
        { text: 'Nothing - only line-of-sight matters', correct: false },
      ],
    },
    {
      question: 'At what point along the path is the first Fresnel zone widest?',
      options: [
        { text: 'At the transmitter', correct: false },
        { text: 'At the receiver', correct: false },
        { text: 'At the midpoint of the path', correct: true },
        { text: 'It is the same width throughout', correct: false },
      ],
    },
    {
      question: 'Why do higher Fresnel zones (2nd, 3rd, etc.) alternate between constructive and destructive interference?',
      options: [
        { text: 'Due to antenna design limitations', correct: false },
        { text: 'Because path lengths differ by additional half-wavelengths', correct: true },
        { text: 'Due to atmospheric absorption', correct: false },
        { text: 'Higher zones don\'t actually exist', correct: false },
      ],
    },
    {
      question: 'The formula for first Fresnel zone radius includes which variables?',
      options: [
        { text: 'Only distance', correct: false },
        { text: 'Only wavelength', correct: false },
        { text: 'Wavelength and distances to both endpoints', correct: true },
        { text: 'Transmitter power and frequency', correct: false },
      ],
    },
    {
      question: 'How does Earth\'s curvature affect long microwave links?',
      options: [
        { text: 'It has no effect', correct: false },
        { text: 'The Earth bulges up into the Fresnel zone, requiring higher antennas', correct: true },
        { text: 'It only affects satellite links', correct: false },
        { text: 'It helps by focusing the signal', correct: false },
      ],
    },
    {
      question: 'What is the K-factor in microwave link planning?',
      options: [
        { text: 'A measure of antenna gain', correct: false },
        { text: 'A factor accounting for atmospheric refraction effects on Earth\'s effective curvature', correct: true },
        { text: 'The ratio of signal to noise', correct: false },
        { text: 'The number of Fresnel zones to consider', correct: false },
      ],
    },
    {
      question: 'Why are Fresnel lenses designed with concentric rings?',
      options: [
        { text: 'For aesthetic purposes', correct: false },
        { text: 'To reduce manufacturing cost only', correct: false },
        { text: 'So light from each ring arrives in phase at the focus through constructive interference', correct: true },
        { text: 'To block certain wavelengths', correct: false },
      ],
    },
  ];

  // Render visualization
  const renderVisualization = (interactive: boolean) => {
    const width = 600;
    const height = 350;
    const margin = 40;
    const pathY = height / 2;

    const txX = margin + 30;
    const rxX = width - margin - 30;
    const pathLength = rxX - txX;
    const midX = (txX + rxX) / 2;

    // Scale Fresnel radii for visualization (actual values would be too small/large)
    const visualScale = 80 / fresnelRadius1;
    const r1Visual = fresnelRadius1 * visualScale;
    const r2Visual = fresnelRadius2 * visualScale;
    const r3Visual = fresnelRadius3 * visualScale;

    // Obstacle position and size
    const obstacleX = midX;
    const obstacleHeight_px = (obstacleHeight / 100) * r1Visual;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ borderRadius: '16px', maxWidth: '650px', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
        >
          <defs>
            <linearGradient id="zone1Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.zone1} stopOpacity="0.3" />
              <stop offset="50%" stopColor={colors.zone1} stopOpacity="0.1" />
              <stop offset="100%" stopColor={colors.zone1} stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="zone2Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.zone2} stopOpacity="0.2" />
              <stop offset="50%" stopColor={colors.zone2} stopOpacity="0.05" />
              <stop offset="100%" stopColor={colors.zone2} stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="zone3Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.zone3} stopOpacity="0.15" />
              <stop offset="50%" stopColor={colors.zone3} stopOpacity="0.03" />
              <stop offset="100%" stopColor={colors.zone3} stopOpacity="0.15" />
            </linearGradient>
            <radialGradient id="antennaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.signal} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.signal} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ground */}
          <rect x="0" y={height - 20} width={width} height="20" fill="#374151" />
          <line x1="0" y1={height - 20} x2={width} y2={height - 20} stroke="#4b5563" strokeWidth="2" />

          {/* Fresnel zones (ellipses) */}
          {showZones >= 3 && (
            <ellipse
              cx={midX}
              cy={pathY}
              rx={pathLength / 2}
              ry={r3Visual}
              fill="url(#zone3Gradient)"
              stroke={colors.zone3}
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.6"
            />
          )}
          {showZones >= 2 && (
            <ellipse
              cx={midX}
              cy={pathY}
              rx={pathLength / 2}
              ry={r2Visual}
              fill="url(#zone2Gradient)"
              stroke={colors.zone2}
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.7"
            />
          )}
          {showZones >= 1 && (
            <ellipse
              cx={midX}
              cy={pathY}
              rx={pathLength / 2}
              ry={r1Visual}
              fill="url(#zone1Gradient)"
              stroke={colors.zone1}
              strokeWidth="2"
              opacity="0.9"
            />
          )}

          {/* Direct path line */}
          <line
            x1={txX}
            y1={pathY}
            x2={rxX}
            y2={pathY}
            stroke={colors.signal}
            strokeWidth="2"
            strokeDasharray="8,4"
          />

          {/* Obstacle */}
          {obstacleHeight > 0 && (
            <rect
              x={obstacleX - 15}
              y={pathY - obstacleHeight_px}
              width="30"
              height={obstacleHeight_px + (height - 20 - pathY)}
              fill="#64748b"
              stroke="#94a3b8"
              strokeWidth="1"
              rx="2"
            />
          )}

          {/* Transmitter */}
          <circle cx={txX} cy={pathY} r="20" fill="url(#antennaGlow)" />
          <rect x={txX - 5} y={pathY} width="10" height="50" fill="#475569" rx="2" />
          <polygon points={`${txX - 12},${pathY} ${txX},${pathY - 20} ${txX + 12},${pathY}`} fill={colors.zone1} />
          <text x={txX} y={pathY + 70} textAnchor="middle" fill={colors.textSecondary} fontSize="12">TX</text>

          {/* Receiver */}
          <circle cx={rxX} cy={pathY} r="20" fill="url(#antennaGlow)" />
          <rect x={rxX - 5} y={pathY} width="10" height="50" fill="#475569" rx="2" />
          <polygon points={`${rxX - 12},${pathY} ${rxX},${pathY - 20} ${rxX + 12},${pathY}`} fill={colors.zone1} />
          <text x={rxX} y={pathY + 70} textAnchor="middle" fill={colors.textSecondary} fontSize="12">RX</text>

          {/* Zone labels */}
          <text x={midX + pathLength / 4} y={pathY - r1Visual - 5} textAnchor="middle" fill={colors.zone1} fontSize="11" fontWeight="bold">1st Zone</text>
          {showZones >= 2 && (
            <text x={midX + pathLength / 4} y={pathY - r2Visual - 5} textAnchor="middle" fill={colors.zone2} fontSize="10">2nd Zone</text>
          )}
          {showZones >= 3 && (
            <text x={midX + pathLength / 4} y={pathY - r3Visual - 5} textAnchor="middle" fill={colors.zone3} fontSize="10">3rd Zone</text>
          )}

          {/* Info panel */}
          <rect x="10" y="10" width="160" height="80" fill="rgba(15, 23, 42, 0.9)" rx="8" stroke="#334155" />
          <text x="20" y="30" fill={colors.textPrimary} fontSize="12" fontWeight="bold">Fresnel Zone Analysis</text>
          <text x="20" y="48" fill={colors.textSecondary} fontSize="11">Freq: {frequency.toFixed(1)} GHz</text>
          <text x="20" y="64" fill={colors.textSecondary} fontSize="11">Dist: {distance} m</text>
          <text x="20" y="80" fill={colors.textSecondary} fontSize="11">R1: {fresnelRadius1.toFixed(1)} m</text>

          {/* Signal quality indicator */}
          <rect x={width - 120} y="10" width="110" height="50" fill="rgba(15, 23, 42, 0.9)" rx="8" stroke="#334155" />
          <text x={width - 115} y="30" fill={colors.textPrimary} fontSize="11" fontWeight="bold">Signal Quality</text>
          <rect x={width - 115} y="38" width="95" height="12" fill="#1e293b" rx="4" />
          <rect x={width - 115} y="38" width={95 * (1 - signalLoss / 20)} height="12" fill={signalLoss < 3 ? colors.success : signalLoss < 6 ? colors.warning : colors.error} rx="4" />
        </svg>

        {interactive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ color: colors.textSecondary, fontSize: typo.small, minWidth: '80px' }}>Frequency:</label>
              <input
                type="range"
                min="0.9"
                max="60"
                step="0.1"
                value={frequency}
                onChange={(e) => setFrequency(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: colors.textPrimary, fontSize: typo.small, minWidth: '60px' }}>{frequency.toFixed(1)} GHz</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ color: colors.textSecondary, fontSize: typo.small, minWidth: '80px' }}>Distance:</label>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: colors.textPrimary, fontSize: typo.small, minWidth: '60px' }}>{distance} m</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ color: colors.textSecondary, fontSize: typo.small, minWidth: '80px' }}>Obstacle:</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={obstacleHeight}
                onChange={(e) => setObstacleHeight(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: colors.textPrimary, fontSize: typo.small, minWidth: '60px' }}>{obstacleHeight}% blocked</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Hook phase
  const renderHook = () => (
    <div style={{
      padding: typo.pagePadding,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: typo.sectionGap,
      minHeight: '100%'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          background: 'rgba(34, 211, 238, 0.1)',
          border: '1px solid rgba(34, 211, 238, 0.2)',
          borderRadius: '20px',
          marginBottom: '16px'
        }}>
          <span style={{ width: '8px', height: '8px', background: colors.zone1, borderRadius: '50%' }} />
          <span style={{ color: colors.zone1, fontSize: typo.small, fontWeight: 500 }}>WAVE PHYSICS</span>
        </div>

        <h1 style={{
          fontSize: typo.title,
          fontWeight: 700,
          color: colors.textPrimary,
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #f8fafc, #22d3ee)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          The Invisible Highways of Radio
        </h1>

        <p style={{ color: colors.textSecondary, fontSize: typo.bodyLarge, marginBottom: '24px' }}>
          Why do wireless engineers care about space that looks completely empty?
        </p>
      </div>

      {renderVisualization(false)}

      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '20px',
        maxWidth: '500px',
        border: '1px solid rgba(51, 65, 85, 0.5)'
      }}>
        <p style={{ color: colors.textPrimary, fontSize: typo.body, lineHeight: 1.6, marginBottom: '12px' }}>
          Two antennas with perfect line-of-sight. Nothing between them but air.
        </p>
        <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.6, marginBottom: '12px' }}>
          Yet engineers obsess over the "Fresnel zone" - an invisible ellipse of empty space.
        </p>
        <p style={{ color: colors.zone1, fontSize: typo.body, fontWeight: 600 }}>
          What could possibly matter in empty space?
        </p>
      </div>

      <button
        onClick={onPhaseComplete}
        style={{
          padding: '14px 32px',
          background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: typo.body,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          boxShadow: '0 4px 15px rgba(34, 211, 238, 0.3)'
        }}
      >
        Discover the Hidden Physics
      </button>
    </div>
  );

  // Predict phase
  const renderPredict = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
        Make Your Prediction
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: typo.body, textAlign: 'center', marginBottom: '24px' }}>
        What determines whether a radio link works well?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {predictions.map((pred) => (
          <button
            key={pred.id}
            onClick={() => setPrediction(pred.id)}
            style={{
              padding: '16px 20px',
              background: prediction === pred.id ? 'rgba(34, 211, 238, 0.15)' : colors.bgCard,
              border: `2px solid ${prediction === pred.id ? colors.zone1 : 'transparent'}`,
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: typo.body,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {pred.label}
          </button>
        ))}
      </div>

      {prediction && (
        <button
          onClick={() => {
            if (prediction === 'wider_zone') {
              onCorrectAnswer?.();
            } else {
              onIncorrectAnswer?.();
            }
            onPhaseComplete?.();
          }}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: typo.body,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Lock In Prediction
        </button>
      )}
    </div>
  );

  // Play phase
  const renderPlay = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
        Explore Fresnel Zones
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: typo.small, textAlign: 'center', marginBottom: '20px' }}>
        Adjust frequency, distance, and obstacles to see how Fresnel zones affect signal quality
      </p>

      {renderVisualization(true)}

      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: colors.bgCard,
        borderRadius: '12px',
        border: '1px solid rgba(51, 65, 85, 0.5)'
      }}>
        <h3 style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 600, marginBottom: '8px' }}>
          Key Observations:
        </h3>
        <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.8, paddingLeft: '20px' }}>
          <li>Higher frequency = smaller Fresnel zone radius</li>
          <li>Longer distance = larger Fresnel zone at midpoint</li>
          <li>Blocking more than 40% of the first zone causes significant signal loss</li>
          <li>The zone is widest at the midpoint between antennas</li>
        </ul>
      </div>

      <button
        onClick={onPhaseComplete}
        style={{
          marginTop: '20px',
          width: '100%',
          padding: '14px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: typo.body,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Continue to Review
      </button>
    </div>
  );

  // Review phase
  const renderReview = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
        Understanding Fresnel Zones
      </h2>

      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(51, 65, 85, 0.5)'
      }}>
        <h3 style={{ color: colors.zone1, fontSize: typo.body, fontWeight: 600, marginBottom: '12px' }}>
          The Physics Revealed
        </h3>
        <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7, marginBottom: '12px' }}>
          Radio waves don't travel in pencil-thin lines - they spread out like ripples. The <strong style={{ color: colors.textPrimary }}>first Fresnel zone</strong> is an ellipsoidal region where waves arrive within half a wavelength of the direct path, contributing constructively to the signal.
        </p>
        <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7 }}>
          When obstacles intrude into this zone, they diffract the waves, causing <strong style={{ color: colors.textPrimary }}>destructive interference</strong> and signal loss. Engineers require at least 60% of the first zone to be clear for reliable links.
        </p>
      </div>

      <div style={{
        background: 'rgba(34, 211, 238, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        border: '1px solid rgba(34, 211, 238, 0.2)'
      }}>
        <h4 style={{ color: colors.zone1, fontSize: typo.small, fontWeight: 600, marginBottom: '8px' }}>
          FRESNEL ZONE RADIUS FORMULA
        </h4>
        <p style={{ color: colors.textPrimary, fontSize: typo.body, fontFamily: 'monospace' }}>
          r_n = sqrt(n * lambda * d1 * d2 / (d1 + d2))
        </p>
        <p style={{ color: colors.textMuted, fontSize: typo.small, marginTop: '8px' }}>
          Where n = zone number, lambda = wavelength, d1 & d2 = distances to endpoints
        </p>
      </div>

      <button
        onClick={onPhaseComplete}
        style={{
          width: '100%',
          padding: '14px',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: typo.body,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Explore the Twist
      </button>
    </div>
  );

  // Twist predict phase
  const renderTwistPredict = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
        The Frequency Twist
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: typo.body, textAlign: 'center', marginBottom: '24px' }}>
        5G networks use much higher frequencies than 4G. How does this affect Fresnel zones?
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {twistPredictions.map((pred) => (
          <button
            key={pred.id}
            onClick={() => setTwistPrediction(pred.id)}
            style={{
              padding: '16px 20px',
              background: twistPrediction === pred.id ? 'rgba(167, 139, 250, 0.15)' : colors.bgCard,
              border: `2px solid ${twistPrediction === pred.id ? colors.zone2 : 'transparent'}`,
              borderRadius: '12px',
              color: colors.textPrimary,
              fontSize: typo.body,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {pred.label}
          </button>
        ))}
      </div>

      {twistPrediction && (
        <button
          onClick={() => {
            if (twistPrediction === 'smaller_zone') {
              onCorrectAnswer?.();
            } else {
              onIncorrectAnswer?.();
            }
            onPhaseComplete?.();
          }}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: typo.body,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Lock In Prediction
        </button>
      )}
    </div>
  );

  // Twist play phase
  const renderTwistPlay = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
        Frequency vs Fresnel Zones
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: typo.small, textAlign: 'center', marginBottom: '20px' }}>
        Compare low frequency (900 MHz) vs high frequency (60 GHz) links
      </p>

      {renderVisualization(true)}

      <div style={{
        marginTop: '20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        <div style={{
          padding: '16px',
          background: colors.bgCard,
          borderRadius: '12px',
          border: '1px solid rgba(34, 211, 238, 0.3)'
        }}>
          <h4 style={{ color: colors.zone1, fontSize: typo.small, fontWeight: 600, marginBottom: '8px' }}>
            Low Frequency (900 MHz)
          </h4>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            Large Fresnel zones, harder to clear obstacles, but better penetration through foliage
          </p>
        </div>
        <div style={{
          padding: '16px',
          background: colors.bgCard,
          borderRadius: '12px',
          border: '1px solid rgba(167, 139, 250, 0.3)'
        }}>
          <h4 style={{ color: colors.zone2, fontSize: typo.small, fontWeight: 600, marginBottom: '8px' }}>
            High Frequency (60 GHz)
          </h4>
          <p style={{ color: colors.textSecondary, fontSize: typo.small }}>
            Small Fresnel zones, easier clearance, but higher path loss and rain fade
          </p>
        </div>
      </div>

      <button
        onClick={onPhaseComplete}
        style={{
          marginTop: '20px',
          width: '100%',
          padding: '14px',
          background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: typo.body,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Continue to Twist Review
      </button>
    </div>
  );

  // Twist review phase
  const renderTwistReview = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, marginBottom: '16px', textAlign: 'center' }}>
        The Frequency-Zone Tradeoff
      </h2>

      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(51, 65, 85, 0.5)'
      }}>
        <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7, marginBottom: '12px' }}>
          The Fresnel zone radius is proportional to the <strong style={{ color: colors.textPrimary }}>square root of wavelength</strong>. Since wavelength = c/frequency, higher frequencies mean smaller wavelengths and thus smaller Fresnel zones.
        </p>
        <p style={{ color: colors.textSecondary, fontSize: typo.body, lineHeight: 1.7 }}>
          This is why millimeter-wave 5G links can squeeze through urban canyons that would block lower frequencies - their Fresnel zones are measured in centimeters rather than meters!
        </p>
      </div>

      <button
        onClick={onPhaseComplete}
        style={{
          width: '100%',
          padding: '14px',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: typo.body,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        See Real-World Applications
      </button>
    </div>
  );

  // Transfer phase
  const renderTransfer = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, marginBottom: '8px', textAlign: 'center' }}>
        Real-World Applications
      </h2>
      <p style={{ color: colors.textSecondary, fontSize: typo.small, textAlign: 'center', marginBottom: '24px' }}>
        See how Fresnel zone physics shapes technology around you
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {realWorldApps.map((app, index) => (
          <div
            key={index}
            style={{
              background: colors.bgCard,
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(51, 65, 85, 0.5)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => {
              const newCompleted = new Set(transferCompleted);
              newCompleted.add(index);
              setTransferCompleted(newCompleted);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '28px' }}>{app.icon}</span>
              <div>
                <h3 style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 600 }}>{app.title}</h3>
                <p style={{ color: colors.textMuted, fontSize: typo.small }}>{app.short}</p>
              </div>
              {transferCompleted.has(index) && (
                <span style={{ marginLeft: 'auto', color: colors.success, fontSize: '20px' }}>&#10003;</span>
              )}
            </div>
            <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6 }}>
              {app.tagline}
            </p>
            {transferCompleted.has(index) && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(51, 65, 85, 0.5)' }}>
                <p style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 1.6, marginBottom: '8px' }}>
                  {app.description}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {app.stats.map((stat, i) => (
                    <div key={i} style={{
                      background: 'rgba(34, 211, 238, 0.1)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(34, 211, 238, 0.2)'
                    }}>
                      <span style={{ color: colors.zone1, fontWeight: 600, fontSize: typo.small }}>{stat.value}</span>
                      <span style={{ color: colors.textMuted, fontSize: typo.label, marginLeft: '4px' }}>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {transferCompleted.size >= 2 && (
        <button
          onClick={onPhaseComplete}
          style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: typo.body,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Continue to Test
        </button>
      )}
    </div>
  );

  // Test phase
  const renderTest = () => {
    const currentQuestion = testQuestions[currentTestQuestion];

    const handleAnswerSelect = (answerIndex: number) => {
      const newAnswers = [...testAnswers];
      newAnswers[currentTestQuestion] = answerIndex;
      setTestAnswers(newAnswers);
    };

    const handleSubmitTest = () => {
      let score = 0;
      testAnswers.forEach((answer, index) => {
        if (answer !== null && testQuestions[index].options[answer].correct) {
          score++;
        }
      });
      setTestScore(score);
      setTestSubmitted(true);
      if (score >= 7) {
        onCorrectAnswer?.();
      }
    };

    if (testSubmitted) {
      return (
        <div style={{ padding: typo.pagePadding, maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: typo.heading, color: colors.textPrimary, marginBottom: '16px' }}>
            Test Complete!
          </h2>
          <div style={{
            background: colors.bgCard,
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px'
          }}>
            <div style={{
              fontSize: '48px',
              fontWeight: 700,
              color: testScore >= 7 ? colors.success : colors.warning,
              marginBottom: '8px'
            }}>
              {testScore}/10
            </div>
            <p style={{ color: colors.textSecondary, fontSize: typo.body }}>
              {testScore >= 7 ? 'Excellent! You\'ve mastered Fresnel zones!' : 'Good effort! Review the material and try again.'}
            </p>
          </div>
          <button
            onClick={onPhaseComplete}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: typo.body,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Continue to Mastery
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: typo.heading, color: colors.textPrimary }}>
            Knowledge Test
          </h2>
          <span style={{ color: colors.textMuted, fontSize: typo.small }}>
            Question {currentTestQuestion + 1} of {testQuestions.length}
          </span>
        </div>

        <div style={{
          background: colors.bgCard,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px'
        }}>
          <p style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 500, marginBottom: '20px' }}>
            {currentQuestion.question}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                style={{
                  padding: '14px 16px',
                  background: testAnswers[currentTestQuestion] === index ? 'rgba(139, 92, 246, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                  border: `2px solid ${testAnswers[currentTestQuestion] === index ? colors.accent : 'transparent'}`,
                  borderRadius: '10px',
                  color: colors.textPrimary,
                  fontSize: typo.small,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentTestQuestion > 0 && (
            <button
              onClick={() => setCurrentTestQuestion(prev => prev - 1)}
              style={{
                flex: 1,
                padding: '12px',
                background: 'rgba(51, 65, 85, 0.5)',
                color: colors.textSecondary,
                border: 'none',
                borderRadius: '10px',
                fontSize: typo.small,
                cursor: 'pointer'
              }}
            >
              Previous
            </button>
          )}
          {currentTestQuestion < testQuestions.length - 1 ? (
            <button
              onClick={() => setCurrentTestQuestion(prev => prev + 1)}
              disabled={testAnswers[currentTestQuestion] === null}
              style={{
                flex: 1,
                padding: '12px',
                background: testAnswers[currentTestQuestion] !== null ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'rgba(51, 65, 85, 0.5)',
                color: testAnswers[currentTestQuestion] !== null ? 'white' : colors.textMuted,
                border: 'none',
                borderRadius: '10px',
                fontSize: typo.small,
                cursor: testAnswers[currentTestQuestion] !== null ? 'pointer' : 'not-allowed'
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitTest}
              disabled={testAnswers.some(a => a === null)}
              style={{
                flex: 1,
                padding: '12px',
                background: !testAnswers.some(a => a === null) ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(51, 65, 85, 0.5)',
                color: !testAnswers.some(a => a === null) ? 'white' : colors.textMuted,
                border: 'none',
                borderRadius: '10px',
                fontSize: typo.small,
                fontWeight: 600,
                cursor: !testAnswers.some(a => a === null) ? 'pointer' : 'not-allowed'
              }}
            >
              Submit Test
            </button>
          )}
        </div>
      </div>
    );
  };

  // Mastery phase
  const renderMastery = () => (
    <div style={{ padding: typo.pagePadding, maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        borderRadius: '50%',
        marginBottom: '20px',
        fontSize: '40px'
      }}>
        &#127942;
      </div>

      <h2 style={{
        fontSize: typo.title,
        color: colors.textPrimary,
        marginBottom: '12px',
        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Fresnel Zones Mastered!
      </h2>

      <p style={{ color: colors.textSecondary, fontSize: typo.body, marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
        You now understand how radio waves propagate through space and why engineers obsess over "empty" air.
      </p>

      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        textAlign: 'left'
      }}>
        <h3 style={{ color: colors.textPrimary, fontSize: typo.body, fontWeight: 600, marginBottom: '16px' }}>
          Key Takeaways:
        </h3>
        <ul style={{ color: colors.textSecondary, fontSize: typo.small, lineHeight: 2, paddingLeft: '20px' }}>
          <li>Radio waves spread out in ellipsoidal Fresnel zones around the direct path</li>
          <li>The first Fresnel zone must be 60%+ clear for reliable links</li>
          <li>Higher frequencies have smaller zones (easier clearance, higher loss)</li>
          <li>This physics underlies cellular backhaul, WiFi, satellite, and radio astronomy</li>
        </ul>
      </div>

      <button
        onClick={onPhaseComplete}
        style={{
          padding: '14px 32px',
          background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: typo.body,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Complete Lesson
      </button>
    </div>
  );

  // Phase router
  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return renderTransfer();
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {renderPhase()}
    </div>
  );
};

export default FresnelZonesRenderer;
