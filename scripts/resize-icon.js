const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'AI logos united in perfect harmony.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');

// 去背門檻（取 RGB 最小值當亮度）
const HARD = 245; // >= 全透明
const SOFT = 205; // <  完全不動，中間做線性漸層避免白邊

// 從四邊 flood fill 掉白底；logo 內部的白（ChatGPT 圓圈、Claude 星芒）保留
async function dewhite(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);

  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    const lum = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    if (lum < SOFT) continue;
    data[i * 4 + 3] = lum >= HARD ? 0 : Math.round((255 * (HARD - lum)) / (HARD - SOFT));
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }

  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

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
    // 先縮圖再去背，才能一併吃掉縮放產生的近白邊緣
    const resized = await sharp(squaredBuf)
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      .png()
      .toBuffer();
    fs.writeFileSync(outPath, await dewhite(resized));
    console.log(`Generated: icon${size}.png (${size}x${size})`);
  }

  console.log('Done!');
}

main().catch(console.error);
