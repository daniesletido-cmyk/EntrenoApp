const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. All paths in Manifest Resources
const manifestDir = 'C:\\Users\\danie\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Web Applications\\Manifest Resources\\pdhgnnimkdgbffhcmogdldikeolaeedj';
const sourceIcon = path.resolve('public/brand/logo-mark-512.png');

console.log('Source icon exists:', fs.existsSync(sourceIcon));

async function run() {
  // Overwrite Icons in Manifest Resources
  const iconSizes = [32, 48, 64, 96, 128, 256, 512];
  
  const folders = [
    path.join(manifestDir, 'Icons'),
    path.join(manifestDir, 'Trusted Icons', 'Icons'),
  ];
  
  for (const folder of folders) {
    if (!fs.existsSync(folder)) continue;
    for (const size of iconSizes) {
      const targetPath = path.join(folder, `${size}.png`);
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(targetPath + '.tmp');
      fs.renameSync(targetPath + '.tmp', targetPath);
      console.log(`Updated: ${targetPath}`);
    }
  }

  // Icons Maskable
  const maskablePath = path.join(manifestDir, 'Icons Maskable', '512.png');
  if (fs.existsSync(path.dirname(maskablePath))) {
    await sharp(sourceIcon)
      .resize(512, 512)
      .png()
      .toFile(maskablePath + '.tmp');
    fs.renameSync(maskablePath + '.tmp', maskablePath);
    console.log(`Updated: ${maskablePath}`);
  }

  // Overwrite .ico file in _crx_pdhgnnimkdgbffhcmogdldikeolaeedj
  const crxDir = 'C:\\Users\\danie\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Web Applications\\_crx_pdhgnnimkdgbffhcmogdldikeolaeedj';
  const icoSource = path.resolve('public/favicon.ico');
  const icoTarget = path.join(crxDir, 'EntrenoApp.ico');
  if (fs.existsSync(icoSource)) {
    fs.copyFileSync(icoSource, icoTarget);
    console.log(`Updated: ${icoTarget}`);
    
    // Also update MD5 hash if .ico.md5 exists
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(fs.readFileSync(icoTarget)).digest('hex');
    const md5File = path.join(crxDir, 'EntrenoApp.ico.md5');
    if (fs.existsSync(md5File)) {
      fs.writeFileSync(md5File, hash);
      console.log(`Updated MD5: ${md5File} -> ${hash}`);
    }
  }

  console.log('All Chrome Web Application icons overwritten successfully!');
}

run().catch(console.error);
