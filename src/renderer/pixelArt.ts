/** Base pixel grid size for the retro aesthetic */
export const PIXEL = 4;

let scratchCanvas: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;
let cachedDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

export function refreshPixelDpr(): void {
  if (typeof window !== 'undefined') {
    cachedDpr = window.devicePixelRatio || 1;
  }
}

export function getPixelDpr(): number {
  return cachedDpr;
}

export function configurePixelCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = false;
}

/** Align a logical coordinate to the physical pixel grid (avoids hairline gaps at DPR ≠ 1). */
export function snapDrawCoord(n: number, dpr = cachedDpr): number {
  return Math.round(n * dpr) / dpr;
}

export function snapDrawSize(n: number, dpr = cachedDpr): number {
  return Math.max(1 / dpr, Math.round(n * dpr) / dpr);
}

export function getScratchContext(width: number, height: number): CanvasRenderingContext2D {
  const w = Math.ceil(width);
  const h = Math.ceil(height);
  if (!scratchCanvas) {
    scratchCanvas = document.createElement('canvas');
    scratchCtx = scratchCanvas.getContext('2d');
    if (!scratchCtx) {
      throw new Error('Could not create scratch canvas');
    }
  }
  if (scratchCanvas.width < w || scratchCanvas.height < h) {
    scratchCanvas.width = Math.max(scratchCanvas.width, w);
    scratchCanvas.height = Math.max(scratchCanvas.height, h);
  }
  configurePixelCanvas(scratchCtx);
  scratchCtx.setTransform(1, 0, 0, 1, 0, 0);
  scratchCtx.globalAlpha = 1;
  scratchCtx.clearRect(0, 0, w, h);
  return scratchCtx;
}

export function getScratchCanvas(): HTMLCanvasElement {
  if (!scratchCanvas) {
    getScratchContext(1, 1);
  }
  return scratchCanvas!;
}

export function snap(n: number): number {
  return Math.floor(n / PIXEL) * PIXEL;
}

export function snapSize(n: number): number {
  return Math.max(PIXEL, Math.ceil(n / PIXEL) * PIXEL);
}

export function fillBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  blocksW: number,
  blocksH: number,
  color: string,
  alpha = 1
): void {
  const px = snapDrawCoord(snap(x));
  const py = snapDrawCoord(snap(y));
  const w = snapDrawSize(blocksW * PIXEL);
  const h = snapDrawSize(blocksH * PIXEL);
  if (alpha === 1) {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, w, h);
    return;
  }
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, w, h);
  ctx.globalAlpha = prev;
}
