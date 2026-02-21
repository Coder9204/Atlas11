/**
 * COMPARISON DATA — Structured comparison pairs for pSEO pages.
 *
 * Each entry maps two related game modules into a head-to-head comparison,
 * surfacing the criteria that differentiate the two concepts.
 */

// ============================================================
// TYPES
// ============================================================

export interface ComparisonCriterion {
  criterion: string;
  sideA: string;
  sideB: string;
}

export interface ComparisonData {
  slugA: string;
  slugB: string;
  comparisonSlug: string;
  title: string;
  description: string;
  criteria: ComparisonCriterion[];
  conclusion: string;
  relatedGames: string[];
}

// ============================================================
// DATA
// ============================================================

export const comparisons: ComparisonData[] = [
  {
    slugA: 'a-s-i-cvs-g-p-u',
    slugB: 'a-s-i-cvs-g-p-u',
    comparisonSlug: 'gpu-vs-asic',
    title: 'GPU vs ASIC: Which Hardware Wins for AI Workloads?',
    description:
      'Compare general-purpose GPUs against Application-Specific Integrated Circuits (ASICs) for machine learning inference and training. Understand the tradeoffs in flexibility, performance, power efficiency, and cost.',
    criteria: [
      {
        criterion: 'Flexibility',
        sideA: 'GPUs are fully programmable and can run any parallel workload, from gaming to scientific simulation to AI training.',
        sideB: 'ASICs are designed for a single fixed function. Changing the workload requires fabricating a new chip.',
      },
      {
        criterion: 'Performance per Watt',
        sideA: 'GPUs consume significant power due to general-purpose overhead such as branch prediction, cache hierarchies, and instruction decode.',
        sideB: 'ASICs eliminate unnecessary logic, achieving 10-100x better performance per watt for their target workload.',
      },
      {
        criterion: 'Development Cost',
        sideA: 'GPU software can be written and iterated in days using CUDA or OpenCL. No hardware fabrication needed.',
        sideB: 'ASIC design takes 12-24 months and costs tens of millions of dollars for mask sets and verification.',
      },
      {
        criterion: 'Time to Market',
        sideA: 'Off-the-shelf GPUs can be deployed immediately. Software updates ship over the network.',
        sideB: 'ASIC tape-out to production takes 6-18 months. Design errors require a full respin.',
      },
      {
        criterion: 'Unit Cost at Scale',
        sideA: 'GPU unit costs remain high because the die includes unused general-purpose logic for specialized workloads.',
        sideB: 'ASICs have lower per-unit cost at high volume because the die contains only the logic needed.',
      },
    ],
    conclusion:
      'GPUs win when workloads are evolving quickly or volumes are low. ASICs dominate when a single workload is run at massive scale and power efficiency is critical, as with Bitcoin mining or dedicated AI inference chips.',
    relatedGames: ['a-s-i-cvs-g-p-u', 't-p-uvs-g-p-u', 'manufacturing-drives-architecture', 'systolic-array', 'tensor-core'],
  },
  {
    slugA: 't-p-uvs-g-p-u',
    slugB: 't-p-uvs-g-p-u',
    comparisonSlug: 'tpu-vs-gpu',
    title: 'TPU vs GPU: Comparing AI Accelerators for Deep Learning',
    description:
      'Google TPUs and NVIDIA GPUs are the two dominant platforms for training and serving large neural networks. Compare their architectures, strengths, and ideal use cases.',
    criteria: [
      {
        criterion: 'Architecture',
        sideA: 'GPUs use thousands of small CUDA cores optimized for parallel floating-point arithmetic with a flexible SIMT execution model.',
        sideB: 'TPUs use a systolic array architecture purpose-built for matrix multiply-accumulate operations central to neural networks.',
      },
      {
        criterion: 'Software Ecosystem',
        sideA: 'NVIDIA CUDA has a 15+ year ecosystem with broad framework support (PyTorch, TensorFlow, JAX) and extensive third-party libraries.',
        sideB: 'TPUs work best with JAX and TensorFlow via XLA compilation. PyTorch support exists but is less mature.',
      },
      {
        criterion: 'Memory Architecture',
        sideA: 'GPUs use HBM with a standard cache hierarchy. Memory bandwidth is high but shared across all workloads.',
        sideB: 'TPUs have large on-chip SRAM scratchpads and HBM, with memory access patterns optimized for tensor operations.',
      },
      {
        criterion: 'Availability',
        sideA: 'GPUs are available from every major cloud provider and for on-premise purchase. Multiple generations coexist in the market.',
        sideB: 'TPUs are available exclusively through Google Cloud Platform, limiting deployment flexibility.',
      },
      {
        criterion: 'Cost Efficiency for Training',
        sideA: 'GPUs offer competitive cost-performance for most model sizes, especially with mixed-precision training on Tensor Cores.',
        sideB: 'TPU pods provide superior cost-efficiency for very large models (100B+ parameters) trained on massive datasets.',
      },
    ],
    conclusion:
      'GPUs are the safer general-purpose choice with unmatched ecosystem breadth. TPUs excel for large-scale training on Google Cloud, especially with JAX/TensorFlow workloads where their systolic array architecture delivers peak efficiency.',
    relatedGames: ['t-p-uvs-g-p-u', 'a-s-i-cvs-g-p-u', 'systolic-array', 'tensor-core', 'g-p-u-memory-bandwidth'],
  },
  {
    slugA: 'laminar-turbulent',
    slugB: 'laminar-turbulent',
    comparisonSlug: 'laminar-vs-turbulent-flow',
    title: 'Laminar vs Turbulent Flow: Understanding Flow Regimes',
    description:
      'Explore the fundamental difference between smooth, orderly laminar flow and chaotic turbulent flow. Learn how the Reynolds number determines which regime dominates and why it matters in engineering.',
    criteria: [
      {
        criterion: 'Flow Pattern',
        sideA: 'Laminar flow moves in smooth, parallel layers with no mixing between adjacent layers. Fluid velocity is parabolic in a pipe.',
        sideB: 'Turbulent flow is chaotic with eddies, vortices, and random fluctuations. Velocity profile is flatter across the pipe cross-section.',
      },
      {
        criterion: 'Reynolds Number',
        sideA: 'Laminar flow occurs at low Reynolds numbers (Re < 2300 in a pipe), where viscous forces dominate inertial forces.',
        sideB: 'Turbulent flow occurs at high Reynolds numbers (Re > 4000 in a pipe), where inertial forces overwhelm viscous damping.',
      },
      {
        criterion: 'Energy Loss',
        sideA: 'Laminar flow has low friction losses. Pressure drop is proportional to velocity (Hagen-Poiseuille equation).',
        sideB: 'Turbulent flow has much higher friction losses. Pressure drop scales roughly with the square of velocity.',
      },
      {
        criterion: 'Heat Transfer',
        sideA: 'Laminar flow provides poor heat transfer because there is no mixing between layers; heat moves only by conduction.',
        sideB: 'Turbulent flow greatly enhances heat transfer due to convective mixing, making it desirable in heat exchangers.',
      },
      {
        criterion: 'Predictability',
        sideA: 'Laminar flow is fully deterministic and analytically solvable for simple geometries.',
        sideB: 'Turbulent flow is inherently stochastic and requires statistical methods (RANS, LES, DNS) for analysis.',
      },
    ],
    conclusion:
      'Neither regime is inherently better. Laminar flow is preferred when minimizing drag or maintaining precise flow control (microfluidics, blood flow). Turbulent flow is preferred when maximizing heat transfer or mixing (combustion engines, heat exchangers).',
    relatedGames: ['laminar-turbulent', 'laminar-flow', 'karman-vortex', 'pressure-drop', 'venturi-effect'],
  },
  {
    slugA: 'chiplets-vs-monoliths',
    slugB: 'chiplets-vs-monoliths',
    comparisonSlug: 'chiplets-vs-monolithic-dies',
    title: 'Chiplets vs Monolithic Dies: The Future of Chip Design',
    description:
      'Compare the traditional monolithic die approach with the emerging chiplet architecture. Understand how disaggregating a chip into smaller tiles affects yield, cost, performance, and design flexibility.',
    criteria: [
      {
        criterion: 'Manufacturing Yield',
        sideA: 'Chiplets are smaller dies, so a single defect kills less silicon. Yield can exceed 95% per chiplet, improving economics dramatically.',
        sideB: 'Monolithic dies grow larger as transistor counts increase, and yield drops exponentially with area. A single defect scraps the entire die.',
      },
      {
        criterion: 'Interconnect Performance',
        sideA: 'Chiplet-to-chiplet communication crosses package-level interconnects (UCIe, EMIB) with higher latency and lower bandwidth than on-die wires.',
        sideB: 'Monolithic dies keep all communication on-chip with sub-nanosecond latency and terabytes/second of bandwidth between blocks.',
      },
      {
        criterion: 'Design Flexibility',
        sideA: 'Chiplets allow mixing process nodes (e.g., 3nm compute + 12nm I/O) and reusing IP blocks across product lines.',
        sideB: 'Monolithic designs are locked to a single process node and must redesign everything for each new product.',
      },
      {
        criterion: 'Cost Structure',
        sideA: 'Chiplets reduce NRE cost per product by reusing tile designs. Total packaging cost increases but is offset by yield savings.',
        sideB: 'Monolithic dies have simpler packaging but enormous mask costs at leading-edge nodes (over $500M for a 3nm mask set).',
      },
      {
        criterion: 'Power Efficiency',
        sideA: 'Cross-chiplet links consume more power per bit than on-die wires. Power delivery is more complex with multiple voltage islands.',
        sideB: 'Monolithic designs have more efficient on-die communication but cannot mix process nodes to optimize each functional block.',
      },
    ],
    conclusion:
      'Chiplets are increasingly favored for large, complex designs (datacenter GPUs, CPUs) where yield and design reuse outweigh the interconnect overhead. Monolithic dies remain optimal for cost-sensitive, performance-critical designs at moderate die sizes.',
    relatedGames: ['chiplets-vs-monoliths', 'chiplet-architecture', 'flip-chip-wirebond', 'process-variation', 'cleanroom-yield'],
  },
  {
    slugA: 'series-parallel-p-v',
    slugB: 'series-parallel-p-v',
    comparisonSlug: 'series-vs-parallel-solar-panels',
    title: 'Series vs Parallel Solar Panels: Wiring Configuration Explained',
    description:
      'Understand the critical tradeoff between wiring solar panels in series (higher voltage) versus parallel (higher current), and how shading, MPPT, and system voltage requirements affect the choice.',
    criteria: [
      {
        criterion: 'Voltage vs Current',
        sideA: 'Series wiring adds voltages while current stays equal to the lowest panel. A 10-panel string at 40V each produces 400V.',
        sideB: 'Parallel wiring adds currents while voltage stays equal. The same 10 panels at 10A each produce 100A at 40V.',
      },
      {
        criterion: 'Shade Tolerance',
        sideA: 'Series strings are highly shade-sensitive. One shaded panel limits current through the entire string, requiring bypass diodes.',
        sideB: 'Parallel wiring is shade-tolerant. A shaded panel reduces only its own contribution without affecting other panels.',
      },
      {
        criterion: 'Wire Losses',
        sideA: 'Series strings carry less current at higher voltage, resulting in lower I2R wire losses. Thinner, cheaper cables can be used.',
        sideB: 'Parallel wiring carries high currents requiring thicker, more expensive cables and higher I2R losses over distance.',
      },
      {
        criterion: 'Inverter Compatibility',
        sideA: 'String inverters and central inverters require high-voltage DC input, favoring series wiring to reach the MPPT voltage window.',
        sideB: 'Microinverters and some charge controllers work at panel-level voltage, making parallel wiring a natural fit.',
      },
      {
        criterion: 'Safety',
        sideA: 'Series strings produce dangerously high DC voltages (600V+), requiring arc-fault protection and rapid shutdown systems.',
        sideB: 'Parallel systems operate at lower voltages, reducing arc-flash risk and simplifying safety compliance.',
      },
    ],
    conclusion:
      'Most grid-tied systems use series strings to match inverter voltage requirements and minimize wire losses. Parallel wiring is preferred for small off-grid systems, shade-heavy installations, or when using microinverters. Many real systems use a combination of both.',
    relatedGames: ['series-parallel-p-v', 'bypass-diodes', 'm-p-p-t', 'string-sizing', 'solar-yield-prediction'],
  },
  {
    slugA: 'solar-vs-i-c-purity',
    slugB: 'solar-vs-i-c-purity',
    comparisonSlug: 'solar-grade-vs-ic-grade-silicon',
    title: 'Solar-Grade vs IC-Grade Silicon: Purity Requirements Compared',
    description:
      'Silicon purity requirements differ by orders of magnitude between photovoltaic cells and integrated circuits. Explore why, and how this drives completely different manufacturing economics.',
    criteria: [
      {
        criterion: 'Purity Level',
        sideA: 'Solar-grade silicon (SoG-Si) requires 6N to 9N purity (99.9999% to 99.9999999%), which is achievable by the Siemens process or upgraded metallurgical routes.',
        sideB: 'IC-grade silicon (EG-Si) requires 9N to 11N purity (99.999999999%), demanding extensive zone refining and Czochralski pulling.',
      },
      {
        criterion: 'Defect Tolerance',
        sideA: 'Solar cells can tolerate moderate crystal defects and grain boundaries. Multicrystalline silicon is widely used at lower cost.',
        sideB: 'ICs require near-perfect monocrystalline silicon. A single dislocation in the active region can kill a transistor.',
      },
      {
        criterion: 'Cost per Kilogram',
        sideA: 'Solar-grade polysilicon costs $5-$20/kg depending on market conditions, and price is a dominant factor in module cost.',
        sideB: 'Electronic-grade polysilicon costs $50-$200/kg and is a small fraction of the final chip value.',
      },
      {
        criterion: 'Wafer Size',
        sideA: 'Solar wafers are large (182mm or 210mm squares) to maximize cell area and reduce per-watt manufacturing cost.',
        sideB: 'IC wafers are round (300mm diameter) optimized for lithographic patterning and stepper field coverage.',
      },
      {
        criterion: 'Volume',
        sideA: 'The solar industry consumes over 800,000 metric tons of polysilicon per year, dwarfing IC consumption.',
        sideB: 'The semiconductor industry consumes roughly 50,000 metric tons per year but at far higher value per kilogram.',
      },
    ],
    conclusion:
      'Solar and IC silicon are the same element but serve fundamentally different markets. Solar prioritizes cost and volume, tolerating lower purity. IC manufacturing demands extreme purity and crystalline perfection, accepting much higher costs per kilogram.',
    relatedGames: ['solar-vs-i-c-purity', 'silicon-texturing', 'doping-diffusion', 'solar-cell', 'photolithography'],
  },
  {
    slugA: 'flip-chip-wirebond',
    slugB: 'flip-chip-wirebond',
    comparisonSlug: 'flip-chip-vs-wirebond',
    title: 'Flip Chip vs Wire Bond: Chip Packaging Technologies Compared',
    description:
      'Compare the two dominant methods for connecting a silicon die to its package. Understand how flip chip and wire bonding differ in electrical performance, thermal management, cost, and design constraints.',
    criteria: [
      {
        criterion: 'Electrical Performance',
        sideA: 'Flip chip uses short solder bumps providing low inductance and resistance. Signal paths are under 100 microns, enabling multi-GHz operation.',
        sideB: 'Wire bonds use thin gold or copper wires 1-5mm long. Higher inductance limits performance above a few GHz.',
      },
      {
        criterion: 'I/O Density',
        sideA: 'Flip chip connects across the entire die face using an area array. Thousands of connections at 100-150 micron pitch are routine.',
        sideB: 'Wire bonds connect only at the die perimeter. I/O count is limited by pad pitch and die edge length.',
      },
      {
        criterion: 'Thermal Management',
        sideA: 'Flip chip can attach a heat sink directly to the exposed die backside, providing excellent thermal conductivity.',
        sideB: 'Wire bond packages trap the die face-up under a mold compound, making heat extraction more difficult.',
      },
      {
        criterion: 'Cost',
        sideA: 'Flip chip requires under-bump metallization, solder bumping, and underfill. Higher per-unit cost, especially at low volumes.',
        sideB: 'Wire bonding is mature and inexpensive. Equipment costs are low and the process handles diverse die sizes easily.',
      },
      {
        criterion: 'Reliability',
        sideA: 'Flip chip solder joints are susceptible to thermal cycling fatigue due to CTE mismatch. Underfill is critical for long-term reliability.',
        sideB: 'Wire bonds are mechanically flexible and absorb CTE mismatch naturally. Well-characterized failure modes after decades of use.',
      },
    ],
    conclusion:
      'Flip chip dominates high-performance applications (CPUs, GPUs, FPGAs) where I/O density and electrical performance are paramount. Wire bonding remains the cost-effective choice for lower-pin-count devices like microcontrollers, sensors, and power management ICs.',
    relatedGames: ['flip-chip-wirebond', 'chiplet-architecture', 'thermal-interface', 'electromigration', 'r-c-delay-interconnect'],
  },
  {
    slugA: 'static-kinetic-friction',
    slugB: 'static-kinetic-friction',
    comparisonSlug: 'static-vs-kinetic-friction',
    title: 'Static vs Kinetic Friction: Why Starting is Harder Than Sliding',
    description:
      'Compare static friction (the force preventing motion) with kinetic friction (the force opposing ongoing motion). Understand why the coefficient of static friction is always greater than kinetic, and the practical implications.',
    criteria: [
      {
        criterion: 'Definition',
        sideA: 'Static friction acts on stationary objects to prevent motion. It matches the applied force up to a maximum threshold.',
        sideB: 'Kinetic friction acts on moving objects to oppose their direction of motion. It has a roughly constant magnitude.',
      },
      {
        criterion: 'Magnitude',
        sideA: 'Static friction coefficient (mu_s) is higher, typically 0.2 to 1.0 depending on materials. Maximum force = mu_s * N.',
        sideB: 'Kinetic friction coefficient (mu_k) is lower than mu_s, typically 10-30% less. Force = mu_k * N.',
      },
      {
        criterion: 'Velocity Dependence',
        sideA: 'Static friction is independent of any would-be velocity. It exists only when there is zero relative motion between surfaces.',
        sideB: 'Kinetic friction is approximately constant at low speeds but can vary at high speeds due to thermal effects and surface deformation.',
      },
      {
        criterion: 'Microscopic Origin',
        sideA: 'At rest, surface asperities have time to interlock and form micro-welds, increasing the force needed to initiate sliding.',
        sideB: 'Once sliding begins, asperities have less time to bond. Contact is more transient, reducing the average friction force.',
      },
      {
        criterion: 'Engineering Implications',
        sideA: 'Static friction enables walking, driving (tire grip), bolted joints, and braking. It is the useful form of friction.',
        sideB: 'Kinetic friction causes energy dissipation as heat, wears surfaces, and must be overcome in all sliding mechanisms.',
      },
    ],
    conclusion:
      'The transition from static to kinetic friction explains why objects lurch when they start moving, why brakes are most effective just before lockup (ABS systems), and why earthquakes release energy suddenly when fault surfaces slip from static to kinetic friction.',
    relatedGames: ['static-kinetic-friction', 'stick-slip', 'drag-force', 'inclined-plane', 'rolling-vs-sliding'],
  },
  {
    slugA: 'rolling-vs-sliding',
    slugB: 'rolling-vs-sliding',
    comparisonSlug: 'rolling-vs-sliding-friction',
    title: 'Rolling vs Sliding: Why Wheels Changed Everything',
    description:
      'Compare the physics of rolling motion against sliding motion. Understand why rolling friction is dramatically lower than sliding friction and how this principle underpins transportation technology.',
    criteria: [
      {
        criterion: 'Friction Magnitude',
        sideA: 'Rolling friction coefficients are extremely low (0.001-0.01 for steel on steel), because the contact point has zero relative velocity.',
        sideB: 'Sliding friction coefficients are 10-100x higher (0.1-1.0), because surfaces are in continuous relative motion.',
      },
      {
        criterion: 'Energy Dissipation',
        sideA: 'Rolling objects lose energy primarily through deformation of the contact region (hysteresis) rather than surface abrasion.',
        sideB: 'Sliding objects dissipate energy through surface shearing, abrasion, and heat generation at the contact interface.',
      },
      {
        criterion: 'Surface Wear',
        sideA: 'Rolling contact produces minimal wear. Ball bearings last millions of revolutions before replacement.',
        sideB: 'Sliding contact produces significant wear, requiring lubrication and frequent replacement of contacting surfaces.',
      },
      {
        criterion: 'Speed Limitation',
        sideA: 'Rolling motion has no inherent speed limit from friction, though aerodynamic drag and vibration become limiting factors.',
        sideB: 'Sliding motion generates heat proportional to speed, eventually causing thermal damage, seizure, or melting.',
      },
      {
        criterion: 'Control and Braking',
        sideA: 'Rolling objects maintain directional control through static friction at the contact point. Steering and cornering are possible.',
        sideB: 'Sliding objects (locked wheels) lose directional control entirely, which is why anti-lock brakes prevent wheel lockup.',
      },
    ],
    conclusion:
      'The invention of the wheel exploits the orders-of-magnitude difference between rolling and sliding friction. Modern bearings, tires, and rail systems are all engineered to maintain rolling contact and avoid sliding, which wastes energy and destroys surfaces.',
    relatedGames: ['rolling-vs-sliding', 'rolling-race', 'static-kinetic-friction', 'moment-of-inertia', 'stick-slip'],
  },
  {
    slugA: 'reflection',
    slugB: 'refraction',
    comparisonSlug: 'reflection-vs-refraction',
    title: 'Reflection vs Refraction: How Light Changes Direction',
    description:
      'Compare the two fundamental ways light changes direction at an interface. Reflection bounces light back into the same medium, while refraction bends it as it enters a new medium with a different refractive index.',
    criteria: [
      {
        criterion: 'Mechanism',
        sideA: 'Reflection occurs when light bounces off a surface. The angle of incidence equals the angle of reflection (law of reflection).',
        sideB: 'Refraction occurs when light crosses a boundary between media with different refractive indices, changing speed and direction (Snell\'s law).',
      },
      {
        criterion: 'Governing Law',
        sideA: 'Law of Reflection: theta_i = theta_r. Simple, angle-preserving, independent of wavelength for specular reflection.',
        sideB: 'Snell\'s Law: n1 sin(theta_1) = n2 sin(theta_2). Angle change depends on the ratio of refractive indices.',
      },
      {
        criterion: 'Wavelength Dependence',
        sideA: 'Specular reflection is wavelength-independent. All colors reflect at the same angle from a flat mirror.',
        sideB: 'Refraction is wavelength-dependent (dispersion). Blue light bends more than red, producing rainbows and chromatic aberration.',
      },
      {
        criterion: 'Energy Budget',
        sideA: 'At normal incidence on glass, about 4% of light is reflected. Increases at grazing angles (Fresnel equations).',
        sideB: 'The remaining ~96% is transmitted and refracted. The split is governed by the Fresnel equations and depends on polarization.',
      },
      {
        criterion: 'Applications',
        sideA: 'Mirrors, retroreflectors, periscopes, telescopes, radar, and fiber optic cladding (via total internal reflection).',
        sideB: 'Lenses, eyeglasses, cameras, microscopes, prisms, and fiber optic cores where light is guided by refraction.',
      },
    ],
    conclusion:
      'Reflection and refraction always occur together at any interface. Understanding both is essential for designing optical systems. Total internal reflection, which occurs when refraction would bend light beyond 90 degrees, is the basis of fiber optic communications.',
    relatedGames: ['reflection', 'refraction', 'snells-law', 'total-internal-reflection', 'law-of-reflection', 'lens-focusing'],
  },
  {
    slugA: 'convection-currents',
    slugB: 'thermal-contact',
    comparisonSlug: 'convection-vs-conduction',
    title: 'Convection vs Conduction: Two Modes of Heat Transfer',
    description:
      'Compare heat transfer by direct molecular contact (conduction) with heat transfer by bulk fluid motion (convection). These two mechanisms dominate thermal engineering design decisions.',
    criteria: [
      {
        criterion: 'Mechanism',
        sideA: 'Convection transfers heat by physically moving heated fluid from one place to another. Requires a fluid medium (liquid or gas).',
        sideB: 'Conduction transfers heat through molecular vibrations and electron diffusion within a material. Works in solids, liquids, and gases.',
      },
      {
        criterion: 'Rate of Transfer',
        sideA: 'Convection is typically much faster. Forced convection coefficients range from 10-1000 W/m2K for air and up to 10,000 for water.',
        sideB: 'Conduction rates depend on thermal conductivity: copper conducts at 400 W/mK, while air conducts at only 0.025 W/mK.',
      },
      {
        criterion: 'Distance Dependence',
        sideA: 'Convection can transport heat over large distances efficiently by moving the heated fluid itself (e.g., ocean currents, HVAC ducts).',
        sideB: 'Conduction rate drops with distance (Fourier\'s law: q = -k dT/dx). Only effective over short distances in most materials.',
      },
      {
        criterion: 'Enhancement Methods',
        sideA: 'Convection is enhanced by increasing fluid velocity (fans, pumps), adding fins to increase surface area, or inducing turbulence.',
        sideB: 'Conduction is enhanced by using higher-conductivity materials (copper instead of steel) or reducing the thermal path length.',
      },
      {
        criterion: 'Engineering Examples',
        sideA: 'Heat sinks with fans, liquid cooling loops, building HVAC systems, weather patterns, and ocean circulation.',
        sideB: 'Thermal interface materials, heat spreaders in electronics, cooking on a stovetop, and insulation design.',
      },
    ],
    conclusion:
      'Most real thermal systems involve both conduction and convection in series. Heat conducts from a chip to a heat sink, then convects to the air. Understanding the thermal resistance of each stage is key to effective cooling design.',
    relatedGames: ['convection-currents', 'convection', 'thermal-contact', 'newton-cooling', 'heat-sink-thermal', 'liquid-cooling'],
  },
  {
    slugA: 'endothermic-exothermic',
    slugB: 'endothermic-exothermic',
    comparisonSlug: 'endothermic-vs-exothermic-reactions',
    title: 'Endothermic vs Exothermic: Reactions That Absorb or Release Heat',
    description:
      'Compare chemical reactions that absorb energy from their surroundings (endothermic) with those that release energy (exothermic). Understand enthalpy, activation energy, and how these reactions shape everyday life.',
    criteria: [
      {
        criterion: 'Energy Flow',
        sideA: 'Endothermic reactions absorb heat from the surroundings. The products have higher enthalpy than the reactants (positive delta-H).',
        sideB: 'Exothermic reactions release heat to the surroundings. The products have lower enthalpy than the reactants (negative delta-H).',
      },
      {
        criterion: 'Temperature Effect',
        sideA: 'Endothermic reactions cool their surroundings. An instant cold pack (ammonium nitrate dissolving in water) drops in temperature.',
        sideB: 'Exothermic reactions heat their surroundings. Hand warmers (iron oxidation) and combustion engines generate useful heat.',
      },
      {
        criterion: 'Spontaneity',
        sideA: 'Endothermic reactions require continuous energy input to proceed. They are often non-spontaneous unless entropy increases sufficiently.',
        sideB: 'Exothermic reactions tend to be spontaneous once activation energy is overcome. They can be self-sustaining (fire).',
      },
      {
        criterion: 'Bond Energy',
        sideA: 'Energy required to break reactant bonds exceeds energy released by forming product bonds. Net energy must come from surroundings.',
        sideB: 'Energy released by forming product bonds exceeds energy required to break reactant bonds. Net energy is emitted.',
      },
      {
        criterion: 'Examples',
        sideA: 'Photosynthesis, dissolving salts, cooking food, electrolysis of water, and thermal decomposition of limestone.',
        sideB: 'Combustion, rusting, cellular respiration, neutralization of acids and bases, and concrete setting.',
      },
    ],
    conclusion:
      'Whether a reaction is endothermic or exothermic depends on the relative bond energies of reactants and products. Both types are essential: exothermic reactions power our world (combustion, metabolism), while endothermic reactions enable manufacturing (smelting, cooking) and biological processes (photosynthesis).',
    relatedGames: ['endothermic-exothermic', 'hand-warmer', 'arrhenius', 'latent-heat', 'phase-change-energy'],
  },
  {
    slugA: 'inelastic-collisions',
    slugB: 'ballistic-pendulum',
    comparisonSlug: 'elastic-vs-inelastic-collisions',
    title: 'Elastic vs Inelastic Collisions: Conservation Laws in Action',
    description:
      'Compare collisions where kinetic energy is conserved (elastic) with those where it is converted to heat, sound, or deformation (inelastic). Momentum is conserved in both types.',
    criteria: [
      {
        criterion: 'Kinetic Energy',
        sideA: 'Elastic collisions conserve total kinetic energy. Objects bounce apart with no permanent deformation. Idealized: billiard balls, atomic collisions.',
        sideB: 'Inelastic collisions lose kinetic energy to deformation, heat, or sound. In perfectly inelastic collisions, objects stick together.',
      },
      {
        criterion: 'Momentum Conservation',
        sideA: 'Total momentum is conserved in elastic collisions. Combined with energy conservation, both final velocities are uniquely determined.',
        sideB: 'Total momentum is equally conserved in inelastic collisions. This allows measuring unknown velocities (ballistic pendulum).',
      },
      {
        criterion: 'Coefficient of Restitution',
        sideA: 'Elastic collisions have a coefficient of restitution (e) equal to 1. Relative speed of separation equals relative speed of approach.',
        sideB: 'Inelastic collisions have 0 < e < 1. Perfectly inelastic: e = 0, objects move together after collision.',
      },
      {
        criterion: 'Real-World Occurrence',
        sideA: 'Truly elastic collisions are rare in everyday life. Nearly elastic: steel balls, hard billiard balls, atomic and subatomic particles.',
        sideB: 'Most real collisions are inelastic to some degree: car crashes, sports impacts, bullet impacts, dropped objects.',
      },
      {
        criterion: 'Analysis Complexity',
        sideA: 'Elastic collision problems have two equations (momentum + energy) and two unknowns, yielding exact analytical solutions.',
        sideB: 'Inelastic collision problems need only momentum conservation (one equation). Energy loss must be measured or estimated separately.',
      },
    ],
    conclusion:
      'The distinction matters enormously in engineering: car crumple zones are designed for maximum inelasticity (absorbing kinetic energy as deformation to protect passengers), while particle physics relies on elastic scattering to probe atomic structure.',
    relatedGames: ['inelastic-collisions', 'ballistic-pendulum', 'momentum-conservation', 'two-ball-collision', 'egg-drop', 'energy-conservation'],
  },
  {
    slugA: 'damped-oscillations',
    slugB: 'forced-oscillations',
    comparisonSlug: 'damped-vs-forced-oscillations',
    title: 'Damped vs Forced Oscillations: Decay vs Driven Response',
    description:
      'Compare oscillations that lose energy over time (damped) with oscillations sustained by an external periodic force (forced). Understand how damping ratio and driving frequency shape system behavior.',
    criteria: [
      {
        criterion: 'Energy Flow',
        sideA: 'Damped oscillations continuously lose energy to friction, air resistance, or internal dissipation. Amplitude decreases exponentially over time.',
        sideB: 'Forced oscillations receive energy from an external periodic driver. Steady-state amplitude depends on driving frequency and damping.',
      },
      {
        criterion: 'Amplitude Behavior',
        sideA: 'Amplitude decays as A(t) = A0 * e^(-gamma*t). The system eventually comes to rest unless re-excited.',
        sideB: 'After an initial transient, amplitude reaches a steady state determined by the balance between energy input and dissipation.',
      },
      {
        criterion: 'Resonance',
        sideA: 'Damped systems do not exhibit resonance on their own. The natural frequency shifts slightly lower due to damping (damped natural frequency).',
        sideB: 'Forced systems exhibit resonance when the driving frequency matches the natural frequency. Peak amplitude can be dramatically amplified at low damping.',
      },
      {
        criterion: 'Frequency Content',
        sideA: 'A damped oscillator vibrates at its damped natural frequency, which is slightly lower than the undamped natural frequency.',
        sideB: 'A forced oscillator vibrates at the driving frequency in steady state, regardless of its natural frequency.',
      },
      {
        criterion: 'Engineering Applications',
        sideA: 'Shock absorbers, building dampers, and instrument needle settling all rely on controlled damping to dissipate unwanted oscillations.',
        sideB: 'Radio tuning circuits, vibration testing, and resonant energy harvesting all exploit forced oscillation and resonance phenomena.',
      },
    ],
    conclusion:
      'Damped oscillations describe how systems naturally lose energy and return to equilibrium. Forced oscillations describe how external energy sustains motion, with resonance being the critical phenomenon where small inputs produce large responses. Most real systems involve both simultaneously.',
    relatedGames: ['damped-oscillations', 'forced-oscillations', 'resonance', 'damping', 'tuned-mass-damper'],
  },
  {
    slugA: 'tensor-core',
    slugB: 'systolic-array',
    comparisonSlug: 'tensor-core-vs-systolic-array',
    title: 'Tensor Core vs Systolic Array: NVIDIA vs Google Matrix Hardware',
    description:
      'Compare NVIDIA Tensor Cores and Google TPU systolic arrays, the two dominant hardware approaches to accelerating matrix multiply-accumulate operations at the heart of deep learning.',
    criteria: [
      {
        criterion: 'Architecture',
        sideA: 'Tensor Cores are specialized units embedded within NVIDIA GPU streaming multiprocessors. Each core performs a 4x4 matrix multiply-accumulate per cycle.',
        sideB: 'Systolic arrays are a grid of processing elements where data flows rhythmically between neighbors, performing multiply-accumulate at each node without global memory access.',
      },
      {
        criterion: 'Data Flow Model',
        sideA: 'Tensor Cores use a register-file-based model. Operands are loaded from shared memory, computed, and results written back. Data reuse relies on the GPU cache hierarchy.',
        sideB: 'Systolic arrays pump data through the array in a wave-like fashion. Each element reuses data from its neighbor, minimizing memory bandwidth requirements.',
      },
      {
        criterion: 'Precision Support',
        sideA: 'Tensor Cores support FP16, BF16, TF32, INT8, INT4, and FP8 across GPU generations, offering flexible precision for training and inference.',
        sideB: 'TPU systolic arrays are optimized primarily for BF16 and INT8, with newer generations adding FP8. Precision options are more constrained but well-tuned for ML workloads.',
      },
      {
        criterion: 'Integration',
        sideA: 'Tensor Cores coexist with CUDA cores, enabling the same GPU to handle non-matrix workloads (memory-bound ops, control flow) alongside matrix math.',
        sideB: 'Systolic arrays are the dominant compute unit in TPUs. Non-matrix operations run on a separate scalar/vector unit with limited flexibility.',
      },
      {
        criterion: 'Software Ecosystem',
        sideA: 'Tensor Cores are programmed via CUDA, cuBLAS, cuDNN, and framework integrations (PyTorch, TensorFlow). Broad third-party support exists.',
        sideB: 'Systolic arrays are programmed via XLA compiler optimizations, primarily through JAX and TensorFlow. The ecosystem is narrower but deeply optimized.',
      },
    ],
    conclusion:
      'Tensor Cores offer greater flexibility and ecosystem breadth, making them the default choice for diverse AI workloads. Systolic arrays deliver superior efficiency for large-scale matrix operations when the workload fits the TPU programming model, particularly for training massive models on Google Cloud.',
    relatedGames: ['tensor-core', 'systolic-array', 'g-p-u-memory-bandwidth', 'a-s-i-cvs-g-p-u', 't-p-uvs-g-p-u'],
  },
  {
    slugA: 'g-p-u-occupancy',
    slugB: 'g-p-u-memory-bandwidth',
    comparisonSlug: 'gpu-occupancy-vs-memory-bandwidth',
    title: 'GPU Occupancy vs Memory Bandwidth: Compute vs Memory Bottleneck',
    description:
      'Understand the two primary GPU performance limiters: occupancy (how well compute units stay busy) and memory bandwidth (how fast data feeds the cores). Diagnosing which bottleneck dominates is key to optimization.',
    criteria: [
      {
        criterion: 'Definition',
        sideA: 'GPU occupancy measures the ratio of active warps to the maximum warps a streaming multiprocessor can support. Higher occupancy hides memory latency through warp switching.',
        sideB: 'Memory bandwidth measures the rate at which data moves between GPU global memory (HBM/GDDR) and the compute cores, typically measured in GB/s.',
      },
      {
        criterion: 'Bottleneck Symptom',
        sideA: 'Low occupancy means compute units sit idle waiting for data or stalled on dependencies. Performance improves by launching more threads or reducing register usage.',
        sideB: 'Bandwidth saturation means compute units are ready but starved for data. Performance improves by reducing data movement or increasing arithmetic intensity.',
      },
      {
        criterion: 'Optimization Strategy',
        sideA: 'Improve occupancy by reducing per-thread register usage, decreasing shared memory per block, or restructuring kernel launch configurations.',
        sideB: 'Improve bandwidth utilization by coalescing memory accesses, using shared memory as a scratchpad, applying data compression, or switching to lower-precision formats.',
      },
      {
        criterion: 'Measurement',
        sideA: 'Occupancy is measured via profiling tools (NVIDIA Nsight, rocProf) that report active warps vs. maximum warps per SM.',
        sideB: 'Bandwidth utilization is measured by comparing achieved GB/s against the theoretical peak bandwidth of the memory subsystem.',
      },
      {
        criterion: 'Workload Dependence',
        sideA: 'Compute-bound kernels (dense matrix math, crypto hashing) are occupancy-sensitive. More warps keep ALUs fed.',
        sideB: 'Memory-bound kernels (element-wise operations, reductions, attention mechanisms) are bandwidth-sensitive. The roofline model quantifies this transition.',
      },
    ],
    conclusion:
      'Most real GPU kernels are memory-bandwidth-limited rather than compute-limited, especially in AI inference. The roofline model helps identify which bottleneck dominates. Optimal performance requires balancing both: enough occupancy to hide latency, and enough arithmetic intensity to avoid bandwidth saturation.',
    relatedGames: ['g-p-u-occupancy', 'g-p-u-memory-bandwidth', 'tensor-core', 'memory-hierarchy', 'data-movement-energy'],
  },
  {
    slugA: 'a-i-inference-latency',
    slugB: 'batching-latency',
    comparisonSlug: 'inference-latency-vs-batching',
    title: 'Inference Latency vs Batching: Single Request Speed vs Throughput',
    description:
      'Compare the tension between minimizing per-request latency for real-time AI inference and maximizing throughput through request batching. This tradeoff shapes every production AI serving system.',
    criteria: [
      {
        criterion: 'Optimization Goal',
        sideA: 'Inference latency optimization minimizes the time from receiving a single request to returning a result. Target: milliseconds for interactive applications.',
        sideB: 'Batching optimization groups multiple requests to process them simultaneously, maximizing GPU utilization and total throughput (requests per second).',
      },
      {
        criterion: 'GPU Utilization',
        sideA: 'Single-request inference often underutilizes GPU compute. A large model may use only 10-20% of available FLOPS on a single input.',
        sideB: 'Batching fills GPU pipelines by processing multiple inputs in parallel, approaching peak hardware utilization at large batch sizes.',
      },
      {
        criterion: 'Latency Impact',
        sideA: 'Minimum latency is achieved at batch size 1 with no queuing delay. Response time equals pure computation time.',
        sideB: 'Batching introduces queuing delay as the system waits to accumulate enough requests. Larger batches increase per-request latency but reduce cost per request.',
      },
      {
        criterion: 'Cost Efficiency',
        sideA: 'Low-latency single-request serving is expensive per query because hardware sits partially idle between requests.',
        sideB: 'Batched serving amortizes GPU cost across many requests, reducing cost per inference by 5-20x at optimal batch sizes.',
      },
      {
        criterion: 'Use Cases',
        sideA: 'Real-time chatbots, autonomous driving perception, and interactive code completion require minimal latency even at higher cost.',
        sideB: 'Offline batch processing, recommendation systems, and content moderation pipelines benefit from high-throughput batched inference.',
      },
    ],
    conclusion:
      'Production AI systems use dynamic batching and continuous batching to balance this tradeoff, collecting requests over a short window to build batches without excessive queuing delay. The optimal batch size depends on the latency SLA, model size, and hardware capabilities.',
    relatedGames: ['a-i-inference-latency', 'batching-latency', 'energy-per-token', 'quantization-precision', 'g-p-u-occupancy'],
  },
  {
    slugA: 'p-v-i-v-curve',
    slugB: 'fill-factor',
    comparisonSlug: 'iv-curve-vs-fill-factor',
    title: 'IV Curve vs Fill Factor: Solar Cell Characterization Methods',
    description:
      'Compare the full current-voltage characteristic of a solar cell (IV curve) with the single-number quality metric derived from it (fill factor). Both are essential for evaluating photovoltaic performance.',
    criteria: [
      {
        criterion: 'Information Content',
        sideA: 'The IV curve plots current versus voltage across the full operating range, revealing Isc, Voc, maximum power point, and the shape of the diode characteristic.',
        sideB: 'Fill factor is a single dimensionless number (0 to 1) that summarizes how rectangular the IV curve is: FF = Pmax / (Isc * Voc).',
      },
      {
        criterion: 'Diagnostic Power',
        sideA: 'The IV curve shape reveals specific degradation mechanisms: shunt resistance causes slope near Isc, series resistance causes slope near Voc, and recombination affects the curve knee.',
        sideB: 'Fill factor indicates overall cell quality but cannot distinguish between different loss mechanisms. A low FF could result from high series resistance, low shunt resistance, or both.',
      },
      {
        criterion: 'Measurement',
        sideA: 'IV curve measurement requires a solar simulator, electronic load, and data acquisition system that sweeps voltage while recording current under standard test conditions.',
        sideB: 'Fill factor is calculated from three points on the IV curve (Isc, Voc, and Pmax), making it easy to compute once the curve is measured.',
      },
      {
        criterion: 'Typical Values',
        sideA: 'IV curves vary by cell technology: monocrystalline silicon cells show sharp knees with Voc around 0.65V, while thin-film cells have lower Voc and softer knees.',
        sideB: 'Good crystalline silicon cells achieve FF of 0.78-0.83. Thin-film cells typically reach 0.65-0.75. Research cells can exceed 0.85.',
      },
      {
        criterion: 'Use in System Design',
        sideA: 'The full IV curve is needed for MPPT algorithm design, string sizing, and predicting performance under partial shading or non-standard conditions.',
        sideB: 'Fill factor is used for quick cell-to-cell quality comparison, production line sorting, and estimating module efficiency from cell-level measurements.',
      },
    ],
    conclusion:
      'The IV curve is the fundamental measurement from which all solar cell parameters are derived, including fill factor. While fill factor provides a convenient single-metric summary, diagnosing cell performance issues requires examining the full IV curve shape.',
    relatedGames: ['p-v-i-v-curve', 'fill-factor', 'solar-cell', 'm-p-p-t', 'shunt-series-defects'],
  },
  {
    slugA: 'm-o-s-f-e-t-switching',
    slugB: 's-r-a-m-cell',
    comparisonSlug: 'mosfet-vs-sram-cell',
    title: 'MOSFET Switching vs SRAM Cell: Single Transistor vs Memory Cell',
    description:
      'Compare the behavior of a single MOSFET as a logic switch with the six-transistor SRAM cell that stores one bit of data. Understand how individual transistors combine to create stable memory.',
    criteria: [
      {
        criterion: 'Structure',
        sideA: 'A MOSFET is a single three-terminal device (gate, source, drain) that acts as a voltage-controlled switch, turning on or off based on the gate voltage.',
        sideB: 'An SRAM cell uses six MOSFETs: two cross-coupled inverters for storage and two access transistors for read/write. The latch holds state without refresh.',
      },
      {
        criterion: 'Function',
        sideA: 'A MOSFET switches between conducting and non-conducting states to implement logic gates. It processes information but does not store it persistently.',
        sideB: 'An SRAM cell stores one bit of data as a stable state of the cross-coupled inverter pair. It retains data as long as power is supplied.',
      },
      {
        criterion: 'Speed',
        sideA: 'MOSFET switching speed is determined by gate capacitance and drive current. Modern transistors switch in picoseconds at the gate level.',
        sideB: 'SRAM access time includes wordline activation, bitline sensing, and sense amplifier delay. Typical L1 cache access is 1-4 clock cycles.',
      },
      {
        criterion: 'Power Consumption',
        sideA: 'A single MOSFET consumes dynamic power during switching (CV2f) and static leakage power when idle. Both scale with transistor dimensions.',
        sideB: 'An SRAM cell consumes static leakage from six transistors continuously. Total SRAM leakage dominates chip idle power in cache-heavy processors.',
      },
      {
        criterion: 'Design Challenges',
        sideA: 'MOSFET design challenges include threshold voltage variability, short-channel effects, and gate oxide leakage at advanced nodes.',
        sideB: 'SRAM design challenges include read stability (preventing bit flip during read), write margin (overcoming the latch), and cell area scaling.',
      },
    ],
    conclusion:
      'The MOSFET is the fundamental building block, while the SRAM cell demonstrates how transistors are combined to create emergent functionality (memory). Understanding both is essential because SRAM cells are the most replicated structure on modern processors, and their scaling limitations directly constrain cache sizes and chip architecture.',
    relatedGames: ['m-o-s-f-e-t-switching', 's-r-a-m-cell', 'leakage-current', 'leakage-power', 's-r-a-m-yield-redundancy'],
  },
  {
    slugA: 'leakage-current',
    slugB: 'leakage-power',
    comparisonSlug: 'leakage-current-vs-leakage-power',
    title: 'Leakage Current vs Leakage Power: Individual vs Aggregate Impact',
    description:
      'Compare transistor-level leakage current with chip-level leakage power. A few picoamps per transistor multiplied by billions of transistors creates a major power management challenge in modern processors.',
    criteria: [
      {
        criterion: 'Scale',
        sideA: 'Leakage current is measured per transistor, typically picoamps to nanoamps. It flows through the gate oxide and from source to drain even when the transistor is nominally off.',
        sideB: 'Leakage power is the aggregate: billions of transistors each leaking small currents produce watts of total leakage power, often 30-50% of total chip power.',
      },
      {
        criterion: 'Physical Mechanisms',
        sideA: 'Leakage current includes subthreshold leakage (weak inversion), gate oxide tunneling, junction leakage (reverse-biased PN junctions), and GIDL (gate-induced drain leakage).',
        sideB: 'Leakage power equals the sum of all leakage currents multiplied by the supply voltage: P_leak = V_dd * sum(I_leak). It grows exponentially with temperature.',
      },
      {
        criterion: 'Technology Scaling',
        sideA: 'Leakage current per transistor increases with each process node as gate oxides thin and channel lengths shrink, reducing the barrier to unwanted current flow.',
        sideB: 'Leakage power can decrease per chip generation if the transistor count growth is offset by lower Vdd and architectural techniques like power gating.',
      },
      {
        criterion: 'Mitigation',
        sideA: 'Individual transistor leakage is reduced by high-k gate dielectrics, multi-gate structures (FinFET, GAA), and higher threshold voltage for non-critical paths.',
        sideB: 'Chip-level leakage power is managed by power gating (cutting Vdd to idle blocks), dynamic voltage scaling, and temperature management.',
      },
      {
        criterion: 'Measurement',
        sideA: 'Leakage current is characterized on individual test transistors in the fab using sensitive picoammeters at controlled temperatures.',
        sideB: 'Leakage power is measured at the chip level as the idle power draw when clocks are stopped but supply voltage is maintained (IDDQ testing).',
      },
    ],
    conclusion:
      'Leakage current is a transistor-level physics phenomenon; leakage power is its system-level consequence. Managing leakage power has become as important as managing dynamic power in modern chip design, driving innovations from FinFET transistors to aggressive power gating architectures.',
    relatedGames: ['leakage-current', 'leakage-power', 'm-o-s-f-e-t-switching', 'd-v-f-s', 'power-delivery-network'],
  },
  {
    slugA: 'r-c-delay',
    slugB: 'r-c-delay-interconnect',
    comparisonSlug: 'rc-delay-vs-interconnect-delay',
    title: 'RC Delay vs Interconnect Delay: Simple vs Distributed Model',
    description:
      'Compare the simple lumped RC delay model with the distributed RC delay model used for on-chip interconnects. Understanding when each model applies is essential for accurate timing analysis.',
    criteria: [
      {
        criterion: 'Model Structure',
        sideA: 'Lumped RC delay treats the wire as a single resistor and capacitor in series. Delay = 0.69 * R * C (for 50% threshold). Simple but inaccurate for long wires.',
        sideB: 'Distributed RC delay models the wire as many small RC segments. Delay = 0.38 * R * C for the Elmore model, reflecting that capacitance charges progressively along the wire.',
      },
      {
        criterion: 'Accuracy',
        sideA: 'The lumped model overestimates delay because it assumes all capacitance is at the far end. Acceptable only for short wires where wire delay is small compared to gate delay.',
        sideB: 'The distributed model captures the progressive charging of wire capacitance, providing 10-20% accuracy for real interconnects. Higher-order models improve further.',
      },
      {
        criterion: 'Scaling Behavior',
        sideA: 'In the lumped model, delay scales linearly with wire length (proportional to R * C, where both scale with length). This underestimates the true quadratic scaling.',
        sideB: 'In the distributed model, delay scales quadratically with wire length (R and C both proportional to length, so delay ~ L^2). This motivates repeater insertion.',
      },
      {
        criterion: 'Design Implications',
        sideA: 'The lumped model is used for quick back-of-envelope calculations and for very short local interconnects where gate delay dominates.',
        sideB: 'The distributed model drives critical design decisions: repeater insertion spacing, wire sizing, metal layer assignment, and global clock tree design.',
      },
    ],
    conclusion:
      'The lumped RC model is a useful starting point but seriously underestimates delay for long interconnects. Modern chips use distributed RC models and extracted parasitics for timing closure. As wires have become the bottleneck at advanced nodes, accurate interconnect delay modeling is critical to chip performance.',
    relatedGames: ['r-c-delay', 'r-c-delay-interconnect', 'crosstalk', 'electromigration', 'clock-distribution'],
  },
  {
    slugA: 'clock-distribution',
    slugB: 'clock-jitter',
    comparisonSlug: 'clock-distribution-vs-clock-jitter',
    title: 'Clock Distribution vs Clock Jitter: Skew vs Noise',
    description:
      'Compare the deterministic challenge of delivering a clock signal to all parts of a chip (distribution/skew) with the random timing uncertainty of the clock edge itself (jitter). Both consume timing margin.',
    criteria: [
      {
        criterion: 'Nature of the Problem',
        sideA: 'Clock distribution deals with the deterministic delay differences (skew) caused by different wire lengths and buffer stages between the clock source and each flip-flop.',
        sideB: 'Clock jitter is the random, cycle-to-cycle variation in the timing of clock edges, caused by power supply noise, thermal noise, and PLL instabilities.',
      },
      {
        criterion: 'Magnitude',
        sideA: 'Clock skew can be tens to hundreds of picoseconds across a large chip. H-tree and mesh distribution networks aim to minimize it.',
        sideB: 'Clock jitter is typically 5-50 picoseconds RMS. Even small jitter erodes timing margins and limits maximum frequency.',
      },
      {
        criterion: 'Mitigation Techniques',
        sideA: 'Skew is reduced by balanced clock trees (H-trees, fishbone), clock mesh networks, and tunable delay buffers. CTS (clock tree synthesis) tools automate this.',
        sideB: 'Jitter is reduced by clean power supply design, low-noise PLL/DLL circuits, filtering, and using low-jitter clock sources.',
      },
      {
        criterion: 'Impact on Timing',
        sideA: 'Skew directly affects setup and hold timing between flip-flops in different clock domains. It can be both helpful (borrowing time) and harmful.',
        sideB: 'Jitter always hurts timing by adding uncertainty. It must be treated as a timing margin deduction from the available clock period.',
      },
      {
        criterion: 'Measurement',
        sideA: 'Skew is measured using on-chip timing monitors or by probing the clock signal at different locations with high-bandwidth oscilloscopes.',
        sideB: 'Jitter is measured statistically using time-interval analyzers or oscilloscopes with jitter analysis, reporting RMS and peak-to-peak values.',
      },
    ],
    conclusion:
      'Clock distribution (skew) and clock jitter both consume precious timing margin from the clock period. Skew is a deterministic problem solved by careful physical design, while jitter is a noise problem solved by analog circuit quality. Modern high-frequency designs must budget for both simultaneously.',
    relatedGames: ['clock-distribution', 'clock-jitter', 'metastability', 'r-c-delay-interconnect', 'decoupling-capacitor'],
  },
  {
    slugA: 'network-congestion',
    slugB: 'network-latency',
    comparisonSlug: 'network-congestion-vs-latency',
    title: 'Network Congestion vs Latency: Throughput vs Response Time',
    description:
      'Compare network congestion (too much traffic overwhelming link capacity) with network latency (the inherent delay in transmitting data). Both affect user experience but require different solutions.',
    criteria: [
      {
        criterion: 'Definition',
        sideA: 'Network congestion occurs when traffic demand exceeds link or router capacity, causing packet queuing, increased delay, and eventually packet drops.',
        sideB: 'Network latency is the time for a packet to travel from source to destination, including propagation delay, serialization delay, and processing delay at each hop.',
      },
      {
        criterion: 'Causes',
        sideA: 'Congestion is caused by traffic bursts, insufficient bandwidth provisioning, incast problems (many-to-one traffic patterns), and poor traffic engineering.',
        sideB: 'Latency is caused by physical distance (speed of light), number of routing hops, serialization of packets onto links, and protocol overhead.',
      },
      {
        criterion: 'Symptoms',
        sideA: 'Congestion manifests as increasing queue depths, rising tail latency, packet loss, TCP retransmissions, and reduced throughput during peak periods.',
        sideB: 'Latency manifests as consistent delay even under light load. A cross-continent round trip takes ~60ms at minimum due to the speed of light in fiber.',
      },
      {
        criterion: 'Solutions',
        sideA: 'Congestion is managed by adding bandwidth, traffic shaping, congestion control algorithms (TCP BBR, DCTCP), load balancing, and quality-of-service policies.',
        sideB: 'Latency is reduced by moving compute closer to users (CDNs, edge computing), reducing hop count, using faster protocols, and optimizing software processing.',
      },
      {
        criterion: 'Relationship',
        sideA: 'Congestion increases effective latency by adding queuing delay on top of baseline latency. Worst case: tail latency spikes to seconds during congestion events.',
        sideB: 'Baseline latency exists even without any congestion. You cannot serve a user in Tokyo from a Virginia datacenter faster than the speed of light allows (~70ms RTT).',
      },
    ],
    conclusion:
      'Latency sets the floor on response time, while congestion raises the ceiling. Optimizing for low latency (via edge deployment) and preventing congestion (via traffic engineering) are complementary strategies. Modern distributed systems must address both to deliver consistent user experience.',
    relatedGames: ['network-congestion', 'network-latency', 'p-c-ie-bandwidth', 'interconnect-topology', 'batching-latency'],
  },
  {
    slugA: 'bypass-diodes',
    slugB: 'shunt-series-defects',
    comparisonSlug: 'bypass-diodes-vs-shunt-defects',
    title: 'Bypass Diodes vs Shunt/Series Defects: Protection vs Degradation',
    description:
      'Compare bypass diodes (intentional protection components in solar modules) with shunt and series resistance defects (unintentional degradation mechanisms). Both affect module current flow but in opposite ways.',
    criteria: [
      {
        criterion: 'Purpose',
        sideA: 'Bypass diodes are intentionally installed to protect shaded cells from reverse-biased hot-spot damage by providing an alternative current path around underperforming cell groups.',
        sideB: 'Shunt and series defects are unintentional degradation mechanisms. Shunt paths allow current leakage; high series resistance impedes current flow, both reducing power output.',
      },
      {
        criterion: 'Electrical Behavior',
        sideA: 'Bypass diodes activate when a cell group is shaded or damaged, forward-biasing at ~0.6V. They sacrifice that cell group\'s voltage contribution to maintain string current.',
        sideB: 'Shunt resistance creates a parallel leakage path that diverts current from the load, reducing voltage at low light. Series resistance drops voltage proportionally to current, especially near Isc.',
      },
      {
        criterion: 'Impact on IV Curve',
        sideA: 'Bypass diode activation creates distinct steps in the module IV curve. Each step corresponds to one bypassed cell group, reducing Voc by that group\'s voltage.',
        sideB: 'Shunt defects reduce the slope of the IV curve near Voc. Series defects reduce the slope near Isc. Both reduce the fill factor and maximum power.',
      },
      {
        criterion: 'Detection',
        sideA: 'Bypass diode activation is visible as steps in the IV curve, temperature hot spots in IR imaging, and reduced module voltage during partial shading.',
        sideB: 'Shunt and series defects are detected via IV curve analysis (comparing slope to ideal), electroluminescence imaging, and dark IV measurements.',
      },
      {
        criterion: 'Remediation',
        sideA: 'Failed bypass diodes (open or short) are replaced during module maintenance. Proper diode sizing prevents thermal runaway during prolonged activation.',
        sideB: 'Shunt defects sometimes self-heal under reverse bias. Series resistance from degraded contacts or corrosion is typically irreversible and requires module replacement.',
      },
    ],
    conclusion:
      'Bypass diodes are a designed-in safety feature that prevents catastrophic damage at the cost of some power loss during shading. Shunt and series defects are failure modes that progressively reduce module performance. Understanding both is essential for solar system monitoring and maintenance.',
    relatedGames: ['bypass-diodes', 'shunt-series-defects', 'p-v-i-v-curve', 'fill-factor', 'cell-to-module-losses'],
  },
  {
    slugA: 'solar-temp-coefficient',
    slugB: 'solar-thermal-derating',
    comparisonSlug: 'solar-temp-vs-thermal-derating',
    title: 'Solar Temperature Coefficient vs Thermal Derating: Coefficient vs System Impact',
    description:
      'Compare the fundamental material property (temperature coefficient) with its system-level consequence (thermal derating). One describes the physics; the other quantifies the real-world energy loss.',
    criteria: [
      {
        criterion: 'Definition',
        sideA: 'The temperature coefficient specifies how a solar cell parameter (Voc, Isc, Pmax) changes per degree Celsius deviation from the 25C standard test condition, typically -0.3 to -0.5%/C for power.',
        sideB: 'Thermal derating is the actual power reduction experienced by a module operating above 25C in the field. It depends on ambient temperature, irradiance, mounting, and wind speed.',
      },
      {
        criterion: 'Scope',
        sideA: 'Temperature coefficient is a cell-level material property, measured under controlled laboratory conditions at standard irradiance (1000 W/m2).',
        sideB: 'Thermal derating is a system-level effect that accounts for installation specifics: rooftop modules run hotter than ground-mount, dark frames absorb more heat, and poor ventilation raises cell temperature.',
      },
      {
        criterion: 'Typical Values',
        sideA: 'Crystalline silicon: -0.35 to -0.45%/C. CdTe thin film: -0.25%/C. HJT cells: -0.26%/C. Lower magnitude is better.',
        sideB: 'In hot climates, thermal derating can reduce annual energy yield by 5-15%. A module at 65C cell temperature (common in summer) loses ~15-18% of its rated power.',
      },
      {
        criterion: 'Mitigation',
        sideA: 'Cell temperature coefficient is improved by selecting materials with wider bandgaps (CdTe) or better passivation (HJT) that reduce voltage loss at high temperature.',
        sideB: 'Thermal derating is mitigated by good ventilation (standoff mounting), reflective backsheets, bifacial modules, and site selection in cooler climates.',
      },
    ],
    conclusion:
      'The temperature coefficient is the material-level input; thermal derating is the system-level output. Module datasheets report the coefficient, but accurate energy yield prediction requires modeling actual cell temperature using weather data, installation geometry, and thermal properties of the mounting system.',
    relatedGames: ['solar-temp-coefficient', 'solar-thermal-derating', 'solar-cell', 'solar-yield-prediction', 'bifacial-albedo'],
  },
  {
    slugA: 'latent-heat',
    slugB: 'phase-change-energy',
    comparisonSlug: 'latent-heat-vs-phase-change-energy',
    title: 'Latent Heat vs Phase Change Energy: Heat Absorbed vs Total Energy',
    description:
      'Compare latent heat (the energy absorbed or released during a phase change at constant temperature) with the total energy budget of phase transitions including sensible heat and work done.',
    criteria: [
      {
        criterion: 'Definition',
        sideA: 'Latent heat is the energy per unit mass absorbed or released during a phase change without a temperature change. Units: J/kg or kJ/mol. Example: water\'s heat of vaporization is 2260 kJ/kg.',
        sideB: 'Phase change energy encompasses the total energy involved in a phase transition, including latent heat, sensible heat to reach the transition temperature, and any PV work done during expansion.',
      },
      {
        criterion: 'Temperature Behavior',
        sideA: 'During the latent heat portion, temperature remains constant even as energy is added. The flat plateau on a heating curve represents latent heat absorption.',
        sideB: 'Phase change energy includes the heating before and after the plateau. Total energy to boil room-temperature water includes sensible heat (25C to 100C) plus latent heat of vaporization.',
      },
      {
        criterion: 'Magnitude Comparison',
        sideA: 'Latent heat is often the dominant component. Boiling water: latent heat (2260 kJ/kg) far exceeds the sensible heat to reach boiling (~314 kJ/kg from 25C to 100C).',
        sideB: 'Total phase change energy is always greater than latent heat alone. For practical systems, both sensible and latent contributions must be included in energy budgets.',
      },
      {
        criterion: 'Applications',
        sideA: 'Latent heat is used in phase change materials (PCMs) for thermal storage, ice-based cooling, steam power generation, and evaporative cooling systems.',
        sideB: 'Total phase change energy calculations are needed for HVAC system sizing, industrial process design, freeze-protection engineering, and food processing energy budgets.',
      },
    ],
    conclusion:
      'Latent heat is the specific energy of the phase transition itself, while phase change energy is the broader accounting of all energy required to complete the transition from initial to final state. Engineers must consider both when designing thermal systems, as the sensible heat component can be significant.',
    relatedGames: ['latent-heat', 'phase-change-energy', 'boiling-pressure', 'evaporative-cooling', 'carnot-cycle'],
  },
  {
    slugA: 'supercooling',
    slugB: 'leidenfrost',
    comparisonSlug: 'supercooling-vs-leidenfrost',
    title: 'Supercooling vs Leidenfrost Effect: Below Freezing vs Above Boiling',
    description:
      'Compare two fascinating non-equilibrium thermal phenomena: supercooling (liquid persisting below its freezing point) and the Leidenfrost effect (liquid droplets hovering on a vapor cushion above a hot surface).',
    criteria: [
      {
        criterion: 'Phenomenon',
        sideA: 'Supercooling occurs when a liquid is cooled below its freezing point without solidifying. The liquid is metastable and can freeze suddenly when nucleation is triggered.',
        sideB: 'The Leidenfrost effect occurs when a liquid contacts a surface far above its boiling point. Rapid vaporization creates an insulating vapor layer that levitates the droplet.',
      },
      {
        criterion: 'Stability',
        sideA: 'Supercooled liquid is metastable. Any disturbance, impurity, or seed crystal can trigger rapid, dramatic crystallization throughout the entire volume.',
        sideB: 'The Leidenfrost state is relatively stable as long as the surface temperature exceeds the Leidenfrost point. The droplet can persist for minutes, dancing on its vapor cushion.',
      },
      {
        criterion: 'Heat Transfer',
        sideA: 'Supercooling does not significantly alter heat transfer rates. Once nucleation occurs, the latent heat of fusion is released rapidly, warming the mixture back to the freezing point.',
        sideB: 'The Leidenfrost effect dramatically reduces heat transfer because the vapor layer acts as a thermal insulator, paradoxically slowing evaporation despite the extreme temperature difference.',
      },
      {
        criterion: 'Temperature Range',
        sideA: 'Supercooling of pure water can reach -40C under carefully controlled conditions. Typical supercooling in nature is a few degrees below freezing.',
        sideB: 'The Leidenfrost effect for water on a metal surface typically begins around 200-300C. The optimal Leidenfrost point depends on surface roughness and liquid properties.',
      },
      {
        criterion: 'Practical Significance',
        sideA: 'Supercooling causes freezing rain, affects food preservation (flash freezing), enables reusable hand warmers (supersaturated sodium acetate), and is studied in cryopreservation.',
        sideB: 'The Leidenfrost effect explains why water drops dance on hot pans, affects industrial quenching and spray cooling, and has been studied for self-propelling droplet engines.',
      },
    ],
    conclusion:
      'Both phenomena involve phase transitions delayed or altered by non-equilibrium conditions. Supercooling delays solidification below the freezing point due to lack of nucleation sites, while the Leidenfrost effect delays boiling above the boiling point by creating a protective vapor barrier. Both are important in industrial thermal processing.',
    relatedGames: ['supercooling', 'leidenfrost', 'latent-heat', 'boiling-pressure', 'evaporative-cooling'],
  },
  {
    slugA: 'adiabatic-heating',
    slugB: 'newton-cooling',
    comparisonSlug: 'adiabatic-heating-vs-newton-cooling',
    title: 'Adiabatic Heating vs Newton Cooling: Compression Heating vs Convective Cooling',
    description:
      'Compare two fundamental thermal processes: adiabatic heating (temperature rise from gas compression without heat exchange) and Newtonian cooling (heat loss to surroundings proportional to temperature difference).',
    criteria: [
      {
        criterion: 'Mechanism',
        sideA: 'Adiabatic heating occurs when a gas is compressed without exchanging heat with its surroundings. The work done on the gas increases its internal energy and temperature.',
        sideB: 'Newtonian cooling occurs when a hot object loses heat to cooler surroundings. The rate of heat loss is proportional to the temperature difference (Newton\'s law of cooling).',
      },
      {
        criterion: 'Heat Exchange',
        sideA: 'By definition, adiabatic processes involve zero heat transfer (Q = 0). All energy change comes from work: delta-U = -W. Temperature change depends on compression ratio.',
        sideB: 'Newtonian cooling is entirely about heat transfer. The cooling rate dT/dt = -h*A*(T - T_env)/(m*c) depends on the heat transfer coefficient, surface area, and thermal mass.',
      },
      {
        criterion: 'Time Dependence',
        sideA: 'Adiabatic heating is nearly instantaneous in rapid compressions (diesel engine ignition, shock waves). The temperature rise tracks the compression directly.',
        sideB: 'Newtonian cooling is exponential in time. Temperature approaches ambient asymptotically: T(t) = T_env + (T0 - T_env)*e^(-t/tau). The time constant depends on thermal mass and surface conditions.',
      },
      {
        criterion: 'Governing Equations',
        sideA: 'For an ideal gas: T2/T1 = (V1/V2)^(gamma-1) = (P2/P1)^((gamma-1)/gamma), where gamma is the heat capacity ratio (1.4 for air).',
        sideB: 'Newton\'s law of cooling: dQ/dt = h*A*(T - T_env). The exponential decay time constant tau = m*c/(h*A).',
      },
      {
        criterion: 'Applications',
        sideA: 'Diesel engine ignition, fire pistons, weather phenomena (foehn winds), bicycle pump heating, and industrial gas compression.',
        sideB: 'Thermal design of electronics, forensic time-of-death estimation, food cooling safety, and HVAC load calculations.',
      },
    ],
    conclusion:
      'Adiabatic heating and Newtonian cooling represent opposite ends of the heat exchange spectrum: zero heat transfer versus heat-transfer-dominated processes. In reality, most thermal processes fall between these ideals, and understanding both limits helps engineers design systems from combustion engines to electronic cooling.',
    relatedGames: ['adiabatic-heating', 'newton-cooling', 'gas-laws', 'carnot-cycle', 'heat-sink-thermal'],
  },
  {
    slugA: 'eddy-currents',
    slugB: 'eddy-current-pendulum',
    comparisonSlug: 'eddy-currents-vs-eddy-pendulum',
    title: 'Eddy Currents vs Eddy Current Pendulum: Phenomenon vs Demonstration',
    description:
      'Compare the fundamental electromagnetic phenomenon of eddy currents with the classic eddy current pendulum demonstration that makes their braking effect visible and intuitive.',
    criteria: [
      {
        criterion: 'Scope',
        sideA: 'Eddy currents are circular electric currents induced in any conductor exposed to a changing magnetic field, as described by Faraday\'s law and Lenz\'s law.',
        sideB: 'The eddy current pendulum is a specific demonstration where a conductive plate swings through a magnetic field, experiencing dramatic braking that illustrates eddy current effects.',
      },
      {
        criterion: 'Physics',
        sideA: 'Eddy currents are governed by Faraday\'s law (changing flux induces EMF) and Lenz\'s law (induced currents oppose the change). Current magnitude depends on conductivity, field strength, and rate of change.',
        sideB: 'The pendulum demonstrates the conversion of kinetic energy to resistive heating via eddy currents. Slotted plates reduce eddy current loops and show reduced braking, confirming the mechanism.',
      },
      {
        criterion: 'Applications',
        sideA: 'Eddy currents are used in induction heating, electromagnetic braking (roller coasters, trains), non-destructive testing, metal detectors, and eddy current separators for recycling.',
        sideB: 'The pendulum is used in physics education, laboratory exercises, and conceptual demonstrations. It provides visual, tangible evidence of an otherwise invisible electromagnetic phenomenon.',
      },
      {
        criterion: 'Energy Conversion',
        sideA: 'Eddy currents convert kinetic or magnetic energy into resistive (Joule) heating in the conductor. This is sometimes useful (induction cooking) and sometimes a loss (transformer cores).',
        sideB: 'The pendulum converts gravitational potential energy to kinetic energy and then to heat in the conductor. The damping is visibly dramatic: a solid plate stops in 1-2 swings.',
      },
      {
        criterion: 'Mitigation Techniques',
        sideA: 'Eddy current losses are reduced by laminating cores, using ferrite materials, or introducing slots/cuts that break up circular current paths.',
        sideB: 'The slotted pendulum plate demonstrates mitigation: cuts in the plate break eddy current loops, allowing the pendulum to swing freely through the same magnetic field.',
      },
    ],
    conclusion:
      'Eddy currents are a ubiquitous electromagnetic phenomenon with both beneficial and detrimental applications. The eddy current pendulum is the ideal demonstration tool that makes these invisible currents tangible through dramatic mechanical braking, helping learners connect abstract electromagnetic theory to physical experience.',
    relatedGames: ['eddy-currents', 'eddy-current-pendulum', 'electromagnetic-induction', 'induction-heating', 'faraday-cage'],
  },
  {
    slugA: 'diffraction',
    slugB: 'thin-film-interference',
    comparisonSlug: 'diffraction-vs-thin-film',
    title: 'Diffraction vs Thin Film Interference: Slit Patterns vs Layer Interference',
    description:
      'Compare two wave interference phenomena: diffraction (light spreading and interfering through apertures) and thin film interference (light reflecting from the top and bottom surfaces of a thin layer).',
    criteria: [
      {
        criterion: 'Geometry',
        sideA: 'Diffraction involves light passing through slits, around edges, or through gratings. The interference pattern depends on slit width, spacing, and the number of slits.',
        sideB: 'Thin film interference involves light reflecting from two closely spaced surfaces (top and bottom of a thin film). Pattern depends on film thickness, refractive index, and viewing angle.',
      },
      {
        criterion: 'Path Difference Source',
        sideA: 'Path differences arise from different positions within the aperture. Each point in the slit acts as a secondary source (Huygens\' principle), and their combined output creates the pattern.',
        sideB: 'Path differences arise from the extra distance traveled by light reflecting off the bottom surface versus the top surface: delta = 2*n*t*cos(theta), plus any phase shift from reflection.',
      },
      {
        criterion: 'Pattern Characteristics',
        sideA: 'Diffraction produces bright and dark fringes with a central maximum. Single-slit patterns have a wide central peak; multi-slit gratings produce sharp, widely spaced peaks.',
        sideB: 'Thin film patterns show color-dependent bright and dark regions. Soap bubbles and oil films show vivid colors because each thickness constructively reinforces a specific wavelength.',
      },
      {
        criterion: 'Wavelength Sensitivity',
        sideA: 'Diffraction angles depend on wavelength (d*sin(theta) = m*lambda). Longer wavelengths diffract more. Gratings separate white light into a spectrum.',
        sideB: 'Thin film colors depend strongly on thickness relative to wavelength. As thickness changes, different wavelengths are enhanced, producing the characteristic rainbow of soap bubbles.',
      },
      {
        criterion: 'Applications',
        sideA: 'Diffraction gratings are used in spectrometers, wavelength division multiplexing, holography, and X-ray crystallography for atomic structure determination.',
        sideB: 'Thin film interference is used in anti-reflective coatings, dichroic filters, Fabry-Perot interferometers, and quality inspection of optical coatings.',
      },
    ],
    conclusion:
      'Both phenomena arise from wave interference but through different geometric configurations. Diffraction splits light using apertures and edges, while thin film interference uses reflections from closely spaced surfaces. Anti-reflective coatings on solar panels and camera lenses exploit thin film interference to minimize reflection losses.',
    relatedGames: ['diffraction', 'thin-film-interference', 'anti-reflective-coating', 'wave-interference', 'dispersion'],
  },
  {
    slugA: 'chromatic-aberration',
    slugB: 'depth-of-field',
    comparisonSlug: 'chromatic-aberration-vs-depth-of-field',
    title: 'Chromatic Aberration vs Depth of Field: Color vs Focus Imperfection',
    description:
      'Compare two distinct optical phenomena that affect image quality: chromatic aberration (color fringing from wavelength-dependent refraction) and depth of field (the range of distances in acceptable focus).',
    criteria: [
      {
        criterion: 'Physical Origin',
        sideA: 'Chromatic aberration arises because refractive index varies with wavelength (dispersion). Blue light bends more than red, so different colors focus at different distances from the lens.',
        sideB: 'Depth of field arises because only objects at the exact focal distance are perfectly sharp. Objects slightly closer or farther produce circles of confusion that may be acceptably small.',
      },
      {
        criterion: 'Visual Effect',
        sideA: 'Chromatic aberration produces color fringes (purple/green edges) around high-contrast features. Lateral CA shifts colors sideways; longitudinal CA shifts them along the axis.',
        sideB: 'Limited depth of field produces blur for out-of-focus objects. The blur increases smoothly with distance from the focal plane, creating the bokeh effect.',
      },
      {
        criterion: 'Dependence on Aperture',
        sideA: 'Chromatic aberration is reduced by stopping down (smaller aperture), which limits rays to the paraxial region where dispersion effects are smaller.',
        sideB: 'Depth of field increases dramatically with smaller apertures. At f/22, much more of the scene is in focus than at f/1.4.',
      },
      {
        criterion: 'Correction Methods',
        sideA: 'Achromatic doublets (crown + flint glass) correct CA for two wavelengths. Apochromatic lenses correct for three. Software can also correct lateral CA in post-processing.',
        sideB: 'DOF is controlled by aperture, focal length, and subject distance. Focus stacking (combining multiple exposures) extends DOF beyond single-exposure limits.',
      },
      {
        criterion: 'Impact on Different Systems',
        sideA: 'Chromatic aberration is problematic in astronomy, microscopy, and any system requiring precise color registration. Mirrors avoid CA entirely since reflection is achromatic.',
        sideB: 'Depth of field is critical in macro photography, landscape photography, cinematography, and machine vision where specific depth ranges must be in focus.',
      },
    ],
    conclusion:
      'Chromatic aberration is a material limitation of refractive lenses, while depth of field is a geometric consequence of imaging through a finite aperture. Both affect image quality but in completely different ways. Stopping down the aperture helps both: reducing CA and increasing DOF, which is why mid-range apertures often produce the sharpest images.',
    relatedGames: ['chromatic-aberration', 'depth-of-field', 'lens-focusing', 'dispersion', 'refraction'],
  },
  {
    slugA: 'memory-hierarchy',
    slugB: 'k-v-cache',
    comparisonSlug: 'memory-hierarchy-vs-kv-cache',
    title: 'Memory Hierarchy vs KV Cache: General Memory vs AI-Specific Caching',
    description:
      'Compare the traditional computer memory hierarchy (registers, L1, L2, L3, DRAM) with the KV cache used in transformer-based AI models. Both exploit locality but for fundamentally different workloads.',
    criteria: [
      {
        criterion: 'Purpose',
        sideA: 'The memory hierarchy bridges the speed gap between fast processors and slow main memory by providing progressively larger, slower caches that exploit temporal and spatial locality.',
        sideB: 'The KV cache stores previously computed key and value tensors from transformer attention layers, avoiding redundant computation during autoregressive text generation.',
      },
      {
        criterion: 'Locality Pattern',
        sideA: 'Traditional caches exploit spatial locality (adjacent addresses) and temporal locality (recently accessed data). Cache lines are typically 64 bytes, optimized for sequential access.',
        sideB: 'KV cache exploits the sequential nature of token generation. Each new token attends to all previous tokens, so the cache grows linearly with sequence length.',
      },
      {
        criterion: 'Size and Scaling',
        sideA: 'Memory hierarchy sizes are fixed by hardware: L1 ~64KB, L2 ~1MB, L3 ~32MB, DRAM ~128GB. Sizes grow slowly across processor generations.',
        sideB: 'KV cache size scales with model dimensions and sequence length: size = 2 * num_layers * num_heads * head_dim * seq_len * precision. Can consume tens of GB for long contexts.',
      },
      {
        criterion: 'Eviction Policy',
        sideA: 'Traditional caches use LRU, pseudo-LRU, or random replacement policies. Cache misses trigger automatic fetches from the next level of the hierarchy.',
        sideB: 'KV cache entries are typically never evicted during a generation. Techniques like sliding window attention, token dropping, and quantized KV cache compress rather than evict.',
      },
      {
        criterion: 'Bottleneck Characteristics',
        sideA: 'Memory hierarchy bottlenecks manifest as cache misses and increased latency. The performance cliff between L3 and DRAM access is 10-100x.',
        sideB: 'KV cache bottlenecks manifest as memory capacity limits on sequence length and batch size. Reducing KV cache size (via GQA, MQA, or quantization) directly enables longer contexts.',
      },
    ],
    conclusion:
      'Both the memory hierarchy and KV cache are caching strategies, but they optimize for different access patterns. The memory hierarchy is general-purpose hardware that exploits spatial and temporal locality. The KV cache is an application-level optimization specific to transformer inference that trades memory for compute savings.',
    relatedGames: ['memory-hierarchy', 'k-v-cache', 'g-p-u-memory-bandwidth', 'data-movement-energy', 'quantization-precision'],
  },
  {
    slugA: 'photolithography',
    slugB: 'litho-focus-dose',
    comparisonSlug: 'photolithography-vs-litho-focus-dose',
    title: 'Photolithography vs Focus-Dose Optimization: Process Overview vs Parameter Tuning',
    description:
      'Compare the overall photolithography process (patterning circuits on silicon) with the specific focus-dose optimization that determines the process window for acceptable feature quality.',
    criteria: [
      {
        criterion: 'Scope',
        sideA: 'Photolithography is the complete patterning process: coating photoresist, exposing through a mask with UV light, developing, and transferring the pattern to the underlying layer.',
        sideB: 'Focus-dose optimization is a specific calibration step that maps how feature quality varies with exposure dose (light intensity x time) and focus offset (wafer height vs. best focus).',
      },
      {
        criterion: 'Key Parameters',
        sideA: 'Photolithography parameters include wavelength (193nm, EUV 13.5nm), numerical aperture, resist chemistry, mask design, and overlay alignment to previous layers.',
        sideB: 'Focus-dose parameters are the exposure dose (mJ/cm2) and defocus distance (nm). The Bossung plot shows critical dimension vs. focus at multiple dose values.',
      },
      {
        criterion: 'Process Window',
        sideA: 'The overall lithography process window is determined by the intersection of all parameter tolerances: focus, dose, overlay, resist thickness, bake temperatures, and development time.',
        sideB: 'The focus-dose process window is the region on the Bossung plot where features meet CD (critical dimension) and sidewall angle specifications simultaneously.',
      },
      {
        criterion: 'Failure Modes',
        sideA: 'Lithography failures include pattern collapse, bridging, necking, scumming, and overlay misregistration. Each has distinct root causes and remedies.',
        sideB: 'Focus-dose failures appear as CD variations: underdosing causes narrow features, overdosing causes fat features, defocus causes asymmetric sidewalls and CD variation across the field.',
      },
      {
        criterion: 'Optimization Frequency',
        sideA: 'The overall lithography process is qualified once per technology node and layer, then monitored for drift during production.',
        sideB: 'Focus-dose is recalibrated frequently: with each new resist lot, after scanner maintenance, and whenever CD monitoring detects drift from target values.',
      },
    ],
    conclusion:
      'Photolithography is the broader manufacturing process, while focus-dose optimization is the critical inner loop that keeps feature dimensions on target. Mastering the focus-dose process window is essential because it directly determines yield at each patterning step, and modern chips require 50+ lithography steps.',
    relatedGames: ['photolithography', 'litho-focus-dose', 'etch-anisotropy', 'overlay-error', 'process-variation'],
  },
  {
    slugA: 'doping-diffusion',
    slugB: 'ion-implantation',
    comparisonSlug: 'doping-diffusion-vs-ion-implantation',
    title: 'Doping Diffusion vs Ion Implantation: Thermal vs Accelerated Doping',
    description:
      'Compare two methods for introducing dopant atoms into silicon: thermal diffusion (high-temperature gas-phase doping) and ion implantation (accelerating dopant ions directly into the crystal).',
    criteria: [
      {
        criterion: 'Mechanism',
        sideA: 'Diffusion introduces dopants by exposing silicon to a dopant-containing gas at 800-1100C. Atoms diffuse into the crystal along concentration gradients, governed by Fick\'s laws.',
        sideB: 'Ion implantation accelerates ionized dopant atoms (B, P, As) to 10-500 keV and fires them directly into the silicon crystal, embedding them at a controlled depth.',
      },
      {
        criterion: 'Depth Control',
        sideA: 'Diffusion profiles are erfc or Gaussian distributions starting from the surface. Depth is controlled by time and temperature but is inherently surface-peaked and difficult to make shallow.',
        sideB: 'Ion implantation provides precise depth control via beam energy. The dopant profile peaks at a specific depth (projected range) with a well-defined spread (straggle).',
      },
      {
        criterion: 'Dose Control',
        sideA: 'Diffusion dose depends on surface concentration and time, making precise low-dose control difficult. Reproducibility depends on gas flow and temperature uniformity.',
        sideB: 'Ion implantation achieves exceptional dose control by integrating beam current over time. Doses from 10^11 to 10^16 atoms/cm2 are precisely controlled.',
      },
      {
        criterion: 'Crystal Damage',
        sideA: 'Diffusion occurs at thermal equilibrium and does not damage the crystal lattice. Dopant atoms naturally occupy substitutional lattice sites and are electrically active.',
        sideB: 'Ion implantation creates significant lattice damage as ions collide with silicon atoms. A high-temperature anneal (rapid thermal anneal, 900-1050C) is required to heal damage and activate dopants.',
      },
      {
        criterion: 'Modern Usage',
        sideA: 'Diffusion is still used for deep, high-dose doping steps (well doping, source/drain drives) and for some solar cell manufacturing where cost matters more than precision.',
        sideB: 'Ion implantation is the standard for advanced CMOS manufacturing where precise threshold voltage control, retrograde wells, and halo implants require exact dose and depth profiles.',
      },
    ],
    conclusion:
      'Ion implantation has largely replaced diffusion for precision doping in advanced semiconductor manufacturing because it offers superior dose and depth control. Diffusion remains relevant for deep doping steps, solar cell manufacturing, and post-implant annealing where thermal redistribution is intentional.',
    relatedGames: ['doping-diffusion', 'ion-implantation', 'm-o-s-f-e-t-switching', 'process-variation', 'photolithography'],
  },
  {
    slugA: 'etch-anisotropy',
    slugB: 'deposition-types',
    comparisonSlug: 'etch-anisotropy-vs-deposition-types',
    title: 'Etch Anisotropy vs Deposition Types: Removing vs Adding Material',
    description:
      'Compare etching (selectively removing material to create patterns) with deposition (adding thin films onto a substrate). These two complementary processes are the yin and yang of semiconductor fabrication.',
    criteria: [
      {
        criterion: 'Direction of Material Change',
        sideA: 'Etching removes material selectively, either isotropically (uniform in all directions) or anisotropically (preferentially in one direction, usually vertical).',
        sideB: 'Deposition adds material as thin films, either conformally (uniform thickness on all surfaces) or directionally (preferentially on horizontal surfaces).',
      },
      {
        criterion: 'Key Parameters',
        sideA: 'Etch anisotropy is defined as 1 - (lateral rate / vertical rate). A value of 1 is perfectly anisotropic (vertical sidewalls). Selectivity between materials is equally critical.',
        sideB: 'Deposition parameters include film thickness, uniformity, conformality (step coverage), stress, density, and composition. Each deposition method optimizes different parameters.',
      },
      {
        criterion: 'Process Types',
        sideA: 'Wet etching (isotropic, chemical), dry/plasma etching (anisotropic, reactive ion etching), and atomic layer etching (ALE, precise layer-by-layer removal).',
        sideB: 'CVD (chemical vapor deposition), PVD (physical vapor deposition/sputtering), ALD (atomic layer deposition), and epitaxy (single-crystal growth).',
      },
      {
        criterion: 'Pattern Transfer',
        sideA: 'Anisotropic etching transfers lithographic patterns into underlying materials with vertical sidewalls, maintaining the critical dimensions defined by the photomask.',
        sideB: 'Deposition fills etched features (trenches, vias) and creates new functional layers. Conformal deposition is needed for liner and barrier layers in high-aspect-ratio features.',
      },
      {
        criterion: 'Process Integration',
        sideA: 'Etch steps occur after lithography to transfer patterns. Modern chips require 50+ etch steps, each with different chemistry and selectivity requirements.',
        sideB: 'Deposition steps create the layers that will subsequently be patterned and etched. Film quality directly determines device performance and reliability.',
      },
    ],
    conclusion:
      'Etching and deposition are complementary processes repeated dozens of times during chip fabrication. Etching subtracts material to define patterns, while deposition adds material to build structures. The quality of both processes, and particularly their interaction at each layer, determines the final device performance and yield.',
    relatedGames: ['etch-anisotropy', 'deposition-types', 'photolithography', 'c-m-p-planarization', 'cleanroom-yield'],
  },
  {
    slugA: 'static-electricity',
    slugB: 'electric-field',
    comparisonSlug: 'static-electricity-vs-electric-field',
    title: 'Static Electricity vs Electric Field: Charge Buildup vs Field Theory',
    description:
      'Compare the everyday phenomenon of static electricity (charge accumulation on surfaces) with the fundamental concept of the electric field (the force field created by charges). One is the cause, the other is the description.',
    criteria: [
      {
        criterion: 'Concept Level',
        sideA: 'Static electricity is a macroscopic phenomenon: charge accumulates on insulating surfaces through contact, friction (triboelectric effect), or induction, creating voltage differences.',
        sideB: 'The electric field is a fundamental physical concept: a vector field E that exists at every point in space around charges, defined as force per unit charge (E = F/q).',
      },
      {
        criterion: 'Origin',
        sideA: 'Static charge results from electron transfer between materials during contact. The triboelectric series ranks materials by their tendency to gain or lose electrons.',
        sideB: 'Electric fields are produced by all electric charges and by changing magnetic fields (Maxwell\'s equations). They exist whether or not there is a second charge to feel the force.',
      },
      {
        criterion: 'Measurement',
        sideA: 'Static electricity is measured in volts of surface potential using electrostatic voltmeters or field mills. Human body can accumulate 3,000-25,000V in dry conditions.',
        sideB: 'Electric fields are measured in volts per meter (V/m) or newtons per coulomb (N/C). Field lines visualize direction and strength of the field.',
      },
      {
        criterion: 'Hazards',
        sideA: 'Static electricity causes sparks (ignition risk), ESD damage to electronics, dust attraction, and uncomfortable shocks. Humidity reduces buildup by increasing surface conductivity.',
        sideB: 'Strong electric fields cause dielectric breakdown (lightning), corona discharge, and can accelerate charged particles. Field strength limits determine insulation design.',
      },
      {
        criterion: 'Applications',
        sideA: 'Static electricity is exploited in photocopiers (xerography), electrostatic painting, air purifiers (electrostatic precipitators), and Van de Graaff generators.',
        sideB: 'Electric fields are applied in capacitors (energy storage), particle accelerators, CRT displays, electrophoresis (molecular separation), and semiconductor device operation.',
      },
    ],
    conclusion:
      'Static electricity is the practical manifestation of charge imbalance, while the electric field is the theoretical framework that explains how charges exert forces at a distance. Understanding the field concept transforms static electricity from a collection of phenomena into a predictable, quantifiable science.',
    relatedGames: ['static-electricity', 'electric-field', 'coulombs-law', 'e-s-d-protection', 'electric-potential'],
  },
  {
    slugA: 'electromagnetic-induction',
    slugB: 'induction-heating',
    comparisonSlug: 'electromagnetic-induction-vs-induction-heating',
    title: 'Electromagnetic Induction vs Induction Heating: Principle vs Application',
    description:
      'Compare the fundamental principle of electromagnetic induction (Faraday\'s law: changing magnetic flux induces EMF) with its practical application in induction heating (using induced currents to heat conductive materials).',
    criteria: [
      {
        criterion: 'Scope',
        sideA: 'Electromagnetic induction is a fundamental law of physics: any change in magnetic flux through a conducting loop induces an electromotive force (Faraday\'s law).',
        sideB: 'Induction heating is a specific engineering application that uses high-frequency alternating magnetic fields to induce eddy currents in conductive materials, heating them via resistive losses.',
      },
      {
        criterion: 'Energy Goal',
        sideA: 'In generators and transformers, the goal is to maximize the induced EMF and minimize energy losses. Eddy currents are unwanted and laminations are used to suppress them.',
        sideB: 'In induction heating, the goal is to maximize eddy current losses in the workpiece. High frequency, high field strength, and low workpiece resistivity increase heating efficiency.',
      },
      {
        criterion: 'Frequency Range',
        sideA: 'Generators and transformers operate at power-line frequencies (50/60 Hz) or moderate frequencies for special applications. Lower frequencies maximize flux linkage.',
        sideB: 'Induction heaters operate at 1 kHz to 10 MHz depending on the application. Higher frequencies concentrate heating near the surface (skin effect), useful for hardening.',
      },
      {
        criterion: 'Efficiency Considerations',
        sideA: 'In electromagnetic induction devices, efficiency means converting maximum mechanical energy to electrical energy (generators) or transferring maximum flux (transformers) with minimal losses.',
        sideB: 'In induction heating, efficiency means coupling maximum energy into the workpiece. Coil design, frequency selection, and workpiece geometry determine coupling efficiency (typically 80-95%).',
      },
      {
        criterion: 'Key Applications',
        sideA: 'Generators, transformers, electric guitar pickups, metal detectors, wireless charging, and measurement transducers all use electromagnetic induction.',
        sideB: 'Induction cooktops, metal melting furnaces, brazing/soldering, surface hardening of steel, and semiconductor crystal growth all use induction heating.',
      },
    ],
    conclusion:
      'Electromagnetic induction is the fundamental principle; induction heating is one of its most important applications. The key difference is intent: induction in generators and transformers aims to minimize heat loss, while induction heating deliberately maximizes it. Understanding the underlying physics enables engineering both outcomes.',
    relatedGames: ['electromagnetic-induction', 'induction-heating', 'eddy-currents', 'wireless-charging', 'generator-startup'],
  },
  {
    slugA: 'bifacial-albedo',
    slugB: 'spectral-mismatch',
    comparisonSlug: 'bifacial-albedo-vs-spectral-mismatch',
    title: 'Bifacial Albedo vs Spectral Mismatch: Ground Reflection vs Spectrum Loss',
    description:
      'Compare two solar performance factors: bifacial albedo (ground-reflected light boosting rear-side generation) and spectral mismatch (energy lost when the solar spectrum differs from the cell\'s optimal response).',
    criteria: [
      {
        criterion: 'Definition',
        sideA: 'Bifacial albedo measures the fraction of sunlight reflected by the ground surface below a solar array. Higher albedo (white gravel: 0.5-0.7, grass: 0.2) means more rear-side energy.',
        sideB: 'Spectral mismatch quantifies the energy loss when the actual solar spectrum differs from the AM1.5G standard used for cell rating. It varies with air mass, cloud cover, and time of day.',
      },
      {
        criterion: 'Energy Impact',
        sideA: 'Bifacial gain adds 5-30% energy production depending on albedo, module height, and row spacing. White surfaces and snow can push gains above 20%.',
        sideB: 'Spectral mismatch typically causes 1-5% annual energy loss for crystalline silicon. Wider-bandgap cells (CdTe, perovskites) are more sensitive to spectral variations.',
      },
      {
        criterion: 'Controllability',
        sideA: 'Albedo can be engineered: white roofing membranes, gravel, or reflective ground covers increase reflected light. Module height and row spacing also affect rear irradiance.',
        sideB: 'Spectral mismatch is largely determined by location, climate, and time of year. Multi-junction cells mitigate it by capturing different spectral ranges with different junctions.',
      },
      {
        criterion: 'Modeling Complexity',
        sideA: 'Bifacial modeling requires ray-tracing or view-factor calculations accounting for ground reflectance, module transparency, row spacing, height, and time-varying sun position.',
        sideB: 'Spectral mismatch modeling requires spectral irradiance data (not just broadband) and the cell\'s spectral response curve. Most energy models use empirical correction factors.',
      },
      {
        criterion: 'Technology Dependence',
        sideA: 'Bifacial gain requires bifacial modules with transparent backsheets or glass-glass construction. Monofacial modules cannot capture ground-reflected light.',
        sideB: 'Spectral mismatch affects all solar technologies but impacts multi-junction and narrow-bandgap cells most. Silicon\'s wide absorption range makes it relatively tolerant.',
      },
    ],
    conclusion:
      'Bifacial albedo is an opportunity to gain energy, while spectral mismatch is a loss to minimize. In system design, albedo optimization (ground cover selection, module height) can add far more energy than spectral mismatch subtracts, making bifacial modules increasingly dominant in utility-scale solar installations.',
    relatedGames: ['bifacial-albedo', 'spectral-mismatch', 'solar-cell', 'solar-yield-prediction', 'solar-temp-coefficient'],
  },
  {
    slugA: 'm-p-p-t',
    slugB: 'string-sizing',
    comparisonSlug: 'mppt-vs-string-sizing',
    title: 'MPPT vs String Sizing: Electrical Optimization vs Physical Configuration',
    description:
      'Compare MPPT (real-time electrical tracking of the maximum power point) with string sizing (designing the physical panel configuration to match inverter voltage and current windows).',
    criteria: [
      {
        criterion: 'Optimization Type',
        sideA: 'MPPT is a real-time, dynamic optimization that continuously adjusts the operating voltage of a solar string to track the maximum power point as irradiance and temperature change.',
        sideB: 'String sizing is a static design-time optimization that determines how many panels connect in series (for voltage) and how many strings connect in parallel (for current).',
      },
      {
        criterion: 'Time Scale',
        sideA: 'MPPT operates on millisecond to second time scales, responding to cloud transients, temperature changes, and shading variations throughout the day.',
        sideB: 'String sizing is determined once during system design and remains fixed for the life of the installation (typically 25+ years).',
      },
      {
        criterion: 'Design Constraints',
        sideA: 'MPPT algorithms (Perturb & Observe, Incremental Conductance) must operate within the inverter\'s voltage window. Multiple MPPT inputs allow independent tracking of different strings.',
        sideB: 'String sizing must ensure the string voltage stays within the inverter MPPT range across all temperature extremes (cold increases Voc, hot decreases it) and never exceeds maximum system voltage.',
      },
      {
        criterion: 'Impact on Energy Yield',
        sideA: 'Good MPPT tracking captures 97-99.5% of available maximum power. Poor tracking algorithms can lose 2-5% of energy, especially during fast-changing conditions.',
        sideB: 'Proper string sizing ensures the system operates in the inverter\'s optimal range year-round. Undersized strings waste inverter capacity; oversized strings risk over-voltage shutdown.',
      },
      {
        criterion: 'Interaction',
        sideA: 'MPPT performance depends on string sizing: if the string voltage falls outside the MPPT window at high temperatures, the tracker cannot find the true maximum power point.',
        sideB: 'String sizing depends on the MPPT range: wider MPPT voltage windows allow more flexible string lengths and better accommodate module mismatch.',
      },
    ],
    conclusion:
      'String sizing creates the physical framework within which MPPT operates electrically. Optimal system design requires both: string sizing that keeps voltage within the inverter\'s MPPT window across all conditions, and an MPPT algorithm that efficiently tracks the maximum power point in real time.',
    relatedGames: ['m-p-p-t', 'string-sizing', 'series-parallel-p-v', 'p-v-i-v-curve', 'solar-yield-prediction'],
  },
  {
    slugA: 'convection',
    slugB: 'convection-currents',
    comparisonSlug: 'convection-vs-convection-currents',
    title: 'Convection vs Convection Currents: Mechanism vs Flow Patterns',
    description:
      'Compare the heat transfer mechanism of convection (bulk fluid motion transferring thermal energy) with the self-organizing flow patterns called convection currents (natural circulation cells driven by buoyancy).',
    criteria: [
      {
        criterion: 'Definition',
        sideA: 'Convection is a mode of heat transfer where thermal energy is transported by bulk fluid motion. It includes both natural (buoyancy-driven) and forced (fan/pump-driven) variants.',
        sideB: 'Convection currents are the specific circular flow patterns that develop when a fluid is heated from below: hot fluid rises, cools, and sinks, forming organized circulation cells.',
      },
      {
        criterion: 'Driving Force',
        sideA: 'Convection can be driven by external forces (forced convection via fans or pumps) or by buoyancy forces (natural convection from density differences due to temperature gradients).',
        sideB: 'Convection currents are specifically driven by buoyancy: the density difference between hot (less dense, rising) and cold (more dense, sinking) fluid creates the circulation.',
      },
      {
        criterion: 'Scale',
        sideA: 'Convection occurs at all scales: from microscopic boundary layers on heated surfaces to planetary-scale atmospheric and oceanic heat transport.',
        sideB: 'Convection currents form organized cells whose size depends on the geometry: Rayleigh-Benard cells in a heated pan, Hadley cells in Earth\'s atmosphere, mantle convection in Earth\'s interior.',
      },
      {
        criterion: 'Quantification',
        sideA: 'Convection heat transfer is quantified by Newton\'s law of cooling: q = h*A*(Ts - Tf). The heat transfer coefficient h depends on flow regime, geometry, and fluid properties.',
        sideB: 'Convection current onset and structure are quantified by the Rayleigh number: Ra = g*beta*deltaT*L^3/(nu*alpha). Convection cells form above a critical Ra (~1708 for Benard cells).',
      },
      {
        criterion: 'Engineering Relevance',
        sideA: 'Convection is central to heat exchanger design, electronics cooling, HVAC systems, and any thermal management application involving fluid contact.',
        sideB: 'Convection current patterns are important in weather prediction, ocean circulation modeling, magma dynamics, crystal growth, and understanding natural ventilation in buildings.',
      },
    ],
    conclusion:
      'Convection is the broader heat transfer mechanism, while convection currents are the organized flow patterns that naturally emerge when fluids are heated unevenly. Understanding convection currents helps predict and control natural flow patterns, while quantifying convective heat transfer is essential for thermal engineering design.',
    relatedGames: ['convection', 'convection-currents', 'newton-cooling', 'thermal-contact', 'server-airflow'],
  },
  {
    slugA: 'ballistic-pendulum',
    slugB: 'inelastic-collisions',
    comparisonSlug: 'ballistic-pendulum-vs-inelastic-collisions',
    title: 'Ballistic Pendulum vs Inelastic Collisions: Measurement Tool vs Phenomenon',
    description:
      'Compare the ballistic pendulum (a historic measurement device) with the general physics of inelastic collisions it exploits. The pendulum is a specific application that makes an abstract concept measurable.',
    criteria: [
      {
        criterion: 'Scope',
        sideA: 'The ballistic pendulum is a specific apparatus: a projectile embeds in a suspended block, and the combined system\'s swing height is used to calculate the projectile\'s initial velocity.',
        sideB: 'Inelastic collisions are a general category of collisions where kinetic energy is not conserved. Objects may deform, stick together, or fragment, with energy converted to heat, sound, or deformation.',
      },
      {
        criterion: 'Conservation Laws Used',
        sideA: 'The ballistic pendulum uses momentum conservation during the collision (to find post-collision velocity) and energy conservation during the swing (to relate velocity to height).',
        sideB: 'Inelastic collisions conserve momentum but not kinetic energy. The fraction of energy lost depends on the coefficient of restitution and the mass ratio.',
      },
      {
        criterion: 'Measurement Capability',
        sideA: 'The ballistic pendulum converts a fast, hard-to-measure velocity into a slow, easy-to-measure height. It was the standard method for measuring bullet velocities before electronic chronographs.',
        sideB: 'General inelastic collisions do not inherently provide measurement. Additional instrumentation (high-speed cameras, force sensors) is needed to characterize the collision dynamics.',
      },
      {
        criterion: 'Energy Budget',
        sideA: 'In a typical ballistic pendulum, 95-99% of kinetic energy is converted to heat and deformation during embedding. Only 1-5% is converted to pendulum swing height.',
        sideB: 'Inelastic collisions lose varying amounts of kinetic energy. A car crash may dissipate 50-80% as deformation, while a clay ball collision dissipates nearly all as heat and deformation.',
      },
      {
        criterion: 'Historical Significance',
        sideA: 'Invented by Benjamin Robins in 1742, the ballistic pendulum was the first device to accurately measure projectile velocities, revolutionizing ballistics and artillery science.',
        sideB: 'Inelastic collision theory is fundamental to impact engineering, crash safety design, particle physics (where inelastic scattering creates new particles), and materials testing.',
      },
    ],
    conclusion:
      'The ballistic pendulum is an elegant application of inelastic collision physics that converts an unmeasurable fast event into a measurable slow one. It demonstrates how combining two conservation laws (momentum for the collision, energy for the swing) solves a problem that neither law could solve alone.',
    relatedGames: ['ballistic-pendulum', 'inelastic-collisions', 'momentum-conservation', 'energy-conservation', 'two-ball-collision'],
  },
  {
    slugA: 'karman-vortex',
    slugB: 'vortex-rings',
    comparisonSlug: 'karman-vortex-vs-vortex-rings',
    title: 'Karman Vortex Street vs Vortex Rings: 2D Wake vs 3D Rings',
    description:
      'Compare the Karman vortex street (alternating vortices shed behind a bluff body in a flow) with vortex rings (toroidal vortices that propagate through still fluid). Both are fundamental vortex structures in fluid dynamics.',
    criteria: [
      {
        criterion: 'Geometry',
        sideA: 'Karman vortex streets are essentially 2D structures: alternating rows of counter-rotating vortices shed from opposite sides of a cylindrical obstacle in a uniform flow.',
        sideB: 'Vortex rings are 3D toroidal (donut-shaped) structures where fluid circulates around a closed ring axis. They can be generated by pulsing fluid through an orifice.',
      },
      {
        criterion: 'Formation Mechanism',
        sideA: 'Vortex streets form when flow separates from a bluff body at moderate Reynolds numbers (Re 47-100,000). Vortices shed alternately at a frequency given by the Strouhal number.',
        sideB: 'Vortex rings form when a slug of fluid is impulsively pushed through an orifice or when circulation is generated around a closed path, as in smoke rings or dolphin bubble rings.',
      },
      {
        criterion: 'Propagation',
        sideA: 'Karman vortices are convected downstream by the mean flow. They remain in the wake of the obstacle and gradually dissipate through viscous diffusion.',
        sideB: 'Vortex rings self-propel through still fluid by their own induced velocity field. They can travel many diameters before dissipating, carrying momentum and mixing fluid.',
      },
      {
        criterion: 'Stability',
        sideA: 'Karman vortex streets are remarkably stable patterns that persist over long distances downstream. The spacing ratio (lateral/streamwise) is approximately 0.28 for ideal stability.',
        sideB: 'Vortex rings are stable up to a maximum circulation (Gharib\'s formation number ~4). Beyond this limit, they pinch off and additional vorticity forms a trailing jet.',
      },
      {
        criterion: 'Practical Significance',
        sideA: 'Vortex streets cause vortex-induced vibrations in bridges, smokestacks, and offshore structures. The Tacoma Narrows Bridge collapse is a famous (though debated) example.',
        sideB: 'Vortex rings are studied in cardiac flow (left ventricle filling), jet engine mixing, volcanic eruptions, and bio-inspired propulsion (jellyfish, squid).',
      },
    ],
    conclusion:
      'Karman vortex streets and vortex rings represent fundamentally different vortex topologies. Vortex streets are wake phenomena tied to obstacles in a flow, while vortex rings are self-propelled structures that travel independently. Both are central to fluid dynamics research and have important engineering consequences.',
    relatedGames: ['karman-vortex', 'vortex-rings', 'laminar-turbulent', 'cavitation', 'pressure-drop'],
  },
  {
    slugA: 'beats',
    slugB: 'sound-interference',
    comparisonSlug: 'beats-vs-sound-interference',
    title: 'Beats vs Sound Interference: Temporal vs Spatial Interference',
    description:
      'Compare beats (amplitude modulation from two slightly different frequencies) with sound interference (constructive and destructive superposition at different spatial locations). Both arise from wave superposition.',
    criteria: [
      {
        criterion: 'Phenomenon',
        sideA: 'Beats are the periodic rise and fall in loudness heard when two tones of slightly different frequency sound together. The beat frequency equals the difference: f_beat = |f1 - f2|.',
        sideB: 'Sound interference creates regions of constructive (loud) and destructive (quiet) superposition depending on the path length difference from two coherent sources to the listener.',
      },
      {
        criterion: 'Domain',
        sideA: 'Beats are primarily a temporal phenomenon: amplitude varies in time at a fixed listening position. A musician hears beats while tuning without moving their head.',
        sideB: 'Sound interference is primarily a spatial phenomenon: amplitude varies with position. Walking past two speakers reveals alternating loud and quiet zones.',
      },
      {
        criterion: 'Frequency Requirement',
        sideA: 'Beats require two frequencies that are close but not identical. As the frequencies converge, beat frequency decreases to zero (perfect unison). Large frequency differences produce no perceptible beats.',
        sideB: 'Spatial interference works best with identical frequencies (coherent sources). Different frequencies produce rapidly varying patterns that average out and are not perceived as stable interference.',
      },
      {
        criterion: 'Detection',
        sideA: 'Beats are detected by ear as a slow pulsation in volume. Beat frequencies of 1-10 Hz are easily perceived. Above ~15 Hz, beats become a roughness or separate tone.',
        sideB: 'Spatial interference is detected by moving through the sound field. Noise-canceling headphones exploit destructive interference by generating an anti-phase signal.',
      },
      {
        criterion: 'Applications',
        sideA: 'Beats are used for instrument tuning, radio heterodyne receivers, and measuring small frequency differences. Piano tuners use beat frequencies to achieve equal temperament.',
        sideB: 'Sound interference is used in noise cancellation, acoustic room design, speaker array beam-forming, and measuring the speed of sound.',
      },
    ],
    conclusion:
      'Beats and sound interference are both manifestations of wave superposition but in different domains. Beats are temporal interference at a point, while spatial sound interference creates a standing pattern in space. Together, they illustrate the complete picture of how waves combine constructively and destructively.',
    relatedGames: ['beats', 'sound-interference', 'standing-waves', 'wave-interference', 'doppler-effect'],
  },
  {
    slugA: 'laser-speckle',
    slugB: 'moire-patterns',
    comparisonSlug: 'laser-speckle-vs-moire-patterns',
    title: 'Laser Speckle vs Moire Patterns: Random vs Periodic Interference',
    description:
      'Compare laser speckle (random granular patterns from coherent light scattering) with Moire patterns (geometric patterns from overlapping periodic structures). Both create visible patterns from wave interactions.',
    criteria: [
      {
        criterion: 'Pattern Nature',
        sideA: 'Laser speckle creates a random, granular pattern of bright and dark spots. The pattern has no periodic structure and is unique to the specific surface roughness illuminated.',
        sideB: 'Moire patterns create regular, periodic interference fringes when two periodic structures (gratings, meshes, or screens) overlap at a slight angle or pitch difference.',
      },
      {
        criterion: 'Origin',
        sideA: 'Speckle arises from coherent light reflecting off a rough surface. Each point scatters with a random phase, and the interference of these randomly phased waves creates the speckle pattern.',
        sideB: 'Moire patterns arise from the geometric interaction of two periodic structures. The beat frequency between the two periodicities creates larger-scale visible fringes.',
      },
      {
        criterion: 'Coherence Requirement',
        sideA: 'Speckle requires spatially and temporally coherent light (lasers). Incoherent light sources like LEDs do not produce speckle because random phases average out.',
        sideB: 'Moire patterns do not require coherent light. They are a geometric effect visible with any light source, even with non-wave phenomena like overlapping printed grids.',
      },
      {
        criterion: 'Information Content',
        sideA: 'Speckle patterns encode surface roughness and displacement information. Speckle interferometry can measure sub-wavelength deformations by tracking speckle pattern changes.',
        sideB: 'Moire fringes encode the difference between two periodic structures. They amplify small differences in pitch, rotation, or distortion, making them visible to the naked eye.',
      },
      {
        criterion: 'Applications',
        sideA: 'Laser speckle is used in speckle interferometry, blood flow imaging (laser speckle contrast imaging), surface roughness measurement, and dynamic light scattering.',
        sideB: 'Moire patterns are used in strain measurement, alignment verification in semiconductor lithography, topographic mapping, and as a security feature in currency printing.',
      },
    ],
    conclusion:
      'Laser speckle and Moire patterns both create visible interference patterns but from fundamentally different mechanisms. Speckle is random (from coherent scattering off rough surfaces), while Moire is periodic (from overlapping regular structures). Both are powerful measurement tools when properly analyzed.',
    relatedGames: ['laser-speckle', 'moire-patterns', 'diffraction', 'thin-film-interference', 'wave-interference'],
  },
  {
    slugA: 'polarization',
    slugB: 'polarized-sky',
    comparisonSlug: 'polarization-vs-polarized-sky',
    title: 'Polarization vs Polarized Sky: Principle vs Natural Occurrence',
    description:
      'Compare the fundamental physics of light polarization (oscillation direction of the electric field) with its natural manifestation in the sky (partially polarized skylight from atmospheric scattering).',
    criteria: [
      {
        criterion: 'Concept Level',
        sideA: 'Polarization is a fundamental property of transverse waves: the orientation of the electric field oscillation. Light can be linear, circular, or elliptically polarized.',
        sideB: 'The polarized sky is a natural phenomenon where sunlight becomes partially linearly polarized after scattering by atmospheric molecules (Rayleigh scattering).',
      },
      {
        criterion: 'Mechanism',
        sideA: 'Polarization is produced by filtering (polaroid films), reflection (Brewster angle), birefringence (calcite crystals), or emission from oriented sources (synchrotron radiation).',
        sideB: 'Sky polarization occurs because Rayleigh scattering preferentially scatters light polarized perpendicular to the scattering plane. Maximum polarization occurs at 90 degrees from the sun.',
      },
      {
        criterion: 'Degree of Polarization',
        sideA: 'Artificial polarizers can achieve nearly 100% polarization. Polarizing filters transmit only one orientation, blocking the orthogonal component almost completely.',
        sideB: 'Skylight is typically 60-75% polarized at 90 degrees from the sun under clear conditions. Clouds, haze, and multiple scattering reduce the degree of polarization.',
      },
      {
        criterion: 'Detection',
        sideA: 'Polarization is detected using polarizing filters, Brewster angle reflection, photoelastic stress analysis, and specialized sensors (polarimeters).',
        sideB: 'Sky polarization is detected by rotating a polarizing filter while looking at the sky, by navigating insects (bees use it for orientation), and by polarimetric cameras.',
      },
      {
        criterion: 'Applications',
        sideA: 'Polarization is used in LCD displays, 3D cinema, glare-reducing sunglasses, stress analysis (photoelasticity), and optical fiber communications.',
        sideB: 'Sky polarization is used by insects for navigation, by Viking seafarers (sunstone), in atmospheric science for aerosol characterization, and in polarimetric remote sensing.',
      },
    ],
    conclusion:
      'Polarization is the general physical principle, while the polarized sky is its most beautiful natural example. Understanding how scattering polarizes light connects fundamental wave physics to everyday observations like glare reduction with polarized sunglasses and the navigation abilities of bees.',
    relatedGames: ['polarization', 'polarized-sky', 'rayleigh-mie-scattering', 'brewster-angle', 'tape-birefringence'],
  },
  {
    slugA: 'standing-waves',
    slugB: 'resonance',
    comparisonSlug: 'standing-waves-vs-resonance',
    title: 'Standing Waves vs Resonance: Wave Pattern vs Energy Amplification',
    description:
      'Compare standing waves (stationary interference patterns from counter-propagating waves) with resonance (energy amplification when a system is driven at its natural frequency). They are related but distinct concepts.',
    criteria: [
      {
        criterion: 'Definition',
        sideA: 'Standing waves are interference patterns formed when two waves of equal frequency and amplitude travel in opposite directions. Fixed nodes and oscillating antinodes appear stationary.',
        sideB: 'Resonance is the condition where a system driven at its natural frequency accumulates energy over many cycles, producing dramatically amplified oscillation amplitude.',
      },
      {
        criterion: 'Requirement',
        sideA: 'Standing waves require counter-propagating waves with matched frequency and amplitude. They can exist without external driving, as in a plucked guitar string.',
        sideB: 'Resonance requires an external periodic driving force at or near the natural frequency. Without driving, the system exhibits free oscillation that decays with damping.',
      },
      {
        criterion: 'Energy Behavior',
        sideA: 'In a standing wave, energy oscillates between kinetic and potential forms but does not propagate. Nodes have zero displacement; antinodes have maximum displacement.',
        sideB: 'At resonance, energy continuously flows into the system from the driver. Amplitude grows until energy input equals energy dissipated by damping, reaching steady-state.',
      },
      {
        criterion: 'Frequency Selection',
        sideA: 'Standing waves exist only at discrete frequencies (harmonics) determined by the boundary conditions: f_n = n*v/(2L) for a string fixed at both ends.',
        sideB: 'Resonance peaks at the natural frequency but has a finite width (bandwidth) determined by damping. The quality factor Q measures the sharpness of the resonance peak.',
      },
      {
        criterion: 'Examples',
        sideA: 'Guitar strings, organ pipes, microwave ovens (standing wave hot spots), Chladni patterns, and laser cavities all exhibit standing waves.',
        sideB: 'Tuning forks, wine glass shattering from sound, bridge oscillation from wind, MRI imaging, and radio tuning circuits all exploit resonance.',
      },
    ],
    conclusion:
      'Standing waves describe the spatial pattern; resonance describes the energy amplification mechanism. They often occur together (a resonating guitar string forms a standing wave) but are conceptually distinct. Standing waves can exist without resonance (free vibration), and resonance can occur without standing waves (driven oscillators).',
    relatedGames: ['standing-waves', 'resonance', 'chladni-patterns', 'wave-speed-tension', 'l-c-resonance'],
  },
  {
    slugA: 'bernoulli',
    slugB: 'venturi-effect',
    comparisonSlug: 'bernoulli-vs-venturi',
    title: 'Bernoulli Principle vs Venturi Effect: Principle vs Application',
    description:
      'Compare Bernoulli\'s principle (the fundamental energy conservation law for flowing fluids) with the Venturi effect (the specific phenomenon of pressure drop in a constricted flow). The Venturi effect is a direct consequence of Bernoulli.',
    criteria: [
      {
        criterion: 'Scope',
        sideA: 'Bernoulli\'s principle is a general energy conservation statement for inviscid, incompressible, steady flow: P + 0.5*rho*v^2 + rho*g*h = constant along a streamline.',
        sideB: 'The Venturi effect is a specific application: when fluid flows through a constriction, velocity increases and pressure decreases, as directly predicted by Bernoulli\'s equation.',
      },
      {
        criterion: 'Generality',
        sideA: 'Bernoulli\'s principle applies to any streamline flow: airplane wings (lift), pitot tubes (airspeed measurement), and flow over curved surfaces.',
        sideB: 'The Venturi effect applies specifically to converging-diverging geometries: Venturi tubes, carburetors, aspirators, and ejectors.',
      },
      {
        criterion: 'Pressure Recovery',
        sideA: 'Bernoulli\'s principle predicts that pressure can be recovered by decelerating the flow. In theory, the process is reversible for inviscid flow.',
        sideB: 'In real Venturi tubes, the diverging section recovers most but not all pressure. Viscous losses prevent full recovery, and the diffuser angle must be gradual to avoid flow separation.',
      },
      {
        criterion: 'Measurement Applications',
        sideA: 'Bernoulli\'s equation is used to calculate airspeed (pitot-static tube), estimate wind loads on buildings, and analyze flow patterns around objects.',
        sideB: 'The Venturi meter measures flow rate by reading the pressure difference between the wide and narrow sections, then applying Bernoulli\'s equation to compute velocity.',
      },
      {
        criterion: 'Limitations',
        sideA: 'Bernoulli\'s principle assumes inviscid, incompressible, steady flow along a streamline. It fails for viscous boundary layers, compressible flows (high Mach), and separated flows.',
        sideB: 'Venturi devices require smooth, gradual geometry transitions. Abrupt constrictions cause flow separation, turbulence, and permanent pressure loss that Bernoulli does not predict.',
      },
    ],
    conclusion:
      'Bernoulli\'s principle is the fundamental law; the Venturi effect is its most important practical application. Understanding this relationship helps engineers design flow measurement devices, mixing systems, and ejectors. The Venturi tube remains one of the most reliable flow measurement technologies after over a century of use.',
    relatedGames: ['bernoulli', 'venturi-effect', 'pressure-drop', 'laminar-flow', 'cavitation'],
  },
  {
    slugA: 'wireless-charging',
    slugB: 'induction-heating',
    comparisonSlug: 'wireless-charging-vs-induction-heating',
    title: 'Wireless Charging vs Induction Heating: Power Transfer vs Heating',
    description:
      'Compare wireless charging (using electromagnetic induction to transfer useful electrical power) with induction heating (using induced currents to intentionally generate heat). Same physics, opposite optimization goals.',
    criteria: [
      {
        criterion: 'Desired Outcome',
        sideA: 'Wireless charging aims to transfer maximum electrical power to a receiving coil with minimum heat generation. Efficiency of 80-93% is typical for Qi-standard chargers.',
        sideB: 'Induction heating aims to generate maximum heat in a conductive workpiece. All induced electrical energy should convert to thermal energy in the target material.',
      },
      {
        criterion: 'Frequency Selection',
        sideA: 'Wireless charging uses moderate frequencies (100-300 kHz for Qi) optimized for efficient coupling between transmit and receive coils at close range.',
        sideB: 'Induction heating uses higher frequencies (1 kHz to 10 MHz) chosen to match the skin depth to the desired heating depth in the workpiece material.',
      },
      {
        criterion: 'Coupling Design',
        sideA: 'Wireless chargers maximize coupling coefficient between coils using ferrite shielding, alignment magnets, and resonant tuning. Loose coupling wastes energy as heat.',
        sideB: 'Induction heaters maximize coupling to the workpiece using coil geometry matched to the part shape. The workpiece itself is the secondary "winding" of a transformer.',
      },
      {
        criterion: 'Loss Management',
        sideA: 'Wireless charging treats all eddy currents in nearby metal objects as parasitic losses and potential fire hazards. Foreign Object Detection (FOD) systems prevent heating unintended objects.',
        sideB: 'Induction heating treats eddy current losses as the useful output. Coil design focuses on uniformity of heating and energy coupling efficiency to the specific workpiece.',
      },
      {
        criterion: 'Power Levels',
        sideA: 'Wireless charging ranges from 5W (phones) to 15W (fast phone charging) to 11kW+ (electric vehicle wireless charging). Power is carefully regulated to prevent overheating.',
        sideB: 'Induction heating ranges from 1kW (cooktops) to 10MW+ (industrial metal melting furnaces). Power is maximized for process speed.',
      },
    ],
    conclusion:
      'Wireless charging and induction heating use the same electromagnetic induction physics but optimize in opposite directions. Wireless charging minimizes heat and maximizes useful power transfer, while induction heating maximizes heat generation in the workpiece. Both rely on Faraday\'s law and eddy current control.',
    relatedGames: ['wireless-charging', 'induction-heating', 'electromagnetic-induction', 'eddy-currents', 'e-m-i-shielding'],
  },
  {
    slugA: 'silicon-texturing',
    slugB: 'texturing-vs-lithography',
    comparisonSlug: 'texturing-vs-lithography-solar',
    title: 'Silicon Texturing vs Lithography for Solar: Surface Optimization vs Process Comparison',
    description:
      'Compare silicon surface texturing (creating micro-pyramids to trap light in solar cells) with the broader comparison of texturing versus lithographic approaches for achieving similar optical goals.',
    criteria: [
      {
        criterion: 'Process',
        sideA: 'Silicon texturing uses anisotropic chemical etching (KOH or NaOH) to create random micro-pyramids on monocrystalline silicon surfaces. The pyramids reduce surface reflection from 35% to 10-12%.',
        sideB: 'Lithographic approaches use photolithography to create precisely defined surface structures. Periodic inverted pyramids or nano-scale patterns can reduce reflection below 5% with optimized geometry.',
      },
      {
        criterion: 'Cost',
        sideA: 'Chemical texturing is inexpensive: a wet chemical bath processes hundreds of wafers simultaneously. Cost per wafer is fractions of a cent for the texturing step.',
        sideB: 'Lithographic texturing requires photoresist coating, exposure, development, and etching. Cost is 10-100x higher per wafer, limiting use to high-efficiency research cells.',
      },
      {
        criterion: 'Optical Performance',
        sideA: 'Random pyramids achieve good light trapping but are not optimal. Pyramid size variation (1-10 microns) means some areas are better textured than others.',
        sideB: 'Lithographic textures can be optimized for specific wavelengths and angles, achieving theoretical minimum reflectance. Regular inverted pyramids outperform random pyramids by 1-2% absolute.',
      },
      {
        criterion: 'Compatibility',
        sideA: 'Chemical texturing works well with standard screen-printed metallization and is compatible with all mainstream solar cell architectures (PERC, TOPCon, HJT).',
        sideB: 'Lithographic texturing may interfere with subsequent process steps (passivation conformality, metallization adhesion) and requires tighter process control throughout the cell fabrication.',
      },
      {
        criterion: 'Industry Adoption',
        sideA: 'Chemical texturing is used in >99% of commercial monocrystalline silicon solar cells. It is proven, scalable, and well-integrated into production lines.',
        sideB: 'Lithographic texturing remains primarily in research labs and pilot lines. Nano-imprint lithography and laser texturing are emerging as cost-viable alternatives to optical lithography.',
      },
    ],
    conclusion:
      'Chemical texturing dominates commercial solar manufacturing because it provides adequate optical performance at minimal cost. Lithographic texturing achieves superior optical results but at costs that are currently prohibitive for mass production. As cell efficiency approaches fundamental limits, lithographic techniques may become justified for the last 1-2% of performance gain.',
    relatedGames: ['silicon-texturing', 'texturing-vs-lithography', 'anti-reflective-coating', 'solar-cell', 'photolithography'],
  },
];

// ============================================================
// LOOKUP
// ============================================================

/**
 * Find a comparison by its URL-friendly comparison slug.
 */
export function getComparisonBySlug(slug: string): ComparisonData | undefined {
  return comparisons.find(c => c.comparisonSlug === slug);
}
