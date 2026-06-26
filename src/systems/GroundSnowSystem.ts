import { DayPhase, DEFAULT_SETTINGS, WeatherSettings, WeatherState, WindState } from '../shared/types';
import { fillBlock, PIXEL, snap } from '../renderer/pixelArt';
import { WeatherSystem } from './WeatherSystem';

const SNOW_DELAY_SEC = 10;
const SNOW_LERP_SEC = 16;

interface SnowCell {
  x: number;
  y: number;
}

export class GroundSnowSystem implements WeatherSystem {
  private width = 0;
  private height = 0;
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private snowTarget = 0;
  private snowStrength = 0;
  private depthTarget = 0;
  private depthBlocks = 0;
  private snowChangeDelay = 0;
  private snowHoldActive = false;
  private weatherInitialized = false;
  private cachedCells: SnowCell[] = [];
  private cacheWidth = 0;
  private cacheHeight = 0;
  private cacheMaxDepth = -1;

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.invalidateDrawCache();
  }

  onWeatherChange(_state: WeatherState): void {
    if (!this.weatherInitialized) {
      this.weatherInitialized = true;
      return;
    }
    this.snowHoldActive = true;
    this.snowChangeDelay = SNOW_DELAY_SEC;
  }

  onWindChange(_wind: WindState): void {}

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  setSnowTarget(strength: number): void {
    this.snowTarget = Math.max(0, Math.min(1, strength));
  }

  setDepthTarget(blocks: number): void {
    const next = Math.max(0, Math.min(3, Math.round(blocks)));
    if (next !== this.depthTarget) {
      this.depthTarget = next;
      this.invalidateDrawCache();
    }
  }

  update(dt: number, _time: number): void {
    if (this.snowHoldActive) {
      this.snowChangeDelay -= dt;
      if (this.snowChangeDelay <= 0) {
        this.snowHoldActive = false;
      }
      return;
    }

    const step = Math.min(1, (dt / SNOW_LERP_SEC) * 2.5);

    const strengthDiff = this.snowTarget - this.snowStrength;
    if (Math.abs(strengthDiff) <= 0.001) {
      this.snowStrength = this.snowTarget;
    } else {
      this.snowStrength += strengthDiff * step;
    }

    const depthDiff = this.depthTarget - this.depthBlocks;
    if (Math.abs(depthDiff) <= 0.001) {
      this.depthBlocks = this.depthTarget;
    } else {
      const previousDepth = Math.round(this.depthBlocks);
      this.depthBlocks += depthDiff * step;
      if (Math.round(this.depthBlocks) !== previousDepth) {
        this.invalidateDrawCache();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.settings.enabled) {
      return;
    }

    const w = width || this.width;
    const h = height || this.height;
    if (w <= 0 || h <= 0) {
      return;
    }

    const strength = Math.min(1, this.settings.intensity * this.snowStrength);
    if (strength <= 0.001) {
      return;
    }

    const maxDepth = Math.round(this.depthBlocks);
    if (maxDepth <= 0) {
      return;
    }

    this.ensureDrawCache(w, h, maxDepth);
    const color = this.snowColor(strength);
    for (const cell of this.cachedCells) {
      fillBlock(ctx, cell.x, cell.y, 1, 1, color, 1);
    }
  }

  private invalidateDrawCache(): void {
    this.cacheMaxDepth = -1;
    this.cachedCells = [];
  }

  private ensureDrawCache(w: number, h: number, maxDepth: number): void {
    if (w === this.cacheWidth && h === this.cacheHeight && maxDepth === this.cacheMaxDepth) {
      return;
    }

    const baseDepth = Math.max(0, maxDepth - 1);
    const peakThreshold = this.peakThresholdFor(maxDepth);
    const blocksW = Math.ceil(w / PIXEL);
    const cells: SnowCell[] = [];

    for (let bx = 0; bx < blocksW; bx++) {
      const hasPeak = this.columnWobble(bx) > peakThreshold;
      const depth = baseDepth + (hasPeak ? 1 : 0);
      if (depth <= 0) {
        continue;
      }
      const x = snap(bx * PIXEL);
      for (let row = 0; row < depth; row++) {
        cells.push({ x, y: snap(h - (row + 1) * PIXEL) });
      }
    }

    this.cachedCells = cells;
    this.cacheWidth = w;
    this.cacheHeight = h;
    this.cacheMaxDepth = maxDepth;
  }

  /** Uniform fill below the wavy crest; sunny has no base (only scattered drifts). */
  private peakThresholdFor(maxDepth: number): number {
    switch (maxDepth) {
      case 1:
        return 0.42;
      case 2:
        return 0.15;
      default:
        return 0.02;
    }
  }

  private columnWobble(bx: number): number {
    return (
      Math.sin(bx * 0.41) * 0.55 +
      Math.sin(bx * 0.17 + 1.3) * 0.35 +
      Math.sin(bx * 0.08 + 2.1) * 0.25
    );
  }

  private snowColor(strength: number): string {
    const t = Math.max(0, Math.min(1, strength));
    const r = Math.round(90 + t * 112);
    const g = Math.round(92 + t * 112);
    const b = Math.round(94 + t * 112);
    return `rgb(${r},${g},${b})`;
  }
}
