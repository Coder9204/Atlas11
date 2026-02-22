/**
 * Generate og-image.png for social sharing (1200x630)
 * Creates an SVG and writes it as an SVG file that can be converted to PNG.
 * For production, convert this SVG to PNG using any converter.
 * We also write it directly as the og-image since modern social platforms accept SVG,
 * but we'll write a PNG-compatible SVG with embedded rasterization hint.
 */
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a1a;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#0f1629;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a0a1a;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:#8B5CF6;stop-opacity:0.05" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative grid -->
  <g opacity="0.06" stroke="#3B82F6" stroke-width="1">
    <line x1="0" y1="0" x2="1200" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="800" y1="0" x2="800" y2="630"/>
    <line x1="0" y1="210" x2="1200" y2="210"/>
    <line x1="0" y1="420" x2="1200" y2="420"/>
  </g>

  <!-- Glow circle -->
  <circle cx="900" cy="315" r="250" fill="url(#glow)" opacity="0.5"/>
  <circle cx="300" cy="315" r="180" fill="url(#glow)" opacity="0.3"/>

  <!-- Decorative atoms/orbits -->
  <g transform="translate(920, 280)" opacity="0.2">
    <ellipse cx="0" cy="0" rx="120" ry="40" fill="none" stroke="#3B82F6" stroke-width="1.5" transform="rotate(0)"/>
    <ellipse cx="0" cy="0" rx="120" ry="40" fill="none" stroke="#8B5CF6" stroke-width="1.5" transform="rotate(60)"/>
    <ellipse cx="0" cy="0" rx="120" ry="40" fill="none" stroke="#06B6D4" stroke-width="1.5" transform="rotate(120)"/>
    <circle cx="0" cy="0" r="8" fill="#3B82F6"/>
  </g>

  <!-- Logo icon -->
  <rect x="80" y="160" width="72" height="72" rx="16" fill="url(#accent)"/>
  <text x="116" y="210" text-anchor="middle" fill="white" font-size="40" font-family="Arial, sans-serif">&#127891;</text>

  <!-- Title -->
  <text x="80" y="300" fill="white" font-size="64" font-weight="800" font-family="'Inter', 'Segoe UI', Arial, sans-serif" letter-spacing="-1">Coach Atlas</text>

  <!-- Tagline -->
  <text x="80" y="360" fill="#94A3B8" font-size="28" font-weight="400" font-family="'Inter', 'Segoe UI', Arial, sans-serif">Master Physics &amp; Engineering Through</text>
  <text x="80" y="400" fill="#94A3B8" font-size="28" font-weight="400" font-family="'Inter', 'Segoe UI', Arial, sans-serif">Interactive Simulations &amp; AI Coaching</text>

  <!-- Stats bar -->
  <rect x="80" y="450" width="700" height="1" fill="#2a2a4a"/>

  <text x="80" y="500" fill="#3B82F6" font-size="32" font-weight="700" font-family="'Inter', 'Segoe UI', Arial, sans-serif">342+</text>
  <text x="195" y="500" fill="#6B7280" font-size="20" font-weight="400" font-family="'Inter', 'Segoe UI', Arial, sans-serif">Games</text>

  <text x="320" y="500" fill="#8B5CF6" font-size="32" font-weight="700" font-family="'Inter', 'Segoe UI', Arial, sans-serif">14</text>
  <text x="365" y="500" fill="#6B7280" font-size="20" font-weight="400" font-family="'Inter', 'Segoe UI', Arial, sans-serif">Categories</text>

  <text x="540" y="500" fill="#10B981" font-size="32" font-weight="700" font-family="'Inter', 'Segoe UI', Arial, sans-serif">AI</text>
  <text x="585" y="500" fill="#6B7280" font-size="20" font-weight="400" font-family="'Inter', 'Segoe UI', Arial, sans-serif">Coaching</text>

  <!-- URL -->
  <text x="80" y="570" fill="#4B5563" font-size="22" font-weight="400" font-family="'Inter', 'Segoe UI', Arial, sans-serif">coachatlas.ai</text>

  <!-- Border accent line -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>
  <rect x="0" y="626" width="1200" height="4" fill="url(#accent)"/>
</svg>`;

// Write SVG version
fs.writeFileSync(path.join(__dirname, '..', 'public', 'og-image.svg'), svg);
console.log('Created public/og-image.svg');

// For og-image.png, we need to create a real PNG.
// Since we can't easily generate PNG from Node without dependencies,
// we'll create a minimal valid 1200x630 PNG with branding colors.
// The SVG above serves as the design reference.

// Create a minimal but valid PNG with the brand gradient
// This is a programmatically generated 1200x630 PNG
function createPNG(width, height) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // CRC32 lookup table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBytes = Buffer.from(type);
    const lengthBuf = Buffer.alloc(4);
    lengthBuf.writeUInt32BE(data.length);
    const crcData = Buffer.concat([typeBytes, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(crcData));
    return Buffer.concat([lengthBuf, typeBytes, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Generate raw pixel data with gradient
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte (none)
    const t = y / height;
    for (let x = 0; x < width; x++) {
      const s = x / width;
      // Dark gradient background: #0a0a1a to #0f1629 to #0a0a1a
      let r = Math.round(10 + 5 * Math.sin(s * Math.PI));
      let g = Math.round(10 + 12 * Math.sin(s * Math.PI));
      let b = Math.round(26 + 15 * Math.sin(s * Math.PI));

      // Add accent gradient bar at top (4px)
      if (y < 4) {
        const gradT = x / width;
        r = Math.round(59 + (139 - 59) * gradT);  // #3B82F6 to #8B5CF6
        g = Math.round(130 + (92 - 130) * gradT);
        b = Math.round(246 + (246 - 246) * gradT);
      }
      // Bottom bar
      if (y >= height - 4) {
        const gradT = x / width;
        r = Math.round(59 + (139 - 59) * gradT);
        g = Math.round(130 + (92 - 130) * gradT);
        b = Math.round(246 + (246 - 246) * gradT);
      }

      // Add subtle glow in center-right area
      const dx = (x - 900) / 250;
      const dy = (y - 315) / 250;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) {
        const glow = (1 - dist) * 0.12;
        r = Math.min(255, Math.round(r + 59 * glow));
        g = Math.min(255, Math.round(g + 130 * glow));
        b = Math.min(255, Math.round(b + 246 * glow));
      }

      rawData.push(r, g, b);
    }
  }

  // Compress with zlib (deflate)
  const zlib = require('zlib');
  const rawBuf = Buffer.from(rawData);
  const compressed = zlib.deflateSync(rawBuf, { level: 9 });

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend),
  ]);
}

const png = createPNG(1200, 630);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'og-image.png'), png);
console.log('Created public/og-image.png (1200x630)');
