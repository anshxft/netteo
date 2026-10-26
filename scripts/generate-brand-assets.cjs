const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirSize = 16 * count;
  let currentOffset = 6 + dirSize;

  const entries = [];
  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // image size
    entry.writeUInt32LE(currentOffset, 12); // image offset
    entries.push(entry);
    currentOffset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const inputPath = path.join(root, 'NETTEO LOGO.PNG');
  const publicBrandDir = path.join(root, 'public/brand');
  const publicDir = path.join(root, 'public');
  const appDir = path.join(root, 'src/app');

  if (!fs.existsSync(publicBrandDir)) {
    fs.mkdirSync(publicBrandDir, { recursive: true });
  }

  // 1. Copy original full logo into public/brand/netteo-logo-original.png & webp
  await sharp(inputPath).png().toFile(path.join(publicBrandDir, 'netteo-logo-original.png'));
  await sharp(inputPath).webp({ quality: 95 }).toFile(path.join(publicBrandDir, 'netteo-logo-original.webp'));
  console.log('Original logo saved.');

  // 2. Generate clean transparent background version
  const img = sharp(inputPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const bgR = 252.6, bgG = 249.8, bgB = 243.0;
  const rgba = Buffer.alloc(info.width * info.height * 4);

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const srcIdx = (y * info.width + x) * info.channels;
      const dstIdx = (y * info.width + x) * 4;

      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      const dr = bgR - r;
      const dg = bgG - g;
      const db = bgB - b;

      const dist = Math.sqrt(dr * dr * 0.8 + dg * dg * 1.2 + db * db * 1.5);

      let alpha = 0;
      if (dist <= 6) {
        alpha = 0;
      } else if (dist < 18) {
        alpha = Math.round(((dist - 6) / 12) * 255);
      } else {
        alpha = 255;
      }

      if (alpha === 0) {
        rgba[dstIdx] = 0;
        rgba[dstIdx + 1] = 0;
        rgba[dstIdx + 2] = 0;
        rgba[dstIdx + 3] = 0;
      } else {
        const aNorm = alpha / 255;
        const fgR = Math.max(0, Math.min(255, Math.round((r - bgR * (1 - aNorm)) / aNorm)));
        const fgG = Math.max(0, Math.min(255, Math.round((g - bgG * (1 - aNorm)) / aNorm)));
        const fgB = Math.max(0, Math.min(255, Math.round((b - bgB * (1 - aNorm)) / aNorm)));

        rgba[dstIdx] = fgR;
        rgba[dstIdx + 1] = fgG;
        rgba[dstIdx + 2] = fgB;
        rgba[dstIdx + 3] = alpha;
      }
    }
  }

  // Full transparent logo
  const fullTransparentBuffer = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();

  await sharp(fullTransparentBuffer).toFile(path.join(publicBrandDir, 'netteo-logo.png'));
  await sharp(fullTransparentBuffer).webp({ quality: 95 }).toFile(path.join(publicBrandDir, 'netteo-logo.webp'));
  console.log('Full transparent logo saved.');

  // 3. Mark extraction (y <= 604)
  // Bounding box of the mark: left 360, top 233, width 534, height 372
  const cropLeft = 344;
  const cropTop = 220;
  const cropW = 566;
  const cropH = 398;

  const croppedMarkBuffer = await sharp(fullTransparentBuffer)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .png()
    .toBuffer();

  // Create square mark (512x512) centered with transparent background
  const markTransparent512 = await sharp(croppedMarkBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(markTransparent512).toFile(path.join(publicBrandDir, 'netteo-mark.png'));
  await sharp(markTransparent512).webp({ quality: 95 }).toFile(path.join(publicBrandDir, 'netteo-mark.webp'));
  console.log('Transparent mark 512x512 saved.');

  // 4. Create Squircle Tile (512x512) for Favicons and App Icons
  // Rounded squircle with #FDF9F2 fill and refined subtle border
  const squircleSvg = Buffer.from(
    `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="496" height="496" rx="108" fill="#FDF9F2" stroke="#E5DCCF" stroke-width="8"/>
    </svg>`
  );

  const resizedMarkForTile = await sharp(croppedMarkBuffer)
    .resize(380, 380, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const squircleTile512 = await sharp(squircleSvg)
    .composite([
      {
        input: resizedMarkForTile,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  await sharp(squircleTile512).toFile(path.join(publicBrandDir, 'netteo-tile.png'));
  await sharp(squircleTile512).webp({ quality: 95 }).toFile(path.join(publicBrandDir, 'netteo-tile.webp'));
  console.log('Squircle Tile 512x512 saved.');

  // Favicon formats in /public and /src/app:
  // 1. /public/icon.png (512x512 tile)
  await sharp(squircleTile512).toFile(path.join(publicDir, 'icon.png'));
  await sharp(squircleTile512).toFile(path.join(appDir, 'icon.png'));

  // 2. /public/apple-touch-icon.png (180x180)
  const appleTouch = await sharp(squircleTile512).resize(180, 180).png().toBuffer();
  await sharp(appleTouch).toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(appleTouch).toFile(path.join(appDir, 'apple-icon.png'));

  // 3. /public/favicon-32x32.png and /public/favicon-16x16.png
  const fav32 = await sharp(squircleTile512).resize(32, 32).png().toBuffer();
  const fav16 = await sharp(squircleTile512).resize(16, 16).png().toBuffer();
  const fav48 = await sharp(squircleTile512).resize(48, 48).png().toBuffer();

  await sharp(fav32).toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(fav16).toFile(path.join(publicDir, 'favicon-16x16.png'));

  // 4. Multi-resolution favicon.ico
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: fav16 },
    { width: 32, height: 32, buffer: fav32 },
    { width: 48, height: 48, buffer: fav48 },
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log('favicon.ico (16, 32, 48) created in public/ and src/app/.');

  // 5. Also create SVG favicon in public/favicon.svg
  const svgFavicon = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="#FDF9F2" stroke="#E5DCCF" stroke-width="1"/>
  <image href="/brand/netteo-mark.png" x="3" y="3" width="26" height="26" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon);
  console.log('favicon.svg saved.');

  console.log('All brand assets successfully generated and deployed!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
