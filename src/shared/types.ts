export type WeatherState =
  | 'sunny'
  | 'cloudy'
  | 'rain'
  | 'thunderstorm'
  | 'fog'
  | 'snow';

export type DayPhase = 'day' | 'night';

export interface WindState {
  strength: number;
  direction: number;
}

export type WeatherUiMode = 'normal' | 'dev';

export type SnowSeasonMode = 'auto' | 'always' | 'never';

export type PanelPosition = 'top' | 'bottom';

export interface WeatherSettings {
  enabled: boolean;
  showOnStartup: boolean;
  panelPosition: PanelPosition;
  intensity: number;
  birds: boolean;
  mountains: boolean;
  dayNight: boolean;
  lightning: boolean;
  snowSeason: SnowSeasonMode;
  cycleIntervalMin: number;
  cycleIntervalMax: number;
  pauseWhenHidden: boolean;
  uiMode: WeatherUiMode;
}

export interface DevOverrides {
  intensity?: number;
  windStrength?: number;
  windDirection?: number;
  rainDensity?: number;
  cloudCount?: number;
  cloudOpacity?: number;
  /** 0–24 local hour for previewing sun/moon position */
  timeOverride?: number;
  useTimeOverride?: boolean;
  /** 1–365 day of year for previewing seasonal behavior */
  dateOverrideDayOfYear?: number;
  useDateOverride?: boolean;
}

export interface HostMessage {
  type:
    | 'init'
    | 'weather'
    | 'wind'
    | 'dayPhase'
    | 'settings'
    | 'visibility'
    | 'devOverrides'
    | 'triggerLightning'
    | 'triggerBirds'
    | 'triggerInchworm'
    | 'triggerFireflies'
    | 'triggerRainbow'
    | 'showFps'
    | 'toggleSettingsMenu';
  weather?: WeatherState;
  dayPhase?: DayPhase;
  wind?: WindState;
  settings?: WeatherSettings;
  visible?: boolean;
  devOverrides?: DevOverrides;
}

export interface WebviewMessage {
  type: 'ready' | 'setWeather' | 'cycleNow' | 'updateSetting' | 'openExtensionSettings';
  weather?: WeatherState;
  setting?: keyof WeatherSettings;
  value?: WeatherSettings[keyof WeatherSettings];
}

export const WEATHER_WEIGHTS: Record<WeatherState, number> = {
  sunny: 40,
  cloudy: 30,
  rain: 15,
  fog: 10,
  thunderstorm: 3,
  snow: 2,
};

/** Slightly more snow; thunder rare but still shows up a few times per session. */
export const WINTER_WEATHER_WEIGHTS: Record<WeatherState, number> = {
  sunny: 34,
  cloudy: 26,
  rain: 14,
  fog: 8,
  thunderstorm: 9,
  snow: 9,
};

export function isSnowSeason(date: Date = new Date()): boolean {
  const month = date.getMonth();
  return month === 11 || month === 0 || month === 1;
}

export function isSnowEnabled(mode: SnowSeasonMode, date: Date = new Date()): boolean {
  if (mode === 'always') {
    return true;
  }
  if (mode === 'never') {
    return false;
  }
  return isSnowSeason(date);
}

export function getDayOfYear(date: Date = new Date()): number {
  const year = date.getFullYear();
  const start = new Date(year, 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function dateFromDayOfYear(dayOfYear: number, year?: number): Date {
  const y = year ?? new Date().getFullYear();
  const clamped = Math.max(1, Math.min(365, Math.round(dayOfYear)));
  const date = new Date(y, 0, 1);
  date.setDate(clamped);
  return date;
}

export function resolveDate(
  realDate: Date = new Date(),
  dayOfYear?: number,
  useOverride?: boolean
): Date {
  if (useOverride && dayOfYear !== undefined) {
    return dateFromDayOfYear(dayOfYear, realDate.getFullYear());
  }
  return realDate;
}

export function formatDayOfYear(dayOfYear: number, year?: number): string {
  return dateFromDayOfYear(dayOfYear, year ?? new Date().getFullYear()).toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric' }
  );
}

/** Maps rain to snow in winter; fog/snow off-season become cloudy. */
export function mapWeatherForSeason(
  state: WeatherState,
  date: Date = new Date(),
  snowSeasonMode: SnowSeasonMode = 'auto'
): WeatherState {
  const snowSeason = isSnowEnabled(snowSeasonMode, date);
  if (state === 'fog') {
    return 'cloudy';
  }
  if (state === 'rain' && snowSeason) {
    return 'snow';
  }
  if (state === 'snow' && !snowSeason) {
    return 'cloudy';
  }
  return state;
}

export function getDayPhase(date: Date = new Date()): DayPhase {
  const hour = date.getHours() + date.getMinutes() / 60;
  return hour >= 6.5 && hour < 19.5 ? 'day' : 'night';
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function pickWeightedWeather(snowEnabled: boolean): WeatherState {
  const weights = snowEnabled ? WINTER_WEATHER_WEIGHTS : WEATHER_WEIGHTS;
  const entries = Object.entries(weights).filter(
    ([state]) => snowEnabled || state !== 'snow'
  ) as [WeatherState, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [state, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return state;
    }
  }
  return 'sunny';
}

export const DEFAULT_SETTINGS: WeatherSettings = {
  enabled: true,
  showOnStartup: true,
  panelPosition: 'top',
  intensity: 1.0,
  birds: true,
  mountains: true,
  dayNight: true,
  lightning: true,
  snowSeason: 'auto',
  cycleIntervalMin: 5,
  cycleIntervalMax: 15,
  pauseWhenHidden: true,
  uiMode: 'normal',
};

export const DEFAULT_DEV_OVERRIDES: DevOverrides = {
  intensity: 1,
  windStrength: 0.5,
  windDirection: 1,
  rainDensity: 1,
  cloudCount: 8,
  cloudOpacity: 1,
  timeOverride: 12,
  useTimeOverride: false,
  dateOverrideDayOfYear: 1,
  useDateOverride: false,
};
