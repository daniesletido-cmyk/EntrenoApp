const sharp = require('sharp');
const pngToIcoModule = require('png-to-ico');
const pngToIco = pngToIcoModule.default || pngToIcoModule;
const fs = require('fs');
const path = require('path');

// =============================================================================
// NUEVO LOGO ENTRENOAPP: ULTRA-MINIMALISTA, GEOMÉTRICO Y PREMIUM
// =============================================================================
// Estilo: Apple Fitness / Nike Training / Oura / Whoop.
// En vez de siluetas humanas detalladas, un isotipo geométrico puro y potente:
// Un monograma atlético de alta precisión formado por 3 chevrones/barras de
// aceleración cinética continua (representando las fases de zancada, cadencia y ritmo),
// perfectamente alineadas con cortes aerodinámicos a 45 grados.
// Colores: Verde Esmeralda Neón de alta energía (#10b981 / #059669 / #34d399) sobre
// fondo negro obsidiana mate profundo (#090a0f) con sutil halo luminoso.
// =============================================================================

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Fondo obsidiana sutil -->
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#141824"/>
      <stop offset="60%" stop-color="#0a0c12"/>
      <stop offset="100%" stop-color="#040507"/>
    </radialGradient>

    <!-- Gradiente Esmeralda Kinetic -->
    <linearGradient id="neonEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="40%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>

    <!-- Barra de potencia secundaria -->
    <linearGradient id="cyanSpark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>

    <!-- Filtro de resplandor deportivo suave -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Base redondeada continua (Superellipse / Squircle) -->
  <rect width="512" height="512" rx="120" fill="url(#bg)"/>

  <!-- Borde exterior sutil de precisión -->
  <rect x="6" y="6" width="500" height="500" rx="114" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="2"/>
  <rect x="6" y="6" width="500" height="500" rx="114" fill="none" stroke="#10b981" stroke-width="2" stroke-opacity="0.3"/>

  <!-- Halo de energía esmeralda en el núcleo -->
  <circle cx="256" cy="256" r="140" fill="#10b981" opacity="0.14" filter="url(#glow)"/>

  <!-- SÍMBOLO PRINCIPAL: Monograma "E" / Chevrones de Aceleración y Ritmo Cardíaco -->
  <!-- Geometría limpia, líneas sólidas y audaces, máxima legibilidad a 16x16 y 512x512 -->
  <g filter="url(#glow)">
    <!-- Barra vertical izquierda de estabilidad -->
    <rect x="134" y="128" width="56" height="256" rx="28" fill="url(#neonEmerald)"/>

    <!-- Barra superior de impulso -->
    <path d="M 190 128 L 334 128 C 354 128, 368 144, 368 164 C 368 184, 354 200, 334 200 L 190 200 Z" fill="url(#neonEmerald)"/>

    <!-- Barra central dinámica (Rayo acelerador hacia delante) -->
    <path d="M 190 228 L 296 228 C 314 228, 326 242, 326 256 C 326 270, 314 284, 296 284 L 190 284 Z" fill="url(#cyanSpark)"/>

    <!-- Barra inferior con corte angular de velocidad -->
    <path d="M 190 312 L 358 312 C 378 312, 392 328, 392 348 C 392 368, 378 384, 358 384 L 190 384 Z" fill="url(#neonEmerald)"/>

    <!-- Detalle de impacto: chispa/punto de precisión de rendimiento en el ángulo derecho -->
    <circle cx="368" cy="256" r="14" fill="#34d399"/>
  </g>
</svg>`;

async function main() {
  const root = process.cwd();

  // Guardar SVG
  fs.writeFileSync(path.join(root, 'public', 'icon.svg'), svgIcon);

  // Generar variantes PNG en sharp
  const buf512 = await sharp(Buffer.from(svgIcon)).resize(512, 512).png().toBuffer();
  const buf256 = await sharp(Buffer.from(svgIcon)).resize(256, 256).png().toBuffer();
  const buf192 = await sharp(Buffer.from(svgIcon)).resize(192, 192).png().toBuffer();
  const buf128 = await sharp(Buffer.from(svgIcon)).resize(128, 128).png().toBuffer();
  const buf64 = await sharp(Buffer.from(svgIcon)).resize(64, 64).png().toBuffer();
  const buf48 = await sharp(Buffer.from(svgIcon)).resize(48, 48).png().toBuffer();
  const buf32 = await sharp(Buffer.from(svgIcon)).resize(32, 32).png().toBuffer();
  const buf16 = await sharp(Buffer.from(svgIcon)).resize(16, 16).png().toBuffer();

  // Generar archivo .ico multiplataforma con todas las capas
  const icoBuffer = await pngToIco([buf256, buf128, buf64, buf48, buf32, buf16]);

  // Actualizar todos los archivos .ico
  const icoPaths = [
    path.join(root, 'build', 'icon.ico'),
    path.join(root, 'electron', 'icon.ico'),
    path.join(root, 'public', 'favicon.ico'),
    path.join(root, 'src', 'app', 'favicon.ico'),
    path.join(root, 'ios', 'App', 'App', 'public', 'favicon.ico'),
    path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'favicon.ico'),
    path.join(root, 'out', 'favicon.ico'),
  ];

  for (const p of icoPaths) {
    if (fs.existsSync(path.dirname(p))) {
      fs.writeFileSync(p, icoBuffer);
      console.log('Updated ICO:', p);
    }
  }

  // Actualizar PNG 512
  const png512Paths = [
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

  for (const p of png512Paths) {
    if (fs.existsSync(path.dirname(p))) {
      fs.writeFileSync(p, buf512);
      console.log('Updated 512px PNG:', p);
    }
  }

  // Actualizar PNG 256
  const png256Paths = [
    path.join(root, 'public', 'brand', 'logo-mark.png'),
    path.join(root, 'ios', 'App', 'App', 'public', 'brand', 'logo-mark.png'),
    path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'brand', 'logo-mark.png'),
    path.join(root, 'out', 'brand', 'logo-mark.png'),
  ];

  for (const p of png256Paths) {
    if (fs.existsSync(path.dirname(p))) {
      fs.writeFileSync(p, buf256);
      console.log('Updated 256px PNG:', p);
    }
  }

  // Actualizar PNG 192
  const png192Paths = [
    path.join(root, 'public', 'icon-192.png'),
    path.join(root, 'ios', 'App', 'App', 'public', 'icon-192.png'),
    path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'icon-192.png'),
    path.join(root, 'out', 'icon-192.png'),
  ];

  for (const p of png192Paths) {
    if (fs.existsSync(path.dirname(p))) {
      fs.writeFileSync(p, buf192);
      console.log('Updated 192px PNG:', p);
    }
  }

  // Actualizar base64 embebido en splash screens HTML
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
      console.log('Updated splash base64 in:', sf);
    }
  }

  console.log('NEW MINIMALIST LOGO APPLIED EVERYWHERE!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
