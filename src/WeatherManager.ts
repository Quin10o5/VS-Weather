import * as vscode from 'vscode';
import {
  DayPhase,
  getDayPhase,
  HostMessage,
  isSnowEnabled,
  pickWeightedWeather,
  randomRange,
  WeatherSettings,
  WeatherState,
  WindState,
  celestialScheduleFromSettings,
  winterDatesFromSettings,
} from './shared/types';
import { readSettings } from './settings';

type MessageCallback = (msg: HostMessage) => void;

export class WeatherManager implements vscode.Disposable {
  private weather: WeatherState = 'sunny';
  private wind: WindState = { strength: 0.5, direction: 1 };
  private dayPhase: DayPhase;
  private weatherTimer: ReturnType<typeof setTimeout> | undefined;
  private windTimer: ReturnType<typeof setTimeout> | undefined;
  private dayTimer: ReturnType<typeof setInterval> | undefined;
  private listeners: MessageCallback[] = [];
  private disposed = false;

  constructor() {
    const settings = readSettings();
    this.dayPhase = getDayPhase(new Date(), celestialScheduleFromSettings(settings));
    this.weather = this.pickSeasonalWeather();
    this.scheduleWeatherTransition();
    this.scheduleWindUpdate();
    this.dayTimer = setInterval(() => this.updateDayPhase(), 60_000);
  }

  get currentWeather(): WeatherState {
    return this.weather;
  }

  subscribe(cb: MessageCallback): void {
    this.listeners.push(cb);
    cb(this.buildInitMessage());
  }

  unsubscribe(cb: MessageCallback): void {
    this.listeners = this.listeners.filter((l) => l !== cb);
  }

  cycleNow(): void {
    if (this.disposed) {
      return;
    }
    this.transitionWeather();
    this.scheduleWeatherTransition();
  }

  setWeather(state: WeatherState): void {
    if (this.disposed) {
      return;
    }
    this.weather = state;
    this.broadcast({ type: 'weather', weather: state });
    this.scheduleWeatherTransition();
  }

  onSettingsChanged(settings: WeatherSettings): void {
    this.broadcast({ type: 'settings', settings });
    this.refreshDayPhase();
  }

  dispose(): void {
    this.disposed = true;
    if (this.weatherTimer) {
      clearTimeout(this.weatherTimer);
    }
    if (this.windTimer) {
      clearTimeout(this.windTimer);
    }
    if (this.dayTimer) {
      clearInterval(this.dayTimer);
    }
    this.listeners = [];
  }

  private buildInitMessage(): HostMessage {
    return {
      type: 'init',
      weather: this.weather,
      dayPhase: this.dayPhase,
      wind: this.wind,
      settings: readSettings(),
    };
  }

  private broadcast(msg: HostMessage): void {
    for (const cb of this.listeners) {
      cb(msg);
    }
  }

  private scheduleWeatherTransition(): void {
    if (this.disposed) {
      return;
    }
    if (this.weatherTimer) {
      clearTimeout(this.weatherTimer);
      this.weatherTimer = undefined;
    }
    const settings = readSettings();
    const delayMs = randomRange(settings.cycleIntervalMin, settings.cycleIntervalMax) * 60_000;
    this.weatherTimer = setTimeout(() => {
      this.transitionWeather();
      this.scheduleWeatherTransition();
    }, delayMs);
  }

  private transitionWeather(): void {
    this.weather = this.pickSeasonalWeather();
    this.broadcast({ type: 'weather', weather: this.weather });
  }

  private pickSeasonalWeather(): WeatherState {
    const settings = readSettings();
    const snow = isSnowEnabled(settings.snowSeason, new Date(), winterDatesFromSettings(settings));
    let next = pickWeightedWeather(snow);
    if (snow && next === 'rain') {
      next = 'snow';
    }
    return next;
  }

  private scheduleWindUpdate(): void {
    if (this.disposed) {
      return;
    }
    if (this.windTimer) {
      clearTimeout(this.windTimer);
      this.windTimer = undefined;
    }
    const delayMs = randomRange(3, 5) * 60_000;
    this.windTimer = setTimeout(() => {
      this.updateWind();
      this.scheduleWindUpdate();
    }, delayMs);
    this.updateWind();
  }

  private updateWind(): void {
    this.wind = {
      strength: randomRange(0.2, 1.0),
      direction: Math.random() < 0.5 ? -1 : 1,
    };
    this.broadcast({ type: 'wind', wind: this.wind });
  }

  private updateDayPhase(): void {
    const settings = readSettings();
    const next = getDayPhase(new Date(), celestialScheduleFromSettings(settings));
    if (next !== this.dayPhase) {
      this.dayPhase = next;
      this.broadcast({ type: 'dayPhase', dayPhase: this.dayPhase });
    }
  }

  refreshDayPhase(): void {
    const settings = readSettings();
    const next = getDayPhase(new Date(), celestialScheduleFromSettings(settings));
    this.dayPhase = next;
    this.broadcast({ type: 'dayPhase', dayPhase: this.dayPhase });
  }
}
