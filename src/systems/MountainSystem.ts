import { DayPhase, DEFAULT_SETTINGS, WeatherSettings, WeatherState, WindState } from '../shared/types';
import { fillBlock, PIXEL, configurePixelCanvas, snap } from '../renderer/pixelArt';
import {
  MAIN_CLUSTER_CENTER_X,
  MOUNTAIN_BASE_LAYER,
  MOUNTAIN_BLOCKS_H,
  MOUNTAIN_BLOCKS_W,
  MOUNTAIN_LEFT_RANGE_LAYERS,
  MOUNTAIN_MAIN_LAYERS,
  MOUNTAIN_SILHOUETTE_HEIGHTS,
  MOUNTAIN_TOP_ROW_BY_COLUMN,
  MOUNTAIN_SURROUND_BACK_LAYERS,
  MOUNTAIN_SURROUND_FRONT_LAYERS,
  MountainCell,
  shuffledLeftRangeOrder,
  shuffledMainOrder,
  shuffledSurroundBackOrder,
  shuffledSurroundFrontOrder,
} from './mountainPattern';
import { WeatherSystem } from './WeatherSystem';

const MOUNTAIN_ALPHAS: Record<MountainCell, number> = {
  fill: 0.94,
  ridge: 0.82,
};

const ANCHOR_START = 0.52;
const ANCHOR_END = 0.98;

const MIN_PEAK_HEIGHT_FOR_SNOW = 3;
const SNOW_CAP_DELAY_SEC = 10;
const SNOW_CAP_LERP_SEC = 16;

export class MountainSystem implements WeatherSystem {
  private width = 0;
  private height = 0;
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private snowTarget = 0;
  private snowStrength = 0;
  private snowChangeDelay = 0;
  private snowHoldActive = false;
  private weatherInitialized = false;
  private leftRangeOrder: number[] = shuffledLeftRangeOrder(0x6d357133);
  private surroundBackOrder: number[] = shuffledSurroundBackOrder(0x6d357133);
  private mainOrder: number[] = shuffledMainOrder(0x6d357133);
  private surroundFrontOrder: number[] = shuffledSurroundFrontOrder(0x6d357133);
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;
  private staticCacheKey = '';
  private snowCapCacheKey = '';
  private snowCapCells: Array<{ x: number; row: number }> = [];

  setDimensions(width: number, height: number): void {
    const sizeChanged = width !== this.width || height !== this.height;
    this.width = width;
    this.height = height;
    if (sizeChanged && width > 0) {
      const seed = (width * 73856093) ^ (height * 19349663);
      this.leftRangeOrder = shuffledLeftRangeOrder(seed);
      this.surroundBackOrder = shuffledSurroundBackOrder(seed);
      this.mainOrder = shuffledMainOrder(seed);
      this.surroundFrontOrder = shuffledSurroundFrontOrder(seed);
      this.invalidateStaticCache();
    }
  }

  onWeatherChange(_state: WeatherState): void {
    if (!this.weatherInitialized) {
      this.weatherInitialized = true;
      return;
    }
    this.snowHoldActive = true;
    this.snowChangeDelay = SNOW_CAP_DELAY_SEC;
  }

  onWindChange(_wind: WindState): void {}

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
    this.invalidateStaticCache();
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  setSnowTarget(strength: number): void {
    this.snowTarget = Math.max(0, Math.min(1, strength));
  }

  update(dt: number, _time: number): void {
    if (this.snowHoldActive) {
      this.snowChangeDelay -= dt;
      if (this.snowChangeDelay <= 0) {
        this.snowHoldActive = false;
      }
      return;
    }

    const diff = this.snowTarget - this.snowStrength;
    if (Math.abs(diff) <= 0.001) {
      this.snowStrength = this.snowTarget;
      return;
    }

    const step = Math.min(1, (dt / SNOW_CAP_LERP_SEC) * 2.5);
    this.snowStrength += diff * step;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.settings.enabled || !this.settings.mountains) {
      return;
    }

    const w = width || this.width;
    const h = height || this.height;
    if (w <= 0 || h <= 0) {
      return;
    }

    const clusterHeightPx = MOUNTAIN_BLOCKS_H * PIXEL;
    const clusterWidthPx = MOUNTAIN_BLOCKS_W * PIXEL;
    const visibleRows =
      h >= clusterHeightPx ? MOUNTAIN_BLOCKS_H : Math.max(0, Math.floor(h / PIXEL));
    if (visibleRows <= 0) {
      return;
    }

    const margin = PIXEL * 2;
    const zoneStart = snap(w * ANCHOR_START);
    const zoneEnd = snap(w * ANCHOR_END);
    const zoneWidth = Math.max(0, zoneEnd - zoneStart);
    const mainCenterPx = MAIN_CLUSTER_CENTER_X * PIXEL;
    const focusX = zoneStart + zoneWidth * 0.54;
    const maxOriginX = Math.max(0, Math.min(w - clusterWidthPx - margin, zoneEnd - clusterWidthPx));
    let originX = snap(focusX - mainCenterPx);
    originX = snap(Math.max(0, Math.min(originX, maxOriginX)));
    const baseY = h >= clusterHeightPx ? h - clusterHeightPx : 0;
    const intensity = Math.min(1, this.settings.intensity);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();

    this.drawStaticMountain(ctx, originX, baseY, visibleRows, intensity);
    this.drawSnowCaps(ctx, originX, baseY, visibleRows, intensity * this.snowStrength);

    ctx.restore();
  }

  private invalidateStaticCache(): void {
    this.staticCacheKey = '';
  }

  private buildStaticCacheKey(visibleRows: number, intensity: number): string {
    return [
      visibleRows,
      intensity.toFixed(3),
      this.leftRangeOrder.join(','),
      this.surroundBackOrder.join(','),
      this.mainOrder.join(','),
      this.surroundFrontOrder.join(','),
    ].join('|');
  }

  private ensureStaticCanvas(width: number, height: number): CanvasRenderingContext2D {
    if (!this.staticCanvas) {
      this.staticCanvas = document.createElement('canvas');
      this.staticCtx = this.staticCanvas.getContext('2d');
      if (!this.staticCtx) {
        throw new Error('Could not create mountain cache canvas');
      }
    }
    if (this.staticCanvas.width !== width || this.staticCanvas.height !== height) {
      this.staticCanvas.width = width;
      this.staticCanvas.height = height;
      this.staticCacheKey = '';
    }
    configurePixelCanvas(this.staticCtx);
    return this.staticCtx;
  }

  private drawStaticMountain(
    ctx: CanvasRenderingContext2D,
    originX: number,
    baseY: number,
    visibleRows: number,
    intensity: number
  ): void {
    const cacheWidth = MOUNTAIN_BLOCKS_W * PIXEL;
    const cacheHeight = visibleRows * PIXEL;
    const key = this.buildStaticCacheKey(visibleRows, intensity);

    if (key !== this.staticCacheKey) {
      const scratch = this.ensureStaticCanvas(cacheWidth, cacheHeight);
      scratch.clearRect(0, 0, cacheWidth, cacheHeight);
      this.drawLayer(scratch, MOUNTAIN_BASE_LAYER, 0, 0, visibleRows, intensity);

      for (const layerIndex of this.leftRangeOrder) {
        this.drawLayer(
          scratch,
          MOUNTAIN_LEFT_RANGE_LAYERS[layerIndex],
          0,
          0,
          visibleRows,
          intensity
        );
      }

      for (const layerIndex of this.surroundBackOrder) {
        this.drawLayer(
          scratch,
          MOUNTAIN_SURROUND_BACK_LAYERS[layerIndex],
          0,
          0,
          visibleRows,
          intensity
        );
      }

      for (const layerIndex of this.mainOrder) {
        this.drawLayer(scratch, MOUNTAIN_MAIN_LAYERS[layerIndex], 0, 0, visibleRows, intensity);
      }

      for (const layerIndex of this.surroundFrontOrder) {
        this.drawLayer(
          scratch,
          MOUNTAIN_SURROUND_FRONT_LAYERS[layerIndex],
          0,
          0,
          visibleRows,
          intensity
        );
      }

      this.staticCacheKey = key;
    }

    ctx.drawImage(this.staticCanvas!, originX, baseY, cacheWidth, cacheHeight);
  }

  private snowCapRows(columnHeight: number, strength: number): number {
    if (columnHeight < MIN_PEAK_HEIGHT_FOR_SNOW) {
      return 0;
    }
    const depth = Math.min(4, Math.max(1, Math.round(columnHeight * 0.16 + 1)));
    return Math.max(1, Math.round(depth * (0.45 + strength * 0.55)));
  }

  private snowColor(strength: number): string {
    const t = Math.max(0, Math.min(1, strength));
    const r = Math.round(90 + t * 112);
    const g = Math.round(92 + t * 112);
    const b = Math.round(94 + t * 112);
    return `rgb(${r},${g},${b})`;
  }

  private getSnowCapCells(visibleRows: number, strength: number): Array<{ x: number; row: number }> {
    const key = `${visibleRows}|${Math.round(strength * 100)}`;
    if (key === this.snowCapCacheKey) {
      return this.snowCapCells;
    }

    const cells: Array<{ x: number; row: number }> = [];
    const seen = new Set<string>();

    for (let x = 0; x < MOUNTAIN_BLOCKS_W; x++) {
      const topRow = MOUNTAIN_TOP_ROW_BY_COLUMN[x];
      if (topRow >= MOUNTAIN_BLOCKS_H) {
        continue;
      }

      const columnHeight = MOUNTAIN_BLOCKS_H - topRow;
      if (columnHeight < MIN_PEAK_HEIGHT_FOR_SNOW) {
        continue;
      }

      const snowRows = this.snowCapRows(columnHeight, strength);
      for (let row = topRow; row < topRow + snowRows; row++) {
        if (row >= visibleRows || !this.isSilhouetteCell(x, row)) {
          continue;
        }
        const cellKey = `${x},${row}`;
        if (!seen.has(cellKey)) {
          seen.add(cellKey);
          cells.push({ x, row });
        }
      }

      for (let row = topRow; row < topRow + snowRows + 1; row++) {
        if (row < 0 || row >= visibleRows) {
          continue;
        }
        if (this.isExposedSurfaceCell(x, row)) {
          const cellKey = `${x},${row}`;
          if (!seen.has(cellKey)) {
            seen.add(cellKey);
            cells.push({ x, row });
          }
        }
      }
    }

    this.snowCapCacheKey = key;
    this.snowCapCells = cells;
    return cells;
  }

  private drawSnowCaps(
    ctx: CanvasRenderingContext2D,
    originX: number,
    baseY: number,
    visibleRows: number,
    strength: number
  ): void {
    if (strength <= 0.001) {
      return;
    }

    const color = this.snowColor(strength);
    for (const cell of this.getSnowCapCells(visibleRows, strength)) {
      fillBlock(ctx, originX + cell.x * PIXEL, baseY + cell.row * PIXEL, 1, 1, color, 1);
    }
  }

  private isSilhouetteCell(x: number, row: number): boolean {
    const rowFromBase = MOUNTAIN_BLOCKS_H - 1 - row;
    return MOUNTAIN_SILHOUETTE_HEIGHTS[x] > rowFromBase;
  }

  private isExposedSurfaceCell(x: number, row: number): boolean {
    if (!this.isSilhouetteCell(x, row)) {
      return false;
    }
    if (row === 0) {
      return true;
    }
    return !this.isSilhouetteCell(x, row - 1);
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D,
    layer:
      | (typeof MOUNTAIN_MAIN_LAYERS)[number]
      | (typeof MOUNTAIN_LEFT_RANGE_LAYERS)[number]
      | (typeof MOUNTAIN_SURROUND_BACK_LAYERS)[number]
      | (typeof MOUNTAIN_SURROUND_FRONT_LAYERS)[number]
      | typeof MOUNTAIN_BASE_LAYER,
    originX: number,
    originY: number,
    visibleRows: number,
    intensity: number
  ): void {
    for (const cell of layer.cells) {
      if (cell.row >= visibleRows) {
        continue;
      }
      const y = snap(originY + cell.row * PIXEL);
      const color = cell.kind === 'ridge' ? layer.ridge : layer.fill;
      fillBlock(ctx, originX + cell.x * PIXEL, y, 1, 1, color, MOUNTAIN_ALPHAS[cell.kind] * intensity);
    }
  }
}
