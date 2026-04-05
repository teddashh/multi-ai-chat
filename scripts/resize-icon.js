const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, '..', 'AI logos united in perfect harmony.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');

async function main() {
  // Read source image metadata to find the sphere center
  const meta = await sharp(src).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  // Crop to square centered on the sphere (trim whitespace, then square crop)
  const trimmed = sharp(src).trim();
  const trimMeta = await trimmed.toBuffer().then(buf => sharp(buf).metadata());

  const squareSize = Math.min(trimMeta.width, trimMeta.height);
  const cropX = Math.round((trimMeta.width - squareSize) / 2);
  const cropY = Math.round((trimMeta.height - squareSize) / 2);

  const squared = sharp(await trimmed.toBuffer())
    .extract({ left: cropX, top: cropY, width: squareSize, height: squareSize });

  const squaredBuf = await squared.toBuffer();

  for (const size of [16, 48, 128]) {
    const outPath = path.join(outDir, `icon${size}.png`);
    await sharp(squaredBuf)
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      .png()
      .toFile(outPath);
    console.log(`Generated: icon${size}.png (${size}x${size})`);
  }

  console.log('Done!');
}

main().catch(console.error);
