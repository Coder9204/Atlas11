const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://coachatlas.ai';
const LASTMOD = '2026-02-21';

// Read existing sitemap to extract game slugs
const existing = fs.readFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), 'utf8');
const gameRegex = /\/games\/([a-z0-9-]+)/g;
const gameSlugs = new Set();
let m;
while ((m = gameRegex.exec(existing)) !== null) {
  gameSlugs.add(m[1]);
}

function urlEntry(loc, priority, changefreq = 'monthly') {
  return `  <url>\n    <loc>${DOMAIN}${loc}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

const entries = [];

// Home + Games index
entries.push(urlEntry('/', 1.0, 'weekly'));
entries.push(urlEntry('/games', 0.9, 'weekly'));

// Static pages
['/pricing', '/about', '/blog', '/glossary', '/progress'].forEach(p => {
  entries.push(urlEntry(p, 0.9, 'weekly'));
});

// All game pages
[...gameSlugs].sort().forEach(slug => {
  entries.push(urlEntry(`/games/${slug}`, 0.8));
});

// Comparison pages
const comparisons = [
  'gpu-vs-asic','tpu-vs-gpu','laminar-vs-turbulent-flow','chiplets-vs-monolithic-dies','series-vs-parallel-solar-panels','solar-grade-vs-ic-grade-silicon','flip-chip-vs-wirebond','static-vs-kinetic-friction','rolling-vs-sliding-friction','reflection-vs-refraction','convection-vs-conduction','endothermic-vs-exothermic-reactions','elastic-vs-inelastic-collisions','damped-vs-forced-oscillations','tensor-core-vs-systolic-array','gpu-occupancy-vs-memory-bandwidth','inference-latency-vs-batching','iv-curve-vs-fill-factor','mosfet-vs-sram-cell','leakage-current-vs-leakage-power','rc-delay-vs-interconnect-delay','clock-distribution-vs-clock-jitter','network-congestion-vs-latency','bypass-diodes-vs-shunt-defects','solar-temp-vs-thermal-derating','latent-heat-vs-phase-change-energy','supercooling-vs-leidenfrost','adiabatic-heating-vs-newton-cooling','eddy-currents-vs-eddy-pendulum','diffraction-vs-thin-film','chromatic-aberration-vs-depth-of-field','memory-hierarchy-vs-kv-cache','photolithography-vs-litho-focus-dose','doping-diffusion-vs-ion-implantation','etch-anisotropy-vs-deposition-types','static-electricity-vs-electric-field','electromagnetic-induction-vs-induction-heating','bifacial-albedo-vs-spectral-mismatch','mppt-vs-string-sizing','convection-vs-convection-currents','ballistic-pendulum-vs-inelastic-collisions','karman-vortex-vs-vortex-rings','beats-vs-sound-interference','laser-speckle-vs-moire-patterns','polarization-vs-polarized-sky','standing-waves-vs-resonance','bernoulli-vs-venturi','wireless-charging-vs-induction-heating','texturing-vs-lithography-solar',
];
comparisons.forEach(s => entries.push(urlEntry(`/compare/${s}`, 0.7)));

// How-it-works pages
const howPages = [
  'bernoullis-principle','buoyancy','capillary-action','hydraulic-jump','venturi-effect','coriolis-effect','magnus-effect','orbital-mechanics','electromagnetic-induction','kirchhoffs-laws','eddy-currents','snells-law','doppler-effect','diffraction','polarization','total-internal-reflection','photoelectric-effect','carnot-cycle','thermal-expansion','leidenfrost-effect','resonance','standing-waves','brownian-motion','mosfet-switching','photolithography','capacitive-touch','neural-network-inference','gpu-memory-bandwidth','solar-cell','mppt','gas-laws','evaporative-cooling','faraday-cage','heat-sink','thermal-throttling','solar-inverter','ups-system','esd-protection','doping-semiconductors','etching-process','cmp-process','chiplet-design','kv-cache','quantization-ai','tensor-computation','memory-bandwidth-ai','bypass-diode','fill-factor-solar','convection-heat','angular-momentum','centripetal-force','pendulum-physics','hookes-law','drag-force-physics','terminal-velocity','siphon-physics','cavitation-physics','ecc-memory','dram-refresh',
];
howPages.forEach(s => entries.push(urlEntry(`/how/${s}`, 0.7)));

// Blog posts
const blogPosts = [
  'best-stem-learning-apps-2026','best-math-homework-apps-2026','best-coding-cs-apps-2026','best-astronomy-space-apps-2026','best-biology-nature-apps-2026','best-kids-stem-math-games-2026','atlas-coach-vs-khan-academy','atlas-coach-vs-khan-academy-kids','atlas-coach-vs-coursera','atlas-coach-vs-udemy','atlas-coach-vs-brilliant','atlas-coach-vs-quizlet','atlas-coach-vs-ankidroid','atlas-coach-vs-photomath','atlas-coach-vs-gauth','atlas-coach-vs-brainly','atlas-coach-vs-solvely','atlas-coach-vs-quiz-ai','atlas-coach-vs-question-ai','atlas-coach-vs-nerd-ai','atlas-coach-vs-ixl','atlas-coach-vs-adaptedmind-math','atlas-coach-vs-desmos','atlas-coach-vs-scientific-calculator-plus-991','atlas-coach-vs-graphing-calculator-plus-84-83','atlas-coach-vs-homework-helper-math-solver','atlas-coach-vs-mimo','atlas-coach-vs-pydroid-3','atlas-coach-vs-build-your-first-game','atlas-coach-vs-learn-ethical-hacking','atlas-coach-vs-hackerx','atlas-coach-vs-minecraft-education','atlas-coach-vs-minecraft-education-preview','atlas-coach-vs-stellarium','atlas-coach-vs-skyview-lite','atlas-coach-vs-star-walk-2','atlas-coach-vs-star-tracker','atlas-coach-vs-solar-system-scope','atlas-coach-vs-star-roam','atlas-coach-vs-nasa-app','atlas-coach-vs-inaturalist','atlas-coach-vs-picturethis','atlas-coach-vs-plant-app','atlas-coach-vs-plantin','atlas-coach-vs-plant-identifier-plant-care','atlas-coach-vs-plantify','atlas-coach-vs-plantum','atlas-coach-vs-leafcheck','atlas-coach-vs-bird-sound-identifier','atlas-coach-vs-prodigy-math','atlas-coach-vs-math-kids','atlas-coach-vs-math-games','atlas-coach-vs-kids-multiplication','atlas-coach-vs-times-table','atlas-coach-vs-numberblocks-world','atlas-coach-vs-meet-the-numberblocks',
];
blogPosts.forEach(s => entries.push(urlEntry(`/blog/${s}`, 0.5)));

// Topic pages
const topics = [
  'semiconductor-manufacturing','solar-energy','fluid-dynamics','gpu-architecture','classical-mechanics','electromagnetic-theory','optics-and-light','thermal-engineering','power-systems','ai-inference','chip-design','oscillations-waves','surface-phenomena','materials-science','space-orbital','rf-communications','ai-prompting','data-center-cooling','viscosity-rheology','rotational-dynamics','phase-transitions','esd-reliability','interconnects-signals','fun-experiments','collisions-impacts','network-architecture','batteries-energy-storage','sound-acoustics','chemical-reactions-energy',
];
topics.forEach(s => entries.push(urlEntry(`/topics/${s}`, 0.7)));

// Glossary pages
const glossary = [
  'torque','momentum','angular-momentum','centripetal-force','moment-of-inertia','impulse','kinetic-energy','potential-energy','force','work','power','frequency','wavelength','amplitude','period','q-factor','damping-ratio','reynolds-number','viscosity','surface-tension','froude-number','contact-angle','specific-heat','latent-heat','thermal-conductivity','thermal-resistance','entropy','coefficient-of-performance','electric-field','voltage','current','resistance','impedance','magnetic-field','magnetic-flux','inductance','capacitance','refractive-index','focal-length','dispersion','bandgap','threshold-voltage','doping','yield','defect-density','electromigration','fill-factor','mppt','open-circuit-voltage','irradiance','tensor-core','systolic-array','kv-cache','memory-bandwidth','flops','quantization','arithmetic-intensity','ohms-law','faradays-law','lenzs-law','snells-law','critical-angle','drag-coefficient','buoyant-force','pascals-law','newtons-laws','hookes-law','coulombs-law','doppler-shift','diffraction-limit','skin-depth','carnot-efficiency','mach-number','thermal-expansion-coefficient','emissivity','photovoltaic-effect','pue','delta-v','reactance','angular-velocity','centripetal-acceleration','wave-speed','resonance','back-emf','shockley-queisser-limit','current-density','dielectric-constant','albedo','stress-intensity-factor','poissons-ratio',
];
glossary.forEach(s => entries.push(urlEntry(`/glossary/${s}`, 0.5)));

// Use case pages
const useCases = [
  'physics-lab-alternative','ap-physics-prep','engineering-interview-prep','semiconductor-career-prep','solar-design-training','classroom-demonstrations','science-fair-projects','self-study-physics','homework-help','conceptual-physics','university-physics-supplement','tutoring-tool','data-center-engineer','curiosity-driven','ai-engineer-training',
];
useCases.forEach(s => entries.push(urlEntry(`/use-cases/${s}`, 0.7)));

// Alternatives pages
const alternatives = [
  'phet-simulations','khan-academy','brilliant','labster','algodoo','coursera-physics','udemy-physics','physics-classroom',
];
alternatives.forEach(s => entries.push(urlEntry(`/alternatives/${s}`, 0.7)));

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), sitemap);
console.log(`Sitemap generated with ${entries.length} URLs`);
console.log(`  Games: ${gameSlugs.size}`);
console.log(`  Comparisons: ${comparisons.length}`);
console.log(`  How-it-works: ${howPages.length}`);
console.log(`  Blog: ${blogPosts.length}`);
console.log(`  Topics: ${topics.length}`);
console.log(`  Glossary: ${glossary.length}`);
console.log(`  Use cases: ${useCases.length}`);
console.log(`  Alternatives: ${alternatives.length}`);
console.log(`  Static: 5`);
