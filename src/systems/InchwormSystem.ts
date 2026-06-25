import {
  DayPhase,
  DEFAULT_SETTINGS,
  WeatherSettings,
  WeatherState,
  WindState,
  randomRange,
} from '../shared/types';
import { fillBlock, PIXEL, snap } from '../renderer/pixelArt';
import { WeatherSystem } from './WeatherSystem';

type CrawlState = 'extend' | 'contract';

interface Inchworm {
  headX: number;
  tailX: number;
  y: number;
  direction: number;
  crawlState: CrawlState;
}

interface Heart {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  driftX: number;
}

const HEAD = '#68c840';
const BODY = '#4a9e28';
const BODY_DARK = '#3a8020';
const ANTENNA = '#2d6018';
const LEG = '#2d6018';
const HEART = '#b83848';
const SEGMENTS = 5;
const MIN_LEN = PIXEL * 2;
const MAX_LEN = PIXEL * 6;
const CRAWL_SPEED = 26;
const GROUND_LIFT = PIXEL * 2;
const HEART_DURATION = 1.15;
const MAX_HEARTS = 6;

export class InchwormSystem implements WeatherSystem {
  private worm: Inchworm | null = null;
  private hearts: Heart[] = [];
  private width = 0;
  private height = 0;
  private weather: WeatherState = 'sunny';
  private dayPhase: DayPhase = 'day';
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private spawnTimer = 0;
  private nextSpawn = 0;

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.scheduleSpawn();
  }

  onWeatherChange(state: WeatherState): void {
    this.weather = state;
  }

  onWindChange(_wind: WindState): void {}

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
  }

  onDayPhaseChange(phase: DayPhase): void {
    this.dayPhase = phase;
  }

  triggerInchworm(direction?: number): void {
    if (!this.settings.enabled || this.width <= 0) {
      return;
    }
    this.spawnInchworm(direction);
    this.spawnTimer = 0;
    this.scheduleSpawn();
  }

  /** Returns true if the click hit the inchworm and a heart was spawned. */
  tryClick(x: number, y: number): boolean {
    if (!this.settings.enabled || !this.worm || !this.hitTest(x, y)) {
      return false;
    }
    this.spawnHeart();
    return true;
  }

  update(dt: number, _time: number): void {
    if (!this.settings.enabled) {
      return;
    }

    this.updateHearts(dt);

    if (!this.worm) {
      if (!this.canAutoSpawn()) {
        return;
      }
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.nextSpawn) {
        this.spawnInchworm();
        this.spawnTimer = 0;
        this.scheduleSpawn();
      }
      return;
    }

    const worm = this.worm;
    const dir = worm.direction >= 0 ? 1 : -1;
    const step = CRAWL_SPEED * dt;

    if (worm.crawlState === 'extend') {
      worm.headX += dir * step;
      if (Math.abs(worm.headX - worm.tailX) >= MAX_LEN) {
        worm.crawlState = 'contract';
      }
    } else {
      worm.tailX += dir * step;
      if (Math.abs(worm.headX - worm.tailX) <= MIN_LEN) {
        worm.crawlState = 'extend';
      }
    }

    const offscreen =
      dir > 0 ? worm.headX > this.width + MAX_LEN : worm.headX < -MAX_LEN;
    if (offscreen) {
      this.worm = null;
    }
  }

  draw(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    if (!this.settings.enabled) {
      return;
    }

    if (this.worm) {
      const intensity = Math.min(1, this.settings.intensity);
      this.drawInchworm(ctx, this.worm, 0.92 * intensity);
    }

    for (const heart of this.hearts) {
      this.drawHeart(ctx, heart);
    }
  }

  private updateHearts(dt: number): void {
    for (const heart of this.hearts) {
      heart.life -= dt;
      heart.y -= 32 * dt;
      heart.x += heart.driftX * dt;
    }
    this.hearts = this.hearts.filter((h) => h.life > 0);
  }

  private spawnHeart(): void {
    if (!this.worm) {
      return;
    }
    if (this.hearts.length >= MAX_HEARTS) {
      this.hearts.shift();
    }
    const cx = (this.worm.headX + this.worm.tailX) / 2;
    this.hearts.push({
      x: cx,
      y: this.worm.y - PIXEL * 3,
      life: HEART_DURATION,
      maxLife: HEART_DURATION,
      driftX: randomRange(-6, 6),
    });
  }

  private hitTest(x: number, y: number): boolean {
    if (!this.worm) {
      return false;
    }

    const minX = Math.min(this.worm.headX, this.worm.tailX) - PIXEL * 2;
    const maxX = Math.max(this.worm.headX, this.worm.tailX) + PIXEL * 2;
    const minY = this.worm.y - PIXEL * 2;
    const maxY = this.worm.y + PIXEL * 2;

    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }

  private getGroundY(): number {
    return snap(Math.max(PIXEL * 3, this.height - GROUND_LIFT));
  }

  private drawInchworm(ctx: CanvasRenderingContext2D, worm: Inchworm, alpha: number): void {
    const dir = worm.direction >= 0 ? 1 : -1;
    const lead = dir > 0 ? Math.max(worm.headX, worm.tailX) : Math.min(worm.headX, worm.tailX);
    const trail = dir > 0 ? Math.min(worm.headX, worm.tailX) : Math.max(worm.headX, worm.tailX);
    const y = worm.y;

    for (let i = 0; i < SEGMENTS; i++) {
      const t = SEGMENTS === 1 ? 0 : i / (SEGMENTS - 1);
      const segX = snap(trail + (lead - trail) * t);
      const isHead = i === SEGMENTS - 1;
      const color = isHead ? HEAD : i % 2 === 0 ? BODY : BODY_DARK;
      fillBlock(ctx, segX, y, 1, 1, color, alpha);

      if (isHead) {
        fillBlock(ctx, segX, y - PIXEL, 1, 1, ANTENNA, alpha * 0.85);
        fillBlock(ctx, segX + dir * PIXEL, y, 1, 1, HEAD, alpha * 0.9);
      }

      if (!isHead && i % 2 === 1) {
        fillBlock(ctx, segX, y + PIXEL, 1, 1, LEG, alpha * 0.7);
      }
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, heart: Heart): void {
    const t = 1 - heart.life / heart.maxLife;
    const alpha = 1 - t;
    const cx = snap(heart.x);
    const cy = snap(heart.y);

    fillBlock(ctx, cx - PIXEL, cy, 1, 1, HEART, alpha);
    fillBlock(ctx, cx + PIXEL, cy, 1, 1, HEART, alpha);
    fillBlock(ctx, cx - PIXEL, cy + PIXEL, 1, 1, HEART, alpha);
    fillBlock(ctx, cx, cy + PIXEL, 1, 1, HEART, alpha);
    fillBlock(ctx, cx + PIXEL, cy + PIXEL, 1, 1, HEART, alpha);
    fillBlock(ctx, cx, cy + PIXEL * 2, 1, 1, HEART, alpha);
  }

  private canAutoSpawn(): boolean {
    return this.weather === 'sunny' && this.dayPhase === 'day';
  }

  private scheduleSpawn(): void {
    this.nextSpawn = randomRange(360, 720);
  }

  private spawnInchworm(forcedDirection?: number): void {
    const direction = forcedDirection ?? (Math.random() < 0.5 ? 1 : -1);
    const y = this.getGroundY();
    const headX = direction > 0 ? -MAX_LEN : this.width + MAX_LEN;

    this.worm = {
      headX,
      tailX: headX - direction * MIN_LEN,
      y,
      direction,
      crawlState: 'extend',
    };
  }
}
