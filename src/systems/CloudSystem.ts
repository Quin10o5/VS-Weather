import { DayPhase, DEFAULT_SETTINGS, DevOverrides, WeatherSettings, WeatherState, WindState, randomInt, randomRange } from '../shared/types';
import {
  configurePixelCanvas,
  getScratchCanvas,
  getScratchContext,
  PIXEL,
  snap,
  snapDrawCoord,
  snapDrawSize,
} from '../renderer/pixelArt';
import { CloudSnapshot } from './cloudTypes';
import { WeatherSystem } from './WeatherSystem';

interface Cloud {
  x: number;
  y: number;
  speed: number;
  scale: number;
  stretchX: number;
  /** Vertical row height steps (× half-pixel row); 2 = 4px rows (matches bird wings). */
  stretchY: number;
  opacity: number;
  spriteIndex: number;
}

const CLOUD_WEATHER: WeatherState[] = ['sunny', 'cloudy', 'rain', 'thunderstorm', 'snow'];

/** Wider pixel-art cloud patterns (1 = filled block) */
const CLOUD_PATTERNS: number[][][] = [
  [
    [0, 0, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 0, 0, 0],
  ],
  [
    [0, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 0],
  ],
  [
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 1, 1, 0],
  ],
  [
    [0, 0, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 0, 0],
  ],
];

export class CloudSystem implements WeatherSystem {
  private clouds: Cloud[] = [];
  private snapshots: CloudSnapshot[] = [];
  private width = 0;
  private height = 0;
  private weather: WeatherState = 'sunny';
  private wind: WindState = { strength: 0.5, direction: 1 };
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private devOverrides: DevOverrides = {};
  private effectStrength = 1;
  private cloudAdjustTimer = 0;
  private baseCloudCount = 4;

  getSnapshots(): CloudSnapshot[] {
    return this.snapshots;
  }

  setDevOverrides(overrides: DevOverrides): void {
    this.devOverrides = { ...this.devOverrides, ...overrides };
    this.refreshBaseCloudCount();
    this.syncCloudCount(true);
  }

  setEffectStrength(strength: number): void {
    this.effectStrength = Math.max(0, Math.min(1, strength));
  }

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.refreshBaseCloudCount();
    this.respawnClouds();
  }

  onWeatherChange(state: WeatherState): void {
    this.weather = state;
    this.refreshBaseCloudCount();
    if (!CLOUD_WEATHER.includes(state)) {
      this.clouds = [];
      this.snapshots = [];
    }
  }

  onWindChange(wind: WindState): void {
    this.wind = wind;
  }

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
    this.refreshBaseCloudCount();
    this.syncCloudCount(true);
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  update(dt: number, _time: number): void {
    if (!this.settings.enabled || this.effectStrength <= 0.001 || !this.isActive()) {
      this.snapshots = [];
      return;
    }

    this.cloudAdjustTimer += dt;
    if (this.cloudAdjustTimer >= 1.2) {
      this.cloudAdjustTimer = 0;
      this.syncCloudCount(false);
    }

    const windMul = 0.5 + this.wind.strength;
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * this.wind.direction * windMul * dt;
      const dims = this.getCloudDimensions(cloud);
      if (cloud.x > this.width + dims.width) {
        this.respawnCloud(cloud, true);
      }
    }
    this.rebuildSnapshots();
  }

  draw(ctx: CanvasRenderingContext2D, _width: number, height: number): void {
    if (!this.settings.enabled || this.effectStrength <= 0.001 || !this.isActive()) {
      return;
    }
    const maxY = height * 0.65;
    for (const cloud of this.clouds) {
      if (cloud.y <= maxY) {
        this.drawCloud(ctx, cloud);
      }
    }
  }

  private isActive(): boolean {
    return CLOUD_WEATHER.includes(this.weather);
  }

  private getTargetCloudCount(): number {
    return Math.max(1, Math.floor(this.baseCloudCount * this.effectStrength));
  }

  private refreshBaseCloudCount(): void {
    const intensity = Math.max(0.1, this.settings.intensity);
    const overrideCount = this.devOverrides.cloudCount;
    this.baseCloudCount =
      overrideCount ?? randomInt(2, Math.min(16, Math.floor(6 + intensity * 10)));
    if (overrideCount != null) {
      this.baseCloudCount = Math.max(1, overrideCount);
    }
  }

  private syncCloudCount(immediate: boolean): void {
    if (!this.isActive() || this.width <= 0) {
      return;
    }

    const target = this.getTargetCloudCount();
    if (this.clouds.length === 0) {
      this.respawnClouds();
      return;
    }

    if (immediate) {
      while (this.clouds.length < target) {
        this.addCloud();
      }
      while (this.clouds.length > target) {
        this.clouds.pop();
      }
      this.rebuildSnapshots();
      return;
    }

    if (this.clouds.length < target) {
      this.addCloud();
    } else if (this.clouds.length > target) {
      this.clouds.pop();
      this.rebuildSnapshots();
    }
  }

  private addCloud(): void {
    const cloud: Cloud = {
      x: 0, y: 0, speed: 0, scale: 1, stretchX: 2, stretchY: 2, opacity: 1, spriteIndex: 0,
    };
    this.respawnCloud(cloud, false);
    cloud.x = randomRange(0, this.width);
    this.clouds.push(cloud);
    this.rebuildSnapshots();
  }

  private getCloudDimensions(cloud: Cloud): { width: number; height: number } {
    const pattern = CLOUD_PATTERNS[cloud.spriteIndex % CLOUD_PATTERNS.length];
    const blockScale = Math.max(1, Math.round(cloud.scale));
    const cols = Math.max(...pattern.map((row) => row.length));
    const rows = pattern.length;
    const cellH = this.getCellHeight(blockScale, cloud.stretchY);
    return {
      width: cols * PIXEL * blockScale * cloud.stretchX,
      height: rows * cellH,
    };
  }

  /** Row height in half-pixel units; × (PIXEL/2). 2 → 4px (bird wing size), 3 → 6px puffier. */
  private getCellHeight(blockScale: number, stretchY: number): number {
    return (PIXEL / 2) * blockScale * Math.max(2, stretchY);
  }

  private getCellWidth(blockScale: number, stretchX: number): number {
    return PIXEL * blockScale * stretchX;
  }

  private rebuildSnapshots(): void {
    while (this.snapshots.length < this.clouds.length) {
      this.snapshots.push({ x: 0, y: 0, width: 0, height: 0, bottom: 0, centerX: 0 });
    }
    this.snapshots.length = this.clouds.length;

    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      const dims = this.getCloudDimensions(cloud);
      const x = snap(cloud.x);
      const y = snap(cloud.y);
      const snapObj = this.snapshots[i];
      snapObj.x = x;
      snapObj.y = y;
      snapObj.width = dims.width;
      snapObj.height = dims.height;
      snapObj.bottom = y + dims.height;
      snapObj.centerX = x + dims.width / 2;
    }
  }

  private respawnClouds(): void {
    const target = this.getTargetCloudCount();
    this.clouds = [];
    for (let i = 0; i < target; i++) {
      this.addCloud();
    }
  }

  private respawnCloud(cloud: Cloud, fromLeft: boolean): void {
    cloud.x = fromLeft ? -160 : randomRange(0, this.width);
    cloud.y = randomRange(this.height * 0.02, this.height * 0.45);
    cloud.speed = randomRange(5, 15);
    cloud.scale = 1;
    cloud.stretchX = randomInt(2, 3);
    cloud.stretchY = Math.random() < 0.3 ? 3 : 2;
    cloud.opacity = randomRange(0.5, 0.9);
    cloud.spriteIndex = randomInt(0, CLOUD_PATTERNS.length - 1);
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud): void {
    const pattern = CLOUD_PATTERNS[cloud.spriteIndex % CLOUD_PATTERNS.length];
    const opacityMul = this.devOverrides.cloudOpacity ?? 1;
    const alpha =
      cloud.opacity * Math.min(1, this.settings.intensity) * opacityMul * this.effectStrength;

    const isStorm = this.weather === 'thunderstorm';
    const light = isStorm ? '#a8b0b8' : '#d0d8e0';
    const mid = isStorm ? '#889098' : '#b8c4cc';
    const dark = isStorm ? '#687078' : '#98a4ac';

    const blockScale = Math.max(1, Math.round(cloud.scale));
    const cellW = this.getCellWidth(blockScale, cloud.stretchX);
    const cellH = this.getCellHeight(blockScale, cloud.stretchY);
    const cols = Math.max(...pattern.map((row) => row.length));
    const rows = pattern.length;
    const offW = cols * cellW;
    const offH = rows * cellH;

    const scratch = getScratchContext(offW, offH);
    configurePixelCanvas(scratch);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < pattern[row].length; col++) {
        if (!pattern[row][col]) {
          continue;
        }
        const shade = col === 0 ? dark : row === 0 ? light : mid;
        scratch.fillStyle = shade;
        scratch.fillRect(col * cellW, row * cellH, cellW, cellH);
      }
    }

    const dpr = window.devicePixelRatio || 1;
    const destX = snapDrawCoord(snap(cloud.x), dpr);
    const destY = snapDrawCoord(snap(cloud.y), dpr);
    const destW = snapDrawSize(offW, dpr);
    const destH = snapDrawSize(offH, dpr);

    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * alpha;
    ctx.drawImage(getScratchCanvas(), 0, 0, offW, offH, destX, destY, destW, destH);
    ctx.globalAlpha = prevAlpha;
  }
}
