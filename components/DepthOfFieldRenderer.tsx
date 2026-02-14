'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// DEPTH OF FIELD RENDERER - WHAT CONTROLS BLUR IN PHOTOGRAPHY
// =============================================================================
// Game 130: Premium educational game demonstrating how aperture, subject distance,
// and focus affect depth of field and blur circles. Students explore the physics
// of circle of confusion and how it creates artistic blur in photography.
// =============================================================================

// String phases
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  'hook': 'Hook', 'predict': 'Predict', 'play': 'Lab', 'review': 'Review', 'twist_predict': 'Twist Predict',
  'twist_play': 'Twist Lab', 'twist_review': 'Twist Review', 'transfer': 'Transfer', 'test': 'Test', 'mastery': 'Mastery'
};

interface DepthOfFieldRendererProps {
  phase: Phase;
  onPhaseComplete?: () => void;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Premium Design System
const defined = {
  colors: {
    primary: '#6366F1',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    background: {
      primary: '#0F172A',
      secondary: '#1E293B',
      tertiary: '#334155',
      card: 'rgba(30, 41, 59, 0.8)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#64748B',
    },
    lens: {
      glass: 'rgba(147, 197, 253, 0.3)',
      ray: '#60A5FA',
      focus: '#22C55E',
      blur: '#F472B6',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    glow: '0 0 20px rgba(99, 102, 241, 0.3)',
  },
};

// =============================================================================
// REAL WORLD APPLICATIONS DATA - Enhanced with full details
// =============================================================================
const realWorldApps = [
  {
    icon: 'Camera',
    title: 'Portrait Photography',
    short: 'Creating artistic background blur to isolate subjects',
    tagline: 'Where focus meets artistry',
    description: 'Portrait photography leverages shallow depth of field to separate subjects from their backgrounds, creating the iconic "bokeh" effect that makes professional portraits stand out. By using wide apertures and careful distance management, photographers can transform distracting backgrounds into creamy, aesthetically pleasing blur that draws all attention to the subject.',
    connection: 'The depth of field simulation demonstrates exactly how aperture size and subject distance work together to create portrait blur. A wider aperture (lower f-number) creates larger circles of confusion for out-of-focus areas, producing smoother bokeh. Moving closer to the subject while maintaining the same framing amplifies this effect dramatically.',
    howItWorks: 'Portrait photographers typically use fast prime lenses (f/1.4 to f/2.8) at focal lengths between 50mm and 135mm. The wide aperture creates a narrow plane of focus, often just centimeters deep at close distances. Light from out-of-focus points spreads into circular disks (the circle of confusion), and when these disks overlap sufficiently, they create the smooth, painterly blur characteristic of professional portraits.',
    stats: [
      { value: 'f/1.2-f/2.8', label: 'Typical portrait aperture range' },
      { value: '85mm', label: 'Classic portrait focal length' },
      { value: '2-5cm', label: 'Depth of field at close range with wide aperture' },
      { value: '$1,500-4,000', label: 'Professional portrait lens cost' },
    ],
    examples: [
      'Wedding photography with bride sharp against blurred venue backgrounds',
      'Headshot photography for actors and executives with creamy studio bokeh',
      'Environmental portraits balancing subject focus with contextual blur',
      'Pet photography using shallow depth to emphasize eyes and expressions',
    ],
    companies: [
      'Canon',
      'Sony',
      'Nikon',
      'Sigma Art',
      'Zeiss',
    ],
    futureImpact: 'The demand for portrait-quality blur is driving innovation in both optical and computational photography. New lens designs with aspherical elements create smoother bokeh, while AI-powered cameras can now optimize aperture and focus in real-time for ideal subject separation. Mirrorless cameras with eye-tracking autofocus maintain razor-sharp focus on subjects even at f/1.2.',
    color: '#a855f7',
  },
  {
    icon: 'Search',
    title: 'Macro & Scientific Photography',
    short: 'Extreme close-ups revealing microscopic worlds',
    tagline: 'Where millimeters become mountains',
    description: 'Macro photography pushes depth of field to its absolute limits. At extreme magnifications, the depth of field can shrink to fractions of a millimeter, making focus precision critical. This razor-thin focus plane creates stunning images where tiny subjects emerge from completely abstract, blurred surroundings. Scientific and medical imaging relies on these same principles for microscopy and diagnostic applications.',
    connection: 'The depth of field principles shown in this simulation become dramatically amplified at macro distances. When the subject distance approaches the focal length, depth of field collapses exponentially. Even at f/16 or f/22, macro photographers may have less than a millimeter in focus, requiring techniques like focus stacking to achieve full sharpness.',
    howItWorks: 'Macro lenses allow 1:1 or greater magnification ratios, projecting life-size or larger images onto the sensor. At these close distances, the circle of confusion grows rapidly for any point not precisely at the focus distance. Photographers combat this by using smaller apertures (higher f-numbers), focus stacking multiple exposures, or specialized tilt-shift techniques to angle the focal plane. Microscopes use similar optical principles at even higher magnifications.',
    stats: [
      { value: '1:1 to 5:1', label: 'Macro magnification ratios' },
      { value: '0.1-2mm', label: 'Typical macro depth of field' },
      { value: '50-200', label: 'Images stacked for full-depth macro shots' },
      { value: '1000x', label: 'Optical microscope magnification limit' },
    ],
    examples: [
      'Insect photography revealing compound eye structures in sharp detail',
      'Botanical macro showing pollen grains and stamen at cellular scale',
      'Semiconductor inspection imaging chip features at nanometer scales',
      'Medical pathology slides capturing tissue structures for diagnosis',
    ],
    companies: [
      'Laowa',
      'Canon MP-E 65mm',
      'Olympus',
      'Zerene Stacker',
      'Zeiss Microscopy',
    ],
    futureImpact: 'Computational focus stacking is becoming automated in cameras, with some mirrorless systems capturing and combining dozens of focal planes in-camera. Light field cameras may eventually capture the entire focus range in a single exposure. AI-powered depth estimation is revolutionizing microscopy, enabling 3D reconstructions from 2D slices.',
    color: '#22c55e',
  },
  {
    icon: 'Film',
    title: 'Cinematography & Film',
    short: 'Focus pulling for visual storytelling',
    tagline: 'Guiding eyes through motion',
    description: 'Cinematographers use depth of field as a powerful storytelling tool, controlling exactly where audiences look within each frame. The technique of "pulling focus" - smoothly transitioning focus between subjects - creates dramatic reveals and emotional connections that have defined the visual language of cinema for over a century. Large-format cinema cameras achieve the signature shallow depth of field that separates movies from video.',
    connection: 'This simulation shows why cinema cameras use large sensors and fast lenses: to achieve shallow depth of field that isolates subjects from backgrounds. The rack focus technique exploits the transition zone between sharp focus and blur, smoothly shifting the circle of confusion from one subject to another to redirect viewer attention.',
    howItWorks: 'Cinema cameras use sensors ranging from Super 35 (APS-C equivalent) to full-frame or larger (IMAX), paired with cinema lenses featuring smooth, precise focus rings with long rotation throws (270-330 degrees vs 90 degrees on photo lenses). A first assistant camera operator (focus puller) uses wireless focus motors, distance markers, and rehearsed timing to execute planned focus transitions. The shallow depth of field means errors of just centimeters can result in soft subjects.',
    stats: [
      { value: 'T1.3-T2.0', label: 'Common cinema lens aperture range' },
      { value: '270-330 degrees', label: 'Focus ring rotation for precision' },
      { value: '$15K-75K', label: 'Professional cinema lens set cost' },
      { value: '24-65mm', label: 'IMAX sensor diagonal size' },
    ],
    examples: [
      'Rack focus from foreground character to approaching threat in thrillers',
      'Shallow DOF close-ups isolating actors from busy set environments',
      'Split diopter shots keeping two focal planes sharp simultaneously',
      'Deep focus compositions in Citizen Kane using small apertures and lighting',
    ],
    companies: [
      'ARRI',
      'RED Digital Cinema',
      'Cooke Optics',
      'Zeiss Cinema',
      'Panavision',
    ],
    futureImpact: 'Autofocus technology is revolutionizing cinema production. Eye-tracking AF systems can now maintain perfect focus on moving subjects, potentially reducing the need for dedicated focus pullers while enabling new creative possibilities for small crews and documentary filmmakers. Virtual production with LED volumes is creating new depth of field challenges and opportunities.',
    color: '#f59e0b',
  },
  {
    icon: 'Smartphone',
    title: 'Smartphone Computational Photography',
    short: 'AI-powered bokeh simulation',
    tagline: 'Making physics optional',
    description: 'Smartphone cameras face a fundamental physics problem: their tiny sensors and short focal lengths create naturally deep depth of field, making everything sharp. Computational photography solves this by using AI and depth sensing to artificially blur backgrounds, simulating the optical bokeh of much larger cameras entirely through software. Modern Portrait Modes can now rival professional cameras in many scenarios.',
    connection: 'This simulation explains exactly why phones struggle with natural bokeh - small sensors require short focal lengths, which creates large depth of field regardless of aperture. Portrait Mode reverse-engineers the optical process: instead of blur arising naturally from circles of confusion, AI estimates depth and artificially enlarges the "virtual" circle of confusion for each pixel based on its distance from the subject.',
    howItWorks: 'Modern smartphones use multiple techniques to estimate scene depth: stereo vision from dual cameras, phase-detection patterns, structured light projectors, or LIDAR sensors. AI models trained on millions of images then segment the subject from the background and apply distance-based blur. The most advanced systems even simulate lens-specific bokeh characteristics, including the shape of out-of-focus highlights and realistic light falloff.',
    stats: [
      { value: '4-7mm', label: 'Typical smartphone focal length (vs 50mm+ for DSLRs)' },
      { value: 'LIDAR', label: 'Most advanced depth sensing technology' },
      { value: '1M+', label: 'Depth points mapped per frame on modern phones' },
      { value: '95%', label: 'Accuracy of AI subject segmentation' },
    ],
    examples: [
      'Portrait Mode on iPhones separating subjects from backgrounds',
      'Google Pixel computational bokeh using machine learning depth estimation',
      'Samsung dual-camera systems for live focus adjustment',
      'Cinematic Mode on iPhone applying rack focus to video in real-time',
    ],
    companies: [
      'Apple',
      'Google',
      'Samsung',
      'Qualcomm',
      'Sony Semiconductor',
    ],
    futureImpact: 'Computational photography is advancing rapidly toward optical-quality results. Future systems may render bokeh indistinguishable from large-format cameras, complete with accurate lens aberrations and light diffraction. Generative AI may soon allow users to change focus and aperture after the photo is taken, fundamentally changing how we think about depth of field.',
    color: '#06b6d4',
  },
];

// =============================================================================
// TEST QUESTIONS DATA - Scenario-based multiple choice questions
// =============================================================================
const testQuestions = [
  {
    scenario: "A photography student is learning about depth of field and wants to understand what physically creates the blur in out-of-focus areas.",
    question: "What is the primary optical phenomenon that determines depth of field in a photograph?",
    options: [
      { id: 'a', label: 'The resolution of the camera sensor' },
      { id: 'b', label: 'The circle of confusion formed by out-of-focus light rays', correct: true },
      { id: 'c', label: 'The shutter speed setting' },
      { id: 'd', label: 'The ISO sensitivity of the camera' }
    ],
    explanation: "Depth of field is determined by the circle of confusion - when light from a point doesn't converge perfectly on the sensor, it forms a disk rather than a point. If this disk is small enough (below the 'acceptable' threshold), we perceive it as sharp. Larger disks create visible blur."
  },
  {
    scenario: "A portrait photographer wants to capture a headshot with a beautifully blurred background that separates the subject from distracting elements behind them.",
    question: "Which aperture setting should they choose for maximum background blur?",
    options: [
      { id: 'a', label: 'f/16 for maximum sharpness throughout the image' },
      { id: 'b', label: 'f/8 as a balanced middle ground' },
      { id: 'c', label: 'f/1.8 for the widest opening and shallowest depth of field', correct: true },
      { id: 'd', label: 'f/22 to capture more detail in every part of the frame' }
    ],
    explanation: "f/1.8 creates a wide aperture opening, producing a large cone of light rays. This results in bigger circles of confusion for the background, creating creamy bokeh that isolates the subject. Portrait photographers commonly use f/1.4 to f/2.8 for this effect."
  },
  {
    scenario: "A landscape photographer is shooting a mountain scene and wants everything from nearby wildflowers to distant peaks to be sharp and in focus.",
    question: "What camera settings and technique should they use?",
    options: [
      { id: 'a', label: 'Wide aperture (f/2.8) focused on infinity for distant sharpness' },
      { id: 'b', label: 'Narrow aperture (f/11-f/16) focused at hyperfocal distance', correct: true },
      { id: 'c', label: 'Any aperture with focus set on the closest flowers' },
      { id: 'd', label: 'Maximum aperture with image stabilization enabled' }
    ],
    explanation: "A narrow aperture (f/11-f/16) minimizes the circle of confusion size, extending depth of field. Focusing at the hyperfocal distance maximizes sharpness from half that distance to infinity, ensuring both foreground flowers and distant mountains are acceptably sharp."
  },
  {
    scenario: "A macro photographer is shooting a tiny insect at 1:1 magnification and notices that even at f/16, only a thin slice of the subject is in focus while most of the body is blurred.",
    question: "Why is depth of field so extremely shallow in macro photography?",
    options: [
      { id: 'a', label: 'Macro lenses have inherently defective optics' },
      { id: 'b', label: 'The close focusing distance dramatically increases the circle of confusion size', correct: true },
      { id: 'c', label: 'Small subjects always appear blurry due to their size' },
      { id: 'd', label: 'Camera sensors struggle to resolve objects at close distances' }
    ],
    explanation: "At macro distances, the subject is extremely close to the lens, which dramatically increases the angular spread of light rays from any point. This creates larger circles of confusion even at narrow apertures, resulting in razor-thin depth of field measured in millimeters or less."
  },
  {
    scenario: "A smartphone user wonders why their phone's 'Portrait Mode' uses computational processing while their friend's full-frame DSLR creates natural background blur without any software tricks.",
    question: "Why do smartphones struggle to create optical background blur like DSLRs?",
    options: [
      { id: 'a', label: 'Smartphone cameras have lower megapixel counts' },
      { id: 'b', label: 'Their tiny sensors require short focal lengths, which create naturally deep depth of field', correct: true },
      { id: 'c', label: 'Smartphones only use digital zoom instead of optical zoom' },
      { id: 'd', label: 'Phone camera apps are not optimized for bokeh effects' }
    ],
    explanation: "Smartphones have tiny sensors (around 1/2.3 inch) requiring very short focal lengths (typically 4-7mm equivalent). The combination of small sensor and short focal length creates inherently deep depth of field. DSLRs with larger sensors use longer focal lengths at equivalent fields of view, enabling shallow depth of field optically."
  },
  {
    scenario: "A photographer learns about hyperfocal distance and wants to maximize the depth of field in their landscape shot using a 35mm lens at f/11 on a full-frame camera.",
    question: "What is the hyperfocal distance technique and how does it maximize depth of field?",
    options: [
      { id: 'a', label: 'Focusing on the closest object in the frame to emphasize foreground' },
      { id: 'b', label: 'Focusing at infinity to ensure distant mountains are sharp' },
      { id: 'c', label: 'Focusing at a calculated distance where everything from half that distance to infinity appears acceptably sharp', correct: true },
      { id: 'd', label: 'Using autofocus to automatically find the optimal focus point' }
    ],
    explanation: "The hyperfocal distance is the focus distance that maximizes depth of field. When focused at this distance, acceptable sharpness extends from half the hyperfocal distance to infinity. It's calculated based on focal length, aperture, and the acceptable circle of confusion size for the sensor format."
  },
  {
    scenario: "An optical engineer is designing a new camera system and must specify the maximum acceptable circle of confusion for their sensor to define what counts as 'sharp.'",
    question: "What determines the acceptable circle of confusion size for a camera system?",
    options: [
      { id: 'a', label: 'The maximum aperture of the lens' },
      { id: 'b', label: 'The sensor size, expected viewing distance, and print size', correct: true },
      { id: 'c', label: 'The shutter speed range of the camera' },
      { id: 'd', label: 'The focal length of the lens' }
    ],
    explanation: "The acceptable circle of confusion depends on sensor size and how the final image will be viewed. A larger print viewed up close requires a smaller CoC to appear sharp. For a full-frame sensor, the standard is about 0.03mm, but this varies based on output medium and viewing conditions."
  },
  {
    scenario: "A cinematographer is filming a dialogue scene and needs to shift audience attention from one actor to another mid-shot without cutting the camera.",
    question: "What technique uses depth of field to guide viewer attention in cinema?",
    options: [
      { id: 'a', label: 'Zooming between subjects during the shot' },
      { id: 'b', label: 'Rack focus or focus pulling to smoothly transition between subjects', correct: true },
      { id: 'c', label: 'Changing the aperture while filming' },
      { id: 'd', label: 'Moving the camera closer to subjects' }
    ],
    explanation: "Rack focus (focus pulling) smoothly shifts focus between subjects at different distances. Using shallow depth of field, only one subject is sharp at a time. A skilled focus puller adjusts focus during the shot, directing audience attention by making the intended subject sharp while others blur."
  },
  {
    scenario: "An architectural photographer is using a tilt-shift lens to photograph a tall building while keeping the entire facade sharp, even though the camera is tilted upward at an angle.",
    question: "How do tilt-shift lenses manipulate depth of field differently than standard lenses?",
    options: [
      { id: 'a', label: 'They use larger apertures to gather more light' },
      { id: 'b', label: 'They tilt the focus plane using the Scheimpflug principle so it no longer parallels the sensor', correct: true },
      { id: 'c', label: 'They digitally extend the depth of field through in-lens processing' },
      { id: 'd', label: 'They mechanically reduce the circle of confusion size' }
    ],
    explanation: "Tilt-shift lenses can angle the focus plane relative to the sensor using the Scheimpflug principle. This allows the plane of focus to align with non-parallel surfaces like building facades or tabletops, achieving sharp focus across subjects at varying distances without stopping down to tiny apertures."
  },
  {
    scenario: "A wildlife photographer notices that using a 600mm telephoto lens produces much more background blur than their 50mm lens, even when both are set to the same f/4 aperture.",
    question: "Why do longer focal length lenses create more background blur at the same aperture?",
    options: [
      { id: 'a', label: 'Longer lenses have larger glass elements that collect more light' },
      { id: 'b', label: 'Longer lenses have physically larger aperture openings and compress the perspective, magnifying background blur', correct: true },
      { id: 'c', label: 'Telephoto lenses have special coatings that enhance blur' },
      { id: 'd', label: 'The blur is an optical illusion caused by the narrow field of view' }
    ],
    explanation: "At f/4, a 600mm lens has a 150mm physical aperture opening (600/4), while a 50mm lens has only 12.5mm (50/4). The larger physical aperture creates larger circles of confusion. Additionally, the telephoto compression magnifies the background relative to the subject, making the blur appear even more pronounced."
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export default function DepthOfFieldRenderer({
  phase,
  onPhaseComplete,
  onCorrectAnswer,
  onIncorrectAnswer,
}: DepthOfFieldRendererProps) {
  // State management
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState(0);
  const [completedApps, setCompletedApps] = useState<boolean[]>([false, false, false, false]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Interactive simulation state
  const [apertureSize, setApertureSize] = useState(50);
  const [subjectDistance, setSubjectDistance] = useState(100);
  const [focusDistance, setFocusDistance] = useState(100);
  const [showRayCone, setShowRayCone] = useState(true);

  // Navigation refs
  const navigationLockRef = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Sound function
  const playSound = useCallback((type: 'click' | 'success' | 'failure' | 'transition' | 'complete') => {
    if (typeof window === 'undefined') return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      const sounds = {
        click: { freq: 600, duration: 0.1, type: 'sine' as OscillatorType },
        success: { freq: 800, duration: 0.2, type: 'sine' as OscillatorType },
        failure: { freq: 300, duration: 0.3, type: 'sine' as OscillatorType },
        transition: { freq: 500, duration: 0.15, type: 'sine' as OscillatorType },
        complete: { freq: 900, duration: 0.4, type: 'sine' as OscillatorType }
      };
      const sound = sounds[type];
      oscillator.frequency.value = sound.freq;
      oscillator.type = sound.type;
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + sound.duration);
    } catch { /* Audio not available */ }
  }, []);

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

  // Cleanup
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // =============================================================================
  // PHYSICS CALCULATIONS
  // =============================================================================
  const calculateCircleOfConfusion = useCallback((objectDist: number, focusDist: number, aperture: number): number => {
    // Simplified circle of confusion calculation
    // CoC proportional to aperture * |1/objectDist - 1/focusDist|
    const focusError = Math.abs(1 / objectDist - 1 / focusDist);
    return aperture * focusError * 500;
  }, []);

  const getBlurAmount = useCallback((distance: number): number => {
    return calculateCircleOfConfusion(distance, focusDistance, apertureSize);
  }, [calculateCircleOfConfusion, focusDistance, apertureSize]);

  // =============================================================================
  // NAVIGATION HANDLERS
  // =============================================================================
  const handleCompleteApp = useCallback(() => {
    const newCompleted = [...completedApps];
    newCompleted[selectedApp] = true;
    setCompletedApps(newCompleted);

    if (selectedApp < realWorldApps.length - 1) {
      setSelectedApp(selectedApp + 1);
    }
  }, [completedApps, selectedApp]);

  const handleAnswerSelect = useCallback(
    (answerId: string) => {
      if (showResult || navigationLockRef.current) return;
      navigationLockRef.current = true;

      setSelectedAnswer(answerId);
      setShowResult(true);

      const currentQ = testQuestions[currentQuestion];
      const isCorrect = currentQ.options.find(o => o.id === answerId)?.correct || false;

      if (isCorrect) {
        setScore((prev) => prev + 1);
        playSound('success');
        if (onCorrectAnswer) onCorrectAnswer();
      } else {
        playSound('failure');
        if (onIncorrectAnswer) onIncorrectAnswer();
      }

      navigationTimeoutRef.current = setTimeout(() => {
        navigationLockRef.current = false;
      }, 300);
    },
    [showResult, currentQuestion, onCorrectAnswer, onIncorrectAnswer, playSound]
  );

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < testQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setTestSubmitted(true);
    }
  }, [currentQuestion]);

  const handlePhaseComplete = useCallback(() => {
    if (navigationLockRef.current) return;
    navigationLockRef.current = true;
    playSound('transition');
    if (onPhaseComplete) onPhaseComplete();
    navigationTimeoutRef.current = setTimeout(() => {
      navigationLockRef.current = false;
    }, 500);
  }, [playSound, onPhaseComplete]);

  const allAppsCompleted = completedApps.every(Boolean);
  const currentPhaseIndex = phaseOrder.indexOf(phase);

  // =============================================================================
  // RAY CONE VISUALIZATION - Premium SVG Graphics
  // =============================================================================
  const renderRayConeVisualization = useCallback(() => {
    const width = isMobile ? 320 : 550;
    const height = isMobile ? 350 : 400;

    // Scene setup
    const lensX = width * 0.5;
    const lensY = height * 0.5;
    const sensorX = width * 0.85;
    const apertureRadius = apertureSize * 0.3;

    // Calculate positions
    const subjectX = 50 + (subjectDistance / 200) * (lensX - 80);
    const backgroundX = 30;
    const foregroundX = lensX - 30;

    // Calculate where focused rays converge
    const focusedObjX = 50 + (focusDistance / 200) * (lensX - 80);

    // Calculate blur circles on sensor
    const subjectBlur = getBlurAmount(subjectDistance);
    const backgroundBlur = getBlurAmount(30); // Fixed far background
    const foregroundBlur = getBlurAmount(180); // Fixed near foreground

    // Determine if subject is in focus
    const subjectInFocus = Math.abs(subjectDistance - focusDistance) < 10;

    // Bokeh particles for out-of-focus areas
    const bokehParticles = [];
    const bokehCount = Math.floor(apertureSize / 10);
    for (let i = 0; i < bokehCount; i++) {
      bokehParticles.push({
        x: 20 + Math.random() * 60,
        y: lensY - 80 + Math.random() * 160,
        r: 3 + Math.random() * 8,
        opacity: 0.1 + Math.random() * 0.3,
      });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: defined.spacing.md }}>
        {/* SVG Labels moved outside */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: width,
          paddingLeft: '20px',
          paddingRight: '20px',
        }}>
          <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Scene (objects)</span>
          <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Lens</span>
          <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Sensor</span>
        </div>

        <svg width={width} height={height - 30} viewBox={`0 0 ${width} ${height - 30}`} role="img" aria-label="Depth of field ray diagram simulation" style={{ overflow: 'visible' }}>
          <defs>
            {/* Premium lab background gradient */}
            <linearGradient id="dofLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a0f1a" />
              <stop offset="25%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="75%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#0a0f1a" />
            </linearGradient>

            {/* Camera lens glass gradient with depth */}
            <radialGradient id="dofLensGlass" cx="30%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.4" />
              <stop offset="20%" stopColor="#67e8f9" stopOpacity="0.3" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="80%" stopColor="#0891b2" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0e7490" stopOpacity="0.1" />
            </radialGradient>

            {/* Lens edge metallic gradient */}
            <linearGradient id="dofLensMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="25%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#64748b" />
              <stop offset="75%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Aperture blade gradient */}
            <linearGradient id="dofApertureBlades" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e1e1e" />
              <stop offset="20%" stopColor="#3f3f3f" />
              <stop offset="50%" stopColor="#2a2a2a" />
              <stop offset="80%" stopColor="#3f3f3f" />
              <stop offset="100%" stopColor="#1e1e1e" />
            </linearGradient>

            {/* Focus plane glow gradient */}
            <linearGradient id="dofFocusPlane" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
              <stop offset="20%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#4ade80" stopOpacity="0.6" />
              <stop offset="80%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>

            {/* Sensor gradient */}
            <linearGradient id="dofSensorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="30%" stopColor="#374151" />
              <stop offset="50%" stopColor="#4b5563" />
              <stop offset="70%" stopColor="#374151" />
              <stop offset="100%" stopColor="#1f2937" />
            </linearGradient>

            {/* Circle of confusion blur gradient */}
            <radialGradient id="dofCoCGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#ec4899" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#db2777" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#be185d" stopOpacity="0" />
            </radialGradient>

            {/* Sharp focus point gradient */}
            <radialGradient id="dofSharpFocus" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#86efac" stopOpacity="1" />
              <stop offset="40%" stopColor="#4ade80" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#22c55e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>

            {/* Ray beam gradient - incoming */}
            <linearGradient id="dofRayIn" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
            </linearGradient>

            {/* Ray beam gradient - to sensor (focused) */}
            <linearGradient id="dofRayFocused" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="1" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0.6" />
            </linearGradient>

            {/* Ray beam gradient - to sensor (blurred) */}
            <linearGradient id="dofRayBlurred" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="1" />
              <stop offset="50%" stopColor="#ec4899" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#db2777" stopOpacity="0.6" />
            </linearGradient>

            {/* Bokeh circle gradient */}
            <radialGradient id="dofBokeh" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
            </radialGradient>

            {/* Subject glow gradient */}
            <radialGradient id="dofSubjectGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={subjectInFocus ? '#86efac' : '#fcd34d'} stopOpacity="1" />
              <stop offset="50%" stopColor={subjectInFocus ? '#4ade80' : '#fbbf24'} stopOpacity="0.6" />
              <stop offset="100%" stopColor={subjectInFocus ? '#22c55e' : '#f59e0b'} stopOpacity="0" />
            </radialGradient>

            {/* Tree foliage gradient */}
            <radialGradient id="dofTreeFoliage" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#16a34a" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#15803d" stopOpacity="0.3" />
            </radialGradient>

            {/* Foreground object gradient */}
            <linearGradient id="dofForegroundObj" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="30%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Glow filter for lens */}
            <filter id="dofLensGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glow filter for focus point */}
            <filter id="dofFocusGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft blur for bokeh effect */}
            <filter id="dofBokehBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>

            {/* Ray glow filter */}
            <filter id="dofRayGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Soft glow for subject */}
            <filter id="dofSubjectFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* CoC blur filter */}
            <filter id="dofCoCBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Premium dark lab background */}
          <rect width={width} height={height - 30} fill="url(#dofLabBg)" rx="12" />

          {/* Subtle grid pattern for depth */}
          <pattern id="dofLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#334155" strokeWidth="0.3" strokeOpacity="0.2" />
          </pattern>
          <rect width={width} height={height - 30} fill="url(#dofLabGrid)" rx="12" />

          {/* Bokeh particles in background (out-of-focus aesthetic) */}
          <g filter="url(#dofBokehBlur)">
            {bokehParticles.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="url(#dofBokeh)" opacity={p.opacity} />
            ))}
          </g>

          {/* Optical axis with gradient effect */}
          <line x1="20" y1={lensY} x2={width - 20} y2={lensY} stroke="#475569" strokeWidth="1" strokeDasharray="6,4" opacity="0.6" />

          {/* Focus plane visualization */}
          <rect x={focusedObjX - 2} y={lensY - 70} width="4" height="140" fill="url(#dofFocusPlane)" opacity="0.5" />

          {/* Camera lens body - outer ring */}
          <ellipse cx={lensX} cy={lensY} rx="18" ry={apertureRadius + 35} fill="url(#dofLensMetal)" stroke="#1e293b" strokeWidth="2" />

          {/* Camera lens - glass element */}
          <ellipse cx={lensX} cy={lensY} rx="12" ry={apertureRadius + 25} fill="url(#dofLensGlass)" filter="url(#dofLensGlow)" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.5" />

          {/* Aperture opening visualization */}
          <ellipse cx={lensX} cy={lensY} rx="4" ry={apertureRadius} fill="#030712" stroke="url(#dofApertureBlades)" strokeWidth="2" />

          {/* Aperture blades indicator - top */}
          <g>
            <line x1={lensX - 6} y1={lensY - apertureRadius - 3} x2={lensX + 6} y2={lensY - apertureRadius - 3} stroke="#1e1e1e" strokeWidth="4" strokeLinecap="round" />
            <line x1={lensX - 4} y1={lensY - apertureRadius - 3} x2={lensX + 4} y2={lensY - apertureRadius - 3} stroke="#4b4b4b" strokeWidth="2" strokeLinecap="round" />
          </g>
          {/* Aperture blades indicator - bottom */}
          <g>
            <line x1={lensX - 6} y1={lensY + apertureRadius + 3} x2={lensX + 6} y2={lensY + apertureRadius + 3} stroke="#1e1e1e" strokeWidth="4" strokeLinecap="round" />
            <line x1={lensX - 4} y1={lensY + apertureRadius + 3} x2={lensX + 4} y2={lensY + apertureRadius + 3} stroke="#4b4b4b" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Sensor with premium gradient */}
          <rect x={sensorX - 6} y={lensY - 80} width="12" height="160" fill="url(#dofSensorGradient)" stroke="#6b7280" strokeWidth="1" rx="2" />
          {/* Sensor active area glow */}
          <rect x={sensorX - 4} y={lensY - 75} width="8" height="150" fill="#1f2937" stroke="#4b5563" strokeWidth="0.5" rx="1" opacity="0.8" />

          {/* Background object (tree icon) with gradient */}
          <g transform={`translate(${backgroundX}, ${lensY})`} filter="url(#dofBokehBlur)">
            <line x1="0" y1="0" x2="0" y2="-40" stroke="#166534" strokeWidth="5" strokeLinecap="round" />
            <circle cx="0" cy="-50" r="18" fill="url(#dofTreeFoliage)" />
            <circle cx="-8" cy="-42" r="10" fill="url(#dofTreeFoliage)" opacity="0.8" />
            <circle cx="8" cy="-42" r="10" fill="url(#dofTreeFoliage)" opacity="0.8" />
          </g>

          {/* Subject (person icon) with glow */}
          <g transform={`translate(${subjectX}, ${lensY})`} filter="url(#dofSubjectFilter)">
            <circle cx="0" cy="-35" r="14" fill="url(#dofSubjectGlow)" />
            <circle cx="0" cy="-35" r="10" fill={subjectInFocus ? '#4ade80' : '#fbbf24'} />
            <line x1="0" y1="-21" x2="0" y2="12" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="4" strokeLinecap="round" />
            <line x1="-16" y1="-8" x2="16" y2="-8" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="4" strokeLinecap="round" />
            <line x1="-8" y1="12" x2="-12" y2="30" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeLinecap="round" />
            <line x1="8" y1="12" x2="12" y2="30" stroke={subjectInFocus ? '#22c55e' : '#f59e0b'} strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Foreground object with gradient */}
          <g transform={`translate(${foregroundX}, ${lensY})`} filter="url(#dofBokehBlur)">
            <rect x="-10" y="-25" width="20" height="40" fill="url(#dofForegroundObj)" rx="3" />
            <rect x="-6" y="-20" width="12" height="30" fill="#fcd34d" opacity="0.4" rx="2" />
          </g>

          {/* Ray cone from subject through lens */}
          {showRayCone && (
            <g>
              {/* Top ray - incoming */}
              <line x1={subjectX} y1={lensY - 30} x2={lensX} y2={lensY - apertureRadius} stroke="url(#dofRayIn)" strokeWidth="2" filter="url(#dofRayGlow)" />
              {/* Bottom ray - incoming */}
              <line x1={subjectX} y1={lensY - 30} x2={lensX} y2={lensY + apertureRadius} stroke="url(#dofRayIn)" strokeWidth="2" filter="url(#dofRayGlow)" />

              {/* Rays to sensor - convergence depends on focus */}
              {subjectInFocus ? (
                <g>
                  <line x1={lensX} y1={lensY - apertureRadius} x2={sensorX} y2={lensY - 20} stroke="url(#dofRayFocused)" strokeWidth="2" filter="url(#dofRayGlow)" />
                  <line x1={lensX} y1={lensY + apertureRadius} x2={sensorX} y2={lensY - 20} stroke="url(#dofRayFocused)" strokeWidth="2" filter="url(#dofRayGlow)" />
                  <circle cx={sensorX} cy={lensY - 20} r="6" fill="url(#dofSharpFocus)" filter="url(#dofFocusGlow)" />
                </g>
              ) : (
                <g>
                  <line x1={lensX} y1={lensY - apertureRadius} x2={sensorX} y2={lensY - 20 - subjectBlur / 2} stroke="url(#dofRayBlurred)" strokeWidth="2" filter="url(#dofRayGlow)" />
                  <line x1={lensX} y1={lensY + apertureRadius} x2={sensorX} y2={lensY - 20 + subjectBlur / 2} stroke="url(#dofRayBlurred)" strokeWidth="2" filter="url(#dofRayGlow)" />
                  <ellipse cx={sensorX} cy={lensY - 20} rx="5" ry={Math.max(6, subjectBlur / 2)} fill="url(#dofCoCGradient)" filter="url(#dofCoCBlur)" />
                </g>
              )}
            </g>
          )}

          {/* Circle of Confusion indicators on sensor */}
          <g transform={`translate(${sensorX}, ${lensY})`}>
            {/* Background blur circle */}
            <circle cx="0" cy="40" r={Math.max(3, Math.min(22, backgroundBlur / 2))} fill="url(#dofCoCGradient)" filter="url(#dofCoCBlur)" opacity="0.7" />
            {/* Foreground blur circle */}
            <circle cx="0" cy="-50" r={Math.max(3, Math.min(18, foregroundBlur / 2))} fill="url(#dofCoCGradient)" filter="url(#dofCoCBlur)" opacity="0.7" />
          </g>
        </svg>

        {/* Labels moved outside SVG using typo system */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: width,
          marginTop: '-8px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Far BG</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: defined.colors.text.secondary, fontSize: typo.label }}>Subject</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>Near FG</span>
          </div>
          <div style={{ textAlign: 'center', marginLeft: 'auto' }}>
            <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>BG blur</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>FG blur</span>
          </div>
        </div>

        {/* Focus plane and sharp/blur status */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: defined.spacing.lg,
          width: '100%',
          maxWidth: width,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: defined.colors.success }} />
            <span style={{ color: defined.colors.text.secondary, fontSize: typo.small }}>Focus plane</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: subjectInFocus ? defined.colors.success : defined.colors.warning }} />
            <span style={{ color: subjectInFocus ? defined.colors.success : defined.colors.warning, fontSize: typo.small }}>
              {subjectInFocus ? 'Sharp' : 'Circle of Confusion'}
            </span>
          </div>
        </div>

        {/* Aperture indicator */}
        <div style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: `${defined.spacing.sm} ${defined.spacing.md}`,
          display: 'flex',
          alignItems: 'center',
          gap: defined.spacing.md,
        }}>
          <span style={{ color: defined.colors.accent, fontSize: typo.body, fontWeight: defined.typography.weights.semibold }}>
            Aperture: f/{(100 / apertureSize).toFixed(1)}
          </span>
          <span style={{ color: defined.colors.text.muted, fontSize: typo.label }}>
            {apertureSize > 60 ? '(Wide - Shallow DOF)' : apertureSize > 30 ? '(Medium)' : '(Narrow - Deep DOF)'}
          </span>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          gap: defined.spacing.md,
          background: defined.colors.background.card,
          padding: defined.spacing.sm,
          borderRadius: defined.radius.md,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)' }} />
            <span style={{ color: defined.colors.text.secondary, fontSize: typo.label }}>In focus</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)' }} />
            <span style={{ color: defined.colors.text.secondary, fontSize: typo.label }}>Circle of confusion</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
          gap: defined.spacing.md,
          width: '100%',
          maxWidth: '550px',
        }}>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.accent, fontSize: typo.small, display: 'block', marginBottom: '4px' }}>
              Aperture: f/{(100 / apertureSize).toFixed(1)}
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={apertureSize}
              onChange={(e) => setApertureSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ color: defined.colors.text.muted, fontSize: typo.label, marginTop: '4px' }}>
              {apertureSize > 60 ? 'Wide (shallow DOF)' : apertureSize > 30 ? 'Medium' : 'Narrow (deep DOF)'}
            </div>
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.success, fontSize: typo.small, display: 'block', marginBottom: '4px' }}>
              Subject Distance: {subjectDistance}
            </label>
            <input
              type="range"
              min="50"
              max="180"
              value={subjectDistance}
              onChange={(e) => setSubjectDistance(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ background: defined.colors.background.card, padding: defined.spacing.md, borderRadius: defined.radius.lg }}>
            <label style={{ color: defined.colors.primary, fontSize: typo.small, display: 'block', marginBottom: '4px' }}>
              Focus Distance: {focusDistance}
            </label>
            <input
              type="range"
              min="50"
              max="180"
              value={focusDistance}
              onChange={(e) => setFocusDistance(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setShowRayCone(!showRayCone)}
          style={{
            padding: `${defined.spacing.sm} ${defined.spacing.md}`,
            background: showRayCone ? `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})` : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            fontSize: typo.small,
            boxShadow: showRayCone ? `0 4px 15px ${defined.colors.primary}40` : 'none',
          }}
        >
          {showRayCone ? 'Hide' : 'Show'} Ray Cone
        </button>
      </div>
    );
  }, [isMobile, apertureSize, subjectDistance, focusDistance, showRayCone, getBlurAmount, typo]);

  // =============================================================================
  // ICON COMPONENT
  // =============================================================================
  const getIcon = (iconName: string) => {
    const icons: Record<string, JSX.Element> = {
      Camera: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      ),
      Search: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
      ),
      Film: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
          <line x1="7" y1="2" x2="7" y2="22"/>
          <line x1="17" y1="2" x2="17" y2="22"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <line x1="2" y1="7" x2="7" y2="7"/>
          <line x1="2" y1="17" x2="7" y2="17"/>
          <line x1="17" y1="17" x2="22" y2="17"/>
          <line x1="17" y1="7" x2="22" y2="7"/>
        </svg>
      ),
      Smartphone: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
          <line x1="12" y1="18" x2="12.01" y2="18"/>
        </svg>
      ),
    };
    return icons[iconName] || icons.Camera;
  };

  // =============================================================================
  // PHASE RENDERERS
  // =============================================================================
  const renderHook = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      padding: defined.spacing.lg,
    }}>
      <div style={{
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: defined.radius.full,
        padding: `${defined.spacing.sm} ${defined.spacing.md}`,
        marginBottom: defined.spacing.lg,
      }}>
        <span style={{ color: defined.colors.primary, fontSize: defined.typography.sizes.sm }}>OPTICS & PHOTOGRAPHY</span>
      </div>

      <h1 style={{
        fontSize: isMobile ? defined.typography.sizes['2xl'] : defined.typography.sizes['3xl'],
        fontWeight: defined.typography.weights.bold,
        color: defined.colors.text.primary,
        marginBottom: defined.spacing.md,
        lineHeight: 1.2,
      }}>
        Why Do Professional Photos Have That Dreamy Blur?
      </h1>

      <p style={{
        color: '#e2e8f0',
        fontSize: defined.typography.sizes.lg,
        maxWidth: '500px',
        marginBottom: defined.spacing.xl,
        lineHeight: 1.6,
      }}>
        You have seen it a thousand times: a portrait where the person is razor-sharp but the background melts into smooth, creamy blur. Your phone Portrait Mode tries to fake it. But what is actually happening with light to create this effect?
      </p>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.xl,
        padding: defined.spacing.xl,
        maxWidth: '450px',
        marginBottom: defined.spacing.xl,
        border: '1px solid rgba(99, 102, 241, 0.2)',
      }}>
        <div style={{ marginBottom: defined.spacing.md }}>
          <svg width="200" height="120" viewBox="0 0 200 120" role="img" aria-label="Depth of field camera lens illustration" style={{ margin: '0 auto', display: 'block' }}>
            <circle cx="100" cy="60" r="45" fill="none" stroke="#6366F1" strokeWidth="3"/>
            <circle cx="100" cy="60" r="28" fill="none" stroke="#6366F1" strokeWidth="2"/>
            <circle cx="100" cy="60" r="12" fill="#6366F1"/>
            <circle cx="70" cy="35" r="5" fill="#F472B6" opacity="0.7"/>
            <circle cx="140" cy="85" r="7" fill="#F472B6" opacity="0.5"/>
            <circle cx="150" cy="35" r="6" fill="#F472B6" opacity="0.6"/>
          </svg>
        </div>
        <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.base, lineHeight: 1.6 }}>
          The answer lies in something photographers call the <span style={{ color: defined.colors.lens.blur, fontWeight: defined.typography.weights.semibold }}>circle of confusion</span> - how light rays spread when they do not converge perfectly on the camera sensor.
        </p>
        <p style={{ color: defined.colors.accent, marginTop: defined.spacing.md, fontWeight: defined.typography.weights.semibold }}>
          Master this, and you'll understand every camera ever made!
        </p>
      </div>

      <button
        onClick={handlePhaseComplete}
        style={{
          background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
          color: defined.colors.text.primary,
          border: 'none',
          borderRadius: defined.radius.lg,
          padding: `${defined.spacing.md} ${defined.spacing.xl}`,
          fontSize: defined.typography.sizes.lg,
          fontWeight: defined.typography.weights.semibold,
          cursor: 'pointer',
          boxShadow: defined.shadows.glow,
          minHeight: '44px',
        }}
      >
        Discover Depth of Field
      </button>
    </div>
  );

  const renderPredict = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '600px', margin: '0 auto' }}>
      {/* Progress indicator */}
      <div style={{ textAlign: 'center', marginBottom: defined.spacing.md }}>
        <span style={{ color: '#e2e8f0', fontSize: typo.small }}>
          Step 1 of 1 - Make your prediction
        </span>
      </div>

      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.lg, fontSize: typo.heading }}>
        Make Your Prediction
      </h2>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
        border: '1px solid rgba(99, 102, 241, 0.2)',
      }}>
        <p style={{ color: '#e2e8f0', marginBottom: defined.spacing.md, lineHeight: 1.6 }}>
          You want to photograph a flower with a beautifully blurred background. You have three options: open your aperture wider (lower f-number), move closer to the flower, or use a longer focal length lens.
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold }}>
          Which single factor has the BIGGEST direct effect on background blur?
        </p>
      </div>

      {[
        { id: 'A', text: 'Aperture size (f-number)' },
        { id: 'B', text: 'Distance to subject' },
        { id: 'C', text: 'Focal length of lens' },
        { id: 'D', text: 'Sensor size' },
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => setPrediction(option.id)}
          aria-pressed={prediction === option.id}
          style={{
            width: '100%',
            padding: defined.spacing.md,
            marginBottom: defined.spacing.sm,
            background: prediction === option.id
              ? `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`
              : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: prediction === option.id ? `2px solid ${defined.colors.primary}` : '2px solid transparent',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: typo.body,
            transition: 'all 0.2s ease',
            minHeight: '44px',
          }}
        >
          {option.id}. {option.text}
        </button>
      ))}

      {prediction && (
        <div style={{
          background: prediction === 'A' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${prediction === 'A' ? defined.colors.success : defined.colors.warning}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          marginTop: defined.spacing.lg,
        }}>
          <p style={{ color: prediction === 'A' ? defined.colors.success : defined.colors.warning, fontWeight: defined.typography.weights.semibold, marginBottom: defined.spacing.sm }}>
            {prediction === 'A' ? 'Correct!' : 'Good thinking, but not quite!'}
          </p>
          <p style={{ color: '#e2e8f0', lineHeight: 1.6 }}>
            Aperture has the most direct effect on depth of field. A wider aperture (like f/1.8) creates a larger cone of rays passing through the lens, which forms a larger blur disk (circle of confusion) for out-of-focus objects. All factors matter, but aperture is the most powerful tool photographers have!
          </p>
          <button
            onClick={handlePhaseComplete}
            style={{
              marginTop: defined.spacing.md,
              background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
              cursor: 'pointer',
              fontWeight: defined.typography.weights.semibold,
              minHeight: '44px',
            }}
          >
            See the Ray Diagram
          </button>
        </div>
      )}
    </div>
  );

  const renderPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.md, fontSize: typo.heading }}>
        Depth of Field Lab
      </h2>
      <p style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: defined.spacing.md, maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
        Adjust aperture, subject distance, and focus to see how blur circles form on the sensor.
      </p>

      {/* Observation guidance */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.15)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: defined.radius.md,
        padding: defined.spacing.md,
        marginBottom: defined.spacing.lg,
        maxWidth: '550px',
        margin: '0 auto',
        marginTop: defined.spacing.md,
      }}>
        <p style={{ color: '#e2e8f0', fontSize: typo.body, textAlign: 'center' }}>
          <strong>Observe:</strong> Use the sliders below to adjust aperture, subject distance, and focus. Watch how the blur circles change size on the sensor.
        </p>
      </div>

      <div style={{ marginTop: defined.spacing.lg }}>
        {renderRayConeVisualization()}
      </div>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginTop: defined.spacing.lg,
        maxWidth: '550px',
        margin: `${defined.spacing.lg} auto 0`,
        border: '1px solid rgba(99, 102, 241, 0.2)',
      }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.sm }}>Try These Experiments:</h3>
        <ul style={{ color: '#e2e8f0', paddingLeft: defined.spacing.lg, lineHeight: '2' }}>
          <li>Open the aperture wide - watch the blur circles grow</li>
          <li>Move the subject away from the focus distance</li>
          <li>Match subject distance to focus distance - see sharp focus</li>
          <li>Notice how the background is always more blurred than the foreground</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', marginTop: defined.spacing.lg }}>
        <button
          onClick={handlePhaseComplete}
          style={{
            background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            padding: `${defined.spacing.md} ${defined.spacing.xl}`,
            cursor: 'pointer',
            fontSize: typo.body,
            fontWeight: defined.typography.weights.semibold,
            minHeight: '44px',
          }}
        >
          Understand the Physics
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.lg, fontSize: typo.heading }}>
        The Physics of Depth of Field
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: defined.spacing.md,
        marginBottom: defined.spacing.lg,
      }}>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, border: '1px solid rgba(244, 114, 182, 0.3)' }}>
          <h3 style={{ color: defined.colors.lens.blur, marginBottom: defined.spacing.sm }}>Circle of Confusion</h3>
          <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, lineHeight: 1.6 }}>
            When a point is out of focus, light from it does not converge to a point on the sensor. Instead, it forms a disk. If this disk is small enough (below the eye resolving ability), we perceive it as sharp. Larger disks appear blurred.
          </p>
        </div>
        <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <h3 style={{ color: defined.colors.accent, marginBottom: defined.spacing.sm }}>F-Number Explained</h3>
          <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, lineHeight: 1.6 }}>
            f-number = focal length / aperture diameter. A lower f-number means a wider physical aperture opening, which creates a larger cone of light and bigger blur circles for out-of-focus areas.
          </p>
        </div>
      </div>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md, textAlign: 'center' }}>Aperture vs. Depth of Field</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: defined.spacing.md,
        }}>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs, color: defined.colors.success }}>f/1.4</div>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>Wide aperture<br/>Very shallow DOF<br/>Maximum blur</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs, color: defined.colors.accent }}>f/8</div>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>Medium aperture<br/>Moderate DOF<br/>Balanced</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: defined.spacing.xs, color: defined.colors.primary }}>f/22</div>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>Narrow aperture<br/>Very deep DOF<br/>Everything sharp</p>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: defined.radius.lg, padding: defined.spacing.lg, marginBottom: defined.spacing.lg }}>
        <h4 style={{ color: defined.colors.primary, marginBottom: defined.spacing.sm }}>The Key Insight</h4>
        <p style={{ color: '#e2e8f0', lineHeight: 1.6 }}>
          A point of light becomes a blur disk when out of focus. The size of this disk depends on the aperture opening size. Larger aperture = larger blur disk = shallower depth of field. This is pure geometry!
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handlePhaseComplete}
          style={{
            background: `linear-gradient(135deg, ${defined.colors.secondary}, ${defined.colors.primary})`,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            padding: `${defined.spacing.md} ${defined.spacing.xl}`,
            cursor: 'pointer',
            fontWeight: defined.typography.weights.semibold,
            minHeight: '44px',
          }}
        >
          See the Twist
        </button>
      </div>
    </div>
  );

  const renderTwistPredict = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '600px', margin: '0 auto' }}>
      {/* Progress indicator */}
      <div style={{ textAlign: 'center', marginBottom: defined.spacing.md }}>
        <span style={{ color: '#e2e8f0', fontSize: typo.small }}>
          Step 1 of 1 - Make your prediction
        </span>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: defined.radius.full,
        padding: `${defined.spacing.xs} ${defined.spacing.md}`,
        marginBottom: defined.spacing.lg,
        textAlign: 'center',
        width: 'fit-content',
        margin: '0 auto',
      }}>
        <span style={{ color: defined.colors.secondary, fontSize: defined.typography.sizes.sm }}>THE TWIST</span>
      </div>

      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.lg, fontSize: typo.heading }}>
        Distance Matters More Than You Think!
      </h2>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}>
        <p style={{ color: '#e2e8f0', marginBottom: defined.spacing.md, lineHeight: 1.6 }}>
          You are photographing a person with a tree 10 meters behind them. Without changing your aperture setting at all, you walk closer to the person (from 3m to 1.5m away) and refocus on their face.
        </p>
        <p style={{ color: defined.colors.text.primary, fontWeight: defined.typography.weights.semibold }}>
          What happens to the background tree blur?
        </p>
      </div>

      {[
        { id: 'A', text: 'Background blur decreases (tree becomes sharper)' },
        { id: 'B', text: 'Background blur increases (tree becomes more blurred)' },
        { id: 'C', text: 'Background blur stays exactly the same' },
        { id: 'D', text: 'The tree disappears from the frame entirely' },
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => setTwistPrediction(option.id)}
          aria-pressed={twistPrediction === option.id}
          style={{
            width: '100%',
            padding: defined.spacing.md,
            marginBottom: defined.spacing.sm,
            background: twistPrediction === option.id
              ? `linear-gradient(135deg, ${defined.colors.secondary}, ${defined.colors.primary})`
              : defined.colors.background.tertiary,
            color: defined.colors.text.primary,
            border: twistPrediction === option.id ? `2px solid ${defined.colors.secondary}` : '2px solid transparent',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: typo.body,
            minHeight: '44px',
          }}
        >
          {option.id}. {option.text}
        </button>
      ))}

      {twistPrediction && (
        <div style={{
          background: twistPrediction === 'B' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${twistPrediction === 'B' ? defined.colors.success : defined.colors.warning}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.lg,
          marginTop: defined.spacing.lg,
        }}>
          <p style={{ color: twistPrediction === 'B' ? defined.colors.success : defined.colors.warning, fontWeight: defined.typography.weights.semibold, marginBottom: defined.spacing.sm }}>
            {twistPrediction === 'B' ? 'Exactly right!' : 'Surprising, is it not?'}
          </p>
          <p style={{ color: '#e2e8f0', lineHeight: 1.6 }}>
            Moving closer to the subject while maintaining focus on them dramatically increases background blur! This is because the angular difference between the subject and background increases. The closer your subject, the relatively farther the background appears optically, creating larger circles of confusion.
          </p>
          <button
            onClick={handlePhaseComplete}
            style={{
              marginTop: defined.spacing.md,
              background: `linear-gradient(135deg, ${defined.colors.secondary}, ${defined.colors.primary})`,
              color: defined.colors.text.primary,
              border: 'none',
              borderRadius: defined.radius.md,
              padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
              cursor: 'pointer',
              fontWeight: defined.typography.weights.semibold,
              minHeight: '44px',
            }}
          >
            Experiment With This
          </button>
        </div>
      )}
    </div>
  );

  const renderTwistPlay = () => (
    <div style={{ padding: defined.spacing.lg }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.md, fontSize: typo.heading }}>
        Distance and Background Blur
      </h2>
      <p style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: defined.spacing.md, maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
        Keep aperture constant. Move the subject closer while keeping it in focus. Watch the background blur intensify!
      </p>

      {/* Observation guidance */}
      <div style={{
        background: 'rgba(139, 92, 246, 0.15)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: defined.radius.md,
        padding: defined.spacing.md,
        marginBottom: defined.spacing.lg,
        maxWidth: '550px',
        margin: '0 auto',
        marginTop: defined.spacing.md,
      }}>
        <p style={{ color: '#e2e8f0', fontSize: typo.body, textAlign: 'center' }}>
          <strong>Observe:</strong> Use the sliders to move the subject closer or farther. Notice how the background blur changes even without adjusting aperture.
        </p>
      </div>

      <div style={{ marginTop: defined.spacing.lg }}>
        {renderRayConeVisualization()}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: defined.spacing.md,
        marginTop: defined.spacing.lg,
        maxWidth: '600px',
        margin: `${defined.spacing.lg} auto 0`,
      }}>
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${defined.colors.success}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
        }}>
          <h4 style={{ color: defined.colors.success, marginBottom: defined.spacing.sm }}>Subject Closer (50-80)</h4>
          <ul style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md, lineHeight: 1.8 }}>
            <li>Subject fills more of the frame</li>
            <li>Background blur increases dramatically</li>
            <li>Shallower effective depth of field</li>
            <li>More professional portrait look</li>
          </ul>
        </div>
        <div style={{
          background: 'rgba(96, 165, 250, 0.1)',
          border: `1px solid ${defined.colors.lens.ray}`,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.md,
        }}>
          <h4 style={{ color: defined.colors.lens.ray, marginBottom: defined.spacing.sm }}>Subject Farther (150-180)</h4>
          <ul style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm, paddingLeft: defined.spacing.md, lineHeight: 1.8 }}>
            <li>Subject smaller in frame</li>
            <li>Background blur decreases</li>
            <li>Deeper effective depth of field</li>
            <li>More context visible and sharper</li>
          </ul>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: defined.spacing.lg }}>
        <button
          onClick={handlePhaseComplete}
          style={{
            background: `linear-gradient(135deg, ${defined.colors.secondary}, ${defined.colors.primary})`,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            padding: `${defined.spacing.md} ${defined.spacing.xl}`,
            cursor: 'pointer',
            fontWeight: defined.typography.weights.semibold,
            minHeight: '44px',
          }}
        >
          Review the Discovery
        </button>
      </div>
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ color: defined.colors.secondary, textAlign: 'center', marginBottom: defined.spacing.lg, fontSize: typo.heading }}>
        Key Discovery: Three Paths to Blur
      </h2>

      <div style={{ background: defined.colors.background.card, padding: defined.spacing.lg, borderRadius: defined.radius.lg, marginBottom: defined.spacing.lg, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md, textAlign: 'center' }}>Three Ways to Increase Background Blur</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: defined.spacing.md }}>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: defined.spacing.xs, color: '#e2e8f0' }}>1</div>
            <h4 style={{ color: defined.colors.accent, marginBottom: defined.spacing.xs }}>Open Aperture</h4>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>f/2.8 to f/1.4</p>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.xs, marginTop: defined.spacing.xs }}>Larger cone of light = bigger blur circles</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: defined.spacing.xs, color: '#e2e8f0' }}>2</div>
            <h4 style={{ color: defined.colors.success, marginBottom: defined.spacing.xs }}>Move Closer</h4>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>3m to 1m</p>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.xs, marginTop: defined.spacing.xs }}>Increases angular difference to background</p>
          </div>
          <div style={{ background: defined.colors.background.secondary, padding: defined.spacing.md, borderRadius: defined.radius.md, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: defined.spacing.xs, color: '#e2e8f0' }}>3</div>
            <h4 style={{ color: defined.colors.lens.ray, marginBottom: defined.spacing.xs }}>Longer Lens</h4>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>50mm to 200mm</p>
            <p style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.xs, marginTop: defined.spacing.xs }}>Larger physical aperture at same f-number</p>
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: defined.radius.lg, padding: defined.spacing.lg, marginBottom: defined.spacing.lg }}>
        <h4 style={{ color: defined.colors.secondary, marginBottom: defined.spacing.sm }}>Pro Tip: Combine All Three!</h4>
        <p style={{ color: '#e2e8f0', lineHeight: 1.6 }}>
          Professional portrait photographers use all three factors together: an 85mm lens (longer focal length) at f/1.4 (wide aperture) shot from about 2 meters (close distance). This combination creates the maximum possible subject isolation with beautifully smooth background blur.
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handlePhaseComplete}
          style={{
            background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            padding: `${defined.spacing.md} ${defined.spacing.xl}`,
            cursor: 'pointer',
            fontWeight: defined.typography.weights.semibold,
            minHeight: '44px',
          }}
        >
          Real-World Applications
        </button>
      </div>
    </div>
  );

  const renderTransfer = () => {
    const app = realWorldApps[selectedApp];

    return (
      <div style={{ padding: defined.spacing.lg, maxWidth: '900px', margin: '0 auto' }}>
        {/* Progress indicator */}
        <div style={{ textAlign: 'center', marginBottom: defined.spacing.md }}>
          <span style={{ color: '#e2e8f0', fontSize: typo.small }}>
            Application {selectedApp + 1} of {realWorldApps.length}
          </span>
        </div>

        <h2 style={{ color: defined.colors.text.primary, textAlign: 'center', marginBottom: defined.spacing.md, fontSize: typo.heading }}>
          Real-World Applications
        </h2>
        <p style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: defined.spacing.lg }}>
          Depth of field principles power industries worth billions of dollars
        </p>

        {/* App selector tabs */}
        <div style={{
          display: 'flex',
          gap: defined.spacing.sm,
          marginBottom: defined.spacing.lg,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {realWorldApps.map((a, i) => (
            <button
              key={i}
              onClick={() => setSelectedApp(i)}
              style={{
                padding: `${defined.spacing.sm} ${defined.spacing.md}`,
                background: selectedApp === i
                  ? `linear-gradient(135deg, ${a.color}, ${defined.colors.primaryDark})`
                  : defined.colors.background.tertiary,
                color: defined.colors.text.primary,
                border: selectedApp === i ? `2px solid ${a.color}` : '2px solid transparent',
                borderRadius: defined.radius.md,
                cursor: 'pointer',
                fontSize: typo.small,
                fontWeight: selectedApp === i ? defined.typography.weights.semibold : defined.typography.weights.normal,
                opacity: completedApps[i] ? 0.8 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: defined.spacing.xs,
              }}
            >
              <span style={{ color: a.color }}>{getIcon(a.icon)}</span>
              {a.title}
              {completedApps[i] && <span style={{ color: defined.colors.success }}>+</span>}
            </button>
          ))}
        </div>

        {/* Main application card */}
        <div style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.xl,
          padding: defined.spacing.xl,
          border: `1px solid ${app.color}40`,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: defined.spacing.md, marginBottom: defined.spacing.lg }}>
            <div style={{ color: app.color }}>{getIcon(app.icon)}</div>
            <div>
              <h3 style={{ color: defined.colors.text.primary, fontSize: typo.heading, marginBottom: '4px' }}>{app.title}</h3>
              <p style={{ color: app.color, fontSize: typo.small, fontStyle: 'italic' }}>{app.tagline}</p>
            </div>
          </div>

          {/* Description */}
          <p style={{ color: defined.colors.text.secondary, lineHeight: 1.7, marginBottom: defined.spacing.lg }}>
            {app.description}
          </p>

          {/* Connection to physics */}
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', borderRadius: defined.radius.lg, padding: defined.spacing.md, marginBottom: defined.spacing.lg, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h4 style={{ color: defined.colors.primary, marginBottom: defined.spacing.sm, fontSize: typo.body }}>Connection to Depth of Field</h4>
            <p style={{ color: defined.colors.text.secondary, fontSize: typo.small, lineHeight: 1.6 }}>{app.connection}</p>
          </div>

          {/* How it works */}
          <div style={{ marginBottom: defined.spacing.lg }}>
            <h4 style={{ color: defined.colors.text.primary, marginBottom: defined.spacing.sm }}>How It Works</h4>
            <p style={{ color: defined.colors.text.secondary, fontSize: typo.small, lineHeight: 1.7 }}>{app.howItWorks}</p>
          </div>

          {/* Stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: defined.spacing.md,
            marginBottom: defined.spacing.lg,
          }}>
            {app.stats.map((stat, i) => (
              <div key={i} style={{
                background: defined.colors.background.secondary,
                borderRadius: defined.radius.md,
                padding: defined.spacing.md,
                textAlign: 'center',
              }}>
                <div style={{ color: app.color, fontSize: typo.bodyLarge, fontWeight: defined.typography.weights.bold, marginBottom: '4px' }}>
                  {stat.value}
                </div>
                <div style={{ color: defined.colors.text.muted, fontSize: typo.label }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Examples */}
          <div style={{ marginBottom: defined.spacing.lg }}>
            <h4 style={{ color: defined.colors.text.primary, marginBottom: defined.spacing.sm }}>Real Examples</h4>
            <ul style={{ color: defined.colors.text.secondary, fontSize: typo.small, lineHeight: 2, paddingLeft: defined.spacing.lg }}>
              {app.examples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </div>

          {/* Companies */}
          <div style={{ marginBottom: defined.spacing.lg }}>
            <h4 style={{ color: defined.colors.text.primary, marginBottom: defined.spacing.sm }}>Key Companies</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: defined.spacing.sm }}>
              {app.companies.map((company, i) => (
                <span key={i} style={{
                  background: defined.colors.background.secondary,
                  color: defined.colors.text.secondary,
                  padding: `${defined.spacing.xs} ${defined.spacing.sm}`,
                  borderRadius: defined.radius.sm,
                  fontSize: typo.label,
                }}>
                  {company}
                </span>
              ))}
            </div>
          </div>

          {/* Future impact */}
          <div style={{ background: `${app.color}15`, borderRadius: defined.radius.lg, padding: defined.spacing.md, border: `1px solid ${app.color}30` }}>
            <h4 style={{ color: app.color, marginBottom: defined.spacing.sm, fontSize: typo.body }}>Future Impact</h4>
            <p style={{ color: defined.colors.text.secondary, fontSize: typo.small, lineHeight: 1.6 }}>{app.futureImpact}</p>
          </div>

          {/* Mark complete button */}
          {!completedApps[selectedApp] && (
            <button
              onClick={handleCompleteApp}
              style={{
                display: 'block',
                margin: `${defined.spacing.lg} auto 0`,
                padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
                background: `linear-gradient(135deg, ${defined.colors.success}, #059669)`,
                color: defined.colors.text.primary,
                border: 'none',
                borderRadius: defined.radius.md,
                cursor: 'pointer',
                fontWeight: defined.typography.weights.semibold,
                minHeight: '44px',
              }}
            >
              Mark as Understood
            </button>
          )}
        </div>

        {/* Navigation between applications */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: defined.spacing.lg,
          gap: defined.spacing.md,
        }}>
          {selectedApp > 0 ? (
            <button
              onClick={() => setSelectedApp(selectedApp - 1)}
              style={{
                padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
                background: defined.colors.background.tertiary,
                color: '#e2e8f0',
                border: 'none',
                borderRadius: defined.radius.md,
                cursor: 'pointer',
                fontWeight: defined.typography.weights.medium,
                minHeight: '44px',
              }}
            >
              Previous
            </button>
          ) : <div />}

          {selectedApp < realWorldApps.length - 1 ? (
            <button
              onClick={() => {
                if (!completedApps[selectedApp]) {
                  handleCompleteApp();
                }
                setSelectedApp(selectedApp + 1);
              }}
              style={{
                padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
                background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
                color: defined.colors.text.primary,
                border: 'none',
                borderRadius: defined.radius.md,
                cursor: 'pointer',
                fontWeight: defined.typography.weights.semibold,
                minHeight: '44px',
              }}
            >
              Next Application
            </button>
          ) : (
            <button
              onClick={handlePhaseComplete}
              style={{
                padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
                background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
                color: defined.colors.text.primary,
                border: 'none',
                borderRadius: defined.radius.md,
                cursor: 'pointer',
                fontWeight: defined.typography.weights.semibold,
                minHeight: '44px',
                boxShadow: defined.shadows.glow,
              }}
            >
              Take the Knowledge Test
            </button>
          )}
        </div>

        {/* Progress status */}
        <div style={{ textAlign: 'center', marginTop: defined.spacing.lg }}>
          <p style={{ color: '#e2e8f0', marginBottom: defined.spacing.md }}>
            {completedApps.filter(Boolean).length} of {realWorldApps.length} applications explored
          </p>
        </div>
      </div>
    );
  };

  const renderTest = () => {
    const question = testQuestions[currentQuestion];

    if (testSubmitted) {
      const passed = score >= 7;
      const percentage = Math.round((score / testQuestions.length) * 100);

      return (
        <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
          <div style={{
            background: passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${passed ? defined.colors.success : defined.colors.error}`,
            borderRadius: defined.radius.xl,
            padding: defined.spacing.xl,
            textAlign: 'center',
            marginBottom: defined.spacing.lg,
          }}>
            <div style={{ fontSize: '4rem', marginBottom: defined.spacing.md }}>
              {passed ? '🎉' : '📚'}
            </div>
            <h2 style={{ color: passed ? defined.colors.success : defined.colors.error, marginBottom: defined.spacing.md, fontSize: typo.heading }}>
              {passed ? 'Excellent Work!' : 'Keep Learning!'}
            </h2>
            <p style={{ color: defined.colors.text.primary, fontSize: defined.typography.sizes['2xl'], fontWeight: defined.typography.weights.bold }}>
              {score} / {testQuestions.length} ({percentage}%)
            </p>
            <p style={{ color: defined.colors.text.secondary, marginTop: defined.spacing.md }}>
              {passed
                ? 'You have demonstrated mastery of depth of field concepts!'
                : 'Review the material and try again to strengthen your understanding.'}
            </p>
          </div>
          {passed && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={handlePhaseComplete}
                style={{
                  background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
                  color: defined.colors.text.primary,
                  border: 'none',
                  borderRadius: defined.radius.md,
                  padding: `${defined.spacing.md} ${defined.spacing.xl}`,
                  cursor: 'pointer',
                  fontWeight: defined.typography.weights.semibold,
                  boxShadow: defined.shadows.glow,
                }}
              >
                Continue to Mastery
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ padding: defined.spacing.lg, maxWidth: '700px', margin: '0 auto' }}>
        {/* Progress header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: defined.spacing.lg,
        }}>
          <span style={{ color: '#e2e8f0' }}>
            Q{currentQuestion + 1} of {testQuestions.length}
          </span>
          <span style={{ color: defined.colors.success, fontWeight: defined.typography.weights.semibold }}>
            Score: {score}/{currentQuestion + (showResult ? 1 : 0)}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%',
          height: '4px',
          background: defined.colors.background.tertiary,
          borderRadius: defined.radius.full,
          marginBottom: defined.spacing.lg,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${((currentQuestion + (showResult ? 1 : 0)) / testQuestions.length) * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${defined.colors.primary}, ${defined.colors.secondary})`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Question card */}
        <div style={{
          background: defined.colors.background.card,
          borderRadius: defined.radius.lg,
          padding: defined.spacing.xl,
          marginBottom: defined.spacing.lg,
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
          {/* Scenario */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: defined.radius.md,
            padding: defined.spacing.md,
            marginBottom: defined.spacing.lg,
            borderLeft: `3px solid ${defined.colors.primary}`,
          }}>
            <p style={{ color: defined.colors.text.secondary, fontSize: typo.small, lineHeight: 1.6, fontStyle: 'italic' }}>
              {question.scenario}
            </p>
          </div>

          {/* Question */}
          <h3 style={{ color: defined.colors.text.primary, marginBottom: defined.spacing.lg, fontSize: typo.bodyLarge, lineHeight: 1.5 }}>
            {question.question}
          </h3>

          {/* Options */}
          {question.options.map((option) => {
            let bg = defined.colors.background.tertiary;
            let border = 'transparent';
            let textColor = defined.colors.text.primary;

            if (showResult) {
              if (option.correct) {
                bg = 'rgba(16, 185, 129, 0.2)';
                border = defined.colors.success;
                textColor = defined.colors.success;
              } else if (option.id === selectedAnswer) {
                bg = 'rgba(239, 68, 68, 0.2)';
                border = defined.colors.error;
                textColor = defined.colors.error;
              }
            } else if (option.id === selectedAnswer) {
              bg = `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`;
            }

            return (
              <button
                key={option.id}
                onClick={() => handleAnswerSelect(option.id)}
                disabled={showResult}
                style={{
                  width: '100%',
                  padding: defined.spacing.md,
                  marginBottom: defined.spacing.sm,
                  background: bg,
                  color: textColor,
                  border: `2px solid ${border}`,
                  borderRadius: defined.radius.md,
                  cursor: showResult ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontSize: typo.body,
                  opacity: showResult && !option.correct && option.id !== selectedAnswer ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontWeight: defined.typography.weights.semibold, marginRight: defined.spacing.sm }}>
                  {option.id.toUpperCase()}.
                </span>
                {option.label}
              </button>
            );
          })}

          {/* Explanation */}
          {showResult && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: defined.radius.md,
              padding: defined.spacing.md,
              marginTop: defined.spacing.lg,
            }}>
              <h4 style={{ color: defined.colors.primary, marginBottom: defined.spacing.sm }}>Explanation</h4>
              <p style={{ color: defined.colors.text.secondary, lineHeight: 1.6, fontSize: typo.small }}>{question.explanation}</p>
            </div>
          )}
        </div>

        {/* Next button */}
        {showResult && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleNextQuestion}
              style={{
                background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
                color: defined.colors.text.primary,
                border: 'none',
                borderRadius: defined.radius.md,
                padding: `${defined.spacing.md} ${defined.spacing.xl}`,
                cursor: 'pointer',
                fontWeight: defined.typography.weights.semibold,
              }}
            >
              {currentQuestion < testQuestions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{
      padding: defined.spacing.lg,
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '5rem', marginBottom: defined.spacing.lg }}>
        🏆
      </div>

      <h2 style={{ color: defined.colors.text.primary, marginBottom: defined.spacing.md, fontSize: typo.heading }}>
        Depth of Field Master!
      </h2>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.xl,
        padding: defined.spacing.xl,
        marginBottom: defined.spacing.lg,
        border: '1px solid rgba(16, 185, 129, 0.3)',
      }}>
        <div style={{
          fontSize: defined.typography.sizes['3xl'],
          fontWeight: defined.typography.weights.bold,
          color: defined.colors.success,
          marginBottom: defined.spacing.md,
        }}>
          {score} / {testQuestions.length}
        </div>
        <p style={{ color: defined.colors.text.secondary, lineHeight: 1.6 }}>
          You have demonstrated mastery of how aperture, distance, and focus interact to create depth of field effects in photography and optical systems!
        </p>
      </div>

      <div style={{
        background: defined.colors.background.card,
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
        textAlign: 'left',
        border: '1px solid rgba(99, 102, 241, 0.2)',
      }}>
        <h3 style={{ color: defined.colors.primary, marginBottom: defined.spacing.md }}>Key Concepts Mastered</h3>
        <ul style={{ color: defined.colors.text.secondary, lineHeight: '2.2', paddingLeft: defined.spacing.lg }}>
          <li><strong style={{ color: defined.colors.text.primary }}>Circle of Confusion:</strong> The blur disk formed by out-of-focus light</li>
          <li><strong style={{ color: defined.colors.text.primary }}>Aperture Effect:</strong> Wider aperture = shallower depth of field</li>
          <li><strong style={{ color: defined.colors.text.primary }}>Distance Effect:</strong> Closer subject = more background blur</li>
          <li><strong style={{ color: defined.colors.text.primary }}>Focal Length Effect:</strong> Longer lens = larger physical aperture and more blur</li>
          <li><strong style={{ color: defined.colors.text.primary }}>Hyperfocal Distance:</strong> Maximizing depth of field for landscapes</li>
          <li><strong style={{ color: defined.colors.text.primary }}>Computational Photography:</strong> AI-powered bokeh simulation</li>
        </ul>
      </div>

      <div style={{
        background: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: defined.radius.lg,
        padding: defined.spacing.lg,
        marginBottom: defined.spacing.lg,
        textAlign: 'left',
      }}>
        <h4 style={{ color: defined.colors.secondary, marginBottom: defined.spacing.sm }}>Next Steps</h4>
        <p style={{ color: defined.colors.text.secondary, lineHeight: 1.6, fontSize: typo.small }}>
          Try experimenting with your camera (or phone's manual mode) to see these principles in action. Practice shooting at f/1.8 vs f/8, or moving closer and further from subjects while maintaining focus. The more you practice, the more intuitive depth of field control becomes!
        </p>
      </div>

      <button
        onClick={handlePhaseComplete}
        style={{
          background: `linear-gradient(135deg, ${defined.colors.success}, #059669)`,
          color: defined.colors.text.primary,
          border: 'none',
          borderRadius: defined.radius.lg,
          padding: `${defined.spacing.md} ${defined.spacing.xl}`,
          cursor: 'pointer',
          fontWeight: defined.typography.weights.bold,
          fontSize: typo.body,
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)',
        }}
      >
        Complete Game
      </button>
    </div>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================
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
      background: defined.colors.background.primary,
      fontFamily: defined.typography.fontFamily,
      color: defined.colors.text.primary,
      position: 'relative',
    }}>
      {/* Fixed Header Navigation Bar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${defined.colors.background.tertiary}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
          maxWidth: '1200px',
          margin: '0 auto',
          minHeight: '44px',
        }}>
          <span style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>
            Depth of Field
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {phaseOrder.map((p, index) => (
              <div
                key={p}
                style={{
                  width: phase === p ? '24px' : '8px',
                  height: '8px',
                  borderRadius: defined.radius.full,
                  background: phase === p
                    ? defined.colors.primary
                    : index < currentPhaseIndex
                      ? defined.colors.success
                      : defined.colors.background.tertiary,
                  transition: 'all 0.3s ease',
                }}
                title={phaseLabels[p]}
              />
            ))}
          </div>
          <span style={{ color: defined.colors.primary, fontSize: defined.typography.sizes.sm }}>
            {phaseLabels[phase]}
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ paddingTop: '60px', paddingBottom: '100px' }}>
        {renderPhase()}
      </div>

      {/* Fixed Footer Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        minHeight: '72px',
        background: 'rgba(30, 41, 59, 0.98)',
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ color: '#e2e8f0', fontSize: defined.typography.sizes.sm }}>
          {currentPhaseIndex + 1} / {phaseOrder.length}
        </span>
        <button
          onClick={handlePhaseComplete}
          style={{
            padding: `${defined.spacing.sm} ${defined.spacing.lg}`,
            background: `linear-gradient(135deg, ${defined.colors.primary}, ${defined.colors.primaryDark})`,
            color: defined.colors.text.primary,
            border: 'none',
            borderRadius: defined.radius.md,
            cursor: 'pointer',
            fontWeight: defined.typography.weights.semibold,
            minHeight: '44px',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
