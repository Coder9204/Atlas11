/**
 * SECURE GAME ANSWERS STORE
 *
 * This file contains all correct answers for all games.
 * IT MUST NEVER BE EXPOSED TO THE CLIENT.
 * Only the validateTestAnswer function should access this data.
 *
 * IMPORTANT: When adding a new game, add its answers here.
 */

export interface GameAnswer {
  correctIndex: number;      // Index of correct option (0-based)
  explanation: string;       // Explanation shown after answering
}

export interface GameAnswers {
  [questionIndex: number]: GameAnswer;
}

export interface AllGameAnswers {
  [gameId: string]: GameAnswers;
}

/**
 * All game answers stored securely on the server.
 *
 * Pattern for adding a new game:
 *
 * "game_id": {
 *   0: { correctIndex: 1, explanation: "Explanation for question 1..." },
 *   1: { correctIndex: 0, explanation: "Explanation for question 2..." },
 *   // ... up to 9 (10 questions total, 0-indexed)
 * }
 */
export const GAME_ANSWERS: AllGameAnswers = {
  // =============================================================
  // CENTER OF MASS
  // =============================================================
  "center_of_mass": {
    0: {
      correctIndex: 1,
      explanation: "The system balances because its center of mass lies below the pivot point, creating stable equilibrium. When COM is below the pivot, gravity creates a restoring force that returns the system to equilibrium."
    },
    1: {
      correctIndex: 2,
      explanation: "The fork (being heavier) shifts the center of mass toward itself. The COM is always closer to the heavier object in a two-body system."
    },
    2: {
      correctIndex: 1,
      explanation: "Moving the coin toward the fork shifts the COM closer to the fork side. The COM position is the weighted average of all mass positions."
    },
    3: {
      correctIndex: 0,
      explanation: "The toothpick acts as a lever arm allowing the COM to be positioned below the pivot point on the glass rim."
    },
    4: {
      correctIndex: 3,
      explanation: "When the fork is twisted, the COM shifts horizontally, changing the balance condition. The system can still balance if the COM remains below the pivot."
    },
    5: {
      correctIndex: 1,
      explanation: "Stable equilibrium occurs when any small displacement causes forces that push the system back to equilibrium. This happens when COM is below the pivot."
    },
    6: {
      correctIndex: 2,
      explanation: "If you removed the coin, the COM would shift toward the toothpick end, potentially causing the system to fall as the COM might no longer be below the pivot."
    },
    7: {
      correctIndex: 0,
      explanation: "The glass rim provides a point pivot - a single point of contact that allows the system to rotate freely while supporting the weight at that exact point."
    },
    8: {
      correctIndex: 1,
      explanation: "High-wire walkers use long poles to lower their center of mass below the wire, creating stable equilibrium just like the fork-toothpick system."
    },
    9: {
      correctIndex: 3,
      explanation: "The total torque about the pivot must be zero for balance. This means the clockwise and counterclockwise torques from the mass distribution must cancel out."
    }
  },

  // =============================================================
  // WIRELESS CHARGING
  // =============================================================
  "wireless_charging": {
    0: {
      correctIndex: 1,
      explanation: "Wireless charging works through electromagnetic induction - a changing magnetic field in the transmitter coil induces a current in the receiver coil."
    },
    1: {
      correctIndex: 2,
      explanation: "Misalignment reduces efficiency because the magnetic flux through the receiver coil decreases when coils aren't aligned, reducing induced current."
    },
    2: {
      correctIndex: 0,
      explanation: "The Qi standard uses resonant inductive coupling, which allows efficient power transfer over short distances even with some misalignment."
    },
    3: {
      correctIndex: 1,
      explanation: "Distance significantly affects charging efficiency because magnetic field strength decreases with the cube of distance (inverse cube law for near-field)."
    },
    4: {
      correctIndex: 3,
      explanation: "Metal objects between coils absorb electromagnetic energy and convert it to heat, reducing efficiency and potentially causing safety issues."
    },
    5: {
      correctIndex: 2,
      explanation: "Higher frequencies allow smaller coils but may increase switching losses. The optimal frequency balances these factors for the application."
    },
    6: {
      correctIndex: 0,
      explanation: "Resonant coupling allows power transfer at greater distances by tuning both coils to resonate at the same frequency, maximizing energy transfer."
    },
    7: {
      correctIndex: 1,
      explanation: "Faraday's Law states that the induced EMF equals the negative rate of change of magnetic flux, which is the fundamental principle behind wireless charging."
    },
    8: {
      correctIndex: 2,
      explanation: "Electric vehicle wireless charging uses the same induction principles but with much larger coils and higher power levels, typically 3-22 kW."
    },
    9: {
      correctIndex: 1,
      explanation: "The efficiency of wireless charging is typically 80-90% for well-aligned Qi chargers, compared to 90-95% for wired charging."
    }
  },

  // =============================================================
  // ANTENNA POLARIZATION
  // =============================================================
  "antenna_polarization": {
    0: {
      correctIndex: 1,
      explanation: "Signal strength follows cos²(θ) relationship where θ is the angle between transmitter and receiver polarization. At 90° (perpendicular), cos²(90°) = 0."
    },
    1: {
      correctIndex: 2,
      explanation: "Circular polarization can be received by any linearly polarized antenna with only 3dB loss, making it useful for mobile applications."
    },
    2: {
      correctIndex: 0,
      explanation: "Satellite TV uses circular polarization because the satellite's orientation relative to Earth varies, and circular polarization is orientation-independent."
    },
    3: {
      correctIndex: 1,
      explanation: "Cross-polarization allows frequency reuse - the same frequency can carry different signals on orthogonal polarizations, doubling channel capacity."
    },
    4: {
      correctIndex: 3,
      explanation: "At 45° misalignment, signal strength is cos²(45°) = 0.5, which is a 3dB reduction (half power)."
    },
    5: {
      correctIndex: 2,
      explanation: "Raindrops preferentially attenuate horizontally polarized signals because falling raindrops flatten into oblate spheroids."
    },
    6: {
      correctIndex: 0,
      explanation: "WiFi routers often use multiple antennas with different polarizations to improve coverage through spatial diversity."
    },
    7: {
      correctIndex: 1,
      explanation: "The electric field vector of an electromagnetic wave defines its polarization - it oscillates in a specific plane for linear polarization."
    },
    8: {
      correctIndex: 2,
      explanation: "5G uses massive MIMO with polarization diversity to create multiple simultaneous data streams to different users."
    },
    9: {
      correctIndex: 1,
      explanation: "Malus's Law (I = I₀cos²θ) describes how intensity varies with polarization angle, directly applicable to antenna reception."
    }
  },

  // =============================================================
  // WAVE PARTICLE DUALITY
  // =============================================================
  "wave_particle_duality": {
    0: {
      correctIndex: 2,
      explanation: "Even with single electrons, an interference pattern emerges over time. Each electron goes through BOTH slits as a wave, then appears as a particle at detection."
    },
    1: {
      correctIndex: 1,
      explanation: "Observing which slit the electron passes through collapses the wave function, destroying the interference pattern. The electron behaves as a particle when observed."
    },
    2: {
      correctIndex: 3,
      explanation: "The de Broglie wavelength λ = h/p means higher momentum particles have shorter wavelengths, making wave behavior less observable."
    },
    3: {
      correctIndex: 0,
      explanation: "Electron microscopes exploit the short de Broglie wavelength of fast electrons to achieve resolution beyond optical microscopes."
    },
    4: {
      correctIndex: 2,
      explanation: "Quantum superposition allows qubits to be in multiple states simultaneously, enabling parallel computation of all possible answers."
    },
    5: {
      correctIndex: 1,
      explanation: "The uncertainty principle states ΔxΔp ≥ ℏ/2 - you cannot simultaneously know both position and momentum with arbitrary precision."
    },
    6: {
      correctIndex: 0,
      explanation: "Larger objects have negligible de Broglie wavelengths due to their high momentum, making quantum effects unobservable at macroscopic scales."
    },
    7: {
      correctIndex: 3,
      explanation: "The double-slit experiment demonstrates complementarity - wave and particle behaviors are mutually exclusive depending on the measurement."
    },
    8: {
      correctIndex: 1,
      explanation: "Photosynthesis uses quantum coherence to achieve near-perfect energy transfer efficiency, exploiting wave-like behavior of excitons."
    },
    9: {
      correctIndex: 2,
      explanation: "Quantum tunneling, a consequence of wave behavior, allows particles to pass through barriers they classically couldn't overcome."
    }
  },

  // =============================================================
  // DISPERSION
  // =============================================================
  "dispersion": {
    0: {
      correctIndex: 1,
      explanation: "Different wavelengths refract by different amounts because the refractive index of glass depends on wavelength - shorter wavelengths refract more."
    },
    1: {
      correctIndex: 2,
      explanation: "Violet light bends the most because it has the shortest wavelength and highest refractive index in glass."
    },
    2: {
      correctIndex: 0,
      explanation: "Rainbows form when sunlight enters water droplets, reflects internally, and disperses - each color exits at a slightly different angle."
    },
    3: {
      correctIndex: 3,
      explanation: "The refractive index varies with wavelength due to the interaction between light and the material's electron structure at different frequencies."
    },
    4: {
      correctIndex: 1,
      explanation: "Chromatic aberration in lenses occurs because different colors focus at different points due to dispersion."
    },
    5: {
      correctIndex: 2,
      explanation: "Achromatic doublets combine crown and flint glass with opposite dispersions to minimize chromatic aberration."
    },
    6: {
      correctIndex: 0,
      explanation: "Fiber optic communication uses single wavelengths to avoid pulse spreading from dispersion in long-distance transmission."
    },
    7: {
      correctIndex: 1,
      explanation: "A spectroscope uses dispersion to separate light into its component wavelengths for analysis."
    },
    8: {
      correctIndex: 3,
      explanation: "The speed of light in a medium equals c/n, so different colors travel at different speeds in dispersive materials."
    },
    9: {
      correctIndex: 2,
      explanation: "Dispersion compensation in fiber optics uses specially designed fibers with opposite dispersion to cancel pulse spreading."
    }
  },

  // =============================================================
  // DIFFRACTION
  // =============================================================
  "diffraction": {
    0: {
      correctIndex: 1,
      explanation: "Diffraction occurs when waves bend around obstacles or spread through openings. It's most pronounced when the opening is comparable to the wavelength."
    },
    1: {
      correctIndex: 2,
      explanation: "Narrower slits produce wider diffraction patterns because the angular spread is inversely proportional to slit width: θ ≈ λ/a."
    },
    2: {
      correctIndex: 0,
      explanation: "CD/DVD surfaces use diffraction gratings to separate colors - the microscopic tracks act as a reflection grating."
    },
    3: {
      correctIndex: 3,
      explanation: "The Rayleigh criterion defines the resolution limit: two points are resolved when the central maximum of one falls on the first minimum of the other."
    },
    4: {
      correctIndex: 1,
      explanation: "X-ray crystallography uses diffraction to determine atomic structures because X-ray wavelengths match atomic spacing."
    },
    5: {
      correctIndex: 2,
      explanation: "Sound diffracts around corners easily because sound wavelengths (centimeters to meters) are comparable to everyday obstacle sizes."
    },
    6: {
      correctIndex: 0,
      explanation: "Radio waves diffract over hills and around buildings because their long wavelengths match these obstacle sizes."
    },
    7: {
      correctIndex: 1,
      explanation: "The central maximum contains about 84% of the total light energy in single-slit diffraction."
    },
    8: {
      correctIndex: 3,
      explanation: "Holograms work by recording and reconstructing diffraction patterns of light waves, preserving 3D information."
    },
    9: {
      correctIndex: 2,
      explanation: "Telescope resolution is limited by diffraction at the aperture - larger apertures provide better resolution."
    }
  },

  // =============================================================
  // TOTAL INTERNAL REFLECTION
  // =============================================================
  "total_internal_reflection": {
    0: {
      correctIndex: 1,
      explanation: "Total internal reflection occurs when light travels from a higher to lower refractive index medium at an angle greater than the critical angle."
    },
    1: {
      correctIndex: 2,
      explanation: "The critical angle depends on the ratio of refractive indices: sin(θc) = n₂/n₁. Higher index differences give smaller critical angles."
    },
    2: {
      correctIndex: 0,
      explanation: "Fiber optics use TIR to confine light within the core - the cladding has lower refractive index than the core."
    },
    3: {
      correctIndex: 3,
      explanation: "Diamonds sparkle brilliantly because their high refractive index (2.42) creates a small critical angle, trapping light inside."
    },
    4: {
      correctIndex: 1,
      explanation: "The evanescent wave is an exponentially decaying field that extends slightly beyond the interface during TIR - it carries no energy unless disturbed."
    },
    5: {
      correctIndex: 2,
      explanation: "FTIR (Frustrated TIR) occurs when another surface is brought within the evanescent wave region, allowing light to tunnel across."
    },
    6: {
      correctIndex: 0,
      explanation: "Prisms in binoculars use TIR to fold the optical path and flip the image without the light loss of mirrors."
    },
    7: {
      correctIndex: 1,
      explanation: "Mirages occur because heated air near the ground has lower density (and refractive index), creating TIR of sky light."
    },
    8: {
      correctIndex: 3,
      explanation: "At exactly the critical angle, light travels along the interface - this is used in optical waveguide couplers."
    },
    9: {
      correctIndex: 2,
      explanation: "Medical endoscopes use fiber bundles with TIR to transmit images from inside the body to external cameras."
    }
  },

  // =============================================================
  // BEATS (Sound Interference)
  // =============================================================
  "beats": {
    0: {
      correctIndex: 1,
      explanation: "Beat frequency equals the absolute difference between the two frequencies: |f₂ - f₁| = |260 - 256| = 4 Hz."
    },
    1: {
      correctIndex: 2,
      explanation: "Beats occur due to the superposition of two waves with slightly different frequencies, creating periodic constructive and destructive interference."
    },
    2: {
      correctIndex: 0,
      explanation: "Piano tuners use beats to tune - when beats disappear (zero beat frequency), the strings are in tune at the same frequency."
    },
    3: {
      correctIndex: 3,
      explanation: "The amplitude modulation in beats follows the envelope frequency of (f₁ + f₂)/2 with modulation at (f₁ - f₂)/2."
    },
    4: {
      correctIndex: 1,
      explanation: "As frequencies get closer, beat frequency decreases. At equal frequencies, there are no beats (continuous tone)."
    },
    5: {
      correctIndex: 2,
      explanation: "The human ear can distinguish beats up to about 20 Hz - above this, we hear two separate tones."
    },
    6: {
      correctIndex: 0,
      explanation: "Doppler radar uses beat frequencies between transmitted and reflected signals to measure target velocity."
    },
    7: {
      correctIndex: 1,
      explanation: "The resultant wave amplitude varies between (A₁ + A₂) and |A₁ - A₂| as the waves go in and out of phase."
    },
    8: {
      correctIndex: 3,
      explanation: "Binaural beats occur when slightly different frequencies are played to each ear - the brain perceives the beat frequency."
    },
    9: {
      correctIndex: 2,
      explanation: "Musical vibrato uses small frequency modulation, creating a beat-like effect that adds richness to the sound."
    }
  },

  // =============================================================
  // STANDING WAVES
  // =============================================================
  "standing_waves": {
    0: {
      correctIndex: 1,
      explanation: "Standing waves form only at resonant frequencies where whole half-wavelengths fit exactly between the fixed ends."
    },
    1: {
      correctIndex: 2,
      explanation: "Nodes are points of zero displacement where destructive interference occurs. Antinodes have maximum displacement."
    },
    2: {
      correctIndex: 0,
      explanation: "Guitar strings produce harmonics - pressing at fret positions creates nodes, changing the fundamental frequency."
    },
    3: {
      correctIndex: 3,
      explanation: "The fundamental frequency is f₁ = v/(2L) where v is wave speed and L is string length. Higher harmonics are integer multiples."
    },
    4: {
      correctIndex: 1,
      explanation: "Higher tension increases wave speed, raising all resonant frequencies proportionally: v = √(T/μ)."
    },
    5: {
      correctIndex: 2,
      explanation: "Open organ pipes have antinodes at both ends, while closed pipes have a node at the closed end - giving different harmonic series."
    },
    6: {
      correctIndex: 0,
      explanation: "Microwave ovens have standing wave patterns causing hot and cold spots - that's why turntables rotate the food."
    },
    7: {
      correctIndex: 1,
      explanation: "The second harmonic has twice the frequency and half the wavelength of the fundamental, with an additional node."
    },
    8: {
      correctIndex: 3,
      explanation: "Laser cavities use standing waves between mirrors to select specific wavelengths that satisfy the resonance condition."
    },
    9: {
      correctIndex: 2,
      explanation: "Room acoustics must consider standing waves (room modes) that cause bass buildup or cancellation at certain positions."
    }
  },

  // =============================================================
  // CARNOT CYCLE
  // =============================================================
  "carnot_cycle": {
    0: {
      correctIndex: 1,
      explanation: "The Carnot efficiency η = 1 - Tc/Th represents the maximum possible efficiency for any heat engine between two temperatures."
    },
    1: {
      correctIndex: 2,
      explanation: "The Carnot cycle consists of two isothermal processes (constant temperature) and two adiabatic processes (no heat transfer)."
    },
    2: {
      correctIndex: 0,
      explanation: "No real engine can exceed Carnot efficiency because it would violate the second law of thermodynamics."
    },
    3: {
      correctIndex: 3,
      explanation: "Increasing the temperature difference between hot and cold reservoirs increases Carnot efficiency."
    },
    4: {
      correctIndex: 1,
      explanation: "In the isothermal expansion, the gas absorbs heat from the hot reservoir while doing work at constant temperature."
    },
    5: {
      correctIndex: 2,
      explanation: "The Carnot cycle is reversible - run backwards, it becomes the most efficient possible refrigerator or heat pump."
    },
    6: {
      correctIndex: 0,
      explanation: "Real engines fall short of Carnot efficiency due to friction, heat losses, and the impossibility of truly reversible processes."
    },
    7: {
      correctIndex: 1,
      explanation: "Power plants are limited by Carnot efficiency - cooling towers represent the cold reservoir rejection of waste heat."
    },
    8: {
      correctIndex: 3,
      explanation: "The total entropy change in a complete Carnot cycle is zero because it's a reversible cycle."
    },
    9: {
      correctIndex: 2,
      explanation: "Combined cycle power plants use two heat engines in series to approach higher overall efficiency."
    }
  },

  // =============================================================
  // ANGULAR MOMENTUM
  // =============================================================
  "angular_momentum": {
    0: { correctIndex: 2, explanation: "They speed up. Conservation of angular momentum means L = Iω stays constant. When arms pull in, I decreases, so ω increases." },
    1: { correctIndex: 2, explanation: "Angular momentum is the conserved quantity. When moment of inertia decreases, angular velocity must increase to maintain L constant." },
    2: { correctIndex: 2, explanation: "If moment of inertia decreases by half, angular velocity doubles to conserve angular momentum (L = Iω)." },
    3: { correctIndex: 2, explanation: "Moment of inertia depends on both mass and distance from axis squared: I = Σmr²" },
    4: { correctIndex: 1, explanation: "Divers tuck to decrease moment of inertia, allowing them to spin faster in the same amount of time during the fall." },
    5: { correctIndex: 1, explanation: "Neutron stars spin incredibly fast because angular momentum is conserved as the star collapses to a tiny volume, reducing I dramatically." },
    6: { correctIndex: 1, explanation: "Tail rotors counter the main rotor's angular momentum. Without it, the entire helicopter would rotate opposite to the main rotor." },
    7: { correctIndex: 2, explanation: "When extending arms on a spinning chair, moment of inertia increases, so angular velocity decreases to conserve angular momentum." },
    8: { correctIndex: 1, explanation: "L = Iω is the formula for angular momentum (moment of inertia times angular velocity)." },
    9: { correctIndex: 1, explanation: "Angular momentum is conserved in a spinning gyroscope, causing it to resist tilting and maintain its orientation." }
  },

  // =============================================================
  // ANGULAR MOMENTUM TRANSFER
  // =============================================================
  "angular_momentum_transfer": {
    0: { correctIndex: 1, explanation: "Cats transfer angular momentum between body parts. The tucked half rotates faster while the extended half rotates slower in the opposite direction." },
    1: { correctIndex: 1, explanation: "When one set of legs is tucked (small I), that part rotates more; when extended (large I), it rotates less - the tucked half rotates more." },
    2: { correctIndex: 2, explanation: "Total angular momentum is zero (or constant) throughout. The cat exchanges angular momentum between front and back halves without changing total." },
    3: { correctIndex: 1, explanation: "Extended legs have a larger moment of inertia than tucked legs due to mass distribution farther from the rotation axis." },
    4: { correctIndex: 1, explanation: "For the same angular momentum, a body part with lower moment of inertia must rotate faster: ω = L/I" },
    5: { correctIndex: 1, explanation: "Astronauts extend and retract limbs asymmetrically to create differential rotations, using the same angular momentum transfer principle as cats." },
    6: { correctIndex: 1, explanation: "Cats need about 30 centimeters (roughly 1 foot) to complete their righting reflex - not any height works for very short falls." },
    7: { correctIndex: 2, explanation: "With zero initial angular momentum, final angular momentum remains zero. The object's parts rotate in opposite directions that cancel out." },
    8: { correctIndex: 0, explanation: "Slow motion photography revealed the cat righting reflex mechanism in the 1800s, enabling scientists to understand the physics." },
    9: { correctIndex: 1, explanation: "Divers initiate twists by asymmetrically moving arms and legs, using the same principle of angular momentum transfer as the cat righting reflex." }
  },

  // =============================================================
  // BERNOULLI
  // =============================================================
  "bernoulli": {
    0: { correctIndex: 1, explanation: "When fluid speed increases, pressure decreases. This is Bernoulli's principle: P + (1/2)ρv² + ρgh = constant" },
    1: { correctIndex: 2, explanation: "Airplane wings create lower pressure above the wing (faster airflow) and higher pressure below (slower airflow), creating an upward lift force." },
    2: { correctIndex: 2, explanation: "Bernoulli's equation: P + (1/2)ρv² + ρgh = constant, where P is pressure, ρ is density, v is velocity, g is gravity, h is height." },
    3: { correctIndex: 2, explanation: "The Magnus effect: spin creates faster airflow on one side (lower pressure) and slower on the other (higher pressure), pushing the ball toward low pressure." },
    4: { correctIndex: 1, explanation: "Venturi effect: when fluid flows through a constriction, it speeds up (continuity) and pressure drops (Bernoulli's principle)." },
    5: { correctIndex: 2, explanation: "Hot shower water creates rising air with lower pressure inside than still air outside, pushing the curtain inward per Bernoulli's principle." },
    6: { correctIndex: 1, explanation: "The papers come together because the fast-moving air between them has lower pressure than the still air outside, pushing them together." },
    7: { correctIndex: 1, explanation: "Inverted wing shape creates downforce (negative lift) pushing the car toward the track, increasing grip at high speeds." },
    8: { correctIndex: 2, explanation: "Continuity equation: A₁v₁ = A₂v₂ - flow rate is constant throughout a pipe regardless of cross-sectional area." },
    9: { correctIndex: 1, explanation: "Atomizers use fast air over a tube (Venturi effect) to create low pressure that sucks liquid up and breaks it into fine spray." }
  },

  // =============================================================
  // BOILING PRESSURE
  // =============================================================
  "boiling_pressure": {
    0: { correctIndex: 1, explanation: "At high altitude, atmospheric pressure is lower. Water molecules escape more easily, so boiling occurs at lower temperature." },
    1: { correctIndex: 2, explanation: "A pressure cooker increases pressure, which raises the boiling point. At 2 atm, water boils at approximately 120°C instead of 100°C." },
    2: { correctIndex: 2, explanation: "At approximately 0.03 atmospheres (vacuum), water can boil at room temperature (25°C) because few air molecules push back on escaping molecules." },
    3: { correctIndex: 1, explanation: "Higher boiling point means hotter water. At 2 atm, water reaches 120°C instead of 100°C, dramatically speeding chemical reactions in cooking." },
    4: { correctIndex: 1, explanation: "At higher boiling points (due to higher pressure), cooking chemical reactions happen faster, reducing cooking time significantly." },
    5: { correctIndex: 2, explanation: "The pressure-boiling point relationship depends on the Clausius-Clapeyron equation, where boiling point increases logarithmically with pressure." },
    6: { correctIndex: 1, explanation: "Mountain cooking requires adjustments because water is cooler. Pasta needs longer cooking time since heat transfer reactions happen slower at lower temperatures." },
    7: { correctIndex: 2, explanation: "Submarines sink by pumping water (not air) into ballast tanks, increasing total weight while keeping volume constant, making weight > buoyant force." },
    8: { correctIndex: 1, explanation: "Higher pressure means water boils at higher temperature. Each atmosphere of pressure raises the boiling point by roughly 28.7°C." },
    9: { correctIndex: 1, explanation: "On Mars with 0.006 atm pressure, water boils at body temperature. Astronauts must use pressure cookers or accept undercooked food." }
  },

  // =============================================================
  // BUCKLING
  // =============================================================
  "buckling": {
    0: { correctIndex: 1, explanation: "Double length = quarter the strength. Euler's formula shows P_cr ∝ 1/L², so the relationship is quadratic, not linear." },
    1: { correctIndex: 1, explanation: "Small imperfections amplify under axial load. The column bends sideways when the buckling load exceeds Euler's critical load." },
    2: { correctIndex: 2, explanation: "I-beams resist buckling best because they place material far from the neutral axis, maximizing moment of inertia (I) for the same weight." },
    3: { correctIndex: 1, explanation: "Moment of inertia measures how material is distributed from the center: I = Σmr². Material farther out increases buckling resistance." },
    4: { correctIndex: 1, explanation: "Euler's formula: P_cr = π²EI/L². The critical load is inversely proportional to L², making length the dominant factor." },
    5: { correctIndex: 1, explanation: "Hollow bike frames maximize I (moment of inertia) for the same weight by placing material at the outer edges, resisting buckling better." },
    6: { correctIndex: 1, explanation: "Hollow long bones have higher moment of inertia than solid rods of equal weight, providing greater buckling resistance with less material." },
    7: { correctIndex: 1, explanation: "Lattice towers separate members increase I distribution, maximizing resistance to buckling with minimal material compared to solid columns." },
    8: { correctIndex: 1, explanation: "For same buckling resistance with 2x height, you need approximately 4x the moment of inertia, typically requiring much thicker/larger cross-sections." },
    9: { correctIndex: 1, explanation: "The L² relationship means dramatic weakness with length. Doubling height quarters the buckling strength—a critical consideration for tall structures." }
  },

  // =============================================================
  // BUOYANCY
  // =============================================================
  "buoyancy": {
    0: { correctIndex: 1, explanation: "F_b = ρ_water × V × g = 1000 kg/m³ × 0.003 m³ × 10 m/s² = 30 N" },
    1: { correctIndex: 1, explanation: "If 40% of volume is above water, 60% is submerged. At equilibrium, ρ_object/ρ_water = fraction submerged = 0.6" },
    2: { correctIndex: 1, explanation: "The hollow ship shape displaces far more water than a solid ball of the same mass, creating a greater buoyant force to support the weight." },
    3: { correctIndex: 1, explanation: "Denser saltwater provides more buoyant force per volume. Less volume needs to be submerged for equilibrium, so the object floats higher." },
    4: { correctIndex: 1, explanation: "Pumping water into ballast tanks increases total weight without changing volume, making weight > buoyant force, causing the submarine to sink." },
    5: { correctIndex: 1, explanation: "Apparent weight = True weight - Buoyant force. 60kg person: 600N - 540N = 60N apparent = ~6kg feel." },
    6: { correctIndex: 0, explanation: "Same mass but A floats means lower density, therefore greater volume since ρ = m/V. Object A must have larger volume." },
    7: { correctIndex: 0, explanation: "Hot air has lower density than cold air. The buoyant force from denser surrounding air provides the lift (ρ_air × V × g)." },
    8: { correctIndex: 2, explanation: "The melted ice displaces exactly the same volume of water as it did when floating, so the water level remains constant." },
    9: { correctIndex: 1, explanation: "Archimedes' principle: The buoyant force equals the weight of the fluid displaced by the submerged or fully immersed object." }
  },

  // =============================================================
  // CAPACITIVE TOUCH
  // =============================================================
  "capacitive_touch": {
    0: { correctIndex: 1, explanation: "The local capacitance in the touch grid changes when your finger touches the screen." },
    1: { correctIndex: 1, explanation: "Regular gloves block the capacitive coupling between your conductive body and the screen." },
    2: { correctIndex: 2, explanation: "A grid of electrodes detects which intersection changed when you touch." },
    3: { correctIndex: 1, explanation: "Each touch point changes capacitance at a different grid location, enabling multi-touch." },
    4: { correctIndex: 1, explanation: "Capacitive touchscreens detect the electrical properties of your conductive finger." },
    5: { correctIndex: 1, explanation: "Water droplets can create false touches because water is conductive." },
    6: { correctIndex: 2, explanation: "Stylus tips for capacitive screens are made of conductive material to mimic a finger." },
    7: { correctIndex: 1, explanation: "The projected capacitive technology allows detection through a protective glass layer." },
    8: { correctIndex: 1, explanation: "Mutual capacitance measures the change between row and column electrodes." },
    9: { correctIndex: 2, explanation: "Capacitive screens work better in cold weather than resistive screens because they don't require pressure." }
  },

  // =============================================================
  // CAPILLARY ACTION
  // =============================================================
  "capillary_action": {
    0: { correctIndex: 1, explanation: "Capillary action in narrow xylem vessels combined with transpiration pull allows water to reach the top of tall trees." },
    1: { correctIndex: 1, explanation: "Smaller gaps between fibers create narrower capillary channels where h ∝ 1/r - height increases with smaller radius." },
    2: { correctIndex: 1, explanation: "Balance between height and flow resistance at 100 μm provides optimal performance." },
    3: { correctIndex: 2, explanation: "Mercury's contact angle with glass is >90°, making cos(θ) negative, so it's pushed down rather than pulled up." },
    4: { correctIndex: 1, explanation: "Engineered fiber structures create capillary channels that transport sweat to the outer surface." },
    5: { correctIndex: 2, explanation: "Lower viscosity increases flow speed but doesn't change final penetration depth." },
    6: { correctIndex: 1, explanation: "Capillary action in the fibrous wick structure lifts molten wax against gravity to the flame." },
    7: { correctIndex: 1, explanation: "Clay's smaller pores create stronger capillary forces, holding water more tightly against gravity." },
    8: { correctIndex: 1, explanation: "Without gravity opposing capillary forces, surface tension pulls water until the tube is full." },
    9: { correctIndex: 1, explanation: "Capillary wicking through fabric fibers, affected by fiber orientation and fabric structure." }
  },

  // =============================================================
  // CARTESIAN DIVER
  // =============================================================
  "cartesian_diver": {
    0: { correctIndex: 1, explanation: "When pressure increases, the air bubble compresses, reducing buoyancy and causing the diver to sink." },
    1: { correctIndex: 2, explanation: "Boyle's Law (PV = constant) explains how the air bubble compresses when pressure increases." },
    2: { correctIndex: 1, explanation: "Less displaced water means less buoyant force according to Archimedes' principle." },
    3: { correctIndex: 1, explanation: "At neutral buoyancy, object density equals water density." },
    4: { correctIndex: 1, explanation: "Submarines adjust ballast tanks (water vs air) to control their buoyancy just like the Cartesian diver." },
    5: { correctIndex: 1, explanation: "At 10m depth, pressure is about double atmospheric (2 atm total)." },
    6: { correctIndex: 1, explanation: "Fish swim bladders adjust gas volume to compensate for pressure changes at different depths." },
    7: { correctIndex: 2, explanation: "The swim bladder controls buoyancy by adjusting gas volume." },
    8: { correctIndex: 1, explanation: "When pressure is released, the diver rises as air expands, increasing buoyancy." },
    9: { correctIndex: 2, explanation: "If a deep water fish rises too quickly, its swim bladder expands rapidly and can rupture." }
  },

  // =============================================================
  // CAVITATION
  // =============================================================
  "cavitation": {
    0: { correctIndex: 1, explanation: "Cavitation occurs when local pressure drops below the liquid's vapor pressure, forming vapor bubbles." },
    1: { correctIndex: 1, explanation: "Bubble collapse creates extreme local temperatures (thousands of degrees) and pressures." },
    2: { correctIndex: 1, explanation: "Cavitation bubbles form on the low-pressure (suction) side of propeller blades." },
    3: { correctIndex: 1, explanation: "Mantis shrimp moves its claw so fast it creates low pressure, triggering cavitation." },
    4: { correctIndex: 2, explanation: "Cavitation bubble centers can reach 5,000°C or higher during collapse." },
    5: { correctIndex: 1, explanation: "Sonoluminescence is the light emitted from collapsing cavitation bubbles." },
    6: { correctIndex: 1, explanation: "To prevent cavitation, increase suction pressure or reduce impeller speed." },
    7: { correctIndex: 1, explanation: "The popping sound from propellers is caused by cavitation bubble collapse." },
    8: { correctIndex: 1, explanation: "Ultrasonic cleaners create cavitation bubbles that scrub surfaces clean." },
    9: { correctIndex: 1, explanation: "Cavitation damage creates a pitted, cratered surface that looks like tiny explosions." }
  },

  // =============================================================
  // CENTRIPETAL FORCE
  // =============================================================
  "centripetal_force": {
    0: { correctIndex: 2, explanation: "Centripetal force always points toward the center of the circular path." },
    1: { correctIndex: 1, explanation: "The centripetal force formula is F = mv²/r." },
    2: { correctIndex: 1, explanation: "Doubling velocity quadruples the centripetal force because F ∝ v²." },
    3: { correctIndex: 1, explanation: "Centrifugal force is an apparent (fictitious) force that appears in rotating reference frames." },
    4: { correctIndex: 2, explanation: "For a car turning on a flat road, friction between tires and road provides the centripetal force." },
    5: { correctIndex: 1, explanation: "On a banked curve, a component of the normal force provides centripetal force." },
    6: { correctIndex: 1, explanation: "When you swing an object faster, the centripetal force (tension) increases." },
    7: { correctIndex: 1, explanation: "Objects in a spinning container move outward because they continue straight while the container curves." },
    8: { correctIndex: 1, explanation: "At the top of a roller coaster loop, normal force and gravity together provide centripetal force." },
    9: { correctIndex: 2, explanation: "Centripetal force depends on both speed and radius: F = mv²/r." }
  },

  // =============================================================
  // CIRCUITS
  // =============================================================
  "circuits": {
    0: { correctIndex: 1, explanation: "Ohm's Law: V = IR. If R is constant and V doubles, then I must also double." },
    1: { correctIndex: 2, explanation: "Resistance is measured in Ohms (Ω), named after Georg Ohm who discovered V = IR." },
    2: { correctIndex: 1, explanation: "In a series circuit, if one component breaks, the circuit is broken and all components stop working." },
    3: { correctIndex: 2, explanation: "In parallel, 1/R_total = 1/R1 + 1/R2 + ... Total resistance is always less than any individual." },
    4: { correctIndex: 1, explanation: "In a series circuit, all components carry the same current because there's only one path." },
    5: { correctIndex: 2, explanation: "Electrical power P = VI (voltage times current), also P = I²R or P = V²/R." },
    6: { correctIndex: 2, explanation: "In parallel, all branches have the same voltage because they connect directly to the power source." },
    7: { correctIndex: 1, explanation: "From V = IR, if V is constant and R increases, I must decrease." },
    8: { correctIndex: 0, explanation: "Using Ohm's Law: I = V/R = 12V / 6Ω = 2 Amperes." },
    9: { correctIndex: 1, explanation: "Parallel wiring lets each device operate independently and receive full voltage." }
  },

  // =============================================================
  // CONVECTION CURRENTS
  // =============================================================
  "convection_currents": {
    0: { correctIndex: 1, explanation: "Warm fluid expands and becomes less dense, so buoyancy forces push it upward." },
    1: { correctIndex: 1, explanation: "Heat increases molecular kinetic energy, causing expansion and decreased density." },
    2: { correctIndex: 1, explanation: "Convection currents are driven by temperature differences that create density differences." },
    3: { correctIndex: 1, explanation: "Water cools along the sides of the pot and sinks back down, completing the cycle." },
    4: { correctIndex: 2, explanation: "Convection is heat transfer through bulk movement of fluids carrying thermal energy." },
    5: { correctIndex: 1, explanation: "Hot fluid rises, cools, becomes denser, sinks, gets heated again - a continuous cycle." },
    6: { correctIndex: 1, explanation: "Land heats faster than water during the day, causing air to rise over land and sea breeze to form." },
    7: { correctIndex: 1, explanation: "Convection depends on buoyancy which requires gravity. No gravity means no convection." },
    8: { correctIndex: 2, explanation: "Sunlight warming Earth is radiation, not convection - it doesn't require a medium." },
    9: { correctIndex: 1, explanation: "Convection ovens use fans to circulate hot air for even heat distribution." }
  },

  // =============================================================
  // CONVECTION
  // =============================================================
  "convection": {
    0: { correctIndex: 1, explanation: "Heated fluid expands and becomes less dense, so buoyancy forces push it upward." },
    1: { correctIndex: 1, explanation: "Radiators near the floor use natural convection - hot air rises, cool air sinks to be heated." },
    2: { correctIndex: 2, explanation: "Land heats/cools faster than water, creating sea breezes by day and land breezes at night." },
    3: { correctIndex: 1, explanation: "Fans increase the convective heat transfer coefficient by removing heated air boundary layers." },
    4: { correctIndex: 1, explanation: "Convection ovens blow away the cool boundary layer, bringing hot air directly to food surfaces." },
    5: { correctIndex: 2, explanation: "Thermohaline circulation is planetary-scale convection driven by temperature and salinity differences." },
    6: { correctIndex: 1, explanation: "Fans remove warm air layers and speed evaporation, cooling your body (not the room)." },
    7: { correctIndex: 1, explanation: "Mantle convection shows rock can flow like fluid over millions of years, driving plate tectonics." },
    8: { correctIndex: 0, explanation: "Hot/cold aisle containment prevents mixing of exhaust and intake air for optimal cooling." },
    9: { correctIndex: 1, explanation: "Q = hAΔT shows convective heat transfer depends on area, temperature difference, and transfer coefficient." }
  },

  // =============================================================
  // CORIOLIS EFFECT
  // =============================================================
  "coriolis_effect": {
    0: { correctIndex: 1, explanation: "The Coriolis effect is an apparent deflection due to Earth's rotation, not a real force." },
    1: { correctIndex: 2, explanation: "In the Northern Hemisphere, the Coriolis effect deflects moving objects to the RIGHT." },
    2: { correctIndex: 2, explanation: "Air rushing toward low pressure gets deflected right (NH), creating counterclockwise rotation." },
    3: { correctIndex: 1, explanation: "Coriolis force depends on sin(latitude) - zero at equator, maximum at poles." },
    4: { correctIndex: 2, explanation: "At sink scales, Coriolis is millions of times weaker than other factors like drain shape." },
    5: { correctIndex: 1, explanation: "Fictitious forces appear in non-inertial (rotating) reference frames and disappear in inertial frames." },
    6: { correctIndex: 2, explanation: "Coriolis creates Earth's major wind belts: trade winds, westerlies, and polar easterlies." },
    7: { correctIndex: 1, explanation: "Artillery shells can be deflected several meters over 20+ km due to Coriolis effect." },
    8: { correctIndex: 2, explanation: "Coriolis force F = 2m(ω × v) is proportional to velocity - faster objects deflect more." },
    9: { correctIndex: 2, explanation: "Bathtubs are too small for Coriolis - only large-scale, long-duration phenomena are affected." }
  },

  // =============================================================
  // DAMPED OSCILLATIONS
  // =============================================================
  "damped_oscillations": {
    0: { correctIndex: 2, explanation: "Car suspensions are designed to be critically damped (or slightly underdamped for sportier feel)." },
    1: { correctIndex: 1, explanation: "With ζ = 0.3 (less than 1), the system is underdamped." },
    2: { correctIndex: 2, explanation: "With ζ = 3 (overdamped), the door returns to closed position without oscillating, but very slowly." },
    3: { correctIndex: 2, explanation: "Critical damping (ζ = 1) returns to equilibrium in the minimum possible time without oscillating." },
    4: { correctIndex: 2, explanation: "The damping ratio ζ = c / (2√(mk)). Increasing c directly increases ζ." },
    5: { correctIndex: 0, explanation: "Air resistance acts as light damping (ζ << 1), slowly removing energy each oscillation." },
    6: { correctIndex: 2, explanation: "Multiple oscillations with decreasing amplitude is the signature of an underdamped system (ζ < 1)." },
    7: { correctIndex: 1, explanation: "Slightly underdamped response (ζ ≈ 0.7) creates one small overshoot that helps identify where the needle settles." },
    8: { correctIndex: 0, explanation: "Overdamped systems respond slowly - during earthquakes, the building can't dissipate energy fast enough." },
    9: { correctIndex: 1, explanation: "Screen protectors with shock-absorbing layers provide damping that converts impact energy into heat." }
  },

  // =============================================================
  // DRAG FORCE
  // =============================================================
  "drag_force": {
    0: { correctIndex: 1, explanation: "Drag force depends on the square of velocity: F = ½ρv²CdA. Doubling speed quadruples drag." },
    1: { correctIndex: 2, explanation: "Spread eagle creates MORE air resistance. Less area = less air resistance = faster falling." },
    2: { correctIndex: 0, explanation: "A represents cross-sectional area in the drag equation." },
    3: { correctIndex: 1, explanation: "Dimples create turbulent airflow that stays attached longer, reducing the low-pressure wake." },
    4: { correctIndex: 2, explanation: "At highway speeds, about 50% or more of a car's energy fights air resistance." },
    5: { correctIndex: 0, explanation: "Teardrop/streamlined shapes have the lowest drag coefficient." },
    6: { correctIndex: 1, explanation: "Higher density = more drag force according to F = ½ρv²CdA." },
    7: { correctIndex: 2, explanation: "Drag coefficient (Cd) measures an object's shape efficiency." },
    8: { correctIndex: 1, explanation: "Cyclists tuck during time trials to reduce frontal area and drag." },
    9: { correctIndex: 0, explanation: "Turbulent flow delaying separation creates the drag crisis effect." }
  },

  // =============================================================
  // EDDY CURRENTS
  // =============================================================
  "eddy_currents": {
    0: { correctIndex: 1, explanation: "Eddy currents are induced in conductors when they experience a changing magnetic field." },
    1: { correctIndex: 1, explanation: "Lenz's Law states that induced currents create a magnetic field that opposes the change." },
    2: { correctIndex: 2, explanation: "Eddy currents create opposing magnetic field, acting as a brake." },
    3: { correctIndex: 2, explanation: "The resistance of the conductor causes eddy currents to dissipate energy as heat." },
    4: { correctIndex: 2, explanation: "Copper is an excellent electrical conductor, allowing large eddy currents." },
    5: { correctIndex: 1, explanation: "Laminated cores (thin sheets with insulation) break up eddy current paths." },
    6: { correctIndex: 1, explanation: "Electromagnetic brakes have no physical contact, so there's no wear on brake pads." },
    7: { correctIndex: 2, explanation: "Faster motion means faster rate of change of magnetic flux, inducing stronger eddy currents." },
    8: { correctIndex: 2, explanation: "Induction cooktops create rapidly changing magnetic fields that induce eddy currents in cookware." },
    9: { correctIndex: 1, explanation: "Lenz's Law is a consequence of energy conservation." }
  },

  // =============================================================
  // ELASTIC POTENTIAL ENERGY
  // =============================================================
  "elastic_potential_energy": {
    0: { correctIndex: 2, explanation: "Elastic PE = ½kx². Since energy depends on x², doubling displacement quadruples energy." },
    1: { correctIndex: 2, explanation: "From PE = ½kx²: 50 = ½ × k × (0.5)². Solving: k = 400 N/m." },
    2: { correctIndex: 1, explanation: "PE = ½ × 50,000 × (0.04)² = 40 Joules." },
    3: { correctIndex: 1, explanation: "Energy is conserved - elastic PE converts to kinetic energy as the ball accelerates." },
    4: { correctIndex: 2, explanation: "Since PE ∝ x², and B has 2× the displacement: (20/10)² = 4." },
    5: { correctIndex: 1, explanation: "At max compression, F = kx where F = mg = 400N. So k = 400 / 0.08 = 5,000 N/m." },
    6: { correctIndex: 2, explanation: "All PE converts to KE: ½mv² = 0.5J. So v = √(2 × 0.5 / 0.01) = 10 m/s." },
    7: { correctIndex: 1, explanation: "Energy is conserved - the 10J went into vibration of bow limbs, sound waves, and heat." },
    8: { correctIndex: 1, explanation: "At lowest point, spring force equals weight: kx = mg. So k = 600 / 20 = 30 N/m." },
    9: { correctIndex: 1, explanation: "Elastic PE = ½kx² depends on spring constant and displacement, not thermal energy." }
  },

  // =============================================================
  // ELECTRIC FIELD
  // =============================================================
  "electric_field": {
    0: { correctIndex: 1, explanation: "Electric field direction is defined as the direction a positive test charge would be pushed." },
    1: { correctIndex: 1, explanation: "For a negative charge, the force is opposite to the field direction (F = qE)." },
    2: { correctIndex: 1, explanation: "Like charges repel, so their fields push against each other, creating a zero-field point between them." },
    3: { correctIndex: 2, explanation: "Inside a conductor in electrostatic equilibrium, the electric field is always zero." },
    4: { correctIndex: 2, explanation: "For a uniform field between parallel plates, E = V/d = 1000V / 0.005m = 200,000 V/m." },
    5: { correctIndex: 0, explanation: "E = kq/r² = (8.99×10⁹)(2×10⁻⁶)/(3)² ≈ 2000 N/C." },
    6: { correctIndex: 2, explanation: "Unlike a single charge (1/r²), a dipole's field falls off as 1/r³." },
    7: { correctIndex: 1, explanation: "Field lines point toward negative charges (direction a positive test charge would move)." },
    8: { correctIndex: 2, explanation: "Force F = qE is the same, but a = F/m and electron mass is ~1836× smaller than proton." },
    9: { correctIndex: 1, explanation: "Electric fields exert precise, controllable forces on charged particles (F = qE)." }
  },

  // =============================================================
  // ELECTROMAGNETIC INDUCTION
  // =============================================================
  "electromagnetic_induction": {
    0: { correctIndex: 1, explanation: "Lenz's Law: induced current opposes the change. Moving magnet away decreases flux, inducing opposite current." },
    1: { correctIndex: 0, explanation: "EMF = -N(dΦ/dt). Faster rotation means higher dΦ/dt, directly proportional to frequency." },
    2: { correctIndex: 2, explanation: "EMF = -N(dΦ/dt) shows induced voltage is proportional to turns (N). 100 turns = 2× the EMF of 50 turns." },
    3: { correctIndex: 2, explanation: "Wireless charging uses electromagnetic induction - changing magnetic field induces current in phone's coil." },
    4: { correctIndex: 2, explanation: "Changing field induces eddy currents that create opposing magnetic field (Lenz's Law), causing repulsion." },
    5: { correctIndex: 1, explanation: "Transformer ratio: V₂/V₁ = N₂/N₁. V₂ = 120V × (50/500) = 12V." },
    6: { correctIndex: 2, explanation: "Metal detectors use oscillating magnetic field that induces eddy currents in metal objects." },
    7: { correctIndex: 2, explanation: "Induction cooktops induce eddy currents in conductive cookware, which heats due to resistance." },
    8: { correctIndex: 1, explanation: "Falling magnet creates changing flux, inducing eddy currents that oppose its motion (Lenz's Law)." },
    9: { correctIndex: 1, explanation: "Power loss = I²R. Higher voltage means lower current for same power, reducing losses." }
  },

  // =============================================================
  // ENERGY CONSERVATION
  // =============================================================
  "energy_conservation": {
    0: { correctIndex: 1, explanation: "From energy conservation: when KE = PE, the object is at half its original height." },
    1: { correctIndex: 1, explanation: "Without motors, the marble can't go higher than its starting point due to energy conservation." },
    2: { correctIndex: 2, explanation: "From v² = 2gh, if height doubles, velocity increases by √2." },
    3: { correctIndex: 1, explanation: "Friction converts mechanical energy to thermal energy (heat)." },
    4: { correctIndex: 2, explanation: "At the lowest point, PE is minimum and KE is maximum." },
    5: { correctIndex: 2, explanation: "Both objects have the same speed at the bottom regardless of mass: v = √(2gh)." },
    6: { correctIndex: 1, explanation: "All PE converts to KE: 100J PE becomes 100J KE." },
    7: { correctIndex: 3, explanation: "Energy distribution depends on height and velocity at each position." },
    8: { correctIndex: 2, explanation: "Hydroelectric power converts gravitational PE to KE of falling water, then to electrical energy." },
    9: { correctIndex: 1, explanation: "Without friction, a pendulum returns to exactly the starting height." }
  },

  // =============================================================
  // ENTROPY
  // =============================================================
  "entropy": {
    0: { correctIndex: 2, explanation: "Mixing always increases entropy because the number of possible microstates dramatically increases." },
    1: { correctIndex: 1, explanation: "Heat flowing from hot to cold is irreversible and increases total entropy." },
    2: { correctIndex: 2, explanation: "Phase change to liquid increases entropy because molecules have more possible arrangements." },
    3: { correctIndex: 1, explanation: "The second law states that heat spontaneously flows from hot to cold, not vice versa." },
    4: { correctIndex: 1, explanation: "It's not forbidden - just incredibly improbable with 52! ≈ 8×10⁶⁷ possible arrangements." },
    5: { correctIndex: 1, explanation: "Cells are open systems that take in low-entropy food and export high-entropy waste and heat." },
    6: { correctIndex: 1, explanation: "Erasing information increases entropy, requiring at least kT·ln(2) joules of heat release." },
    7: { correctIndex: 1, explanation: "Kelvin-Planck: impossible to extract work from a single heat reservoir in a cycle." },
    8: { correctIndex: 1, explanation: "As entropy approaches maximum, temperature gradients disappear, no work can be extracted." },
    9: { correctIndex: 1, explanation: "Negative ΔG means the process is spontaneous at constant T and P." }
  },

  // =============================================================
  // FORCED OSCILLATIONS
  // =============================================================
  "forced_oscillations": {
    0: { correctIndex: 2, explanation: "Push at the swing's natural frequency (once per swing cycle) for maximum amplitude." },
    1: { correctIndex: 1, explanation: "The singer's voice matches the glass's natural resonant frequency." },
    2: { correctIndex: 2, explanation: "Wind vortices matched the bridge's natural frequency, causing resonance." },
    3: { correctIndex: 1, explanation: "Electrical resonance in an LC circuit tuned to 101.5 MHz." },
    4: { correctIndex: 2, explanation: "Engine vibration frequency matches a structural resonance at that RPM." },
    5: { correctIndex: 2, explanation: "MRI uses resonance of hydrogen nuclei (protons) in a magnetic field." },
    6: { correctIndex: 1, explanation: "Sound waves resonate with the room's dimensions at certain frequencies." },
    7: { correctIndex: 1, explanation: "The resonance curve gets shorter and wider with more damping." },
    8: { correctIndex: 1, explanation: "The spin speed passes through the machine's resonant frequency." },
    9: { correctIndex: 1, explanation: "Resonance from synchronized footsteps historically caused bridge collapses." }
  },

  // =============================================================
  // GAS LAWS
  // =============================================================
  "gas_laws": {
    0: { correctIndex: 1, explanation: "Halving volume at constant temperature doubles the pressure (Boyle's Law: PV = constant)." },
    1: { correctIndex: 1, explanation: "Boyle's Law: P and V are inversely proportional at constant temperature." },
    2: { correctIndex: 1, explanation: "Heating a gas at constant volume increases its pressure (Gay-Lussac's Law)." },
    3: { correctIndex: 1, explanation: "Charles's Law relates volume and temperature at constant pressure." },
    4: { correctIndex: 0, explanation: "The ideal gas law is PV = nRT." },
    5: { correctIndex: 1, explanation: "Extrapolating Charles's Law to zero volume gives absolute zero temperature." },
    6: { correctIndex: 2, explanation: "Adding gas at constant T and V keeps pressure the same if we also increase container size proportionally." },
    7: { correctIndex: 1, explanation: "Chips bags expand at high altitude because atmospheric pressure decreases." },
    8: { correctIndex: 3, explanation: "All forms (PV = nRT, PV/T = constant, etc.) are equivalent expressions." },
    9: { correctIndex: 1, explanation: "Real gases behave most ideally at high pressure and low temperature." }
  },

  // =============================================================
  // GYROSCOPE STABILITY
  // =============================================================
  "gyroscope_stability": {
    0: { correctIndex: 1, explanation: "Angular momentum is the rotational equivalent of linear momentum (L = Iω)." },
    1: { correctIndex: 2, explanation: "Angular momentum is conserved - changing direction requires external torque." },
    2: { correctIndex: 2, explanation: "Without spin, a gyroscope loses stability and eventually falls." },
    3: { correctIndex: 1, explanation: "Gyroscopic effects from spinning wheels help bicycles resist tipping." },
    4: { correctIndex: 2, explanation: "Faster spin = more angular momentum = greater stability." },
    5: { correctIndex: 1, explanation: "Spacecraft use reaction wheels and control moment gyroscopes for orientation." },
    6: { correctIndex: 1, explanation: "Angular momentum prevents the axis from falling until friction slows it." },
    7: { correctIndex: 1, explanation: "Moment of inertia measures how mass is distributed relative to the rotation axis." },
    8: { correctIndex: 1, explanation: "Flywheels store rotational energy and smooth out power delivery." },
    9: { correctIndex: 1, explanation: "Applied torque causes precession - rotation perpendicular to the applied force." }
  },

  // =============================================================
  // HOOKE'S LAW
  // =============================================================
  "hookes_law": {
    0: { correctIndex: 0, explanation: "Spring A (stiffer spring with higher k) stretches less per unit force." },
    1: { correctIndex: 1, explanation: "F = kx, so F = 200 N/m × 3m = 600 N." },
    2: { correctIndex: 2, explanation: "k = F/x = 800N / 0.02m = 40,000 N/m." },
    3: { correctIndex: 1, explanation: "Beyond the elastic limit, plastic deformation occurs - molecular bonds reorganize permanently." },
    4: { correctIndex: 2, explanation: "x = F/k = 100N / 500 N/m = 0.2m = 20 cm." },
    5: { correctIndex: 2, explanation: "x = F/k = 50N / 1000 N/m = 0.05m = 5 cm." },
    6: { correctIndex: 2, explanation: "PE = ½kx² = ½ × 500 × (0.1)² = 2.5 J." },
    7: { correctIndex: 1, explanation: "x = F/k = 60N / 4000 N/m = 0.015m = 15 mm." },
    8: { correctIndex: 2, explanation: "Maximum force and deceleration occur at maximum compression of the trampoline." },
    9: { correctIndex: 1, explanation: "Running shoes need relatively soft springs for controlled movement and energy absorption." }
  },

  // =============================================================
  // HYDROSTATIC PRESSURE
  // =============================================================
  "hydrostatic_pressure": {
    0: { correctIndex: 0, explanation: "At 20m depth, pressure ≈ 2 atm + 1 atm surface = 3 atm total (P = ρgh)." },
    1: { correctIndex: 0, explanation: "Hydrostatic Paradox: pressure depends only on depth, not volume. 50m creates 10× more pressure than 5m." },
    2: { correctIndex: 0, explanation: "At 30m (4 atm), nitrogen dissolves at 4× surface rate. Rapid ascent causes decompression sickness." },
    3: { correctIndex: 0, explanation: "At 180m, pressure is ~18 atm. Dam structure must resist enormous sideways force (P = ρgh)." },
    4: { correctIndex: 0, explanation: "On Earth, hydrostatic pressure keeps blood in legs. In microgravity, blood redistributes evenly." },
    5: { correctIndex: 0, explanation: "Pascal's principle: F₂ = F₁ × (A₂/A₁) = 50 × (0.5/0.01) = 2,500 N." },
    6: { correctIndex: 0, explanation: "At Mariana Trench: P = 1025 × 9.81 × 10900 ≈ 1,086 atm." },
    7: { correctIndex: 0, explanation: "10m head difference creates ~1 atm driving pressure, enough for 10th floor." },
    8: { correctIndex: 0, explanation: "Blood column P = ρgh ≈ 78 mmHg higher at ankles than arms." },
    9: { correctIndex: 0, explanation: "Pascal's barrel: 10m water column creates ~1 atm regardless of tube volume." }
  },

  // =============================================================
  // INCLINED PLANE
  // =============================================================
  "inclined_plane": {
    0: { correctIndex: 2, explanation: "Gravity stays constant, but the component along the ramp (mg·sin θ) increases with steeper angles." },
    1: { correctIndex: 1, explanation: "Normal force N = mg·cos(θ). As θ increases, cos(θ) decreases, so normal force decreases." },
    2: { correctIndex: 1, explanation: "Without friction, a = g·sin(θ) = 9.8 × sin(30°) = 9.8 × 0.5 = 4.9 m/s²." },
    3: { correctIndex: 1, explanation: "Kinetic friction acts up the ramp (opposing motion), reducing net acceleration." },
    4: { correctIndex: 2, explanation: "At 90°, sin(90°) = 1, giving maximum acceleration of g (free fall)." },
    5: { correctIndex: 1, explanation: "Zigzag roads reduce slope angle, decreasing the gravity component vehicles must overcome." },
    6: { correctIndex: 1, explanation: "If static friction exceeds mg·sin(θ), the object won't move. There's a critical angle." },
    7: { correctIndex: 2, explanation: "The parallel component of gravity is F_parallel = mg × sin(θ)." },
    8: { correctIndex: 1, explanation: "Acceleration a = g·sin(θ) doesn't depend on mass - gravity and inertia both scale with mass." },
    9: { correctIndex: 1, explanation: "Crouching reduces air resistance (drag), allowing higher speeds." }
  },

  // =============================================================
  // INERTIA
  // =============================================================
  "inertia": {
    0: { correctIndex: 1, explanation: "Newton's First Law: an object at rest stays at rest unless acted upon by an external force." },
    1: { correctIndex: 1, explanation: "The coin has inertia - it resists change. When card is flicked away, the coin stays still and drops." },
    2: { correctIndex: 1, explanation: "A fast flick minimizes the time friction can transfer horizontal motion to the coin." },
    3: { correctIndex: 1, explanation: "Passengers' bodies continue moving forward due to inertia when the bus stops." },
    4: { correctIndex: 1, explanation: "Quick motion minimizes friction time. The dishes' inertia keeps them in place." },
    5: { correctIndex: 1, explanation: "In a crash, passengers continue forward due to inertia. Seatbelts provide the stopping force." },
    6: { correctIndex: 1, explanation: "Ice has very low friction - the puck continues in a straight line (Newton's First Law)." },
    7: { correctIndex: 1, explanation: "Your body continues straight due to inertia while the car turns, making you feel pushed outward." },
    8: { correctIndex: 1, explanation: "A smooth, light card has less friction and accelerates faster, helping the coin stay in place." },
    9: { correctIndex: 2, explanation: "In space with no friction, the ball continues moving forever - pure inertia." }
  },

  // =============================================================
  // KINETIC THEORY OF GASES
  // =============================================================
  "kinetic_theory_gases": {
    0: { correctIndex: 0, explanation: "v_rms ∝ √T. 10% temperature increase → √(1.1) ≈ 5% speed increase." },
    1: { correctIndex: 0, explanation: "v_rms = √(3kT/m). At same T, lighter molecules move faster: v_He/v_Ar = √(40/4) ≈ 3.2." },
    2: { correctIndex: 0, explanation: "PV = NkT. At constant T and N, halving V doubles P." },
    3: { correctIndex: 0, explanation: "Individual molecules move fast but randomly in all directions - net momentum transfer is zero." },
    4: { correctIndex: 0, explanation: "P/T = constant. P₂ = 32 × (323/293) = 35.3 psi." },
    5: { correctIndex: 0, explanation: "Maxwell-Boltzmann is asymmetric with a high-speed tail: RMS > average > most probable." },
    6: { correctIndex: 0, explanation: "Average KE depends only on T: KE = (3/2)kT. Same T = same KE regardless of mass." },
    7: { correctIndex: 0, explanation: "Third law: absolute zero cannot be reached in finite steps. Quantum zero-point energy also exists." },
    8: { correctIndex: 0, explanation: "Expansion against pressure does work, taking energy from the gas, cooling it (adiabatic expansion)." },
    9: { correctIndex: 0, explanation: "Effusion rate ∝ 1/√m. Lighter gases effuse faster (used in uranium enrichment)." }
  },

  // =============================================================
  // KIRCHHOFF'S LAWS
  // =============================================================
  "kirchhoffs_laws": {
    0: { correctIndex: 0, explanation: "KCL: If 2.5A enters and 2.0A leaves through two branches, the third must carry 0.5A." },
    1: { correctIndex: 0, explanation: "KVL: +12V - 4V - 5V - V₃ = 0, therefore V₃ = 3V." },
    2: { correctIndex: 0, explanation: "KCL: 3A + 2.5A + 4A = 9.5A must leave the junction (charge conservation)." },
    3: { correctIndex: 0, explanation: "In parallel, both branches connect to the same nodes - by KVL, both have 9V across them." },
    4: { correctIndex: 0, explanation: "KCL: Total load = 8A + 2A + 1.5A = 11.5A, so alternator supplies 11.5A." },
    5: { correctIndex: 0, explanation: "KVL: +24V - 6V + 3V - 15V + V_remaining = 0. V_remaining = -6V (6V drop)." },
    6: { correctIndex: 0, explanation: "In series, same current flows everywhere: I = V/R_total = 10V/200Ω = 50mA." },
    7: { correctIndex: 0, explanation: "Each independent loop provides one unique KVL equation." },
    8: { correctIndex: 0, explanation: "At balance, zero galvanometer current means current through R1 continues through R3." },
    9: { correctIndex: 0, explanation: "For N nodes, only (N-1) KCL equations are independent. Here: 5-1 = 4 equations." }
  },

  // =============================================================
  // COULOMBS LAW
  // =============================================================
  "coulombs_law": {
    0: { correctIndex: 1, explanation: "Like charges repel. Both positive spheres push apart with F = kq₁q₂/r² ≈ 8.1 N." },
    1: { correctIndex: 2, explanation: "F ∝ 1/r². Double distance → (1/2)² = 1/4 the force." },
    2: { correctIndex: 2, explanation: "The balloon repels electrons in the wall, leaving positive charges closer. Since F ∝ 1/r², closer positive charges create stronger attraction." },
    3: { correctIndex: 0, explanation: "F = kq²/r² = (8.99×10⁹)(1.6×10⁻¹⁹)²/(5.3×10⁻¹¹)² ≈ 8.2×10⁻⁸ N." },
    4: { correctIndex: 2, explanation: "F ∝ q₁q₂. Setup A: |4×2| = 8. Setup B: |2×1| = 2. Ratio: 8/2 = 4." },
    5: { correctIndex: 2, explanation: "By symmetry, +q is equidistant from both +Q charges. Equal repulsive forces cancel." },
    6: { correctIndex: 1, explanation: "Charge concentrates at sharp points, creating intense fields that ionize air for corona discharge." },
    7: { correctIndex: 2, explanation: "Like charges repel and spread as far apart as possible—on the outer surface." },
    8: { correctIndex: 1, explanation: "F = qE. The electric field deflects charged droplets. Varying charge controls landing position." },
    9: { correctIndex: 2, explanation: "Negatively charged particles experience Coulomb force toward the relatively positive ground plates." }
  },

  // =============================================================
  // DAMPING
  // =============================================================
  "damping": {
    0: { correctIndex: 1, explanation: "Real oscillators always lose energy to friction and air resistance. This energy is converted to heat, causing the amplitude to gradually decay." },
    1: { correctIndex: 1, explanation: "Optimal car suspension is slightly underdamped to critically damped. This allows the car to return to equilibrium quickly without excessive bouncing." },
    2: { correctIndex: 2, explanation: "An underdamped door would swing past closed, bounce back open, and oscillate before settling. Critical damping ensures the door closes once and stays closed." },
    3: { correctIndex: 2, explanation: "Honey's high viscosity provides strong damping. When the pendulum doesn't oscillate at all and returns very slowly to equilibrium, it's overdamped." },
    4: { correctIndex: 2, explanation: "Water adds damping (viscous drag) which causes faster amplitude decay. Additionally, the damping slightly reduces the natural frequency." },
    5: { correctIndex: 2, explanation: "Quality factor Q measures how many radians of oscillation occur before amplitude drops to 1/e." },
    6: { correctIndex: 1, explanation: "Water adds significant viscous damping to the tuning fork's vibration. The energy is dissipated much faster into the water." },
    7: { correctIndex: 1, explanation: "At resonance, amplification = 1/(2ζ). Higher damping dramatically reduces the dangerous amplification during earthquakes." },
    8: { correctIndex: 1, explanation: "Damped oscillation combines oscillatory motion (cosine) with exponential decay (e^(-γt))." },
    9: { correctIndex: 1, explanation: "Damping ratio ζ = 1 is exactly critical damping - the boundary between oscillatory and non-oscillatory motion." }
  },

  // =============================================================
  // DIFFUSION CONVECTION
  // =============================================================
  "diffusion_convection": {
    0: { correctIndex: 1, explanation: "Diffusion occurs due to random molecular motion (Brownian motion). Molecules naturally spread from high to low concentration areas." },
    1: { correctIndex: 1, explanation: "In hot water, temperature gradients create convection currents that actively transport the dye throughout the liquid." },
    2: { correctIndex: 1, explanation: "Convection occurs because warm fluid is less dense and rises, while cooler fluid sinks, creating circular current patterns." },
    3: { correctIndex: 1, explanation: "Pure diffusion dominates when there are no temperature gradients. In a uniformly heated liquid, there's no density difference to drive convection." },
    4: { correctIndex: 1, explanation: "Convection is much faster because it involves bulk fluid movement, transporting large amounts of material simultaneously." },
    5: { correctIndex: 1, explanation: "The lava lamp works by convection. The light bulb heats the wax at the bottom, making it less dense so it rises." },
    6: { correctIndex: 1, explanation: "Ocean currents are massive convection systems driven by temperature and salinity differences." },
    7: { correctIndex: 1, explanation: "Low-placed radiators heat the air near the floor. This warm air rises, creating convection currents throughout the room." },
    8: { correctIndex: 2, explanation: "Higher temperature means faster molecular motion, which speeds up diffusion." },
    9: { correctIndex: 1, explanation: "In still air without temperature gradients, perfume spreads primarily through diffusion." }
  },

  // =============================================================
  // DOPPLER EFFECT
  // =============================================================
  "doppler_effect": {
    0: { correctIndex: 2, explanation: "Using f' = f × v/(v - v_src) = 700 × 340/(340-30) ≈ 768 Hz. The approaching source compresses wavelengths!" },
    1: { correctIndex: 1, explanation: "At the perpendicular moment, the train's velocity component toward/away from you is ZERO. No Doppler shift occurs!" },
    2: { correctIndex: 1, explanation: "The wave is shifted once when hitting the moving car, then shifted AGAIN when reflecting back. Double-Doppler effect!" },
    3: { correctIndex: 1, explanation: "Longer wavelength (redshift) means the galaxy is receding. This cosmic Doppler effect proved the universe is expanding!" },
    4: { correctIndex: 2, explanation: "Double Doppler! Bats use the frequency shift to detect prey motion!" },
    5: { correctIndex: 2, explanation: "Both motions contribute! Walking toward + ambulance approaching = maximum frequency increase!" },
    6: { correctIndex: 2, explanation: "At supersonic speeds, the jet outruns its own sound waves creating a shock wave—the sonic boom!" },
    7: { correctIndex: 1, explanation: "Red blood cells act as millions of tiny moving reflectors! The frequency shift reveals blood velocity." },
    8: { correctIndex: 1, explanation: "Doppler radar measures wind velocity! Opposite-direction motions side-by-side = rotation signature for tornado detection!" },
    9: { correctIndex: 1, explanation: "Higher frequency = more Doppler shift per unit velocity, enabling precision measurement." }
  },

  // =============================================================
  // DROPLET BREAKUP
  // =============================================================
  "droplet_breakup": {
    0: { correctIndex: 1, explanation: "The Rayleigh-Plateau instability causes cylindrical liquid jets to break into droplets due to surface tension." },
    1: { correctIndex: 2, explanation: "Surface tension drives the system toward minimum surface area (spheres)." },
    2: { correctIndex: 2, explanation: "For a given volume, a sphere has the minimum surface area compared to any other shape." },
    3: { correctIndex: 1, explanation: "Surface tension amplifies small perturbations until the stream breaks—it actually causes the instability!" },
    4: { correctIndex: 2, explanation: "The wavelength of the instability is related to jet radius λ ≈ 9r, determining typical droplet size." },
    5: { correctIndex: 1, explanation: "Higher viscosity slows down the breakup process and can create 'beads on a string' patterns." },
    6: { correctIndex: 1, explanation: "Inkjet printers use controlled piezoelectric pulses that trigger the Rayleigh-Plateau instability." },
    7: { correctIndex: 1, explanation: "When the perturbation wavelength is longer than needed for instability, it is damped and the jet remains stable." },
    8: { correctIndex: 1, explanation: "Uniform droplets ensure consistent coverage and dosing in spray applications." },
    9: { correctIndex: 1, explanation: "Atomization is the process of breaking liquid into fine droplets, driven by the Rayleigh-Plateau instability." }
  },

  // =============================================================
  // GYROSCOPIC PRECESSION
  // =============================================================
  "gyroscopic_precession": {
    0: { correctIndex: 1, explanation: "When you apply a torque, it changes the DIRECTION of the angular momentum vector. The wheel moves perpendicular to both torque and spin axis—this is precession!" },
    1: { correctIndex: 2, explanation: "The push (torque) causes the gyroscope to precess—its axis slowly rotates in a circle. The faster it spins, the slower the precession." },
    2: { correctIndex: 1, explanation: "Precession rate Ω = τ/L. With same torque, the slower wheel has less angular momentum, so it precesses FASTER." },
    3: { correctIndex: 1, explanation: "As spin decreases, angular momentum L decreases. Since Ω = τ/L, lower L means faster precession and larger wobble." },
    4: { correctIndex: 1, explanation: "Angular momentum conservation! The rotor spins one way, so without the tail rotor, the body would spin opposite." },
    5: { correctIndex: 1, explanation: "Conservation of angular momentum! If a wheel speeds up one direction, the spacecraft rotates opposite. No fuel needed!" },
    6: { correctIndex: 1, explanation: "Their body acts as a gyroscope! Tilting while spinning creates precession forces." },
    7: { correctIndex: 1, explanation: "The wheels' angular momentum resists tilting and turning. This gyroscopic stability helps keep the bike upright." },
    8: { correctIndex: 0, explanation: "Earth bulges at the equator. The Sun and Moon exert torque on this bulge, causing Earth's axis to precess slowly." },
    9: { correctIndex: 1, explanation: "When waves try to roll the ship, the flywheel precesses, generating torques opposing the roll." }
  },

  // =============================================================
  // HAND WARMER
  // =============================================================
  "hand_warmer": {
    0: { correctIndex: 1, explanation: "Latent heat of fusion is the energy released (freezing) or absorbed (melting) during the solid-liquid phase transition." },
    1: { correctIndex: 2, explanation: "Supersaturated/supercooled solutions need a 'seed' or nucleation site to start crystallization." },
    2: { correctIndex: 1, explanation: "The disc's deformation creates a tiny crystal that acts as a nucleation site. Crystallization spreads rapidly, releasing latent heat." },
    3: { correctIndex: 1, explanation: "As crystals form, latent heat is released, heating the solution to its melting point (54°C)." },
    4: { correctIndex: 2, explanation: "Heating the crystallized sodium acetate above 54°C re-dissolves the crystals, making it reusable." },
    5: { correctIndex: 1, explanation: "Chemical warmers use iron oxidation (rusting), which is irreversible." },
    6: { correctIndex: 1, explanation: "Latent heat is energy per unit mass. When 1 kg of liquid sodium acetate crystallizes, it releases 264 kJ." },
    7: { correctIndex: 1, explanation: "Once crystallization starts, each new crystal surface acts as a nucleation site, creating a rapid chain reaction." },
    8: { correctIndex: 1, explanation: "Supercooled liquids remain liquid below their freezing point due to lack of nucleation sites." },
    9: { correctIndex: 1, explanation: "Melting absorbs latent heat from surroundings. Ice packs stay at 0°C while melting." }
  },

  // =============================================================
  // HELIUM BALLOON CAR
  // =============================================================
  "helium_balloon_car": {
    0: { correctIndex: 1, explanation: "The helium balloon moves forward! When the car accelerates, denser air is pushed backward, creating higher pressure at the back." },
    1: { correctIndex: 2, explanation: "The key is relative density. Helium is less dense than air, so it moves opposite to where the air is being pushed." },
    2: { correctIndex: 1, explanation: "Acceleration creates a pressure gradient: air piles up at the back (higher pressure) and thins at the front (lower pressure)." },
    3: { correctIndex: 2, explanation: "Einstein's Equivalence Principle states that the effects of acceleration are indistinguishable from gravity." },
    4: { correctIndex: 1, explanation: "During braking (negative acceleration), the pressure gradient reverses. The balloon moves backward toward lower pressure." },
    5: { correctIndex: 1, explanation: "In the accelerating car's reference frame, objects experience a backward pseudo-force." },
    6: { correctIndex: 1, explanation: "The bubble moves forward, just like the helium balloon! It's less dense than water." },
    7: { correctIndex: 1, explanation: "At constant velocity, there's no acceleration, so no pressure gradient develops inside the car." },
    8: { correctIndex: 2, explanation: "An upward-accelerating elevator creates stronger effective gravity, making the balloon rise even faster." },
    9: { correctIndex: 0, explanation: "The balloon moves INTO the turn (left). The centripetal acceleration points left, so air is pushed right." }
  },

  // =============================================================
  // INDUCTIVE KICKBACK
  // =============================================================
  "inductive_kickback": {
    0: { correctIndex: 1, explanation: "The collapsing magnetic field induces voltage (V = -L·di/dt)." },
    1: { correctIndex: 2, explanation: "The rate of current change (di/dt) is extremely fast when interrupted." },
    2: { correctIndex: 2, explanation: "Flyback diodes provide a safe path for current, clamping the voltage spike." },
    3: { correctIndex: 3, explanation: "About 40,000V (over 3,000x multiplication)." },
    4: { correctIndex: 1, explanation: "Controlled switching captures kickback energy to raise output voltage." },
    5: { correctIndex: 2, explanation: "The kickback spike can damage or destroy the Arduino." },
    6: { correctIndex: 2, explanation: "V = -L × (di/dt) is the inductor equation." },
    7: { correctIndex: 2, explanation: "10 kHz - 1 MHz (high frequency switching)." },
    8: { correctIndex: 1, explanation: "Inductance represents how much energy the magnetic field can store." },
    9: { correctIndex: 1, explanation: "Inductors store energy in magnetic fields that must be dissipated." }
  },

  // =============================================================
  // MOMENT OF INERTIA
  // =============================================================
  "moment_of_inertia": {
    0: { correctIndex: 1, explanation: "Angular momentum L is conserved when an ice skater pulls in their arms. No external torques act on the system." },
    1: { correctIndex: 1, explanation: "When a skater pulls in their arms, their moment of inertia decreases because the mass moves closer to the rotation axis." },
    2: { correctIndex: 1, explanation: "The moment of inertia depends on mass distribution relative to the rotation axis." },
    3: { correctIndex: 1, explanation: "L = Iω is the definition of angular momentum." },
    4: { correctIndex: 1, explanation: "A diver in the tuck position spins faster because their moment of inertia is smaller." },
    5: { correctIndex: 1, explanation: "When a neutron star collapses, its moment of inertia becomes much smaller. Since L is conserved, ω increases dramatically." },
    6: { correctIndex: 1, explanation: "A hollow sphere has all its mass at the surface, giving it the largest moment of inertia." },
    7: { correctIndex: 1, explanation: "I = mr² shows distance is squared. Doubling the distance quadruples the contribution." },
    8: { correctIndex: 1, explanation: "When an ice skater extends their arms, their moment of inertia increases. Since L is conserved, ω decreases." },
    9: { correctIndex: 1, explanation: "The equation I = mr² shows moment of inertia depends quadratically on distance from the rotation axis." }
  },

  // =============================================================
  // MOMENTUM CONSERVATION
  // =============================================================
  "momentum_conservation": {
    0: { correctIndex: 1, explanation: "The lighter cart moves faster. Since momentum is conserved, m₁v₁ = m₂v₂." },
    1: { correctIndex: 2, explanation: "Total momentum is conserved. Starting at rest = zero momentum. After pushing, momenta are equal and opposite." },
    2: { correctIndex: 1, explanation: "Using p₁ = p₂: 1kg × 6m/s = 3kg × v₂, so v₂ = 2 m/s." },
    3: { correctIndex: 1, explanation: "Friction transfers momentum to Earth. The Earth-cart system still conserves momentum." },
    4: { correctIndex: 2, explanation: "Both skaters move in opposite directions with equal and opposite momenta." },
    5: { correctIndex: 1, explanation: "Momentum (p) equals mass times velocity: p = mv." },
    6: { correctIndex: 1, explanation: "Gun recoil demonstrates momentum conservation. The bullet gains forward momentum, so the gun gains equal backward momentum." },
    7: { correctIndex: 1, explanation: "Same spring impulse but doubled masses means both velocities halve." },
    8: { correctIndex: 1, explanation: "Momentum is a vector because it has both magnitude and direction." },
    9: { correctIndex: 1, explanation: "Both move in opposite directions due to momentum conservation." }
  },

  // =============================================================
  // NEWTONS THIRD LAW
  // =============================================================
  "newtons_third_law": {
    0: { correctIndex: 1, explanation: "Newton's Third Law states that for every action, there's an equal and opposite reaction." },
    1: { correctIndex: 2, explanation: "The balloon pushes air out (action), and the air pushes the balloon forward (reaction)." },
    2: { correctIndex: 2, explanation: "More air means the balloon can push air out for a longer time, providing thrust for longer." },
    3: { correctIndex: 1, explanation: "When you push water backward (action), the water pushes you forward (reaction)." },
    4: { correctIndex: 1, explanation: "The gun pushes the bullet forward (action), and the bullet pushes the gun backward (reaction)." },
    5: { correctIndex: 1, explanation: "Rockets push exhaust gases out (action), and those gases push the rocket forward (reaction)." },
    6: { correctIndex: 1, explanation: "Action and reaction forces act on DIFFERENT objects." },
    7: { correctIndex: 0, explanation: "The bird pushes air downward (action), and the air pushes the bird upward (reaction)." },
    8: { correctIndex: 1, explanation: "When the person pushes the ball forward (action), the ball pushes the person backward (reaction)." },
    9: { correctIndex: 1, explanation: "When you push the tool kit away (action), it pushes you in the opposite direction (reaction)." }
  },

  // =============================================================
  // NON NEWTONIAN ARMOR
  // =============================================================
  "non_newtonian_armor": {
    0: { correctIndex: 1, explanation: "A non-Newtonian fluid is one whose viscosity changes with applied stress or shear rate." },
    1: { correctIndex: 2, explanation: "When you slowly push your finger into oobleck, it sinks in easily like a liquid." },
    2: { correctIndex: 1, explanation: "The starch particles jam together when hit quickly, unable to move past each other." },
    3: { correctIndex: 1, explanation: "Oobleck exhibits shear-thickening behavior - viscosity increases with stress/shear rate." },
    4: { correctIndex: 2, explanation: "Slow movements let you sink (particles rearrange), while fast movements cause jamming." },
    5: { correctIndex: 1, explanation: "Microscopic starch granules suspended in water give oobleck its special properties." },
    6: { correctIndex: 1, explanation: "The fluid stays flexible normally but hardens on impact to stop projectiles." },
    7: { correctIndex: 2, explanation: "About 2 parts cornstarch to 1 part water creates the optimal ratio." },
    8: { correctIndex: 1, explanation: "Vibrations cause oobleck to form tendrils and fingers that dance with the vibration pattern." },
    9: { correctIndex: 1, explanation: "Understanding non-Newtonian fluids helps design protective gear and smart materials." }
  },

  // =============================================================
  // ORBITAL MECHANICS
  // =============================================================
  "orbital_mechanics": {
    0: { correctIndex: 2, explanation: "The ISS is falling toward Earth but moving sideways fast enough to miss. It's in constant free fall." },
    1: { correctIndex: 1, explanation: "Without enough horizontal speed, objects hit the ground before completing an orbit." },
    2: { correctIndex: 2, explanation: "Astronauts are falling at the same rate as the station (free fall), so there's no floor pushing up on them." },
    3: { correctIndex: 1, explanation: "Orbital velocity decreases with altitude. The higher you go, the slower you must move to stay in orbit." }
  },

  // =============================================================
  // PASCAL LAW
  // =============================================================
  "pascal_law": {
    0: { correctIndex: 2, explanation: "Force multiplication = Area ratio = 500/5 = 100×. Output force = 200 N × 100 = 20,000 N." },
    1: { correctIndex: 2, explanation: "Pascal's Law transmits pressure equally throughout the fluid." },
    2: { correctIndex: 2, explanation: "Required multiplication = 1,000,000 ÷ 1,000 = 1,000×." },
    3: { correctIndex: 2, explanation: "Conservation of energy: Work In = Work Out. If force is multiplied 25×, distance must be divided by 25." },
    4: { correctIndex: 1, explanation: "Hydraulic oil is preferred because it's incompressible, lubricates components, and doesn't corrode metal." },
    5: { correctIndex: 1, explanation: "Pascal's Law requires an incompressible fluid. Air bubbles compress when pressure is applied." },
    6: { correctIndex: 2, explanation: "Mechanical advantage = 50/2 = 25×. The dentist needs to apply 980 ÷ 25 = 39.2 N per pump." },
    7: { correctIndex: 1, explanation: "Pascal's Law allows force multiplication through flexible hoses that bend around obstacles." },
    8: { correctIndex: 1, explanation: "Pascal's Law requires the fluid to remain liquid. Standard oil becomes too thick at -50°C." },
    9: { correctIndex: 1, explanation: "Pascal demonstrated that pressure = ρgh, independent of container width." }
  },

  // =============================================================
  // PHOTOELECTRIC EFFECT
  // =============================================================
  "photoelectric_effect": {
    0: { correctIndex: 1, explanation: "Blue light has higher frequency, meaning each photon carries more energy (E = hf)." },
    1: { correctIndex: 1, explanation: "Doubling intensity means twice as many photons per second, so twice as many electrons. Speed is unchanged." },
    2: { correctIndex: 1, explanation: "Einstein proposed that light energy comes in discrete quanta (photons), each with energy E = hf." },
    3: { correctIndex: 2, explanation: "Electrons escape only when photon energy exceeds work function." },
    4: { correctIndex: 1, explanation: "Classical wave theory assumed energy accumulates continuously. But light comes in photons with fixed energy." },
    5: { correctIndex: 2, explanation: "Using Einstein's equation: E_photon = Work Function + KE_max = 2.3 + 1.5 = 3.8 eV." },
    6: { correctIndex: 1, explanation: "Just like the photoelectric effect, electrons in solar cells need enough energy to escape their bound states." },
    7: { correctIndex: 1, explanation: "Photomultiplier tubes use the photoelectric effect: one photon releases one electron, which triggers more electrons." },
    8: { correctIndex: 1, explanation: "Since 6 × 10¹⁴ Hz > threshold of 5 × 10¹⁴ Hz, electrons will be emitted with excess energy as kinetic energy." },
    9: { correctIndex: 1, explanation: "Each photon hitting a pixel can free one electron. More photons = more freed electrons = brighter pixel." }
  },

  // =============================================================
  // POISSON RATIO
  // =============================================================
  "poisson_ratio": {
    0: { correctIndex: 1, explanation: "Poisson's ratio = lateral strain / axial strain. It measures how much material contracts sideways when stretched." },
    1: { correctIndex: 1, explanation: "Rubber with ν ≈ 0.5 is nearly incompressible - when stretched, volume stays constant." },
    2: { correctIndex: 1, explanation: "Auxetic materials have negative Poisson's ratio - they get WIDER when stretched." },
    3: { correctIndex: 1, explanation: "Cork has ν ≈ 0, so it doesn't bulge when compressed into the bottle." },
    4: { correctIndex: 1, explanation: "The theoretical maximum Poisson's ratio for isotropic materials is 0.5." },
    5: { correctIndex: 1, explanation: "When rubber (ν ≈ 0.5) is stretched, volume stays approximately constant." },
    6: { correctIndex: 1, explanation: "Auxetic materials achieve negative Poisson's ratio through re-entrant structural geometry." },
    7: { correctIndex: 1, explanation: "Steel typically has a Poisson's ratio around 0.3." },
    8: { correctIndex: 1, explanation: "Auxetic materials expand under impact, spreading force over a larger area." },
    9: { correctIndex: 1, explanation: "A positive ν indicates the material contracts laterally when stretched axially." }
  },

  // =============================================================
  // PRECESSION NUTATION
  // =============================================================
  "precession_nutation": {
    0: { correctIndex: 1, explanation: "Gravity creating torque on the tilted angular momentum causes precession." },
    1: { correctIndex: 1, explanation: "As a top spins faster, its precession rate decreases due to greater gyroscopic rigidity." },
    2: { correctIndex: 2, explanation: "Nutation is a wobbling motion superimposed on precession." },
    3: { correctIndex: 3, explanation: "Earth's axial precession takes approximately 26,000 years to complete one cycle." },
    4: { correctIndex: 2, explanation: "In zero gravity, without gravity-induced torque, a spinning top would spin with no precession." },
    5: { correctIndex: 1, explanation: "The torque causing precession acts perpendicular to angular momentum." },
    6: { correctIndex: 2, explanation: "Protons in MRI machines demonstrate precession in magnetic fields." },
    7: { correctIndex: 1, explanation: "Increasing a top's tilt angle increases the precession rate." },
    8: { correctIndex: 2, explanation: "The precession of Earth's axis causes changes in the North Star over millennia." },
    9: { correctIndex: 1, explanation: "Gyroscopic stabilization uses precession to resist tilting motions in ships." }
  },

  // =============================================================
  // PROJECTILE INDEPENDENCE
  // =============================================================
  "projectile_independence": {
    0: { correctIndex: 2, explanation: "d = ½gt² converts fall distance to reaction time. For 15cm: t = √(2×0.15/9.8) = 175ms." },
    1: { correctIndex: 0, explanation: "At the start, the car is stationary. The 140ms is pure reaction delay before pressing the throttle." },
    2: { correctIndex: 2, explanation: "60 mph = 88 ft/s. In 400ms: distance = 88 × 0.4 = 35.2 feet. Nearly 3 car lengths!" },
    3: { correctIndex: 1, explanation: "90 mph = 132 ft/s. Time = 60ft / 132ft/s = ~450ms. Batters have only ~300ms to decide!" },
    4: { correctIndex: 1, explanation: "With only 300ms flight time and 200ms reaction time, goalkeepers have just 100ms to move!" },
    5: { correctIndex: 3, explanation: "d = ½gt². For 250ms: d = 31cm. For 400ms: d = 78cm. Difference: 47cm." },
    6: { correctIndex: 1, explanation: "The IAAF rules state that any reaction time under 0.100 seconds is a false start." },
    7: { correctIndex: 1, explanation: "Human total: 450ms vs AEB: 300ms. Difference: 150ms. At 60 mph, this saves about 13 feet!" },
    8: { correctIndex: 2, explanation: "Total = Human reaction + Game lag + Monitor response = 180 + 16 + 5 = 201ms." },
    9: { correctIndex: 1, explanation: "A 100ms change in reaction time is clinically significant and may indicate cognitive decline." }
  },

  // =============================================================
  // RC TIME CONSTANT
  // =============================================================
  "rc_time_constant": {
    0: { correctIndex: 2, explanation: "The time constant τ = R × C (resistance times capacitance)." },
    1: { correctIndex: 1, explanation: "After 1τ, the capacitor charges to (1 - e⁻¹) ≈ 63.2% of the supply voltage." },
    2: { correctIndex: 2, explanation: "After 5τ, the capacitor reaches about 99.3% of its final value." },
    3: { correctIndex: 1, explanation: "Higher resistance means less current can flow, so it takes longer to charge the capacitor." },
    4: { correctIndex: 1, explanation: "Capacitor charging follows an exponential curve: V(t) = V₀(1 - e^(-t/τ))." },
    5: { correctIndex: 1, explanation: "Discharging follows an exponential decay: V(t) = V₀e^(-t/τ)." },
    6: { correctIndex: 3, explanation: "τ = RC = 10,000Ω × 0.0001F = 1 second." },
    7: { correctIndex: 1, explanation: "The resistor limits current flow, causing gradual charging." },
    8: { correctIndex: 0, explanation: "Camera flash capacitors slowly charge from the battery, then rapidly discharge for the flash." },
    9: { correctIndex: 2, explanation: "After 2τ: V = V₀(1 - e⁻²) ≈ 86.5%." }
  },

  // =============================================================
  // RESONANCE
  // =============================================================
  "resonance": {
    0: { correctIndex: 1, explanation: "Resonance occurs when the driving frequency matches the system's natural frequency." },
    1: { correctIndex: 1, explanation: "For maximum energy transfer (resonance), the driving frequency must match the natural frequency." },
    2: { correctIndex: 1, explanation: "From f = (1/2π)√(k/m), increasing mass decreases the natural/resonant frequency." },
    3: { correctIndex: 1, explanation: "Wind created oscillations matching the bridge's natural frequency, causing resonance." },
    4: { correctIndex: 2, explanation: "MRI uses nuclear magnetic resonance - hydrogen nuclei resonate at specific frequencies." },
    5: { correctIndex: 1, explanation: "The singer must match the glass's natural frequency to create resonance." },
    6: { correctIndex: 1, explanation: "Lower frequency = longer wavelength needs larger resonator." },
    7: { correctIndex: 1, explanation: "The tuned mass damper oscillates opposite to building sway, canceling resonant vibrations." },
    8: { correctIndex: 1, explanation: "At resonance, the velocity (not position) is in phase with the driving force." },
    9: { correctIndex: 1, explanation: "Marching in step could match the bridge's natural frequency, causing dangerous resonance." }
  },

  // =============================================================
  // ROLLING VS SLIDING
  // =============================================================
  "rolling_vs_sliding": {
    0: { correctIndex: 1, explanation: "Rolling friction (dolly with wheels) is 10-100× less than sliding friction." },
    1: { correctIndex: 1, explanation: "Locked wheels slide with kinetic friction. ABS keeps wheels rolling with static friction, maximizing grip." },
    2: { correctIndex: 1, explanation: "Static friction (before moving) is higher than kinetic friction (while moving)." },
    3: { correctIndex: 1, explanation: "Ball bearings replace sliding contact with rolling balls. Rolling friction is much lower." },
    4: { correctIndex: 1, explanation: "Steel-on-steel rolling friction is about 0.001-0.002—roughly 10× lower than rubber tires." },
    5: { correctIndex: 1, explanation: "Precision ball bearings in skateboard wheels create minimal rolling friction." },
    6: { correctIndex: 1, explanation: "Surface roughness increases friction. Smooth fresh ice has lower friction coefficient." },
    7: { correctIndex: 0, explanation: "More contact area means more friction force. Slicks maximize rubber-to-road contact." },
    8: { correctIndex: 1, explanation: "With no physical contact, there is zero mechanical friction. Only air drag remains." },
    9: { correctIndex: 1, explanation: "Pressure and friction heat melt a microscopic water layer, acting as a lubricant." }
  },

  // =============================================================
  // LAMINAR TURBULENT
  // =============================================================
  "laminar_turbulent": {
    0: { correctIndex: 1, explanation: "Reynolds number (Re = ρvD/μ) determines whether flow is laminar or turbulent." },
    1: { correctIndex: 1, explanation: "The stream becomes white and chaotic when flow transitions to turbulent at higher velocity." },
    2: { correctIndex: 1, explanation: "Laminar flow has lower drag due to smooth, orderly motion with less energy loss." },
    3: { correctIndex: 1, explanation: "The critical Reynolds number for pipe flow transition is approximately 2300." },
    4: { correctIndex: 1, explanation: "Higher viscosity raises the critical Reynolds number threshold, maintaining laminar flow." },
    5: { correctIndex: 1, explanation: "Golf ball dimples trigger a turbulent boundary layer that stays attached longer, reducing drag." },
    6: { correctIndex: 1, explanation: "Blood flow in arteries is usually laminar, except in diseased vessels where turbulence indicates blockage." },
    7: { correctIndex: 2, explanation: "To keep flow laminar, increase viscosity or decrease velocity (lower Re)." },
    8: { correctIndex: 1, explanation: "Smooth underbodies maintain laminar airflow, reducing drag." },
    9: { correctIndex: 1, explanation: "The transition from laminar to turbulent is sudden and sensitive to small disturbances." }
  },

  // =============================================================
  // LATENT HEAT
  // =============================================================
  "latent_heat": {
    0: { correctIndex: 1, explanation: "Energy is being used to change molecular bonds, not temperature. During phase change, heat goes into latent heat." },
    1: { correctIndex: 1, explanation: "The extra heat energy converts water molecules from liquid to gas (latent heat of vaporization = 2,260 J/g)." },
    2: { correctIndex: 2, explanation: "Latent heat of fusion (334 J/g) stores much more energy per gram than temperature change alone." },
    3: { correctIndex: 1, explanation: "The alcohol absorbs heat from your skin to evaporate, creating a cooling sensation." },
    4: { correctIndex: 1, explanation: "Steam releases 2,260 J/g of latent heat when it condenses on skin, making burns more severe." },
    5: { correctIndex: 2, explanation: "Melting requires absorbing 334 J/g of latent heat—equivalent to heating water 80°C." },
    6: { correctIndex: 1, explanation: "Cold packs use endothermic dissolution, which works on similar principles to latent heat absorption." },
    7: { correctIndex: 1, explanation: "Refrigerants exploit latent heat: evaporating indoors absorbs heat, condensing outdoors releases it." },
    8: { correctIndex: 2, explanation: "At lower pressure, latent heat of vaporization decreases slightly, but phase change still requires substantial energy." },
    9: { correctIndex: 2, explanation: "Ice at 0°C has more cooling capacity because melting absorbs 334 J/g while staying at 0°C." }
  },

  // =============================================================
  // LAW OF REFLECTION
  // =============================================================
  "law_of_reflection": {
    0: { correctIndex: 1, explanation: "The Law of Reflection states that angle of incidence equals angle of reflection." },
    1: { correctIndex: 2, explanation: "Both angles are measured from the normal—an imaginary line perpendicular to the mirror surface." },
    2: { correctIndex: 3, explanation: "If light comes straight in (0° to normal), it bounces straight back (0° on the other side)." },
    3: { correctIndex: 1, explanation: "A virtual image is where light rays appear to come from when traced backward." },
    4: { correctIndex: 2, explanation: "For flat mirrors, the virtual image appears exactly as far behind as the object is in front." },
    5: { correctIndex: 1, explanation: "A corner reflector (90° angle) always sends light back parallel to its incoming direction." },
    6: { correctIndex: 2, explanation: "Corner cubes reflect light back to the source regardless of entry angle." },
    7: { correctIndex: 2, explanation: "Parallel mirrors create infinite reflections—each image reflects in the other mirror." },
    8: { correctIndex: 1, explanation: "Periscope mirrors are at 45° to redirect light by 90° twice, allowing 180° viewing." },
    9: { correctIndex: 2, explanation: "Formula: Number of images = (360°/angle) - 1. For 60°: (360/60) - 1 = 5 images." }
  },

  // =============================================================
  // LENS FOCUSING
  // =============================================================
  "lens_focusing": {
    0: { correctIndex: 1, explanation: "The thin lens equation 1/f = 1/d_o + 1/d_i relates focal length to object and image distances." },
    1: { correctIndex: 2, explanation: "Converging (convex) lenses have positive focal lengths." },
    2: { correctIndex: 3, explanation: "When object is inside focal length (d < f), lens creates a virtual, magnified, upright image." },
    3: { correctIndex: 1, explanation: "When object is at focal point, rays emerge parallel (d_image → ∞)." },
    4: { correctIndex: 0, explanation: "Shorter focal length = wider field of view, less magnification." },
    5: { correctIndex: 2, explanation: "Diopters = 1/focal length in meters. Eyeglass prescriptions use this unit." },
    6: { correctIndex: 1, explanation: "Negative magnification means the image is inverted (upside down)." },
    7: { correctIndex: 1, explanation: "Shorter focal length = higher magnification (M ∝ 1/f)." },
    8: { correctIndex: 1, explanation: "Reading glasses use converging lenses to add focusing power for farsighted eyes." },
    9: { correctIndex: 1, explanation: "Negative image distance indicates a virtual image on the same side as the object." }
  },

  // =============================================================
  // MAGNETIC FIELD
  // =============================================================
  "magnetic_field": {
    0: { correctIndex: 2, explanation: "Magnetic field lines around a current-carrying wire form concentric circles." },
    1: { correctIndex: 1, explanation: "The Biot-Savart law shows B = μ₀I/(2πr), where B is directly proportional to current I." },
    2: { correctIndex: 2, explanation: "The Lorentz force F = qv × B is perpendicular to both velocity and magnetic field." },
    3: { correctIndex: 1, explanation: "The magnetic force acts as centripetal force, causing circular motion with constant speed." },
    4: { correctIndex: 1, explanation: "Each wire's magnetic field exerts a force on the other wire's current." },
    5: { correctIndex: 1, explanation: "A tightly wound coil creates a solenoid with uniform internal field B = μ₀nI." },
    6: { correctIndex: 0, explanation: "F = qvB sin(θ) = (1.6×10⁻¹⁹ C)(1×10⁷ m/s)(0.5 T) = 8×10⁻¹³ N." },
    7: { correctIndex: 1, explanation: "Earth has its own magnetic field, generated by convection in the molten core." },
    8: { correctIndex: 1, explanation: "When velocity is parallel to B (θ = 0°), sin(0°) = 0, so the force is zero." },
    9: { correctIndex: 2, explanation: "MRI field: 1.5-3 T vs Earth's field: 50 μT = 30,000-60,000 times stronger." }
  },

  // =============================================================
  // TORQUE
  // =============================================================
  "torque": {
    0: { correctIndex: 1, explanation: "Torque = Force x Lever arm. With a larger lever arm, you need less force to create the same torque." },
    1: { correctIndex: 1, explanation: "Torque (τ) equals force (F) times the perpendicular distance (r) from the pivot point: τ = F × r." },
    2: { correctIndex: 2, explanation: "Since τ = F × r, halving r means you need to double F to maintain the same torque." },
    3: { correctIndex: 1, explanation: "Engineers place handles far from hinges to maximize the lever arm, making doors easy to open." },
    4: { correctIndex: 0, explanation: "Friction at the hinge creates a resisting torque that must be overcome." },
    5: { correctIndex: 1, explanation: "A longer wrench handle increases the lever arm, so the same force produces more torque." },
    6: { correctIndex: 1, explanation: "For balance, torques must be equal: W1 × r1 = W2 × r2. The heavier weight needs a shorter lever arm." },
    7: { correctIndex: 1, explanation: "Placing a doorstop far from the hinge maximizes the resisting moment arm." },
    8: { correctIndex: 1, explanation: "A torque wrench measures the rotational force (torque) being applied to a fastener." },
    9: { correctIndex: 1, explanation: "Using τ = F × r: 20 = F × 0.5, solving for F gives F = 40 N." }
  },

  // =============================================================
  // WAVE INTERFERENCE
  // =============================================================
  "wave_interference": {
    0: { correctIndex: 0, explanation: "Path difference = 2λ = whole number of wavelengths. Waves arrive in phase → constructive interference!" },
    1: { correctIndex: 1, explanation: "Path difference = 2.5λ. Waves arrive out of phase → destructive interference, near-silence!" },
    2: { correctIndex: 0, explanation: "Constructive interference occurs when Δd = nλ. The minimum is Δd = 0 (center line)." },
    3: { correctIndex: 1, explanation: "To cancel noise, the anti-noise wave must arrive 180° out of phase → destructive interference → silence!" },
    4: { correctIndex: 1, explanation: "Shorter λ means the same physical distance corresponds to MORE wavelengths. Maxima/minima become more closely spaced." },
    5: { correctIndex: 0, explanation: "At the center, both waves travel exactly the same distance. Path difference = 0 → always constructive!" },
    6: { correctIndex: 1, explanation: "When radio waves from two sources arrive out of phase, they cancel → creating 'dead zones'." },
    7: { correctIndex: 1, explanation: "3.25λ is closer to 3.5λ (destructive) than to 3λ (constructive). The wave will be partially cancelled." },
    8: { correctIndex: 1, explanation: "Film thickness varies across the bubble. Different thicknesses create different path differences for each color." },
    9: { correctIndex: 1, explanation: "Where direct and reflected waves have path differences of (n+½)λ, destructive interference creates weak signal zones!" }
  },

  // =============================================================
  // SHEAR THINNING
  // =============================================================
  "shear_thinning": {
    0: { correctIndex: 1, explanation: "It becomes thinner and flows more easily." },
    1: { correctIndex: 2, explanation: "At rest, it has high viscosity and behaves like a thick gel." },
    2: { correctIndex: 1, explanation: "Polymer chains or particles align and untangle under shear." },
    3: { correctIndex: 2, explanation: "Cornstarch and water (oobleck) is NOT a shear-thinning fluid - it's shear-thickening." },
    4: { correctIndex: 1, explanation: "It allows paint to flow smoothly when brushed but stay put when done." },
    5: { correctIndex: 2, explanation: "Red blood cells deform and align to flow through narrow capillaries." },
    6: { correctIndex: 1, explanation: "It might drip off your brush before you can use it." },
    7: { correctIndex: 2, explanation: "When at rest with no applied stress." },
    8: { correctIndex: 1, explanation: "It allows precise extrusion through nozzles while maintaining shape afterward." },
    9: { correctIndex: 1, explanation: "Shaking or tapping to apply shear stress and reduce viscosity." }
  },

  // =============================================================
  // SHOWER CURTAIN
  // =============================================================
  "shower_curtain": {
    0: { correctIndex: 1, explanation: "Low pressure inside from air entrainment." },
    1: { correctIndex: 1, explanation: "Lower pressure." },
    2: { correctIndex: 1, explanation: "Moving fluid drags surrounding fluid along." },
    3: { correctIndex: 1, explanation: "Rising hot air creates additional convection currents." },
    4: { correctIndex: 1, explanation: "Venturi tubes and atomizers." },
    5: { correctIndex: 1, explanation: "Low pressure in the truck's wake (entrainment)." },
    6: { correctIndex: 2, explanation: "Draw liquid up the tube by low pressure." },
    7: { correctIndex: 2, explanation: "Cold, low-flow shower." },
    8: { correctIndex: 1, explanation: "Water drops drag air down, which then recirculates." },
    9: { correctIndex: 1, explanation: "Weight and attachment resist the pressure difference." }
  },

  // =============================================================
  // SIPHON
  // =============================================================
  "siphon": {
    0: { correctIndex: 2, explanation: "Atmospheric pressure difference." },
    1: { correctIndex: 1, explanation: "Fill the tube with liquid (prime it)." },
    2: { correctIndex: 2, explanation: "Below the source surface." },
    3: { correctIndex: 1, explanation: "About 10 meters." },
    4: { correctIndex: 1, explanation: "No atmospheric pressure to push water up." },
    5: { correctIndex: 2, explanation: "Flow stops (siphon breaks)." },
    6: { correctIndex: 1, explanation: "Greater pressure differential." },
    7: { correctIndex: 1, explanation: "Aqueducts crossing valleys." },
    8: { correctIndex: 0, explanation: "Gas runs out or outlet rises above inlet." },
    9: { correctIndex: 1, explanation: "Atmospheric pressure pushing, gravity pulling." }
  },

  // =============================================================
  // SOAP BOAT
  // =============================================================
  "soap_boat": {
    0: { correctIndex: 1, explanation: "Cohesive forces at the liquid surface." },
    1: { correctIndex: 2, explanation: "Surface tension imbalance creates net force." },
    2: { correctIndex: 1, explanation: "It doesn't work well - water is contaminated." },
    3: { correctIndex: 1, explanation: "Flow caused by surface tension gradients." },
    4: { correctIndex: 1, explanation: "0.072 N/m." },
    5: { correctIndex: 1, explanation: "By breaking hydrogen bonds between water molecules." },
    6: { correctIndex: 1, explanation: "Dish soap is a surfactant that drastically lowers water's surface tension." },
    7: { correctIndex: 2, explanation: "Not work well - soap doesn't reduce mercury's surface tension." },
    8: { correctIndex: 1, explanation: "Alcohol evaporation creates surface tension gradients (Marangoni effect)." },
    9: { correctIndex: 1, explanation: "Spherical, because surface tension minimizes surface area." }
  },

  // =============================================================
  // SPEED OF SOUND
  // =============================================================
  "speed_of_sound": {
    0: { correctIndex: 1, explanation: "Sound travels at approximately 343 m/s (about 767 mph) in air at 20°C." },
    1: { correctIndex: 1, explanation: "Higher temperature makes air molecules move faster and more energetically." },
    2: { correctIndex: 1, explanation: "Speed = distance/time. For an echo, the sound travels to the wall and back." },
    3: { correctIndex: 1, explanation: "Light is nearly a million times faster, so it reaches you almost instantly." },
    4: { correctIndex: 1, explanation: "Sound travels about 343 m/s × 5 s = 1,715 m ≈ 1 mile." },
    5: { correctIndex: 2, explanation: "Sound travels fastest in solids (~5,000 m/s in steel)." },
    6: { correctIndex: 1, explanation: "Molecules are closer together and more tightly bonded." },
    7: { correctIndex: 1, explanation: "Counting seconds between lightning and thunder to estimate distance." },
    8: { correctIndex: 1, explanation: "In 2 seconds, sound travels 343 × 2 = 686 m total. Half that is 343 meters." },
    9: { correctIndex: 1, explanation: "Temperature, humidity, and measurement errors." }
  },

  // =============================================================
  // STATIC ELECTRICITY
  // =============================================================
  "static_electricity": {
    0: { correctIndex: 1, explanation: "Rubbing transfers electrons from your hair to the balloon. Hair loses electrons (becomes positive), balloon gains electrons (becomes negative)." },
    1: { correctIndex: 1, explanation: "Coulomb's Law states that electric force is proportional to the product of charges and inversely proportional to the square of distance." },
    2: { correctIndex: 1, explanation: "Like charges repel! Two negative charges push away from each other." },
    3: { correctIndex: 1, explanation: "The balloon's negative charge induces temporary charge separation in the paper, creating attraction." },
    4: { correctIndex: 1, explanation: "Electric charge is measured in Coulombs (C)." },
    5: { correctIndex: 2, explanation: "Since force depends on 1/r², doubling the distance makes the force 1/4 of the original." },
    6: { correctIndex: 2, explanation: "Electrons (negative) and protons (positive) have exactly equal but opposite charges." },
    7: { correctIndex: 1, explanation: "Static electricity involves charges that accumulate and stay in place on objects." },
    8: { correctIndex: 1, explanation: "Lightning is a massive static discharge - charges built up in clouds suddenly flow to the ground." },
    9: { correctIndex: 1, explanation: "The triboelectric series ranks materials by their tendency to gain or lose electrons when rubbed." }
  },

  // =============================================================
  // STATIC KINETIC FRICTION
  // =============================================================
  "static_kinetic_friction": {
    0: { correctIndex: 1, explanation: "At rest, surfaces interlock more completely. Once sliding, microscopic bonds keep breaking before they fully form." },
    1: { correctIndex: 0, explanation: "Static friction matches the applied force exactly until the maximum is reached - then the object slips." },
    2: { correctIndex: 1, explanation: "Once the box breaks free, kinetic friction takes over, which is lower. You need less force to maintain motion." },
    3: { correctIndex: 1, explanation: "Rubber is soft and deforms around surface irregularities, creating more contact area." },
    4: { correctIndex: 1, explanation: "Friction force = μ × Normal force. Doubling the weight doubles the friction force." },
    5: { correctIndex: 1, explanation: "ABS prevents wheels from locking. Static friction between tire and road is higher than kinetic." },
    6: { correctIndex: 1, explanation: "The friction coefficient (μ) is the ratio of friction force to normal force: μ = f/N." },
    7: { correctIndex: 1, explanation: "Oil creates a thin layer between surfaces, preventing microscopic interlocking." },
    8: { correctIndex: 1, explanation: "The peak in the force-time graph is the moment static friction reaches its maximum." },
    9: { correctIndex: 1, explanation: "When you push backward with your foot, friction pushes you forward." }
  },

  // =============================================================
  // STRAW INSTRUMENT
  // =============================================================
  "straw_instrument": {
    0: { correctIndex: 1, explanation: "Shorter tubes produce higher pitches. The wavelength that fits in the tube is shorter." },
    1: { correctIndex: 1, explanation: "Sound is created by standing waves that resonate and reinforce themselves within the tube." },
    2: { correctIndex: 1, explanation: "For an open pipe, one complete wavelength spans twice the tube length: λ = 2L." },
    3: { correctIndex: 2, explanation: "Halving the length doubles the frequency. Since f = v/(2L), if L is halved, f doubles." },
    4: { correctIndex: 1, explanation: "Each tube length resonates at a specific frequency, producing a different musical note." },
    5: { correctIndex: 1, explanation: "Nodes are points where there is no displacement. Anti-nodes are points of maximum displacement." },
    6: { correctIndex: 1, explanation: "Closed pipes only produce odd harmonics because of the boundary condition at the closed end." },
    7: { correctIndex: 1, explanation: "Resonance occurs when a frequency matches the natural frequency, causing amplification." },
    8: { correctIndex: 1, explanation: "Blowing harder primarily increases volume (amplitude). Pitch stays roughly the same." },
    9: { correctIndex: 1, explanation: "A flattened end acts like a double reed, vibrating rapidly to create regular pressure pulses." }
  },

  // =============================================================
  // THERMAL CONTACT
  // =============================================================
  "thermal_contact": {
    0: { correctIndex: 1, explanation: "Even polished surfaces have microscopic roughness. When pressed together, only peaks touch, leaving tiny air gaps." },
    1: { correctIndex: 1, explanation: "In gases, molecules are far apart. Air's thermal conductivity is ~0.026 W/m-K vs copper's ~400 W/m-K." },
    2: { correctIndex: 2, explanation: "Thermal paste fills the microscopic valleys between surfaces. Even though paste isn't as conductive as metal, it's far better than air." },
    3: { correctIndex: 2, explanation: "Too much paste creates a thick layer. Thermal paste is less conductive than metal, so excess paste increases resistance." },
    4: { correctIndex: 2, explanation: "400 / 0.026 = 15,000. Copper conducts heat about 15,000 times better than air." },
    5: { correctIndex: 1, explanation: "A pea-sized dot in the center or thin layer is ideal. Mounting pressure spreads it." },
    6: { correctIndex: 1, explanation: "Flatter surfaces mean more direct metal-to-metal contact and fewer air gaps." },
    7: { correctIndex: 1, explanation: "Thermal pads are thicker and conform to irregular surfaces." },
    8: { correctIndex: 2, explanation: "In Fourier's Law, d is the thickness of the material. Thicker barriers reduce heat flow." },
    9: { correctIndex: 1, explanation: "Better thermal interface allows heat to transfer faster from CPU to cooler." }
  },

  // =============================================================
  // THERMAL EXPANSION
  // =============================================================
  "thermal_expansion": {
    0: { correctIndex: 0, explanation: "ΔL = αL₀ΔT = (12×10⁻⁶)(500,000 mm)(60°C) = 360 mm = 36 cm. This is why bridges have expansion joints!" },
    1: { correctIndex: 0, explanation: "When constrained expansion is prevented, enormous thermal stress builds up: σ = EαΔT." },
    2: { correctIndex: 0, explanation: "Most metals have higher α than glass. Heating the lid makes it expand faster than the glass rim." },
    3: { correctIndex: 0, explanation: "The brass expands more, becoming longer than the steel. Since they're bonded, the strip curves with brass on outside." },
    4: { correctIndex: 0, explanation: "Lower α means less stress difference. Pyrex's low expansion makes it resistant to thermal shock." },
    5: { correctIndex: 0, explanation: "Water's anomalous expansion means 4°C water is densest. Colder water rises, eventually freezing on surface." },
    6: { correctIndex: 0, explanation: "ΔL = αL₀ΔT = (12×10⁻⁶)(300,000 mm)(35°C) = 126 mm ≈ 12-15 cm. The tower is measurably taller in summer!" },
    7: { correctIndex: 0, explanation: "If concrete and steel had different α values, temperature changes would create shear stress and cracking." },
    8: { correctIndex: 0, explanation: "When you apply heat locally, the bolt heats up faster than the surrounding block, creating temporary clearance." },
    9: { correctIndex: 0, explanation: "Invar exhibits the 'Invar effect' - magnetic ordering changes counteract normal thermal expansion." }
  },

  // =============================================================
  // MAGNUS EFFECT
  // =============================================================
  "magnus_effect": {
    0: { correctIndex: 1, explanation: "Pressure difference from air speed variation creates the Magnus effect." },
    1: { correctIndex: 1, explanation: "A ball with topspin will curve downward." },
    2: { correctIndex: 1, explanation: "The side spinning with the airflow has lower pressure." },
    3: { correctIndex: 1, explanation: "The Magnus force is perpendicular to both velocity and spin axis." },
    4: { correctIndex: 2, explanation: "Dimples enhance the Magnus effect and reduce drag." },
    5: { correctIndex: 1, explanation: "A curveball uses the Magnus effect from spin." },
    6: { correctIndex: 2, explanation: "Increasing spin rate will increase the curve." },
    7: { correctIndex: 1, explanation: "The Magnus force equation shows force depends on velocity squared." },
    8: { correctIndex: 1, explanation: "Backspin on a tennis ball causes it to stay in the air longer." },
    9: { correctIndex: 2, explanation: "The Magnus effect works in any fluid (air, water, etc.)." }
  },

  // =============================================================
  // MAKE MICROPHONE
  // =============================================================
  "make_microphone": {
    0: { correctIndex: 1, explanation: "A coil attached to the diaphragm moves in a magnetic field, inducing voltage." },
    1: { correctIndex: 2, explanation: "Electromagnetic induction is reversible - motion creates current." },
    2: { correctIndex: 2, explanation: "Condenser microphones need phantom power (48V)." },
    3: { correctIndex: 0, explanation: "Changing capacitance as diaphragm-to-backplate distance varies." },
    4: { correctIndex: 2, explanation: "Dynamic microphones are rugged and need no external power." },
    5: { correctIndex: 1, explanation: "A transducer converts one form of energy to another." },
    6: { correctIndex: 2, explanation: "MEMS microphones are found in smartphones and wireless earbuds." },
    7: { correctIndex: 1, explanation: "Increased sound amplitude makes the diaphragm move more, producing stronger signal." },
    8: { correctIndex: 1, explanation: "Bone conduction headphones vibrate transducers against your skull bones." },
    9: { correctIndex: 1, explanation: "The piezoelectric effect is bidirectional for both pickups and buzzers." }
  },

  // =============================================================
  // MICROWAVE STANDING WAVE
  // =============================================================
  "microwave_standing_wave": {
    0: { correctIndex: 1, explanation: "Standing waves form with fixed nodes (cold) and antinodes (hot)." },
    1: { correctIndex: 1, explanation: "At a standing wave node there is minimum/zero energy." },
    2: { correctIndex: 1, explanation: "Turntable moves food through hot spots for even heating." },
    3: { correctIndex: 1, explanation: "Hot spot spacing is 6 cm (half wavelength)." }
  },

  // =============================================================
  // INDUCTION HEATING
  // =============================================================
  "induction_heating": {
    0: { correctIndex: 2, explanation: "Eddy currents induced in the metal pan cause heating." },
    1: { correctIndex: 1, explanation: "Glass is an insulator - no eddy currents form." },
    2: { correctIndex: 1, explanation: "Eddy currents flow through resistance, converting electrical energy to heat (I²R)." },
    3: { correctIndex: 1, explanation: "Heat is generated directly in the pan, not wasted on air." }
  },

  // =============================================================
  // INFRARED EMISSIVITY
  // =============================================================
  "infrared_emissivity": {
    0: { correctIndex: 1, explanation: "Thermal motion of molecules produces electromagnetic radiation." },
    1: { correctIndex: 1, explanation: "The shiny cup appears COOLER because it reflects surroundings instead of emitting." },
    2: { correctIndex: 1, explanation: "Emissivity is how much IR radiation a surface emits compared to a perfect blackbody." },
    3: { correctIndex: 1, explanation: "Set the emissivity value to match the surface, or apply high-emissivity tape." }
  },

  // =============================================================
  // ECHO TIME OF FLIGHT
  // =============================================================
  "echo_time_of_flight": {
    0: { correctIndex: 1, explanation: "The sound travels to the cliff (170m) and back (170m) = 340m total. At 340 m/s, time = 1 second." },
    1: { correctIndex: 1, explanation: "The sound wave travels TO the object and then BACK to you. We divide by 2 for actual distance." },
    2: { correctIndex: 1, explanation: "In water, molecules are much closer together than in air. Sound transmits faster in denser media." },
    3: { correctIndex: 1, explanation: "Total distance = 340 × 0.02 = 6.8m. Round-trip, so the insect is 3.4 meters away." },
    4: { correctIndex: 1, explanation: "Sound needs a medium (like air or water) to travel. Space is a vacuum with no molecules." },
    5: { correctIndex: 1, explanation: "Sound travels about 4 times faster in water (~1500 m/s) than air (~340 m/s)." },
    6: { correctIndex: 2, explanation: "For medical ultrasound, typical times are microseconds. 0.0001s × 1540 / 2 = 7.7cm." },
    7: { correctIndex: 1, explanation: "Higher frequency sounds have shorter wavelengths, which can detect smaller objects." },
    8: { correctIndex: 1, explanation: "Total distance = 1500 × 4 = 6000m. Divide by 2 for one-way: 3000 meters deep." },
    9: { correctIndex: 3, explanation: "Thunder rolls because the lightning bolt is long, sound echoes off terrain, and multiple return strokes can occur!" }
  },

  // =============================================================
  // EGG DROP
  // =============================================================
  "egg_drop": {
    0: { correctIndex: 1, explanation: "The pillow compresses during impact, extending the deceleration time. More time means less force." },
    1: { correctIndex: 2, explanation: "If time increases by 10x and impulse must stay constant, force decreases by 10x." },
    2: { correctIndex: 0, explanation: "10x more time means 10x less force. Padding reduces force well under the threshold." },
    3: { correctIndex: 1, explanation: "Momentum is mass × velocity. Doubling velocity doubles momentum." },
    4: { correctIndex: 2, explanation: "By moving with the punch, the boxer extends the time, reducing peak force." },
    5: { correctIndex: 2, explanation: "Air cushions compress progressively during impact, extending the stopping time." },
    6: { correctIndex: 1, explanation: "Seatbelts slow you down with the car during the crumple phase." },
    7: { correctIndex: 0, explanation: "Thicker mats can compress more, roughly doubling the deceleration time and halving force." },
    8: { correctIndex: 1, explanation: "Wood boards flex slightly before breaking, extending the time of force application." },
    9: { correctIndex: 2, explanation: "When the car breaks apart, each piece independently decelerates, reducing G-forces on the driver." }
  },

  // =============================================================
  // EVAPORATIVE COOLING
  // =============================================================
  "evaporative_cooling": {
    0: { correctIndex: 1, explanation: "Your body heat provides the energy for water to evaporate from your skin." },
    1: { correctIndex: 2, explanation: "In humid weather, the air is already saturated with water vapor, slowing evaporation." },
    2: { correctIndex: 1, explanation: "The latent heat of vaporization for water is about 2,260 J/g." },
    3: { correctIndex: 1, explanation: "Blowing on wet skin removes the humid air layer, allowing faster evaporation." },
    4: { correctIndex: 1, explanation: "Dogs pant instead of sweating to evaporate water from their tongues and respiratory tract." },
    5: { correctIndex: 1, explanation: "Rubbing alcohol has a lower latent heat and evaporates faster, drawing heat away quickly." },
    6: { correctIndex: 1, explanation: "In the desert with 10% humidity, sweating cools much better due to faster evaporation." },
    7: { correctIndex: 2, explanation: "Water evaporating from your skin takes heat with it, making you feel cold." },
    8: { correctIndex: 1, explanation: "Evaporative coolers work best in dry climates where evaporation is efficient." },
    9: { correctIndex: 1, explanation: "Evaporating 1g of water takes ~2,260 J, while heating 1g by 1°C takes only 4.2 J." }
  },

  // =============================================================
  // FARADAY CAGE
  // =============================================================
  "faraday_cage": {
    0: { correctIndex: 1, explanation: "Free electrons in the metal redistribute to cancel external electric fields inside the cage." },
    1: { correctIndex: 1, explanation: "The metal elevator acts as a Faraday cage, blocking electromagnetic signals." },
    2: { correctIndex: 2, explanation: "Mesh works if hole size is much smaller than the wavelength of the electromagnetic waves." },
    3: { correctIndex: 1, explanation: "If holes were larger than the microwave wavelength (~12cm), microwaves would leak out." }
  },

  // =============================================================
  // FLOATING PAPERCLIP
  // =============================================================
  "floating_paperclip": {
    0: { correctIndex: 1, explanation: "Surface tension creates a skin-like surface that supports the paperclip." },
    1: { correctIndex: 2, explanation: "A visible depression in the water surface shows surface tension supporting the paperclip." },
    2: { correctIndex: 1, explanation: "A dropped paperclip breaks through the surface; a gently placed one distributes weight across the surface." },
    3: { correctIndex: 2, explanation: "Soap breaks surface tension, and the paperclip sinks." },
    4: { correctIndex: 1, explanation: "F = γL cos(θ) relates surface tension force to contact angle." },
    5: { correctIndex: 1, explanation: "Water striders have hydrophobic legs that don't break through the water surface." },
    6: { correctIndex: 3, explanation: "Steel is approximately 8 times denser than water." },
    7: { correctIndex: 1, explanation: "Contact angle and contact perimeter determine the maximum weight surface tension can support." },
    8: { correctIndex: 1, explanation: "A parallel needle distributes weight along more water surface, maximizing surface tension support." },
    9: { correctIndex: 2, explanation: "Water striders and many aquatic insects use surface tension for survival." }
  },

  // =============================================================
  // FLUORESCENCE
  // =============================================================
  "fluorescence": {
    0: { correctIndex: 2, explanation: "Highlighters contain fluorescent molecules that absorb UV and emit visible light." },
    1: { correctIndex: 0, explanation: "Some absorbed energy is lost as heat, so emitted light has less energy (longer wavelength)." },
    2: { correctIndex: 1, explanation: "Regular white paper contains optical brighteners that do fluoresce under UV light." },
    3: { correctIndex: 2, explanation: "UV light has shorter wavelength (higher energy) than red visible light." }
  },

  // =============================================================
  // FRACTURE MECHANICS
  // =============================================================
  "fracture_mechanics": {
    0: { correctIndex: 1, explanation: "Rounded corners reduce stress concentration, preventing crack initiation." },
    1: { correctIndex: 1, explanation: "Stress concentration factor (Kt) is the ratio of local stress to nominal stress at a geometric feature." },
    2: { correctIndex: 2, explanation: "Drilling a hole at the crack tip blunts it and redistributes stress." },
    3: { correctIndex: 2, explanation: "Sharp V-notches have the highest stress concentration." }
  },

  // =============================================================
  // ELECTRIC FIELD MAPPING
  // =============================================================
  "electric_field_mapping": {
    0: { correctIndex: 1, explanation: "Electric field lines point AWAY from positive charges and TOWARD negative charges." },
    1: { correctIndex: 1, explanation: "Where field lines are closer together (denser), the electric field is stronger." },
    2: { correctIndex: 2, explanation: "Electric field lines NEVER cross because at any point in space, the field can only point in one direction." },
    3: { correctIndex: 1, explanation: "The electric field E = kq/r², where k is Coulomb's constant." },
    4: { correctIndex: 1, explanation: "A uniform field has parallel, equally-spaced field lines." },
    5: { correctIndex: 2, explanation: "The electric field is a vector - it has both magnitude and direction." },
    6: { correctIndex: 2, explanation: "Since E ∝ 1/r², doubling the distance reduces the field to 1/4 of its original strength." },
    7: { correctIndex: 2, explanation: "A dipole consists of equal and opposite charges separated by a distance." },
    8: { correctIndex: 1, explanation: "The field is strongest closest to the charge (E = kq/r²)." },
    9: { correctIndex: 2, explanation: "Field lines radiate outward from positive charges." }
  },

  // =============================================================
  // ELECTRIC POTENTIAL
  // =============================================================
  "electric_potential": {
    0: { correctIndex: 1, explanation: "U = qV = (2×10⁻⁶ C)(500 V) = 1×10⁻³ J = 1 mJ." },
    1: { correctIndex: 0, explanation: "ΔKE = -qΔV = -(-e)(0-(-100)) = +100 eV. The electron gains 100 eV of kinetic energy." },
    2: { correctIndex: 1, explanation: "V = kq/r, so r = kq/V = (8.99×10⁹)(5×10⁻⁶)/(9×10⁵) = 0.05 m = 5 cm." },
    3: { correctIndex: 2, explanation: "E = V/d = 200 V / 0.002 m = 100,000 V/m. The field is uniform between parallel plates." },
    4: { correctIndex: 2, explanation: "Both gain KE = |q|ΔV = 1000 eV. Energy depends on charge and potential difference, not mass." },
    5: { correctIndex: 2, explanation: "W = qΔV. Along an equipotential, ΔV = 0, so W = 0." },
    6: { correctIndex: 2, explanation: "At the midpoint, the potentials cancel exactly. V = k(+q)/r + k(-q)/r = 0." },
    7: { correctIndex: 2, explanation: "While V is high, the stored charge q is very small, so total energy is small." },
    8: { correctIndex: 1, explanation: "The battery does work on charges to raise their potential energy by 12 eV per electron." },
    9: { correctIndex: 2, explanation: "E = V/d = 10⁸ V / 10³ m = 10⁵ V/m = 100 kV/m." }
  },

  // =============================================================
  // ELECTROMAGNET
  // =============================================================
  "electromagnet": {
    0: { correctIndex: 1, explanation: "Electric current flowing through wire creates the magnetic field." },
    1: { correctIndex: 2, explanation: "Iron concentrates and amplifies the magnetic field." },
    2: { correctIndex: 3, explanation: "When current reverses, the north and south poles swap." },
    3: { correctIndex: 1, explanation: "Increase current and/or number of coil turns to make an electromagnet stronger." }
  },

  // =============================================================
  // HEAT TRANSFER CAPACITY
  // =============================================================
  "heat_transfer_capacity": {
    0: { correctIndex: 1, explanation: "Metal has high thermal conductivity (k), so it rapidly draws heat away from your hand." },
    1: { correctIndex: 1, explanation: "Thermal conductivity (k) measures how fast heat flows through a material." },
    2: { correctIndex: 2, explanation: "Water has the highest specific heat capacity at 4.18 J/gC." },
    3: { correctIndex: 2, explanation: "Water's high heat capacity buffers temperature changes, moderating coastal temperature swings." },
    4: { correctIndex: 1, explanation: "Fourier's Law is Q/t = -kA(dT/dx)." },
    5: { correctIndex: 1, explanation: "Temperature gradient (dT/dx) is halved when wall thickness doubles, which halves heat loss." },
    6: { correctIndex: 1, explanation: "Copper has higher thermal conductivity (401 W/mK) compared to aluminum (237 W/mK)." },
    7: { correctIndex: 1, explanation: "Water has high specific heat - needs more energy per degree, making it slow to boil." },
    8: { correctIndex: 1, explanation: "Thermal paste fills air gaps that would otherwise insulate the CPU from the heat sink." },
    9: { correctIndex: 1, explanation: "If c doubles, then ΔT halves for the same Q, because Q = mcΔT." }
  },

  // =============================================================
  // INELASTIC COLLISIONS
  // =============================================================
  "inelastic_collisions": {
    0: { correctIndex: 1, explanation: "In inelastic collisions, kinetic energy is NOT conserved—it converts to heat, sound, and deformation energy." },
    1: { correctIndex: 1, explanation: "Momentum is ALWAYS conserved in collisions because there's no external force." },
    2: { correctIndex: 1, explanation: "A perfectly inelastic collision is when objects stick together after impact." },
    3: { correctIndex: 1, explanation: "From F = Δp/Δt, if Δp is fixed, increasing Δt decreases F." },
    4: { correctIndex: 0, explanation: "If Δp is the same and Δt for Car A is half of Car B, then F for Car A is 2× that of Car B." },
    5: { correctIndex: 1, explanation: "The impulse-momentum theorem (J = FΔt = Δp) shows that for fixed momentum change, increasing time decreases force." },
    6: { correctIndex: 1, explanation: "Airbags increase stopping distance from ~5cm to ~30cm, reducing force by ~6×." },
    7: { correctIndex: 1, explanation: "Using momentum conservation: m(40) + m(0) = (2m)v'. So v' = 20 mph." },
    8: { correctIndex: 1, explanation: "The rubber ball's momentum changes from +mv to -mv (bouncing back), so Δp = 2mv." },
    9: { correctIndex: 1, explanation: "Helmets use EPS foam that crushes permanently to absorb energy. Once crushed, it cannot absorb another impact." }
  },

  // =============================================================
  // MAGNETIC MAPPING
  // =============================================================
  "magnetic_mapping": {
    0: { correctIndex: 1, explanation: "Field lines point from south to north inside the magnet, and from north to south outside." },
    1: { correctIndex: 2, explanation: "Closer field lines indicate stronger magnetic field." },
    2: { correctIndex: 1, explanation: "A point can only have one field direction - field lines cannot cross." },
    3: { correctIndex: 1, explanation: "A compass needle aligns with magnetic field lines." }
  },

  // =============================================================
  // PENDULUM PERIOD
  // =============================================================
  "pendulum_period": {
    0: { correctIndex: 2, explanation: "In the pendulum equation T = 2π√(L/g), mass doesn't appear! Only length and gravity determine period." },
    1: { correctIndex: 2, explanation: "Both arrive simultaneously! The restoring force is proportional to mass, but so is inertia. They cancel." },
    2: { correctIndex: 2, explanation: "Using T = 2π√(L/g): 2 = 2π√(L/10). L ≈ 1 meter." },
    3: { correctIndex: 1, explanation: "Since T ∝ √L, doubling the period requires quadrupling the length." },
    4: { correctIndex: 1, explanation: "Since T = 2π√(L/g) and Moon's g is 1/6 of Earth's, T_moon ≈ 2.45 × T_earth ≈ 5 seconds." },
    5: { correctIndex: 2, explanation: "The period is identical! Since mass cancels out, only the swing's length matters." },
    6: { correctIndex: 0, explanation: "Period ≈ 3.2 seconds gives g ≈ 10 m/s², suggesting the cave is near sea level." },
    7: { correctIndex: 2, explanation: "Using T = 2π√(L/g) with T = 10s and g = 10 m/s²: L ≈ 25 meters." },
    8: { correctIndex: 2, explanation: "For small angles, the period is essentially constant. At large angles, the period is slightly longer." },
    9: { correctIndex: 2, explanation: "The natural period depends only on length and gravity. Oil causes faster damping but same period." }
  },

  // =============================================================
  // PHASE CHANGE ENERGY
  // =============================================================
  "phase_change_energy": {
    0: { correctIndex: 1, explanation: "During a phase change, temperature remains constant! All absorbed energy goes into breaking molecular bonds." },
    1: { correctIndex: 2, explanation: "Melting: Q = 100g × 334 J/g = 33,400 J. Heating water: Q = 100g × 4.18 × 80 = 33,440 J. Nearly identical!" },
    2: { correctIndex: 2, explanation: "At sea level, water cannot exceed 100°C while boiling — extra energy goes into vaporization." },
    3: { correctIndex: 1, explanation: "Vaporization must completely separate molecules that melting only loosens." },
    4: { correctIndex: 1, explanation: "Evaporation requires latent heat (2260 J/g). This energy is drawn from your skin, cooling you down." },
    5: { correctIndex: 0, explanation: "The refrigerant evaporates at low pressure (absorbing heat) and condenses at high pressure (releasing heat)." },
    6: { correctIndex: 1, explanation: "Salt lowers ice's melting point. Melting requires latent heat drawn from surroundings, cooling everything down." },
    7: { correctIndex: 1, explanation: "When water vapor condenses, it releases latent heat (2260 J/g), warming the air." },
    8: { correctIndex: 1, explanation: "During phase changes, added energy goes entirely into breaking intermolecular bonds, not increasing temperature." },
    9: { correctIndex: 2, explanation: "Boiling alone requires 2260 J/g, dominating the total energy needed." }
  },

  // =============================================================
  // PHONE SEISMOMETER
  // =============================================================
  "phone_seismometer": {
    0: { correctIndex: 1, explanation: "A tiny mass on springs moves relative to the chip, changing capacitance." },
    1: { correctIndex: 1, explanation: "Earthquakes create vibrations that accelerometers can measure." },
    2: { correctIndex: 2, explanation: "The accelerometer measures acceleration (rate of velocity change)." },
    3: { correctIndex: 1, explanation: "Distributed sensors provide location triangulation and noise averaging." }
  },

  // =============================================================
  // RAYLEIGH MIE SCATTERING
  // =============================================================
  "rayleigh_mie_scattering": {
    0: { correctIndex: 1, explanation: "Air molecules are much smaller than light wavelengths. Rayleigh scattering causes short wavelengths (blue) to scatter more." },
    1: { correctIndex: 3, explanation: "Rayleigh scattering intensity ∝ 1/λ⁴. Blue light scatters about 5.5× more than red light." },
    2: { correctIndex: 1, explanation: "Cloud droplets are much larger than light wavelengths. Mie scattering scatters all wavelengths equally → white." },
    3: { correctIndex: 2, explanation: "At sunset, sunlight travels through ~40× more atmosphere. Blue light scatters away, leaving red/orange." },
    4: { correctIndex: 1, explanation: "Mie scattering dominates when particle size is comparable to or larger than the light wavelength." },
    5: { correctIndex: 2, explanation: "Dilute milk has fewer fat droplets, so Rayleigh scattering from water molecules dominates → bluish." },
    6: { correctIndex: 1, explanation: "Water molecules scatter blue light (Rayleigh) AND absorb red light. Both effects make deep water appear blue." },
    7: { correctIndex: 1, explanation: "Volcanic ash and pollution add particles that enhance Mie scattering of reds and oranges." },
    8: { correctIndex: 1, explanation: "Mars atmosphere contains iron-rich dust particles that absorb blue while scattering red." },
    9: { correctIndex: 1, explanation: "Blue eyes have NO blue pigment. The stroma contains colorless collagen fibers that Rayleigh scatter blue light." }
  },

  // =============================================================
  // REACTION TIME
  // =============================================================
  "reaction_time": {
    0: { correctIndex: 1, explanation: "t = √(2d/g) = √(2×0.15/9.8) = 175ms." },
    1: { correctIndex: 0, explanation: "At the start, the car is stationary. The 140ms is pure reaction delay." },
    2: { correctIndex: 2, explanation: "60 mph = 88 ft/s. In 400ms: distance = 88 × 0.4 = 35.2 feet." },
    3: { correctIndex: 1, explanation: "90 mph = 132 ft/s. Time = 60ft / 132ft/s = ~450ms. Batters have only ~300ms to decide!" },
    4: { correctIndex: 1, explanation: "With only 300ms flight time and 200ms reaction time, goalkeepers have just 100ms to move!" },
    5: { correctIndex: 3, explanation: "d = ½gt². For 250ms: d = 31cm. For 400ms: d = 78cm. Difference: 47cm." },
    6: { correctIndex: 1, explanation: "The IAAF rules state that any reaction time under 0.100 seconds is a false start." },
    7: { correctIndex: 1, explanation: "Human total: 450ms vs AEB: 300ms. Difference: 150ms saves about 13 feet!" },
    8: { correctIndex: 2, explanation: "Total = Human reaction + Game lag + Monitor response = 180 + 16 + 5 = 201ms." },
    9: { correctIndex: 1, explanation: "A 100ms change in reaction time is clinically significant." }
  },

  // =============================================================
  // TIDAL FORCES
  // =============================================================
  "tidal_forces": {
    0: { correctIndex: 2, explanation: "Differential gravity: far side is pulled less than Earth's center, creating a second bulge." },
    1: { correctIndex: 1, explanation: "The DIFFERENCE in gravitational pull across an object (varies with distance)." },
    2: { correctIndex: 1, explanation: "The Moon is tidally locked - its rotation period equals its orbital period." },
    3: { correctIndex: 2, explanation: "Sun, Moon, and Earth align (new/full moon) - gravitational effects add up." }
  },

  // =============================================================
  // TIDAL LOCKING
  // =============================================================
  "tidal_locking": {
    0: { correctIndex: 1, explanation: "Tidal friction dissipating rotational energy." },
    1: { correctIndex: 1, explanation: "When a body is tidally locked, its rotation period equals its orbital period." },
    2: { correctIndex: 2, explanation: "The Moon's rotation period is approximately 27.3 days (same as its orbital period)." },
    3: { correctIndex: 1, explanation: "Tidal bulges on a body are caused by differential gravitational pull." },
    4: { correctIndex: 2, explanation: "Earth's rotation is gradually slowing." },
    5: { correctIndex: 1, explanation: "Pluto and Charon are mutually tidally locked." },
    6: { correctIndex: 1, explanation: "An 'eyeball world' is a tidally locked exoplanet with a permanent day side and night side." },
    7: { correctIndex: 2, explanation: "Io's extreme volcanic activity is powered by tidal heating from Jupiter's gravity." },
    8: { correctIndex: 1, explanation: "Before tidal locking, a moon typically rotates faster than its orbital period." },
    9: { correctIndex: 1, explanation: "The 'far side' of the Moon was first photographed from space." }
  },

  // =============================================================
  // TRANSFORMER
  // =============================================================
  "transformer": {
    0: { correctIndex: 1, explanation: "The ratio of turns in primary to secondary coils determines voltage ratio." },
    1: { correctIndex: 2, explanation: "DC creates a static field - no changing flux to induce current." },
    2: { correctIndex: 2, explanation: "Current decreases to 1/10 (power conservation: V×I = constant)." },
    3: { correctIndex: 2, explanation: "Lower current means less I²R heat loss in wires." }
  },

  // =============================================================
  // TWO BALL COLLISION
  // =============================================================
  "two_ball_collision": {
    0: { correctIndex: 1, explanation: "Ball A stops, Ball B moves with Ball A's original speed (elastic collision between equal masses)." },
    1: { correctIndex: 1, explanation: "The golf ball (lighter objects change more due to momentum conservation)." },
    2: { correctIndex: 1, explanation: "A perfectly inelastic collision (objects stick together)." },
    3: { correctIndex: 1, explanation: "Kinetic energy converts to mass - not necessarily conserved in particle creation." },
    4: { correctIndex: 1, explanation: "2 balls swing out at the same speed (satisfies momentum and energy conservation)." },
    5: { correctIndex: 1, explanation: "Before: 6 kg·m/s, After: 6 kg·m/s (momentum always conserved)." },
    6: { correctIndex: 1, explanation: "It converts kinetic energy to deformation energy (inelastic process protects occupants)." },
    7: { correctIndex: 1, explanation: "Super ball (bounces, so more momentum change = more force)." },
    8: { correctIndex: 1, explanation: "The small ball keeps most of its kinetic energy (reversed direction)." },
    9: { correctIndex: 1, explanation: "Inelastic (puck doesn't bounce back - momentum transferred to rink)." }
  },

  // =============================================================
  // VENTURI EFFECT
  // =============================================================
  "venturi_effect": {
    0: { correctIndex: 1, explanation: "Velocity increases to maintain constant flow rate (continuity equation A₁v₁ = A₂v₂)." },
    1: { correctIndex: 0, explanation: "The continuity equation represents conservation of mass (volumetric flow rate)." },
    2: { correctIndex: 2, explanation: "At the narrow middle section (throat) - highest velocity means lowest pressure." },
    3: { correctIndex: 1, explanation: "Reducing the opening area increases exit velocity (continuity equation)." },
    4: { correctIndex: 0, explanation: "Moving air creates low pressure between the papers (Venturi effect)." },
    5: { correctIndex: 2, explanation: "A carburetor uses Venturi effect to draw fuel into the air stream." },
    6: { correctIndex: 1, explanation: "If area halves, velocity doubles to conserve mass flow." },
    7: { correctIndex: 0, explanation: "The Venturi effect is a direct consequence of Bernoulli's principle." },
    8: { correctIndex: 2, explanation: "A Bunsen burner uses Venturi effect to draw in air for premixed combustion." },
    9: { correctIndex: 1, explanation: "Fast water through Venturi creates low pressure that pulls air (creates vacuum)." }
  },

  // =============================================================
  // WATER HAMMER
  // =============================================================
  "water_hammer": {
    0: { correctIndex: 1, explanation: "Water hammer is the pressure surge when fluid in motion is suddenly stopped." },
    1: { correctIndex: 2, explanation: "The flowing water's kinetic energy converts to pressure energy, creating a pressure wave." },
    2: { correctIndex: 1, explanation: "The Joukowsky equation shows pressure rise is directly proportional to velocity change." },
    3: { correctIndex: 1, explanation: "The pressure wave travels at the speed of sound in water, about 1400 m/s." },
    4: { correctIndex: 1, explanation: "Critical time Tc = 2L/c is the time for the pressure wave to travel and reflect back." },
    5: { correctIndex: 2, explanation: "Closing valves slowly allows the pressure wave to dissipate gradually." },
    6: { correctIndex: 1, explanation: "Water hammer arrestors contain a compressible cushion that absorbs the shock wave." },
    7: { correctIndex: 0, explanation: "Longer pipes contain more water in motion, meaning more momentum that converts to pressure." },
    8: { correctIndex: 2, explanation: "In the Joukowsky equation, 'c' is the speed of sound in the fluid." },
    9: { correctIndex: 3, explanation: "ΔP = ρcΔv = 1000 × 1400 × 3 = 4,200,000 Pa ≈ 42 bar." }
  },

  // =============================================================
  // WAVE SPEED TENSION
  // =============================================================
  "wave_speed_tension": {
    0: { correctIndex: 2, explanation: "v = √(T/μ) = √(100/0.01) = 100 m/s." },
    1: { correctIndex: 1, explanation: "Because of the square root, v is proportional to √T. Doubling T multiplies v by √2." },
    2: { correctIndex: 1, explanation: "v = √(T/μ). Higher μ (mass density) means lower wave speed." },
    3: { correctIndex: 2, explanation: "v = distance/time = 10m / 0.2s = 50 m/s." },
    4: { correctIndex: 1, explanation: "vA/vB = √(μB/μA) = √(0.04/0.01) = 2. String A (lighter) is 2x faster." },
    5: { correctIndex: 1, explanation: "Higher mass = lower wave speed = lower frequency = lower pitch." },
    6: { correctIndex: 1, explanation: "v = √(T/μ). Higher tension = higher wave speed." },
    7: { correctIndex: 1, explanation: "Steel's extreme stiffness dominates its higher density, resulting in faster wave propagation." },
    8: { correctIndex: 3, explanation: "v = 20 m/s. From v² = T/μ, μ = T/v² = 80/400 = 0.2 kg/m." },
    9: { correctIndex: 1, explanation: "At great depths, extreme pressure increases the rock's elastic modulus faster than density." }
  },

  // =============================================================
  // WORK POWER
  // =============================================================
  "work_power": {
    0: { correctIndex: 1, explanation: "P = W/t = mgh/t = 60 × 10 × 5 / 10 = 300 W." },
    1: { correctIndex: 0, explanation: "Power = Work/Time. Same work in half the time = twice the power." },
    2: { correctIndex: 1, explanation: "P = mgh/t = 500 × 10 × 20 / 10 = 10,000 W = 10 kW." },
    3: { correctIndex: 1, explanation: "P = Fv = 100 × 2 = 200 W." },
    4: { correctIndex: 2, explanation: "W = Pt = 1000 × 3600 = 3,600,000 J = 3.6 MJ." },
    5: { correctIndex: 1, explanation: "Electric motors deliver maximum torque instantly at 0 RPM." },
    6: { correctIndex: 1, explanation: "P = mgv sin(θ) ≈ 80 × 10 × v × 0.1 = 80v. So v = 400/80 = 5 m/s." },
    7: { correctIndex: 0, explanation: "100kg needs 10× more power: P = 100×10×1/1 = 1000W vs 10×10×10/10 = 100W." },
    8: { correctIndex: 3, explanation: "Mechanical work = 400 × 3600 = 1.44 MJ. At 25% efficiency, need 5.76 MJ ≈ 344 kcal." },
    9: { correctIndex: 2, explanation: "Both consume 100W × 3600s = 360,000 J. The motor converts more to mechanical work." }
  },

  // =============================================================
  // P WAVES S WAVES
  // =============================================================
  "p_waves_s_waves": {
    0: { correctIndex: 1, explanation: "P-waves travel about 1.7x faster than S-waves through rock, so they always arrive first." },
    1: { correctIndex: 1, explanation: "S-waves cannot travel through liquids. This proves the outer core is liquid." },
    2: { correctIndex: 1, explanation: "P-waves are compression waves—particles push and pull parallel to wave direction." },
    3: { correctIndex: 2, explanation: "S-waves require the material to 'spring back' when displaced. Liquids flow instead." },
    4: { correctIndex: 1, explanation: "The faster P-wave arrives first as a sharp jolt. The S-wave arrives later with stronger shaking." },
    5: { correctIndex: 1, explanation: "Ultrasound uses compression waves (same principle as P-waves)." },
    6: { correctIndex: 1, explanation: "S-waves are blocked by fluid-filled reservoirs while P-waves pass through." },
    7: { correctIndex: 1, explanation: "An S-wave shadow zone would indicate liquid layers in other planets and moons." },
    8: { correctIndex: 2, explanation: "P-waves slow down in liquid and bend (refract) at the boundary." },
    9: { correctIndex: 1, explanation: "S-waves cause side-to-side shaking which is more damaging to buildings than compression." }
  },

  // =============================================================
  // LIFT FORCE (Cat Righting Reflex)
  // =============================================================
  "lift_force": {
    0: { correctIndex: 1, explanation: "Cats transfer angular momentum between body parts, not by pushing against air." },
    1: { correctIndex: 1, explanation: "The tucked half rotates more because it has smaller moment of inertia." },
    2: { correctIndex: 2, explanation: "Total angular momentum remains zero (or constant) throughout the righting reflex." },
    3: { correctIndex: 1, explanation: "Extended legs have larger moment of inertia than tucked legs." },
    4: { correctIndex: 1, explanation: "For the same angular momentum, lower moment of inertia means faster rotation." },
    5: { correctIndex: 1, explanation: "Astronauts can self-rotate using asymmetrical limb movements, same principle as cats." },
    6: { correctIndex: 1, explanation: "Cats need approximately 30 centimeters (about 1 foot) to right themselves." },
    7: { correctIndex: 2, explanation: "If initial angular momentum is zero, final angular momentum will be zero." },
    8: { correctIndex: 0, explanation: "The cat righting reflex was famously studied using slow motion photography." },
    9: { correctIndex: 1, explanation: "Divers use asymmetrical arm and leg movements to control twists and rotations." }
  },

  // =============================================================
  // MOLECULAR ORBITALS
  // =============================================================
  "molecular_orbitals": {
    0: { correctIndex: 0, explanation: "HOMO stands for Highest Occupied Molecular Orbital." },
    1: { correctIndex: 1, explanation: "For a drug to work, its orbitals need to overlap with the receptor's orbitals." },
    2: { correctIndex: 1, explanation: "When drug HOMO overlaps with receptor LUMO, electrons are shared, forming a bond." },
    3: { correctIndex: 1, explanation: "Aspirin works by blocking the COX enzyme through orbital overlap." },
    4: { correctIndex: 1, explanation: "Orbital shapes determine if a drug can bind to its target." },
    5: { correctIndex: 1, explanation: "LUMO is Lowest Unoccupied Molecular Orbital - it accepts electrons." },
    6: { correctIndex: 1, explanation: "If a drug doesn't fit the receptor binding site, there is no therapeutic effect." },
    7: { correctIndex: 1, explanation: "Orbital overlap is used in drug design, solar cells, and catalysis." }
  },

  // =============================================================
  // HOMOPOLAR MOTOR
  // =============================================================
  "homopolar_motor": {
    0: {
      correctIndex: 1,
      explanation: "The Lorentz force (F = qv×B or F = IL×B) acts on moving charges (current) in a magnetic field, creating the force that makes the wire spin."
    },
    1: {
      correctIndex: 1,
      explanation: "In a homopolar motor, current flows radially through the wire while the magnetic field is axial. The cross product always produces a tangential force, creating continuous torque."
    },
    2: {
      correctIndex: 2,
      explanation: "Flipping the magnet reverses the magnetic field direction (B). Since F = I×B, reversing B reverses the force direction, causing the motor to spin the opposite way."
    },
    3: {
      correctIndex: 1,
      explanation: "Plastic insulation prevents the wire from making electrical contact with the battery terminal and the magnet, so no current can flow through the circuit."
    },
    4: {
      correctIndex: 1,
      explanation: "The Lorentz force equation F = BIL shows that force is directly proportional to current. Doubling current doubles the force."
    },
    5: {
      correctIndex: 1,
      explanation: "According to F = BIL, using a stronger magnet increases B, which directly increases the force and thus the rotational speed. More weight or longer wire would slow it down."
    },
    6: {
      correctIndex: 1,
      explanation: "The wire has electrical resistance. When current flows through it, some electrical energy is converted to heat (P = I²R). This is why you shouldn't run the motor too long."
    },
    7: {
      correctIndex: 1,
      explanation: "A homopolar motor has current flowing in a constant radial direction (not in coils), so the torque direction never needs to reverse. No commutator is needed to switch current."
    },
    8: {
      correctIndex: 1,
      explanation: "The Lorentz force F = I×B is maximum when I and B are perpendicular (90°). When parallel, the cross product is zero and there's no force."
    },
    9: {
      correctIndex: 2,
      explanation: "Homopolar motors have low efficiency because they require high currents to produce useful torque. The sliding contacts also cause energy losses. They're mainly used for special applications like welding."
    }
  },

  // =============================================================
  // CLASSIC DC MOTOR
  // =============================================================
  "classic_dc_motor": {
    0: {
      correctIndex: 1,
      explanation: "The commutator reverses current direction in the coil at exactly the right moment (when torque would become negative), keeping the torque always in the same direction for continuous rotation."
    },
    1: {
      correctIndex: 1,
      explanation: "When the coil plane is parallel to the magnetic field (0° or 180°), the force is perpendicular to the coil arms but creates no torque - this is the dead zone where τ = nBIA sin(θ) = 0."
    },
    2: {
      correctIndex: 1,
      explanation: "Simple motors can stall at dead zones where torque is zero and the commutator brushes may not make good contact with the split segments, preventing restart."
    },
    3: {
      correctIndex: 1,
      explanation: "The gap between commutator segments briefly interrupts current, but the coil's momentum carries it through this point. This also helps prevent sparking during the current reversal."
    },
    4: {
      correctIndex: 1,
      explanation: "Speed increases with stronger magnets (larger B) or higher voltage (larger I). Both increase torque (τ = nBIA) which accelerates the motor. More turns or larger coils increase torque but also mass."
    },
    5: {
      correctIndex: 1,
      explanation: "Torque τ = nBIA sin(θ) is maximum when sin(θ) = 1, which occurs at θ = 90° - when the coil plane is perpendicular to the magnetic field."
    },
    6: {
      correctIndex: 1,
      explanation: "Scraping half the enamel creates a half-insulated coil that only conducts during half of each rotation, effectively acting like a simple commutator that lets momentum carry through the non-conducting half."
    },
    7: {
      correctIndex: 1,
      explanation: "Adding more magnets increases the magnetic field strength B in the torque equation τ = nBIA sin(θ). Higher torque helps overcome friction and dead zones, making starting easier."
    },
    8: {
      correctIndex: 1,
      explanation: "The equation τ = nBIA sin(θ) shows torque depends on all these factors: n (turns), B (field strength), I (current), and A (coil area). Increasing any of them increases torque."
    },
    9: {
      correctIndex: 1,
      explanation: "More commutator segments mean the current reversal happens at more positions, reducing the time spent in dead zones and creating smoother, more consistent torque throughout rotation."
    }
  },

  // =============================================================
  // OERSTED EXPERIMENT
  // =============================================================
  "oersted_experiment": {
    0: {
      correctIndex: 1,
      explanation: "Oersted observed that the compass needle deflected perpendicular to the wire, not toward it. This showed that the magnetic field forms circles around the current-carrying wire."
    },
    1: {
      correctIndex: 2,
      explanation: "The magnetic field lines around a straight current-carrying wire form concentric circles centered on the wire. This is why the compass deflects sideways, not toward the wire."
    },
    2: {
      correctIndex: 1,
      explanation: "Reversing current direction reverses the magnetic field direction (right-hand rule). The compass needle deflects in the opposite direction because it aligns with the reversed field."
    },
    3: {
      correctIndex: 1,
      explanation: "In the right-hand rule, your thumb points in the direction of conventional current flow, and your curled fingers show the direction of the magnetic field circling the wire."
    },
    4: {
      correctIndex: 1,
      explanation: "Increasing current strengthens the field (B ∝ I). Coiling the wire (making a solenoid) concentrates and amplifies the field because each loop's field adds to the others."
    },
    5: {
      correctIndex: 2,
      explanation: "A solenoid creates a much stronger, more uniform field inside that resembles a bar magnet. The fields from each loop add together constructively, with B = μ₀nI."
    },
    6: {
      correctIndex: 1,
      explanation: "For a long straight wire, the magnetic field strength decreases inversely with distance: B = μ₀I/(2πr). This is different from the inverse-square law for point sources."
    },
    7: {
      correctIndex: 1,
      explanation: "Oersted's 1820 experiment proved that electricity and magnetism are related phenomena. This led to the unified theory of electromagnetism developed by Ampère, Faraday, and Maxwell."
    },
    8: {
      correctIndex: 1,
      explanation: "The direction of current flow determines the direction of the magnetic field (right-hand rule), which determines which end of the electromagnet acts as north or south pole."
    },
    9: {
      correctIndex: 2,
      explanation: "With eastward current and the compass above the wire, the right-hand rule shows the field points south at the compass location. The north-seeking needle deflects toward south."
    }
  },

  // =============================================================
  // TEMPLATE FOR ADDING NEW GAMES
  // When adding a new game, copy this template and fill in the answers:
  // =============================================================
  // "game_id": {
  //   0: { correctIndex: 0, explanation: "Explanation for Q1..." },
  //   1: { correctIndex: 0, explanation: "Explanation for Q2..." },
  //   2: { correctIndex: 0, explanation: "Explanation for Q3..." },
  //   3: { correctIndex: 0, explanation: "Explanation for Q4..." },
  //   4: { correctIndex: 0, explanation: "Explanation for Q5..." },
  //   5: { correctIndex: 0, explanation: "Explanation for Q6..." },
  //   6: { correctIndex: 0, explanation: "Explanation for Q7..." },
  //   7: { correctIndex: 0, explanation: "Explanation for Q8..." },
  //   8: { correctIndex: 0, explanation: "Explanation for Q9..." },
  //   9: { correctIndex: 0, explanation: "Explanation for Q10..." },
  // },
};

/**
 * Get answers for a specific game.
 * Returns undefined if game not found.
 */
export function getGameAnswers(gameId: string): GameAnswers | undefined {
  return GAME_ANSWERS[gameId];
}

/**
 * Get the correct answer for a specific question.
 * Returns undefined if game or question not found.
 */
export function getCorrectAnswer(gameId: string, questionIndex: number): GameAnswer | undefined {
  const gameAnswers = GAME_ANSWERS[gameId];
  if (!gameAnswers) return undefined;
  return gameAnswers[questionIndex];
}

/**
 * Check if an answer is correct.
 * Returns { correct: boolean, explanation: string } or undefined if not found.
 */
export function validateAnswer(
  gameId: string,
  questionIndex: number,
  selectedIndex: number
): { correct: boolean; explanation: string } | undefined {
  const answer = getCorrectAnswer(gameId, questionIndex);
  if (!answer) return undefined;

  return {
    correct: selectedIndex === answer.correctIndex,
    explanation: answer.explanation
  };
}

/**
 * Get list of all games that have answers configured.
 */
export function getConfiguredGames(): string[] {
  return Object.keys(GAME_ANSWERS);
}
