// Builds the transparent logo, app icons and share cover from the source logo.
// Usage: node scripts/make-assets.mjs "<path to source logo>"
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("pass the source logo path");

const BG = "#12141c";
const BG_SOFT = "#1c2030";

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const N = W * H;

const lum = new Uint8Array(N);
for (let i = 0; i < N; i++) lum[i] = Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);

// Label connected dark regions. Regions touching the border or large enough to be
// a letter counter are background; small enclosed ones (eyes, mouth) stay opaque.
const DARK = 48;
const KEEP_MAX_AREA = 250;
const label = new Int32Array(N).fill(-1);
const isBg = new Uint8Array(N);
const stack = new Int32Array(N);
for (let start = 0; start < N; start++) {
  if (lum[start] >= DARK || label[start] !== -1) continue;
  let top = 0;
  const members = [];
  let touchesBorder = false;
  stack[top++] = start;
  label[start] = start;
  while (top) {
    const p = stack[--top];
    members.push(p);
    const x = p % W;
    const y = (p / W) | 0;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touchesBorder = true;
    const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
    for (const q of nb) {
      if (q >= 0 && label[q] === -1 && lum[q] < DARK) {
        label[q] = start;
        stack[top++] = q;
      }
    }
  }
  if (process.env.DEBUG && !touchesBorder) console.log("region", members.length, "at", start % W, (start / W) | 0);
  if (touchesBorder || members.length > KEEP_MAX_AREA) for (const p of members) isBg[p] = 1;
}

// Pixels within a few px of background are anti-aliased edges: alpha from luminance.
const R = 3;
const nearBg = new Uint8Array(N);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!isBg[p]) continue;
    for (let dy = -R; dy <= R; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -R; dx <= R; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < W) nearBg[yy * W + xx] = 1;
      }
    }
  }
}

const out = Buffer.alloc(N * 4);
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let p = 0; p < N; p++) {
  let a = 1;
  if (isBg[p]) a = 0;
  else if (nearBg[p]) a = Math.min(1, Math.max(0, (lum[p] - 12) / 170));
  const o = p * 4;
  for (let c = 0; c < 3; c++) {
    // un-premultiply so edges don't keep a dark fringe
    out[o + c] = a > 0 && a < 1 ? Math.min(255, Math.round(data[p * 3 + c] / a)) : data[p * 3 + c];
  }
  out[o + 3] = Math.round(a * 255);
  if (a > 0.05) {
    const x = p % W, y = (p / W) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

const pad = 8;
const box = {
  left: Math.max(0, minX - pad),
  top: Math.max(0, minY - pad),
  width: Math.min(W, maxX + pad) - Math.max(0, minX - pad),
  height: Math.min(H, maxY + pad) - Math.max(0, minY - pad),
};
const logo = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract(box).png().toBuffer();

mkdirSync("public", { recursive: true });
await sharp(logo).toFile("public/logo.png");
await sharp(logo).resize({ width: 420 }).toFile("public/logo-small.png");

const backdrop = (w, h, radius = 0) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <radialGradient id="g" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stop-color="${BG_SOFT}"/>
          <stop offset="100%" stop-color="${BG}"/>
        </radialGradient>
        <radialGradient id="b" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#8fb8ff" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#8fb8ff" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${w}" height="${h}" rx="${radius}" fill="url(#g)"/>
      <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.42}" ry="${h * 0.34}" fill="url(#b)"/>
    </svg>`
  );

async function card(w, h, logoWidth, file, radius = 0) {
  const mark = await sharp(logo).resize({ width: Math.round(logoWidth) }).toBuffer();
  await sharp(backdrop(w, h, radius)).composite([{ input: mark, gravity: "centre" }]).png().toFile(file);
}

await card(512, 512, 430, "src/app/icon.png", 116);
await card(180, 180, 150, "src/app/apple-icon.png");
await card(192, 192, 150, "public/icon-192.png");
await card(512, 512, 400, "public/icon-512.png");
await card(512, 512, 320, "public/icon-maskable.png");
await card(1200, 630, 760, "src/app/opengraph-image.png");
await card(1200, 630, 760, "src/app/twitter-image.png");

console.log("logo", box.width, "x", box.height);
