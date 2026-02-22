# Games To Build - Complete Reference Catalog

## Status Summary
- **Total game concepts (251-450):** 200
- **Already built as renderers:** 27
- **Failed builds (need rebuild):** 3 (RTDLinearization #274, PowerBudget #277, PCBStackup #279)
- **Remaining to build:** 173 games
- **Current renderer count:** 367

## Already Built Renderers (27 total)
These renderers exist and are deployed. They were built based on an earlier version of the concept list and may need updates to match the detailed specs below.

| # | Renderer File | Concept Covered | Status |
|---|--------------|-----------------|--------|
| 251 | OscilloscopeTriggererRenderer.tsx | Oscilloscope Triggering | DONE |
| 252 | PowerSupplyDecouplingLayoutRenderer.tsx | Power Supply Decoupling Layout | DONE |
| 253 | VoltageDividerDesignRenderer.tsx | Voltage Divider Design | DONE |
| 254 | CurrentMirrorMatchingRenderer.tsx | Current Mirror Matching | DONE |
| 255 | OpAmpStabilityRenderer.tsx | Op-Amp Stability | DONE |
| 256 | ADCQuantizationNoiseRenderer.tsx | ADC Quantization Noise | DONE |
| 257 | DACSettlingTimeRenderer.tsx | DAC Settling Time | DONE |
| 258 | PLLLockDynamicsRenderer.tsx | PLL Lock Dynamics | DONE |
| 259 | ClockRecoveryRenderer.tsx | Clock Recovery | DONE |
| 260 | SignalIntegrityEyeDiagramRenderer.tsx | Signal Integrity Eye Diagram | DONE |
| 261 | ThermalNoiseRenderer.tsx | Thermal Noise | DONE |
| 262 | SwitchBounceRenderer.tsx | Switch Bounce & Debouncing | DONE |
| 263 | MotorBackEMFRenderer.tsx | Motor Back-EMF | DONE |
| 264 | HBridgeDriveRenderer.tsx | H-Bridge Motor Drive | DONE |
| 265 | BuckConverterRippleRenderer.tsx | Buck Converter Ripple | DONE |
| 266 | BoostConverterRenderer.tsx | Boost Converter | DONE |
| 267 | FlybackConverterRenderer.tsx | Flyback Converter | DONE |
| 268 | GateDriverRenderer.tsx | Gate Driver Design | DONE |
| 269 | StepperMotorRenderer.tsx | Stepper Motor Control | DONE |
| 270 | ServoControlRenderer.tsx | Servo Control Loop (PID) | DONE |
| 271 | WheatstoneBalanceRenderer.tsx | Wheatstone Bridge Balance | DONE |
| 272 | StrainGaugeSensorRenderer.tsx | Strain Gauge & Load Cell | DONE |
| 273 | ThermocoupleNonlinearityRenderer.tsx | Thermocouple Nonlinearity | DONE |
| 275 | ImpedanceMatchingRenderer.tsx | Impedance Matching | DONE |
| 276 | FilterDesignRenderer.tsx | Active Filter Design | DONE |
| 278 | EMCComplianceRenderer.tsx | EMC Compliance | DONE |
| 280 | SolderReflowRenderer.tsx | Solder Reflow Profile | DONE |

## Failed Builds (Need Rebuild)
| # | Game | Expected File | Status |
|---|------|--------------|--------|
| 274 | RTD Linearization | RTDLinearizationRenderer.tsx | NEEDS BUILD |
| 277 | System Power Budget | PowerBudgetRenderer.tsx | NEEDS BUILD |
| 279 | PCB Stackup Design | PCBStackupRenderer.tsx | NEEDS BUILD |

---

## DEFINITIVE GAME CONCEPTS WITH FULL DETAILS

Each game must follow the 10-phase structure:
`hook → predict → play → review → twist_predict → twist_play → twist_review → transfer → test → mastery`

---

### SECTION 1: Measurement & Data Acquisition (Games 251-260)

#### 251) ADC Quantization + Dithering
**Concept:** Why noise can improve accuracy
- **Hook + Predict:** "Can adding noise make measurements better?"
- **Do:** Simulate a slow sine into an 8-bit ADC; add tiny noise; average samples.
- **Notice:** Without noise, you get "stair steps." With small noise + averaging, the sine recovers more accurately.
- **Why:** Dither randomizes quantization error; averaging cancels it.
- **Twist:** Compare uniform vs Gaussian noise; show when it hurts.
- **AI Viz:** Signal + quantized output + error histogram.
- **Troubleshoot:** Ensure noise amplitude is ~0.5–1 LSB.

#### 252) Aliasing & Anti-Alias Filters
**Concept:** Sampling can invent fake frequencies
- **Hook + Predict:** "Can a 900 Hz tone look like 100 Hz?"
- **Do:** Sample a tone above Nyquist in a sim; then add a low-pass filter before sampling.
- **Notice:** Without filtering, the measured frequency is wrong; with filtering, it's correct.
- **Why:** Sampling folds higher frequencies into lower ones; anti-alias filters prevent that.
- **Twist:** Use real phone mic sampling rate and show a near-Nyquist case.
- **AI Viz:** FFT before/after sampling + foldover arrows.
- **Troubleshoot:** Keep sample rate explicit and visible.

#### 253) SNR & ENOB
**Concept:** Why "12-bit ADC" isn't really 12 bits
- **Hook + Predict:** "If your ADC is 12-bit, do you always get 12-bit detail?"
- **Do:** Add realistic noise and distortion in a sim; compute ENOB from SNR.
- **Notice:** Effective bits drop as noise/distortion rise.
- **Why:** ENOB captures real performance, not marketing bits.
- **Twist:** Compare oversampling + averaging vs no oversampling.
- **AI Viz:** ENOB gauge + noise floor plot.
- **Troubleshoot:** Use a consistent input amplitude and bandwidth.

#### 254) Bandwidth vs Rise Time
**Concept:** Fast edges require wide bandwidth
- **Hook + Predict:** "Can a slow scope hide ringing or overshoot?"
- **Do:** Simulate a step through different bandwidth limits; view edge shape.
- **Notice:** Lower bandwidth rounds edges and hides real dynamics.
- **Why:** Rise time is linked to system bandwidth; limited bandwidth filters harmonics.
- **Twist:** Compare "true signal" vs "measured signal" overlay.
- **AI Viz:** Step response + Bode magnitude overlay.
- **Troubleshoot:** Keep units consistent (ns, MHz).

#### 255) Transfer Functions & Bode Intuition
**Concept:** Why filters behave 'like slopes'
- **Hook + Predict:** "If you double frequency, will output halve or quarter?"
- **Do:** Build a 1st and 2nd order low-pass in sim; sweep frequency.
- **Notice:** 1st order falls ~20 dB/dec, 2nd order ~40 dB/dec after corner.
- **Why:** Poles determine slope; order matters.
- **Twist:** Add a zero and watch the curve "bend back."
- **AI Viz:** Interactive pole/zero editor + live Bode plot.
- **Troubleshoot:** Start with one pole, then add complexity.

#### 256) Phase & Group Delay
**Concept:** Why signals "smear"
- **Hook + Predict:** "Can a filter keep amplitude but distort shapes?"
- **Do:** Send a pulse through two filters with same magnitude but different phase.
- **Notice:** Pulse shape changes (ringing/smearing).
- **Why:** Nonlinear phase means different frequencies arrive at different times.
- **Twist:** Compare linear-phase FIR vs IIR conceptually.
- **AI Viz:** Group delay plot + before/after waveform.
- **Troubleshoot:** Use a short pulse with wide spectrum.

#### 257) Noise Types: Thermal vs 1/f vs Shot
**Concept:** The 'why' of noise floors
- **Hook + Predict:** "Why does your sensor get noisier at low frequency?"
- **Do:** Simulate spectra with thermal flat noise + 1/f rising at low f + shot noise in current.
- **Notice:** Low-frequency drift dominates slow measurements.
- **Why:** Different physical sources dominate different bands.
- **Twist:** Add chopper stabilization to "move" 1/f noise.
- **AI Viz:** Noise spectral density plot with source toggles.
- **Troubleshoot:** Keep scaling log-log for clarity.

#### 258) Lock-In Amplification
**Concept:** Detect signals below noise
- **Hook + Predict:** "Can you measure a signal you literally can't see?"
- **Do:** Hide a tiny sine in big noise; multiply by reference; low-pass.
- **Notice:** Signal pops out cleanly.
- **Why:** Correlation with known reference rejects uncorrelated noise.
- **Twist:** Add frequency drift and see lock-in fail unless tracked.
- **AI Viz:** Time-domain multiply + recovered amplitude meter.
- **Troubleshoot:** Ensure reference frequency matches exactly.

#### 259) Instrument Loading
**Concept:** Your meter changes the circuit
- **Hook + Predict:** "Can measuring voltage change the voltage?"
- **Do:** Simulate divider measured with 1 MΩ vs 10 MΩ vs 10 kΩ meter.
- **Notice:** Low meter impedance drags voltage down.
- **Why:** Meter forms parallel resistance; alters circuit.
- **Twist:** Add scope probe 10× mode and show improvement.
- **AI Viz:** Equivalent circuit overlay + error % readout.
- **Troubleshoot:** Always show meter impedance on screen.

#### 260) Ground Loops
**Concept:** Why hum appears 'from nowhere'
- **Hook + Predict:** "Can connecting two grounds create new noise?"
- **Do:** Simulate two devices grounded at different points with a small loop resistance; inject mains ripple.
- **Notice:** A small ground current creates a big audible hum in sensitive lines.
- **Why:** Shared impedance converts current into voltage noise.
- **Twist:** Add isolation transformer / differential input and see hum drop.
- **AI Viz:** Loop current arrows + induced noise meter.
- **Troubleshoot:** Keep loop resistance small but nonzero (milliohms).

---

### SECTION 2: Analog Building Blocks (Games 261-270)

#### 261) Op-Amp Non-Idealities
**Concept:** Finite gain, bandwidth, slew rate
- **Hook + Predict:** "If an op-amp is 'ideal,' why do real circuits distort?"
- **Do:** Simulate same amplifier with ideal op-amp vs real parameters; drive a fast sine.
- **Notice:** High freq rolls off; large signal clips or slews.
- **Why:** Real op-amps have limited open-loop gain and slew rate.
- **Twist:** Show how compensation changes stability.
- **AI Viz:** Bode plot + output distortion meter.
- **Troubleshoot:** Use step + sine tests to reveal limits.

#### 262) Negative Feedback Stability
**Concept:** Phase margin as "how close to oscillation"
- **Hook + Predict:** "Can 'more feedback' make a circuit worse?"
- **Do:** Change loop gain and pole locations in a sim; watch overshoot/ringing.
- **Notice:** Too little margin → oscillation.
- **Why:** Feedback depends on phase; if phase hits −180° at gain ≥1 → instability.
- **Twist:** Add a capacitor and "fix" the phase margin.
- **AI Viz:** Nyquist/Bode + phase margin gauge.
- **Troubleshoot:** Keep one change at a time.

#### 263) Input Offset & Drift
**Concept:** Why precision needs calibration
- **Hook + Predict:** "Can your amplifier output nonzero even with zero input?"
- **Do:** Simulate a microvolt offset amplified by 1000×; add temperature drift.
- **Notice:** Output "walks" with time/temperature.
- **Why:** Device mismatch + temperature coefficients.
- **Twist:** Add auto-zero/chopper mode and compare.
- **AI Viz:** Offset vs temperature curve + output drift plot.
- **Troubleshoot:** Use realistic microvolt scales.

#### 264) Common-Mode Rejection (CMRR)
**Concept:** Why differential signals are magic
- **Hook + Predict:** "If both wires pick up noise, can you cancel it?"
- **Do:** Apply same noise to both inputs and small signal differential; vary CMRR.
- **Notice:** With high CMRR, noise disappears; with low CMRR it leaks through.
- **Why:** Differential amplifiers reject common-mode signals imperfectly.
- **Twist:** Add resistor mismatch; CMRR degrades.
- **AI Viz:** Noise rejection meter + mismatch slider.
- **Troubleshoot:** Keep signal and noise amplitudes clearly separated.

#### 265) Instrumentation Amplifiers
**Concept:** Sensor front-ends done right
- **Hook + Predict:** "Why not just use one op-amp for a sensor bridge?"
- **Do:** Wheatstone bridge + tiny differential output; compare simple op-amp vs INA with input bias currents.
- **Notice:** INA reads cleanly; naive circuit saturates/drifts.
- **Why:** High input impedance + excellent CMRR.
- **Twist:** Add long cable capacitance; show stability issues.
- **AI Viz:** Sensor-to-output pipeline with error breakdown.
- **Troubleshoot:** Include realistic source impedance.

#### 266) Active Filters (Sallen-Key vs Multiple Feedback)
**Concept:** Same cutoff, different sound
- **Hook + Predict:** "Can two filters with same cutoff sound different?"
- **Do:** Compare topologies at same Fc/Q; send music/pulse.
- **Notice:** Different phase and transient response.
- **Why:** Topology changes pole/zero placement and sensitivity.
- **Twist:** Vary component tolerance → one topology is more robust.
- **AI Viz:** Sensitivity heatmap + Bode plot.
- **Troubleshoot:** Use the same cutoff to compare fairly.

#### 267) Rectifiers & Ripple
**Concept:** Why power supplies need capacitors
- **Hook + Predict:** "Does a diode turn AC into smooth DC?"
- **Do:** Simulate half-wave vs full-wave + reservoir capacitor; vary load.
- **Notice:** Ripple depends on load current and capacitance.
- **Why:** Capacitor charges on peaks and discharges between.
- **Twist:** Add diode drop and ESR; show heating.
- **AI Viz:** Ripple waveform + RMS ripple current meter.
- **Troubleshoot:** Use clear time scales (ms).

#### 268) LDO Dropout & PSRR
**Concept:** Why 'good regulators' cost money
- **Hook + Predict:** "If input is noisy, does the regulator remove it?"
- **Do:** Apply ripple/noise on Vin; simulate LDO output vs frequency; vary dropout.
- **Notice:** PSRR drops at high frequency; dropout causes failure.
- **Why:** Control loop bandwidth and pass device limits.
- **Twist:** Compare LDO vs buck in noise and efficiency trade.
- **AI Viz:** PSRR vs frequency plot + efficiency meter.
- **Troubleshoot:** Show when you need post-LDO after buck.

#### 269) Switch-Mode Ripple & EMI
**Concept:** Why layout matters more than schematics
- **Hook + Predict:** "If the schematic is right, can it still fail EMC?"
- **Do:** Buck converter "layout simulator": loop area slider; measure radiated/conducted EMI proxy.
- **Notice:** Small layout changes cause huge EMI swings.
- **Why:** di/dt loops radiate; parasitic inductance creates ringing.
- **Twist:** Add snubber and watch ringing shrink.
- **AI Viz:** Current loop animation + ringing waveform + EMI score.
- **Troubleshoot:** Teach "hot loop" concept.

#### 270) Snubbers & Damping
**Concept:** Killing ringing without wasting too much power
- **Hook + Predict:** "Can adding a resistor make things faster?"
- **Do:** RLC ringing sim; add RC snubber; compare overshoot and loss.
- **Notice:** Overshoot drops; some power dissipates.
- **Why:** Damping removes energy from oscillation modes.
- **Twist:** Optimize snubber values for minimum EMI at acceptable loss.
- **AI Viz:** Loss vs ringing tradeoff curve.
- **Troubleshoot:** Keep target criteria explicit.

---

### SECTION 3: Digital Hardware Reality (Games 271-280)

#### 271) Setup/Hold Timing
**Concept:** Why signals can be 'wrong' without being noisy
- **Hook + Predict:** "Can perfect voltages still create wrong bits?"
- **Do:** Timing sim: vary arrival time vs clock; watch capture success.
- **Notice:** There's a forbidden window; errors spike there.
- **Why:** Flip-flops need stable input before/after clock edge.
- **Twist:** Add clock skew and show it can break everything.
- **AI Viz:** Timing diagram with pass/fail shading.
- **Troubleshoot:** Keep units (ps/ns) visible.

#### 272) Clock Distribution & Skew
**Concept:** Why clocks are hard
- **Hook + Predict:** "If all parts get 'the same clock,' why worry?"
- **Do:** Simulate H-tree vs daisy chain clock routing; show skew at endpoints.
- **Notice:** Daisy chain creates big skew; H-tree reduces it.
- **Why:** Path length and buffer delays differ.
- **Twist:** Add temperature gradient across chip/board.
- **AI Viz:** Skew heatmap + timing margin meter.
- **Troubleshoot:** Tie to frequency scaling.

#### 273) Eye Diagrams
**Concept:** The universal high-speed health check
- **Hook + Predict:** "Can a signal be 'high' and 'low' and still fail?"
- **Do:** Build an eye diagram by overlaying many bits; add jitter/noise/ISI.
- **Notice:** Eye closes before catastrophic failure.
- **Why:** Timing uncertainty + intersymbol interference reduce sampling margin.
- **Twist:** Add equalization and reopen the eye.
- **AI Viz:** Live eye diagram + BER estimate.
- **Troubleshoot:** Keep data rate and channel loss explicit.

#### 274) Jitter Types (Random vs Deterministic) and BER
**Concept:** Is all jitter equally dangerous?
- **Hook + Predict:** "Is all jitter equally dangerous?"
- **Do:** Simulate random jitter and periodic jitter with same RMS; compare BER.
- **Notice:** Deterministic jitter can be worse at certain patterns.
- **Why:** Deterministic jitter stacks coherently; creates structured eye closure.
- **Twist:** Add spread-spectrum clocking and show pros/cons.
- **AI Viz:** Jitter decomposition + bathtub curve.
- **Troubleshoot:** Use a consistent threshold for BER.
- **Build Status:** NEEDS BUILD (agent failed previously)

#### 275) Equalization (CTLE/DFE)
**Concept:** Why receivers are 'smart' now
- **Hook + Predict:** "Can a receiver 'undo' the channel damage?"
- **Do:** Pass bits through a lossy channel; enable CTLE/DFE in sim.
- **Notice:** Eye reopens; errors drop.
- **Why:** EQ compensates frequency-dependent loss and ISI.
- **Twist:** Over-equalization adds noise amplification.
- **AI Viz:** Channel response + EQ curve + eye diagram.
- **Troubleshoot:** Show stability/decision error risks.

#### 276) Differential Pairs & Return Paths
**Concept:** Current flows in loops
- **Hook + Predict:** "If current goes out on one wire, where does it return?"
- **Do:** Field/loop sim: single-ended vs differential over ground plane; cut the return path and watch noise explode.
- **Notice:** Bad return path = big EMI and crosstalk.
- **Why:** Fields must close; return current follows least impedance path.
- **Twist:** Add a split ground plane "disaster" scenario.
- **AI Viz:** Return current density heatmap.
- **Troubleshoot:** Keep the 'loop area' always visible.

#### 277) Impedance Control
**Concept:** Why trace width matters
- **Hook + Predict:** "Can a 0.1 mm change matter?"
- **Do:** Microstrip calculator sim: vary width, dielectric, height; see impedance shift and reflections.
- **Notice:** Tiny geometry changes create reflection spikes.
- **Why:** Characteristic impedance depends on EM fields around the trace.
- **Twist:** Add soldermask and show impedance drift.
- **AI Viz:** Trace cross-section + Z0 meter + reflection coefficient.
- **Troubleshoot:** Use realistic PCB stackup presets.
- **Build Status:** NEEDS BUILD (agent failed previously)

#### 278) Termination Strategies
**Concept:** Series vs parallel vs Thevenin
- **Hook + Predict:** "Which termination reduces ringing without burning power?"
- **Do:** Reflection sim with different termination types; measure overshoot and DC loss.
- **Notice:** Parallel kills reflections best but dissipates; series is efficient for point-to-point.
- **Why:** Termination matches impedance to prevent reflections.
- **Twist:** Multi-drop bus shows why terminations get tricky.
- **AI Viz:** Wave bounce animation + power loss meter.
- **Troubleshoot:** Always show topology (point-to-point vs bus).

#### 279) ESD Protection
**Concept:** Why 'touch' can kill chips
- **Hook + Predict:** "Can a spark you barely feel destroy silicon?"
- **Do:** ESD pulse model: high voltage, tiny charge, fast rise time; show clamp diode behavior.
- **Notice:** Peak currents can be huge for nanoseconds.
- **Why:** ESD is extreme di/dt and overvoltage; protection clamps to safe levels.
- **Twist:** Compare TVS diode vs no TVS in a simulated USB port.
- **AI Viz:** ESD pulse + clamp current/voltage plot.
- **Troubleshoot:** Emphasize safety: do not intentionally shock devices.
- **Build Status:** NEEDS BUILD (agent failed previously)

#### 280) Latch-Up
**Concept:** The hidden SCR inside CMOS
- **Hook + Predict:** "Can a chip turn into a short circuit and stay that way?"
- **Do:** CMOS parasitic model sim; inject a transient; see latch-up trigger and hold current.
- **Notice:** Once triggered, current remains high until power is removed.
- **Why:** Parasitic pnp/npn form an SCR; triggers via overvoltage/ESD.
- **Twist:** Add guard rings and show latch-up immunity improve.
- **AI Viz:** Parasitic SCR schematic + safe operating region.
- **Troubleshoot:** Teach "never exceed I/O rails" rule.

---

### SECTION 4: Power, Motors & Real Energy Systems (Games 281-290)

#### 281) Motor Back-EMF
**Concept:** Why motors generate voltage
- **Hook + Predict:** "Why does a motor draw less current when spinning freely?"
- **Do:** DC motor model: apply voltage; compare stall vs spin; measure current.
- **Notice:** Stall current is huge; spinning reduces current.
- **Why:** Back-EMF rises with speed and opposes applied voltage.
- **Twist:** Add load torque; watch speed drop and current rise.
- **AI Viz:** Speed vs current vs back-EMF gauge.
- **Troubleshoot:** If doing real hardware, avoid stalls (overheat risk).

#### 282) Motor Control: PWM vs Analog
**Concept:** Efficiency & torque ripple
- **Hook + Predict:** "Is PWM 'wasting' power because it's switching?"
- **Do:** PWM motor drive sim; compare to linear control at same average speed.
- **Notice:** Linear wastes heat; PWM is efficient but introduces ripple.
- **Why:** Switching losses vs conduction losses; motor inductance smooths current.
- **Twist:** Add switching frequency knob; show audible whine vs efficiency.
- **AI Viz:** Current ripple waveform + loss breakdown.
- **Troubleshoot:** Keep duty cycle and load consistent.

#### 283) Flyback Diode
**Concept:** Why inductors fight turn-off
- **Hook + Predict:** "If you switch off a coil, where does the current go?"
- **Do:** Inductor + switch sim; compare with/without diode clamp.
- **Notice:** Without diode, voltage spikes huge; with diode, safe decay.
- **Why:** Inductors resist changes in current; energy must go somewhere.
- **Twist:** Compare diode clamp vs TVS vs active clamp (speed vs stress).
- **AI Viz:** Voltage spike plot + energy decay curve.
- **Troubleshoot:** Show "safe switch rating" check.

#### 284) 3-Phase Power Basics
**Concept:** Why it dominates industry
- **Hook + Predict:** "Why use 3 wires instead of 2 for motors?"
- **Do:** Simulate three sine waves 120° apart; compute instantaneous power into a balanced load.
- **Notice:** Total power is much smoother than single-phase.
- **Why:** Phases overlap so power delivery is nearly constant; motors self-start.
- **Twist:** Unbalance one phase and see vibration/heating risks.
- **AI Viz:** Phase phasors + instantaneous power plot.
- **Troubleshoot:** Keep magnitude and phase relationship clear.

#### 285) RMS vs Peak
**Concept:** Why heating depends on RMS
- **Hook + Predict:** "Which heats a resistor more: spiky current or smooth current with same peak?"
- **Do:** Compare two waveforms with same peak but different RMS; compute heating.
- **Notice:** RMS predicts heating; peaks can mislead.
- **Why:** Power ∝ I²R averaged over time.
- **Twist:** Show why rectified currents stress wiring.
- **AI Viz:** RMS calculator + heating meter.
- **Troubleshoot:** Use identical resistance and duration.

#### 286) Harmonics & THD
**Concept:** Why non-sinusoidal loads stress grids
- **Hook + Predict:** "Can a device draw 'dirty current' even if voltage is clean?"
- **Do:** Simulate a rectifier load; compute harmonic spectrum and THD.
- **Notice:** Current spikes create strong harmonics.
- **Why:** Nonlinear loads draw current in pulses; adds harmonics.
- **Twist:** Add PFC stage and show harmonics drop.
- **AI Viz:** FFT bar chart + THD gauge.
- **Troubleshoot:** Make the fundamental comparable across cases.

#### 287) EMI Basics: Conducted vs Radiated
**Concept:** Why filters + shielding differ
- **Hook + Predict:** "Does a ferrite bead stop 'antenna noise'?"
- **Do:** EMI path sim: show noise coupling through wires (conducted) vs air (radiated).
- **Notice:** Ferrites help conducted; shielding helps radiated; both may be needed.
- **Why:** Different coupling mechanisms require different mitigations.
- **Twist:** Add a ground reference mistake and watch EMI worsen.
- **AI Viz:** Coupling paths diagram + mitigation toggles.
- **Troubleshoot:** Keep "dominant path" highlighted.

#### 288) Ferrites as Frequency-Selective Resistors
**Concept:** Lossy inductors
- **Hook + Predict:** "Why does a ferrite bead 'do nothing' at DC but helps at MHz?"
- **Do:** Impedance vs frequency sim for ferrite; compare with a resistor and inductor.
- **Notice:** Ferrite looks like rising impedance and loss at high f.
- **Why:** Magnetic material losses increase with frequency.
- **Twist:** Show bead saturation with DC bias.
- **AI Viz:** Z(f) plot with real/imag parts.
- **Troubleshoot:** Emphasize bias derating.

#### 289) Shielding Effectiveness
**Concept:** Why gaps ruin shields
- **Hook + Predict:** "Is a metal box always a perfect shield?"
- **Do:** Simulate a shield with seams/holes; vary gap size vs wavelength.
- **Notice:** Small gaps can leak badly at high frequencies.
- **Why:** Apertures act like antennas; shielding depends on geometry relative to wavelength.
- **Twist:** Add conductive gasket to 'close' the gap.
- **AI Viz:** Field leakage map around a seam.
- **Troubleshoot:** Always show wavelength scale.

#### 290) EMC Pre-Compliance
**Concept:** Designing to pass tests early
- **Hook + Predict:** "Can you predict failing EMC before the lab?"
- **Do:** Build a checklist sim: clock edges, loop areas, filtering, shielding; output "risk score."
- **Notice:** A few high-impact fixes drastically reduce risk.
- **Why:** EMC failures are often dominated by specific hotspots and harmonics.
- **Twist:** Add cost/weight constraints like real products.
- **AI Viz:** Pareto chart of likely emitters.
- **Troubleshoot:** Teach "measure early, iterate fast."

---

### SECTION 5: Semiconductors & Device-Level EE (Games 291-295)

#### 291) MOSFET Safe Operating Area (SOA)
**Concept:** Why parts blow up
- **Hook + Predict:** "If a MOSFET is 'rated 60V 30A,' can it always do 60V and 30A?"
- **Do:** SOA sim: sweep Vds and Id; add pulse duration; show failure region.
- **Notice:** There are forbidden zones even within headline ratings.
- **Why:** Thermal limits, avalanche energy, and secondary breakdown constraints.
- **Twist:** Compare DC vs pulsed operation.
- **AI Viz:** SOA chart with your operating point highlighted.
- **Troubleshoot:** Emphasize time scale (ms vs continuous).

#### 292) MOSFET Gate Charge (Qg)
**Concept:** Why "fast switching" isn't free
- **Hook + Predict:** "If a MOSFET has low Rds(on), is it automatically better?"
- **Do:** Switching loss sim: vary Qg, gate driver strength, frequency.
- **Notice:** Low Rds(on) parts can have huge Qg, slowing switching and increasing loss.
- **Why:** Charging/discharging gate capacitances costs energy and time.
- **Twist:** Optimize for efficiency at different frequencies.
- **AI Viz:** Loss breakdown: conduction vs switching vs gate drive.
- **Troubleshoot:** Keep frequency and load current explicit.

#### 293) Avalanche & Inductive Kick
**Concept:** Why MOSFETs die in motor drives
- **Hook + Predict:** "Can a MOSFET absorb a voltage spike and survive?"
- **Do:** Inductive load turn-off sim; show avalanche clamp event and energy.
- **Notice:** Survive at small energy; fail at larger energy or repeated hits.
- **Why:** Avalanche dissipates energy as heat inside silicon; limits exist.
- **Twist:** Add snubber/TVS and compare stress.
- **AI Viz:** Avalanche energy counter + junction temp spike.
- **Troubleshoot:** Teach "EAS" rating and repetition risk.

#### 294) Op-Amp Input Bias Current
**Concept:** Why high impedance sensors drift
- **Hook + Predict:** "Can picoamps create volts?"
- **Do:** Simulate a 10 MΩ source with bias current; compute offset at output.
- **Notice:** Tiny bias currents cause big errors with large resistances.
- **Why:** V = I·R — huge R magnifies tiny I.
- **Twist:** Compare BJT vs CMOS input op-amps.
- **AI Viz:** Error budget with bias current slider.
- **Troubleshoot:** Always show source impedance.

#### 295) Comparator Hysteresis (Schmitt Trigger)
**Concept:** Noise immunity
- **Hook + Predict:** "Why does a noisy signal cause multiple false triggers?"
- **Do:** Feed noisy ramp into comparator; add hysteresis; compare toggling.
- **Notice:** Hysteresis cleans up chatter.
- **Why:** Two thresholds prevent rapid back-and-forth near the switching point.
- **Twist:** Too much hysteresis causes missed detection.
- **AI Viz:** Threshold bands + trigger timeline.
- **Troubleshoot:** Tune hysteresis to noise amplitude.

---

### SECTION 6: Control + Sensing (Games 296-300)

#### 296) PID Control Intuition
**Concept:** Why systems overshoot
- **Hook + Predict:** "Can a controller make a stable system oscillate?"
- **Do:** Temperature or motor speed plant sim; tune P/I/D; observe response.
- **Notice:** Too much P overshoots, too much I winds up, D damps but amplifies noise.
- **Why:** Feedback dynamics and poles/zeros.
- **Twist:** Add actuator saturation + anti-windup.
- **AI Viz:** Step response + tuning sliders + stability indicator.
- **Troubleshoot:** Start with P only, then add I, then D.

#### 297) Sensor Linearization & Calibration
**Concept:** Turn messy reality into reliable numbers
- **Hook + Predict:** "If your sensor is nonlinear, are readings useless?"
- **Do:** Simulate thermistor curve; apply lookup table vs polynomial fit.
- **Notice:** Calibration can dramatically improve accuracy over range.
- **Why:** Physical sensors are nonlinear; math maps them to linear outputs.
- **Twist:** Add manufacturing tolerance; show per-unit calibration wins.
- **AI Viz:** Raw vs calibrated curve + error bands.
- **Troubleshoot:** Use realistic noise and tolerance.

#### 298) Wheatstone Bridge Sensitivity
**Concept:** Strain gauges, pressure sensors
- **Hook + Predict:** "Why does a bridge make tiny resistance changes measurable?"
- **Do:** Bridge sim: change one resistor by 0.1%; compare output with/without instrumentation amp.
- **Notice:** Differential output scales cleanly with small changes.
- **Why:** Bridge converts small ΔR into a voltage difference while rejecting common supply variations.
- **Twist:** Quarter/half/full bridge configurations.
- **AI Viz:** Sensitivity vs configuration + CMRR effects.
- **Troubleshoot:** Keep excitation and reference consistent.

#### 299) EMC in Sensors
**Concept:** Shielding vs filtering vs differential — what to do first
- **Hook + Predict:** "If your sensor is noisy, should you filter, shield, or go differential?"
- **Do:** Noise coupling sim: electric field, magnetic field, ground noise; apply fixes.
- **Notice:** Each fix targets a different coupling path; the right first move depends on path.
- **Why:** Noise is physics: capacitive, inductive, or shared impedance.
- **Twist:** Add cost and size limits; choose best design.
- **AI Viz:** Coupling-path selector + recommended mitigation.
- **Troubleshoot:** Force learners to identify dominant coupling first.

#### 300) Safety Engineering: Creepage/Clearance
**Concept:** Why spacing is a spec
- **Hook + Predict:** "If two traces don't touch, can they still arc?"
- **Do:** High-level sim: vary voltage, pollution level, humidity; compute required spacing.
- **Notice:** Higher voltage and harsher environments demand bigger spacing.
- **Why:** Breakdown depends on electric field and surface contamination.
- **Twist:** Add conformal coating and see requirements drop.
- **AI Viz:** Field intensity map + pass/fail spacing gauge.
- **Troubleshoot:** Keep it educational—don't attempt real arcing demos.

---

### SECTION 7: Power Conversion & Real Power Hardware (Games 301-310)

#### 301) Buck Converter Duty-Cycle Intuition
**Concept:** Why Vout ≈ D·Vin in CCM
- **Hook + Predict:** "If I set duty cycle to 25%, do I get 25% of the voltage?"
- **Do:** Buck sim: vary duty cycle, load, switching frequency.
- **Notice:** Vout tracks D·Vin when current is continuous; breaks when discontinuous.
- **Why:** Inductor averages the switch waveform into DC.
- **Twist:** Light-load mode (DCM) changes the rule.
- **AI Viz:** Switch node waveform + inductor current + averaged Vout.
- **Troubleshoot:** Keep CCM/DCM indicator visible.

#### 302) Inductor Saturation
**Concept:** Why "same inductance" can suddenly vanish
- **Hook + Predict:** "Can an inductor 'give up' mid-circuit?"
- **Do:** Inductor model sim: increase current and watch inductance drop past saturation.
- **Notice:** Current ripple explodes; converter becomes unstable/hot.
- **Why:** Core permeability collapses at high flux density.
- **Twist:** Compare powdered iron vs ferrite cores.
- **AI Viz:** B–H curve + ripple and loss meter.
- **Troubleshoot:** Tie to real selection: Isat vs ripple current.

#### 303) Inductor Ripple Current & Audible Noise
**Concept:** Coil whine explained
- **Hook + Predict:** "Can electricity make metal sing?"
- **Do:** Buck sim: sweep frequency and ripple; map acoustic band and magnetostriction risk.
- **Notice:** Certain loads/frequencies produce whine.
- **Why:** Magnetic forces/vibration excite mechanical resonances.
- **Twist:** Spread-spectrum switching reduces tonal peaks.
- **AI Viz:** Ripple spectrum + 'audibility' overlay.
- **Troubleshoot:** Show that higher f can leave audible range but raise switching loss.

#### 304) Capacitor ESR/ESL
**Concept:** Why 'a capacitor' isn't just C
- **Hook + Predict:** "Why can a big capacitor fail at high frequency?"
- **Do:** Impedance-vs-frequency sim: add ESR/ESL; compare electrolytic vs ceramic.
- **Notice:** There's a resonant frequency; above it, capacitor looks inductive.
- **Why:** Lead/package inductance dominates at high frequency.
- **Twist:** Parallel different cap types to cover wide frequency bands.
- **AI Viz:** Z(f) plot + self-resonant frequency marker.
- **Troubleshoot:** Emphasize placement + package size.

#### 305) MLCC DC Bias Effect
**Concept:** Why capacitance collapses in real circuits
- **Hook + Predict:** "If it says 10 µF, do you actually get 10 µF?"
- **Do:** DC bias slider on an MLCC model; watch effective C shrink.
- **Notice:** High DC voltage can reduce capacitance dramatically.
- **Why:** Dielectric permittivity changes under electric field.
- **Twist:** Compare X7R vs C0G behaviors.
- **AI Viz:** Capacitance vs bias curve + ripple/loop stability impact.
- **Troubleshoot:** Teach "derating" selection practice.

#### 306) Inrush Current
**Concept:** Why devices 'spark' at plug-in
- **Hook + Predict:** "Why does a power supply draw a huge current right at startup?"
- **Do:** Simulate charging a bulk capacitor through source impedance.
- **Notice:** Peak current is massive for milliseconds.
- **Why:** Capacitor initially looks like a short; current limited only by resistance/inductance.
- **Twist:** Add NTC thermistor or soft-start; compare peak reduction.
- **AI Viz:** Inrush waveform + breaker/fuse stress meter.
- **Troubleshoot:** Include realistic wall impedance.

#### 307) Active Inrush / Soft-Start
**Concept:** How modern supplies avoid tripping breakers
- **Hook + Predict:** "Can a controller 'slowly' turn on a fast supply?"
- **Do:** Soft-start ramp sim: control duty-cycle/current limit on startup.
- **Notice:** Peak current drops; output rises smoothly.
- **Why:** Limiting di/dt and dv/dt prevents capacitor slam and overshoot.
- **Twist:** Too-slow soft-start can cause brownout under load.
- **AI Viz:** Startup state machine + waveforms.
- **Troubleshoot:** Make load steps part of the test.

#### 308) Current-Mode vs Voltage-Mode Control
**Concept:** Why many converters 'listen' to current
- **Hook + Predict:** "Why measure inductor current at all?"
- **Do:** Compare two control loops in sim under load transients.
- **Notice:** Current-mode responds faster and simplifies compensation.
- **Why:** It turns the inductor into a controlled current source (inner loop).
- **Twist:** Add subharmonic oscillation at high duty cycles; fix with slope compensation.
- **AI Viz:** Loop response + stability warning when needed.
- **Troubleshoot:** Keep 'slope comp' explanation visual.

#### 309) Slope Compensation
**Concept:** The weird fix that prevents chaos
- **Hook + Predict:** "Can a stable converter become unstable just by changing duty cycle?"
- **Do:** Current-mode sim: increase duty > 50%; watch subharmonic ripple.
- **Notice:** Alternating cycle behavior appears; output ripple grows.
- **Why:** Sampling effect causes period-doubling without compensation.
- **Twist:** Add ramp compensation and watch it vanish.
- **AI Viz:** Inductor current per cycle overlay.
- **Troubleshoot:** Provide a "find the minimum ramp" mini-game.

#### 310) Synchronous Rectification
**Concept:** Why replacing diodes saves big power
- **Hook + Predict:** "Why does a MOSFET sometimes replace a diode?"
- **Do:** Compare diode vs synchronous MOSFET in a buck at high current.
- **Notice:** Efficiency gain is huge at low voltages/high currents.
- **Why:** Diode drop wastes power; MOSFET can have milliohm losses.
- **Twist:** Show shoot-through risk if timing is wrong.
- **AI Viz:** Loss breakdown + deadtime slider.
- **Troubleshoot:** Teach deadtime and body diode conduction.

---

### SECTION 8: Batteries, Charging & Energy Storage (Games 311-315)

#### 311) CC/CV Charging
**Concept:** Why fast charging changes phases
- **Hook + Predict:** "Why does charging start fast then slow down near 100%?"
- **Do:** Simulate Li-ion charging: constant current → constant voltage taper.
- **Notice:** Current naturally falls during CV; time-to-full dominated by taper.
- **Why:** Cell voltage rises with SOC; CV prevents overvoltage damage.
- **Twist:** Compare "80% quick" vs "100% slow" time/cycle wear.
- **AI Viz:** SOC vs time + current curve + heat.
- **Troubleshoot:** Emphasize safe limits and temperature.

#### 312) Internal Resistance
**Concept:** Why batteries sag and heat under load
- **Hook + Predict:** "Why does your phone die faster in cold?"
- **Do:** Battery model sim: increase internal R at low temperature; apply load pulses.
- **Notice:** Voltage sag triggers shutdown earlier; heat rises with I²R.
- **Why:** Chemistry slows; resistance increases.
- **Twist:** Compare high-drain cells vs energy cells.
- **AI Viz:** Voltage sag + thermal rise gauge.
- **Troubleshoot:** Use realistic load profiles (camera flash, gaming, AI).

#### 313) Coulomb Counting Drift
**Concept:** Why battery % lies sometimes
- **Hook + Predict:** "If a device measures current, why can % still be wrong?"
- **Do:** Simulate coulomb counting with sensor offset error; watch SOC drift over hours.
- **Notice:** Tiny offset becomes big SOC error.
- **Why:** Integration accumulates error; needs calibration via voltage models.
- **Twist:** Add periodic "open-circuit voltage" correction when idle.
- **AI Viz:** SOC true vs estimated + error growth.
- **Troubleshoot:** Show sensor calibration as critical.

#### 314) Battery Balancing
**Concept:** Why multi-cell packs need active management
- **Hook + Predict:** "If cells are 'identical,' why do packs fail early?"
- **Do:** Simulate 4 cells with slight capacity mismatch; charge/discharge cycles.
- **Notice:** One cell hits limits first → pack limits early.
- **Why:** Mismatch accumulates; balancing equalizes SOC.
- **Twist:** Passive bleed vs active balancing comparison.
- **AI Viz:** Per-cell SOC bars + balancing currents.
- **Troubleshoot:** Emphasize safety; keep it sim-based.

#### 315) Thermal Runaway Concept
**Concept:** Why batteries have safety layers
- **Hook + Predict:** "Can heat create more heat until it runs away?"
- **Do:** Thermal model: heat generation vs temperature; add cooling and venting thresholds.
- **Notice:** Above a point, temperature rises faster and faster.
- **Why:** Exothermic reactions accelerate with temperature.
- **Twist:** Compare pouch vs cylindrical safety behaviors.
- **AI Viz:** Temperature vs time with runaway threshold marker.
- **Troubleshoot:** Pure simulation—no risky experiments.

---

### SECTION 9: Motors, Actuators & Power Stages (Games 316-320)

#### 316) BLDC Commutation vs Sinusoidal Control
**Concept:** Why FOC is smoother
- **Hook + Predict:** "Why do some motors feel 'notchy' and others buttery?"
- **Do:** Simulate trapezoidal commutation vs FOC sinusoidal currents.
- **Notice:** Torque ripple drops with FOC; efficiency improves.
- **Why:** Aligning current with rotor field produces smooth torque.
- **Twist:** Add poor angle sensing and show performance collapse.
- **AI Viz:** Torque ripple plot + phasor animation.
- **Troubleshoot:** Keep rotor angle estimation visible.

#### 317) Back-EMF Sensing (Sensorless BLDC)
**Concept:** Motor tells position without a sensor
- **Hook + Predict:** "Can a motor tell you its position without a sensor?"
- **Do:** Simulate floating phase back-EMF zero-cross detection.
- **Notice:** Works at speed; fails at low speed.
- **Why:** Back-EMF amplitude scales with speed.
- **Twist:** Add startup "kick" strategy to reach sensing range.
- **AI Viz:** Phase voltages + detected commutation points.
- **Troubleshoot:** Explain why it's unreliable at stall.

#### 318) Stepper Motor Resonance
**Concept:** Why steppers skip steps
- **Hook + Predict:** "Can a motor lose position without any electronics failing?"
- **Do:** Stepper dynamic sim: step frequency sweep; load inertia; watch oscillations.
- **Notice:** Certain speeds resonate; torque drops; missed steps occur.
- **Why:** Mechanical resonance + discrete stepping excitation.
- **Twist:** Microstepping reduces resonance but lowers holding torque.
- **AI Viz:** Phase portrait + missed-step detector.
- **Troubleshoot:** Add acceleration ramps to avoid resonance bands.

#### 319) Flywheel Effect & Inertia Matching
**Concept:** Why gearboxes exist
- **Hook + Predict:** "Why doesn't a tiny motor just spin a heavy load directly?"
- **Do:** Simulate motor + load inertia with and without gear reduction.
- **Notice:** Gearbox trades speed for torque and improves acceleration.
- **Why:** Torque and reflected inertia scale with gear ratio.
- **Twist:** Too much reduction limits top speed and efficiency.
- **AI Viz:** Speed/torque curves + reflected inertia gauge.
- **Troubleshoot:** Keep efficiency included (gears aren't free).

#### 320) H-Bridge Deadtime
**Concept:** The MOSFET timing that prevents fireworks
- **Hook + Predict:** "Why can switching both transistors 'on' for 10 ns kill a driver?"
- **Do:** Simulate half-bridge switching; vary deadtime; watch shoot-through current.
- **Notice:** Too little deadtime → huge current spikes; too much → body diode conduction and loss.
- **Why:** Device turn-off isn't instant; overlap creates a short.
- **Twist:** Add temperature and gate driver strength effects.
- **AI Viz:** Shoot-through spikes + efficiency penalty meter.
- **Troubleshoot:** Provide "find optimal deadtime" exercise.

---

### SECTION 10: Communications & Connectivity (Games 321-325)

#### 321) Link Budget
**Concept:** Why "bars" drop with walls
- **Hook + Predict:** "Does signal strength halve when distance doubles?"
- **Do:** Path loss sim: distance + wall materials + frequency band.
- **Notice:** Power drops fast; walls can dominate.
- **Why:** Free-space path loss ~ 1/r² plus absorption/reflection.
- **Twist:** Compare 2.4 GHz vs 5/6 GHz.
- **AI Viz:** Link budget calculator + "can you stream?" indicator.
- **Troubleshoot:** Use realistic attenuation presets.

#### 322) Multipath Fading
**Concept:** Why moving your phone 10 cm changes Wi-Fi
- **Hook + Predict:** "Can stepping sideways boost signal without changing router?"
- **Do:** Multipath sim: reflectors; walk path; watch RSSI oscillate.
- **Notice:** Deep fades and peaks appear.
- **Why:** Interference between multiple reflected paths.
- **Twist:** Add MIMO diversity and show fade reduction.
- **AI Viz:** Ray paths + resulting signal amplitude vs position.
- **Troubleshoot:** Keep phase and wavelength shown.

#### 323) QAM Constellation
**Concept:** What '256-QAM' actually means
- **Hook + Predict:** "If you pack more bits per symbol, do errors rise?"
- **Do:** Add noise to QAM constellations; decode and compute BER.
- **Notice:** Higher-order QAM needs higher SNR.
- **Why:** Points are closer; noise crosses decision boundaries.
- **Twist:** Adaptive modulation chooses constellation based on channel quality.
- **AI Viz:** Constellation scatter + BER gauge.
- **Troubleshoot:** Show SNR thresholds clearly.

#### 324) OFDM Basics
**Concept:** Why Wi-Fi uses many tiny carriers
- **Hook + Predict:** "Why not use one big carrier instead of hundreds?"
- **Do:** OFDM sim: frequency-selective channel; compare single-carrier vs OFDM.
- **Notice:** OFDM survives notches better with equalization.
- **Why:** Splitting into subcarriers makes channels easier to equalize.
- **Twist:** Add cyclic prefix too short → ISI returns.
- **AI Viz:** Subcarrier spectrum + channel response overlay.
- **Troubleshoot:** Keep time/frequency dual view.

#### 325) Error-Correcting Codes Intuition
**Concept:** Why reliability beats raw speed
- **Hook + Predict:** "Can adding extra bits make throughput higher?"
- **Do:** Compare uncoded vs coded link at same power; compute goodput (useful bits/s).
- **Notice:** FEC can increase goodput by reducing retransmissions.
- **Why:** Redundancy fixes errors cheaper than repeat transmissions.
- **Twist:** Too much coding wastes bandwidth when channel is clean.
- **AI Viz:** BER → packet loss → goodput pipeline.
- **Troubleshoot:** Use packet-level view for relatability.

---

### SECTION 11: Practical Audio & Human-Facing Electronics (Games 326-330)

#### 326) Clipping vs Compression
**Concept:** Why loudness wars happen
- **Hook + Predict:** "Is louder always better?"
- **Do:** Feed music into a limiter/compressor sim; compare waveforms and distortion.
- **Notice:** Clipping adds harsh harmonics; compression changes dynamics.
- **Why:** Nonlinearities create new frequency components.
- **Twist:** Show why headroom matters for ADC/DAC.
- **AI Viz:** Waveform + FFT + loudness meter.
- **Troubleshoot:** Normalize outputs to compare fairly.

#### 327) Class D Amplifiers
**Concept:** Why modern speakers use switching
- **Hook + Predict:** "Can switching audio sound good?"
- **Do:** PWM audio amp sim: filter output; compare efficiency to linear amp.
- **Notice:** High efficiency with proper filtering.
- **Why:** Power devices switch mostly fully on/off → low dissipation.
- **Twist:** Poor filter or layout increases EMI and distortion.
- **AI Viz:** Switching node + filtered output + loss gauge.
- **Troubleshoot:** Tie filter cutoff to speaker impedance.

#### 328) Microphone Arrays & Beamforming
**Concept:** Why laptops 'focus' on your voice
- **Hook + Predict:** "Can microphones 'aim' like a camera?"
- **Do:** Beamforming sim: 2–8 mics, time delays, direction of arrival.
- **Notice:** Sound from one direction amplifies while others cancel.
- **Why:** Phase-aligned addition boosts target; misaligned cancels noise.
- **Twist:** Add echoes; show why reverberation complicates beamforming.
- **AI Viz:** Polar response plot + live audio focus meter.
- **Troubleshoot:** Keep sampling and spacing constraints visible.

#### 329) Feedback Howl
**Concept:** Why microphones squeal near speakers
- **Hook + Predict:** "Why does the squeal happen at specific pitches?"
- **Do:** Feedback loop sim: mic→amp→speaker→room; sweep gain.
- **Notice:** When loop gain > 1 at a frequency, it oscillates.
- **Why:** Positive feedback at resonant frequencies creates self-oscillation.
- **Twist:** Add notch filter auto-suppression like real PA systems.
- **AI Viz:** Loop gain vs frequency + oscillation indicator.
- **Troubleshoot:** Show the "room resonance" component.

#### 330) DAC Reconstruction & Images
**Concept:** Why output filters matter
- **Hook + Predict:** "If DAC steps, how do you get smooth audio?"
- **Do:** Sample-and-hold DAC sim; apply reconstruction low-pass filter.
- **Notice:** Images/aliases appear without filtering; filtered output is smooth.
- **Why:** Sampling produces spectral images at multiples of Fs.
- **Twist:** Oversampling reduces filter demands.
- **AI Viz:** Spectrum before/after filtering.
- **Troubleshoot:** Keep Fs and filter cutoff explicit.

---

### SECTION 12: Sensors & Interfacing (Games 331-335)

#### 331) Voltage References
**Concept:** Why stable measurement needs a stable 'truth'
- **Hook + Predict:** "If your ADC is good, why do readings drift?"
- **Do:** Simulate ADC with drifting reference; compare to stable bandgap reference.
- **Notice:** Measurements shift even if sensor is unchanged.
- **Why:** ADC measures relative to reference; reference drift becomes measurement drift.
- **Twist:** Add ratiometric sensors to cancel reference drift.
- **AI Viz:** Reference drift vs output error plot.
- **Troubleshoot:** Always show which reference is used.

#### 332) Ratiometric Sensing
**Concept:** Smart way to cancel supply variation
- **Hook + Predict:** "Can you make a measurement immune to battery voltage?"
- **Do:** Simulate sensor output proportional to Vdd and ADC reference also = Vdd.
- **Notice:** Ratio cancels Vdd changes.
- **Why:** Both signal and reference scale together.
- **Twist:** Add noise on Vdd and see what cancels vs what doesn't.
- **AI Viz:** Ratio math overlay + error budget.
- **Troubleshoot:** Teach when ratiometric fails (different rails).

#### 333) Input Protection Networks
**Concept:** Surviving user mistakes
- **Hook + Predict:** "What happens when someone plugs the wrong adapter?"
- **Do:** Protection sim: series resistor + clamp diodes + TVS + fuse; inject overvoltage.
- **Notice:** Without protection, input exceeds absolute max instantly.
- **Why:** Protection diverts or limits energy to keep pins safe.
- **Twist:** Over-protection can distort signal or add noise.
- **AI Viz:** Pin voltage/current vs time under fault.
- **Troubleshoot:** Keep fault energy assumptions explicit.

#### 334) Debounce Physics
**Concept:** Buttons are analog chaos
- **Hook + Predict:** "Why does a button sometimes trigger twice?"
- **Do:** Bounce waveform sim; apply software debounce vs RC vs Schmitt trigger.
- **Notice:** Without debounce, multiple edges appear.
- **Why:** Mechanical contacts physically bounce.
- **Twist:** Show latency tradeoff: too much debounce feels sluggish.
- **AI Viz:** Raw vs debounced edge timeline.
- **Troubleshoot:** Use real bounce waveform samples.

#### 335) I²C Pull-Up Sizing
**Concept:** Why 'two resistors' matter
- **Hook + Predict:** "If I²C is digital, why can it fail because of RC?"
- **Do:** Bus sim: capacitance from wiring; choose pull-up value; measure rise time.
- **Notice:** Too-weak pull-up → slow edges; too-strong → excess current/noise.
- **Why:** Open-drain bus relies on RC charging.
- **Twist:** Add more devices (capacitance increases) and watch failure.
- **AI Viz:** Rise-time vs spec gauge + power dissipation.
- **Troubleshoot:** Show standard-mode vs fast-mode limits.

---

### SECTION 13: Reliability & "Why Products Die" (Games 336-340)

#### 336) Thermal Cycling Fatigue
**Concept:** Why solder cracks over years
- **Hook + Predict:** "Why does turning devices on/off wear them out?"
- **Do:** Model temperature cycles; compute strain on solder joints; accumulate damage.
- **Notice:** Larger ΔT and more cycles reduce life sharply.
- **Why:** Materials expand differently; cyclic stress causes fatigue.
- **Twist:** Add underfill or flexible interconnect and improve life.
- **AI Viz:** Life vs cycles curve + hotspot-to-failure map.
- **Troubleshoot:** Keep it a model; don't attempt destructive tests.

#### 337) Condensation & Corrosion
**Concept:** Why humidity kills electronics
- **Hook + Predict:** "Why do devices fail in bathrooms/garages?"
- **Do:** Dew point sim: ambient temp/humidity + device cooling; predict condensation risk.
- **Notice:** Crossing dew point creates water films → corrosion/leakage.
- **Why:** Electrochemistry + ionic contamination + moisture.
- **Twist:** Conformal coating reduces risk but can trap moisture if bad.
- **AI Viz:** Dew point gauge + corrosion risk meter.
- **Troubleshoot:** Teach venting and sealing tradeoffs.

#### 338) Creeping Leakage
**Concept:** Surface resistance under contamination
- **Hook + Predict:** "Can dirt cause a 'short' without touching traces?"
- **Do:** Simulate surface contamination film creating a resistive path; compute leakage current.
- **Notice:** Tiny currents can upset high-impedance nodes and sensors.
- **Why:** Water + ions form conductive paths.
- **Twist:** Add cleaning/flux residue and show why proper washing matters.
- **AI Viz:** Leakage path heatmap + sensor error meter.
- **Troubleshoot:** Emphasize cleanliness for high-impedance designs.

#### 339) Component Derating
**Concept:** Why running at 100% rating is risky
- **Hook + Predict:** "If a cap is rated 16V, is 15.9V okay forever?"
- **Do:** Reliability sim: stress ratio vs failure rate; compare conservative vs aggressive design.
- **Notice:** Lifetime improves disproportionately with derating.
- **Why:** Wear mechanisms accelerate with electrical and thermal stress.
- **Twist:** Add size/cost penalty and let users choose tradeoffs.
- **AI Viz:** Lifetime vs stress curve + BOM cost meter.
- **Troubleshoot:** Keep assumptions transparent.

#### 340) EMI Susceptibility
**Concept:** Why electronics fail near motors/relays
- **Hook + Predict:** "Why does your device glitch when a motor turns on?"
- **Do:** Susceptibility sim: inject transient on supply/IO; add filtering and shielding.
- **Notice:** Some glitches appear only on certain edges/frequencies.
- **Why:** Fast transients couple into sensitive nodes and clocks.
- **Twist:** Add brownout detector and show recovery vs crash.
- **AI Viz:** Fault injection timeline + reset events.
- **Troubleshoot:** Provide recommended fix order: supply → ground → IO.

---

### SECTION 14: System Engineering (Games 341-350)

#### 341) Power Sequencing
**Concept:** Why rails must come up in order
- **Hook + Predict:** "Can the wrong power-up order silently damage a chip?"
- **Do:** Multi-rail sim: core, IO, analog rails; vary sequencing and ramp rates.
- **Notice:** Wrong order causes latch-up risk, ESD diode conduction, or boot failure.
- **Why:** Internal structures assume certain rails exist first.
- **Twist:** Add supervisors and resets; show how they enforce safe start.
- **AI Viz:** Rail waveforms + "safe window" overlay.
- **Troubleshoot:** Tie to datasheet sequencing tables.

#### 342) Brownout & Watchdogs
**Concept:** Self-healing electronics
- **Hook + Predict:** "Why do devices randomly reboot when batteries get low?"
- **Do:** Simulate supply droop during load burst; compare with/without brownout reset.
- **Notice:** Without BOR, firmware corrupts state; with BOR, clean reset.
- **Why:** CPU timing and memory require minimum voltage.
- **Twist:** Watchdog catches software lockups that voltage doesn't.
- **AI Viz:** Voltage vs time + reset reason log.
- **Troubleshoot:** Include hysteresis to prevent reset loops.

#### 343) Power Budgeting
**Concept:** Why USB devices negotiate power
- **Hook + Predict:** "Can a device pull too much and get shut off?"
- **Do:** Simulate load vs port limit; include negotiation states.
- **Notice:** Exceeding budget causes droop or shutdown.
- **Why:** Ports enforce current limits; cables have resistance.
- **Twist:** Add long cable → voltage drop becomes the real limiter.
- **AI Viz:** Power budget dashboard + cable loss meter.
- **Troubleshoot:** Teach "measure at the load, not at the source."

#### 344) Cable IR Drop
**Concept:** Phone charging that's 'slow' isn't always the charger
- **Hook + Predict:** "Why does a cheap cable charge slower?"
- **Do:** Model cable resistance vs length/gauge; compute voltage at device and charging current.
- **Notice:** Small resistance causes big power loss at high current.
- **Why:** Vdrop = I·R; power loss = I²R.
- **Twist:** Show why higher-voltage fast charging reduces cable loss.
- **AI Viz:** Cable heat + delivered watts meter.
- **Troubleshoot:** Keep cable R realistic (tens to hundreds of mΩ).

#### 345) EMC in Enclosures
**Concept:** Plastic vs metal, seams, and grounding
- **Hook + Predict:** "Does putting electronics in a box automatically reduce EMI?"
- **Do:** Enclosure sim: material conductivity + seam gaps + cable penetrations.
- **Notice:** Cables often dominate leakage; seams matter at high f.
- **Why:** Enclosure effectiveness depends on current paths and apertures.
- **Twist:** Add ferrites + feedthrough capacitors at cable entry.
- **AI Viz:** Leakage map + 'dominant escape path' highlight.
- **Troubleshoot:** Always show wavelength vs gap size.

#### 346) Differential Measurement vs Single-Ended
**Concept:** Why scopes lie without care
- **Hook + Predict:** "Can a scope probe create ringing that isn't real?"
- **Do:** Simulate probing a fast node with long ground lead vs differential probe.
- **Notice:** Long ground lead adds inductance → fake ringing.
- **Why:** Probe forms an RLC with the circuit.
- **Twist:** Add spring ground and watch ringing reduce.
- **AI Viz:** Probe equivalent circuit overlay + measured vs true waveform.
- **Troubleshoot:** Teach correct probing technique.

#### 347) Kelvin Sensing (4-Wire Measurement)
**Concept:** Measuring milliohms accurately
- **Hook + Predict:** "Why can't you measure low resistance with two wires?"
- **Do:** Simulate 2-wire vs 4-wire measurement with lead resistance.
- **Notice:** 2-wire error dominates; 4-wire isolates the DUT.
- **Why:** Sense leads measure voltage directly at the device, excluding lead drops.
- **Twist:** Apply to battery internal resistance measurement.
- **AI Viz:** Error % vs resistance plot.
- **Troubleshoot:** Keep lead resistance realistic (tens of mΩ).

#### 348) Shunt vs Hall Current Sensing
**Concept:** Accuracy vs isolation trade
- **Hook + Predict:** "Why not always use a shunt resistor?"
- **Do:** Compare shunt (I·R loss + bandwidth) vs Hall (offset drift + isolation) in sim.
- **Notice:** Shunt is precise but dissipates power; Hall isolates but drifts.
- **Why:** Different physics: resistive drop vs magnetic field sensing.
- **Twist:** Add temperature drift and calibrations.
- **AI Viz:** Loss + error budget side-by-side.
- **Troubleshoot:** Show selection by current range and safety needs.

#### 349) Differential Pair Skew
**Concept:** Why one trace being longer breaks links
- **Hook + Predict:** "If two wires carry opposite signals, does length matching matter?"
- **Do:** Simulate differential skew; convert to eye closure and BER.
- **Notice:** Skew creates common-mode noise and reduces margin.
- **Why:** Timing mismatch breaks cancellation and sampling.
- **Twist:** Add connector asymmetry and show real-world issues.
- **AI Viz:** Eye diagram + skew slider + BER estimate.
- **Troubleshoot:** Keep unit conversions visible (ps/mm).

#### 350) Design Reviews with 'Physics Checklists'
**Concept:** Practical workflow concept
- **Hook + Predict:** "How do pro teams prevent the same EE mistakes repeatedly?"
- **Do:** Interactive checklist: power, ground, EMI, timing, thermal, safety; score a design.
- **Notice:** Most failures come from a few repeated categories.
- **Why:** EE is constrained by physics; systematic checks catch predictable failures.
- **Twist:** Add "cost/time" tradeoffs and choose what to fix first.
- **AI Viz:** Risk heatmap + prioritized fix list.
- **Troubleshoot:** Include "minimum viable checklist" and "high-reliability checklist."

---

### SECTION 15: Mechanical Engineering (Games 351-400)

#### 351) Stress–Strain & Yield
**Concept:** Why things bend then "stay bent"
- **Hook + Predict:** "If you bend a paperclip slightly, will it return perfectly?"
- **Do:** Simulate tensile test curve; then try gentle bending of paperclip vs spring steel clip.
- **Notice:** Elastic region returns; plastic region leaves permanent set.
- **Why:** Beyond yield, dislocations move permanently.
- **Twist:** Compare aluminum vs steel vs polymer curves.
- **AI Viz:** Live stress–strain curve + "you are here" marker.
- **Troubleshoot:** Don't fatigue-snap near face; eye protection if testing.

#### 352) Safety Factor
**Concept:** Why engineers "overbuild" on purpose
- **Hook + Predict:** "If a strap is rated 500 lb, is 499 lb safe?"
- **Do:** Load-limit sim: unknowns (defects, wear, shock loads).
- **Notice:** Small uncertainties blow up real risk.
- **Why:** Real materials vary; loads spike; damage accumulates.
- **Twist:** Add temperature/corrosion and watch margin vanish.
- **AI Viz:** Probability-of-failure meter vs safety factor.
- **Troubleshoot:** Keep assumptions visible; avoid false precision.

#### 353) Buckling
**Concept:** Why skinny columns fail suddenly
- **Hook + Predict:** "Which holds more: short thick ruler or long thin ruler?"
- **Do:** Press rulers/strips gently; simulate Euler buckling with length slider.
- **Notice:** Slender members fail catastrophically at low load.
- **Why:** Instability, not strength, dominates.
- **Twist:** Add end conditions (pinned vs fixed) and see huge differences.
- **AI Viz:** Buckling mode animation + critical load gauge.
- **Troubleshoot:** Don't over-force; controlled demo only.

#### 354) Bending Stress
**Concept:** Why I-beams exist
- **Hook + Predict:** "Same material, same weight — can shape be 10× stiffer?"
- **Do:** Compare cardboard beam shapes: flat strip vs folded I-shape.
- **Notice:** I-shape resists bending far better.
- **Why:** Second moment of area (geometry) dominates stiffness.
- **Twist:** Put material farther from neutral axis for maximum gain.
- **AI Viz:** Stress map across cross section + stiffness meter.
- **Troubleshoot:** Keep spans identical.

#### 355) Shear vs Bending
**Concept:** Why screws snap differently than beams
- **Hook + Predict:** "Do fasteners fail by pulling apart or sliding?"
- **Do:** Simulate lap joint: vary shear area, bolt diameter, friction.
- **Notice:** Some joints fail in shear, others in tension, others by slip.
- **Why:** Load paths decide dominant stress mode.
- **Twist:** Add washers and see stress distribution improve.
- **AI Viz:** Free-body diagram + failure mode indicator.
- **Troubleshoot:** Real tests: use soft materials only.

#### 356) Fatigue
**Concept:** Why repeated small loads break stuff
- **Hook + Predict:** "If it survives once, will it survive a million times?"
- **Do:** Paperclip bending cycles (gentle) + S-N curve sim.
- **Notice:** Failure happens below "static strength."
- **Why:** Crack initiation + growth per cycle.
- **Twist:** Add notch (scratch) and life plummets.
- **AI Viz:** Crack growth animation + cycles-to-failure estimator.
- **Troubleshoot:** Wear eye protection; stop before flying fragments.

#### 357) Stress Concentrations
**Concept:** The "notch kills" rule
- **Hook + Predict:** "Why does a tiny cut make plastic tear easily?"
- **Do:** Tear two plastic bags: one with a notch, one without; simulate Kt.
- **Notice:** Notched one tears instantly.
- **Why:** Local stress multiplies near sharp geometry.
- **Twist:** Round the notch → dramatic improvement.
- **AI Viz:** Stress heatmap around notch radius slider.
- **Troubleshoot:** Keep tear direction consistent.

#### 358) Creep
**Concept:** Why materials slowly deform over time
- **Hook + Predict:** "Can a constant load deform something without changing the load?"
- **Do:** Hang weight on plastic strip; time-lapse; simulate creep curve.
- **Notice:** Slow, permanent elongation.
- **Why:** Time-dependent molecular/atomic rearrangement.
- **Twist:** Raise temperature slightly → creep accelerates.
- **AI Viz:** Strain vs time curve with temperature slider.
- **Troubleshoot:** Use safe weights; avoid snaps.

#### 359) Thermal Expansion & Fit
**Concept:** Why lids get stuck / rails warp
- **Hook + Predict:** "Does heating always loosen a fit?"
- **Do:** Heat metal jar lid (warm water); simulate expansion for different materials.
- **Notice:** Lid loosens because metal expands more than glass.
- **Why:** Different coefficients of thermal expansion.
- **Twist:** Show bimetal strip bending as differential expansion.
- **AI Viz:** Expansion vectors + clearance meter.
- **Troubleshoot:** Use warm, not boiling.

#### 360) Tolerances & Stack-Up
**Concept:** Why things don't line up
- **Hook + Predict:** "If each part is 'within spec,' can the assembly still fail?"
- **Do:** Monte Carlo tolerance stack sim for a multi-part assembly.
- **Notice:** Worst-case stack can exceed allowable gap.
- **Why:** Errors accumulate statistically.
- **Twist:** Add GD&T datum strategy and watch yield improve.
- **AI Viz:** Yield % vs tolerance choices.
- **Troubleshoot:** Make assumptions explicit.

#### 361) Fits: Clearance / Transition / Interference
**Concept:** Why bearings need precision
- **Hook + Predict:** "Will a 'tight' fit always be stronger?"
- **Do:** Fit simulator: shaft/hole sizes distribution; compute assembly force and slip risk.
- **Notice:** Too tight risks cracking; too loose slips/wears.
- **Why:** Contact pressure + friction + material limits.
- **Twist:** Add thermal expansion and see press fits change with temperature.
- **AI Viz:** Fit histogram + press force gauge.
- **Troubleshoot:** Real press fits need proper tools.

#### 362) Friction Regimes (Boundary vs Hydrodynamic)
**Concept:** Beyond "static/kinetic"
- **Hook + Predict:** "Why does oil make things much smoother at speed?"
- **Do:** Stribeck curve sim: speed, viscosity, load → friction.
- **Notice:** Friction drops sharply as a fluid film forms.
- **Why:** Full-film lubrication separates surfaces.
- **Twist:** Cold oil (high viscosity) shifts optimal region.
- **AI Viz:** Stribeck curve + "wear risk" meter.
- **Troubleshoot:** Don't run motors without proper lubrication.

#### 363) Bearing Types
**Concept:** Ball vs roller vs plain — selecting for load and speed
- **Hook + Predict:** "Which bearing is best for high load AND high speed?"
- **Do:** Selection simulator: radial load, axial load, speed, contamination.
- **Notice:** No single best; tradeoffs dominate.
- **Why:** Contact geometry and lubrication set limits.
- **Twist:** Add misalignment and see spherical bearings win.
- **AI Viz:** Radar chart comparing options.
- **Troubleshoot:** Include maintenance constraints.

#### 364) Fasteners: Preload & Joint Separation
**Concept:** Tightening is a spring problem
- **Hook + Predict:** "Can overtightening make a joint weaker?"
- **Do:** Bolt-as-spring sim: preload, external load, separation point.
- **Notice:** Proper preload prevents slip; too much risks yield.
- **Why:** Clamp load and friction carry shear until separation.
- **Twist:** Add vibration and see why preload matters for loosening.
- **AI Viz:** Clamp force vs load graph + safety window.
- **Troubleshoot:** Use torque specs; never guess on critical joints.

#### 365) Thread Locking & Vibration Loosening
**Concept:** Why bolts back out
- **Hook + Predict:** "Why do bikes and cars need threadlocker?"
- **Do:** Vibration sim: transverse motion causes self-loosening.
- **Notice:** Small repeated slips unwind threads.
- **Why:** Micro-slip breaks frictional lock.
- **Twist:** Add lock washer vs nylon insert vs threadlocker comparison.
- **AI Viz:** Loosening rate vs vibration amplitude.
- **Troubleshoot:** Emphasize correct installation.

#### 366) Gear Ratio & Torque–Speed Trade
**Concept:** Why bikes have gears
- **Hook + Predict:** "Do gears create energy?"
- **Do:** Gear train sim: change ratio; measure torque and speed at output.
- **Notice:** Torque increases as speed decreases, power roughly conserved (minus losses).
- **Why:** Conservation of power + mechanical advantage.
- **Twist:** Add efficiency losses and see heat.
- **AI Viz:** Torque-speed curves + power flow.
- **Troubleshoot:** Keep units clear.

#### 367) Gear Tooth Contact Stress
**Concept:** Why small gears pit and fail
- **Hook + Predict:** "Why do gear teeth wear at the same spot?"
- **Do:** Hertz contact sim: tooth curvature, load, hardness.
- **Notice:** Contact pressure spikes at small radii.
- **Why:** Contact mechanics and surface fatigue.
- **Twist:** Add lubrication and surface hardening improvements.
- **AI Viz:** Pressure heatmap + pitting life estimator.
- **Troubleshoot:** Don't run dry gears.

#### 368) Belts vs Chains
**Concept:** Why bikes choose one or the other
- **Hook + Predict:** "Which is more efficient: belt or chain?"
- **Do:** Drive sim: tension, slip, alignment, contamination, noise.
- **Notice:** Chains tolerate torque but need lubrication; belts are clean but can slip.
- **Why:** Frictional vs positive engagement.
- **Twist:** Add misalignment and see belt life drop quickly.
- **AI Viz:** Efficiency + maintenance score dashboard.
- **Troubleshoot:** Use real-world constraints (dirt, weather).

#### 369) Springs in Series/Parallel
**Concept:** Designing suspensions & clamps
- **Hook + Predict:** "Two springs together: stiffer or softer?"
- **Do:** Spring network sim; test series vs parallel deflection under same load.
- **Notice:** Series softer, parallel stiffer.
- **Why:** Force/deflection relationships add differently.
- **Twist:** Add nonlinear spring (progressive rate) to model car suspensions.
- **AI Viz:** Force–deflection curve builder.
- **Troubleshoot:** Keep preload concept separate from stiffness.

#### 370) Vibration Isolation
**Concept:** Why rubber mounts work
- **Hook + Predict:** "Can a mount make vibration worse?"
- **Do:** Base-excited mass-spring-damper sim; sweep frequency.
- **Notice:** Near resonance, mounts amplify; above, they isolate.
- **Why:** Transmissibility depends on frequency ratio and damping.
- **Twist:** Add too much damping: better at resonance, worse at high frequency.
- **AI Viz:** Transmissibility curve + "safe zone" highlight.
- **Troubleshoot:** Teach "choose mount based on excitation frequency."

#### 371) Resonant Frequency Targeting
**Concept:** Designing to avoid vibration problems
- **Hook + Predict:** "Is it better to make something stiffer or heavier to reduce vibration?"
- **Do:** Change stiffness/mass and watch natural frequency shift.
- **Notice:** Stiffer raises fn; heavier lowers fn.
- **Why:** fn ~ √(k/m).
- **Twist:** Constrained design: can't change mass much → stiffness redesign.
- **AI Viz:** Mode frequency slider + design suggestions.
- **Troubleshoot:** Keep damping separate from fn.

#### 372) Modal Shapes
**Concept:** Why things shake in patterns, not uniformly
- **Hook + Predict:** "Does a shelf vibrate as one piece?"
- **Do:** Chladni-style sim: plate modes and node lines; optionally real demo with speaker + sand.
- **Notice:** Nodes stay still while antinodes move.
- **Why:** Standing wave modes satisfy boundary conditions.
- **Twist:** Add a clamp or mass and see mode shift.
- **AI Viz:** Mode shape viewer + "add mass here" tool.
- **Troubleshoot:** For real sand demo, keep volume safe.

#### 373) Damping Mechanisms
**Concept:** Material vs friction vs fluid
- **Hook + Predict:** "Why does foam stop vibration better than steel?"
- **Do:** Compare damping coefficients for materials; simulate ring-down.
- **Notice:** Viscoelastic materials dissipate energy faster.
- **Why:** Internal friction converts motion to heat.
- **Twist:** Temperature changes viscoelastic damping a lot.
- **AI Viz:** Ring-down overlay across materials.
- **Troubleshoot:** Keep amplitude small for linear behavior.

#### 374) Heat Conduction in Solids
**Concept:** Why pan handles are shaped
- **Hook + Predict:** "Does a thicker handle stay cooler?"
- **Do:** Heat conduction sim: cross-section area vs length vs material; compare metal vs wood.
- **Notice:** Longer, thinner, low-k handles reduce heat flow.
- **Why:** Fourier's law Q ~ kAΔT/L.
- **Twist:** Add fins that increase air cooling.
- **AI Viz:** Heat flux arrows + temperature gradient map.
- **Troubleshoot:** Real demos: use warm water only.

#### 375) Heat Exchangers
**Concept:** Car radiators, AC coils — effectiveness
- **Hook + Predict:** "Is more airflow always the best cooling fix?"
- **Do:** ε-NTU sim: flow rate, surface area, fin efficiency.
- **Notice:** Diminishing returns appear; fan power climbs.
- **Why:** Heat transfer limited by convection coefficients and ΔT.
- **Twist:** Fouling layer raises thermal resistance dramatically.
- **AI Viz:** Effectiveness gauge + pressure drop vs fan power.
- **Troubleshoot:** Teach trade: cooling vs power/noise.

#### 376) Fluid Viscosity & Reynolds Number
**Concept:** Why ketchup behaves weird
- **Hook + Predict:** "Do all fluids resist motion the same way?"
- **Do:** Flow regime sim: viscosity, velocity, pipe diameter → laminar/turbulent.
- **Notice:** Transition changes pressure drop behavior.
- **Why:** Inertial vs viscous forces (Re).
- **Twist:** Non-Newtonian option (shear thinning).
- **AI Viz:** Re meter + friction factor chart.
- **Troubleshoot:** Keep units consistent.

#### 377) Pressure Drop in Pipes
**Concept:** Why long hoses kill flow
- **Hook + Predict:** "Same pump—why does a longer hose give weaker spray?"
- **Do:** Darcy-Weisbach sim: length, diameter, roughness, flow.
- **Notice:** Small diameter change can dominate losses.
- **Why:** ΔP grows with L and v², strongly with smaller D.
- **Twist:** Add fittings and bends as "equivalent length."
- **AI Viz:** Pressure map along hose + flow rate.
- **Troubleshoot:** Show common real cases (garden hose, shower).

#### 378) Pumps: Head Curves & Operating Point
**Concept:** Why pumps don't deliver spec flow
- **Hook + Predict:** "If a pump is rated 10 L/min, do you always get 10?"
- **Do:** Pump + system curve sim; find intersection.
- **Notice:** Actual flow depends on system resistance.
- **Why:** Pump head falls with flow; system head rises with flow.
- **Twist:** Put two pumps in series vs parallel.
- **AI Viz:** Curves + live operating point.
- **Troubleshoot:** Teach cavitation risk at low inlet pressure.

#### 379) Cavitation
**Concept:** Why propellers and pumps get destroyed
- **Hook + Predict:** "Can water 'boil' at room temp inside a pump?"
- **Do:** Cavitation sim: pressure drops below vapor pressure; bubble collapse.
- **Notice:** Performance drops and damage risk spikes.
- **Why:** Vapor bubbles form then implode violently.
- **Twist:** Increase temperature → easier cavitation.
- **AI Viz:** Pressure field + bubble collapse animation.
- **Troubleshoot:** Keep it simulated (real cavitation demos can be unsafe).

#### 380) Drag and Aero Shaping
**Concept:** Why trucks add fairings
- **Hook + Predict:** "Is air resistance mostly about speed or shape?"
- **Do:** Drag model sim: Cd, area, speed; compare car shapes.
- **Notice:** Power demand rises ~with v³ for aero drag.
- **Why:** Drag force ~ v², power ~ v³.
- **Twist:** Add crosswind and yaw angle.
- **AI Viz:** Drag breakdown + energy per mile estimator.
- **Troubleshoot:** Emphasize that real Cd changes with yaw.

#### 381) Center of Pressure vs Center of Mass
**Concept:** Why umbrellas flip
- **Hook + Predict:** "Why does wind torque flip an umbrella?"
- **Do:** Force distribution sim on umbrella shape; compare CP location relative to handle.
- **Notice:** Torque grows when CP is far from pivot.
- **Why:** Aerodynamic forces create moments about support points.
- **Twist:** Add vents and see torque reduce.
- **AI Viz:** CP marker + torque vector.
- **Troubleshoot:** Real demo: do not use in dangerous wind.

#### 382) Four-Bar Linkages
**Concept:** How motion is "shaped"
- **Hook + Predict:** "Can you convert rotation into a custom path?"
- **Do:** Four-bar simulator: link lengths → coupler curve.
- **Notice:** Tiny length changes produce very different motion.
- **Why:** Constraint geometry defines motion path.
- **Twist:** Optimize for "windshield wiper path" or "walking leg."
- **AI Viz:** Path trace + optimizer slider.
- **Troubleshoot:** Keep one link fixed for clarity.

#### 383) Cam Design
**Concept:** Why engines and machines use cams
- **Hook + Predict:** "Can a rotating disk create any motion profile you want?"
- **Do:** Cam profile builder: lift vs angle; follow with a virtual follower.
- **Notice:** Smoothness depends on jerk limits.
- **Why:** Contact forces depend on acceleration and jerk.
- **Twist:** Too aggressive cam → follower jump (loss of contact).
- **AI Viz:** Lift/velocity/acceleration plots + contact force.
- **Troubleshoot:** Include lubrication and wear warnings.

#### 384) Friction Brakes & Heat
**Concept:** Why brakes fade
- **Hook + Predict:** "Where does a car's energy go when braking?"
- **Do:** Energy-to-heat sim: speed, mass → brake temperature rise.
- **Notice:** Repeated stops raise temp and reduce friction (fade).
- **Why:** Heat changes pad material and gas layers; friction coefficient drops.
- **Twist:** Add regenerative braking and see temp drop.
- **AI Viz:** Brake temp timeline + fade threshold.
- **Troubleshoot:** Use real safety notes: brakes are critical.

#### 385) Tire Grip as a "Friction Budget"
**Concept:** Why turning, braking, accelerating trade
- **Hook + Predict:** "Can you brake and turn hard at the same time?"
- **Do:** Friction circle sim: allocate traction to lateral vs longitudinal.
- **Notice:** Max combined grip is limited; exceeding causes slip.
- **Why:** Tire friction is finite; vector sum constraint.
- **Twist:** Wet road reduces radius drastically.
- **AI Viz:** Friction circle + vehicle path outcome.
- **Troubleshoot:** Keep it educational, not driving advice.

#### 386) Structural Adhesives vs Bolts
**Concept:** Why phones aren't screwed together
- **Hook + Predict:** "Are screws always stronger than glue?"
- **Do:** Joint sim: adhesive area vs bolt preload; peel vs shear loading.
- **Notice:** Adhesives excel in shear over large areas; poor in peel unless designed.
- **Why:** Stress distribution differs; bolts concentrate loads.
- **Twist:** Add surface preparation and see bond strength swing.
- **AI Viz:** Stress distribution map across joint.
- **Troubleshoot:** Real glue tests need cure time.

#### 387) Composite Layups
**Concept:** Why carbon fiber direction matters
- **Hook + Predict:** "Is carbon fiber strong in all directions?"
- **Do:** Laminate sim: fiber angle stacking; load in x/y; compare stiffness.
- **Notice:** Strength is directional; wrong layup fails early.
- **Why:** Fibers carry load primarily along their direction.
- **Twist:** Add impact damage and see knockdown.
- **AI Viz:** Polar stiffness plot vs fiber angle.
- **Troubleshoot:** Don't overgeneralize "carbon is strongest."

#### 388) Corrosion as an Engineering Design Constraint
**Concept:** Galvanic corrosion and material pairing
- **Hook + Predict:** "Why do dissimilar metals corrode faster together?"
- **Do:** Galvanic corrosion sim: choose metals + electrolyte presence.
- **Notice:** One metal sacrifices, the other is protected.
- **Why:** Electrochemical potential differences drive corrosion.
- **Twist:** Add coatings and isolation washers.
- **AI Viz:** Galvanic series + corrosion rate meter.
- **Troubleshoot:** Real corrosion experiments need safe handling.

#### 389) Wear Mechanisms
**Concept:** Abrasive, adhesive, fretting
- **Hook + Predict:** "Why do squeaky hinges get worse over time?"
- **Do:** Wear mode selector sim: load, motion type, lubrication.
- **Notice:** Different wear modes dominate different situations.
- **Why:** Micro-contact mechanics and debris generation.
- **Twist:** Add surface hardening and lubrication changes.
- **AI Viz:** Wear rate vs time + debris animation.
- **Troubleshoot:** Keep it practical: "how to reduce wear."

#### 390) 3D Printing vs Machining
**Concept:** Strength, anisotropy, and tolerance
- **Hook + Predict:** "Does printed plastic break the same in every direction?"
- **Do:** Print orientation sim: layer direction vs tensile strength.
- **Notice:** Z-direction often weakest; tolerances differ.
- **Why:** Layer adhesion and porosity create anisotropy.
- **Twist:** Anneal/heat-treat or change infill patterns.
- **AI Viz:** Strength heatmap vs print angle and settings.
- **Troubleshoot:** Avoid overstating; show real test data ranges.

#### 391) Injection Molding: Draft Angles and Shrink
**Concept:** Why parts stick
- **Hook + Predict:** "Why are many plastic parts slightly tapered?"
- **Do:** Mold release sim: draft angle slider; friction and ejection force.
- **Notice:** No draft → stuck parts and damage.
- **Why:** Shrink and surface contact create high ejection force.
- **Twist:** Add fiber-filled plastics and higher shrink stress.
- **AI Viz:** Ejection force vs draft plot.
- **Troubleshoot:** Use simple geometry first.

#### 392) Welding Distortion
**Concept:** Why heat warps frames
- **Hook + Predict:** "Can welding bend steel without touching it?"
- **Do:** Thermal contraction sim: heat zone shrinks on cooling → distortion.
- **Notice:** Warpage patterns appear based on weld sequence.
- **Why:** Thermal gradients create residual stress.
- **Twist:** Use stitch welding or alternating sequence to reduce warp.
- **AI Viz:** Residual stress map + predicted warp.
- **Troubleshoot:** Real welding is hazardous; keep as sim.

#### 393) Residual Stress
**Concept:** Hidden forces inside parts
- **Hook + Predict:** "Can a part crack later with no extra load?"
- **Do:** Residual stress sim from manufacturing; add a small external load.
- **Notice:** Combined stresses can exceed limits unexpectedly.
- **Why:** Manufacturing processes lock in stress gradients.
- **Twist:** Stress relief heat treatment reduces risk.
- **AI Viz:** Stress layers cross-section.
- **Troubleshoot:** Teach "stress adds."

#### 394) Seals & O-Rings
**Concept:** Why leaks happen
- **Hook + Predict:** "Is tighter always better for seals?"
- **Do:** O-ring groove sim: squeeze %, pressure, temperature.
- **Notice:** Too little squeeze leaks; too much causes extrusion/wear.
- **Why:** Contact pressure must exceed fluid pressure without damaging seal.
- **Twist:** Add dynamic motion → need lubrication and different materials.
- **AI Viz:** Contact pressure map + leak risk meter.
- **Troubleshoot:** Provide "common leak causes" checklist.

#### 395) Threaded Pipe Leaks
**Concept:** PTFE tape vs paste vs taper threads
- **Hook + Predict:** "Does tape seal the joint or just lubricate it?"
- **Do:** Thread sealing sim: taper engagement, surface roughness, lubricant effect.
- **Notice:** Lubrication changes torque-to-clamp; sealing comes from interference + sealant fill.
- **Why:** Helical leak paths need filling; torque affects seating.
- **Twist:** Over-tightening cracks fittings.
- **AI Viz:** Torque → stress → leak probability.
- **Troubleshoot:** Real plumbing: follow codes.

#### 396) Mechanical Advantage in Everyday Tools
**Concept:** Pliers, crowbars, scissors
- **Hook + Predict:** "Why is cutting near the hinge easier?"
- **Do:** Lever arm sim; show force amplification vs jaw travel.
- **Notice:** More force but less travel near hinge.
- **Why:** Moment balance; energy conservation.
- **Twist:** Add tool flex and lost motion.
- **AI Viz:** Force amplification + deflection visualization.
- **Troubleshoot:** Use safe materials for demos.

#### 397) Chain of Stiffness
**Concept:** Why "one soft part" ruins rigidity
- **Hook + Predict:** "If 9 parts are stiff and 1 is soft, is the system stiff?"
- **Do:** Series stiffness sim across multiple components.
- **Notice:** Softest dominates deflection.
- **Why:** Series compliance adds; biggest compliance wins.
- **Twist:** Locate the softest element via "deflection heatmap."
- **AI Viz:** Deflection by component.
- **Troubleshoot:** Great for product design intuition.

#### 398) Mechanical Power & Efficiency
**Concept:** Where losses really go
- **Hook + Predict:** "Why does your bike feel harder in winter?"
- **Do:** Loss sim: bearing friction, chain lubrication, air drag, tire rolling resistance.
- **Notice:** Small losses add; cold increases viscosity losses.
- **Why:** Tribology + fluid viscosity changes.
- **Twist:** Tune tire pressure: rolling loss changes.
- **AI Viz:** Sankey diagram of power losses.
- **Troubleshoot:** Keep speed and conditions explicit.

#### 399) Design for Maintainability
**Concept:** Why access and fasteners matter
- **Hook + Predict:** "Can a product be 'perfect' but unrepairable?"
- **Do:** Service-time sim: fastener type, access clearances, modularity.
- **Notice:** Service time dominates lifecycle cost.
- **Why:** Human factors + disassembly complexity.
- **Twist:** Add captive fasteners and snap-fits tradeoffs.
- **AI Viz:** Repair time & cost meter.
- **Troubleshoot:** Keep it grounded: common devices.

#### 400) Failure Analysis as a Skill
**Concept:** Fracture surface tells the story
- **Hook + Predict:** "Can you tell overload vs fatigue from the break?"
- **Do:** Fracture pattern classifier sim: beach marks vs ductile dimples vs brittle cleavage.
- **Notice:** Different failures leave distinct signatures.
- **Why:** Crack growth mechanisms differ.
- **Twist:** Add environment: corrosion fatigue signatures.
- **AI Viz:** Interactive "fracture microscope" with labeled cues.
- **Troubleshoot:** Avoid real sharp fragments; use images/sim.

---

### SECTION 16: Battery Technology (Games 401-450)

#### 401) Diffusion Limits Inside Electrodes
**Concept:** Why charging can't be instant
- **Hook + Predict:** "If the charger is powerful, why can't the battery just accept it?"
- **Do:** Diffusion sim: lithium concentration gradient vs time in graphite particles.
- **Notice:** Surface saturates while core lags.
- **Why:** Solid-state diffusion is slow; gradients cause stress and plating risk.
- **Twist:** Smaller particles improve rate but can increase side reactions.
- **AI Viz:** Concentration heatmap inside particles.
- **Troubleshoot:** Keep C-rate tied to diffusion time constant.

#### 402) SEI Layer
**Concept:** The 'good' film that also steals capacity
- **Hook + Predict:** "Can a battery 'use up' lithium just by sitting?"
- **Do:** SEI growth sim vs time, temperature, voltage window.
- **Notice:** Capacity fades and resistance rises.
- **Why:** SEI consumes lithium and thickens over cycles.
- **Twist:** Add electrolyte additive that stabilizes SEI.
- **AI Viz:** SEI thickness → impedance → heat.
- **Troubleshoot:** Distinguish calendar vs cycle aging.

#### 403) Lithium Plating
**Concept:** Fast charging's main villain
- **Hook + Predict:** "Can charging create metallic lithium like a 'bad coating'?"
- **Do:** Plating risk sim vs temperature, current, SOC, anode potential.
- **Notice:** Cold + high current + high SOC = danger zone.
- **Why:** Overpotential drives lithium deposition instead of intercalation.
- **Twist:** Preheat pack and watch plating risk collapse.
- **AI Viz:** Risk map (Temp × C-rate × SOC).
- **Troubleshoot:** Emphasize "fast charge tapers for a reason."

#### 404) Fast-Charge Protocol Shaping
**Concept:** Beyond CC/CV
- **Hook + Predict:** "Can changing the current profile reduce damage without slowing much?"
- **Do:** Compare CC/CV vs multi-step vs pulse-charge in a degradation sim.
- **Notice:** Some profiles cut plating while keeping speed.
- **Why:** Managing overpotential and diffusion gradients.
- **Twist:** Adaptive charging based on impedance feedback.
- **AI Viz:** Charge profile editor + aging estimator.
- **Troubleshoot:** Show constraints: temperature and max voltage.

#### 405) Temperature Preconditioning
**Concept:** Why EVs warm the pack before fast charging
- **Hook + Predict:** "Why does a battery charge faster after driving?"
- **Do:** Thermal + electrochem sim: warm pack → lower resistance → safer high current.
- **Notice:** Faster acceptance with less heat per amp.
- **Why:** Ion mobility and kinetics improve with temperature.
- **Twist:** Too hot accelerates SEI and gas → there's an optimum.
- **AI Viz:** Optimal temperature band indicator.
- **Troubleshoot:** Keep safety limits visible.

#### 406) Cathode Chemistry Tradeoffs
**Concept:** LFP vs NMC/NCA
- **Hook + Predict:** "Why do some batteries charge fast but store less energy?"
- **Do:** Compare chemistry presets: voltage profile, energy density, safety, cost.
- **Notice:** LFP is safer/cheaper; NMC/NCA higher energy.
- **Why:** Crystal structure and redox potentials differ.
- **Twist:** Show cold performance and fast-charge capability differences.
- **AI Viz:** Radar chart of properties + cost/kg.
- **Troubleshoot:** Keep "depends on application" clear.

#### 407) Silicon Anodes
**Concept:** Higher energy, harder life
- **Hook + Predict:** "Why isn't every phone using silicon anodes already?"
- **Do:** Expansion sim: silicon swells huge during lithiation; stress cracks SEI.
- **Notice:** Capacity high but fade can be rapid.
- **Why:** Volume expansion breaks particles and SEI repeatedly.
- **Twist:** Silicon-graphite blends optimize tradeoff.
- **AI Viz:** Particle swelling animation + cycle fade curve.
- **Troubleshoot:** Include binder strength and porosity knobs.

#### 408) Porosity & Tortuosity
**Concept:** How microstructure sets power
- **Hook + Predict:** "Can two identical 'materials' behave differently just from structure?"
- **Do:** Electrode microstructure sim: porosity and tortuosity affect ion transport.
- **Notice:** High tortuosity throttles fast charge.
- **Why:** Ions take longer paths; concentration gradients grow.
- **Twist:** Calendering increases density but can worsen transport.
- **AI Viz:** Micro-maze ion flow visualization.
- **Troubleshoot:** Show energy density vs power tradeoff.

#### 409) Current Collector Thickness
**Concept:** Copper/aluminum foils
- **Hook + Predict:** "Why not use thicker metal foils to reduce resistance?"
- **Do:** Collector trade sim: thickness → resistance ↓ but mass ↑ and cost ↑.
- **Notice:** There's an optimum per application.
- **Why:** Conduction losses vs gravimetric energy density.
- **Twist:** High-power cells use thicker collectors.
- **AI Viz:** Energy density and efficiency meter side-by-side.
- **Troubleshoot:** Keep pack-level impact visible.

#### 410) Tab Design & "Hot Tabs"
**Concept:** Hidden source of heating
- **Hook + Predict:** "Why do some cells heat at the ends?"
- **Do:** Current distribution sim in jelly-roll; vary tab placement (single vs multiple).
- **Notice:** Poor tab design concentrates current and heat.
- **Why:** Resistive path lengths differ across electrode.
- **Twist:** Multi-tab reduces gradient and improves fast-charge.
- **AI Viz:** Current density map + hotspot detector.
- **Troubleshoot:** Link to real fast-charge performance.

#### 411) Contact Resistance
**Concept:** Why good welds and busbars matter
- **Hook + Predict:** "Can a tiny bad connection waste lots of energy?"
- **Do:** Pack sim: add milliohms at one joint; compute I²R heat.
- **Notice:** A single joint can become a heater and reliability risk.
- **Why:** Heat scales with I²; high currents amplify small R.
- **Twist:** Compare ultrasonic weld vs laser weld vs bolted joint.
- **AI Viz:** Joint temperature timeline.
- **Troubleshoot:** Emphasize torque specs and cleanliness.

#### 412) Thermal Management: Cell-to-Cell Uniformity
**Concept:** Temperature uniformity is critical
- **Hook + Predict:** "If average temperature is fine, can one hot cell ruin the pack?"
- **Do:** Thermal network sim: uneven cooling → one cell runs hotter → ages faster.
- **Notice:** Hot cell becomes weakest link.
- **Why:** Aging accelerates with temperature; imbalance grows.
- **Twist:** Add cooling plate vs air vs immersion cooling.
- **AI Viz:** Pack temperature heatmap + predicted capacity spread.
- **Troubleshoot:** Show constraints: weight and cost.

#### 413) Thermal Propagation Barriers
**Concept:** Why spacing and materials save packs
- **Hook + Predict:** "Can one failing cell trigger neighbors?"
- **Do:** Propagation sim: heat release, insulation, vent direction, spacing.
- **Notice:** Barrier materials and vent routing matter massively.
- **Why:** Heat and gas transfer to adjacent cells initiates runaway.
- **Twist:** Add phase-change material barrier.
- **AI Viz:** Propagation animation + stop/go result.
- **Troubleshoot:** Keep it simulation-only for safety.

#### 414) Electrolyte Conductivity vs Temperature
**Concept:** Why cold weather reduces power
- **Hook + Predict:** "Why does cold weather reduce power and charging speed?"
- **Do:** Conductivity sim: temperature → ionic conductivity → resistance.
- **Notice:** Resistance rises in cold; heating helps.
- **Why:** Ion mobility drops with temperature.
- **Twist:** Compare electrolyte formulations (conceptually).
- **AI Viz:** Conductivity curve + power limit.
- **Troubleshoot:** Tie to preconditioning logic.

#### 415) Separator Function
**Concept:** Not just a 'plastic sheet'
- **Hook + Predict:** "If the separator is so thin, why is it so critical?"
- **Do:** Separator sim: pore size, shutdown temperature, puncture resistance.
- **Notice:** Safety and power depend on separator properties.
- **Why:** Separator prevents shorts while allowing ion flow.
- **Twist:** Add dendrite risk scenario.
- **AI Viz:** Ion flow through pores + short-circuit risk meter.
- **Troubleshoot:** Keep the role of shutdown separators clear.

#### 416) Formation Cycling
**Concept:** Why new batteries are 'trained' at the factory
- **Hook + Predict:** "Why does making a battery take days even after assembly?"
- **Do:** Formation sim: initial SEI creation and grading; show yield impact.
- **Notice:** Formation sets long-term stability and impedance.
- **Why:** Controlled SEI formation prevents unstable reactions later.
- **Twist:** Faster formation hurts lifetime; cost tradeoff.
- **AI Viz:** Factory timeline with throughput and quality knobs.
- **Troubleshoot:** Highlight bottleneck economics.

#### 417) Slurry Mixing Quality
**Concept:** How manufacturing affects performance
- **Hook + Predict:** "Can a mixing problem show up as fast-charge failure?"
- **Do:** Mixing uniformity sim: agglomerates → local resistance/porosity changes.
- **Notice:** Nonuniform electrodes cause hotspots and uneven aging.
- **Why:** Conductive network and active material distribution matter.
- **Twist:** Add inline QC and show yield improvement.
- **AI Viz:** Electrode property map + defect detector.
- **Troubleshoot:** Keep it practical and visual.

#### 418) Coating & Drying
**Concept:** Why solvent control matters
- **Hook + Predict:** "Can drying speed change battery power?"
- **Do:** Drying sim: solvent evaporation rate → binder migration → porosity gradients.
- **Notice:** Fast drying can cause surface crusting and poor transport.
- **Why:** Microstructure forms during drying.
- **Twist:** NMP recovery and drying energy cost tradeoff.
- **AI Viz:** Porosity vs depth profile.
- **Troubleshoot:** Use "good/bad" presets.

#### 419) Calendering Pressure
**Concept:** Density vs ion access trade
- **Hook + Predict:** "If you compress electrodes, do you always improve performance?"
- **Do:** Calender sim: density ↑, resistance ↓, but tortuosity ↑.
- **Notice:** There's an optimum for fast charge.
- **Why:** Transport vs conductivity trade.
- **Twist:** Different chemistry prefers different density.
- **AI Viz:** Power vs energy Pareto curve.
- **Troubleshoot:** Keep constraints visible.

#### 420) Cell Formats: Pouch vs Cylindrical vs Prismatic
**Concept:** Why some batteries are tubes and others bricks
- **Hook + Predict:** "Why do some batteries look like tubes and others like bricks?"
- **Do:** Format sim: thermal path, swelling, manufacturability, safety venting.
- **Notice:** Cylindrical is robust and repeatable; pouch packs energy efficiently but swells.
- **Why:** Geometry affects cooling and mechanical stability.
- **Twist:** Pack-level module packing efficiency changes the winner.
- **AI Viz:** Volumetric/gravimetric comparison dashboard.
- **Troubleshoot:** Avoid "one best" conclusions.

#### 421) Aging by SOC Window
**Concept:** Why 20–80% helps
- **Hook + Predict:** "Why does charging to 100% every day reduce lifespan?"
- **Do:** Aging sim: calendar fade vs SOC and temperature.
- **Notice:** High SOC accelerates side reactions.
- **Why:** Higher electrode potentials drive parasitic reactions.
- **Twist:** Compare LFP vs NMC sensitivity.
- **AI Viz:** Lifetime heatmap (SOC × temp).
- **Troubleshoot:** Keep it non-prescriptive; depends on needs.

#### 422) Depth of Discharge (DoD) vs Cycle Life
**Concept:** Is one deep cycle equal to many shallow?
- **Hook + Predict:** "Is one deep cycle equal to many shallow cycles?"
- **Do:** Cycle life sim: DoD vs cycles to 80% capacity.
- **Notice:** Shallow cycling often yields many more cycles.
- **Why:** Mechanical/chemical strain scales with swing size.
- **Twist:** Add "throughput energy" metric to compare fairly.
- **AI Viz:** Lifetime energy delivered comparison.
- **Troubleshoot:** Don't oversimplify; chemistry matters.

#### 423) Impedance Rise
**Concept:** Why old batteries feel 'weak' even with capacity left
- **Hook + Predict:** "Why can a battery show 50% but die under load?"
- **Do:** Impedance growth sim: same SOC but higher R → voltage sag under load.
- **Notice:** Power capability collapses before capacity fully fades.
- **Why:** Resistance increases from SEI, contact loss, cathode degradation.
- **Twist:** Show "power fade" vs "energy fade" separately.
- **AI Viz:** Power capability gauge vs age.
- **Troubleshoot:** Use realistic pulse loads.

#### 424) Gas Generation & Swelling
**Concept:** Why pouches bloat
- **Hook + Predict:** "Can batteries make gas without leaking?"
- **Do:** Side-reaction sim: gas generation rate vs high voltage/temperature.
- **Notice:** Swelling grows with abuse conditions.
- **Why:** Electrolyte decomposition produces gases.
- **Twist:** Venting mechanisms and pressure relief design.
- **AI Viz:** Internal pressure timeline.
- **Troubleshoot:** Real swollen batteries are hazardous—do not handle.

#### 425) Fast-Charge Station Limits
**Concept:** Cables, cooling, connectors
- **Hook + Predict:** "Why can't chargers just keep increasing current?"
- **Do:** Charger system sim: cable resistance, connector heating, cooling capacity.
- **Notice:** Connector temperature becomes the bottleneck.
- **Why:** I²R heating and contact resistance dominate at high current.
- **Twist:** Higher voltage reduces current for same power.
- **AI Viz:** Thermal hotspots along cable/connector.
- **Troubleshoot:** Keep safety constraints explicit.

#### 426) Preheating vs Energy Cost
**Concept:** Charging faster costs energy
- **Hook + Predict:** "Does warming the battery cost more energy than it saves?"
- **Do:** Compare energy spent heating vs time saved vs reduced degradation.
- **Notice:** There's an economic optimum.
- **Why:** Heating consumes energy but reduces resistive losses and plating.
- **Twist:** Include ambient temperature scenarios.
- **AI Viz:** Total cost per charge vs strategy.
- **Troubleshoot:** Include user priorities (time vs longevity).

#### 427) BMS: SOC Estimation with Kalman Filtering
**Concept:** Why simple % is hard
- **Hook + Predict:** "Why can't voltage alone tell you SOC?"
- **Do:** Sim: OCV curve flat regions + hysteresis; run EKF SOC estimator.
- **Notice:** EKF stays stable where voltage-only fails.
- **Why:** Combines model + noisy measurements.
- **Twist:** Add sensor bias and show estimator drift.
- **AI Viz:** SOC true vs estimated + uncertainty band.
- **Troubleshoot:** Keep model assumptions clear.

#### 428) State of Health (SOH)
**Concept:** Separating capacity fade vs resistance growth
- **Hook + Predict:** "Is a battery 'healthy' if it still holds charge?"
- **Do:** SOH dashboard sim: capacity, resistance, power capability.
- **Notice:** Different degradation modes affect different "health" metrics.
- **Why:** Multiple physical failure modes exist simultaneously.
- **Twist:** Diagnose which mode dominates from test data.
- **AI Viz:** SOH fingerprint classifier.
- **Troubleshoot:** Include measurement uncertainty.

#### 429) Charging at High SOC
**Concept:** Why the last 10% is slow and stressful
- **Hook + Predict:** "Why is 90→100% slower than 20→30%?"
- **Do:** Overpotential sim as SOC rises; plating risk spikes; current must taper.
- **Notice:** Taper isn't just policy; it's physics.
- **Why:** Diffusion gradients + anode potential limits.
- **Twist:** Show "stop at 80%" strategy effect on lifetime.
- **AI Viz:** Overpotential and plating margin meter.
- **Troubleshoot:** Keep it educational.

#### 430) Electrode Cracking & Loss of Active Material
**Concept:** How capacity vanishes if material is still inside
- **Hook + Predict:** "How can capacity vanish if material is still inside?"
- **Do:** Mechanical stress sim from cycling; particles crack and lose electrical contact.
- **Notice:** Active material becomes electrically isolated.
- **Why:** Volume change and stress fatigue.
- **Twist:** Add binder improvements and particle size control.
- **AI Viz:** Percolation network showing disconnected particles.
- **Troubleshoot:** Link to high-rate cycling damage.

#### 431) Electrolyte Additives
**Concept:** Small chemistry tweaks, huge life changes
- **Hook + Predict:** "Can a 1% additive change battery life 2×?"
- **Do:** Additive sim: SEI stability vs voltage and temperature.
- **Notice:** Some additives drastically reduce side reactions.
- **Why:** They change interphase chemistry and film formation.
- **Twist:** Add "cost" and "low-temp performance" tradeoffs.
- **AI Viz:** Reaction pathway toggles.
- **Troubleshoot:** Keep it conceptual without unsafe chemistry steps.

#### 432) Water Contamination
**Concept:** Why moisture control is extreme
- **Hook + Predict:** "Why does a tiny bit of water ruin cells?"
- **Do:** Moisture sim: HF formation, gas, impedance rise, failure risk.
- **Notice:** Defect rates jump at ppm moisture.
- **Why:** Electrolyte reacts with water and degrades interfaces.
- **Twist:** Dry room dew point improvements and yield gains.
- **AI Viz:** Yield vs moisture ppm curve.
- **Troubleshoot:** Emphasize factory controls.

#### 433) Separator Shutdown & Safety Design
**Concept:** Can a battery self-protect?
- **Hook + Predict:** "Can a battery 'self-protect' by shutting ion flow?"
- **Do:** Shutdown separator sim: temperature triggers pore collapse.
- **Notice:** Current drops before catastrophic runaway (in some cases).
- **Why:** Polymer transitions reduce permeability.
- **Twist:** Too early shutdown limits power; too late fails.
- **AI Viz:** Temperature threshold and current timeline.
- **Troubleshoot:** Teach it's one layer, not a guarantee.

#### 434) Fast Charge vs Charger vs Cell Limit
**Concept:** Who's the bottleneck?
- **Hook + Predict:** "Is slow charging your charger's fault or your battery's?"
- **Do:** System sim: charger max power, cable limits, battery acceptance limit.
- **Notice:** Bottleneck can shift dynamically during charge.
- **Why:** Early phase may be charger-limited; late phase battery-limited.
- **Twist:** Add cold temperature → acceptance limit dominates.
- **AI Viz:** Live bottleneck indicator.
- **Troubleshoot:** Keep the three caps visible.

#### 435) Supply Chain Map: From Mine to Pack
**Concept:** What parts exist
- **Hook + Predict:** "Is a battery mostly lithium?"
- **Do:** Interactive bill-of-materials map: cathode, anode, electrolyte, separator, foils, casing, BMS.
- **Notice:** Lithium is a small fraction by mass; many constraints exist.
- **Why:** Performance depends on multiple engineered layers.
- **Twist:** Toggle chemistries and see material demand shift.
- **AI Viz:** Sankey: mass + cost by component.
- **Troubleshoot:** Show "substitution" constraints.

#### 436) Critical Raw Materials
**Concept:** Lithium, nickel, cobalt, graphite, manganese
- **Hook + Predict:** "Which material is the hardest bottleneck?"
- **Do:** Supply risk sim: demand growth, refining capacity, geopolitics, recycling.
- **Notice:** Refining often bottlenecks more than mining.
- **Why:** Chemical processing and quality specs are hard.
- **Twist:** LFP reduces nickel/cobalt dependence.
- **AI Viz:** Risk dashboard per material.
- **Troubleshoot:** Keep it scenario-based.

#### 437) Refining vs Mining
**Concept:** Why 'ore' isn't 'battery-grade'
- **Hook + Predict:** "If there's plenty of lithium in the ground, why shortages?"
- **Do:** Processing chain sim: extraction → conversion → battery-grade salts; yield and purity steps.
- **Notice:** Purity and capacity constraints dominate timeline.
- **Why:** Battery-grade specs require tight impurity control.
- **Twist:** Compare brine vs hard-rock routes (conceptually).
- **AI Viz:** Process flow with yield losses and quality gates.
- **Troubleshoot:** Avoid hard numbers unless you'll cite sources.

#### 438) Cathode Manufacturing
**Concept:** Precursor → calcination → coating
- **Hook + Predict:** "Is cathode powder just 'mixed metals'?"
- **Do:** Cathode process sim: precursor ratio control; calcination temperature affects crystal quality.
- **Notice:** Small process drift changes capacity and cycle life.
- **Why:** Crystal phase and particle morphology matter.
- **Twist:** Surface coating improves stability at high voltage.
- **AI Viz:** Particle morphology slider + life predictor.
- **Troubleshoot:** Keep it high-level but causal.

#### 439) Anode Supply: Natural vs Synthetic Graphite
**Concept:** Graphite is not interchangeable
- **Hook + Predict:** "Is graphite interchangeable?"
- **Do:** Compare particle shape, purity, rate capability; simulate fast-charge performance.
- **Notice:** Different graphites behave differently under high rates.
- **Why:** Surface area, porosity, and impurities affect SEI and kinetics.
- **Twist:** Add silicon blend and show tradeoffs.
- **AI Viz:** Rate capability vs cycle life chart.
- **Troubleshoot:** Emphasize quality control.

#### 440) Separator Supply Chain
**Concept:** Polymer films + coatings
- **Hook + Predict:** "Why can a thin film constrain an entire industry?"
- **Do:** Capacity sim: separator production rate and defect rate impacts cell output.
- **Notice:** High defect rate kills yield quickly.
- **Why:** Pinholes and thickness variation cause shorts and failures.
- **Twist:** Ceramic coatings improve safety but cost and stiffness rise.
- **AI Viz:** Yield waterfall.
- **Troubleshoot:** Show "QC gates" and scrap cost.

#### 441) Electrolyte Formulation Supply Chain
**Concept:** Why electrolyte choice changes fast charging
- **Hook + Predict:** "Why does electrolyte choice change fast charging?"
- **Do:** Electrolyte sim: conductivity, viscosity, SEI formation, temperature range.
- **Notice:** Gains often trade off with low-temp or safety.
- **Why:** Solvent/salt/additive choices alter ion transport and reactions.
- **Twist:** High-voltage electrolyte vs standard.
- **AI Viz:** Performance triangle (fast charge / cold / life).
- **Troubleshoot:** Keep it conceptual.

#### 442) Manufacturing QC: X-Ray/CT for Defects
**Concept:** Folds, misalignment detection
- **Hook + Predict:** "Can a hidden fold cause failure months later?"
- **Do:** Defect injection sim: folds/misalignment → local current density spikes → hotspot.
- **Notice:** Rare defects dominate warranty cost.
- **Why:** Local short paths and uneven pressure create failure seeds.
- **Twist:** Add inline inspection and compute ROI.
- **AI Viz:** Defect map and "escape rate" meter.
- **Troubleshoot:** Make it a detective game.

#### 443) Formation Bottleneck Economics
**Concept:** Factory throughput vs quality
- **Hook + Predict:** "Why can't factories just 'skip' slow formation?"
- **Do:** Factory sim: formation time dominates WIP; reducing time raises defect risk.
- **Notice:** Throughput and yield trade hard.
- **Why:** Interphase formation is time-dependent chemistry.
- **Twist:** Use smarter formation protocols to shorten time.
- **AI Viz:** WIP accumulation and cost per cell.
- **Troubleshoot:** Keep metrics: yield, throughput, scrap.

#### 444) Recycling: Black Mass → Refining
**Concept:** Closing the loop
- **Hook + Predict:** "Is recycling just melting batteries?"
- **Do:** Recycling process sim: mechanical shred → black mass → hydromet refining; yields and purity.
- **Notice:** Recycling is a chemical supply chain, not just trash processing.
- **Why:** Valuable metals must be separated to battery-grade specs.
- **Twist:** Design-for-recycling improves yield and safety.
- **AI Viz:** Material recovery Sankey + cost/CO₂ proxy.
- **Troubleshoot:** Keep it nonhazardous: simulation only.

#### 445) Second-Life Batteries
**Concept:** Grid storage from EV packs
- **Hook + Predict:** "If an EV battery is 'bad,' is it useless?"
- **Do:** Second-life sim: reduced capacity and power still fine for stationary storage.
- **Notice:** Different applications value different metrics.
- **Why:** Grid storage needs energy and cost, not peak power.
- **Twist:** Sorting and testing costs can dominate economics.
- **AI Viz:** Best-use recommender by SOH.
- **Troubleshoot:** Include safety screening step.

#### 446) Charging Infrastructure: AC vs DC Fast Charging
**Concept:** Different beasts
- **Hook + Predict:** "Why is DC fast charging a different beast than home charging?"
- **Do:** System sim: AC onboard charger limits vs external DC power; thermal limits.
- **Notice:** Different bottlenecks and conversion losses.
- **Why:** Power electronics and cooling constraints differ.
- **Twist:** Add grid constraints and demand charges (conceptually).
- **AI Viz:** Loss breakdown + time-to-charge.
- **Troubleshoot:** Keep it practical.

#### 447) Cell Matching
**Concept:** Why packs need graded cells
- **Hook + Predict:** "Can tiny capacity mismatch reduce usable pack energy a lot?"
- **Do:** Pack sim: random mismatch; compute pack cutoff on weakest cell.
- **Notice:** Usable energy drops; imbalance worsens over cycles.
- **Why:** Series strings limited by weakest cell.
- **Twist:** Better matching reduces BMS balancing burden.
- **AI Viz:** Cell histogram + pack usable energy.
- **Troubleshoot:** Show benefits of cell grading.

#### 448) Pressure & Swelling Management
**Concept:** Mechanical design affects electrochemistry
- **Hook + Predict:** "Can squeezing a cell change its performance?"
- **Do:** Pressure model sim: stack pressure improves contact but too much damages separator.
- **Notice:** There's an optimal compression band.
- **Why:** Contact resistance and pore structure respond to pressure.
- **Twist:** Compare pouch vs prismatic structural needs.
- **AI Viz:** Pressure → resistance → heat map.
- **Troubleshoot:** Keep safe limits explicit.

#### 449) Charging Efficiency
**Concept:** Where the energy actually goes during charge
- **Hook + Predict:** "If you add 1 kWh, do you store 1 kWh?"
- **Do:** Loss accounting sim: I²R, polarization losses, thermal management power.
- **Notice:** Efficiency depends on current and temperature.
- **Why:** Overpotential converts power to heat.
- **Twist:** Compare slow vs fast charge total losses.
- **AI Viz:** Energy-in Sankey: stored vs lost.
- **Troubleshoot:** Use realistic cable + pack resistances.

#### 450) "Best Strategy" Planner
**Concept:** Optimize charge time + battery life + cost
- **Hook + Predict:** "Can you charge faster and extend life with smarter choices?"
- **Do:** Multi-objective optimizer: choose target SOC, temp preheat, charge power, taper strategy.
- **Notice:** Pareto front: time vs degradation vs energy cost.
- **Why:** Physics tradeoffs; optimization finds best compromise.
- **Twist:** Personalize to use case: commuter vs road-trip vs fleet.
- **AI Viz:** Pareto curve + recommended plan.
- **Troubleshoot:** Keep constraints transparent and editable.

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

### Registration Checklist
Each new game must be:
1. Created as `components/[Name]Renderer.tsx` (auto-discovered by router via `import.meta.glob`)
2. Added to `src/data/gameCategories.ts` in the appropriate category
3. Added to `src/data/gameSEOData.ts` with title, description, concepts, difficulty
4. Added to `lib/gameData.ts` games array and searchTags
5. Added to `src/data/gameCatalog.ts` difficulty map

### Category Organization
| Category | Game Range | Count |
|----------|-----------|-------|
| Measurement & Data Acquisition | 251-260 | 10 |
| Analog Building Blocks | 261-270 | 10 |
| Digital Hardware Reality | 271-280 | 10 |
| Power, Motors & Energy Systems | 281-290 | 10 |
| Semiconductors & Devices | 291-295 | 5 |
| Control + Sensing | 296-300 | 5 |
| Power Conversion Hardware | 301-310 | 10 |
| Batteries & Charging | 311-315 | 5 |
| Motors & Actuators | 316-320 | 5 |
| Communications & Connectivity | 321-325 | 5 |
| Audio & Human-Facing | 326-330 | 5 |
| Sensors & Interfacing | 331-335 | 5 |
| Reliability | 336-340 | 5 |
| System Engineering | 341-350 | 10 |
| Mechanical Engineering | 351-400 | 50 |
| Battery Technology | 401-450 | 50 |
| **TOTAL** | **251-450** | **200** |
