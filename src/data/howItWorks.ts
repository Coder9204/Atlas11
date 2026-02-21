/**
 * HOW IT WORKS — Concept explanation data for "How does X work?" pSEO pages.
 *
 * Each entry provides a structured breakdown of a physics/engineering concept,
 * linking to the interactive game modules that demonstrate it.
 */

// ============================================================
// TYPES
// ============================================================

export interface HowItWorksStep {
  title: string;
  explanation: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowItWorksEntry {
  slug: string;
  title: string;
  shortAnswer: string;
  relatedGameSlugs: string[];
  category: string;
  steps: HowItWorksStep[];
  realWorldApps: string[];
  faqItems: FAQItem[];
}

// ============================================================
// DATA
// ============================================================

export const howItWorksEntries: HowItWorksEntry[] = [
  // ----------------------------------------------------------------
  // FLUID MECHANICS
  // ----------------------------------------------------------------
  {
    slug: 'bernoullis-principle',
    title: 'How Does Bernoulli\'s Principle Work?',
    shortAnswer:
      'Bernoulli\'s principle states that an increase in the speed of a fluid occurs simultaneously with a decrease in pressure or potential energy. It is a consequence of conservation of energy applied to flowing fluids.',
    relatedGameSlugs: ['bernoulli', 'venturi-effect', 'lift-force'],
    category: 'fluids',
    steps: [
      { title: 'Conservation of Energy in Fluids', explanation: 'For an incompressible, non-viscous fluid flowing along a streamline, the total mechanical energy per unit volume remains constant. This includes kinetic energy (1/2 rho v^2), pressure energy (P), and gravitational potential energy (rho g h).' },
      { title: 'Speed Increases, Pressure Decreases', explanation: 'When fluid flows through a constriction (narrower pipe), it speeds up to maintain the same mass flow rate (continuity equation). As velocity increases, the pressure must decrease to keep total energy constant.' },
      { title: 'The Bernoulli Equation', explanation: 'P + 1/2 rho v^2 + rho g h = constant along a streamline. This equation quantifies the tradeoff between pressure, velocity, and height at any two points in the flow.' },
      { title: 'Real-World Corrections', explanation: 'Real fluids have viscosity, which causes energy loss along the flow path. Engineers add friction loss terms and use empirical correction factors for practical calculations.' },
    ],
    realWorldApps: [
      'Aircraft wing lift generation',
      'Venturi meters for flow measurement',
      'Carburetors mixing fuel and air',
      'Pitot tubes measuring airspeed',
      'Spray bottles and atomizers',
    ],
    faqItems: [
      { question: 'Does Bernoulli\'s principle explain how airplane wings generate lift?', answer: 'Partially. Bernoulli\'s principle contributes to the pressure difference between the upper and lower wing surfaces, but the full explanation also requires Newton\'s third law and the downward deflection of air by the wing\'s angle of attack.' },
      { question: 'Does Bernoulli\'s principle apply to compressible fluids like air?', answer: 'The standard form applies to incompressible flow (low Mach numbers, below about 0.3). For compressible flow at higher speeds, a modified compressible Bernoulli equation or isentropic flow relations must be used.' },
      { question: 'Why does a shower curtain blow inward?', answer: 'Fast-moving water and air inside the shower create a lower-pressure zone (Bernoulli effect), while the still air outside pushes the curtain inward. Convection currents from hot water also contribute.' },
    ],
  },
  {
    slug: 'buoyancy',
    title: 'How Does Buoyancy Work?',
    shortAnswer:
      'Buoyancy is the upward force exerted by a fluid on any immersed object, equal to the weight of the fluid displaced by the object. This is Archimedes\' principle, discovered over 2,000 years ago.',
    relatedGameSlugs: ['buoyancy', 'cartesian-diver', 'floating-paperclip', 'helium-balloon-car'],
    category: 'fluids',
    steps: [
      { title: 'Pressure Gradient in a Fluid', explanation: 'Fluid pressure increases with depth due to the weight of the fluid above. The bottom of a submerged object experiences higher pressure than the top, creating a net upward force.' },
      { title: 'Archimedes\' Principle', explanation: 'The buoyant force equals the weight of the displaced fluid: F_b = rho_fluid * g * V_displaced. If this exceeds the object\'s weight, it floats. If less, it sinks.' },
      { title: 'Floating Equilibrium', explanation: 'A floating object displaces exactly enough fluid to balance its own weight. A ship floats because its hull displaces a volume of water whose weight equals the total weight of the ship.' },
      { title: 'Center of Buoyancy', explanation: 'The buoyant force acts at the centroid of the displaced fluid volume. Stability depends on the relative positions of the center of buoyancy and center of gravity.' },
    ],
    realWorldApps: [
      'Ship and submarine design',
      'Hot air balloons',
      'Hydrometer for measuring fluid density',
      'Fish swim bladders',
      'Cartesian diver toys',
    ],
    faqItems: [
      { question: 'Why does a steel ship float when a steel ball sinks?', answer: 'The ship\'s hollow hull displaces a large volume of water, and the weight of that displaced water exceeds the ship\'s total weight. A solid steel ball displaces very little water relative to its weight because steel is about 8x denser than water.' },
      { question: 'Does buoyancy work in gases?', answer: 'Yes. Helium balloons float in air for the same reason boats float in water: the balloon plus helium weighs less than the air it displaces. The principle is identical; the fluid density is just much lower.' },
      { question: 'What happens to buoyancy in a free-falling elevator?', answer: 'In free fall, there is no effective gravity, so there is no pressure gradient in the fluid and no buoyant force. This is why astronauts see air bubbles stay suspended in water on the ISS.' },
    ],
  },
  {
    slug: 'capillary-action',
    title: 'How Does Capillary Action Work?',
    shortAnswer:
      'Capillary action is the ability of a liquid to flow in narrow spaces without the assistance of external forces, driven by the interplay of adhesive forces between the liquid and the tube walls and cohesive forces within the liquid itself.',
    relatedGameSlugs: ['capillary-action', 'soap-boat', 'marangoni-tears'],
    category: 'fluids',
    steps: [
      { title: 'Adhesion vs Cohesion', explanation: 'Adhesion is the attraction between liquid molecules and the container surface. Cohesion is the attraction between liquid molecules themselves. When adhesion exceeds cohesion, the liquid wets the surface and climbs.' },
      { title: 'Contact Angle', explanation: 'The contact angle (theta) where the liquid surface meets the solid determines wetting behavior. Theta < 90 degrees means the liquid wets the surface (water on glass). Theta > 90 degrees means it repels (mercury on glass).' },
      { title: 'Capillary Rise', explanation: 'In a narrow tube, surface tension pulls the liquid upward along the wetted walls. The height of rise is h = 2 gamma cos(theta) / (rho g r), where r is the tube radius. Narrower tubes produce higher rise.' },
      { title: 'Equilibrium', explanation: 'The liquid stops rising when the upward surface tension force equals the weight of the raised liquid column. This equilibrium sets the capillary height.' },
    ],
    realWorldApps: [
      'Paper towels and sponges absorbing water',
      'Plant xylem transporting water from roots to leaves',
      'Wicking in candles bringing melted wax to the flame',
      'Microfluidic devices in medical diagnostics',
      'Ink flow in fountain pens',
    ],
    faqItems: [
      { question: 'Why does water rise higher in thinner tubes?', answer: 'Capillary height is inversely proportional to tube radius. A thinner tube has a larger ratio of wetted perimeter to cross-sectional area, so surface tension lifts the same volume of water to a greater height.' },
      { question: 'Can capillary action work against gravity indefinitely?', answer: 'No. The maximum height is limited by the balance between surface tension and gravity. For water in a 1mm glass tube, the rise is about 1.5 cm. Trees use additional mechanisms (transpiration pull, osmotic pressure) to move water much higher.' },
      { question: 'Why does mercury go down in a glass capillary instead of up?', answer: 'Mercury has a contact angle greater than 90 degrees on glass, meaning cohesion between mercury atoms is stronger than adhesion to glass. The meniscus is convex, and the net surface tension force pushes mercury down.' },
    ],
  },
  {
    slug: 'hydraulic-jump',
    title: 'How Does a Hydraulic Jump Work?',
    shortAnswer:
      'A hydraulic jump is a sudden transition from fast, shallow (supercritical) flow to slow, deep (subcritical) flow in an open channel. It dissipates energy violently through turbulence and is analogous to a shock wave in compressible gas dynamics.',
    relatedGameSlugs: ['hydraulic-jump', 'laminar-turbulent', 'bernoulli'],
    category: 'fluids',
    steps: [
      { title: 'Froude Number', explanation: 'The Froude number Fr = v / sqrt(g*h) compares flow speed to the speed of surface gravity waves. When Fr > 1 (supercritical), the flow is faster than waves can propagate upstream.' },
      { title: 'Transition Trigger', explanation: 'When supercritical flow encounters an obstruction or a change in slope, it cannot gradually slow down because information cannot travel upstream. Instead, it undergoes an abrupt jump.' },
      { title: 'Energy Dissipation', explanation: 'Across the jump, momentum is conserved but significant kinetic energy is converted to turbulence and heat. The energy loss increases with the upstream Froude number.' },
      { title: 'Downstream Conditions', explanation: 'After the jump, flow is subcritical (Fr < 1), deeper, and slower. The depth ratio and energy loss can be calculated from the upstream Froude number using the Belanger equation.' },
    ],
    realWorldApps: [
      'Dam spillways use hydraulic jumps to dissipate energy safely',
      'Kitchen sink rings where tap water hits a flat surface',
      'River rapids and standing waves for kayaking',
      'Wastewater treatment channels',
      'Tidal bore formation in estuaries',
    ],
    faqItems: [
      { question: 'Why does the water in my kitchen sink form a ring?', answer: 'When water from the faucet hits the flat sink, it spreads radially at high speed (supercritical flow). At a certain radius, it undergoes a circular hydraulic jump, abruptly increasing in depth and slowing down to form the visible ring.' },
      { question: 'Is a hydraulic jump reversible?', answer: 'No. A hydraulic jump is an inherently irreversible process that dissipates mechanical energy into heat through turbulence. It is the open-channel equivalent of a shock wave in compressible flow.' },
      { question: 'Can a hydraulic jump be used to generate power?', answer: 'Not directly, since it destroys kinetic energy. However, engineers use it deliberately in dam spillways to safely dissipate the enormous energy of falling water before it can erode the downstream riverbed.' },
    ],
  },
  {
    slug: 'venturi-effect',
    title: 'How Does the Venturi Effect Work?',
    shortAnswer:
      'The Venturi effect is the reduction in fluid pressure that occurs when a fluid flows through a constricted section of pipe. As the cross-section narrows, fluid velocity increases and pressure decreases, following Bernoulli\'s principle and the continuity equation.',
    relatedGameSlugs: ['venturi-effect', 'bernoulli', 'pressure-drop'],
    category: 'fluids',
    steps: [
      { title: 'Continuity Equation', explanation: 'For incompressible flow, A1*v1 = A2*v2. When the pipe narrows (A2 < A1), the fluid must speed up (v2 > v1) to maintain the same volumetric flow rate.' },
      { title: 'Pressure Drop at the Throat', explanation: 'Applying Bernoulli\'s equation between the wide and narrow sections: P1 + 1/2 rho v1^2 = P2 + 1/2 rho v2^2. Since v2 > v1, P2 must be less than P1.' },
      { title: 'Measuring the Pressure Difference', explanation: 'A Venturi meter measures the pressure difference between the wide and narrow sections. From this, the flow rate can be calculated without inserting any obstruction into the flow.' },
      { title: 'Pressure Recovery', explanation: 'After the throat, the pipe gradually widens (diffuser section). Velocity decreases and pressure recovers, though some energy is lost to friction and turbulence.' },
    ],
    realWorldApps: [
      'Venturi meters for industrial flow measurement',
      'Carburetors drawing fuel into an airstream',
      'Aspirators and vacuum ejectors',
      'Bunsen burners entraining air',
      'Water jet pumps',
    ],
    faqItems: [
      { question: 'What is the difference between a Venturi meter and an orifice plate?', answer: 'Both measure flow by creating a pressure drop, but a Venturi meter has a gradual taper that recovers most of the pressure (low permanent loss), while an orifice plate creates a sharp constriction with higher permanent pressure loss but lower cost.' },
      { question: 'Can the Venturi effect create a vacuum?', answer: 'Yes. If the velocity at the throat is high enough, the pressure can drop below atmospheric, creating suction. This is how Venturi aspirators and ejector pumps work.' },
      { question: 'Does the Venturi effect work with gases?', answer: 'Yes, for subsonic flow (Mach < 0.3) the incompressible Bernoulli equation gives good results. At higher speeds, compressibility effects become important and the analysis requires isentropic flow relations.' },
    ],
  },
  // ----------------------------------------------------------------
  // SPACE & EARTH
  // ----------------------------------------------------------------
  {
    slug: 'coriolis-effect',
    title: 'How Does the Coriolis Effect Work?',
    shortAnswer:
      'The Coriolis effect is an apparent deflection of moving objects when viewed from a rotating reference frame such as Earth. It causes large-scale wind and ocean currents to curve, creating cyclones and influencing weather patterns.',
    relatedGameSlugs: ['coriolis-effect', 'magnus-effect', 'orbital-mechanics'],
    category: 'space',
    steps: [
      { title: 'Rotating Reference Frame', explanation: 'Earth rotates, so an observer on the surface is in a non-inertial (rotating) reference frame. Newton\'s laws require fictitious forces (Coriolis and centrifugal) to account for the rotation.' },
      { title: 'Coriolis Acceleration', explanation: 'The Coriolis acceleration is a_c = -2 omega cross v, where omega is Earth\'s angular velocity and v is the object\'s velocity in the rotating frame. It acts perpendicular to the velocity.' },
      { title: 'Deflection Direction', explanation: 'In the Northern Hemisphere, moving objects deflect to the right. In the Southern Hemisphere, they deflect to the left. At the equator, the horizontal Coriolis force is zero.' },
      { title: 'Scale Dependence', explanation: 'The Coriolis effect is significant only for large-scale, long-duration motions (weather systems, ocean currents, artillery shells). It is negligible for bathtub drains and small-scale flows.' },
    ],
    realWorldApps: [
      'Formation of cyclones and anticyclones in weather systems',
      'Trade winds and jet stream patterns',
      'Ocean current circulation (gyres)',
      'Long-range ballistic trajectory correction',
      'Coriolis flow meters for industrial mass flow measurement',
    ],
    faqItems: [
      { question: 'Does the Coriolis effect determine which way my bathtub drains?', answer: 'No. At the scale of a bathtub, the Coriolis force is roughly 100,000 times weaker than the forces from residual currents, basin shape, and drain position. The swirl direction of a bathtub drain is random.' },
      { question: 'Why is the Coriolis effect zero at the equator?', answer: 'At the equator, Earth\'s rotation axis is perpendicular to the local vertical. Horizontal motion along the equator is parallel to the rotation axis, so the cross product with omega is zero in the horizontal plane.' },
      { question: 'Does the Coriolis effect slow things down?', answer: 'No. The Coriolis force is always perpendicular to velocity, so it changes direction but not speed. It does no work and does not add or remove kinetic energy from the moving object.' },
    ],
  },
  {
    slug: 'magnus-effect',
    title: 'How Does the Magnus Effect Work?',
    shortAnswer:
      'The Magnus effect is the force on a spinning object moving through a fluid that causes it to curve perpendicular to its direction of travel. It explains why spinning balls curve in sports like soccer, baseball, and tennis.',
    relatedGameSlugs: ['magnus-effect', 'lift-force', 'bernoulli'],
    category: 'space',
    steps: [
      { title: 'Spin Creates Asymmetric Airflow', explanation: 'A spinning ball drags a thin boundary layer of air around with it. On one side, the spin adds to the oncoming airflow (faster). On the other side, it opposes it (slower).' },
      { title: 'Pressure Difference', explanation: 'The faster-moving air on one side has lower pressure than the slower-moving air on the other side. This pressure difference creates a net force perpendicular to both the velocity and spin axis.' },
      { title: 'Deflection of Wake', explanation: 'The spinning ball deflects its turbulent wake to one side. By Newton\'s third law, the ball is pushed in the opposite direction, adding to the pressure force.' },
      { title: 'Force Magnitude', explanation: 'The Magnus force is proportional to the spin rate, the forward velocity, and the ball\'s cross-sectional area: F = C_L * 1/2 rho v^2 A, where C_L depends on the spin parameter.' },
    ],
    realWorldApps: [
      'Curve balls in baseball and cricket',
      'Banana kicks in soccer',
      'Topspin and backspin in tennis and table tennis',
      'Flettner rotor ships using spinning cylinders for propulsion',
      'Dimpled golf balls optimized for Magnus-enhanced lift',
    ],
    faqItems: [
      { question: 'Why do golf balls have dimples?', answer: 'Dimples create a turbulent boundary layer that clings to the ball longer, reducing drag. They also enhance the Magnus effect from backspin, giving the ball more lift and allowing it to travel further.' },
      { question: 'Can the Magnus effect work in reverse?', answer: 'Yes. A ball with reverse spin curves the opposite way. In baseball, a curveball (topspin) drops, while a backspin fastball appears to rise because the Magnus force partially opposes gravity.' },
      { question: 'Does the Magnus effect work in a vacuum?', answer: 'No. The Magnus effect requires a fluid medium (air or water) to create the pressure asymmetry. In vacuum, a spinning ball follows a purely ballistic trajectory.' },
    ],
  },
  {
    slug: 'orbital-mechanics',
    title: 'How Does Orbital Mechanics Work?',
    shortAnswer:
      'Orbital mechanics describes how objects move under the influence of gravity in space. Objects in orbit are in continuous free fall, moving fast enough sideways that the ground curves away beneath them. Kepler\'s laws and Newton\'s gravitation govern all orbital motion.',
    relatedGameSlugs: ['orbital-mechanics', 'orbital-mechanics-basics', 'tidal-forces', 'tidal-locking'],
    category: 'space',
    steps: [
      { title: 'Free Fall with Sideways Velocity', explanation: 'An orbiting object is falling toward Earth at the same rate as the surface curves away. At the right speed (about 7.8 km/s for LEO), the object falls around the Earth rather than into it.' },
      { title: 'Kepler\'s Laws', explanation: 'First: orbits are ellipses with the central body at one focus. Second: a line from the body to the orbiter sweeps equal areas in equal times (conservation of angular momentum). Third: T^2 is proportional to a^3.' },
      { title: 'Orbital Maneuvers', explanation: 'Changing orbit requires changing velocity (delta-v). A Hohmann transfer uses two burns to move between circular orbits. More complex maneuvers use gravity assists or continuous low-thrust propulsion.' },
      { title: 'Orbital Energy', explanation: 'Total orbital energy E = -G*M*m/(2a) is negative for bound orbits. Higher orbits have more energy (less negative). To go higher, you must add energy by burning fuel in the prograde direction.' },
    ],
    realWorldApps: [
      'Satellite constellation design (GPS, Starlink)',
      'Interplanetary mission trajectory planning',
      'Space station orbit maintenance',
      'Rocket launch window calculation',
      'Space debris collision avoidance',
    ],
    faqItems: [
      { question: 'Why don\'t satellites fall down?', answer: 'Satellites are falling. They are in continuous free fall toward Earth. But they are moving so fast sideways (7.8 km/s in low orbit) that the Earth\'s surface curves away beneath them at the same rate they fall. The result is a closed orbit.' },
      { question: 'Why do astronauts float in the ISS?', answer: 'The ISS and everything in it are in free fall together. There is no contact force between the astronaut and the station floor. Gravity at ISS altitude (400 km) is still about 90% of surface gravity; weightlessness comes from free fall, not absence of gravity.' },
      { question: 'How do gravity assists work?', answer: 'A spacecraft passing near a planet exchanges momentum via gravity. If it passes behind the planet relative to its orbital motion, it gains speed from the planet\'s orbital energy. The planet slows by a negligible amount. This is like bouncing a ball off a moving train.' },
    ],
  },
  // ----------------------------------------------------------------
  // ELECTROMAGNETISM
  // ----------------------------------------------------------------
  {
    slug: 'electromagnetic-induction',
    title: 'How Does Electromagnetic Induction Work?',
    shortAnswer:
      'Electromagnetic induction is the process of generating an electric current by changing the magnetic flux through a conductor. Discovered by Faraday in 1831, it is the operating principle behind generators, transformers, and wireless charging.',
    relatedGameSlugs: ['electromagnetic-induction', 'induction-heating', 'generator-startup', 'eddy-currents'],
    category: 'electricity',
    steps: [
      { title: 'Magnetic Flux', explanation: 'Magnetic flux (Phi_B) is the product of the magnetic field strength, the area it passes through, and the cosine of the angle between them: Phi_B = B * A * cos(theta).' },
      { title: 'Faraday\'s Law', explanation: 'A changing magnetic flux through a conducting loop induces an electromotive force (EMF): EMF = -d(Phi_B)/dt. Faster changes produce larger voltages.' },
      { title: 'Lenz\'s Law', explanation: 'The negative sign in Faraday\'s law means the induced current creates a magnetic field that opposes the change in flux. This is conservation of energy: you must do work to maintain the changing flux.' },
      { title: 'Methods of Changing Flux', explanation: 'Flux can change by moving a magnet, rotating a coil in a magnetic field, changing the field strength (as in a transformer), or changing the area of the loop.' },
    ],
    realWorldApps: [
      'Electric generators converting mechanical to electrical energy',
      'Transformers stepping voltage up or down',
      'Induction cooktops heating pans with eddy currents',
      'Wireless charging pads for phones',
      'Eddy current brakes on trains and roller coasters',
    ],
    faqItems: [
      { question: 'What is the difference between a motor and a generator?', answer: 'They are the same device operated in reverse. A motor converts electrical energy to mechanical energy using the Lorentz force. A generator converts mechanical energy to electrical energy using electromagnetic induction. Many devices can function as both.' },
      { question: 'Why do transformers only work with AC?', answer: 'Transformers rely on a changing magnetic flux to induce voltage in the secondary coil. DC produces a constant flux with no change, so no voltage is induced. Only AC produces the continuously changing flux needed for transformer operation.' },
      { question: 'Can electromagnetic induction work through walls?', answer: 'Yes, if the wall is non-conductive and non-magnetic. Magnetic fields pass through wood, plastic, and glass easily. This is why wireless chargers work through phone cases and why induction loops are embedded under roadways.' },
    ],
  },
  {
    slug: 'kirchhoffs-laws',
    title: 'How Do Kirchhoff\'s Laws Work?',
    shortAnswer:
      'Kirchhoff\'s laws are two rules for analyzing electrical circuits. The current law (KCL) states that currents entering a node sum to zero. The voltage law (KVL) states that voltages around any closed loop sum to zero. Together they enable analysis of any circuit.',
    relatedGameSlugs: ['kirchhoffs-laws', 'circuits', 'r-c-time-constant'],
    category: 'electricity',
    steps: [
      { title: 'Kirchhoff\'s Current Law (KCL)', explanation: 'At any node (junction) in a circuit, the sum of currents flowing in equals the sum of currents flowing out. This is conservation of charge: charge cannot accumulate at a node.' },
      { title: 'Kirchhoff\'s Voltage Law (KVL)', explanation: 'Around any closed loop in a circuit, the sum of all voltage rises and drops equals zero. This is conservation of energy: a charge returning to its starting point has the same potential energy.' },
      { title: 'Setting Up Equations', explanation: 'Assign current variables to each branch. Write KCL equations at each node and KVL equations around each independent loop. Solve the resulting system of linear equations.' },
      { title: 'Solving Complex Circuits', explanation: 'For circuits with N nodes and B branches, you need B equations: (N-1) from KCL and (B-N+1) from KVL. Matrix methods or mesh/nodal analysis can handle large circuits systematically.' },
    ],
    realWorldApps: [
      'Circuit simulation software (SPICE) uses Kirchhoff\'s laws as its core equations',
      'Power grid load flow analysis',
      'PCB design and signal integrity analysis',
      'Battery management systems balancing cell voltages',
      'Troubleshooting electrical faults by measuring node voltages',
    ],
    faqItems: [
      { question: 'Do Kirchhoff\'s laws work for AC circuits?', answer: 'Yes, with the extension that voltages and currents are represented as complex phasors (including magnitude and phase angle). The same KCL and KVL equations apply, but with impedances (Z = R + jX) replacing resistances.' },
      { question: 'When do Kirchhoff\'s laws fail?', answer: 'They assume lumped-element circuits where wire lengths are much shorter than the signal wavelength. At high frequencies (GHz range) or with long transmission lines, the distributed nature of the circuit requires transmission line theory instead.' },
      { question: 'What is the difference between mesh analysis and nodal analysis?', answer: 'Mesh analysis applies KVL around loops to find mesh currents. Nodal analysis applies KCL at nodes to find node voltages. Both give the same answer; the choice depends on which requires fewer equations for a given circuit topology.' },
    ],
  },
  {
    slug: 'eddy-currents',
    title: 'How Do Eddy Currents Work?',
    shortAnswer:
      'Eddy currents are loops of electrical current induced within conductors by a changing magnetic field. They flow in closed loops within the conductor, perpendicular to the magnetic field, and produce their own opposing magnetic field along with resistive heating.',
    relatedGameSlugs: ['eddy-currents', 'eddy-current-pendulum', 'induction-heating', 'electromagnetic-induction'],
    category: 'electricity',
    steps: [
      { title: 'Changing Magnetic Field', explanation: 'When a conductor is exposed to a changing magnetic field (from a moving magnet, varying current, or the conductor itself moving through a field), Faraday\'s law induces an EMF within the conductor.' },
      { title: 'Circular Current Paths', explanation: 'Unlike circuit currents that flow in wires, eddy currents flow in closed loops within the bulk of the conductor. The paths are determined by the geometry of the conductor and the field pattern.' },
      { title: 'Opposing Force (Lenz\'s Law)', explanation: 'The eddy currents create their own magnetic field that opposes the change in flux. This produces a braking force on relative motion and is the basis of eddy current brakes.' },
      { title: 'Resistive Heating', explanation: 'Eddy currents flow through the conductor\'s resistance, converting kinetic or magnetic energy into heat (I^2*R losses). This is exploited in induction heating but is unwanted in transformers.' },
    ],
    realWorldApps: [
      'Induction cooktops and induction furnaces',
      'Eddy current brakes on trains and roller coasters',
      'Non-destructive testing for cracks in metal parts',
      'Metal detectors at airports and for treasure hunting',
      'Laminated transformer cores to minimize eddy current losses',
    ],
    faqItems: [
      { question: 'Why are transformer cores laminated?', answer: 'Thin insulated laminations break up the eddy current loops, forcing them into smaller paths with higher resistance. This dramatically reduces I^2*R heating losses while still allowing the magnetic flux to pass through the core.' },
      { question: 'Can eddy currents be completely eliminated?', answer: 'Not in any conductor exposed to a changing magnetic field. They can be minimized by using laminations, ferrite (non-conducting magnetic material), or powdered iron cores. In some applications like induction heating, they are maximized instead.' },
      { question: 'How does an eddy current brake work without friction?', answer: 'A magnet near a moving conductor induces eddy currents that create an opposing magnetic field. The braking force is proportional to speed and acts without physical contact, producing no wear and no brake dust.' },
    ],
  },
  // ----------------------------------------------------------------
  // OPTICS
  // ----------------------------------------------------------------
  {
    slug: 'snells-law',
    title: 'How Does Snell\'s Law Work?',
    shortAnswer:
      'Snell\'s law describes how light bends when it passes from one medium into another with a different refractive index. The formula n1*sin(theta1) = n2*sin(theta2) relates the angles of incidence and refraction to the refractive indices of the two media.',
    relatedGameSlugs: ['snells-law', 'refraction', 'total-internal-reflection', 'dispersion'],
    category: 'optics',
    steps: [
      { title: 'Refractive Index', explanation: 'Every transparent medium has a refractive index n = c/v, where c is the speed of light in vacuum and v is the speed in the medium. Glass has n of about 1.5; water about 1.33; air about 1.0003.' },
      { title: 'Angle Relationship', explanation: 'When light hits a boundary at angle theta1 from the normal, it refracts to angle theta2 such that n1*sin(theta1) = n2*sin(theta2). Light bends toward the normal when entering a denser medium.' },
      { title: 'Total Internal Reflection', explanation: 'When light goes from a denser to less dense medium, there is a critical angle beyond which all light is reflected. This occurs when the refraction angle would exceed 90 degrees.' },
      { title: 'Wavelength Dependence (Dispersion)', explanation: 'The refractive index varies with wavelength. Blue light has a slightly higher n than red in glass, so it bends more. This causes white light to split into a rainbow through a prism.' },
    ],
    realWorldApps: [
      'Lens design for cameras, telescopes, and microscopes',
      'Fiber optic cables using total internal reflection',
      'Corrective eyeglasses and contact lenses',
      'Prisms for spectroscopy and wavelength separation',
      'Underwater visibility and apparent depth calculations',
    ],
    faqItems: [
      { question: 'Why do objects underwater appear closer than they are?', answer: 'Light from an underwater object refracts away from the normal as it exits the water. Your brain traces the refracted rays backward in straight lines, placing the apparent image at about 3/4 of the actual depth.' },
      { question: 'How does fiber optics use Snell\'s law?', answer: 'A fiber optic cable has a glass core surrounded by cladding with a lower refractive index. Light entering at a shallow enough angle undergoes total internal reflection at the core-cladding boundary, bouncing along the fiber for kilometers with minimal loss.' },
      { question: 'Does Snell\'s law work for sound waves too?', answer: 'Yes. Snell\'s law applies to any wave that changes speed at an interface. Sound refracts when passing between air layers at different temperatures, which is why sound carries farther over water on cool evenings.' },
    ],
  },
  {
    slug: 'doppler-effect',
    title: 'How Does the Doppler Effect Work?',
    shortAnswer:
      'The Doppler effect is the change in frequency of a wave observed when the source and observer are moving relative to each other. Approaching sources sound higher-pitched; receding sources sound lower-pitched. It applies to sound, light, and all waves.',
    relatedGameSlugs: ['doppler-effect', 'satellite-doppler', 'speed-of-sound'],
    category: 'oscillations',
    steps: [
      { title: 'Source Approaching', explanation: 'When a wave source moves toward you, each successive crest is emitted from a closer position. The crests arrive more frequently, so you perceive a higher frequency.' },
      { title: 'Source Receding', explanation: 'When the source moves away, each crest is emitted from a farther position. Crests arrive less frequently, lowering the perceived frequency. This is the classic effect of a passing ambulance siren.' },
      { title: 'Relativistic Doppler (Light)', explanation: 'For light, the formula includes time dilation from special relativity: f_observed = f_source * sqrt((1-beta)/(1+beta)), where beta = v/c. Blue shift for approaching, red shift for receding.' },
      { title: 'Breaking the Sound Barrier', explanation: 'When a source exceeds the speed of sound, it outruns its own wave crests, creating a cone-shaped shock wave (Mach cone) heard as a sonic boom.' },
    ],
    realWorldApps: [
      'Police radar and lidar speed guns',
      'Medical ultrasound measuring blood flow velocity',
      'Astronomical redshift measuring galaxy recession speeds',
      'Weather Doppler radar tracking storm rotation',
      'Satellite communication frequency compensation',
    ],
    faqItems: [
      { question: 'Why does the Doppler shift matter for GPS?', answer: 'GPS satellites orbit at 14,000 km/h, causing measurable Doppler shifts in their radio signals. GPS receivers use this shift to determine the rate of change of distance to each satellite, improving position accuracy and enabling velocity measurement.' },
      { question: 'Is the Doppler effect the same for sound and light?', answer: 'Conceptually similar, but the formulas differ. Sound requires a medium and the effect depends separately on source and observer velocities. Light has no medium and only the relative velocity matters, with relativistic corrections at high speeds.' },
      { question: 'How did the Doppler effect prove the universe is expanding?', answer: 'Edwin Hubble observed that distant galaxies\' spectral lines are red-shifted proportional to their distance. This means all distant galaxies are moving away from us, and farther ones move faster, proving the universe is expanding.' },
    ],
  },
  {
    slug: 'diffraction',
    title: 'How Does Diffraction Work?',
    shortAnswer:
      'Diffraction is the bending and spreading of waves when they encounter an obstacle or pass through an opening. It occurs for all types of waves and is most pronounced when the obstacle size is comparable to the wavelength.',
    relatedGameSlugs: ['diffraction', 'thin-film-interference', 'wave-interference', 'chladni-patterns'],
    category: 'optics',
    steps: [
      { title: 'Huygens\' Principle', explanation: 'Every point on a wavefront acts as a source of secondary spherical wavelets. The new wavefront is the envelope of these wavelets. At an edge or slit, unblocked wavelets spread into the shadow region.' },
      { title: 'Single-Slit Diffraction', explanation: 'Light passing through a narrow slit spreads out and produces a pattern of bright and dark fringes. The central maximum is twice as wide as the others. Minima occur at sin(theta) = m*lambda/a.' },
      { title: 'Double-Slit Interference', explanation: 'Two nearby slits produce overlapping diffraction patterns that interfere. Bright fringes appear where path length difference is a whole number of wavelengths: d*sin(theta) = m*lambda.' },
      { title: 'Diffraction Gratings', explanation: 'A grating with thousands of slits produces extremely sharp spectral lines. The angular resolution improves with the number of slits, enabling precise wavelength measurement in spectroscopy.' },
    ],
    realWorldApps: [
      'CD and DVD rainbows from diffraction grating tracks',
      'X-ray crystallography determining molecular structures',
      'Optical microscope resolution limits (Abbe diffraction limit)',
      'Radio wave reception around buildings and hills',
      'Anti-counterfeiting holograms on credit cards',
    ],
    faqItems: [
      { question: 'Why can I hear someone around a corner but not see them?', answer: 'Sound waves have wavelengths of 0.02-17 meters, comparable to doorways. They diffract strongly around corners. Visible light has wavelengths of 400-700 nm, millions of times smaller than doorways, so diffraction is negligible at that scale.' },
      { question: 'What limits the resolution of a microscope?', answer: 'The Abbe diffraction limit: a microscope cannot resolve features smaller than about lambda/(2*NA), where NA is the numerical aperture. For visible light, this is roughly 200 nm.' },
      { question: 'Why do stars appear as points while the sun appears as a disk?', answer: 'Stars are so far away that they subtend an angle smaller than the diffraction limit of your eye or telescope. The sun is close enough to subtend about 0.5 degrees, well above the diffraction limit.' },
    ],
  },
  {
    slug: 'polarization',
    title: 'How Does Polarization Work?',
    shortAnswer:
      'Polarization describes the orientation of the electric field oscillation in a light wave. Unpolarized light oscillates in all directions perpendicular to propagation. Polarized light oscillates in a single plane, enabling applications from sunglasses to LCD screens.',
    relatedGameSlugs: ['polarization', 'polarized-sky', 'tape-birefringence', 'brewster-angle'],
    category: 'optics',
    steps: [
      { title: 'Transverse Wave Nature', explanation: 'Light is a transverse electromagnetic wave. The electric field oscillates perpendicular to the direction of propagation. Polarization specifies which perpendicular direction the field oscillates in.' },
      { title: 'Methods of Polarization', explanation: 'Light can be polarized by absorption (polaroid filters), reflection (Brewster\'s angle), scattering (Rayleigh scattering in the sky), or birefringence (calcite crystals splitting light into two polarizations).' },
      { title: 'Malus\'s Law', explanation: 'When polarized light passes through a second polarizer at angle theta to the first, the transmitted intensity is I = I_0 * cos^2(theta). At 90 degrees (crossed polarizers), no light passes through.' },
      { title: 'Circular and Elliptical Polarization', explanation: 'When two perpendicular linear polarizations combine with a phase difference, the electric field traces an ellipse (or circle at 90-degree phase shift). Quarter-wave plates convert linear to circular polarization.' },
    ],
    realWorldApps: [
      'Polarized sunglasses reducing glare from reflective surfaces',
      'LCD screens using liquid crystals to rotate polarization',
      'Polarimetry in chemistry to measure sugar concentrations',
      '3D cinema using orthogonal polarizations for each eye',
      'Stress analysis using photoelastic materials between crossed polarizers',
    ],
    faqItems: [
      { question: 'Why are polarized sunglasses better than tinted ones?', answer: 'Light reflecting off flat surfaces (water, roads, car hoods) becomes horizontally polarized. Polarized sunglasses have a vertical transmission axis, blocking this glare selectively. Tinted lenses reduce all light equally.' },
      { question: 'Why is the sky polarized?', answer: 'Sunlight scattering off air molecules becomes partially polarized perpendicular to the scattering plane. Maximum polarization occurs 90 degrees from the sun. Bees and some birds use this pattern for navigation.' },
      { question: 'How do LCD screens use polarization?', answer: 'An LCD has two crossed polarizers with liquid crystal cells between them. With no voltage, the crystal twists light 90 degrees to pass through. Applying voltage untwists the crystal, blocking light. Each pixel is controlled independently.' },
    ],
  },
  {
    slug: 'total-internal-reflection',
    title: 'How Does Total Internal Reflection Work?',
    shortAnswer:
      'Total internal reflection occurs when light traveling in a denser medium hits the boundary with a less dense medium at an angle greater than the critical angle. All light is reflected back with zero transmission loss, making it fundamental to fiber optics.',
    relatedGameSlugs: ['total-internal-reflection', 'snells-law', 'fiber-signal-loss', 'refraction'],
    category: 'optics',
    steps: [
      { title: 'Critical Angle', explanation: 'Using Snell\'s law with the refracted angle set to 90 degrees: sin(theta_c) = n2/n1. For glass-to-air (n1=1.5, n2=1.0), the critical angle is about 42 degrees.' },
      { title: 'Beyond the Critical Angle', explanation: 'When the incidence angle exceeds theta_c, Snell\'s law would require sin(theta2) > 1, which is impossible. The light cannot enter the second medium and is entirely reflected.' },
      { title: 'Evanescent Wave', explanation: 'Even during total internal reflection, an exponentially decaying electromagnetic field penetrates a fraction of a wavelength into the second medium. This enables frustrated TIR and fiber optic coupling.' },
      { title: 'Reflection Efficiency', explanation: 'Total internal reflection is genuinely 100% efficient with zero absorption loss, unlike metallic mirrors which absorb a few percent. This is why fiber optics can carry signals for kilometers.' },
    ],
    realWorldApps: [
      'Fiber optic telecommunications carrying internet traffic',
      'Optical fibers for endoscopes and medical imaging',
      'Diamond brilliance from high refractive index and low critical angle',
      'Binoculars using Porro prisms instead of mirrors',
      'Fingerprint sensors using frustrated total internal reflection',
    ],
    faqItems: [
      { question: 'Why are diamonds so sparkly?', answer: 'Diamond has a very high refractive index (2.42), giving a critical angle of only 24.4 degrees. Most light entering the diamond undergoes multiple total internal reflections before exiting, creating the characteristic brilliance.' },
      { question: 'Why does fiber optic cable need cladding?', answer: 'The cladding provides a clean, uniform boundary with a lower refractive index. Without it, any contaminant on the fiber surface would disrupt total internal reflection and cause light to leak out.' },
      { question: 'Can total internal reflection happen with sound?', answer: 'Yes. Sound undergoes total internal reflection when traveling from a slow medium to a fast medium at steep angles. This occurs in ocean acoustics where sound channels trap energy at certain depths.' },
    ],
  },
  {
    slug: 'photoelectric-effect',
    title: 'How Does the Photoelectric Effect Work?',
    shortAnswer:
      'The photoelectric effect is the emission of electrons from a metal surface when light above a certain frequency shines on it. Einstein explained it by proposing that light comes in discrete packets (photons), each with energy E = hf, earning him the Nobel Prize.',
    relatedGameSlugs: ['photoelectric-effect', 'wave-particle-duality', 'solar-cell'],
    category: 'optics',
    steps: [
      { title: 'Photon Energy', explanation: 'Light consists of photons, each carrying energy E = hf, where h is Planck\'s constant and f is the frequency. Higher frequency (bluer light) means higher energy per photon.' },
      { title: 'Work Function', explanation: 'Each metal has a minimum energy (work function, phi) needed to free an electron from the surface. If hf < phi, no electrons are emitted regardless of light intensity.' },
      { title: 'Threshold Frequency', explanation: 'Electrons are only emitted when f > phi/h. Below this threshold, even extremely bright light cannot eject a single electron. Above it, even a single photon can free one electron.' },
      { title: 'Kinetic Energy of Emitted Electrons', explanation: 'Any photon energy beyond the work function becomes kinetic energy: KE_max = hf - phi. Brighter light ejects more electrons but does not increase their individual energy.' },
    ],
    realWorldApps: [
      'Solar cells converting sunlight to electricity',
      'Photomultiplier tubes for detecting single photons',
      'CCD and CMOS camera sensors',
      'Automatic doors using photoelectric sensors',
      'Electron spectroscopy for material analysis (XPS)',
    ],
    faqItems: [
      { question: 'Why was the photoelectric effect important for quantum mechanics?', answer: 'Classical wave theory predicted any frequency should eject electrons if bright enough, and brighter light should give electrons more energy. Neither is true. This proved light has a particle nature and launched quantum mechanics.' },
      { question: 'How is the photoelectric effect related to solar cells?', answer: 'Solar cells use the closely related photovoltaic effect. Photons above the bandgap create electron-hole pairs separated by a junction field, generating current. The threshold concept is the same.' },
      { question: 'Can the photoelectric effect happen with visible light?', answer: 'Yes, for metals with low work functions. Alkali metals like cesium (phi = 2.1 eV) emit electrons with visible light. Most common metals require ultraviolet light (work functions of 4-5 eV).' },
    ],
  },
  // ----------------------------------------------------------------
  // THERMODYNAMICS
  // ----------------------------------------------------------------
  {
    slug: 'carnot-cycle',
    title: 'How Does the Carnot Cycle Work?',
    shortAnswer:
      'The Carnot cycle is the most efficient possible heat engine cycle operating between two temperatures. It consists of two isothermal and two adiabatic processes, and its efficiency eta = 1 - T_cold/T_hot sets the theoretical upper limit for all real engines.',
    relatedGameSlugs: ['carnot-cycle', 'entropy', 'gas-laws', 'chiller-c-o-p'],
    category: 'thermodynamics',
    steps: [
      { title: 'Isothermal Expansion', explanation: 'The working gas absorbs heat Q_H from the hot reservoir at temperature T_H while expanding slowly. Temperature stays constant as the gas does work on the piston.' },
      { title: 'Adiabatic Expansion', explanation: 'The gas continues expanding with no heat exchange (insulated). It does work and its temperature drops from T_H to T_C.' },
      { title: 'Isothermal Compression', explanation: 'The gas is compressed in thermal contact with the cold reservoir at T_C. It releases heat Q_C while maintaining constant temperature.' },
      { title: 'Adiabatic Compression', explanation: 'The gas is compressed with no heat exchange, raising its temperature back to T_H and completing the cycle.' },
    ],
    realWorldApps: [
      'Setting theoretical efficiency limits for power plants',
      'Designing refrigeration cycles (reverse Carnot)',
      'Evaluating heat pump performance (COP)',
      'Benchmarking internal combustion engine efficiency',
      'Understanding why 100% efficient heat engines are impossible',
    ],
    faqItems: [
      { question: 'Why can no real engine achieve Carnot efficiency?', answer: 'The Carnot cycle requires perfectly reversible processes: infinitely slow heat transfer and perfectly insulated adiabatic steps. Real engines have friction, finite heat transfer rates, and non-ideal gas behavior.' },
      { question: 'How does the Carnot cycle relate to the second law of thermodynamics?', answer: 'The Carnot efficiency eta = 1 - T_C/T_H is a direct consequence of the second law. It proves that some heat must always be rejected to the cold reservoir; no engine can convert heat entirely to work.' },
      { question: 'What is the Carnot COP for a refrigerator?', answer: 'COP = T_C / (T_H - T_C). A fridge cooling to 4C (277K) in a 30C (303K) room has a maximum COP of about 10.7, meaning at best it moves 10.7 joules of heat per joule of work.' },
    ],
  },
  {
    slug: 'thermal-expansion',
    title: 'How Does Thermal Expansion Work?',
    shortAnswer:
      'Thermal expansion is the tendency of matter to change its shape, area, and volume in response to a change in temperature. When heated, atoms vibrate more vigorously and maintain a larger average spacing, causing the material to expand.',
    relatedGameSlugs: ['thermal-expansion', 'jar-lid-expansion', 'bimetal-thermostat'],
    category: 'thermodynamics',
    steps: [
      { title: 'Atomic Vibrations', explanation: 'Atoms in a solid vibrate around equilibrium positions. Higher temperature increases vibration amplitude. Due to the asymmetric interatomic potential, the average position shifts outward.' },
      { title: 'Linear Expansion', explanation: 'For a solid bar: delta_L = alpha * L_0 * delta_T, where alpha is the coefficient of linear thermal expansion. Steel has alpha = 12e-6/K.' },
      { title: 'Volumetric Expansion', explanation: 'For volume: delta_V = beta * V_0 * delta_T, where beta is approximately 3*alpha for isotropic solids. Liquids have larger beta values than solids.' },
      { title: 'Anomalous Expansion', explanation: 'Water is a notable exception: it contracts when heated from 0 to 4C and expands above 4C. This anomaly is critical for aquatic life, as ice floats and insulates lakes in winter.' },
    ],
    realWorldApps: [
      'Expansion joints in bridges and railways',
      'Bimetallic strips in thermostats',
      'Loosening a stuck jar lid with hot water',
      'Thermal stress management in electronics and buildings',
      'Mercury and alcohol thermometers',
    ],
    faqItems: [
      { question: 'Why do bridges have expansion joints?', answer: 'A 100m steel bridge expands about 1.2 mm per degree C. Over a 50-degree seasonal swing, that is 60 mm. Without joints, this would create enormous stress that could buckle the structure.' },
      { question: 'Why does hot water loosen a jar lid?', answer: 'Metal lids expand more than glass jars when heated because metals have higher thermal expansion coefficients. The lid expands faster, breaking the vacuum seal.' },
      { question: 'Do all materials expand when heated?', answer: 'Nearly all, but some exotic materials exhibit negative thermal expansion. Zirconium tungstate (ZrW2O8) contracts over a wide temperature range and is used to engineer zero-expansion composites.' },
    ],
  },
  {
    slug: 'leidenfrost-effect',
    title: 'How Does the Leidenfrost Effect Work?',
    shortAnswer:
      'The Leidenfrost effect occurs when a liquid contacts a surface much hotter than its boiling point. The bottom layer vaporizes instantly, creating an insulating gas cushion that levitates the remaining droplet, dramatically slowing further evaporation.',
    relatedGameSlugs: ['leidenfrost', 'boiling-pressure', 'evaporative-cooling'],
    category: 'thermodynamics',
    steps: [
      { title: 'The Leidenfrost Point', explanation: 'Above a critical surface temperature (about 200C for water on stainless steel), rapid vaporization creates a self-sustaining vapor layer that levitates the droplet.' },
      { title: 'Vapor Cushion Insulation', explanation: 'The thin vapor layer (about 0.1mm) has very low thermal conductivity. This insulating cushion dramatically reduces heat transfer, causing the droplet to survive much longer.' },
      { title: 'Frictionless Motion', explanation: 'The levitating droplet sits on a nearly frictionless gas bearing. It can skitter across the hot surface at high speed, propelled by asymmetries in the vapor flow.' },
      { title: 'Film Boiling Regime', explanation: 'The Leidenfrost effect is the onset of stable film boiling. Below this temperature, nucleate boiling provides much better heat transfer. This non-monotonic behavior is captured in the boiling curve.' },
    ],
    realWorldApps: [
      'Testing pan temperature with water drops when cooking',
      'Walking briefly on hot coals (a thin vapor layer protects the feet)',
      'Liquid nitrogen demonstrations on a warm floor',
      'Spray cooling in metallurgy where the Leidenfrost point must be avoided',
      'Fuel injection dynamics in diesel engines',
    ],
    faqItems: [
      { question: 'Is it safe to dip your hand in liquid nitrogen because of the Leidenfrost effect?', answer: 'A very brief dip can be survivable because warm skin creates a vapor barrier. However, this is extremely dangerous because any disruption of the vapor film causes instant frostbite. It should never be attempted.' },
      { question: 'Why does a water drop dance on a very hot pan but evaporate quickly on a warm pan?', answer: 'On a warm pan (100-150C), water is in direct contact and boils rapidly. On a very hot pan (200C+), the Leidenfrost vapor cushion insulates the drop, making it last much longer and skitter around.' },
      { question: 'Does the Leidenfrost effect work with liquids other than water?', answer: 'Yes. Any liquid exhibits it at a surface temperature sufficiently above its boiling point. Liquid nitrogen on a room-temperature surface is a dramatic demonstration.' },
    ],
  },
  // ----------------------------------------------------------------
  // WAVES & OSCILLATIONS
  // ----------------------------------------------------------------
  {
    slug: 'resonance',
    title: 'How Does Resonance Work?',
    shortAnswer:
      'Resonance occurs when an oscillating system is driven at its natural frequency, causing the amplitude of oscillation to grow dramatically. The driving force adds energy in phase with the motion, producing large responses from small inputs.',
    relatedGameSlugs: ['resonance', 'forced-oscillations', 'l-c-resonance', 'tuned-mass-damper'],
    category: 'oscillations',
    steps: [
      { title: 'Natural Frequency', explanation: 'Every oscillating system has natural frequencies determined by its mass and stiffness: f_n = 1/(2pi) * sqrt(k/m) for a spring-mass system.' },
      { title: 'Driving at Resonance', explanation: 'When an external force oscillates at the natural frequency, each push arrives in phase with the motion, adding energy each cycle. Amplitude grows until energy input equals dissipation.' },
      { title: 'Quality Factor (Q)', explanation: 'Q measures how sharply tuned the resonance is: Q = f_0/bandwidth. High-Q systems (tuning forks, quartz crystals) resonate sharply. Low-Q systems (shock absorbers) respond broadly.' },
      { title: 'Damping Limits Amplitude', explanation: 'Without damping, resonance would drive amplitude to infinity. Real systems have friction that dissipates energy, limiting peak amplitude to approximately Q times the static response.' },
    ],
    realWorldApps: [
      'Musical instruments producing specific notes',
      'Radio receivers tuning to specific frequencies (LC resonance)',
      'MRI machines exciting nuclear spin resonance',
      'Microwave ovens exciting water molecule resonance at 2.45 GHz',
      'Soldiers breaking step on bridges to avoid structural resonance',
    ],
    faqItems: [
      { question: 'Did resonance really destroy the Tacoma Narrows Bridge?', answer: 'The bridge collapsed due to aeroelastic flutter, not simple resonance. Wind created a feedback loop where the bridge\'s twisting altered aerodynamic forces. It is related to but distinct from resonance.' },
      { question: 'Can a singer really shatter a wine glass?', answer: 'Yes, but it requires matching the glass\'s natural frequency precisely (typically 400-700 Hz) and maintaining very high sound pressure (over 100 dB). Amplified singers have demonstrated this reliably.' },
      { question: 'Is resonance always destructive?', answer: 'No. Musical instruments, quartz clocks, radio receivers, lasers, and MRI machines all exploit resonance constructively. It is only destructive when uncontrolled in mechanical structures.' },
    ],
  },
  {
    slug: 'standing-waves',
    title: 'How Do Standing Waves Work?',
    shortAnswer:
      'Standing waves form when two identical waves travel in opposite directions and interfere. The result is a wave pattern that appears to stand still, with fixed nodes (zero amplitude) and antinodes (maximum amplitude). They are fundamental to musical instruments.',
    relatedGameSlugs: ['standing-waves', 'wave-interference', 'microwave-standing-wave', 'chladni-patterns'],
    category: 'oscillations',
    steps: [
      { title: 'Superposition of Opposing Waves', explanation: 'When a wave reflects from a boundary and overlaps with the incoming wave, they superpose. At certain frequencies, they form a stable pattern of constructive and destructive interference.' },
      { title: 'Nodes and Antinodes', explanation: 'Nodes are points where the waves always cancel (zero displacement). Antinodes are maxima. Nodes are spaced half a wavelength apart.' },
      { title: 'Resonant Frequencies', explanation: 'Standing waves only form at discrete frequencies: f_n = n*v/(2L) for a string fixed at both ends. These are the harmonics.' },
      { title: 'Mode Shapes', explanation: 'The fundamental has one antinode. The second harmonic has two antinodes with a central node. Higher harmonics have increasingly complex patterns.' },
    ],
    realWorldApps: [
      'Guitar, violin, and piano strings producing musical tones',
      'Organ pipes and wind instruments',
      'Microwave oven hot spots',
      'Laser cavities selecting specific wavelengths',
      'Chladni patterns visualizing vibration modes on plates',
    ],
    faqItems: [
      { question: 'Why do microwave ovens have turntables?', answer: 'Microwaves form standing waves inside the cavity, creating hot spots (antinodes) and cold spots (nodes). The turntable rotates food through these regions for more even heating.' },
      { question: 'What determines the pitch of a guitar string?', answer: 'f = (1/2L)*sqrt(T/mu), where L is string length, T is tension, and mu is mass per unit length. Pressing a fret shortens L (higher pitch), tuning adjusts T, thicker strings have higher mu (lower pitch).' },
      { question: 'Can standing waves form in 2D or 3D?', answer: 'Yes. Chladni patterns on plates show 2D standing waves. Microwave cavity modes are 3D standing waves. Atomic orbitals are 3D standing waves of electron wavefunctions.' },
    ],
  },
  // ----------------------------------------------------------------
  // MATERIALS
  // ----------------------------------------------------------------
  {
    slug: 'brownian-motion',
    title: 'How Does Brownian Motion Work?',
    shortAnswer:
      'Brownian motion is the random, jittering movement of microscopic particles suspended in a fluid, caused by continuous bombardment from the fluid\'s molecules. Einstein\'s 1905 analysis provided definitive evidence that atoms exist.',
    relatedGameSlugs: ['brownian-motion', 'diffusion-convection', 'kinetic-theory-gases'],
    category: 'materials',
    steps: [
      { title: 'Molecular Bombardment', explanation: 'Fluid molecules collide with the suspended particle from all directions. At any instant, the collisions do not perfectly cancel, resulting in a net random force.' },
      { title: 'Random Walk', explanation: 'The particle executes a random walk: each step is in a random direction. Mean displacement is zero, but mean squared displacement grows linearly with time.' },
      { title: 'Einstein\'s Relation', explanation: '<x^2> = 2Dt, where D = k_B*T/(6*pi*eta*r) depends on temperature, fluid viscosity, and particle radius.' },
      { title: 'Size and Temperature Dependence', explanation: 'Smaller particles and higher temperatures produce more vigorous motion. Particles larger than about 10 micrometers show negligible Brownian motion.' },
    ],
    realWorldApps: [
      'Proof of atomic theory (Perrin\'s Nobel Prize experiments)',
      'Colloidal stability in paints, milk, and pharmaceuticals',
      'Diffusion in biological cells',
      'Financial modeling (stock price random walks)',
      'Nanoparticle characterization via dynamic light scattering',
    ],
    faqItems: [
      { question: 'Why was Brownian motion important for proving atoms exist?', answer: 'Einstein predicted that if atoms are real, they would cause measurable jittering of suspended particles. Perrin confirmed the predictions precisely in 1908, proving atomic theory and earning the Nobel Prize.' },
      { question: 'Can Brownian motion be seen with the naked eye?', answer: 'Not directly. You need a microscope (at least 100x) to see jittering of ~1 micrometer particles. Pollen grains in water, as Robert Brown observed in 1827, are a classic demonstration.' },
      { question: 'Does Brownian motion ever stop?', answer: 'Only at absolute zero (0 K). At any positive temperature, fluid molecules are always in motion and Brownian motion continues. It cannot be used to extract useful work without violating the second law of thermodynamics.' },
    ],
  },
  // ----------------------------------------------------------------
  // SEMICONDUCTORS
  // ----------------------------------------------------------------
  {
    slug: 'mosfet-switching',
    title: 'How Does MOSFET Switching Work?',
    shortAnswer:
      'A MOSFET switches by using a voltage on the gate electrode to create or destroy a conducting channel between the source and drain terminals. It is the fundamental building block of all modern digital electronics, with over 100 billion on a single chip.',
    relatedGameSlugs: ['m-o-s-f-e-t-switching', 'leakage-current', 's-r-a-m-cell', 'leakage-power'],
    category: 'semiconductors',
    steps: [
      { title: 'Gate Voltage Control', explanation: 'Applying a voltage to the gate creates an electric field through the thin oxide layer, attracting charge carriers to the surface and forming a conductive channel.' },
      { title: 'Threshold Voltage', explanation: 'The channel forms only above the threshold voltage V_th (typically 0.3-0.7V). Below V_th, the transistor is off with only tiny leakage current.' },
      { title: 'ON State', explanation: 'Above V_th, the channel conducts. In the linear region it acts like a resistor. In saturation, current is approximately proportional to (Vgs - Vth)^2.' },
      { title: 'Switching Speed', explanation: 'Speed is limited by the time to charge gate and output capacitances. Modern transistors switch in picoseconds, enabling GHz clock speeds.' },
    ],
    realWorldApps: [
      'All digital logic gates in CPUs and GPUs',
      'SRAM and DRAM memory cells',
      'Power MOSFETs for motor drives and power supplies',
      'Analog amplifiers and operational amplifiers',
      'RF switches in wireless communication',
    ],
    faqItems: [
      { question: 'How small are modern MOSFETs?', answer: 'Leading-edge transistors (3nm node) have gate lengths of about 12 nm with fin widths of 5-7 nm. A modern processor contains over 100 billion transistors on a die the size of a fingernail.' },
      { question: 'What causes leakage current?', answer: 'Three main mechanisms: subthreshold conduction (weak inversion below Vth), gate oxide tunneling (quantum mechanical), and junction leakage. All worsen as transistors shrink.' },
      { question: 'What is the difference between NMOS and PMOS?', answer: 'NMOS uses electrons and turns on with positive gate voltage. PMOS uses holes and turns on with negative voltage. CMOS logic uses complementary pairs for near-zero static power.' },
    ],
  },
  {
    slug: 'photolithography',
    title: 'How Does Photolithography Work?',
    shortAnswer:
      'Photolithography transfers a circuit pattern onto a semiconductor wafer using light. A photosensitive resist is exposed through a patterned mask, then developed and etched to create nanoscale features. It is the most critical process step in chip manufacturing.',
    relatedGameSlugs: ['photolithography', 'litho-focus-dose', 'etch-anisotropy', 'overlay-error'],
    category: 'semiconductors',
    steps: [
      { title: 'Photoresist Coating', explanation: 'A thin layer (0.1-1 um) of photosensitive polymer is spin-coated onto the wafer. Positive resist becomes soluble when exposed; negative resist becomes insoluble.' },
      { title: 'Mask Alignment and Exposure', explanation: 'A stepper or scanner projects UV light (193nm DUV or 13.5nm EUV) through a patterned reticle onto the resist. The pattern is typically reduced 4x from mask to wafer.' },
      { title: 'Development', explanation: 'Developer solution dissolves exposed areas (positive resist), leaving a patterned resist layer faithfully reproducing the mask pattern.' },
      { title: 'Etch and Strip', explanation: 'The patterned resist masks the etch of the underlying layer. After etching, remaining resist is stripped, leaving the circuit pattern in the functional material.' },
    ],
    realWorldApps: [
      'Manufacturing all integrated circuits (CPUs, GPUs, memory)',
      'MEMS devices (accelerometers, pressure sensors)',
      'Flat panel display manufacturing',
      'Photonic integrated circuits',
      'DNA microarrays for genomic analysis',
    ],
    faqItems: [
      { question: 'How can photolithography print features smaller than the light wavelength?', answer: 'Immersion lithography, multiple patterning, and EUV (13.5nm light) enable features down to 3nm nodes with actual dimensions of 5-12 nm.' },
      { question: 'What is EUV lithography?', answer: 'Extreme Ultraviolet lithography uses 13.5nm light generated by hitting tin droplets with a CO2 laser. It prints smaller features in a single exposure but requires multi-billion-dollar tools operating in vacuum.' },
      { question: 'How many lithography steps does a modern chip require?', answer: 'A 3nm logic chip requires 80-100 lithography steps. The total process involves over 1,000 individual steps across all types.' },
    ],
  },
  {
    slug: 'capacitive-touch',
    title: 'How Does Capacitive Touch Work?',
    shortAnswer:
      'Capacitive touchscreens detect touch by measuring changes in electrical capacitance at each point on the screen. Your finger, being conductive, alters the local electric field when it approaches, and the touch controller detects this change.',
    relatedGameSlugs: ['capacitive-touch', 'electric-field', 'coulombs-law'],
    category: 'semiconductors',
    steps: [
      { title: 'Electrode Grid', explanation: 'The screen has a grid of transparent ITO electrodes arranged in rows and columns, separated by a thin insulator.' },
      { title: 'Mutual Capacitance', explanation: 'Each row-column intersection forms a small capacitor. The controller continuously measures the capacitance at every intersection.' },
      { title: 'Finger Changes Capacitance', explanation: 'A finger approaching an intersection couples capacitively to both electrodes, changing the mutual capacitance. The human body acts as a conductor due to its water and electrolyte content.' },
      { title: 'Position Calculation', explanation: 'The controller identifies changed intersections and interpolates to determine precise touch position, often achieving sub-millimeter accuracy.' },
    ],
    realWorldApps: [
      'Smartphone and tablet touchscreens',
      'Laptop trackpads',
      'Automotive infotainment displays',
      'Industrial control panels',
      'Smart home light switches',
    ],
    faqItems: [
      { question: 'Why don\'t regular gloves work on touchscreens?', answer: 'Standard glove materials are insulators that block capacitive coupling. Touchscreen-compatible gloves have conductive thread (silver or copper fiber) woven into the fingertips.' },
      { question: 'How does a touchscreen detect multiple fingers?', answer: 'Projected capacitive (PCAP) screens measure capacitance at every grid intersection independently, allowing 10+ simultaneous touch points without ambiguity.' },
      { question: 'Why do water drops sometimes cause false touches?', answer: 'Water is conductive and creates coupling similar to a finger. Modern controllers use algorithms to distinguish water from finger patterns.' },
    ],
  },
  // ----------------------------------------------------------------
  // AI & COMPUTING
  // ----------------------------------------------------------------
  {
    slug: 'neural-network-inference',
    title: 'How Does Neural Network Inference Work?',
    shortAnswer:
      'Neural network inference feeds input data through a trained model to produce predictions. It involves matrix multiplications, activation functions, and sequential layer processing, requiring significant compute and memory bandwidth.',
    relatedGameSlugs: ['a-i-inference-latency', 'energy-per-token', 'batching-latency', 'quantization-precision'],
    category: 'computing',
    steps: [
      { title: 'Input Processing', explanation: 'Raw input (text, image, audio) is tokenized or encoded into numerical tensors. For language models, text becomes token IDs and then embedding vectors.' },
      { title: 'Forward Pass', explanation: 'The input tensor passes through layers. Each performs a matrix multiplication (weights * input), adds bias, and applies a non-linear activation function (ReLU, GELU).' },
      { title: 'Attention Mechanism', explanation: 'Transformer self-attention computes Query, Key, Value matrices to determine which parts of the input each output element should attend to. This is the most compute-intensive step.' },
      { title: 'Output Generation', explanation: 'The final layer produces logits converted to probabilities via softmax. For generation tasks, the process repeats autoregressively, token by token.' },
    ],
    realWorldApps: [
      'Large language models generating text',
      'Image classification and object detection',
      'Speech recognition and synthesis',
      'Recommendation systems',
      'Autonomous vehicle perception',
    ],
    faqItems: [
      { question: 'Why is inference slower for larger models?', answer: 'More parameters means more matrix multiplications per layer and more layers. A 70B model needs ~140 GB of memory and ~140 TFLOPS per token, compared to ~14 GB and ~14 TFLOPS for a 7B model.' },
      { question: 'What is the difference between training and inference?', answer: 'Training adjusts weights via backpropagation and requires 2-3x more compute per sample. Inference uses fixed weights to make predictions. Training processes billions of samples.' },
      { question: 'How does quantization speed up inference?', answer: 'Reducing precision from FP16 to INT8 or INT4 halves or quarters memory usage and bandwidth needs, using cheaper integer arithmetic. Accuracy loss is typically 1-3%.' },
    ],
  },
  {
    slug: 'gpu-memory-bandwidth',
    title: 'How Does GPU Memory Bandwidth Work?',
    shortAnswer:
      'GPU memory bandwidth is the rate at which data transfers between processing cores and memory (HBM or GDDR). It is often the primary bottleneck for AI inference and scientific computing, more limiting than raw compute speed.',
    relatedGameSlugs: ['g-p-u-memory-bandwidth', 'memory-hierarchy', 'data-movement-energy', 'k-v-cache'],
    category: 'computing',
    steps: [
      { title: 'Memory Interface Width', explanation: 'GPUs use wide interfaces (256-bit GDDR6X, 4096-bit HBM3). HBM stacks memory dies vertically with thousands of through-silicon vias (TSVs).' },
      { title: 'Clock Speed and Data Rate', explanation: 'Bandwidth = width * rate * stacks. An H100 with 5 HBM3 stacks achieves ~3.35 TB/s.' },
      { title: 'Compute-to-Memory Ratio', explanation: 'Arithmetic intensity (FLOPs per byte) determines if a workload is compute-bound or memory-bound. LLM inference is typically memory-bound.' },
      { title: 'Memory Hierarchy', explanation: 'GPUs have registers (fastest), shared memory/L1, L2 cache, and main memory (HBM). Effective code keeps hot data in faster levels.' },
    ],
    realWorldApps: [
      'AI model inference (often memory-bandwidth limited)',
      'Scientific simulations with large datasets',
      'Video game rendering with large textures',
      'GPU-accelerated database analytics',
      'Cryptocurrency mining (memory-hard algorithms)',
    ],
    faqItems: [
      { question: 'Why is bandwidth more important than FLOPS for LLM inference?', answer: 'Each generated token requires loading all model weights from memory but performs few operations per weight. A 70B FP16 model needs 140 GB loaded per token, limiting throughput to ~24 tokens/s at 3.35 TB/s regardless of FLOP capacity.' },
      { question: 'What is HBM and why do AI GPUs use it?', answer: 'High Bandwidth Memory stacks DRAM dies vertically with TSVs, providing a very wide interface in a small footprint. It delivers 2-3x more bandwidth than GDDR6X at lower power per bit.' },
      { question: 'How does batching help with bandwidth?', answer: 'Batching loads weights once and reuses them across all batch items, amortizing memory access cost. A batch of 32 can improve throughput by nearly 32x for compute-bound operations.' },
    ],
  },
  // ----------------------------------------------------------------
  // SOLAR & ENERGY
  // ----------------------------------------------------------------
  {
    slug: 'solar-cell',
    title: 'How Does a Solar Cell Work?',
    shortAnswer:
      'A solar cell converts sunlight into electricity using the photovoltaic effect. Photons create electron-hole pairs in semiconductor material, and a built-in electric field at the p-n junction separates these carriers, generating voltage and current.',
    relatedGameSlugs: ['solar-cell', 'p-v-i-v-curve', 'fill-factor', 'spectral-mismatch'],
    category: 'solar',
    steps: [
      { title: 'Photon Absorption', explanation: 'Photons with energy above the bandgap (1.12 eV for silicon) promote electrons from valence to conduction band, creating free electron-hole pairs.' },
      { title: 'P-N Junction Field', explanation: 'The cell has a p-n junction where a built-in electric field exists in the depletion region, pointing from n to p.' },
      { title: 'Carrier Separation', explanation: 'The field sweeps electrons to the n-side and holes to the p-side, creating a voltage (0.6-0.7V for silicon).' },
      { title: 'External Circuit', explanation: 'Connected to a load, separated charges flow as current. Power is maximized at the maximum power point (MPP).' },
    ],
    realWorldApps: [
      'Rooftop and utility-scale solar power',
      'Spacecraft power systems',
      'Solar-powered calculators and watches',
      'Off-grid power for remote locations',
      'Building-integrated photovoltaics (BIPV)',
    ],
    faqItems: [
      { question: 'What limits solar cell efficiency?', answer: 'The Shockley-Queisser limit (~33.7% for single-junction silicon) arises because sub-bandgap photons pass through and above-bandgap energy is lost as heat. Best lab silicon cells reach 26.7%.' },
      { question: 'Why are most solar cells made of silicon?', answer: 'Silicon has a near-ideal bandgap, is the second most abundant element, is non-toxic, and benefits from decades of semiconductor infrastructure.' },
      { question: 'Do solar cells work on cloudy days?', answer: 'Yes, at 10-25% of full-sun output. They respond to diffuse light (scattered by clouds) as well as direct light.' },
    ],
  },
  {
    slug: 'mppt',
    title: 'How Does MPPT Work?',
    shortAnswer:
      'MPPT (Maximum Power Point Tracking) is an algorithm that continuously finds the voltage at which a solar panel produces maximum power. Since the optimal point shifts with temperature and irradiance, MPPT adjusts in real time to harvest the most energy.',
    relatedGameSlugs: ['m-p-p-t', 'p-v-i-v-curve', 'solar-cell', 'string-sizing'],
    category: 'solar',
    steps: [
      { title: 'The I-V Curve', explanation: 'A solar panel\'s current-voltage relationship is nonlinear. Power (V*I) peaks at a single point on this curve.' },
      { title: 'Perturb and Observe', explanation: 'The most common algorithm slightly changes operating voltage, measures power change, and moves toward higher power. It continuously hunts around the MPP.' },
      { title: 'DC-DC Conversion', explanation: 'An MPPT controller includes a DC-DC converter that decouples panel voltage from load voltage, operating the panel at its MPP regardless of load.' },
      { title: 'Dynamic Response', explanation: 'Cloud transients and temperature changes move the MPP. Modern controllers sample at 1-10 kHz and track within milliseconds, recovering 99%+ of available energy.' },
    ],
    realWorldApps: [
      'Residential and commercial solar inverters',
      'Solar charge controllers for off-grid batteries',
      'Spacecraft power management',
      'Solar-powered water pumping',
      'EV solar charging stations',
    ],
    faqItems: [
      { question: 'How much more energy does MPPT harvest?', answer: 'Typically 20-30% more than a direct panel-to-battery connection. The gain is highest when conditions are suboptimal (cold panels, partial shading, low irradiance).' },
      { question: 'What happens under partial shading?', answer: 'Partial shading creates multiple local power maxima. Simple algorithms may get stuck on a local max. Advanced algorithms periodically sweep the full voltage range to find the global MPP.' },
      { question: 'Can MPPT work at night?', answer: 'No. At night there is no irradiance and no photocurrent. The controller enters sleep mode and resumes tracking at dawn.' },
    ],
  },
  // ----------------------------------------------------------------
  // GAS LAWS
  // ----------------------------------------------------------------
  {
    slug: 'gas-laws',
    title: 'How Do the Gas Laws Work?',
    shortAnswer:
      'The gas laws describe how pressure, volume, temperature, and amount of gas relate to each other. The ideal gas law PV = nRT unifies Boyle\'s, Charles\'s, and Avogadro\'s laws into a single equation predicting gas behavior under changing conditions.',
    relatedGameSlugs: ['gas-laws', 'cloud-in-bottle', 'entropy', 'carnot-cycle'],
    category: 'thermodynamics',
    steps: [
      { title: 'Boyle\'s Law', explanation: 'At constant temperature, P*V = constant. Compressing a gas into half the volume doubles its pressure.' },
      { title: 'Charles\'s Law', explanation: 'At constant pressure, V/T = constant. Heating a gas makes it expand proportionally to absolute temperature.' },
      { title: 'Ideal Gas Law', explanation: 'PV = nRT, where n is moles and R = 8.314 J/(mol*K). This predicts the state of an ideal gas under any conditions.' },
      { title: 'Real Gas Corrections', explanation: 'Real gases deviate at high pressures (finite molecular volume) and low temperatures (intermolecular attractions). The van der Waals equation adds correction terms.' },
    ],
    realWorldApps: [
      'Tire pressure changes with temperature',
      'Scuba diving decompression calculations',
      'Weather balloon expansion at altitude',
      'Internal combustion engine analysis',
      'Industrial gas storage and transport',
    ],
    faqItems: [
      { question: 'Why do tires lose pressure in cold weather?', answer: 'In a rigid tire, volume is fixed, so by the gas law, pressure drops with temperature. A 10C drop reduces pressure by about 1-2 PSI.' },
      { question: 'What makes a gas "ideal"?', answer: 'Point-like molecules with no volume and no intermolecular attractions. Real gases approach this at low pressures and high temperatures.' },
      { question: 'Why does compressed gas feel cold when released?', answer: 'Rapid adiabatic expansion converts internal energy to work, dropping the temperature. This is the principle behind refrigeration.' },
    ],
  },
];

// ============================================================
// LOOKUP
// ============================================================

/**
 * Find a how-it-works entry by its URL-friendly slug.
 */
export function getHowItWorksBySlug(slug: string): HowItWorksEntry | undefined {
  return howItWorksEntries.find(e => e.slug === slug);
}
