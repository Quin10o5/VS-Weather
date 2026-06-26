export interface CelestialSchedule {
  sunriseHour: number;
  sunsetHour: number;
}

export const DEFAULT_CELESTIAL_SCHEDULE: CelestialSchedule = {
  sunriseHour: 6.5,
  sunsetHour: 19.5,
};

/** @deprecated Use DEFAULT_CELESTIAL_SCHEDULE.sunriseHour */
export const SUNRISE_HOUR = DEFAULT_CELESTIAL_SCHEDULE.sunriseHour;
/** @deprecated Use DEFAULT_CELESTIAL_SCHEDULE.sunsetHour */
export const SUNSET_HOUR = DEFAULT_CELESTIAL_SCHEDULE.sunsetHour;

export function clampHour(hour: number): number {
  const wrapped = ((hour % 24) + 24) % 24;
  return Math.round(wrapped * 4) / 4;
}

export function normalizeCelestialSchedule(
  schedule: CelestialSchedule
): CelestialSchedule {
  const sunriseHour = clampHour(schedule.sunriseHour);
  let sunsetHour = clampHour(schedule.sunsetHour);
  if (sunsetHour <= sunriseHour) {
    sunsetHour = Math.min(23.75, sunriseHour + 1);
  }
  return { sunriseHour, sunsetHour };
}

function dayLength(schedule: CelestialSchedule): number {
  const { sunriseHour, sunsetHour } = normalizeCelestialSchedule(schedule);
  return sunsetHour - sunriseHour;
}

function nightLength(schedule: CelestialSchedule): number {
  return 24 - dayLength(schedule);
}

export function resolveHour(realHour: number, overrideHour?: number, useOverride?: boolean): number {
  if (useOverride && overrideHour !== undefined) {
    return clampHour(overrideHour);
  }
  return realHour;
}

export function isDaytime(
  hour: number,
  schedule: CelestialSchedule = DEFAULT_CELESTIAL_SCHEDULE
): boolean {
  const { sunriseHour, sunsetHour } = normalizeCelestialSchedule(schedule);
  return hour >= sunriseHour && hour < sunsetHour;
}

export function getDayArcProgress(
  hour: number,
  schedule: CelestialSchedule = DEFAULT_CELESTIAL_SCHEDULE
): number {
  const { sunriseHour } = normalizeCelestialSchedule(schedule);
  return Math.max(0, Math.min(1, (hour - sunriseHour) / dayLength(schedule)));
}

export function getNightArcProgress(
  hour: number,
  schedule: CelestialSchedule = DEFAULT_CELESTIAL_SCHEDULE
): number {
  const { sunsetHour } = normalizeCelestialSchedule(schedule);
  const length = nightLength(schedule);
  if (hour >= sunsetHour) {
    return (hour - sunsetHour) / length;
  }
  return (hour + (24 - sunsetHour)) / length;
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
export function nightSkyStrength(
  hour: number,
  schedule: CelestialSchedule = DEFAULT_CELESTIAL_SCHEDULE
): number {
  if (isDaytime(hour, schedule)) {
    return 0;
  }
  const progress = getNightArcProgress(hour, schedule);
  const edge = Math.min(progress, 1 - progress);
  if (edge >= 0.12) {
    return 1;
  }
  return edge / 0.12;
}

/** True during night and twilight near sunrise or sunset */
export function isDuskOrNight(
  hour: number,
  schedule: CelestialSchedule = DEFAULT_CELESTIAL_SCHEDULE
): boolean {
  if (!isDaytime(hour, schedule)) {
    return true;
  }
  return twilightStrength(getDayArcProgress(hour, schedule)) > 0.15;
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
