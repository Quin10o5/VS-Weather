export const SUNRISE_HOUR = 6.5;
export const SUNSET_HOUR = 19.5;
export const DAY_LENGTH = SUNSET_HOUR - SUNRISE_HOUR;
export const NIGHT_LENGTH = 24 - DAY_LENGTH;

export function resolveHour(realHour: number, overrideHour?: number, useOverride?: boolean): number {
  if (useOverride && overrideHour !== undefined) {
    return ((overrideHour % 24) + 24) % 24;
  }
  return realHour;
}

export function isDaytime(hour: number): boolean {
  return hour >= SUNRISE_HOUR && hour < SUNSET_HOUR;
}

export function getDayArcProgress(hour: number): number {
  return Math.max(0, Math.min(1, (hour - SUNRISE_HOUR) / DAY_LENGTH));
}

export function getNightArcProgress(hour: number): number {
  if (hour >= SUNSET_HOUR) {
    return (hour - SUNSET_HOUR) / NIGHT_LENGTH;
  }
  return (hour + (24 - SUNSET_HOUR)) / NIGHT_LENGTH;
}

export function arcY(progress: number, height: number, snapFn: (n: number) => number): number {
  const horizonInset = Math.max(height * 0.06, 32);
  const low = height - horizonInset;
  const high = height * 0.06;
  return snapFn(low - (low - high) * Math.sin(progress * Math.PI));
}

/** 0 at horizon (rise/set), peaks near 1 at zenith */
export function twilightStrength(progress: number): number {
  const edge = Math.min(progress, 1 - progress);
  return Math.max(0, 1 - edge / 0.12);
}

/** 0 at sunset/sunrise, ramps to 1 through early night and holds until pre-dawn */
export function nightSkyStrength(hour: number): number {
  if (isDaytime(hour)) {
    return 0;
  }
  const progress = getNightArcProgress(hour);
  const edge = Math.min(progress, 1 - progress);
  if (edge >= 0.12) {
    return 1;
  }
  return edge / 0.12;
}

/** True during night and twilight near sunrise or sunset */
export function isDuskOrNight(hour: number): boolean {
  if (!isDaytime(hour)) {
    return true;
  }
  return twilightStrength(getDayArcProgress(hour)) > 0.15;
}

export function getWeatherCelestialAlpha(weather: string): number {
  switch (weather) {
    case 'sunny':
      return 1;
    case 'cloudy':
      return 0.75;
    case 'rain':
      return 0.45;
    case 'thunderstorm':
      return 0.1;
    case 'fog':
      return 0.5;
    case 'snow':
      return 0.55;
    default:
      return 0.85;
  }
}
