const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const userDataRoot = path.join(
  process.env.LOCALAPPDATA || "",
  "Google",
  "Chrome",
  "User Data"
);
const sourceIcon = path.resolve("public/brand/logo-mark-512.png");
const sourceMaskable = path.resolve("public/icon-maskable-512.png");
const sourceIco = path.resolve("public/favicon.ico");

async function updateApp(webAppsDir, appId) {
  const manifestDir = path.join(webAppsDir, "Manifest Resources", appId);
  const crxDir = path.join(webAppsDir, `_crx_${appId}`);

  const iconDirs = [
    path.join(manifestDir, "Icons"),
    path.join(manifestDir, "Trusted Icons", "Icons"),
  ];

  for (const folder of iconDirs) {
    if (!fs.existsSync(folder)) continue;
    const files = fs.readdirSync(folder).filter((f) => /^\d+\.png$/i.test(f));
    for (const file of files) {
      const size = Number.parseInt(file, 10);
      if (!Number.isFinite(size) || size <= 0) continue;
      const targetPath = path.join(folder, file);
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(`${targetPath}.tmp`);
      fs.renameSync(`${targetPath}.tmp`, targetPath);
      console.log(`Updated: ${targetPath}`);
    }
  }

  const maskableDir = path.join(manifestDir, "Icons Maskable");
  if (fs.existsSync(maskableDir)) {
    const files = fs.readdirSync(maskableDir).filter((f) => /^\d+\.png$/i.test(f));
    const maskSrc = fs.existsSync(sourceMaskable) ? sourceMaskable : sourceIcon;
    for (const file of files) {
      const size = Number.parseInt(file, 10) || 512;
      const targetPath = path.join(maskableDir, file);
      await sharp(maskSrc)
        .resize(size, size)
        .png()
        .toFile(`${targetPath}.tmp`);
      fs.renameSync(`${targetPath}.tmp`, targetPath);
      console.log(`Updated maskable: ${targetPath}`);
    }
  }

  const icoTarget = path.join(crxDir, "EntrenoApp.ico");
  if (fs.existsSync(sourceIco) && fs.existsSync(crxDir)) {
    fs.copyFileSync(sourceIco, icoTarget);
    console.log(`Updated: ${icoTarget}`);

    const md5File = path.join(crxDir, "EntrenoApp.ico.md5");
    const icoBytes = fs.readFileSync(icoTarget);
    const md5Raw = crypto.createHash("md5").update(icoBytes).digest();
    fs.writeFileSync(md5File, md5Raw);
    console.log(`Updated MD5 (16B): ${md5File}`);
  }
}

async function run() {
  if (!fs.existsSync(sourceIcon) || !fs.existsSync(sourceIco)) {
    throw new Error("Missing brand source icons in public/. Run asset generator first.");
  }
  if (!fs.existsSync(userDataRoot)) {
    console.log("Chrome User Data directory not found:", userDataRoot);
    return;
  }

  const profiles = fs
    .readdirSync(userDataRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let updatedCount = 0;
  for (const profile of profiles) {
    const webAppsDir = path.join(userDataRoot, profile, "Web Applications");
    if (!fs.existsSync(webAppsDir)) continue;

    const entries = fs
      .readdirSync(webAppsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("_crx_"));

    for (const entry of entries) {
      const icoCandidate = path.join(webAppsDir, entry.name, "EntrenoApp.ico");
      if (fs.existsSync(icoCandidate)) {
        const appId = entry.name.slice("_crx_".length);
        console.log(`Found Chrome EntrenoApp PWA in ${profile}: ${appId}`);
        await updateApp(webAppsDir, appId);
        updatedCount++;
      }
    }
  }

  console.log(`Done. Updated ${updatedCount} Chrome PWA icon installation(s).`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
