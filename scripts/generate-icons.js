import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generatePwaIcons() {
  const publicDir = path.resolve('public');
  const iconsDir = path.join(publicDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgPath = path.join(publicDir, 'icon.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('Source icon.svg not found');
    return;
  }

  // Extract base64 image or convert SVG
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  let inputBuffer;

  const match = svgContent.match(/href="data:image\/png;base64,([^"]+)"/);
  if (match && match[1]) {
    inputBuffer = Buffer.from(match[1], 'base64');
  } else {
    inputBuffer = Buffer.from(svgContent);
  }

  // Trim transparent borders if any to get the exact logo symbol bounding box
  const trimmedLogoBuffer = await sharp(inputBuffer)
    .trim()
    .toBuffer();

  // Resize logo symbol to 360x360 (70.3% of 512x512) for a generous 15% safe-zone margin around the logo
  const resizedLogo = await sharp(trimmedLogoBuffer)
    .resize(360, 360, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .toBuffer();

  // Create 512x512 canvas with solid white background (#FFFFFF)
  const master512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: resizedLogo,
        top: 76, // (512 - 360) / 2
        left: 76,
      },
    ])
    .png({ quality: 100 })
    .toBuffer();

  // Write master 512x512
  fs.writeFileSync(path.join(iconsDir, 'ziezan-quran.png'), master512);
  fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), master512);
  fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), master512);

  // Generate 192x192
  const icon192 = await sharp(master512)
    .resize(192, 192)
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

  // Generate 180x180 Apple Touch Icon
  const icon180 = await sharp(master512)
    .resize(180, 180)
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon180);

  // Generate 64x64 Favicon
  const icon64 = await sharp(master512)
    .resize(64, 64)
    .toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), icon64);

  // Generate SVG version with solid white background
  const whiteBgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#FFFFFF"/>
  <image width="360" height="360" x="76" y="76" href="data:image/png;base64,${resizedLogo.toString('base64')}"/>
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), whiteBgSvg);

  console.log('PWA Icons generated successfully with solid white background and 15% safe-zone margin!');
}

generatePwaIcons().catch(console.error);
