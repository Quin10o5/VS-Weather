import { DayPhase, DEFAULT_SETTINGS, DevOverrides, WeatherSettings, WeatherState, WindState } from '../shared/types';
import { fillBlock, PIXEL, snap } from '../renderer/pixelArt';
import {
  arcY,
  getDayArcProgress,
  getNightArcProgress,
  isDaytime,
  nightSkyStrength,
  resolveHour,
  twilightStrength,
} from './celestialTime';
import { WeatherSystem } from './WeatherSystem';

interface StarPoint {
  x: number;
  y: number;
  brightness: number;
  size: number;
}

export class SunSystem implements WeatherSystem {
  private width = 0;
  private height = 0;
  private weather: WeatherState = 'sunny';
  private devOverrides: DevOverrides = {};
  private stars: StarPoint[] = [];
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private celestialAlpha = 1;
  private sunGlowAlpha = 1;
  private animTime = 0;

  setDevOverrides(overrides: DevOverrides): void {
    this.devOverrides = { ...this.devOverrides, ...overrides };
  }

  setEffectStrength(strength: number): void {
    this.celestialAlpha = Math.max(0, Math.min(1, strength));
  }

  setSunGlowStrength(strength: number): void {
    this.sunGlowAlpha = Math.max(0, Math.min(1, strength));
  }

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.regenerateStars(width, height);
  }

  private hash01(seed: number): number {
    let t = (seed + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private regenerateStars(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      this.stars = [];
      return;
    }

    const targetCount = Math.max(20, Math.floor((width * height) / 5500));
    const stars: StarPoint[] = [];
    const skyHeight = height * 0.88;
    const occupied = new Set<string>();

    for (let i = 0; stars.length < targetCount && i < targetCount * 12; i++) {
      const seedBase = i * 374761393 + width * 668265263 + height * 2246822519;
      const x = snap(this.hash01(seedBase + 11) * (width - PIXEL * 2));
      const y = snap(this.hash01(seedBase + 29) * (skyHeight - PIXEL * 2));
      const key = `${x},${y}`;

      if (occupied.has(key)) {
        continue;
      }
      occupied.add(key);

      const brightness = 0.18 + this.hash01(seedBase + 47) * 0.82;
      const size = this.hash01(seedBase + 71) > 0.86 ? 2 : 1;
      stars.push({ x, y, brightness, size });
    }

    this.stars = stars;
  }

  onWeatherChange(state: WeatherState): void {
    this.weather = state;
  }

  onWindChange(_wind: WindState): void {}

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  update(_dt: number, time: number): void {
    this.animTime = time;
  }

  /** Slow rhythmic breathe — stronger in clear sky, nearly flat in storms. */
  private pulseFactor(weatherAlpha: number, isSun: boolean): number {
    const t = this.animTime * 0.001;
    const periodSec = isSun ? 4 : 5.5;
    const phase = isSun ? 0 : 1.1;
    const maxAmp = isSun ? 0.095 : 0.078;
    const amp = maxAmp * weatherAlpha;

    const wave = Math.sin((t / periodSec) * Math.PI * 2 + phase);
    const breath = wave * 0.5 + 0.5;
    const eased = breath * breath * (3 - 2 * breath);
    const swing = (eased - 0.5) * 2;
    return 1 + swing * amp;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.settings.enabled || !this.settings.dayNight) {
      return;
    }

    const w = width || this.width;
    const h = height || this.height;
    const baseIntensity = Math.min(1, this.settings.intensity);
    const weatherAlpha = this.celestialAlpha;
    const visibility = baseIntensity * weatherAlpha;

    const now = new Date();
    const realHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const hour = resolveHour(
      realHour,
      this.devOverrides.timeOverride,
      this.devOverrides.useTimeOverride
    );

    const bodyX = snap(w * 0.1);
    const day = isDaytime(hour);
    const progress = day ? getDayArcProgress(hour) : getNightArcProgress(hour);
    const bodyY = arcY(progress, h, snap);
    const twilight = twilightStrength(progress);

    if (twilight > 0 && weatherAlpha > 0.08) {
      this.drawTwilightGradient(ctx, w, h, twilight * visibility * 0.78, day);
    }

    if (!day) {
      const starStrength = nightSkyStrength(hour) * visibility;
      if (starStrength > 0.02) {
        this.drawStars(ctx, starStrength);
      }
    }

    if (visibility <= 0.02) {
      return;
    }

    if (day) {
      this.drawSun(ctx, bodyX, bodyY, baseIntensity, weatherAlpha, this.sunGlowAlpha);
    } else {
      this.drawMoon(ctx, bodyX, bodyY, baseIntensity, weatherAlpha);
    }
  }

  private drawStars(ctx: CanvasRenderingContext2D, strength: number): void {
    ctx.fillStyle = '#ffffff';
    for (const star of this.stars) {
      fillBlock(ctx, star.x, star.y, star.size, star.size, '#ffffff', star.brightness * strength);
    }
  }

  private drawTwilightGradient(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    strength: number,
    isDay: boolean
  ): void {
    const bandHeight = height * 0.33;
    const bottom = height;
    const top = snap(bottom - bandHeight);
    const s = Math.min(1, strength);

    const warm1 = isDay ? 'rgba(255, 140, 60, 0)' : 'rgba(80, 90, 160, 0)';
    const warm2 = isDay
      ? `rgba(255, 100, 40, ${0.35 * s})`
      : `rgba(100, 110, 200, ${0.25 * s})`;
    const warm3 = isDay
      ? `rgba(255, 170, 70, ${0.22 * s})`
      : `rgba(70, 80, 150, ${0.15 * s})`;

    const gradient = ctx.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, warm1);
    gradient.addColorStop(0.4, warm3);
    gradient.addColorStop(1, warm2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, top, width, bandHeight);
  }

  private drawSun(
    ctx: CanvasRenderingContext2D,
    sunX: number,
    sunY: number,
    baseIntensity: number,
    weatherAlpha: number,
    glowStrength: number
  ): void {
    const coreBlocks = 7;
    const glowColor = '#ffe566';
    const coreColor = '#ffd028';
    const pulse = this.pulseFactor(weatherAlpha, true);
    const glowPulse = 1 + (pulse - 1) * 1.55;
    const corePulse = 1 + (pulse - 1) * 0.5;

    ctx.save();
    ctx.globalAlpha = weatherAlpha;
    this.drawSunHalo(ctx, sunX, sunY, coreBlocks, baseIntensity, glowStrength, glowPulse);
    fillBlock(ctx, sunX - PIXEL * 2, sunY - PIXEL * 2, coreBlocks + 3, coreBlocks + 3, glowColor, 0.3 * baseIntensity * glowPulse);
    fillBlock(ctx, sunX - PIXEL, sunY - PIXEL, coreBlocks + 1, coreBlocks + 1, glowColor, 0.45 * baseIntensity * glowPulse);
    fillBlock(ctx, sunX, sunY, coreBlocks, coreBlocks, coreColor, 0.95 * baseIntensity * corePulse);
    ctx.restore();
  }

  private drawSunHalo(
    ctx: CanvasRenderingContext2D,
    sunX: number,
    sunY: number,
    coreBlocks: number,
    baseIntensity: number,
    glowStrength: number,
    glowPulse: number
  ): void {
    if (glowStrength <= 0.01) {
      return;
    }

    const strength = glowStrength * baseIntensity * glowPulse;
    const color = '#ffe878';

    for (let ring = 4; ring >= 2; ring--) {
      const size = coreBlocks + ring * 2;
      const t = (ring - 2) / 2;
      const alpha = (0.1 + t * 0.22) * strength;
      const x = sunX - ring * PIXEL;
      const y = sunY - ring * PIXEL;
      this.drawPixelRing(ctx, x, y, size, color, alpha);
    }
  }

  /** One-block-thick square ring in pixel blocks. */
  private drawPixelRing(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    blocks: number,
    color: string,
    alpha: number
  ): void {
    if (blocks < 3 || alpha <= 0.005) {
      return;
    }
    fillBlock(ctx, x, y, blocks, 1, color, alpha);
    fillBlock(ctx, x, y + (blocks - 1) * PIXEL, blocks, 1, color, alpha);
    fillBlock(ctx, x, y + PIXEL, 1, blocks - 2, color, alpha);
    fillBlock(ctx, x + (blocks - 1) * PIXEL, y + PIXEL, 1, blocks - 2, color, alpha);
  }

  private drawMoon(
    ctx: CanvasRenderingContext2D,
    moonX: number,
    moonY: number,
    baseIntensity: number,
    weatherAlpha: number
  ): void {
    const coreBlocks = 6;
    const glowColor = '#c8d0e8';
    const coreColor = '#e8ecf8';
    const shadowColor = '#8890a8';
    const pulse = this.pulseFactor(weatherAlpha, false);
    const glowPulse = 1 + (pulse - 1) * 1.45;
    const corePulse = 1 + (pulse - 1) * 0.45;

    ctx.save();
    ctx.globalAlpha = weatherAlpha;
    fillBlock(ctx, moonX - PIXEL, moonY - PIXEL, coreBlocks + 2, coreBlocks + 2, glowColor, 0.25 * baseIntensity * glowPulse);
    fillBlock(ctx, moonX, moonY, coreBlocks, coreBlocks, coreColor, 0.9 * baseIntensity * corePulse);
    fillBlock(ctx, moonX + PIXEL * 2, moonY - PIXEL, coreBlocks, coreBlocks, shadowColor, 0.85 * baseIntensity);
    fillBlock(ctx, moonX + PIXEL * 3, moonY, coreBlocks - 1, coreBlocks, shadowColor, 0.7 * baseIntensity);
    ctx.restore();
  }
}
