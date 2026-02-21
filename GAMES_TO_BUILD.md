# Games To Build - Reference Catalog

## Status Summary
- **Previously existing renderers:** 340
- **Built this session (251-280):** 27 new renderers
- **Current total:** 367 renderers
- **Remaining to build:** ~150 games

## Recently Built (This Session - Games 251-280)
These 27 games are DONE and have full 10-phase structure:

| # | Game | Renderer File | Status |
|---|------|--------------|--------|
| 251 | Oscilloscope Triggering | OscilloscopeTriggererRenderer.tsx | DONE |
| 252 | Power Supply Decoupling Layout | PowerSupplyDecouplingLayoutRenderer.tsx | DONE |
| 253 | Voltage Divider Design | VoltageDividerDesignRenderer.tsx | DONE |
| 254 | Current Mirror Matching | CurrentMirrorMatchingRenderer.tsx | DONE |
| 255 | Op-Amp Stability | OpAmpStabilityRenderer.tsx | DONE |
| 256 | ADC Quantization Noise | ADCQuantizationNoiseRenderer.tsx | DONE |
| 257 | DAC Settling Time | DACSettlingTimeRenderer.tsx | DONE |
| 258 | PLL Lock Dynamics | PLLLockDynamicsRenderer.tsx | DONE |
| 259 | Clock Recovery | ClockRecoveryRenderer.tsx | DONE |
| 260 | Signal Integrity Eye Diagram | SignalIntegrityEyeDiagramRenderer.tsx | DONE |
| 261 | Thermal Noise (Johnson-Nyquist) | ThermalNoiseRenderer.tsx | DONE |
| 262 | Switch Bounce & Debouncing | SwitchBounceRenderer.tsx | DONE |
| 263 | Motor Back-EMF | MotorBackEMFRenderer.tsx | DONE |
| 264 | H-Bridge Motor Drive | HBridgeDriveRenderer.tsx | DONE |
| 265 | Buck Converter Ripple | BuckConverterRippleRenderer.tsx | DONE |
| 266 | Boost Converter | BoostConverterRenderer.tsx | DONE |
| 267 | Flyback Converter | FlybackConverterRenderer.tsx | DONE |
| 268 | Gate Driver Design | GateDriverRenderer.tsx | DONE |
| 269 | Stepper Motor Control | StepperMotorRenderer.tsx | DONE |
| 270 | Servo Control Loop (PID) | ServoControlRenderer.tsx | DONE |
| 271 | Wheatstone Bridge Balance | WheatstoneBalanceRenderer.tsx | DONE |
| 272 | Strain Gauge & Load Cell | StrainGaugeSensorRenderer.tsx | DONE |
| 273 | Thermocouple Nonlinearity | ThermocoupleNonlinearityRenderer.tsx | DONE |
| 275 | Impedance Matching | ImpedanceMatchingRenderer.tsx | DONE |
| 276 | Active Filter Design | FilterDesignRenderer.tsx | DONE |
| 278 | EMC Compliance | EMCComplianceRenderer.tsx | DONE |
| 280 | Solder Reflow Profile | SolderReflowRenderer.tsx | DONE |

## Failed to Build (Agent ran out of usage - need to rebuild)

| # | Game | Expected File | Status |
|---|------|--------------|--------|
| 274 | RTD Linearization | RTDLinearizationRenderer.tsx | NEEDS BUILD |
| 277 | System Power Budget | PowerBudgetRenderer.tsx | NEEDS BUILD |
| 279 | PCB Stackup Design | PCBStackupRenderer.tsx | NEEDS BUILD |

---

## REMAINING GAMES TO BUILD (~150 total)

### CATEGORY A: Electrical Engineering (Games 281-350)

#### A1. Reliability & Testing (281-290)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 281 | Thermal Cycling Reliability | Solder joint fatigue from temperature cycling. Coffin-Manson model predicts cycles to failure. | Cross-section of solder joint with crack propagation animation | Nf = C * (delta_T)^(-n), typically n=2-3 |
| 282 | HALT/HASS Testing | Highly Accelerated Life Testing - find failure modes fast by combining thermal + vibration stress | Stress profile chart (temp ramp + vibration) with failure detection markers | Acceleration factor, time-to-failure distribution |
| 283 | Bathtub Curve Reliability | Product failure rate over time: infant mortality, useful life, wearout. Weibull distribution. | Classic bathtub curve with three regions highlighted, failure rate vs time | Lambda(t) = (beta/eta)*(t/eta)^(beta-1), MTBF = 1/lambda |
| 284 | JTAG Boundary Scan | IEEE 1149.1 - testing IC interconnects without physical probes. Shift register chain through all pins. | Chain of ICs with JTAG signals (TDI, TDO, TCK, TMS) and scan path highlighted | Test Access Port state machine, shift/capture/update |
| 285 | In-Circuit Test (ICT) | Bed-of-nails testing - verify component values and solder connections on assembled PCBs | Top-down PCB with test probe locations, pass/fail per component | Resistance, capacitance, diode check measurements |
| 286 | Burn-In Testing | Accelerated aging at elevated temperature/voltage to weed out infant mortality failures | Temperature profile over time with failure count decreasing | Arrhenius acceleration: AF = exp(Ea/k * (1/T1 - 1/T2)) |
| 287 | ESD Device Physics | What happens inside a chip during ESD: oxide breakdown, junction damage, latent defects | Cross-section of MOSFET gate oxide with electric field and breakdown | HBM: 100pF through 1500 ohm, CDM: direct chip discharge |
| 288 | Latch-Up Prevention | Parasitic PNPN thyristor in CMOS turns on and shorts supply, potentially destroying the chip | CMOS cross-section showing parasitic NPN/PNP transistors | Guard rings, substrate/well contacts, layout spacing rules |
| 289 | Wire Bond Pull Test | Measuring bond strength by pulling wire bonds. Bond geometry affects pull force. | Side view of wire bond with pull hook and force vector | Pull strength vs loop height, neck break vs heel break |
| 290 | Conformal Coating | Protecting PCBs from moisture, dust, chemicals. Different coating types for different environments. | PCB cross-section with coating layers, moisture penetration simulation | Coating thickness, dielectric withstand, thermal conductivity |

#### A2. Signal Processing & Communications (291-300)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 291 | FFT Spectrum Analysis | Converting time-domain signals to frequency domain using Fast Fourier Transform | Split view: time waveform top, frequency spectrum bottom | X(f) = sum(x(n)*e^(-j2pi*fn/N)), frequency resolution = fs/N |
| 292 | Digital Modulation (QAM) | Quadrature Amplitude Modulation - encoding bits on amplitude and phase of carrier | Constellation diagram (I-Q plane) with symbol points | BER vs SNR, bits per symbol = log2(M), 16-QAM = 4 bits |
| 293 | Spread Spectrum | Spreading signal over wide bandwidth for interference resistance (CDMA, GPS, WiFi) | Original narrow signal spreading across wide bandwidth | Processing gain = BW_spread/BW_data, jamming margin |
| 294 | Error Correction (Hamming) | Adding redundant bits to detect and correct errors. Hamming distance and parity checks. | Matrix of data bits + parity bits with error detection/correction visualization | Hamming(7,4): 4 data + 3 parity, corrects 1-bit errors |
| 295 | Sampling Theorem (Nyquist) | Must sample at >2x highest frequency to avoid aliasing. Undersampling creates phantom signals. | Original signal + sampled points + reconstructed (possibly aliased) signal | fs > 2*fmax, aliased frequency = |f - n*fs| |
| 296 | Delta-Sigma Modulation | Oversampling + noise shaping: push quantization noise to higher frequencies then filter | Noise spectrum showing noise pushed to high frequencies | OSR = fs/(2*BW), SNR improves 15dB per doubling of OSR for 2nd order |
| 297 | OFDM Subcarriers | Orthogonal Frequency Division Multiplexing - many narrow subcarriers resist multipath fading | Frequency spectrum showing orthogonal subcarriers overlapping | Subcarrier spacing = 1/symbol_period, cyclic prefix |
| 298 | Radar Range Equation | Power returned from target depends on range^4, antenna gain, RCS. Range-power tradeoff. | Radar beam hitting target, return signal strength vs distance | Pr = Pt*G^2*lambda^2*sigma / ((4pi)^3 * R^4) |
| 299 | Digital Beamforming | Antenna array with adjustable phase per element to steer beam electronically | Array of antenna elements with beam pattern (main lobe + sidelobes) | Beam angle = arcsin(lambda*phase_gradient/(2pi*d)) |
| 300 | Channel Capacity (Shannon) | Maximum data rate for a given bandwidth and SNR. Fundamental communications limit. | Capacity vs SNR curve, bandwidth vs capacity tradeoff | C = B * log2(1 + SNR), bits/sec/Hz |

#### A3. Power Systems & Grid (301-310)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 301 | Three-Phase Power | Why 3-phase: constant power delivery, rotating magnetic fields. Phase relationships. | Three sine waves 120 degrees apart, phasor diagram rotating | Pline = sqrt(3) * Vline * Iline * cos(phi) |
| 302 | Power System Protection | Relay coordination - circuit breakers must trip in correct sequence (downstream first) | One-line diagram with breakers and time-current coordination curves | Time-current curves, pickup current, time dial settings |
| 303 | Grounding Systems | TN, TT, IT grounding schemes. Earth resistance, step/touch potential, ground fault detection. | Building electrical system with ground electrodes and fault current paths | Ground resistance, step voltage, touch voltage limits |
| 304 | Harmonic Distortion (THD) | Non-linear loads (rectifiers, VFDs) create harmonics that distort the power grid waveform | Distorted waveform decomposed into fundamental + harmonics | THD = sqrt(sum(Ih^2))/I1, IEEE 519 limits |
| 305 | Reactive Power Compensation | Capacitor banks to improve power factor, reduce losses, support voltage. | Power triangle: P, Q, S with capacitor bank reducing Q | Q_cap = V^2 * omega * C, PF = P/S |
| 306 | Short Circuit Analysis | Calculating fault current for breaker sizing. Symmetrical components for unbalanced faults. | One-line diagram with fault location, current flow arrows | Isc = V/Z_total, X/R ratio determines DC offset |
| 307 | Load Flow Analysis | Power flow through a network - voltage at each bus, power on each line. | Network diagram with buses, generators, loads, power flow arrows | P = V1*V2*sin(delta)/X, Newton-Raphson iteration |
| 308 | Transformer Tap Changer | Voltage regulation by changing transformer turns ratio under load. | Transformer with tap positions and output voltage tracking | V2 = V1 * N2/N1, tap step = typically 1.25% per step |
| 309 | Arc Flash Hazard | Electrical arc energy release - calculating incident energy for PPE selection. | Worker near panel with arc flash boundary zones | E = V*I*t*(distance_factor), IEEE 1584 calculations |
| 310 | Islanding Detection | Distributed generation must detect when grid disconnects to prevent energizing dead lines. | Grid with solar/wind generation, island detection methods | Frequency shift, voltage shift, impedance change detection |

#### A4. Analog & Mixed-Signal IC (311-320)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 311 | Bandgap Voltage Reference | Temperature-independent voltage reference using VBE and delta-VBE compensation | VBE(T) decreasing + PTAT increasing = flat Vref vs temperature curve | Vref = VBE + K*delta_VBE ~ 1.205V (silicon bandgap) |
| 312 | Charge Pump Voltage Multiplier | Generating higher voltages from lower using switched capacitors (no inductor needed) | Capacitor switching animation: charge, stack, discharge | Vout = N*Vin (ideal N-stage), efficiency = Vout/(N*Vin) |
| 313 | Sample and Hold Circuit | Capturing analog voltage at precise moment - acquisition time, droop, aperture jitter | Waveform with sample pulses, held values (staircase), droop visible | Acquisition time = N*tau, droop rate = I_leak/C_hold |
| 314 | Comparator Hysteresis | Schmitt trigger - adding hysteresis to prevent oscillation at threshold. Two switching points. | Input vs output transfer curve showing hysteresis loop | V_high = Vref + Vhyst/2, V_low = Vref - Vhyst/2 |
| 315 | CMOS Process Corners | Chip performance varies: FF (fast-fast), TT (typical), SS (slow-slow) corners affect timing | Delay histogram across corners, timing margin visualization | Corner combinations: FF, FS, SF, SS, TT + voltage + temp |
| 316 | Power-On Reset | Ensuring clean startup: POR circuit monitors supply ramp, holds reset until stable | Supply voltage ramp with reset assertion/deassertion timing | POR threshold, glitch filter time, brownout detection |
| 317 | Oscillator Design (Ring/RC/Crystal) | Different oscillator types: ring osc (digital), RC (cheap), crystal (precise) | Oscillator circuit with output waveform showing frequency stability | f_ring = 1/(2*N*t_pd), f_crystal = 1/(2pi*sqrt(LC)) |
| 318 | Analog Layout Matching | IC layout techniques for matched components: common-centroid, interdigitation | Top-down IC layout showing matched transistor arrangements | Offset voltage, systematic vs random mismatch |
| 319 | LDO Dropout & PSRR | Linear regulator: minimum headroom (dropout), power supply rejection ratio vs frequency | Vout vs Vin showing dropout region, PSRR vs frequency Bode plot | Dropout = Vds_sat, PSRR(f) = 20*log(delta_Vin/delta_Vout) |
| 320 | Sigma-Delta ADC Architecture | Oversampling + noise shaping + decimation filter = high resolution from 1-bit comparator | Noise transfer function showing noise pushed out of band | SNR = 6.02*N + 1.76 + 10*log(OSR) + 20*log(order+0.5) |

#### A5. Digital Design & FPGA (321-330)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 321 | Setup & Hold Timing | Flip-flop timing constraints: data must be stable before (setup) and after (hold) clock edge | Timing diagram with setup/hold windows, violation highlighting | Tsetup + Thold < Tperiod - Tclk_to_q, slack calculation |
| 322 | Clock Domain Crossing | Moving signals between asynchronous clock domains safely using synchronizers | Two clock domains with synchronizer flip-flops, metastability risk | MTBF = 1/(f_clk * f_data * T_resolve * exp(-T_resolve/tau)) |
| 323 | FIFO Design & Depth | First-In-First-Out buffer sizing: must handle burst without overflow or underflow | FIFO fill level animation with read/write pointers | Depth = burst_length * (1 - f_read/f_write) for rate mismatch |
| 324 | Finite State Machine Design | FSM encoding: one-hot vs binary vs Gray. State transitions and output logic. | State diagram with transitions, timing diagram of outputs | States, transitions, outputs (Mealy vs Moore) |
| 325 | Pipeline Hazards | Data hazards in pipelined processors: RAW, WAR, WAW. Forwarding and stalling. | Pipeline stage diagram with data dependency arrows | CPI = 1 + stall_cycles/instruction, forwarding reduction |
| 326 | Memory-Mapped I/O | Accessing hardware peripherals through memory addresses. Address decoding, bus arbitration. | Address space map with peripheral registers, read/write timing | Base address + offset, bus width, wait states |
| 327 | SPI/I2C Protocol | Serial communication protocols: SPI (4-wire, fast) vs I2C (2-wire, addressable) | Logic analyzer view of SCK, MOSI, MISO, CS signals with data bits labeled | SPI: f_max ~ 50MHz, I2C: 100/400/3400 kHz modes |
| 328 | UART & Baud Rate | Asynchronous serial: start bit, data, parity, stop. Baud rate mismatch causes errors. | Serial waveform with bit timing, sampling points at center of each bit | Error tolerance: ±5% baud rate, over 10 bits = ±0.5% per bit |
| 329 | DMA Controller | Direct Memory Access: hardware moves data between memory and peripherals without CPU | Data flow diagram: DMA channel connecting peripheral to memory, CPU freed | Bandwidth = burst_size * f_transfer, bus arbitration priority |
| 330 | Interrupt Priority & Latency | Nested interrupts, priority levels, latency from event to handler execution | Timeline showing interrupt arrival, context save, handler execution | Latency = context_save + branch + pipeline_flush, NVIC levels |

#### A6. Sensors & Instrumentation (331-340)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 331 | MEMS Accelerometer | Proof mass on spring: capacitance changes with acceleration. Used in phones, cars. | Cross-section of MEMS structure with proof mass displacement | F = m*a, C = epsilon*A/d, sensitivity = delta_C/delta_a |
| 332 | Hall Effect Sensor | Current through conductor in magnetic field creates transverse voltage. Current/field sensing. | Conductor slab with current, B-field, and Hall voltage labeled | V_Hall = I*B/(n*e*t), sensitivity = V_Hall/B |
| 333 | Optical Encoder | Rotary position sensing: light through slotted disk creates pulse train. Quadrature for direction. | Spinning disk with slots, photodetector, A/B quadrature signals | Resolution = 360/(N*4) degrees for quadrature, RPM = pulses*60/(N*t) |
| 334 | Ultrasonic Distance | Time-of-flight measurement: send ultrasonic pulse, measure echo return time | Transducer, sound wave path to target and back, time measurement | Distance = v_sound * t_echo / 2, v_sound ~ 343 m/s at 20C |
| 335 | pH Electrode | Glass electrode generates voltage proportional to H+ ion concentration (Nernst equation) | Electrode in solution with voltage vs pH calibration curve | E = E0 + (RT/nF)*ln(aH+), slope = 59.16 mV/pH at 25C |
| 336 | Photodiode Modes | Photovoltaic vs photoconductive mode: speed vs linearity tradeoff | I-V curve of photodiode showing operating regions, transimpedance amp | I_photo = R * P_optical, bandwidth = 1/(2*pi*R_load*C_junction) |
| 337 | Instrumentation Amplifier | Differential amplifier with high CMRR for measuring small signals in noisy environments | Three-op-amp INA circuit with gain and CMRR vs frequency plots | Gain = 1 + 2R/Rg, CMRR > 100dB, input impedance > 1Gohm |
| 338 | Lock-In Amplifier | Extracting tiny signals buried in noise by multiplying with reference and filtering | Signal + noise -> mixer with reference -> LPF -> clean DC output | Detect signals at -60dB SNR, equivalent noise BW < 1Hz |
| 339 | Pressure Sensor (Piezoresistive) | Resistors on silicon diaphragm change value with pressure. Bridge circuit output. | Diaphragm cross-section with piezoresistors, pressure vs output curve | delta_R/R = pi * sigma, sensitivity = delta_V/(V_exc * delta_P) |
| 340 | Gyroscope (MEMS Coriolis) | Vibrating structure: Coriolis force from rotation creates detectable displacement | Vibrating proof mass with Coriolis force perpendicular to vibration | F_coriolis = 2*m*v*omega, drift rate, bias stability |

#### A7. Remaining EE Topics (341-350)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 341 | Battery Charging (CC-CV) | Constant Current then Constant Voltage charging profile for Li-ion. | Voltage and current vs time showing CC-CV transition | CC phase: I = I_max until V = V_max, CV phase: V = V_max, I decreasing |
| 342 | Supercapacitor Energy Storage | Very high capacitance (Farads), low voltage. Energy and power density tradeoffs vs batteries. | Ragone plot: energy density vs power density comparing technologies | E = 0.5*C*V^2, P = V^2/(4*ESR), cycle life > 500k |
| 343 | Piezoelectric Energy Harvesting | Vibration to electricity using piezo materials. Resonant frequency matching for max power. | Cantilever beam with piezo element, vibration frequency sweep | P = (m*A^2)/(8*omega_n*zeta), resonance matching critical |
| 344 | Thermoelectric Generator (Peltier) | Seebeck effect: temperature difference across junction creates voltage. ZT figure of merit. | Hot/cold junction pair with voltage output, ZT vs temperature curves | V = S*delta_T, ZT = S^2*sigma*T/kappa, efficiency < Carnot |
| 345 | Wireless Power Transfer Efficiency | Magnetic resonance coupling: efficiency depends on coupling factor, Q, and frequency | Two coupled coils with magnetic field lines, efficiency vs distance | eta = k^2*Q1*Q2 / (1 + k^2*Q1*Q2), coupling vs distance^3 |
| 346 | Relay Logic & Ladder Diagrams | Industrial control: relay logic circuits represented as ladder diagrams (PLC programming basis) | Ladder diagram with rungs, contacts, coils, timer/counter blocks | AND = series contacts, OR = parallel contacts, NOT = NC contact |
| 347 | Power MOSFET vs IGBT | MOSFET: fast switching, low voltage. IGBT: slow but handles high voltage/current. Selection criteria. | On-state loss vs switching loss comparison chart | MOSFET: Rds(on)*I^2, IGBT: Vce(sat)*I + switching losses |
| 348 | Switched Capacitor Circuits | Using switches and capacitors to emulate resistors in IC design (no real resistors needed) | Switch + capacitor circuit with equivalent resistance visualization | R_eq = 1/(f_sw * C), integrator, sample-and-hold implementations |
| 349 | Current Sensing Methods | Shunt resistor vs Hall sensor vs Rogowski coil. Accuracy, bandwidth, isolation tradeoffs. | Comparison table with circuit diagrams for each method | Shunt: V=IR (mOhm), Hall: isolated, Rogowski: di/dt sensing |
| 350 | Electromagnetic Relay | Coil creates magnetic field to pull armature, closing contacts. Flyback diode protection. | Relay cross-section with coil, armature, contacts, flyback diode | F = B^2*A/(2*mu_0), coil time constant = L/R |

---

### CATEGORY B: Mechanical Engineering (Games 351-400)

#### B1. Stress & Strain (351-360)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 351 | Stress Concentration | Holes, notches, fillets create stress multipliers. Kt factor depends on geometry. | Colored stress field around a hole showing concentration | sigma_max = Kt * sigma_nominal, Kt from geometry charts |
| 352 | Beam Bending & Deflection | Cantilever and simply-supported beams: moment diagrams, stress distribution, deflection | Beam with load, shear/moment diagrams below, stress color map | sigma = M*y/I, delta = PL^3/(3EI) for cantilever |
| 353 | Torsion of Shafts | Twisting of circular shafts: shear stress distribution, angle of twist | Shaft cross-section with shear stress gradient (zero at center, max at surface) | tau = T*r/J, phi = TL/(GJ), J = pi*d^4/32 |
| 354 | Column Buckling (Euler) | Slender columns fail by buckling, not crushing. Critical load depends on length^2 and end conditions. | Column with increasing load, deflection shape at buckling | Pcr = pi^2*E*I/(KL)^2, K = 0.5/0.7/1.0/2.0 for end conditions |
| 355 | Fatigue S-N Curve | Repeated loading causes failure below static strength. S-N curve shows cycles to failure. | S-N curve (stress vs cycles) with endurance limit, Goodman diagram | S = a*N^b, Goodman: Sa/Se + Sm/Su = 1 |
| 356 | Creep & Stress Relaxation | Materials deform slowly under constant stress at high temperature. Three stages of creep. | Strain vs time curve showing primary, secondary, tertiary creep | epsilon_dot = A*sigma^n*exp(-Q/RT), Larson-Miller parameter |
| 357 | Hertz Contact Stress | When curved surfaces press together, contact area is small and stress is very high | Two spheres/cylinders in contact with stress distribution (elliptical) | p_max = (3F)/(2*pi*a*b), contact radius a = (3FR/(4E*))^(1/3) |
| 358 | Mohr's Circle | Graphical method to find principal stresses and maximum shear from any stress state | Interactive Mohr's circle with stress element rotation | sigma_1,2 = (sx+sy)/2 +/- sqrt(((sx-sy)/2)^2 + txy^2) |
| 359 | Thermal Stress | Constrained expansion creates stress. Bimetallic strips, engine blocks, PCBs. | Bar constrained at both ends, temperature increasing, stress building | sigma = E*alpha*delta_T, for constrained expansion |
| 360 | Weld Joint Strength | Different weld types (fillet, butt, groove) have different strength calculations | Weld cross-sections with throat thickness and stress distribution | tau = F/(throat * length), throat = 0.707 * leg for fillet |

#### B2. Machine Design (361-370)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 361 | Gear Train Ratios | Meshing gears: speed reduction, torque multiplication, compound gear trains | Animated meshing gears with teeth count, speed/torque readouts | GR = N_driven/N_driver, T_out = T_in * GR * eta |
| 362 | Bearing Selection | Ball vs roller vs journal bearings: load capacity, speed, life calculation | Bearing cross-section with load distribution on rolling elements | L10 = (C/P)^p * 10^6 revolutions, p=3 for ball, p=10/3 for roller |
| 363 | Belt Drive Design | V-belt and timing belt: speed ratio, belt tension, slip, power transmission | Belt wrapped around pulleys with tension diagram | P = (T1-T2)*v, T1/T2 = e^(mu*theta), belt life estimation |
| 364 | Spring Design | Compression, extension, torsion springs. Wire diameter, coil diameter, stress, deflection. | Spring with force-deflection curve, stress distribution in wire | k = Gd^4/(8D^3*N), tau = 8FD/(pi*d^3) * Kw |
| 365 | Cam Mechanism Design | Converting rotary to linear motion. Cam profile determines follower motion (velocity, acceleration) | Cam rotating with follower displacement/velocity/acceleration plots | SVAJ diagrams, pressure angle, undercutting limits |
| 366 | Clutch & Brake Design | Friction-based torque transmission. Single vs multi-plate, thermal capacity. | Clutch plates with friction surfaces, torque vs slip curve | T = mu*F*r_mean*N_surfaces, heat Q = T*omega*slip_time |
| 367 | Shaft Critical Speed | Rotating shaft vibration: must operate away from natural frequencies (critical speeds) | Shaft with mass, deflection mode shapes, Bode plot of vibration vs speed | omega_cr = sqrt(g/delta_st), Dunkerley's method for multi-mass |
| 368 | Bolted Joint Analysis | Preload, external load sharing, joint diagram (triangle diagram), fatigue of bolts | Joint diagram showing bolt load line and member load line | F_bolt = F_preload + C*F_external, C = kb/(kb+km) |
| 369 | Pressure Vessel Design | Thin-wall and thick-wall cylinders: hoop stress, longitudinal stress, end cap stress | Cylinder with stress arrows (hoop and longitudinal), Mohr's circle | sigma_hoop = pD/(2t), sigma_long = pD/(4t), ASME safety factors |
| 370 | Chain Drive Design | Roller chain selection: pitch, sprocket teeth, speed ratio, chain pull, wear life | Chain meshing with sprocket, polygon effect visualization | P = T*v, chain pull = T/r, polygon effect frequency |

#### B3. Thermofluids & Manufacturing (371-400)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 371 | Heat Exchanger Effectiveness | Counter-flow vs parallel flow: LMTD method, effectiveness-NTU, fouling | Temperature profiles along exchanger length for both flow types | Q = U*A*LMTD, epsilon = Q/Q_max, NTU = UA/C_min |
| 372 | Refrigeration Cycle | Vapor-compression cycle: compressor, condenser, expansion valve, evaporator. COP. | P-h diagram with cycle path, component labels | COP_cooling = Q_L/W_comp = h1-h4)/(h2-h1) |
| 373 | Pump Curves & System Curves | Pump head vs flow rate. Operating point where pump curve meets system curve. | Pump curve + system curve intersection, efficiency curve overlay | H_system = H_static + K*Q^2, NPSH > NPSHr to avoid cavitation |
| 374 | Compressor Design | Positive displacement vs centrifugal. Pressure ratio, efficiency, surge line. | Compressor map with speed lines, surge line, choke line | PR = P2/P1, eta_is = (T2s-T1)/(T2-T1), surge margin |
| 375 | Nozzle & Diffuser Flow | Converging nozzle accelerates subsonic flow. Converging-diverging for supersonic. Area-velocity relation. | Nozzle geometry with Mach number, pressure, temperature profiles | A/A* = (1/M)*((2/(gamma+1))*(1+(gamma-1)/2*M^2))^((gamma+1)/(2*(gamma-1))) |
| 376 | Boundary Layer Flow | Laminar vs turbulent boundary layer: velocity profile, skin friction, transition | Flat plate with growing boundary layer, velocity profiles at different x | delta = 5x/sqrt(Rex) laminar, Cf = 0.664/sqrt(Rex) |
| 377 | Pipe Network Analysis | Hardy-Cross method: balancing flow in pipe networks (water distribution) | Network of pipes with nodes, flow rates, pressure drops | Sum of head losses around any loop = 0, hf = f*L*Q^2/(D^5) |
| 378 | Natural Convection | Buoyancy-driven flow: Rayleigh number determines laminar/turbulent, Nu correlation | Heated vertical plate with rising air, temperature/velocity boundary layers | Ra = Gr*Pr = g*beta*delta_T*L^3/(nu*alpha), Nu = C*Ra^n |
| 379 | Radiation View Factors | How much radiation surface 1 "sees" of surface 2. Geometry determines heat exchange. | Two surfaces with radiation paths, view factor diagram | F12 = (1/A1)*integral(cos_theta1*cos_theta2/(pi*r^2))*dA1*dA2 |
| 380 | Casting & Solidification | Metal solidification: cooling rate, grain structure, shrinkage, riser design | Mold cross-section with solidification front moving inward | Chvorinov's rule: t_s = B*(V/A)^2, directional solidification |
| 381 | CNC Machining Parameters | Feeds and speeds: cutting speed, feed rate, depth of cut affect surface finish and tool life | Cutting tool with chip formation, surface finish measurement | Vc = pi*D*N/1000, feed = f*N*z, MRR = ap*ae*vf |
| 382 | Injection Molding | Plastic filling mold cavity: gate location, flow fronts, cooling time, warpage | Mold cavity with flow front animation, pressure distribution | Fill time, packing pressure, cooling time = t^2/(pi^2*alpha) |
| 383 | Sheet Metal Bending | Bend radius, springback, K-factor, blank length calculation | Sheet being bent with neutral axis, springback illustration | L_bend = (R + K*t)*theta, springback angle = function(R/t, E, sigma_y) |
| 384 | Welding Heat Input | HAZ size depends on heat input. Cooling rate affects microstructure. | Weld cross-section with temperature contours (color map), HAZ boundaries | HI = V*I*60/(S*1000), cooling rate = 2*pi*k*(Tp-T0)^2/(HI) |
| 385 | GD&T Position Tolerance | Geometric Dimensioning & Tolerancing: position, profile, runout, concentricity | Part drawing with GD&T callouts, tolerance zone visualization | Position: phi_tol = 2*sqrt(dx^2+dy^2), MMC bonus |
| 386 | Surface Roughness | Ra, Rz, Rq measurement. Machining process determines achievable finish. | Surface profile trace with Ra calculation overlay | Ra = (1/L)*integral(|y|*dx), typical: ground 0.4um, turned 1.6um |
| 387 | Vibration Isolation | Mount design: natural frequency must be well below excitation frequency for isolation | Transmissibility vs frequency ratio curve, isolation region highlighted | T = 1/sqrt((1-r^2)^2 + (2*zeta*r)^2), need r > sqrt(2) |
| 388 | Balancing of Rotating Machinery | Static and dynamic balance: adding correction masses to eliminate vibration | Rotor with unbalance masses, vibration amplitude vs correction | F = m*r*omega^2, two-plane balancing for long rotors |
| 389 | Tolerance Stack-Up Analysis | Worst-case vs statistical (RSS) tolerance analysis for assemblies | Stack of parts with individual tolerances summing | WC: T_total = sum(Ti), RSS: T_total = sqrt(sum(Ti^2)) |
| 390 | Failure Mode Effects Analysis (FMEA) | Systematic risk assessment: RPN = Severity * Occurrence * Detection | FMEA table with severity/occurrence/detection ratings | RPN = S*O*D, prioritize high RPN items for corrective action |
| 391-400 | (Additional ME topics) | Hydraulic systems, pneumatics, linkage mechanisms, tribology, corrosion, NDT methods, composite layup, additive manufacturing, quality control (SPC), reliability-centered maintenance | Various per topic | Various per topic |

---

### CATEGORY C: Battery Technology (Games 401-450)

#### C1. Cell Physics & Electrochemistry (401-415)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 401 | Li-Ion Cell Internal Resistance | DC-IR vs AC impedance. How IR causes voltage sag under load and heat generation. | V-I curve under load showing voltage drop, Nyquist impedance plot | V_drop = I*R_internal, P_heat = I^2*R, EIS semicircle |
| 402 | State of Charge Estimation | Coulomb counting, OCV-SOC curve, Kalman filter fusion. Accuracy challenges. | SOC gauge with OCV-SOC curve, coulomb counting drift visualization | SOC = SOC_0 + integral(I*dt)/Q_nom, OCV lookup table |
| 403 | Electrode Kinetics (Butler-Volmer) | Activation overpotential at electrode surface. Exchange current density, Tafel slope. | Current vs overpotential curve (Butler-Volmer), Tafel plot (log scale) | i = i0*(exp(alpha*F*eta/RT) - exp(-(1-alpha)*F*eta/RT)) |
| 404 | Solid Electrolyte Interface (SEI) | Protective film on anode: forms during first charge, grows over life, consumes lithium | Anode surface cross-section showing SEI layer growth over cycles | Capacity fade = SEI_growth * Li_consumed, sqrt(t) growth law |
| 405 | Lithium Plating | Charging too fast or too cold causes metallic lithium deposition - safety hazard, capacity loss | Anode cross-section showing dendrite growth vs intercalation | Plating onset: anode potential < 0V vs Li/Li+, rate and temp dependent |
| 406 | Thermal Runaway Cascade | Exothermic chain reaction: SEI decomposition → cathode O2 release → electrolyte combustion | Temperature vs time showing cascade stages, heat generation rates | Onset ~80C (SEI), ~150C (separator), ~200C (cathode), ~250C (electrolyte) |
| 407 | Diffusion Limitation | Ion transport through electrode pores limits rate capability. Thick electrodes = more energy, less power. | Concentration profile across electrode thickness under different C-rates | D_eff = D*epsilon/tau, utilization drops at high C-rate for thick electrodes |
| 408 | Cathode Chemistry Comparison | NMC vs LFP vs NCA vs LCO: energy density, safety, cost, cycle life tradeoffs | Radar/spider chart comparing 5+ properties across chemistries | NMC811: 200Wh/kg, LFP: 160Wh/kg but safer and cheaper |
| 409 | Anode Materials | Graphite vs silicon vs lithium metal: capacity vs expansion vs cycle life | Anode material crystal structure with Li intercalation animation | Graphite: 372 mAh/g, Silicon: 4200 mAh/g but 300% expansion |
| 410 | Electrolyte Conductivity | Liquid vs solid vs polymer electrolyte. Conductivity, stability window, safety. | Conductivity vs temperature curves for different electrolyte types | sigma = A*exp(-Ea/RT), liquid ~10 mS/cm, solid ~1 mS/cm |
| 411 | Calendar Aging | Battery degrades even sitting on shelf. SOC and temperature accelerate aging. | Capacity vs time at different storage temperatures and SOC levels | Q_loss = A*exp(-Ea/kT)*sqrt(t), store at 30-50% SOC, cool |
| 412 | Cycle Aging Mechanisms | Capacity fade and impedance rise with cycling. SEI growth, particle cracking, Li loss. | Capacity vs cycle number showing knee point, impedance growth curve | Q = Q0 - a*sqrt(N) - b*N, knee point = accelerated degradation |
| 413 | Rate Capability | Peukert effect: usable capacity decreases at higher discharge rates | Discharge curves at different C-rates (1C, 2C, 5C, 10C) | Peukert: t = T*(C/I)^k, k=1.0 ideal, k=1.1-1.3 typical |
| 414 | Self-Discharge | All batteries lose charge over time. Different mechanisms at different SOC and temperature. | SOC vs time showing self-discharge rate, comparison across chemistries | ~2-5% per month for Li-ion, ~30% per month for NiMH |
| 415 | Impedance Spectroscopy (EIS) | AC impedance at different frequencies reveals internal processes: ohmic, charge transfer, diffusion | Nyquist plot with labeled semicircles and Warburg tail | Z(omega) = R_ohmic + R_ct/(1+j*omega*R_ct*C_dl) + Z_warburg |

#### C2. Battery Pack & BMS (416-430)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 416 | Cell Balancing (Passive vs Active) | Series cells drift apart in SOC. Passive: burn excess energy. Active: transfer energy between cells. | Series string with cell voltage bars, balancing current flow | Passive: R_bleed*I_balance, Active: efficiency * delta_energy transfer |
| 417 | Pack Configuration (Series-Parallel) | Series for voltage, parallel for capacity. NsNp configuration determines pack specs. | Pack diagram showing series strings and parallel groups | V_pack = Ns*V_cell, Q_pack = Np*Q_cell, E = V_pack*Q_pack |
| 418 | Battery Thermal Management | Cell temperature uniformity is critical. Liquid cooling vs air cooling vs phase change. | Pack cross-section with temperature gradient, cooling channel flow | Q_gen = I^2*R + I*T*dOCV/dT, thermal resistance network |
| 419 | SOH Estimation | State of Health: tracking capacity fade and impedance rise over battery life | Capacity trend over cycles with prediction line, remaining useful life | SOH_Q = Q_current/Q_nominal * 100%, SOH_R = R_nominal/R_current * 100% |
| 420 | Contactor & Precharge | High-voltage contactors + precharge circuit to safely connect battery pack to inverter | Schematic with main contactors, precharge resistor, capacitor charging curve | V(t) = V_batt*(1-exp(-t/RC)), precharge time to 90% = 2.3*RC |
| 421 | Fault Detection (BMS) | Overvoltage, undervoltage, overcurrent, overtemp, cell imbalance detection and response | BMS dashboard with fault indicators, threshold settings | OV > 4.2V, UV < 2.5V, OC > pack_rating, OT > 60C thresholds |
| 422 | Pack Insulation Resistance | Measuring isolation between HV bus and chassis. IMD (Insulation Monitoring Device). | HV pack with isolation measurement between + and chassis | R_isolation > 500 ohm/V (automotive standard), leakage current |
| 423 | Charging Protocol Design | CC-CV, step charging, pulse charging, fast charging profiles for longevity vs speed | Charge profile (V, I, T vs time) with protocol comparison | CC phase until V_max, CV phase until I < C/20, fast charge < 30min |
| 424 | Second-Life Battery Assessment | Grading retired EV batteries for stationary storage. Capacity testing, binning. | Capacity distribution histogram of retired cells, binning categories | Grade A: >80% SOH, Grade B: 60-80%, recycle: <60% |
| 425 | Battery Safety Standards | UN38.3, IEC 62660, UL 2580 testing: crush, nail, overcharge, short circuit | Test matrix showing different abuse tests and pass/fail criteria | UN38.3: altitude, thermal, vibration, shock, short circuit, impact |
| 426 | DC Fast Charging Infrastructure | DCFC power levels, cable cooling, grid impact, charging curve optimization | Charging station diagram with power flow, SOC vs time curve | 50kW (CCS1), 150kW, 350kW, megawatt charging for trucks |
| 427 | Battery Fire Suppression | Thermal runaway propagation, fire suppression methods, gas venting | Pack with cell-to-cell propagation animation, barrier effectiveness | Propagation time between cells, barrier thickness, vent gas composition |
| 428 | Welding of Battery Tabs | Ultrasonic, laser, resistance welding of cell tabs. Joint resistance affects pack performance. | Weld cross-section with nugget formation, resistance measurement | Contact resistance < 0.1 mohm, weld strength > cell pull tab |
| 429 | Module-to-Pack Design | Cell-to-pack (CTP) vs cell-to-module. Volumetric efficiency, serviceability tradeoffs. | Pack exploded view showing cell, module, pack layers | Volumetric efficiency = cell_volume/pack_volume, CTP > 70% |
| 430 | HV Interlock Loop | Safety circuit that detects if pack enclosure is opened. Loop continuity check. | Series loop through all connectors and covers with interlock switch | Open loop = immediate contactor opening, connector sequences |

#### C3. Manufacturing & Supply Chain (431-445)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 431 | Electrode Coating Process | Slurry mixing, slot-die coating, drying, calendering. Coating uniformity is critical. | Roll-to-roll coating line with thickness profile measurement | Loading: mg/cm^2, porosity after calendering: 25-35%, uniformity ±2% |
| 432 | Cell Formation Protocol | First charge creates SEI. Formation protocol affects cell quality, capacity, impedance. | First-charge voltage profile with SEI formation plateau | Formation: C/10 to 3.0V, then C/5 to 4.2V, capacity check |
| 433 | Dry Room Requirements | Moisture destroys Li-ion cells. Dew point control, airlock design, personnel limits. | Dry room layout with dew point zones (-40C, -50C, -60C) | Dew point < -40C, moisture content < 20 ppm, energy cost |
| 434 | Electrolyte Filling | Vacuum filling of electrolyte into cell. Wetting time, fill volume precision. | Cell cross-section showing electrolyte infiltrating electrode pores | Fill volume = pore_volume + excess, wetting time = hours to days |
| 435 | Cell Grading & Matching | Sorting cells by capacity, impedance, self-discharge for pack consistency. | Histogram of cell capacities with binning windows | Capacity spread < 1%, impedance match < 3%, self-discharge match |
| 436 | Gigafactory Layout | Material flow from raw materials to finished packs. Bottleneck identification. | Factory floor plan with process flow arrows, bottleneck highlighting | Throughput = min(electrode, assembly, formation, pack), takt time |
| 437 | Cathode Precursor Synthesis | Co-precipitation of Ni, Mn, Co hydroxides. pH, temperature, stirring control morphology. | Reactor with pH/temp controls, particle size distribution output | Particle size D50 = 3-12 um, tap density, sphericity |
| 438 | Recycling (Hydrometallurgical) | Shredding, leaching, solvent extraction, precipitation to recover Ni, Co, Li, Mn | Process flow: shred → leach → separate → precipitate → refine | Recovery rates: Co >95%, Ni >95%, Li >90%, cost vs virgin |
| 439 | Recycling (Pyrometallurgical) | Smelting at high temperature to recover metals as alloy. Simpler but loses lithium. | Furnace cross-section with input cells, output alloy + slag | Recovery: Co/Ni in alloy, Li/Al in slag (lost), energy intensive |
| 440 | Lithium Extraction (Brine) | Evaporation ponds or DLE (Direct Lithium Extraction) from salt flat brines. | Aerial view of evaporation ponds or DLE plant flow diagram | Brine: 200-2000 ppm Li, DLE recovery >90% vs ponds 50%, 18 month vs 2 year |
| 441 | Nickel Supply Chain | Mining (laterite vs sulfide), processing (HPAL, Sherritt), class 1 nickel for batteries | Supply chain map from mine to cathode, cost breakdown | Class 1 nickel: >99.8% Ni, laterite HPAL vs sulfide, Indonesia dominance |
| 442 | Cobalt Ethical Sourcing | DRC mining practices, traceability, alternatives (high-Ni, LFP), blockchain tracking | Supply chain map with ethical risk scoring, alternative chemistry comparison | DRC: 70% of global supply, ASM risks, traceability solutions |
| 443 | Solid-State Battery Manufacturing | Depositing solid electrolyte layers, interface engineering, stack pressure requirements | Cell layer stack: cathode/SE/anode with interface resistance challenges | Interfacial resistance: target <10 ohm*cm^2, stack pressure 1-10 MPa |
| 444 | Battery Cost Breakdown | Materials, manufacturing, overhead, margin. Cathode dominates cost. Learning curves. | Waterfall chart of cell cost components ($/kWh) | Materials: 60-70%, manufacturing: 20-25%, overhead: 10-15%, target <$100/kWh |
| 445 | Quality Control (Battery) | In-line inspection: X-ray, vision, hi-pot, OCV check. Defect rate vs yield. | Quality gate diagram with accept/reject at each step | Defect rate < 10 ppm, hi-pot > 500V, OCV within spec ±10mV |

#### C4. Applications & Systems (446-450)
| # | Game Name | Concept | Key Visualization | Key Formula/Metric |
|---|-----------|---------|-------------------|-------------------|
| 446 | EV Range Estimation | EPA cycle simulation: battery capacity, motor efficiency, aero drag, rolling resistance, HVAC load | Speed profile with energy consumption breakdown per component | Range = E_batt * eta_drivetrain / (F_drag + F_rolling + F_grade + P_aux) |
| 447 | Grid Energy Storage Sizing | Sizing battery for peak shaving, frequency regulation, renewable firming | Load profile with peak shaving line, battery SOC vs time | E_batt = P_peak * duration, cycle count/day, 20-year degradation |
| 448 | UPS Battery Sizing | Critical load backup time calculation, N+1 redundancy, end-of-life capacity derating | Load profile with utility failure, battery discharge curve | Autonomy = E_batt * eta * EOL_factor / P_load, string sizing |
| 449 | Solar + Storage System Design | PV + battery sizing for self-consumption, time-of-use arbitrage, backup | Daily load profile, solar generation, battery charge/discharge schedule | Self-consumption rate, arbitrage value, payback period |
| 450 | Battery Swap Station Design | Mechanical swap system: inventory management, charging strategy, throughput | Station layout with charging bays, swap mechanism, queue management | Throughput = bays * charge_rate / E_batt, inventory = peak_demand * swap_time |

---

## IMPLEMENTATION NOTES

### Required Structure for Each Game
Every renderer MUST follow this 10-phase system:
```
hook → predict → play → review → twist_predict → twist_play → twist_review → transfer → test → mastery
```

### Required Technical Elements
1. **Export interface GameEvent** with `eventType` field
2. **Props**: `onGameEvent?: (event: GameEvent) => void; gamePhase?: string;`
3. **playSound** utility function (Web Audio API)
4. **Emit events**: `game_completed` (with score/total), `phase_changed`, `mastery_achieved`
5. **Rich answer key**: red `rgba(239,68,68,0.15)`, green `rgba(34,197,94,0.15)`, amber `rgba(245,158,11,0.12)`
6. **Mastery phase**: score + letter grade + answer key + fixed-bottom "Complete Game" button
7. **Import** TransferPhaseView and useViewport
8. **Dark theme**: `#0f172a` background, `#f8fafc` text, all inline styles
9. **Side-by-side layout**: SVG visualization left, controls right (stacked on mobile)
10. **10 test questions** with scenario-based prompts and explanations

### Quality Standards
- Interactive SVG visualizations that respond to ALL controls
- Realistic physics/engineering calculations
- Clear, educational explanations accessible to beginners
- Progressive difficulty through phases (hook is easy, twist adds complexity)
- Real-world transfer applications with specific industry examples
- 1200-1600+ lines per renderer

### Registration
Each new game must be:
1. Added to `src/data/gameCategories.ts` in the appropriate category
2. Added to `src/data/gameSEOData.ts` with title, description, concepts, difficulty
3. Added to `pages/games/[slug].tsx` dynamic import map (or equivalent router)
