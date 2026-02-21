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
// ----------------------------------------------------------------
  // THERMODYNAMICS (additional)
  // ----------------------------------------------------------------
  {
    slug: 'evaporative-cooling',
    title: 'How Does Evaporative Cooling Work?',
    shortAnswer:
      'Evaporative cooling occurs when liquid water absorbs latent heat from its surroundings to transition into vapor. The fastest-moving molecules escape the surface, lowering the average kinetic energy of the remaining liquid and thus its temperature.',
    relatedGameSlugs: ['evaporative-cooling', 'latent-heat', 'phase-change-energy'],
    category: 'thermodynamics',
    steps: [
      { title: 'Molecular Energy Distribution', explanation: 'Liquid molecules have a range of kinetic energies described by the Maxwell-Boltzmann distribution. Only molecules in the high-energy tail have enough energy to overcome intermolecular attractions and escape the surface.' },
      { title: 'Latent Heat Absorption', explanation: 'Each molecule that escapes carries away significant kinetic energy — about 2,260 kJ per kilogram of water evaporated. This energy is drawn from the thermal energy of the remaining liquid and the surface it contacts.' },
      { title: 'Temperature Reduction', explanation: 'As high-energy molecules leave, the average kinetic energy of the remaining liquid drops, which is measured as a temperature decrease. The wet-bulb temperature is the lowest achievable temperature through evaporation at a given humidity.' },
      { title: 'Humidity Dependence', explanation: 'Evaporation rate depends on the vapor pressure difference between the liquid surface and the surrounding air. In humid air, the vapor pressure gradient is small, slowing evaporation and reducing the cooling effect.' },
    ],
    realWorldApps: [
      'Swamp coolers (evaporative coolers) for arid climate air conditioning',
      'Human sweating as a thermoregulation mechanism',
      'Cooling towers at power plants dissipating waste heat',
      'Wet-bulb thermometers for measuring humidity',
    ],
    faqItems: [
      { question: 'Why does evaporative cooling work better in dry climates?', answer: 'In dry air the vapor pressure is low, creating a large gradient that drives rapid evaporation. In humid air the gradient is small, so evaporation is slow and cooling is minimal. This is why swamp coolers are effective in deserts but useless in tropical climates.' },
      { question: 'How much can evaporative cooling lower the temperature?', answer: 'The theoretical limit is the wet-bulb temperature, which depends on humidity. In a dry desert with 10% humidity and 40°C air, evaporative cooling can reach about 21°C — a nearly 20°C drop. At 80% humidity the drop may be only 2-3°C.' },
      { question: 'Why do you feel cold stepping out of a pool?', answer: 'The thin film of water on your skin evaporates rapidly in air, absorbing latent heat from your skin at about 2,260 kJ per kg. Wind increases evaporation rate, amplifying the chill — this is the wind chill effect combined with evaporative cooling.' },
    ],
  },
  // ----------------------------------------------------------------
  // ELECTRICITY & MAGNETISM (additional)
  // ----------------------------------------------------------------
  {
    slug: 'faraday-cage',
    title: 'How Does a Faraday Cage Work?',
    shortAnswer:
      'A Faraday cage is a conductive enclosure that blocks external electric fields. When an external field is applied, free charges in the conductor redistribute to cancel the field inside, shielding the interior from electromagnetic radiation.',
    relatedGameSlugs: ['faraday-cage', 'eddy-currents', 'electromagnetic-induction'],
    category: 'electricity',
    steps: [
      { title: 'Charge Redistribution', explanation: 'When an external electric field reaches the conductive shell, free electrons in the metal move in response, accumulating on one side and leaving a deficit on the other. This charge separation creates an internal field that exactly cancels the external one inside the cage.' },
      { title: 'Electrostatic Shielding', explanation: 'In the static case, the interior field is exactly zero regardless of the external field strength. This is a consequence of Gauss\'s law: a conductor in equilibrium has zero internal electric field.' },
      { title: 'Electromagnetic Shielding', explanation: 'For time-varying fields (radio waves, microwaves), the cage works by inducing currents in the conductor that generate opposing fields. Effectiveness depends on the skin depth of the conductor and the mesh size relative to wavelength.' },
      { title: 'Mesh and Gap Considerations', explanation: 'A solid conductor provides perfect shielding, but a mesh works as long as hole size is much smaller than the wavelength. A microwave oven door mesh blocks 12 cm microwaves with 1 mm holes. Gaps and seams degrade shielding at high frequencies.' },
    ],
    realWorldApps: [
      'Microwave oven door mesh preventing radiation leakage',
      'MRI rooms shielded from external radio interference',
      'Lightning protection for aircraft (aluminum fuselage acts as a cage)',
      'EMI shielding enclosures for sensitive electronics',
    ],
    faqItems: [
      { question: 'Why does my phone lose signal inside an elevator?', answer: 'The metal elevator car acts as a Faraday cage, blocking cellular radio waves (wavelength ~15-30 cm). Small gaps around the doors may allow some signal through, but shielding is substantial.' },
      { question: 'Can a Faraday cage protect against lightning?', answer: 'Yes. A car\'s metal body acts as a Faraday cage during a lightning strike. The current flows around the outside of the conductor, and the interior field remains near zero. The occupants are safe as long as they don\'t touch the metal shell.' },
      { question: 'Does a Faraday cage block all frequencies equally?', answer: 'No. A mesh cage blocks wavelengths much larger than the mesh opening but becomes transparent to shorter wavelengths. A solid cage blocks all frequencies, but skin depth decreases shielding effectiveness for very low frequencies in thin conductors.' },
    ],
  },
  // ----------------------------------------------------------------
  // THERMAL MANAGEMENT
  // ----------------------------------------------------------------
  {
    slug: 'heat-sink',
    title: 'How Does a Heat Sink Work?',
    shortAnswer:
      'A heat sink is a passive thermal management device that absorbs heat from a component and dissipates it into the surrounding air through conduction and convection. Its extended fin structure dramatically increases the surface area available for heat transfer.',
    relatedGameSlugs: ['heat-sink-design', 'thermal-conductivity', 'convection'],
    category: 'thermodynamics',
    steps: [
      { title: 'Thermal Conduction from Source', explanation: 'Heat flows by conduction from the hot component (e.g., CPU die) through thermal interface material (paste or pad) into the heat sink base. The base is made of high-conductivity material, typically aluminum (205 W/mK) or copper (400 W/mK).' },
      { title: 'Spreading Through the Base', explanation: 'The heat spreads laterally through the base plate from the small contact area to the full footprint of the heat sink. Copper\'s higher conductivity reduces the spreading resistance, which is why premium heat sinks use copper bases.' },
      { title: 'Fin Array Convection', explanation: 'Thin fins extend upward from the base, providing a large surface area exposed to air. Heat conducted to the fin surfaces transfers to the passing air by convection. The thermal resistance depends on fin geometry, spacing, and airflow.' },
      { title: 'Natural vs Forced Convection', explanation: 'In passive cooling, hot air rises naturally (natural convection). Adding a fan (forced convection) dramatically increases heat transfer by 5-10x, maintaining a larger temperature difference between fins and air.' },
    ],
    realWorldApps: [
      'CPU and GPU cooling in computers',
      'LED lighting thermal management',
      'Power electronics and voltage regulators',
      'Automotive engine heat exchangers',
    ],
    faqItems: [
      { question: 'Why is thermal paste necessary between a CPU and heat sink?', answer: 'Even with a flat heat sink and CPU, microscopic surface roughness leaves tiny air gaps (air has thermal conductivity of only 0.025 W/mK). Thermal paste fills these gaps with a material that conducts 50-100x better than air, dramatically reducing contact resistance.' },
      { question: 'Is copper always better than aluminum for heat sinks?', answer: 'Copper conducts heat nearly twice as well as aluminum but is 3x heavier and more expensive. For large heat sinks, the weight penalty matters. Many designs use a copper base for spreading and aluminum fins for the array, combining both advantages.' },
      { question: 'Why do heat sink fins have specific spacing?', answer: 'Wider spacing allows more airflow but reduces surface area. Narrower spacing increases area but restricts airflow and creates a boundary layer overlap. The optimal spacing balances these effects and depends on whether cooling is natural or forced convection.' },
    ],
  },
  {
    slug: 'thermal-throttling',
    title: 'How Does Thermal Throttling Work?',
    shortAnswer:
      'Thermal throttling is a protective mechanism where a processor reduces its clock speed and voltage when its temperature exceeds a safe threshold. This reduces power dissipation to prevent permanent damage to the silicon, at the cost of reduced performance.',
    relatedGameSlugs: ['thermal-throttling', 'heat-sink-design', 'thermal-conductivity'],
    category: 'semiconductors',
    steps: [
      { title: 'Temperature Monitoring', explanation: 'Modern processors have multiple on-die thermal sensors (digital thermal diodes) that report junction temperature to the power management unit. Readings are sampled hundreds of times per second with accuracy of about 1°C.' },
      { title: 'Threshold Detection', explanation: 'Each processor has a T_junction_max specification (typically 100-110°C for modern CPUs). When any sensor approaches this limit, the throttling logic activates. Multiple thresholds allow graduated responses.' },
      { title: 'Clock and Voltage Reduction', explanation: 'The processor reduces its operating frequency and supply voltage using DVFS (Dynamic Voltage and Frequency Scaling). Since dynamic power scales as P = C*V^2*f, reducing both voltage and frequency yields a cubic reduction in power.' },
      { title: 'Feedback Loop', explanation: 'Throttling operates as a closed-loop control system. If temperature continues to rise, clock speed is reduced further. If temperature drops, speed is gradually restored. Extreme overheating triggers an emergency shutdown.' },
    ],
    realWorldApps: [
      'Laptop and smartphone processor protection during heavy workloads',
      'Data center server thermal management',
      'Gaming console performance regulation',
      'Electric vehicle battery management during fast charging',
    ],
    faqItems: [
      { question: 'Why does my laptop slow down when it gets hot?', answer: 'Your laptop\'s CPU is thermal throttling — intentionally reducing clock speed to lower heat output. This happens when the cooling system (fan and heat sink) cannot remove heat fast enough to keep the processor below its thermal limit, typically 100°C.' },
      { question: 'Does thermal throttling damage the processor?', answer: 'No, thermal throttling prevents damage. It is a protection mechanism that activates well before temperatures reach destructive levels. Sustained operation at the throttling threshold reduces performance but not processor lifespan.' },
      { question: 'How can I prevent thermal throttling?', answer: 'Improve cooling: clean dust from vents and fans, replace dried thermal paste, use a laptop cooling pad, or ensure adequate airflow in a desktop case. Undervolting the CPU can also reduce heat without sacrificing performance.' },
    ],
  },
  // ----------------------------------------------------------------
  // POWER ELECTRONICS
  // ----------------------------------------------------------------
  {
    slug: 'solar-inverter',
    title: 'How Does a Solar Inverter Work?',
    shortAnswer:
      'A solar inverter converts the direct current (DC) output from solar panels into alternating current (AC) compatible with the electrical grid and household appliances. It uses high-speed switching transistors and filtering to synthesize a clean sinusoidal waveform.',
    relatedGameSlugs: ['solar-inverter', 'mosfet-switching', 'solar-cell'],
    category: 'solar',
    steps: [
      { title: 'DC Input from Solar Panels', explanation: 'Solar panels produce DC at a voltage that varies with sunlight intensity and temperature (typically 30-50V per panel, 300-600V for a string). The inverter\'s MPPT stage adjusts the operating point to extract maximum power.' },
      { title: 'DC-to-DC Conversion (Boost Stage)', explanation: 'A boost converter raises the variable panel voltage to a stable, higher DC bus voltage (typically 350-400V for single-phase or 600-800V for three-phase). This provides the headroom needed to synthesize AC output.' },
      { title: 'DC-to-AC Inversion (H-Bridge)', explanation: 'An H-bridge of MOSFETs or IGBTs switches the DC bus voltage at high frequency (typically 10-50 kHz) using pulse-width modulation (PWM). By varying the pulse widths, the average output approximates a sinusoidal waveform.' },
      { title: 'Output Filtering and Grid Synchronization', explanation: 'An LC filter smooths the PWM output into a clean sine wave. The inverter synchronizes its output frequency, phase, and voltage to the grid using a phase-locked loop (PLL), enabling safe parallel operation.' },
      { title: 'Anti-Islanding Protection', explanation: 'If the grid goes down, the inverter must shut off within milliseconds to prevent energizing dead lines (islanding), which would endanger utility workers. This is a critical safety requirement in all grid-tied inverters.' },
    ],
    realWorldApps: [
      'Residential rooftop solar power systems',
      'Utility-scale solar farms feeding the power grid',
      'Battery storage systems requiring bidirectional DC-AC conversion',
      'Solar-powered water pumping in agriculture',
    ],
    faqItems: [
      { question: 'What is the difference between string inverters and microinverters?', answer: 'String inverters connect to a series string of panels and convert all their DC output centrally. Microinverters are mounted on each panel individually, converting DC to AC at the source. Microinverters handle partial shading better but cost more.' },
      { question: 'Why do solar inverters have MPPT?', answer: 'Solar panel output varies with sunlight and temperature. The maximum power point tracker continuously adjusts the operating voltage to keep the panels at their peak power output, typically recovering 20-30% more energy than a fixed voltage system.' },
      { question: 'How efficient are modern solar inverters?', answer: 'Modern inverters achieve 96-99% efficiency (weighted CEC efficiency). The main losses are switching losses in the transistors, conduction losses, and magnetic losses in the filter inductors. Even 1% efficiency improvement matters at utility scale.' },
    ],
  },
  {
    slug: 'ups-system',
    title: 'How Does a UPS Work?',
    shortAnswer:
      'An uninterruptible power supply (UPS) provides emergency power during mains outages by storing energy in batteries and instantly switching to battery-powered AC output. It protects equipment from power interruptions, surges, and brownouts.',
    relatedGameSlugs: ['ups-system', 'series-parallel-circuits', 'capacitor-charging'],
    category: 'electricity',
    steps: [
      { title: 'Normal Mode (Charging)', explanation: 'During normal operation, mains AC power passes through to the load while simultaneously charging the battery bank via a rectifier/charger circuit. The battery is kept at full charge, ready for an outage.' },
      { title: 'Outage Detection', explanation: 'Voltage monitoring circuits detect when mains power drops below a threshold (typically 80% of nominal). In online UPS designs, the switch to battery is seamless; in standby designs, a transfer switch activates within 5-12 milliseconds.' },
      { title: 'Battery Discharge and Inversion', explanation: 'The battery provides DC power to an inverter that synthesizes AC output at the correct voltage and frequency. Runtime depends on battery capacity and load: a typical 1500VA UPS provides 5-15 minutes at full load.' },
      { title: 'Return to Mains', explanation: 'When mains power returns and stabilizes, the UPS transfers the load back to mains and begins recharging the battery. The transfer is automatic and designed to be seamless to connected equipment.' },
    ],
    realWorldApps: [
      'Data center power protection preventing server downtime',
      'Hospital critical equipment backup power',
      'Home office computer and networking equipment protection',
      'Industrial process control systems requiring clean power',
    ],
    faqItems: [
      { question: 'What is the difference between online and standby UPS?', answer: 'A standby (offline) UPS passes mains power directly and switches to battery on outage (5-12 ms gap). An online (double-conversion) UPS continuously converts AC to DC to AC, providing zero transfer time and perfect output regardless of input quality.' },
      { question: 'How long does a UPS battery last?', answer: 'Runtime depends on load and battery size. A typical 1500VA UPS runs a desktop PC for 5-15 minutes — enough for safe shutdown. Battery lifespan is 3-5 years before capacity degrades enough to need replacement.' },
      { question: 'Does a UPS protect against lightning?', answer: 'Most UPS units include basic surge protection (MOVs), but a direct lightning strike can overwhelm this. For lightning-prone areas, a dedicated whole-house surge protector at the electrical panel provides better primary protection.' },
    ],
  },
  {
    slug: 'esd-protection',
    title: 'How Does ESD Protection Work?',
    shortAnswer:
      'Electrostatic discharge (ESD) protection uses specialized circuits and materials to safely divert sudden high-voltage static electricity spikes away from sensitive electronic components. Protection devices clamp voltage and shunt current to ground before damage occurs.',
    relatedGameSlugs: ['esd-protection', 'capacitor-charging', 'faraday-cage'],
    category: 'semiconductors',
    steps: [
      { title: 'Static Charge Buildup', explanation: 'Triboelectric charging occurs when two materials contact and separate, transferring electrons. A person walking on carpet can accumulate 10,000-25,000 volts. Sensitive MOSFET gates can be destroyed by as little as 10-100 volts.' },
      { title: 'ESD Event', explanation: 'When a charged object contacts a circuit, the stored charge discharges in nanoseconds with peak currents of several amperes. This energy can melt bond wires, punch through gate oxides, or create latent damage that causes later failure.' },
      { title: 'Clamping and Shunting', explanation: 'ESD protection devices (TVS diodes, Zener diodes, or on-chip protection circuits) activate when voltage exceeds a threshold, clamping the voltage and diverting current to ground. They respond in sub-nanosecond timescales.' },
      { title: 'Prevention Strategies', explanation: 'Beyond circuit protection, ESD prevention includes grounding wrist straps, conductive workstation mats, humidity control (higher humidity reduces charge buildup), and antistatic packaging for sensitive components.' },
    ],
    realWorldApps: [
      'Semiconductor manufacturing cleanroom protocols',
      'USB and HDMI port protection in consumer electronics',
      'Automotive electronics surviving harsh static environments',
      'Data center equipment handling and installation procedures',
    ],
    faqItems: [
      { question: 'Why are some components more sensitive to ESD than others?', answer: 'MOSFET gates have extremely thin oxide layers (1-5 nm) that can be punctured by even moderate voltages. Bipolar transistors are more robust because current flows through bulk silicon. Components with finer geometries are generally more vulnerable.' },
      { question: 'Can ESD damage be invisible?', answer: 'Yes. Latent ESD damage weakens a component without causing immediate failure. The degraded device may work initially but fail prematurely in the field. This makes ESD damage particularly costly because it creates reliability problems that are hard to trace.' },
      { question: 'Why do ESD bags have that metallic appearance?', answer: 'ESD bags use a metallized layer that acts as a Faraday cage, shielding contents from external static fields. The inner dissipative layer prevents charge accumulation on the bag surface. Together they prevent both direct discharge and field-induced damage.' },
    ],
  },
  // ----------------------------------------------------------------
  // SEMICONDUCTOR FABRICATION
  // ----------------------------------------------------------------
  {
    slug: 'doping-semiconductors',
    title: 'How Does Semiconductor Doping Work?',
    shortAnswer:
      'Doping is the intentional introduction of impurity atoms into a pure semiconductor crystal to control its electrical conductivity. Adding atoms with extra electrons (n-type) or missing electrons (p-type) creates free charge carriers that enable transistors, diodes, and solar cells.',
    relatedGameSlugs: ['doping-semiconductors', 'mosfet-switching', 'solar-cell'],
    category: 'semiconductors',
    steps: [
      { title: 'Intrinsic Semiconductor', explanation: 'Pure silicon has 4 valence electrons forming covalent bonds with neighbors. At room temperature, thermal energy frees a few electrons, creating sparse electron-hole pairs. Intrinsic silicon is a poor conductor (~1500 ohm-cm resistivity).' },
      { title: 'N-Type Doping', explanation: 'Adding group V elements (phosphorus, arsenic) with 5 valence electrons provides one extra electron per dopant atom. At typical doping levels (10^15 to 10^18 atoms/cm^3), resistivity drops to 0.01-10 ohm-cm. Electrons are the majority carriers.' },
      { title: 'P-Type Doping', explanation: 'Adding group III elements (boron, gallium) with 3 valence electrons creates one "hole" (missing electron) per dopant atom. Holes act as positive charge carriers. The material conducts via hole migration through the crystal lattice.' },
      { title: 'P-N Junction Formation', explanation: 'When p-type and n-type regions meet, electrons diffuse into the p-side and holes into the n-side, creating a depletion zone with a built-in electric field. This junction is the basis of diodes, transistors, and solar cells.' },
      { title: 'Ion Implantation', explanation: 'Modern doping uses ion implantation: dopant ions are accelerated to 10-500 keV and shot into the silicon surface. Dose and energy precisely control the concentration and depth profile. Annealing at 900-1100°C repairs crystal damage.' },
    ],
    realWorldApps: [
      'Transistor fabrication in all integrated circuits',
      'Solar cell p-n junction creation for photovoltaic power',
      'LED manufacturing using compound semiconductor doping',
      'Sensor fabrication for photodetectors and radiation detectors',
    ],
    faqItems: [
      { question: 'How many dopant atoms are needed?', answer: 'Silicon has about 5x10^22 atoms/cm^3. Typical doping levels of 10^15-10^18 atoms/cm^3 mean only about 1 in 10,000 to 1 in 10 million atoms is a dopant. This tiny fraction is enough to increase conductivity by factors of 10,000 or more.' },
      { question: 'Why is silicon the most common semiconductor?', answer: 'Silicon is abundant (second most common element in Earth\'s crust), has a convenient bandgap (1.12 eV), forms an excellent native oxide (SiO2) for insulation, and can be purified to 99.999999999% (eleven nines) purity at reasonable cost.' },
      { question: 'What happens if you dope too much?', answer: 'Excessive doping (degenerate doping, above ~10^19/cm^3) causes the semiconductor to behave more like a metal. The bandgap effectively narrows, carrier mobility decreases due to impurity scattering, and the material loses its useful semiconducting properties.' },
    ],
  },
  {
    slug: 'etching-process',
    title: 'How Does Chip Etching Work?',
    shortAnswer:
      'Chip etching selectively removes material from a semiconductor wafer to create the intricate patterns of transistors and interconnects. Plasma-based dry etching uses reactive ions to achieve nanometer-precision vertical cuts, while wet etching uses chemical solutions for less critical features.',
    relatedGameSlugs: ['etching-process', 'photolithography', 'mosfet-switching'],
    category: 'semiconductors',
    steps: [
      { title: 'Pattern Transfer from Photoresist', explanation: 'Photolithography first creates a pattern in photoresist on the wafer surface. The resist serves as a mask during etching: areas covered by resist are protected, while exposed areas are etched away.' },
      { title: 'Dry (Plasma) Etching', explanation: 'Reactive Ion Etching (RIE) generates a plasma of reactive gases (e.g., CF4, Cl2, SF6). Ions are accelerated toward the wafer surface, where they chemically react with and physically sputter the exposed material, achieving highly anisotropic (vertical) etching.' },
      { title: 'Selectivity and Etch Stop', explanation: 'The etch chemistry must remove the target material much faster than the underlying layer or the photoresist mask. Selectivity ratios of 10:1 to 100:1 are typical. Etch stop layers of different materials provide precise depth control.' },
      { title: 'Profile Control', explanation: 'By tuning gas composition, pressure, power, and temperature, engineers control the etch profile from perfectly vertical (anisotropic) to rounded (isotropic). Sidewall passivation gases deposit protective films on vertical surfaces to prevent lateral etching.' },
      { title: 'Post-Etch Cleaning', explanation: 'After etching, polymer residues and damaged surface layers must be removed. Oxygen plasma ashing strips remaining photoresist, and wet chemical cleaning removes residues that could degrade device performance.' },
    ],
    realWorldApps: [
      'Transistor gate patterning in CPU and GPU fabrication',
      'MEMS device fabrication (accelerometers, pressure sensors)',
      'Fiber optic component manufacturing',
      'Hard drive read/write head fabrication',
    ],
    faqItems: [
      { question: 'What is the difference between wet and dry etching?', answer: 'Wet etching uses liquid chemicals and is isotropic (etches equally in all directions), limiting resolution. Dry (plasma) etching uses reactive ions and can be highly anisotropic, cutting straight down. Modern chips require dry etching for features below ~1 micrometer.' },
      { question: 'How small can etching features be?', answer: 'State-of-the-art dry etching achieves features below 5 nm with atomic-level precision. Atomic Layer Etching (ALE) removes material one atomic layer at a time, providing sub-angstrom depth control.' },
      { question: 'Why is etching so difficult for advanced nodes?', answer: 'At 3-5 nm nodes, features are only 10-20 atoms wide. Etching must be perfectly uniform across a 300mm wafer, with no variation in depth, width, or profile. Even single-atom irregularities can affect device performance.' },
    ],
  },
  {
    slug: 'cmp-process',
    title: 'How Does CMP Work?',
    shortAnswer:
      'Chemical Mechanical Planarization (CMP) uses a combination of chemical etching and mechanical abrasion to flatten and smooth wafer surfaces during semiconductor fabrication. A rotating pad with a chemically reactive slurry removes high spots, achieving angstrom-level flatness.',
    relatedGameSlugs: ['cmp-process', 'photolithography', 'etching-process'],
    category: 'semiconductors',
    steps: [
      { title: 'The Planarization Problem', explanation: 'After depositing layers of metal and insulator, the wafer surface becomes uneven with height variations of hundreds of nanometers. Photolithography requires extreme flatness (within the depth of focus), so each layer must be planarized.' },
      { title: 'Chemical Action', explanation: 'The CMP slurry contains chemical agents that soften or oxidize the wafer surface material. For copper CMP, an oxidizer converts surface copper to softer copper oxide. For oxide CMP, the slurry pH is tuned to weaken the silica surface.' },
      { title: 'Mechanical Abrasion', explanation: 'The wafer is pressed face-down against a rotating polyurethane pad while slurry flows between them. Abrasive particles in the slurry (typically silica or ceria, 50-200 nm diameter) physically remove the chemically weakened surface material.' },
      { title: 'Selective Removal', explanation: 'High spots on the wafer experience more pressure and contact, so they are removed faster than low spots. This differential removal rate is what achieves planarization. The process self-terminates as the surface becomes flat.' },
      { title: 'Endpoint Detection', explanation: 'Optical or electrical sensors monitor the wafer surface in real-time to detect when the target thickness is reached. Over-polishing wastes material; under-polishing leaves surface topography that degrades lithography.' },
    ],
    realWorldApps: [
      'Copper interconnect planarization in every modern processor',
      'Shallow trench isolation (STI) for transistor separation',
      'Back-end-of-line (BEOL) dielectric planarization',
      'Advanced packaging wafer thinning and bonding surface preparation',
    ],
    faqItems: [
      { question: 'Why can\'t we just use etching instead of CMP?', answer: 'Etching removes material uniformly from the entire surface, preserving topography rather than flattening it. CMP preferentially removes high spots because they experience more pressure, making it unique in its ability to achieve global planarization.' },
      { question: 'How flat does CMP make a wafer?', answer: 'CMP achieves surface roughness below 0.5 nm RMS (root mean square) — smoother than a few atomic layers. Global planarity across the 300mm wafer is within a few tens of nanometers.' },
      { question: 'What are CMP slurries made of?', answer: 'CMP slurries contain abrasive particles (silica, ceria, or alumina), chemical agents (oxidizers, pH buffers, complexing agents), and surfactants, all in deionized water. Different materials (copper, tungsten, oxide) require completely different slurry formulations.' },
    ],
  },
  {
    slug: 'chiplet-design',
    title: 'How Do Chiplets Work?',
    shortAnswer:
      'Chiplets are small, modular semiconductor dies that are interconnected within a single package to function as one processor. Instead of building one massive monolithic chip, multiple smaller chips are manufactured separately and linked together, improving yield, enabling mix-and-match designs, and reducing costs.',
    relatedGameSlugs: ['chiplet-design', 'mosfet-switching', 'photolithography'],
    category: 'semiconductors',
    steps: [
      { title: 'The Monolithic Scaling Problem', explanation: 'As chips grow larger, the probability of a defect killing the die increases exponentially. A 800 mm^2 chip at 5nm might have only 20-30% yield, while four 200 mm^2 chiplets could each achieve 80%+ yield, dramatically reducing cost.' },
      { title: 'Die-to-Die Interconnect', explanation: 'Chiplets communicate through high-bandwidth, low-latency interconnects. Technologies include silicon interposers (2.5D), direct die-to-die bonding (3D), organic substrates, or embedded bridges (like Intel\'s EMIB) that provide thousands of connections.' },
      { title: 'Heterogeneous Integration', explanation: 'Different chiplets can use different process nodes. A CPU compute chiplet might use cutting-edge 3nm while the I/O chiplet uses cheaper 6nm. Memory, analog, and specialized accelerators each use their optimal process.' },
      { title: 'Standardization and Reuse', explanation: 'Chiplets enable a Lego-like approach to chip design. The same I/O chiplet can be paired with different numbers of compute chiplets to create product families. UCIe (Universal Chiplet Interconnect Express) is emerging as a standard interface.' },
    ],
    realWorldApps: [
      'AMD EPYC and Ryzen processors using compute and I/O chiplets',
      'Apple M-series Ultra chips bonding two dies together',
      'Intel Ponte Vecchio GPU with 47 active chiplets',
      'High-bandwidth memory (HBM) stacking DRAM on logic',
    ],
    faqItems: [
      { question: 'Why not just make one big chip?', answer: 'Defect density makes large chips expensive. If a wafer has 0.1 defects/cm^2, a 100 mm^2 die has ~63% yield but a 800 mm^2 die has ~0.03% yield. Chiplets achieve the same total silicon area with far better combined yield.' },
      { question: 'Do chiplets have performance penalties?', answer: 'Yes, die-to-die communication has higher latency (1-5 ns) and lower bandwidth per pin than on-die wires. But advanced packaging technologies are narrowing this gap, and careful architecture design minimizes the impact on real workloads.' },
      { question: 'What is the difference between 2.5D and 3D packaging?', answer: '2.5D places chiplets side-by-side on a silicon interposer that provides interconnect. 3D stacks chiplets vertically with through-silicon vias (TSVs) connecting layers. 3D offers shorter connections but creates thermal challenges from stacked heat sources.' },
    ],
  },
  // ----------------------------------------------------------------
  // AI & COMPUTING
  // ----------------------------------------------------------------
  {
    slug: 'kv-cache',
    title: 'How Does KV Cache Work?',
    shortAnswer:
      'KV (Key-Value) cache stores the previously computed attention key and value tensors during autoregressive text generation in transformer models. By caching these tensors, each new token only requires computing attention for one position instead of recomputing the entire sequence, reducing generation time from quadratic to linear.',
    relatedGameSlugs: ['kv-cache', 'neural-network-inference', 'gpu-memory-bandwidth'],
    category: 'ai',
    steps: [
      { title: 'Transformer Attention Mechanism', explanation: 'In a transformer, each token attends to all previous tokens by computing Query, Key, and Value matrices. The attention output is softmax(Q*K^T / sqrt(d_k)) * V. Without caching, generating token N requires recomputing all N rows of K and V.' },
      { title: 'Caching Keys and Values', explanation: 'During generation, the K and V matrices for all previous positions are stored in GPU memory. When generating the next token, only the new token\'s Q, K, and V vectors need to be computed. The new K and V are appended to the cache.' },
      { title: 'Memory-Compute Tradeoff', explanation: 'KV cache trades memory for computation. For a model with L layers, H heads, and dimension D, the cache for a sequence of length N requires 2 * L * H * D * N values. For large models (70B+ parameters) and long contexts (128K tokens), this can exceed 100 GB.' },
      { title: 'Optimization Techniques', explanation: 'Grouped Query Attention (GQA) shares K/V heads to reduce cache size. Paged attention (vLLM) manages cache memory like virtual memory pages. Quantizing the cache to FP8 or INT4 halves or quarters memory usage with minimal quality loss.' },
    ],
    realWorldApps: [
      'ChatGPT and other LLM chatbot inference serving',
      'Real-time code completion and suggestion engines',
      'Long-context document analysis and summarization',
      'Batch inference in data processing pipelines',
    ],
    faqItems: [
      { question: 'Why does KV cache matter for inference speed?', answer: 'Without KV cache, generating a sequence of N tokens requires O(N^2) total computation because each new token recomputes attention over all previous tokens. With KV cache, total computation is O(N), making long sequence generation practical.' },
      { question: 'Why does long context require so much GPU memory?', answer: 'KV cache grows linearly with sequence length. A 70B parameter model with 128K context and FP16 cache can require 80-160 GB just for the cache. This is often the bottleneck limiting context length, not the model weights themselves.' },
      { question: 'What is paged attention?', answer: 'Inspired by virtual memory paging in operating systems, paged attention (used in vLLM) allocates KV cache in fixed-size blocks rather than contiguous memory. This eliminates memory fragmentation and enables efficient batch processing of requests with different lengths.' },
    ],
  },
  {
    slug: 'quantization-ai',
    title: 'How Does AI Quantization Work?',
    shortAnswer:
      'AI quantization reduces the numerical precision of neural network weights and activations from 32-bit or 16-bit floating point to lower bit widths (8-bit, 4-bit, or even 2-bit). This shrinks model size, reduces memory bandwidth requirements, and accelerates inference with minimal accuracy loss.',
    relatedGameSlugs: ['quantization-ai', 'neural-network-inference', 'gpu-memory-bandwidth'],
    category: 'ai',
    steps: [
      { title: 'Full Precision Baseline', explanation: 'Neural networks are typically trained in FP32 or BF16 (16-bit brain float). A 70B parameter model in FP16 requires 140 GB of memory just for weights, exceeding the capacity of a single high-end GPU.' },
      { title: 'Mapping to Lower Precision', explanation: 'Quantization maps floating-point values to a reduced set of discrete levels. For INT8 quantization, values are scaled and rounded to 256 levels. For INT4, only 16 levels are used. The mapping can be linear (uniform) or non-linear (e.g., NF4 for normal distributions).' },
      { title: 'Calibration and Error Minimization', explanation: 'Post-training quantization (PTQ) uses a small calibration dataset to determine optimal scale factors that minimize quantization error. More advanced methods like GPTQ and AWQ selectively protect salient weights that have outsized impact on output quality.' },
      { title: 'Hardware Acceleration', explanation: 'Modern GPUs and NPUs have dedicated low-precision compute units. NVIDIA Tensor Cores compute INT8 at 2x the rate of FP16, and INT4 at 4x. This directly translates to faster inference when the model is quantized.' },
      { title: 'Quality-Efficiency Tradeoff', explanation: 'INT8 quantization typically preserves 99%+ of model quality. INT4 may lose 1-3% on benchmarks. 2-bit quantization shows noticeable degradation. The acceptable tradeoff depends on the application\'s quality requirements and hardware constraints.' },
    ],
    realWorldApps: [
      'Running large language models on consumer GPUs (GGUF format)',
      'Mobile AI inference on smartphones and edge devices',
      'Data center cost reduction for AI serving at scale',
      'Real-time AI applications requiring low-latency inference',
    ],
    faqItems: [
      { question: 'Does quantization require retraining the model?', answer: 'Not necessarily. Post-training quantization (PTQ) works on a pretrained model with a small calibration set. Quantization-aware training (QAT) inserts fake quantization during training for better results but requires the full training pipeline. Most practical deployments use PTQ.' },
      { question: 'Why does 4-bit quantization work so well for LLMs?', answer: 'LLM weight distributions are approximately Gaussian with most values near zero and few outliers. Non-uniform quantization formats like NF4 (Normal Float 4) allocate more representation levels near zero where most weights cluster, preserving the important information.' },
      { question: 'What is the difference between weight quantization and activation quantization?', answer: 'Weight quantization compresses the static model parameters, reducing storage and memory. Activation quantization also compresses the dynamic intermediate values during inference, further reducing memory bandwidth. Activation quantization is harder because activation distributions vary with input.' },
    ],
  },
  {
    slug: 'tensor-computation',
    title: 'How Does Tensor Computation Work?',
    shortAnswer:
      'Tensor computation performs mathematical operations on multi-dimensional arrays (tensors) that represent data in neural networks and scientific computing. GPUs and specialized hardware like TPUs accelerate these operations through massive parallelism, processing thousands of multiply-accumulate operations simultaneously.',
    relatedGameSlugs: ['tensor-computation', 'neural-network-inference', 'gpu-memory-bandwidth'],
    category: 'ai',
    steps: [
      { title: 'Tensors as Data Structures', explanation: 'A tensor is a multi-dimensional array: a scalar is rank-0, a vector is rank-1, a matrix is rank-2, and higher-rank tensors generalize further. Neural network layers operate on tensors: a batch of RGB images is a rank-4 tensor (batch, height, width, channels).' },
      { title: 'Matrix Multiplication as the Core Operation', explanation: 'Most neural network computation reduces to matrix multiplication (GEMM). A fully connected layer computes Y = X*W + b. Attention computes softmax(Q*K^T/sqrt(d))*V. Convolutions can be reshaped into matrix multiplications via im2col.' },
      { title: 'Parallelism on GPUs', explanation: 'A modern GPU has thousands of CUDA cores organized into streaming multiprocessors. Matrix multiplication is inherently parallel: each output element is an independent dot product. GPUs tile the matrices and compute many elements simultaneously.' },
      { title: 'Tensor Cores and Specialized Hardware', explanation: 'NVIDIA Tensor Cores perform 4x4 matrix multiply-accumulate in a single cycle, achieving 10-100x throughput over standard cores. Google TPUs have massive systolic arrays optimized for matrix multiplication. These accelerators make large-scale AI training and inference practical.' },
      { title: 'Memory Hierarchy Optimization', explanation: 'Tensor computation is often memory-bandwidth limited, not compute-limited. Data must flow from HBM through L2 cache to registers. Techniques like operator fusion, tiling, and flash attention minimize data movement to keep compute units fed.' },
    ],
    realWorldApps: [
      'Training and running large language models and image generators',
      'Scientific simulations (weather forecasting, molecular dynamics)',
      'Real-time graphics and ray tracing in games',
      'Financial modeling and risk analysis using matrix operations',
    ],
    faqItems: [
      { question: 'Why are GPUs better than CPUs for tensor computation?', answer: 'GPUs have thousands of simple cores optimized for parallel arithmetic, while CPUs have a few powerful cores optimized for sequential logic. Matrix multiplication is embarrassingly parallel, perfectly matching GPU architecture. A top GPU achieves 1000+ TFLOPS vs ~1 TFLOPS for a top CPU.' },
      { question: 'What is a Tensor Core?', answer: 'A Tensor Core is a specialized hardware unit in NVIDIA GPUs that computes a 4x4 matrix multiply-accumulate in a single clock cycle. It supports multiple precision formats (FP16, BF16, INT8, FP8) and provides the bulk of AI compute throughput.' },
      { question: 'What does it mean for AI to be memory-bandwidth limited?', answer: 'Modern GPUs can compute faster than they can feed data from memory. If a model has 70B parameters and each inference pass reads them once, that is 140 GB of data transfer at FP16. Even at 3 TB/s bandwidth (H100), just reading the weights takes ~47 ms, limiting tokens per second regardless of compute.' },
    ],
  },
  {
    slug: 'memory-bandwidth-ai',
    title: 'How Does Memory Bandwidth Limit AI?',
    shortAnswer:
      'Memory bandwidth is the rate at which data can be read from or written to GPU memory (HBM). For large AI models, inference speed is often limited not by computational power but by how fast model weights can be streamed from memory to the compute units, making bandwidth the primary bottleneck.',
    relatedGameSlugs: ['gpu-memory-bandwidth', 'neural-network-inference', 'kv-cache'],
    category: 'ai',
    steps: [
      { title: 'The Arithmetic Intensity Problem', explanation: 'Arithmetic intensity is the ratio of compute operations to memory accesses. Matrix multiplication has high intensity (O(n^3) ops / O(n^2) memory). But many AI operations (element-wise, attention, small batches) have low intensity, making them memory-bound.' },
      { title: 'Weight Loading Bottleneck', explanation: 'During autoregressive generation, each token requires reading all model weights from HBM. A 70B model at FP16 is 140 GB. At 3.35 TB/s (H100 HBM3), just loading the weights takes ~42 ms per token, limiting throughput to ~24 tokens/second regardless of compute capacity.' },
      { title: 'The Roofline Model', explanation: 'The roofline model plots achievable performance against arithmetic intensity. Below the "roofline," performance is bandwidth-limited. Above it, performance is compute-limited. Most LLM inference operations fall in the bandwidth-limited region.' },
      { title: 'Mitigation Strategies', explanation: 'Quantization (INT4, INT8) reduces the bytes per weight, directly increasing effective bandwidth. Batching amortizes weight loading across multiple requests. Model parallelism across GPUs multiplies available bandwidth. Speculative decoding generates multiple tokens per weight load.' },
    ],
    realWorldApps: [
      'LLM serving infrastructure design and GPU selection',
      'Determining optimal batch sizes for AI inference',
      'Cost-performance analysis for AI hardware purchasing',
      'Designing custom AI accelerators with HBM configurations',
    ],
    faqItems: [
      { question: 'Why do AI chips need HBM instead of regular DRAM?', answer: 'High Bandwidth Memory (HBM) stacks multiple DRAM dies vertically with thousands of through-silicon vias (TSVs), providing 3-6x the bandwidth of GDDR6. An H100 GPU achieves 3.35 TB/s with HBM3, versus ~1 TB/s for GDDR6-based designs. This bandwidth directly determines AI inference speed.' },
      { question: 'Does buying a GPU with more TFLOPS make AI faster?', answer: 'Not necessarily. If your workload is memory-bandwidth limited (most LLM inference is), more compute power sits idle waiting for data. A GPU with 50% more TFLOPS but the same bandwidth will show minimal speedup. Bandwidth, not FLOPS, is usually the metric that matters for inference.' },
      { question: 'How does batching help with memory bandwidth?', answer: 'When processing a batch of B requests, the model weights are loaded once and reused for all B inputs. This increases arithmetic intensity by factor B, shifting from bandwidth-limited to compute-limited. Batch size is limited by the GPU memory available for activations and KV cache.' },
    ],
  },
  // ----------------------------------------------------------------
  // SOLAR (additional)
  // ----------------------------------------------------------------
  {
    slug: 'bypass-diode',
    title: 'How Does a Bypass Diode Work?',
    shortAnswer:
      'A bypass diode is connected in reverse-parallel across a solar cell or panel to provide an alternative current path when the cell is shaded or damaged. Without it, a shaded cell becomes a resistive load that dissipates power as heat and can cause hot spots.',
    relatedGameSlugs: ['bypass-diode', 'solar-cell', 'series-parallel-circuits'],
    category: 'solar',
    steps: [
      { title: 'Series String Problem', explanation: 'Solar cells in series must all carry the same current. If one cell is shaded and cannot produce the string current, it becomes reverse-biased and dissipates power as heat instead of generating it.' },
      { title: 'Bypass Diode Activation', explanation: 'The bypass diode is connected with its anode on the negative terminal and cathode on the positive terminal of the cell. When the cell is shaded and reverse-biased beyond about 0.4-0.7V, the diode forward-conducts, carrying the string current around the shaded cell.' },
      { title: 'Hot Spot Prevention', explanation: 'Without the bypass diode, a shaded cell in a 20-cell string can dissipate the full string power (potentially hundreds of watts) in a small area. The diode limits reverse voltage to about 0.7V, reducing dissipation to a safe level.' },
      { title: 'Partial Shading Performance', explanation: 'With bypass diodes, a partially shaded panel loses only the output of the shaded section rather than the entire panel. Modern panels typically have 3 bypass diodes covering substrings of 20-24 cells each.' },
    ],
    realWorldApps: [
      'Residential and commercial solar panel protection',
      'Solar arrays on satellites and space stations',
      'Portable solar chargers for camping and hiking',
      'Solar-powered vehicle charging systems',
    ],
    faqItems: [
      { question: 'How many bypass diodes does a typical solar panel have?', answer: 'Most 60-cell or 72-cell residential panels have 3 bypass diodes, each protecting a substring of 20-24 cells. Some newer panels use cell-level optimization with more diodes for finer granularity.' },
      { question: 'Do bypass diodes reduce power output?', answer: 'When active, a bypass diode carries the full string current at about 0.4-0.7V forward drop, dissipating a small amount of power. But this is vastly less than the power that would be lost without the diode due to the shaded cell dragging down the entire string.' },
      { question: 'What is the difference between bypass diodes and blocking diodes?', answer: 'Bypass diodes route current around a shaded cell within a string. Blocking diodes (connected in series with a string) prevent reverse current from flowing into a string at night or when one parallel string underperforms. They serve opposite protective functions.' },
    ],
  },
  {
    slug: 'fill-factor-solar',
    title: 'How Does Fill Factor Affect Solar Panels?',
    shortAnswer:
      'Fill factor (FF) is the ratio of a solar cell\'s maximum power output to the product of its open-circuit voltage and short-circuit current. It measures how closely the cell\'s current-voltage curve approaches an ideal rectangle, with higher fill factors indicating lower resistive and recombination losses.',
    relatedGameSlugs: ['fill-factor', 'solar-cell', 'mppt'],
    category: 'solar',
    steps: [
      { title: 'I-V Curve Shape', explanation: 'A solar cell\'s current vs voltage curve starts at the short-circuit current (I_sc) and drops to zero at the open-circuit voltage (V_oc). The shape of this curve determines how much power can be extracted.' },
      { title: 'Maximum Power Point', explanation: 'The maximum power point (MPP) is the voltage-current pair that maximizes P = I * V. This occurs at the knee of the I-V curve. The fill factor is FF = (V_mpp * I_mpp) / (V_oc * I_sc).' },
      { title: 'Loss Mechanisms', explanation: 'Series resistance (contact resistance, bulk resistance) reduces FF by causing voltage drops at high current. Shunt resistance (defects creating leakage paths) reduces FF by allowing current to bypass the junction. Recombination losses also degrade FF.' },
      { title: 'Practical Values', explanation: 'Crystalline silicon cells achieve FF of 0.75-0.85. Thin-film cells typically reach 0.60-0.70. The theoretical maximum depends on the bandgap and temperature. Higher FF directly translates to higher efficiency for given V_oc and I_sc.' },
    ],
    realWorldApps: [
      'Solar cell quality control during manufacturing',
      'MPPT algorithm optimization for maximum energy harvest',
      'Comparing different solar cell technologies and materials',
      'Diagnosing degradation in installed solar panels',
    ],
    faqItems: [
      { question: 'What is a good fill factor for a solar panel?', answer: 'Commercial crystalline silicon panels typically have fill factors of 0.75-0.82. High-efficiency cells from companies like SunPower achieve 0.83-0.85. Values below 0.70 suggest significant resistive losses or defects.' },
      { question: 'How does temperature affect fill factor?', answer: 'Higher temperature increases recombination and decreases V_oc, which typically reduces fill factor by about 0.1-0.2% per degree Celsius. This is one reason solar panels perform better in cool, sunny conditions than in hot climates.' },
      { question: 'Can fill factor exceed 1?', answer: 'No. A fill factor of 1 would mean the I-V curve is a perfect rectangle, which is physically impossible due to the exponential nature of diode behavior. Even ideal diodes with zero resistance have FF around 0.89 for silicon.' },
    ],
  },
  // ----------------------------------------------------------------
  // THERMODYNAMICS & HEAT TRANSFER (additional)
  // ----------------------------------------------------------------
  {
    slug: 'convection-heat',
    title: 'How Does Convection Work?',
    shortAnswer:
      'Convection is heat transfer through the bulk movement of a fluid (liquid or gas). Hot fluid rises because it is less dense, while cooler fluid sinks, creating circulation patterns that transport thermal energy far more effectively than conduction alone.',
    relatedGameSlugs: ['convection', 'heat-sink-design', 'thermal-conductivity'],
    category: 'thermodynamics',
    steps: [
      { title: 'Buoyancy-Driven Flow', explanation: 'Heating a fluid decreases its density. In a gravitational field, the lighter hot fluid rises while denser cold fluid sinks, creating convection currents. This natural convection requires no external pump or fan.' },
      { title: 'Boundary Layer Formation', explanation: 'Near a hot surface, a thin thermal boundary layer forms where the fluid temperature transitions from the surface temperature to the bulk temperature. The thickness of this layer controls the rate of heat transfer.' },
      { title: 'Newton\'s Law of Cooling', explanation: 'The convective heat flux is q = h * (T_surface - T_fluid), where h is the convection coefficient. For natural convection in air, h is typically 5-25 W/(m^2*K); for forced convection, 25-250 W/(m^2*K).' },
      { title: 'Forced Convection Enhancement', explanation: 'Fans, pumps, or wind create forced convection that thins the boundary layer and increases h by 10-100x compared to natural convection. Turbulent flow further enhances mixing and heat transfer.' },
      { title: 'Convection Cells', explanation: 'In enclosed or large-scale systems, convection organizes into cells (Rayleigh-Benard cells). These are seen in boiling water, atmospheric weather patterns, and mantle convection driving plate tectonics.' },
    ],
    realWorldApps: [
      'Home heating systems using radiators and warm air circulation',
      'Weather patterns and atmospheric circulation cells',
      'Ocean current circulation distributing global heat',
      'Cooling towers at power plants using natural draft convection',
    ],
    faqItems: [
      { question: 'Why does hot air rise?', answer: 'Heating air causes it to expand and become less dense than the surrounding cooler air. Buoyancy (Archimedes\' principle in a fluid) pushes the lighter air upward, just as a helium balloon rises. The hot air doesn\'t inherently "want" to go up; it is pushed by the heavier cold air around it.' },
      { question: 'What is the difference between convection and conduction?', answer: 'Conduction transfers heat through molecular vibrations without bulk material movement (e.g., heat traveling through a metal bar). Convection transfers heat by physically moving heated fluid from one place to another, which is typically much faster.' },
      { question: 'Does convection work in space?', answer: 'Natural convection requires gravity to create buoyancy-driven flow. In microgravity (e.g., on the ISS), there is no natural convection, which is why cooling electronics in space requires forced convection with fans or liquid cooling loops.' },
    ],
  },
  // ----------------------------------------------------------------
  // MECHANICS (additional)
  // ----------------------------------------------------------------
  {
    slug: 'angular-momentum',
    title: 'How Does Angular Momentum Conservation Work?',
    shortAnswer:
      'The law of conservation of angular momentum states that the total angular momentum of a system remains constant when no external torque acts on it. When a spinning object reduces its moment of inertia, it must spin faster to keep L = I * omega constant.',
    relatedGameSlugs: ['angular-momentum', 'gyroscope-stability', 'gyroscopic-precession'],
    category: 'mechanics',
    steps: [
      { title: 'Angular Momentum Defined', explanation: 'Angular momentum L = I * omega for a rigid body, where I is the moment of inertia (distribution of mass about the axis) and omega is the angular velocity. For a point particle, L = r x p (cross product of position and linear momentum).' },
      { title: 'No External Torque Condition', explanation: 'Conservation applies when the net external torque is zero: dL/dt = tau_net = 0. Internal forces and torques can redistribute angular momentum between parts of a system, but the total remains constant.' },
      { title: 'Moment of Inertia Changes', explanation: 'When a spinning body changes shape (changing I), omega must adjust to keep L constant. Pulling mass inward decreases I and increases omega. This is why an ice skater spins faster when pulling in their arms.' },
      { title: 'Vector Nature', explanation: 'Angular momentum is a vector quantity — both magnitude and direction are conserved. This is why a spinning gyroscope maintains its orientation in space and why planets maintain their orbital planes.' },
    ],
    realWorldApps: [
      'Figure skating spins (arms in = faster, arms out = slower)',
      'Spacecraft attitude control using reaction wheels',
      'Earth\'s constant rotation and the stability of its axis tilt',
      'Helicopter tail rotors counteracting body rotation',
    ],
    faqItems: [
      { question: 'Why does an ice skater spin faster when pulling in their arms?', answer: 'The skater\'s angular momentum L = I*omega is conserved (ice friction provides negligible torque). Pulling arms inward reduces moment of inertia I by perhaps 3x. To keep L constant, omega must increase by the same factor, tripling the spin rate.' },
      { question: 'Is angular momentum always conserved?', answer: 'Only when no net external torque acts on the system. Friction, gravity (if off-center), and applied forces can exert torques that change angular momentum. But for an isolated system, conservation is absolute — it is one of the fundamental conservation laws.' },
      { question: 'How do cats always land on their feet?', answer: 'Cats use differential rotation: they twist their front and back halves in sequence while changing their moment of inertia. By extending or tucking legs asymmetrically, they can rotate their body without any external torque, exploiting the vector nature of angular momentum conservation.' },
    ],
  },
  {
    slug: 'centripetal-force',
    title: 'How Does Centripetal Force Work?',
    shortAnswer:
      'Centripetal force is the inward-directed force that keeps an object moving in a circular path. It is not a new type of force but rather the net inward force (gravity, tension, friction, or normal force) that continuously deflects an object\'s velocity toward the center of the circle.',
    relatedGameSlugs: ['centripetal-force', 'orbital-mechanics', 'coriolis-effect'],
    category: 'mechanics',
    steps: [
      { title: 'Circular Motion Requires Acceleration', explanation: 'An object moving in a circle at constant speed is continuously changing direction, which means it is accelerating. This centripetal acceleration a = v^2/r points toward the center of the circle.' },
      { title: 'Newton\'s Second Law', explanation: 'By F = ma, the centripetal acceleration requires a net inward force: F_c = m*v^2/r = m*omega^2*r. This force must be provided by something physical — tension, gravity, friction, or a normal force.' },
      { title: 'What Provides the Force', explanation: 'For a ball on a string: tension. For a planet orbiting the Sun: gravity. For a car turning: friction between tires and road. For a roller coaster loop: the combination of normal force and gravity. The nature of the force depends on the situation.' },
      { title: 'Centrifugal "Force" in the Rotating Frame', explanation: 'In a rotating reference frame, objects appear to be pushed outward by a fictitious centrifugal force. This is not a real force but an artifact of the non-inertial frame. In the inertial frame, the object simply follows Newton\'s laws with the real centripetal force.' },
    ],
    realWorldApps: [
      'Banked road curves designed for safe vehicle turning',
      'Centrifuges separating blood components or enriching uranium',
      'Satellite orbital mechanics where gravity provides centripetal force',
      'Washing machine spin cycles using centripetal acceleration for water extraction',
    ],
    faqItems: [
      { question: 'Is centrifugal force real?', answer: 'In an inertial (non-rotating) reference frame, centrifugal force does not exist — there is only the centripetal force pulling inward. In a rotating reference frame, centrifugal force is a fictitious (pseudo) force that accounts for the frame\'s acceleration. Both descriptions give correct predictions.' },
      { question: 'Why do you feel pushed outward in a turning car?', answer: 'Your body tends to continue in a straight line (Newton\'s first law). The car turns inward beneath you, and the seat/door pushes you inward (centripetal force). You interpret this as being pushed outward, but it is actually the car pushing you inward while your inertia resists.' },
      { question: 'Why does a satellite not fall down?', answer: 'A satellite is falling — toward Earth\'s center. But it also has tangential velocity, so as it falls, the curved Earth drops away beneath it. The gravitational centripetal force curves its path into a circle (or ellipse), and it perpetually falls around Earth without hitting the surface.' },
    ],
  },
  {
    slug: 'pendulum-physics',
    title: 'How Does a Pendulum Work?',
    shortAnswer:
      'A pendulum swings back and forth due to the restoring force of gravity. When displaced from equilibrium, the component of gravity along the arc pulls it back. For small angles, the motion is simple harmonic with a period that depends only on the pendulum length and gravitational acceleration, not on mass or amplitude.',
    relatedGameSlugs: ['pendulum-physics', 'resonance', 'standing-waves'],
    category: 'mechanics',
    steps: [
      { title: 'Restoring Force', explanation: 'When a pendulum is displaced by angle theta from vertical, the tangential component of gravity is -mg*sin(theta), directed back toward equilibrium. This restoring force is what causes oscillation.' },
      { title: 'Small Angle Approximation', explanation: 'For small angles (theta < ~15 degrees), sin(theta) is approximately equal to theta (in radians), making the restoring force proportional to displacement. This gives simple harmonic motion with period T = 2*pi*sqrt(L/g), independent of mass and amplitude.' },
      { title: 'Energy Exchange', explanation: 'At the extremes of swing, the pendulum has maximum gravitational potential energy and zero kinetic energy. At the bottom, all energy is kinetic. Energy continuously converts between these forms, with total mechanical energy conserved in the ideal case.' },
      { title: 'Damping and Driving', explanation: 'Real pendulums lose energy to air drag and friction at the pivot, causing amplitude to decay. A clock mechanism or electromagnetic drive can replenish energy each cycle, maintaining constant amplitude. Resonance occurs when the drive frequency matches the natural frequency.' },
    ],
    realWorldApps: [
      'Pendulum clocks providing accurate timekeeping for centuries',
      'Seismometers detecting earthquake ground motion',
      'Foucault pendulum demonstrating Earth\'s rotation',
      'Tuned mass dampers in skyscrapers reducing wind sway',
    ],
    faqItems: [
      { question: 'Why doesn\'t the mass of the pendulum affect its period?', answer: 'Both the restoring force (gravity, proportional to m) and the inertia (resistance to acceleration, also proportional to m) scale with mass. These cancel in F = ma, leaving the period dependent only on length and g. This is the same reason all objects fall at the same rate.' },
      { question: 'Does a pendulum swing forever?', answer: 'No. Air resistance and pivot friction gradually convert mechanical energy to heat, reducing amplitude until the pendulum stops. In a vacuum with a frictionless pivot, it would theoretically swing forever, but this is practically unachievable.' },
      { question: 'Why are longer pendulums slower?', answer: 'A longer pendulum has a larger arc to travel for the same angle, while the restoring acceleration (g*sin(theta)) is the same regardless of length. The period scales as sqrt(L), so doubling length increases the period by about 41%.' },
    ],
  },
  {
    slug: 'hookes-law',
    title: 'How Does Hooke\'s Law Work?',
    shortAnswer:
      'Hooke\'s law states that the force needed to extend or compress a spring is proportional to the displacement from its natural length: F = -k*x. This linear relationship holds for small deformations in elastic materials and is the basis for understanding vibrations, material elasticity, and spring-based mechanisms.',
    relatedGameSlugs: ['hookes-law', 'resonance', 'pendulum-physics'],
    category: 'mechanics',
    steps: [
      { title: 'Linear Restoring Force', explanation: 'When a spring is stretched or compressed by distance x from equilibrium, it exerts a force F = -k*x opposing the displacement. The spring constant k (in N/m) characterizes the stiffness: higher k means a stiffer spring.' },
      { title: 'Elastic Potential Energy', explanation: 'Work done against the spring force is stored as elastic potential energy: U = (1/2)*k*x^2. This energy can be fully recovered when the spring returns to equilibrium, making it a conservative force.' },
      { title: 'Simple Harmonic Motion', explanation: 'A mass m on a spring oscillates with angular frequency omega = sqrt(k/m) and period T = 2*pi*sqrt(m/k). The motion is sinusoidal: x(t) = A*cos(omega*t + phi). Heavier masses oscillate more slowly; stiffer springs oscillate faster.' },
      { title: 'Elastic Limit and Beyond', explanation: 'Hooke\'s law holds only for small deformations within the elastic limit. Beyond this, materials undergo plastic (permanent) deformation. The stress-strain curve departs from linearity, and the spring no longer returns to its original length.' },
    ],
    realWorldApps: [
      'Vehicle suspension springs absorbing road bumps',
      'Mechanical watches using balance springs for timekeeping',
      'Force measurement in spring scales and load cells',
      'Structural engineering predicting building deflection under load',
    ],
    faqItems: [
      { question: 'Does Hooke\'s law apply to all materials?', answer: 'All solid materials obey Hooke\'s law for sufficiently small deformations. The elastic region varies enormously: rubber can stretch 500% elastically, while glass breaks at less than 0.1% strain. Beyond the elastic limit, permanent deformation occurs.' },
      { question: 'What happens when you connect springs in series vs parallel?', answer: 'Springs in series (end to end) have a combined stiffness of 1/k_total = 1/k1 + 1/k2, making the system softer. Springs in parallel (side by side) have k_total = k1 + k2, making it stiffer. This is the opposite of how electrical resistors combine.' },
      { question: 'Why does Hooke\'s law use a negative sign?', answer: 'The negative sign indicates the force opposes the displacement. Stretching the spring (positive x) produces a force pulling back (negative F). Compressing it (negative x) produces a pushing force (positive F). This restoring nature is what creates oscillation.' },
    ],
  },
  {
    slug: 'drag-force-physics',
    title: 'How Does Drag Force Work?',
    shortAnswer:
      'Drag force is the resistive force that a fluid (air or water) exerts on an object moving through it. It opposes the direction of motion and increases with velocity, fluid density, object size, and shape, described by F_drag = (1/2)*C_d*rho*A*v^2.',
    relatedGameSlugs: ['drag-force', 'terminal-velocity', 'bernoulli'],
    category: 'mechanics',
    steps: [
      { title: 'Pressure Drag (Form Drag)', explanation: 'As an object moves through fluid, it creates a high-pressure zone in front and a low-pressure wake behind. The pressure difference creates a net backward force. Streamlined shapes reduce the wake, dramatically lowering pressure drag.' },
      { title: 'Skin Friction Drag', explanation: 'The fluid directly in contact with the surface sticks to it (no-slip condition), creating a velocity gradient in the boundary layer. Viscous shear stress along the surface resists motion. This dominates for streamlined bodies at moderate speeds.' },
      { title: 'The Drag Equation', explanation: 'Drag force F = (1/2)*C_d*rho*A*v^2, where C_d is the drag coefficient (shape-dependent), rho is fluid density, A is the reference area (usually frontal area), and v is velocity. The v^2 dependence means doubling speed quadruples drag.' },
      { title: 'Reynolds Number Effects', explanation: 'The Reynolds number Re = rho*v*L/mu determines flow regime. At low Re (slow, small, viscous), drag is proportional to velocity (Stokes drag). At high Re (fast, large, turbulent), drag follows the v^2 law. The transition is complex and shape-dependent.' },
    ],
    realWorldApps: [
      'Automotive aerodynamic design reducing fuel consumption',
      'Aircraft drag minimization for efficiency and range',
      'Parachute design for controlled deceleration',
      'Cycling and swimming body positions minimizing drag',
    ],
    faqItems: [
      { question: 'Why does drag increase with the square of velocity?', answer: 'At high speeds, the force comes from deflecting a mass of fluid. The mass of fluid encountered per second scales with v (more fluid per second), and the momentum change of each parcel scales with v. The product gives F proportional to v^2.' },
      { question: 'What is a drag coefficient?', answer: 'The drag coefficient C_d is a dimensionless number that encapsulates the effect of shape and surface roughness. A flat plate perpendicular to flow has C_d of about 1.2; a sphere about 0.47; a streamlined airfoil about 0.04. Lower C_d means less drag for the same area and speed.' },
      { question: 'Can drag ever be beneficial?', answer: 'Yes. Parachutes use high drag intentionally. Aerodynamic braking uses drag for deceleration (spacecraft re-entry). Badminton shuttlecocks use drag for flight stability. Race cars use spoilers that increase drag but also create downforce for cornering.' },
    ],
  },
  {
    slug: 'terminal-velocity',
    title: 'How Does Terminal Velocity Work?',
    shortAnswer:
      'Terminal velocity is the constant speed a falling object reaches when the upward drag force equals the downward gravitational force. At this point, the net force is zero, acceleration stops, and the object falls at a constant rate determined by its weight, size, and shape.',
    relatedGameSlugs: ['terminal-velocity', 'drag-force', 'buoyancy'],
    category: 'mechanics',
    steps: [
      { title: 'Initial Free Fall', explanation: 'When an object begins falling, gravity accelerates it downward at g = 9.81 m/s^2. At low speed, drag is negligible, and the object accelerates almost as if in a vacuum.' },
      { title: 'Drag Increases with Speed', explanation: 'As velocity increases, drag force grows as v^2. The net downward force (weight minus drag) decreases, so acceleration decreases. The object still speeds up, but more and more slowly.' },
      { title: 'Equilibrium at Terminal Velocity', explanation: 'When drag equals weight: (1/2)*C_d*rho*A*v_t^2 = mg. Solving: v_t = sqrt(2mg / (C_d*rho*A)). At this speed, net force is zero, acceleration is zero, and velocity remains constant.' },
      { title: 'Factors Affecting Terminal Velocity', explanation: 'Heavier objects have higher terminal velocity (a bowling ball vs a tennis ball). Larger cross-section area or higher drag coefficient reduces terminal velocity (parachute). Thinner air at high altitude increases terminal velocity.' },
    ],
    realWorldApps: [
      'Skydiving freefall speed (about 55 m/s belly-down, 90 m/s head-down)',
      'Raindrop size limiting in clouds (larger drops break apart)',
      'Parachute design for safe landing speeds',
      'Sedimentation rates in water treatment and geology',
    ],
    faqItems: [
      { question: 'What is the terminal velocity of a skydiver?', answer: 'About 55 m/s (120 mph) in a belly-down spread position, or about 90 m/s (200 mph) in a head-down streamlined position. The difference is due to the change in frontal area and drag coefficient between positions.' },
      { question: 'Do heavier objects really fall faster?', answer: 'In a vacuum, no — all objects fall at the same rate. In air, yes — heavier objects reach higher terminal velocity because they need more drag to balance their greater weight, which requires higher speed. A bowling ball\'s terminal velocity far exceeds a feather\'s.' },
      { question: 'Can terminal velocity change during a fall?', answer: 'Yes. As a skydiver descends into denser air at lower altitude, drag increases and terminal velocity decreases. A skydiver in freefall at 30,000 feet has higher terminal velocity than at 5,000 feet due to the thinner air at altitude.' },
    ],
  },
  // ----------------------------------------------------------------
  // FLUID MECHANICS (additional)
  // ----------------------------------------------------------------
  {
    slug: 'siphon-physics',
    title: 'How Does a Siphon Work?',
    shortAnswer:
      'A siphon transfers liquid over a barrier from a higher reservoir to a lower one using a tube, powered by gravity and atmospheric pressure. Once started, the weight of liquid in the descending leg creates a pressure difference that pulls liquid continuously through the tube without a pump.',
    relatedGameSlugs: ['siphon-physics', 'bernoulli', 'buoyancy'],
    category: 'fluids',
    steps: [
      { title: 'Priming the Siphon', explanation: 'The tube must first be filled with liquid (by suction, submersion, or pre-filling). Once filled, the liquid forms a continuous chain from the source reservoir over the apex and down to the outlet.' },
      { title: 'Gravity Drives the Flow', explanation: 'The descending leg contains more liquid height than the ascending leg (measured from the surface of each reservoir). The weight difference creates a net downward force that pulls liquid through the tube. Flow continues as long as the outlet is below the source surface level.' },
      { title: 'Pressure Analysis', explanation: 'At the tube entrance, pressure is atmospheric plus the depth of submersion. At the apex, pressure drops below atmospheric (by rho*g*h where h is the height above the source surface). At the outlet, flow velocity maintains the pressure gradient.' },
      { title: 'Maximum Height Limit', explanation: 'The siphon fails if the apex is too high. When the pressure at the apex drops to the liquid\'s vapor pressure, the liquid column breaks (cavitation). For water at sea level, the theoretical maximum height is about 10.3 meters (34 feet).' },
    ],
    realWorldApps: [
      'Draining aquariums and swimming pools without pumps',
      'Ancient Roman aqueducts crossing valleys using inverted siphons',
      'Toilet flush mechanisms using siphon action',
      'Transferring fuel or chemicals between containers',
    ],
    faqItems: [
      { question: 'Does a siphon work in a vacuum?', answer: 'This is debated. Classical explanations require atmospheric pressure to push liquid up the ascending leg. However, experiments in partial vacuums show siphons still work, suggesting liquid cohesion (tensile strength) plays a role. A siphon definitely fails if the liquid vaporizes at the apex.' },
      { question: 'Why does a siphon stop when air enters the tube?', answer: 'Air breaks the continuous liquid chain, eliminating the cohesive connection between the ascending and descending legs. The descending liquid drains out, the ascending liquid falls back, and the gravitational driving force can no longer pull liquid over the apex.' },
      { question: 'Can a siphon move water uphill?', answer: 'A siphon can move water over a barrier that is higher than both reservoirs, but the outlet must always be lower than the inlet (source surface). Water always flows from the higher reservoir to the lower one — the siphon just allows it to pass over obstacles in between.' },
    ],
  },
  {
    slug: 'cavitation-physics',
    title: 'How Does Cavitation Work?',
    shortAnswer:
      'Cavitation is the formation and violent collapse of vapor bubbles in a liquid when local pressure drops below the liquid\'s vapor pressure. The collapsing bubbles produce extreme pressures, temperatures, and shock waves that can erode metal surfaces and generate noise.',
    relatedGameSlugs: ['cavitation-physics', 'bernoulli', 'venturi-effect'],
    category: 'fluids',
    steps: [
      { title: 'Pressure Drop Below Vapor Pressure', explanation: 'In regions of high-speed flow (pump impellers, propeller tips, valve orifices), Bernoulli\'s principle causes local pressure to drop. When pressure falls below the liquid\'s vapor pressure, dissolved gas comes out of solution and the liquid vaporizes, forming bubbles.' },
      { title: 'Bubble Growth', explanation: 'Vapor bubbles expand rapidly in the low-pressure zone, fed by vaporization and dissolved gas release. Bubble size depends on the pressure deficit and duration of exposure to low pressure.' },
      { title: 'Violent Collapse', explanation: 'When bubbles are carried to higher-pressure regions, they collapse asymmetrically in microseconds. The implosion generates temperatures exceeding 5,000K and pressures above 1,000 atmospheres in a tiny volume, producing a micro-jet of liquid.' },
      { title: 'Damage Mechanisms', explanation: 'The micro-jets and shock waves from collapsing bubbles repeatedly impact surfaces, creating pitting and erosion. Over time, this destroys pump impellers, propellers, and valve seats. The collapse also produces characteristic crackling noise and vibration.' },
    ],
    realWorldApps: [
      'Propeller design to minimize cavitation erosion on ships',
      'Ultrasonic cleaning using controlled cavitation to remove contaminants',
      'Hydraulic machinery damage assessment and prevention',
      'Medical lithotripsy using shock waves to break kidney stones',
    ],
    faqItems: [
      { question: 'Why is cavitation destructive to propellers?', answer: 'Each cavitation bubble collapse impacts the propeller surface with a micro-jet at velocities up to 100 m/s. Millions of these impacts per second create fatigue and erosion, eventually pitting and destroying the metal surface. Bronze propellers are used for their cavitation resistance.' },
      { question: 'Can cavitation be useful?', answer: 'Yes. Ultrasonic cleaners intentionally create cavitation bubbles near contaminated surfaces, using the micro-jets to dislodge dirt. Cavitation is also used in homogenization, water treatment, and surgical procedures. Mantis shrimp weaponize cavitation to stun prey.' },
      { question: 'How do engineers prevent cavitation?', answer: 'By ensuring pressure never drops below vapor pressure: increasing inlet pressure, reducing flow velocities, using larger flow passages, and designing smooth blade profiles. NPSH (Net Positive Suction Head) calculations for pumps specifically guard against cavitation.' },
    ],
  },
  // ----------------------------------------------------------------
  // COMPUTER MEMORY
  // ----------------------------------------------------------------
  {
    slug: 'ecc-memory',
    title: 'How Does ECC Memory Work?',
    shortAnswer:
      'Error-Correcting Code (ECC) memory detects and corrects single-bit errors in RAM by storing extra parity bits alongside data. Using Hamming codes or similar algorithms, ECC memory can identify and fix one flipped bit per memory word, preventing data corruption from cosmic rays and electrical noise.',
    relatedGameSlugs: ['ecc-memory', 'dram-refresh', 'series-parallel-circuits'],
    category: 'semiconductors',
    steps: [
      { title: 'The Problem: Bit Flips', explanation: 'DRAM stores each bit as a tiny charge on a capacitor. Cosmic rays, alpha particles from packaging materials, and electrical noise can flip a bit from 0 to 1 or vice versa. At modern densities, a typical server experiences several bit flips per GB per year.' },
      { title: 'Hamming Code Encoding', explanation: 'For every 64 bits of data, ECC memory stores 8 additional check bits (72 bits total on a DIMM). The check bits are computed as parity across specific subsets of data bits, creating a redundant code that can locate any single-bit error.' },
      { title: 'Error Detection and Correction', explanation: 'On each read, the memory controller recomputes the check bits and compares them to the stored values. A mismatch pattern (syndrome) identifies the exact bit position of a single-bit error, which is then flipped back to correct it. Two-bit errors are detected but not correctable.' },
      { title: 'SECDED Codes', explanation: 'The standard ECC scheme is SECDED: Single Error Correction, Double Error Detection. It corrects any 1-bit error silently and detects (but cannot fix) 2-bit errors, triggering a machine check exception. Three or more simultaneous errors may go undetected.' },
    ],
    realWorldApps: [
      'Server and data center memory ensuring data integrity',
      'Scientific computing where a single bit flip can invalidate results',
      'Financial systems where memory errors could corrupt transactions',
      'Aerospace and medical systems requiring high reliability',
    ],
    faqItems: [
      { question: 'Do consumer PCs need ECC memory?', answer: 'Most consumer PCs do not use ECC because bit flip rates are low enough that the occasional error rarely causes noticeable problems. However, for workstations running long computations or handling irreplaceable data, ECC provides valuable protection. AMD Ryzen supports ECC; most Intel consumer chips do not.' },
      { question: 'How much does ECC memory cost compared to non-ECC?', answer: 'ECC DIMMs cost about 10-20% more than equivalent non-ECC modules due to the extra memory chips (9 chips instead of 8 per rank). The memory controller must also support ECC, which limits compatible platforms.' },
      { question: 'Can ECC fix multi-bit errors?', answer: 'Standard SECDED ECC corrects only single-bit errors. Chipkill (AMD) or SDDC (Intel) extends protection to handle an entire failed memory chip by distributing data across chips. Advanced ECC schemes in HBM can correct multi-bit errors within a single chip.' },
    ],
  },
  {
    slug: 'dram-refresh',
    title: 'How Does DRAM Refresh Work?',
    shortAnswer:
      'DRAM stores each bit as a charge on a tiny capacitor, but this charge leaks away in milliseconds. To prevent data loss, the memory controller periodically reads and rewrites every row in the memory array, typically every 32-64 milliseconds, in a process called refresh.',
    relatedGameSlugs: ['dram-refresh', 'ecc-memory', 'capacitor-charging'],
    category: 'semiconductors',
    steps: [
      { title: 'Capacitor-Based Storage', explanation: 'Each DRAM cell consists of one transistor and one capacitor. A charged capacitor represents a "1" and a discharged one represents a "0". The capacitor is extremely small (femtofarads) and stores only a tiny amount of charge.' },
      { title: 'Charge Leakage', explanation: 'The access transistor and surrounding silicon are not perfect insulators. Junction leakage, sub-threshold conduction, and dielectric absorption cause the stored charge to decay over time. Without refresh, data is lost within about 64-256 milliseconds.' },
      { title: 'Row-by-Row Refresh', explanation: 'The memory controller issues refresh commands that activate one row at a time. Reading the row amplifies the decayed charges through sense amplifiers, then writes the refreshed values back. All rows must be refreshed within the retention time (typically 64 ms for DDR4/DDR5).' },
      { title: 'Performance and Power Impact', explanation: 'During refresh, the refreshed row (and often the entire bank) is unavailable for read/write operations. In a large DRAM chip with thousands of rows, refresh occupies 5-10% of total time and consumes significant power, especially in mobile devices.' },
    ],
    realWorldApps: [
      'All modern computers, phones, and servers using DRAM',
      'Low-power mobile DRAM with temperature-dependent refresh rates',
      'High-capacity server memory requiring careful refresh scheduling',
      'Embedded systems using DRAM for cost-effective high-density storage',
    ],
    faqItems: [
      { question: 'Why not use SRAM instead of DRAM to avoid refresh?', answer: 'SRAM stores data in flip-flops that don\'t need refresh, but each cell requires 6 transistors versus 1 for DRAM. SRAM is about 6x larger per bit and much more expensive. DRAM\'s density advantage makes it the only practical choice for main memory (gigabytes), while SRAM is used for small caches (megabytes).' },
      { question: 'Does DRAM data survive a power outage?', answer: 'No. DRAM is volatile memory — when power is lost, the capacitor charges dissipate within milliseconds and all data is lost. This is why computers lose unsaved work on power failure and why persistent storage (SSD, HDD) is needed for long-term data retention.' },
      { question: 'What is the cold boot attack?', answer: 'DRAM charge decays slowly at low temperatures. By cooling DRAM chips to -50°C (e.g., with compressed air spray), data can persist for minutes without power. Attackers can remove the DIMMs, install them in another system, and read encryption keys from memory. This is a real security vulnerability.' },
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
