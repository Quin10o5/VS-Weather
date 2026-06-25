import {
  DayPhase,
  DEFAULT_SETTINGS,
  WeatherSettings,
  WeatherState,
  WindState,
  randomRange,
} from '../shared/types';
import {
  PIXEL,
  fillBlock,
  getScratchCanvas,
  getScratchContext,
  snap,
} from '../renderer/pixelArt';
import { WeatherSystem } from './WeatherSystem';

const RAINBOW_BANDS = ['#e87858', '#e8c050', '#68c868', '#88b8e8'];

const RAINBOW_DURATION_SEC = 18;
const RAINBOW_MAX_ALPHA = 0.65;
const RAIN_GONE_THRESHOLD = 0.02;
const SCHEDULE_CHANCE = 0.5;
const DELAY_MIN_SEC = 1;
const DELAY_MAX_SEC = 5;

type RainbowPhase = 'idle' | 'waiting_rain_clear' | 'waiting_delay' | 'active';

export class RainbowSystem implements WeatherSystem {
  private width = 0;
  private height = 0;
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private active = false;
  private progress = 0;
  private phase: RainbowPhase = 'idle';
  private rainPresence = 0;
  private delayTimer = 0;
  private delayTarget = 0;

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setRainPresence(strength: number): void {
    this.rainPresence = Math.max(0, strength);
  }

  onWeatherChange(state: WeatherState): void {
    if (state !== 'sunny' && this.phase !== 'active') {
      this.cancelSchedule();
    }
  }

  onWindChange(_wind: WindState): void {}

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  scheduleRainbow(): void {
    if (!this.settings.enabled || this.width <= 0 || this.height <= 0) {
      return;
    }
    this.cancelSchedule();
    if (Math.random() >= SCHEDULE_CHANCE) {
      return;
    }
    this.phase = 'waiting_rain_clear';
    this.delayTimer = 0;
    this.delayTarget = randomRange(DELAY_MIN_SEC, DELAY_MAX_SEC);
  }

  triggerRainbow(): void {
    if (!this.settings.enabled || this.width <= 0 || this.height <= 0) {
      return;
    }
    this.phase = 'idle';
    this.delayTimer = 0;
    this.active = false;
    this.progress = 0;
    this.beginRainbow();
  }

  cancelSchedule(): void {
    if (this.phase === 'active') {
      return;
    }
    this.phase = 'idle';
    this.delayTimer = 0;
    this.active = false;
    this.progress = 0;
  }

  dismiss(): void {
    this.phase = 'idle';
    this.delayTimer = 0;
    this.active = false;
    this.progress = 0;
  }

  update(dt: number, _time: number): void {
    if (!this.settings.enabled) {
      return;
    }

    if (this.phase === 'waiting_rain_clear') {
      if (this.rainPresence <= RAIN_GONE_THRESHOLD) {
        this.phase = 'waiting_delay';
        this.delayTimer = 0;
      }
      return;
    }

    if (this.phase === 'waiting_delay') {
      this.delayTimer += dt;
      if (this.delayTimer >= this.delayTarget) {
        this.beginRainbow();
      }
      return;
    }

    if (!this.active) {
      return;
    }

    this.progress += dt / RAINBOW_DURATION_SEC;
    if (this.progress >= 1) {
      this.active = false;
      this.phase = 'idle';
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.active || !this.settings.enabled) {
      return;
    }

    const w = width || this.width;
    const h = height || this.height;
    if (w <= 0 || h <= 0) {
      return;
    }

    const intensity = Math.min(1, this.settings.intensity);
    const alpha = this.getOpacity(this.progress) * intensity * RAINBOW_MAX_ALPHA;
    if (alpha <= 0.01) {
      return;
    }

    const yTop = PIXEL;
    const yBottom = h - PIXEL;
    const spanY = Math.max(PIXEL, yBottom - yTop);
    const xStart = w * 0.07;
    const xAsymptote = w * 0.5;
    const falloff = Math.max(PIXEL * 8, Math.min(h * 0.38, w * 0.35));

    const cells = this.collectRainbowCells(yTop, spanY, xStart, xAsymptote, falloff);
    if (cells.size === 0) {
      return;
    }

    const scratch = getScratchContext(w, h);
    for (const [key, color] of cells) {
      const comma = key.indexOf(',');
      const gx = Number(key.slice(0, comma));
      const gy = Number(key.slice(comma + 1));
      fillBlock(scratch, gx * PIXEL, gy * PIXEL, 1, 1, color, 1);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(getScratchCanvas(), 0, 0, w, h, 0, 0, w, h);
    ctx.restore();
  }

  private collectRainbowCells(
    yTop: number,
    spanY: number,
    xStart: number,
    xAsymptote: number,
    falloff: number
  ): Map<string, string> {
    const cells = new Map<string, string>();
    const rowSteps = Math.ceil(spanY / PIXEL);
    let prevGx: number | undefined;
    let prevGy: number | undefined;

    for (let i = 0; i <= rowSteps; i++) {
      const y = yTop + (i / rowSteps) * spanY;
      const x = this.curveX(y, yTop, xStart, xAsymptote, falloff);
      const gx = Math.floor(snap(x) / PIXEL);
      const gy = Math.floor(snap(y) / PIXEL);

      if (prevGx !== undefined && prevGy !== undefined) {
        this.plotGridLine(cells, prevGx, prevGy, gx, gy);
      } else {
        this.plotGridPoint(cells, gx, gy);
      }

      prevGx = gx;
      prevGy = gy;
    }

    return cells;
  }

  private plotGridPoint(cells: Map<string, string>, gx: number, gy: number): void {
    for (let band = 0; band < RAINBOW_BANDS.length; band++) {
      const key = `${gx + band},${gy}`;
      if (!cells.has(key)) {
        cells.set(key, RAINBOW_BANDS[band]);
      }
    }
  }

  private plotGridLine(
    cells: Map<string, string>,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): void {
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.plotGridPoint(cells, x, y);
      if (x === x1 && y === y1) {
        break;
      }
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private beginRainbow(): void {
    if (!this.settings.enabled || this.width <= 0 || this.height <= 0) {
      this.phase = 'idle';
      return;
    }
    this.phase = 'active';
    this.active = true;
    this.progress = 0;
  }

  private curveX(
    y: number,
    yTop: number,
    xStart: number,
    xAsymptote: number,
    falloff: number
  ): number {
    const t = Math.max(0, y - yTop) / falloff;
    return xStart + (xAsymptote - xStart) * (1 - Math.exp(-t));
  }

  private getOpacity(progress: number): number {
    if (progress < 0.12) {
      return progress / 0.12;
    }
    if (progress < 0.72) {
      return 1;
    }
    return 1 - (progress - 0.72) / 0.28;
  }
}
