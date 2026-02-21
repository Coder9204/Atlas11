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
