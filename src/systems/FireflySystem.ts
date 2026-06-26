import {
  DayPhase,
  DEFAULT_SETTINGS,
  DevOverrides,
  WeatherSettings,
  WeatherState,
  WindState,
  celestialScheduleFromSettings,
  randomRange,
} from '../shared/types';
import { fillBlock, snap } from '../renderer/pixelArt';
import {
  DEFAULT_CELESTIAL_SCHEDULE,
  isDuskOrNight,
  normalizeCelestialSchedule,
  resolveHour,
  type CelestialSchedule,
} from './celestialTime';
import { WeatherSystem } from './WeatherSystem';

interface Firefly {
  x: number;
  y: number;
  phase: number;
  pulsePhase: number;
  driftScale: number;
  brightness: number;
  appearDelay: number;
}

interface FireflyEvent {
  fireflies: Firefly[];
  elapsed: number;
  duration: number;
}

const FIREFLY_WEATHER: WeatherState[] = ['sunny', 'cloudy'];
const FIREFLY_COUNT = 12;
const FADE_IN_SEC = 2.5;
const FADE_OUT_SEC = 3;
const MIN_EVENT_DURATION_SEC = 26;
const MAX_EVENT_DURATION_SEC = 42;
const MIN_SPAWN_DELAY_SEC = 45;
const MAX_SPAWN_DELAY_SEC = 120;
const MAX_APPEAR_DELAY_SEC = 3.5;

const FIREFLY_COLOR = '#d8f060';

export class FireflySystem implements WeatherSystem {
  private event: FireflyEvent | null = null;
  private fade = 0;
  private windingDown = false;
  private windDownElapsed = 0;
  private width = 0;
  private height = 0;
  private weather: WeatherState = 'sunny';
  private settings: WeatherSettings = { ...DEFAULT_SETTINGS };
  private celestialSchedule: CelestialSchedule = DEFAULT_CELESTIAL_SCHEDULE;
  private devOverrides: DevOverrides = {};
  private forceActive = false;
  private spawnTimer = 0;
  private nextSpawn = MIN_SPAWN_DELAY_SEC;

  setDevOverrides(overrides: DevOverrides): void {
    this.devOverrides = { ...this.devOverrides, ...overrides };
  }

  setDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.scheduleSpawn();
  }

  onWeatherChange(state: WeatherState): void {
    this.weather = state;
    if (!this.canNaturallyShow() && this.event && !this.forceActive) {
      this.startWindDown();
    }
  }

  onWindChange(_wind: WindState): void {}

  onSettingsChange(settings: WeatherSettings): void {
    this.settings = settings;
    this.celestialSchedule = normalizeCelestialSchedule(celestialScheduleFromSettings(settings));
  }

  onDayPhaseChange(_phase: DayPhase): void {}

  triggerFireflies(): void {
    if (!this.settings.enabled || this.width <= 0) {
      return;
    }
    this.forceActive = true;
    this.beginEvent();
    this.spawnTimer = 0;
    this.scheduleSpawn();
  }

  update(dt: number, time: number): void {
    if (!this.settings.enabled) {
      return;
    }

    if (!this.event) {
      if (this.canNaturallyShow() && !this.forceActive) {
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.nextSpawn) {
          this.beginEvent();
          this.spawnTimer = 0;
          this.scheduleSpawn();
        }
      }
      return;
    }

    this.event.elapsed += dt;
    this.updateFireflies(dt, time);

    if (!this.windingDown) {
      const fadeIn = Math.min(1, this.event.elapsed / FADE_IN_SEC);
      const holdFade =
        this.event.elapsed > this.event.duration - FADE_OUT_SEC
          ? Math.max(0, (this.event.duration - this.event.elapsed) / FADE_OUT_SEC)
          : 1;
      this.fade = fadeIn * holdFade;

      if (!this.canNaturallyShow() && !this.forceActive) {
        this.startWindDown();
      } else if (this.event.elapsed >= this.event.duration) {
        this.startWindDown();
      }
    } else {
      this.windDownElapsed += dt;
      this.fade = Math.max(0, 1 - this.windDownElapsed / FADE_OUT_SEC);
      if (this.fade <= 0) {
        this.endEvent();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    if (!this.settings.enabled || !this.event || this.fade <= 0.01) {
      return;
    }

    const intensity = Math.min(1, this.settings.intensity);
    const groupAlpha = this.fade * intensity;

    for (const firefly of this.event.fireflies) {
      const fireflyAge = this.event.elapsed - firefly.appearDelay;
      if (fireflyAge <= 0) {
        continue;
      }

      const appearFade = Math.min(1, fireflyAge / 0.9);
      const pulse = (Math.sin(firefly.pulsePhase) + 1) / 2;
      const alpha = (0.35 + pulse * 0.65) * firefly.brightness * groupAlpha * appearFade;
      if (alpha <= 0.02) {
        continue;
      }

      fillBlock(ctx, snap(firefly.x), snap(firefly.y), 1, 1, FIREFLY_COLOR, alpha);
    }
  }

  private beginEvent(): void {
    this.event = {
      fireflies: this.createFireflies(),
      elapsed: 0,
      duration: randomRange(MIN_EVENT_DURATION_SEC, MAX_EVENT_DURATION_SEC),
    };
    this.fade = 0;
    this.windingDown = false;
    this.windDownElapsed = 0;
  }

  private startWindDown(): void {
    if (this.windingDown) {
      return;
    }
    this.windingDown = true;
    this.windDownElapsed = 0;
  }

  private endEvent(): void {
    this.event = null;
    this.fade = 0;
    this.windingDown = false;
    this.windDownElapsed = 0;
    this.forceActive = false;
    this.spawnTimer = 0;
    this.scheduleSpawn();
  }

  private updateFireflies(dt: number, time: number): void {
    if (!this.event) {
      return;
    }

    const margin = 8;
    for (const firefly of this.event.fireflies) {
      firefly.x += Math.sin(time * 0.0009 + firefly.phase) * firefly.driftScale * dt;
      firefly.y += Math.cos(time * 0.0011 + firefly.phase * 1.3) * firefly.driftScale * 0.7 * dt;
      firefly.pulsePhase += dt * (1.4 + firefly.brightness * 0.8);

      if (firefly.x < margin) {
        firefly.x = margin;
      } else if (firefly.x > this.width - margin) {
        firefly.x = this.width - margin;
      }
      if (firefly.y < this.height * 0.28) {
        firefly.y = this.height * 0.28;
      } else if (firefly.y > this.height - margin) {
        firefly.y = this.height - margin;
      }
    }
  }

  private canNaturallyShow(): boolean {
    if (!this.settings.enabled || !this.settings.dayNight) {
      return false;
    }
    if (!FIREFLY_WEATHER.includes(this.weather)) {
      return false;
    }
    const now = new Date();
    const realHour =
      now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const hour = resolveHour(
      realHour,
      this.devOverrides.timeOverride,
      this.devOverrides.useTimeOverride
    );
    return isDuskOrNight(hour, this.celestialSchedule);
  }

  private scheduleSpawn(): void {
    this.nextSpawn = randomRange(MIN_SPAWN_DELAY_SEC, MAX_SPAWN_DELAY_SEC);
  }

  private createFireflies(): Firefly[] {
    const fireflies: Firefly[] = [];
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      fireflies.push({
        x: randomRange(this.width * 0.08, this.width * 0.92),
        y: randomRange(this.height * 0.32, this.height * 0.88),
        phase: randomRange(0, Math.PI * 2),
        pulsePhase: randomRange(0, Math.PI * 2),
        driftScale: randomRange(10, 22),
        brightness: randomRange(0.65, 1),
        appearDelay: randomRange(0, MAX_APPEAR_DELAY_SEC),
      });
    }
    return fireflies;
  }
}
