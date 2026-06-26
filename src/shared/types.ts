import { CelestialSchedule, DEFAULT_CELESTIAL_SCHEDULE, isDaytime } from '../systems/celestialTime';

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
  nightEndHour: number;
  nightStartHour: number;
  lightning: boolean;
  snowSeason: SnowSeasonMode;
  winterStartMonth: number;
  winterStartDay: number;
  winterEndMonth: number;
  winterEndDay: number;
  cycleIntervalMin: number;
  cycleIntervalMax: number;
  pauseWhenHidden: boolean;
  uiMode: WeatherUiMode;
}

export interface WinterDates {
  winterStartMonth: number;
  winterStartDay: number;
  winterEndMonth: number;
  winterEndDay: number;
}

export const DEFAULT_WINTER_DATES: WinterDates = {
  winterStartMonth: 12,
  winterStartDay: 1,
  winterEndMonth: 2,
  winterEndDay: 28,
};

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

export function clampWinterDay(month: number, day: number, year: number): number {
  const clampedMonth = Math.min(12, Math.max(1, Math.round(month)));
  const maxDay = new Date(year, clampedMonth, 0).getDate();
  return Math.min(maxDay, Math.max(1, Math.round(day)));
}

export function clampWinterMonth(month: number): number {
  return Math.min(12, Math.max(1, Math.round(month)));
}

export function normalizeWinterDates(
  winter: WinterDates,
  year: number = new Date().getFullYear()
): WinterDates {
  const winterStartMonth = clampWinterMonth(winter.winterStartMonth);
  const winterEndMonth = clampWinterMonth(winter.winterEndMonth);
  return {
    winterStartMonth,
    winterStartDay: clampWinterDay(winterStartMonth, winter.winterStartDay, year),
    winterEndMonth,
    winterEndDay: clampWinterDay(winterEndMonth, winter.winterEndDay, year),
  };
}

function monthDayKey(month: number, day: number): number {
  return month * 100 + day;
}

export function isDateInWinterRange(date: Date, winter: WinterDates): boolean {
  const year = date.getFullYear();
  const normalized = normalizeWinterDates(winter, year);
  const today = monthDayKey(date.getMonth() + 1, date.getDate());
  const start = monthDayKey(normalized.winterStartMonth, normalized.winterStartDay);
  const end = monthDayKey(normalized.winterEndMonth, normalized.winterEndDay);

  if (start <= end) {
    return today >= start && today <= end;
  }
  return today >= start || today <= end;
}

export function winterDatesFromSettings(
  settings: Pick<
    WeatherSettings,
    'winterStartMonth' | 'winterStartDay' | 'winterEndMonth' | 'winterEndDay'
  >
): WinterDates {
  return normalizeWinterDates({
    winterStartMonth: settings.winterStartMonth,
    winterStartDay: settings.winterStartDay,
    winterEndMonth: settings.winterEndMonth,
    winterEndDay: settings.winterEndDay,
  });
}

export function isSnowSeason(
  date: Date = new Date(),
  winter: WinterDates = DEFAULT_WINTER_DATES
): boolean {
  return isDateInWinterRange(date, winter);
}

export function isSnowEnabled(
  mode: SnowSeasonMode,
  date: Date = new Date(),
  winter: WinterDates = DEFAULT_WINTER_DATES
): boolean {
  if (mode === 'always') {
    return true;
  }
  if (mode === 'never') {
    return false;
  }
  return isSnowSeason(date, winter);
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
  snowSeasonMode: SnowSeasonMode = 'auto',
  winter: WinterDates = DEFAULT_WINTER_DATES
): WeatherState {
  const snowSeason = isSnowEnabled(snowSeasonMode, date, winter);
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

export function celestialScheduleFromSettings(
  settings: Pick<WeatherSettings, 'nightStartHour' | 'nightEndHour'>
): CelestialSchedule {
  return {
    sunriseHour: settings.nightEndHour,
    sunsetHour: settings.nightStartHour,
  };
}

export function getDayPhase(
  date: Date = new Date(),
  schedule: CelestialSchedule = DEFAULT_CELESTIAL_SCHEDULE
): DayPhase {
  const hour = date.getHours() + date.getMinutes() / 60;
  return isDaytime(hour, schedule) ? 'day' : 'night';
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
  nightEndHour: DEFAULT_CELESTIAL_SCHEDULE.sunriseHour,
  nightStartHour: DEFAULT_CELESTIAL_SCHEDULE.sunsetHour,
  lightning: true,
  snowSeason: 'auto',
  winterStartMonth: DEFAULT_WINTER_DATES.winterStartMonth,
  winterStartDay: DEFAULT_WINTER_DATES.winterStartDay,
  winterEndMonth: DEFAULT_WINTER_DATES.winterEndMonth,
  winterEndDay: DEFAULT_WINTER_DATES.winterEndDay,
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
