import { DayPhase, DEFAULT_SETTINGS, DevOverrides, WeatherSettings, WeatherState, WindState, randomRange } from '../shared/types';
import { fillBlock, PIXEL, snap } from '../renderer/pixelArt';
import { CloudSnapshot, pickRandomCloud } from './cloudTypes';
import { WeatherSystem } from './WeatherSystem';

interface RainDrop {
  x: number;
  y: number;
  velocity: number;
  length: number;
}

interface Splash {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  spread: number;
}

const MAX_DROPS = 300;
const MAX_SPLASHES = 100;
const SPLASH_MARGIN = 2;

export class RainSystem implements WeatherSystem {
  private drops: RainDrop[] = [];
  private splashes: Splash[] = [];
  private clouds: CloudSnapshot[] = [];
  private width = 0;
  private height = 0;
  private weather: WeatherState = 'sunny';
  private wind: WindState = { strength: 0.5, direction: 1 };
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private devOverrides: DevOverrides = {};
  private pool: RainDrop[] = [];
  private effectStrength = 0;
  private dropAdjustTimer = 0;
  private fullDropCount = 0;

  setCloudSources(clouds: CloudSnapshot[]): void {
    this.clouds = clouds;
  }

  setDevOverrides(overrides: DevOverrides): void {
    this.devOverrides = { ...this.devOverrides, ...overrides };
    this.refreshFullDropCount();
    this.syncDropCount();
  }

  setEffectStrength(strength: number): void {
    this.effectStrength = Math.max(0, Math.min(1, strength));
    if (this.effectStrength <= 0.001) {
      this.drops = [];
      this.splashes = [];
    }
  }

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.refreshFullDropCount();
    this.syncDropCount();
  }

  onWeatherChange(state: WeatherState): void {
    this.weather = state;
    this.refreshFullDropCount();
  }

  onWindChange(wind: WindState): void {
    this.wind = wind;
  }

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
    this.refreshFullDropCount();
    this.syncDropCount();
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  /** Bottom edge of the weather panel — where rain meets the editor below. */
  private getSplashY(): number {
    return snap(Math.max(PIXEL * 2, this.height - SPLASH_MARGIN));
  }

  update(dt: number, _time: number): void {
    if (!this.settings.enabled || this.height <= 0 || this.effectStrength <= 0.001) {
      return;
    }

    this.dropAdjustTimer += dt;
    if (this.dropAdjustTimer >= 0.35) {
      this.dropAdjustTimer = 0;
      this.syncDropCount();
    }

    const windDrift = this.wind.strength * 50 * this.wind.direction;
    const splashY = this.getSplashY();

    for (const drop of this.drops) {
      drop.y += drop.velocity * dt;
      drop.x += windDrift * dt;

      if (drop.y >= splashY) {
        this.spawnSplash(drop.x, splashY);
        this.resetDrop(drop);
      }
      if (drop.x < -30) {
        drop.x = this.width + 30;
      }
      if (drop.x > this.width + 30) {
        drop.x = -30;
      }
    }

    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const splash = this.splashes[i];
      splash.life -= dt;
      splash.spread += dt * 50;
      if (splash.life <= 0) {
        this.splashes.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    if (!this.settings.enabled || this.effectStrength <= 0.001) {
      return;
    }

    const intensity = Math.min(1, this.settings.intensity);
    const dropColor = this.weather === 'thunderstorm' ? '#8ca8d0' : '#9cb8e0';
    const dropAlpha = 0.75 * intensity * this.effectStrength;
    ctx.fillStyle = dropColor;

    for (const drop of this.drops) {
      if (!this.isDropVisible(drop)) {
        continue;
      }
      const blocksH = Math.max(2, Math.round(drop.length / PIXEL));
      const headX = snap(drop.x);
      const headY = snap(drop.y - blocksH * PIXEL);
      if (dropAlpha === 1) {
        ctx.fillRect(headX, headY, PIXEL, blocksH * PIXEL);
      } else {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * dropAlpha;
        ctx.fillRect(headX, headY, PIXEL, blocksH * PIXEL);
        ctx.globalAlpha = prev;
      }
    }

    for (const splash of this.splashes) {
      const t = splash.life / splash.maxLife;
      const alpha = t * 0.65 * intensity * this.effectStrength;
      const spreadBlocks = Math.max(1, Math.round(splash.spread / PIXEL));
      const sx = snap(splash.x);
      const sy = snap(splash.y);

      for (let i = -spreadBlocks; i <= spreadBlocks; i++) {
        if (i === 0) {
          fillBlock(ctx, sx - PIXEL, sy - PIXEL, 3, 1, '#b8d4f0', alpha);
        } else {
          fillBlock(ctx, sx + i * PIXEL - PIXEL / 2, sy - PIXEL, 1, 1, '#a8c8e8', alpha * 0.8);
        }
      }
    }
  }

  /** Hide streaks still passing through a cloud's horizontal span */
  private isDropVisible(drop: RainDrop): boolean {
    const top = drop.y - drop.length;
    if (this.clouds.length === 0) {
      return true;
    }
    for (const cloud of this.clouds) {
      if (top >= cloud.bottom) {
        continue;
      }
      if (drop.x >= cloud.x && drop.x <= cloud.x + cloud.width && top < cloud.bottom) {
        return false;
      }
    }
    return true;
  }

  private spawnSplash(x: number, y: number): void {
    if (this.splashes.length >= MAX_SPLASHES) {
      this.splashes.shift();
    }
    this.splashes.push({
      x: x + randomRange(-4, 4),
      y,
      life: randomRange(0.1, 0.22),
      maxLife: 0.22,
      spread: randomRange(3, 8),
    });
  }

  private isActive(): boolean {
    return (
      (this.weather === 'rain' || this.weather === 'thunderstorm') && this.effectStrength > 0.001
    );
  }

  private getTargetDropCount(): number {
    return Math.floor(this.fullDropCount * this.effectStrength);
  }

  private refreshFullDropCount(): void {
    const density = this.devOverrides.rainDensity ?? 1;
    this.fullDropCount = Math.min(
      MAX_DROPS,
      Math.floor(randomRange(50, 150) * this.settings.intensity * density)
    );
  }

  private syncDropCount(): void {
    if (this.effectStrength <= 0.001 || this.width <= 0) {
      this.drops = [];
      this.splashes = [];
      return;
    }

    const target = this.getTargetDropCount();
    while (this.drops.length < target) {
      const drop = this.acquireDrop();
      drop.y = randomRange(-this.height, this.getSplashY());
      this.drops.push(drop);
    }
    while (this.drops.length > target) {
      const drop = this.drops.pop();
      if (drop) {
        this.pool.push(drop);
      }
    }
  }

  private initDrops(): void {
    this.syncDropCount();
  }

  private acquireDrop(): RainDrop {
    const drop = this.pool.pop() ?? { x: 0, y: 0, velocity: 0, length: 0 };
    this.resetDrop(drop);
    return drop;
  }

  private resetDrop(drop: RainDrop): void {
    drop.velocity = randomRange(240, 450);
    drop.length = PIXEL * randomRange(2, 5);

    const cloud = pickRandomCloud(this.clouds);
    if (cloud && Math.random() < 0.3) {
      drop.x = randomRange(cloud.x + PIXEL, cloud.x + cloud.width - PIXEL);
      drop.y = cloud.bottom + randomRange(0, PIXEL);
      return;
    }

    drop.x = randomRange(0, this.width);
    drop.y = randomRange(-this.height * 0.6, -8);
  }
}
