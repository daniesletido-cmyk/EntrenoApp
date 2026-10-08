const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;
const fs = require('fs');
const path = require('path');

// =============================================================================
// LOGO DEPORTIVO MINIMALISTA, GEOMÉTRICO Y MODERNO DE ALTO IMPACTO (512x512)
// =============================================================================
// Concepto:
// - Silueta limpia y estilizada de un Corredor Kinético en zancada máxima hacia delante
//   fusionado dinámicamente con una chispa/flecha de energía en pendiente ascendente.
// - Fondo: Cuadrado redondeado premium (squircle) en tono noche profunda (#090c15 -> #0f172a)
//   con un sutil halo esmeralda neón / cian eléctrico.
// - Estilo: Ultra minimalista, geométrico, perfectamente reconocible a cualquier escala
//   (desde favicon de 16x16 y barra de título de Windows, hasta splash y móvil de 512x512).
// =============================================================================

const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="65%" stop-color="#0b0f19"/>
      <stop offset="100%" stop-color="#05070b"/>
    </radialGradient>
    <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="45%" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38ef7d"/>
      <stop offset="100%" stop-color="#11998e"/>
    </linearGradient>
    <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0"/>
      <stop offset="100%" stop-color="#00f2fe" stop-opacity="0.8"/>
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Base Squircle iOS / Windows con esquinas redondeadas elegantes -->
  <rect width="512" height="512" rx="116" fill="url(#bgGrad)"/>
  
  <!-- Borde perimetral de precisión fina y moderna -->
  <rect x="5" y="5" width="502" height="502" rx="112" fill="none" stroke="#10b981" stroke-width="3" stroke-opacity="0.25"/>

  <!-- Halo de energía ambiental sutil en el centro -->
  <circle cx="256" cy="245" r="130" fill="#00f2fe" opacity="0.08" filter="url(#softGlow)"/>
  <circle cx="280" cy="230" r="100" fill="#10b981" opacity="0.12" filter="url(#softGlow)"/>

  <!-- Trazo dinámico de velocidad en la pista (Track Speed Line) -->
  <path d="M96 388 C 160 388, 220 382, 300 348" fill="none" stroke="url(#trailGrad)" stroke-width="7" stroke-linecap="round"/>
  <path d="M128 418 C 190 418, 260 410, 360 376" fill="none" stroke="url(#trailGrad)" stroke-width="4.5" stroke-linecap="round" opacity="0.6"/>

  <!-- Silueta geométrica y minimalista de Atletismo / Triatlón en impulso de zancada -->
  <g filter="url(#softGlow)">
    <!-- Cabeza del atleta: círculo perfecto y dinámico inclinado hacia la meta -->
    <circle cx="318" cy="128" r="28" fill="#00f2fe"/>

    <!-- Tronco estilizado y zancada potente -->
    <!-- Pierna de apoyo / impulso trasero (Zancada inferior izquierda) -->
    <path d="M 148 376 L 222 300 L 260 252" fill="none" stroke="url(#bodyGrad)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Torso y cadera angular en avance -->
    <path d="M 230 300 L 272 214 L 302 168" fill="none" stroke="url(#bodyGrad)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Pierna delantera en zancada alta (Flexión de rodilla de velocidad) -->
    <path d="M 272 214 L 334 238 L 368 336" fill="none" stroke="url(#bodyGrad)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Brazo delantero de propulsión hacia la victoria -->
    <path d="M 284 196 L 358 196 L 396 160" fill="none" stroke="#10b981" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Brazo trasero de balanceo y ritmo -->
    <path d="M 268 208 L 210 216 L 180 262" fill="none" stroke="#3b82f6" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
  </g>

  <!-- Puntos satelitales de precisión de ritmo/GPS -->
  <circle cx="414" cy="144" r="6" fill="#00f2fe" filter="url(#softGlow)"/>
  <circle cx="434" cy="164" r="3.5" fill="#10b981" opacity="0.8"/>
</svg>`;

async function run() {
  const root = process.cwd();

  // 1. Guardar SVG fuente
  fs.writeFileSync(path.join(root, 'public', 'icon.svg'), svgLogo);

  // 2. Generar PNGs en distintos tamaños con sharp
  const buf512 = await sharp(Buffer.from(svgLogo)).resize(512, 512).png().toBuffer();
  const buf256 = await sharp(Buffer.from(svgLogo)).resize(256, 256).png().toBuffer();
  const buf192 = await sharp(Buffer.from(svgLogo)).resize(192, 192).png().toBuffer();
  const buf128 = await sharp(Buffer.from(svgLogo)).resize(128, 128).png().toBuffer();
  const buf64 = await sharp(Buffer.from(svgLogo)).resize(64, 64).png().toBuffer();
  const buf48 = await sharp(Buffer.from(svgLogo)).resize(48, 48).png().toBuffer();
  const buf32 = await sharp(Buffer.from(svgLogo)).resize(32, 32).png().toBuffer();
  const buf16 = await sharp(Buffer.from(svgLogo)).resize(16, 16).png().toBuffer();

  // 3. Generar archivo .ico multiplataforma real (con tamaños 16, 24, 32, 48, 64, 128, 256)
  const icoBuffer = await pngToIco([buf256, buf128, buf64, buf48, buf32, buf16]);

  // Lista de destinos a actualizar para icono ICO
  const icoTargets = [
    path.join(root, 'build', 'icon.ico'),
    path.join(root, 'electron', 'icon.ico'),
    path.join(root, 'public', 'favicon.ico'),
    path.join(root, 'src', 'app', 'favicon.ico'),
    path.join(root, 'ios', 'App', 'App', 'public', 'favicon.ico'),
    path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'favicon.ico'),
    path.join(root, 'out', 'favicon.ico'),
  ];

  for (const t of icoTargets) {
    if (fs.existsSync(path.dirname(t))) {
      fs.writeFileSync(t, icoBuffer);
      console.log('Updated ICO:', t);
    }
  }

  // Lista de destinos para PNGs
  const pngTargets512 = [
    path.join(root, 'public', 'icon-512.png'),
    path.join(root, 'public', 'apple-touch-icon.png'),
    path.join(root, 'public', 'brand', 'logo-mark-512.png'),
    path.join(root, 'assets', 'logo-source.png'),
    path.join(root, 'ios', 'App', 'App', 'public', 'icon-512.png'),
    path.join(root, 'ios', 'App', 'App', 'public', 'brand', 'logo-mark-512.png'),
    path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'icon-512.png'),
    path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'brand', 'logo-mark-512.png'),
    path.join(root, 'out', 'icon-512.png'),
    path.join(root, 'out', 'apple-touch-icon.png'),
    path.join(root, 'out', 'brand', 'logo-mark-512.png'),
  ];

  for (const t of pngTargets512) {
    if (fs.existsSync(path.dirname(t))) {
      fs.writeFileSync(t, buf512);
      console.log('Updated 512px PNG:', t);
    }
  }

  const pngTargets256 = [
    path.join(root, 'public', 'brand', 'logo-mark.png'),
    path.join(root, 'ios', 'App', 'App', 'public', 'brand', 'logo-mark.png'),
    path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'brand', 'logo-mark.png'),
    path.join(root, 'out', 'brand', 'logo-mark.png'),
  ];

  for (const t of pngTargets256) {
    if (fs.existsSync(path.dirname(t))) {
      fs.writeFileSync(t, buf256);
      console.log('Updated 256px PNG:', t);
    }
  }

  const pngTargets192 = [
    path.join(root, 'public', 'icon-192.png'),
    path.join(root, 'ios', 'App', 'App', 'public', 'icon-192.png'),
    path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'icon-192.png'),
    path.join(root, 'out', 'icon-192.png'),
  ];

  for (const t of pngTargets192) {
    if (fs.existsSync(path.dirname(t))) {
      fs.writeFileSync(t, buf192);
      console.log('Updated 192px PNG:', t);
    }
  }

  // 4. Actualizar logo base64 en splash screens HTML
  const base64Png = buf256.toString('base64');
  const splashFiles = [
    path.join(root, 'electron', 'splash.html'),
    path.join(root, 'Cargando EntrenoApp.html'),
  ];

  for (const sf of splashFiles) {
    if (fs.existsSync(sf)) {
      let content = fs.readFileSync(sf, 'utf8');
      content = content.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/, `data:image/png;base64,${base64Png}`);
      fs.writeFileSync(sf, content);
      console.log('Updated embedded splash base64 in:', sf);
    }
  }

  console.log('ALL ICONS AND LOGOS UPDATED SUCCESSFULLY!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
