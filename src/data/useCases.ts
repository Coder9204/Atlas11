/**
 * USE CASES — Landing pages targeting specific user intents and scenarios.
 */

export interface UseCaseEntry {
  slug: string;
  title: string;
  description: string;
  headline: string;
  benefits: string[];
  featuredGameSlugs: string[];
  featuredCategories: string[];
  testimonialQuote?: string;
  ctaText: string;
}

export const useCaseEntries: UseCaseEntry[] = [
  {
    slug: 'physics-lab-alternative',
    title: 'Virtual Physics Lab Alternative',
    description: 'Replace or supplement physical lab sessions with 342 interactive simulations. Students predict, experiment, and learn at their own pace without expensive equipment.',
    headline: 'A Physics Lab That Fits in Your Browser',
    benefits: [
      'No equipment costs or setup time',
      'Students can repeat experiments unlimited times',
      'Covers topics impossible in a physical lab (orbital mechanics, semiconductor physics)',
      'AI coaching provides instant feedback on misconceptions',
      'Works on any device with a web browser',
    ],
    featuredGameSlugs: ['pendulum-period', 'bernoulli', 'snells-law', 'circuits', 'momentum-conservation', 'standing-waves'],
    featuredCategories: ['mechanics', 'optics', 'electricity', 'thermodynamics'],
    ctaText: 'Try a Free Simulation',
  },
  {
    slug: 'ap-physics-prep',
    title: 'AP Physics Exam Prep',
    description: 'Build deep intuition for AP Physics 1, 2, and C with interactive simulations covering every major topic. Practice predicting outcomes before calculating.',
    headline: 'Ace AP Physics with Interactive Simulations',
    benefits: [
      'Covers all AP Physics 1 and 2 topics',
      'Build physical intuition that formulas alone cannot provide',
      'Predict-then-verify approach matches AP exam critical thinking',
      'Difficulty levels match AP exam progression',
      'Practice anywhere, anytime on your phone or laptop',
    ],
    featuredGameSlugs: ['energy-conservation', 'momentum-conservation', 'centripetal-force', 'standing-waves', 'kirchhoffs-laws', 'snells-law'],
    featuredCategories: ['mechanics', 'oscillations', 'electricity', 'optics'],
    ctaText: 'Start Practicing',
  },
  {
    slug: 'engineering-interview-prep',
    title: 'Engineering Interview Preparation',
    description: 'Refresh and deepen your understanding of core engineering concepts for technical interviews at semiconductor, hardware, and energy companies.',
    headline: 'Nail Your Engineering Interview',
    benefits: [
      'Deep-dive into semiconductor physics and fabrication',
      'Understand GPU architecture and AI hardware tradeoffs',
      'Review circuit analysis, power systems, and thermal management',
      'Interactive format builds intuition interviewers look for',
      'Covers the specific topics asked at NVIDIA, Intel, TSMC, and Tesla',
    ],
    featuredGameSlugs: ['m-o-s-f-e-t-switching', 'photolithography', 'g-p-u-memory-bandwidth', 'tensor-core', 'r-c-delay', 'thermal-throttling'],
    featuredCategories: ['semiconductors', 'computing', 'electricity'],
    ctaText: 'Start Reviewing',
  },
  {
    slug: 'semiconductor-career-prep',
    title: 'Semiconductor Career Preparation',
    description: 'Master the physics of chip design, fabrication, and testing. From MOSFET switching to photolithography to yield analysis — everything a semiconductor engineer needs.',
    headline: 'Launch Your Semiconductor Career',
    benefits: [
      'Covers all major fab processes: litho, etch, implant, deposition, CMP',
      'Understand transistor physics from threshold voltage to leakage',
      'Learn interconnect design, packaging, and reliability',
      'Interactive simulations used by engineers at leading fabs',
      'Progress tracking shows your knowledge gaps',
    ],
    featuredGameSlugs: ['photolithography', 'm-o-s-f-e-t-switching', 'doping-diffusion', 'etch-anisotropy', 'cleanroom-yield', 'chiplet-architecture'],
    featuredCategories: ['semiconductors'],
    ctaText: 'Start Learning',
  },
  {
    slug: 'solar-design-training',
    title: 'Solar Design Training',
    description: 'Learn solar system design from cell physics to grid integration. Understand IV curves, MPPT, string sizing, temperature derating, and module-level effects.',
    headline: 'Master Solar System Design',
    benefits: [
      'Complete coverage from photon to grid',
      'Understand IV curves, fill factor, and MPPT algorithms',
      'Learn string sizing and system optimization',
      'Interactive simulations for shading analysis and temperature effects',
      'Relevant for NABCEP certification study',
    ],
    featuredGameSlugs: ['solar-cell', 'p-v-i-v-curve', 'm-p-p-t', 'string-sizing', 'bypass-diodes', 'series-parallel-p-v'],
    featuredCategories: ['solar'],
    ctaText: 'Start Training',
  },
  {
    slug: 'classroom-demonstrations',
    title: 'Classroom Demonstrations',
    description: 'Engaging, interactive physics demonstrations for teachers. Project simulations on screen, let students predict outcomes, then reveal the physics in real time.',
    headline: 'Physics Demos That Engage Every Student',
    benefits: [
      'Project on classroom screen for live demonstrations',
      'Students make predictions before seeing results',
      'No setup or cleanup required',
      'Cover dangerous or expensive experiments safely',
      'Save demonstrations for students to replay at home',
    ],
    featuredGameSlugs: ['newtons-third-law', 'energy-conservation', 'bernoulli', 'leidenfrost', 'polarization', 'diffraction'],
    featuredCategories: ['mechanics', 'thermodynamics', 'optics'],
    ctaText: 'Try a Demo',
  },
  {
    slug: 'science-fair-projects',
    title: 'Science Fair Projects',
    description: 'Use interactive simulations to explore hypotheses, test variables, and present findings for science fairs. Perfect for students who want to go beyond the textbook.',
    headline: 'Win Your Science Fair with Physics Simulations',
    benefits: [
      'Explore hundreds of physics phenomena interactively',
      'Test hypotheses by varying parameters systematically',
      'Generate data and visualizations for your poster',
      'Learn the scientific method through predict-observe-explain',
      'Topics ranging from simple mechanics to advanced semiconductor physics',
    ],
    featuredGameSlugs: ['pendulum-period', 'laminar-turbulent', 'standing-waves', 'brownian-motion', 'solar-cell', 'doppler-effect'],
    featuredCategories: ['mechanics', 'fluids', 'oscillations'],
    ctaText: 'Explore Topics',
  },
  {
    slug: 'self-study-physics',
    title: 'Self-Study Physics',
    description: 'Learn physics at your own pace with interactive simulations and AI coaching. No prerequisites, no deadlines — just curiosity and a web browser.',
    headline: 'Teach Yourself Physics — Interactively',
    benefits: [
      'Start from beginner and progress to advanced',
      'AI coach explains concepts when you get stuck',
      'Learn by doing, not by watching videos',
      'No math prerequisites for beginner simulations',
      'Track your progress across all 342 topics',
    ],
    featuredGameSlugs: ['inertia', 'buoyancy', 'energy-conservation', 'circuits', 'thermal-expansion', 'reflection'],
    featuredCategories: ['mechanics', 'fluids', 'electricity'],
    ctaText: 'Start Learning Free',
  },
  {
    slug: 'homework-help',
    title: 'Physics Homework Help',
    description: 'Stuck on a physics problem? Use interactive simulations to visualize the concept, build intuition, and understand the solution approach before plugging in numbers.',
    headline: 'Understand Physics, Don\'t Just Solve Equations',
    benefits: [
      'Visualize the physics behind textbook problems',
      'Build intuition for force diagrams, energy, and circuits',
      'AI coaching explains why, not just what',
      'Practice similar problems with different parameters',
      'Covers mechanics, E&M, optics, thermo, and modern physics',
    ],
    featuredGameSlugs: ['centripetal-force', 'momentum-conservation', 'kirchhoffs-laws', 'snells-law', 'carnot-cycle', 'photoelectric-effect'],
    featuredCategories: ['mechanics', 'electricity', 'optics', 'thermodynamics'],
    ctaText: 'Get Help Now',
  },
  {
    slug: 'conceptual-physics',
    title: 'Conceptual Physics Course Companion',
    description: 'Perfect companion for conceptual physics courses (Hewitt, Hobson). Visualize every concept without heavy math. Build the intuition that makes equations meaningful.',
    headline: 'See Physics, Don\'t Just Read About It',
    benefits: [
      'Matches standard conceptual physics curriculum',
      'Minimal math — focus on understanding and prediction',
      'Interactive simulations for every major topic',
      'AI explains concepts in plain language',
      'Perfect for non-science majors taking physics',
    ],
    featuredGameSlugs: ['inertia', 'buoyancy', 'pendulum-period', 'reflection', 'convection', 'static-electricity'],
    featuredCategories: ['mechanics', 'fluids', 'oscillations', 'optics', 'electricity', 'thermodynamics'],
    ctaText: 'Start Exploring',
  },
  {
    slug: 'university-physics-supplement',
    title: 'University Physics Lab Supplement',
    description: 'Supplement university-level physics labs with virtual experiments. Cover more ground, repeat difficult experiments, and prepare students before physical lab sessions.',
    headline: 'Extend Your Physics Lab Beyond the Classroom',
    benefits: [
      'Pre-lab preparation reduces wasted lab time',
      'Post-lab reinforcement deepens understanding',
      'Access experiments 24/7 from any device',
      'Cover experiments too expensive or dangerous for teaching labs',
      'Advanced topics: semiconductors, optics, nuclear physics',
    ],
    featuredGameSlugs: ['diffraction', 'electromagnetic-induction', 'bernoulli', 'thermal-expansion', 'photoelectric-effect', 'angular-momentum'],
    featuredCategories: ['optics', 'electricity', 'mechanics', 'thermodynamics'],
    ctaText: 'Try a Virtual Lab',
  },
  {
    slug: 'tutoring-tool',
    title: 'Physics Tutoring Tool',
    description: 'Enhance your tutoring sessions with interactive simulations. Show students the physics visually, let them predict and experiment, and watch understanding click.',
    headline: 'The Tutor\'s Secret Weapon',
    benefits: [
      'Visual demonstrations make abstract concepts concrete',
      'Students engage actively instead of passively listening',
      'AI coaching supplements your explanations',
      'Share specific simulations via URL for homework practice',
      'Works on student\'s phone or laptop during sessions',
    ],
    featuredGameSlugs: ['energy-conservation', 'circuits', 'snells-law', 'momentum-conservation', 'standing-waves', 'gas-laws'],
    featuredCategories: ['mechanics', 'electricity', 'optics'],
    ctaText: 'Start Tutoring',
  },
  {
    slug: 'data-center-engineer',
    title: 'Data Center Engineering',
    description: 'Thermal management, power distribution, cooling efficiency, and GPU architecture for data center professionals. Understand PUE optimization and thermal throttling.',
    headline: 'Master Data Center Physics',
    benefits: [
      'Understand thermal management from chip to facility',
      'Optimize PUE with interactive cooling simulations',
      'Learn GPU architecture and AI hardware tradeoffs',
      'Power distribution and UPS sizing',
      'Relevant for data center design and operations roles',
    ],
    featuredGameSlugs: ['p-u-e-calculator', 'heat-sink-thermal', 'liquid-cooling', 'server-airflow', 'thermal-throttling', 'g-p-u-memory-bandwidth'],
    featuredCategories: ['computing', 'thermodynamics', 'solar'],
    ctaText: 'Start Learning',
  },
  {
    slug: 'curiosity-driven',
    title: 'Curiosity-Driven Exploration',
    description: 'Explore 342 physics phenomena just because they\'re fascinating. No tests, no grades — just the joy of understanding how the world works.',
    headline: 'Feed Your Curiosity',
    benefits: [
      'Explore any topic in any order',
      'No prerequisites or commitments',
      'Discover surprising connections between physics topics',
      'From everyday phenomena to cutting-edge technology',
      'New simulations added regularly',
    ],
    featuredGameSlugs: ['leidenfrost', 'chain-fountain', 'rattleback', 'karman-vortex', 'wagon-wheel-aliasing', 'brownian-motion'],
    featuredCategories: ['experiments', 'fluids', 'mechanics'],
    ctaText: 'Start Exploring',
  },
  {
    slug: 'ai-engineer-training',
    title: 'AI Engineer Hardware Training',
    description: 'Understand the hardware that runs your models: GPU memory bandwidth, tensor cores, quantization, KV cache, and the memory wall. Essential for ML performance optimization.',
    headline: 'Know Your AI Hardware',
    benefits: [
      'Understand why inference is memory-bandwidth limited',
      'Learn KV cache mechanics and memory scaling',
      'Compare GPU vs TPU vs ASIC architectures',
      'Optimize batch size, quantization, and occupancy',
      'Essential knowledge for ML systems engineers',
    ],
    featuredGameSlugs: ['g-p-u-memory-bandwidth', 'tensor-core', 'k-v-cache', 'quantization-precision', 'batching-latency', 'a-i-inference-latency'],
    featuredCategories: ['computing'],
    ctaText: 'Start Training',
  },
];

export function getUseCaseBySlug(slug: string): UseCaseEntry | undefined {
  return useCaseEntries.find(e => e.slug === slug);
}
