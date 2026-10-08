const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icono Deportivo Vectorial de Alto Rendimiento (SVG -> PNG)
// Fondo: Superficie premium oscura deportiva con micro-gradiente
// Símbolo: Rayo atlético dinámico + Anillo de cadencia/maratón + Chispa de energía
const svgIcon512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="38%" r="68%">
      <stop offset="0%" stop-color="#141923"/>
      <stop offset="55%" stop-color="#0a0c12"/>
      <stop offset="100%" stop-color="#030406"/>
    </radialGradient>
    <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="45%" stop-color="#00f0ff"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.85"/>
      <stop offset="50%" stop-color="#00f0ff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.15"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Base sólida con esquinas redondeadas para iOS Home Screen y PWA -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Borde interior sutil de precisión -->
  <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="url(#ringGrad)" stroke-width="3.5" stroke-opacity="0.35"/>

  <!-- Halo de luz ambiental deportivo -->
  <circle cx="256" cy="250" r="140" fill="#10b981" opacity="0.15" filter="url(#glow)"/>
  <circle cx="280" cy="220" r="100" fill="#00f0ff" opacity="0.1" filter="url(#glow)"/>

  <!-- Anillo exterior de cadencia / ritmo con segmentos -->
  <circle cx="256" cy="256" r="172" fill="none" stroke="url(#ringGrad)" stroke-width="5" stroke-dasharray="28 14 56 14" opacity="0.45"/>
  <circle cx="256" cy="256" r="146" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="5 15" opacity="0.18"/>

  <!-- Rayo de alta potencia cinética -->
  <g filter="url(#glow)">
    <!-- Halo posterior del rayo -->
    <path d="M284 80 L160 258 L248 258 L218 432 L356 226 L268 226 Z" fill="url(#boltGrad)" opacity="0.5" transform="scale(1.05) translate(-12, -12)"/>
    <!-- Cuerpo del rayo -->
    <path d="M284 80 L160 258 L250 258 L220 432 L356 226 L268 226 Z" fill="url(#boltGrad)"/>
  </g>

  <!-- Puntos cardinales de precisión GPS -->
  <circle cx="256" cy="52" r="4" fill="#00f0ff" opacity="0.7"/>
  <circle cx="256" cy="460" r="4" fill="#10b981" opacity="0.7"/>
  <circle cx="52" cy="256" r="4" fill="#10b981" opacity="0.5"/>
  <circle cx="460" cy="256" r="4" fill="#3b82f6" opacity="0.5"/>

  <!-- Chispa de máxima intensidad (Spark) -->
  <circle cx="330" cy="144" r="8" fill="url(#sparkGrad)" filter="url(#glow)"/>
  <circle cx="356" cy="172" r="4" fill="#10b981" opacity="0.85"/>
</svg>`;

async function main() {
  const root = process.cwd();
  fs.writeFileSync(path.join(root, 'public', 'icon.svg'), svgIcon512);

  const buf512 = await sharp(Buffer.from(svgIcon512)).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(root, 'public', 'icon-512.png'), buf512);
  fs.writeFileSync(path.join(root, 'public', 'apple-touch-icon.png'), buf512);
  fs.writeFileSync(path.join(root, 'public', 'brand', 'logo-mark-512.png'), buf512);

  const buf192 = await sharp(Buffer.from(svgIcon512)).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(root, 'public', 'icon-192.png'), buf192);

  const buf256 = await sharp(Buffer.from(svgIcon512)).resize(256, 256).png().toBuffer();
  fs.writeFileSync(path.join(root, 'public', 'brand', 'logo-mark.png'), buf256);

  console.log('App icons generated successfully: 512, 192, 256, apple-touch-icon!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
