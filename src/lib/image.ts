const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

type Source = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;

const sizeOf = (s: Source) =>
  s instanceof HTMLVideoElement
    ? { w: s.videoWidth, h: s.videoHeight }
    : s instanceof HTMLImageElement
      ? { w: s.naturalWidth, h: s.naturalHeight }
      : { w: s.width, h: s.height };

/** Draws `source` into a new w×h canvas, cropped to fill (like object-fit: cover). */
export function coverCanvas(source: Source, w: number, h: number, mirror = false) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const { w: sw, h: sh } = sizeOf(source);
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality)
  );

/** Encodes as JPEG, lowering quality until the file fits in `maxBytes`. */
export async function canvasToJpeg(canvas: HTMLCanvasElement, maxBytes: number) {
  let quality = 0.86;
  let blob = await toBlob(canvas, quality);
  while (blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await toBlob(canvas, quality);
  }
  return blob;
}

export const makeThumb = (source: Source) => coverCanvas(source, 240, 320).toDataURL("image/jpeg", 0.6);

export async function fileToAvatar(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return coverCanvas(await loadImage(url), 160, 160).toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** One shareable picture: main photo, small inset photo, and the Zereal logo as credit. */
export async function composeShare(mainUrl: string, insetUrl: string) {
  const [main, inset, logo] = await Promise.all([
    loadImage(mainUrl),
    loadImage(insetUrl),
    loadImage("/logo.png"),
  ]);
  const W = 1080;
  const H = 1440;
  const canvas = coverCanvas(main, W, H);
  const ctx = canvas.getContext("2d")!;

  const iw = 330;
  const ih = 440;
  const ix = 40;
  const iy = 40;
  const border = 7;
  ctx.save();
  ctx.shadowColor = "rgb(0 0 0 / 0.3)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 8;
  roundedRect(ctx, ix - border, iy - border, iw + border * 2, ih + border * 2, 44 + border);
  ctx.fillStyle = "#12141c";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundedRect(ctx, ix, iy, iw, ih, 44);
  ctx.clip();
  ctx.drawImage(coverCanvas(inset, iw, ih), ix, iy);
  ctx.restore();

  const lw = 300;
  const lh = (logo.naturalHeight / logo.naturalWidth) * lw;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.shadowColor = "rgb(0 0 0 / 0.4)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.drawImage(logo, (W - lw) / 2, H - lh - 44, lw, lh);
  ctx.restore();

  return toBlob(canvas, 0.92);
}

export async function saveBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // iOS has no download folder for web apps; the share sheet offers "Save Image".
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch {
      /* user dismissed the sheet */
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
