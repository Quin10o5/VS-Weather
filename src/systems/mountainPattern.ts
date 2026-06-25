/** Per-peak mountain layers — back hills, main mass, then foreground hills on top. */

export const MOUNTAIN_BLOCKS_W = 128;
export const MOUNTAIN_BLOCKS_H = 24;

/** Block x of the main cluster centroid — used to anchor placement in the panel. */
export const MAIN_CLUSTER_CENTER_X = 68;

export type MountainCell = 'fill' | 'ridge';

export interface MountainLayer {
  fill: string;
  ridge: string;
  cells: { x: number; row: number; kind: MountainCell }[];
}

interface Peak {
  cx: number;
  height: number;
  leftSlope: number;
  rightSlope: number;
  /** Max columns the peak extends left of cx (keeps gaps between ranges). */
  leftReach?: number;
  /** Max columns the peak extends right of cx. */
  rightReach?: number;
}

/** Focal mass — tallest peaks. */
const MAIN_PEAKS: Peak[] = [
  { cx: 50, height: 13, leftSlope: 0.88, rightSlope: 0.82, leftReach: 7 },
  { cx: 67, height: 20, leftSlope: 0.92, rightSlope: 1.02 },
  { cx: 78, height: 15, leftSlope: 1.05, rightSlope: 0.78 },
  { cx: 87, height: 11, leftSlope: 0.9, rightSlope: 0.38, rightReach: 14 },
];

/** Separate small range to the left with a clear gap before the main mass. */
const LEFT_RANGE_PEAKS: Peak[] = [
  { cx: 3, height: 4, leftSlope: 0.26, rightSlope: 0.3, leftReach: 14, rightReach: 8 },
  { cx: 11, height: 7, leftSlope: 0.3, rightSlope: 0.32, leftReach: 13, rightReach: 10 },
  { cx: 19, height: 6, leftSlope: 0.28, rightSlope: 0.34, leftReach: 12, rightReach: 9 },
  { cx: 26, height: 5, leftSlope: 0.27, rightSlope: 0.36, leftReach: 10, rightReach: 6 },
];

/** Distant ridges on the right flank. */
const SURROUND_BACK_PEAKS: Peak[] = [
  { cx: 98, height: 5, leftSlope: 0.38, rightSlope: 0.34, rightReach: 12 },
  { cx: 106, height: 4, leftSlope: 0.4, rightSlope: 0.32, rightReach: 11 },
  { cx: 114, height: 5, leftSlope: 0.36, rightSlope: 0.3, rightReach: 10 },
  { cx: 118, height: 3, leftSlope: 0.42, rightSlope: 0.28, rightReach: 6 },
];

/** Foreground knolls overlapping the lower slopes — drawn after the main peaks. */
const SURROUND_FRONT_PEAKS: Peak[] = [
  { cx: 42, height: 10, leftSlope: 0.72, rightSlope: 0.58, leftReach: 11, rightReach: 10 },
  { cx: 58, height: 9, leftSlope: 0.68, rightSlope: 0.55, leftReach: 10, rightReach: 10 },
  { cx: 73, height: 8, leftSlope: 0.62, rightSlope: 0.5, leftReach: 9, rightReach: 9 },
  { cx: 84, height: 9, leftSlope: 0.58, rightSlope: 0.48, leftReach: 10, rightReach: 9 },
  { cx: 94, height: 8, leftSlope: 0.55, rightSlope: 0.45, leftReach: 9, rightReach: 8 },
];

const PEAKS: Peak[] = [
  ...MAIN_PEAKS,
  ...LEFT_RANGE_PEAKS,
  ...SURROUND_BACK_PEAKS,
  ...SURROUND_FRONT_PEAKS,
];

type MountainPalette = { fill: string; ridge: string };

const LEFT_RANGE_PALETTES: MountainPalette[] = [
  { fill: '#2e3338', ridge: '#40454a' },
  { fill: '#3a3f44', ridge: '#4c5156' },
  { fill: '#32373c', ridge: '#44494e' },
  { fill: '#42474c', ridge: '#54595e' },
];

const MAIN_PEAK_PALETTES: MountainPalette[] = [
  { fill: '#34393e', ridge: '#464b50' },
  { fill: '#2a2f34', ridge: '#3c4146' },
  { fill: '#3e4348', ridge: '#50555a' },
  { fill: '#464b50', ridge: '#585d62' },
];

const SURROUND_BACK_PALETTES: MountainPalette[] = [
  { fill: '#40454a', ridge: '#52575c' },
  { fill: '#383d42', ridge: '#4a4f54' },
  { fill: '#44494e', ridge: '#565b60' },
  { fill: '#34393e', ridge: '#464b50' },
];

const SURROUND_FRONT_PALETTES: MountainPalette[] = [
  { fill: '#2c3136', ridge: '#3e4348' },
  { fill: '#3a3f44', ridge: '#4c5156' },
  { fill: '#44494e', ridge: '#565b60' },
  { fill: '#30353a', ridge: '#42474c' },
  { fill: '#3c4146', ridge: '#4e5358' },
];

const BASE_PALETTE: MountainPalette = { fill: '#363b40', ridge: '#484d52' };

const TOE_RAMP_LEN = 6;
const CANVAS_EDGE_RAMP = 8;
const REACH_SOFTEN = 5;

function defaultReach(height: number, slope: number): number {
  return Math.ceil(height / Math.max(slope, 0.2)) + 2;
}

function softenReachEdge(height: number, distFromReachEdge: number): number {
  if (height <= 0 || distFromReachEdge >= REACH_SOFTEN) {
    return height;
  }
  const t = (distFromReachEdge + 1) / (REACH_SOFTEN + 1);
  return Math.max(0, Math.floor(height * t));
}

function peakColumnHeight(x: number, peak: Peak): number {
  const dx = x - peak.cx;
  if (dx < 0) {
    const reach = peak.leftReach ?? defaultReach(peak.height, peak.leftSlope);
    if (-dx > reach) {
      return 0;
    }
    const raw = Math.max(0, Math.floor(peak.height + dx * peak.leftSlope));
    return softenReachEdge(raw, reach + dx);
  }
  const reach = peak.rightReach ?? defaultReach(peak.height, peak.rightSlope);
  if (dx > reach) {
    return 0;
  }
  const raw = Math.max(0, Math.floor(peak.height - dx * peak.rightSlope));
  return softenReachEdge(raw, reach - dx);
}

/** Limit vertical steps and extend short toe ramps so edges taper instead of cliffing. */
function softenSilhouette(heights: number[]): void {
  for (let pass = 0; pass < 3; pass++) {
    for (let x = 1; x < MOUNTAIN_BLOCKS_W - 1; x++) {
      const neighborMax = Math.max(heights[x - 1], heights[x + 1]);
      if (heights[x] > 0 && heights[x] < neighborMax - 2) {
        heights[x] = neighborMax - 2;
      }
    }
  }

  for (let x = 1; x < MOUNTAIN_BLOCKS_W; x++) {
    if (heights[x] > heights[x - 1] + 1) {
      heights[x] = heights[x - 1] + 1;
    }
  }
  for (let x = MOUNTAIN_BLOCKS_W - 2; x >= 0; x--) {
    if (heights[x] > heights[x + 1] + 1) {
      heights[x] = heights[x + 1] + 1;
    }
  }

  extendToeRamps(heights, TOE_RAMP_LEN);
  taperCanvasEdges(heights);
}

/** Grade heights down at x=0 and x=width-1 so the silhouette meets the edge on a slope. */
function taperCanvasEdges(heights: number[]): void {
  taperCanvasEdge(heights, 1);
  taperCanvasEdge(heights, -1);
}

function taperCanvasEdge(heights: number[], dir: 1 | -1): void {
  const edge = dir === 1 ? 0 : MOUNTAIN_BLOCKS_W - 1;
  const inward = dir === 1 ? 1 : -1;
  if (heights[edge] <= 0) {
    return;
  }

  heights[edge] = Math.min(heights[edge], 1);
  for (let step = 1; step < CANVAS_EDGE_RAMP; step++) {
    const x = edge + inward * step;
    if (x < 0 || x >= MOUNTAIN_BLOCKS_W || heights[x] <= 0) {
      break;
    }
    const maxAllowed = step + 1;
    if (heights[x] > maxAllowed) {
      heights[x] = maxAllowed;
    }
    const prev = x - inward;
    if (prev >= 0 && prev < MOUNTAIN_BLOCKS_W && heights[prev] > heights[x] - 1) {
      heights[prev] = Math.max(0, heights[x] - 1);
    }
  }
}

function rampOutward(heights: number[], fromX: number, dir: number, rampLen: number): void {
  let h = heights[fromX];
  for (let d = 1; d <= rampLen; d++) {
    const nx = fromX + dir * d;
    if (nx < 0 || nx >= MOUNTAIN_BLOCKS_W) {
      break;
    }
    if (heights[nx] > 0) {
      break;
    }
    h = Math.max(0, h - 1);
    if (h <= 0) {
      break;
    }
    heights[nx] = h;
  }
}

function extendToeRamps(heights: number[], rampLen: number): void {
  let x = 0;
  while (x < MOUNTAIN_BLOCKS_W) {
    while (x < MOUNTAIN_BLOCKS_W && heights[x] <= 0) {
      x++;
    }
    if (x >= MOUNTAIN_BLOCKS_W) {
      break;
    }
    const segStart = x;
    while (x < MOUNTAIN_BLOCKS_W && heights[x] > 0) {
      x++;
    }
    const segEnd = x - 1;
    rampOutward(heights, segEnd, 1, rampLen);
    rampOutward(heights, segStart, -1, rampLen);
  }
}

function buildMergedHeights(): number[] {
  const heights = new Array<number>(MOUNTAIN_BLOCKS_W).fill(0);
  for (let x = 0; x < MOUNTAIN_BLOCKS_W; x++) {
    for (const peak of PEAKS) {
      heights[x] = Math.max(heights[x], peakColumnHeight(x, peak));
    }
  }
  softenSilhouette(heights);
  return heights;
}

/** Column heights (blocks from base) of the full merged mountain silhouette. */
export const MOUNTAIN_SILHOUETTE_HEIGHTS: readonly number[] = buildMergedHeights();

function buildMergedBaseLayer(): MountainLayer {
  const heights = MOUNTAIN_SILHOUETTE_HEIGHTS as number[];
  const cells: MountainLayer['cells'] = [];
  for (let row = 0; row < MOUNTAIN_BLOCKS_H; row++) {
    const rowFromBase = MOUNTAIN_BLOCKS_H - 1 - row;
    for (let x = 0; x < MOUNTAIN_BLOCKS_W; x++) {
      if (heights[x] > rowFromBase) {
        cells.push({ x, row, kind: 'fill' });
      }
    }
  }
  return { ...BASE_PALETTE, cells };
}

function buildPeakLayer(peak: Peak, palette: MountainPalette): MountainLayer {
  const heights = new Array<number>(MOUNTAIN_BLOCKS_W).fill(0);
  for (let x = 0; x < MOUNTAIN_BLOCKS_W; x++) {
    heights[x] = peakColumnHeight(x, peak);
  }
  softenSilhouette(heights);

  const grid: (MountainCell | null)[][] = Array.from({ length: MOUNTAIN_BLOCKS_H }, () =>
    Array<MountainCell | null>(MOUNTAIN_BLOCKS_W).fill(null)
  );

  for (let row = 0; row < MOUNTAIN_BLOCKS_H; row++) {
    const rowFromBase = MOUNTAIN_BLOCKS_H - 1 - row;
    for (let x = 0; x < MOUNTAIN_BLOCKS_W; x++) {
      if (heights[x] > rowFromBase) {
        grid[row][x] = 'fill';
      }
    }
  }

  const topRow = MOUNTAIN_BLOCKS_H - peak.height;
  for (let step = 0; step < peak.height - 2; step++) {
    const row = topRow + step;
    const lx = peak.cx - step;
    if (lx >= 0 && lx < MOUNTAIN_BLOCKS_W && grid[row][lx] !== null) {
      grid[row][lx] = 'ridge';
    }
    const lx2 = peak.cx - step + 1;
    if (step % 2 === 1 && lx2 >= 0 && lx2 < MOUNTAIN_BLOCKS_W && grid[row][lx2] !== null) {
      grid[row][lx2] = 'ridge';
    }
  }

  const cells: MountainLayer['cells'] = [];
  for (let row = 0; row < MOUNTAIN_BLOCKS_H; row++) {
    for (let x = 0; x < MOUNTAIN_BLOCKS_W; x++) {
      const kind = grid[row][x];
      if (kind) {
        cells.push({ x, row, kind });
      }
    }
  }
  return { ...palette, cells };
}

function buildLayersForPeaks(peaks: Peak[], palettes: MountainPalette[]): MountainLayer[] {
  return peaks.map((peak, i) => buildPeakLayer(peak, palettes[i]));
}

export const MOUNTAIN_BASE_LAYER = buildMergedBaseLayer();
export const MOUNTAIN_LEFT_RANGE_LAYERS: readonly MountainLayer[] = buildLayersForPeaks(
  LEFT_RANGE_PEAKS,
  LEFT_RANGE_PALETTES
);
export const MOUNTAIN_SURROUND_BACK_LAYERS: readonly MountainLayer[] = buildLayersForPeaks(
  SURROUND_BACK_PEAKS,
  SURROUND_BACK_PALETTES
);
export const MOUNTAIN_MAIN_LAYERS: readonly MountainLayer[] = buildLayersForPeaks(
  MAIN_PEAKS,
  MAIN_PEAK_PALETTES
);
export const MOUNTAIN_SURROUND_FRONT_LAYERS: readonly MountainLayer[] = buildLayersForPeaks(
  SURROUND_FRONT_PEAKS,
  SURROUND_FRONT_PALETTES
);

function buildTopRowByColumn(): number[] {
  const topRows = new Array<number>(MOUNTAIN_BLOCKS_W).fill(MOUNTAIN_BLOCKS_H);
  const layers: readonly MountainLayer[] = [
    MOUNTAIN_BASE_LAYER,
    ...MOUNTAIN_LEFT_RANGE_LAYERS,
    ...MOUNTAIN_SURROUND_BACK_LAYERS,
    ...MOUNTAIN_MAIN_LAYERS,
    ...MOUNTAIN_SURROUND_FRONT_LAYERS,
  ];
  for (const layer of layers) {
    for (const cell of layer.cells) {
      if (cell.x >= 0 && cell.x < MOUNTAIN_BLOCKS_W) {
        topRows[cell.x] = Math.min(topRows[cell.x], cell.row);
      }
    }
  }
  return topRows;
}

/** Highest drawn row index per column (smaller y = closer to the sky). */
export const MOUNTAIN_TOP_ROW_BY_COLUMN: readonly number[] = buildTopRowByColumn();

/** @deprecated */
export const MOUNTAIN_SURROUND_LAYERS: readonly MountainLayer[] = [
  ...MOUNTAIN_SURROUND_BACK_LAYERS,
  ...MOUNTAIN_SURROUND_FRONT_LAYERS,
];

export function shuffledLayerOrder(length: number, seed: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  let state = seed >>> 0;
  for (let i = order.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function shuffledLeftRangeOrder(seed: number): number[] {
  return shuffledLayerOrder(MOUNTAIN_LEFT_RANGE_LAYERS.length, seed ^ 0xc2b2ae35);
}

export function shuffledSurroundBackOrder(seed: number): number[] {
  return shuffledLayerOrder(MOUNTAIN_SURROUND_BACK_LAYERS.length, seed);
}

export function shuffledMainOrder(seed: number): number[] {
  return shuffledLayerOrder(MOUNTAIN_MAIN_LAYERS.length, seed ^ 0x9e3779b9);
}

export function shuffledSurroundFrontOrder(seed: number): number[] {
  return shuffledLayerOrder(MOUNTAIN_SURROUND_FRONT_LAYERS.length, seed ^ 0x85ebca6b);
}

/** @deprecated */
export function shuffledSurroundOrder(seed: number): number[] {
  return shuffledSurroundBackOrder(seed);
}
