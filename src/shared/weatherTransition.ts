import { WeatherState } from './types';

export const WEATHER_TRANSITION_SEC = 12;

const CELESTIAL_ALPHA: Record<WeatherState, number> = {
  sunny: 1,
  cloudy: 0.75,
  rain: 0.45,
  thunderstorm: 0.1,
  fog: 0.5,
  snow: 0.55,
};

/** Outer sun halo — full in sun, faint in cloud, off in rain/storms. */
export const SUN_GLOW_PRESENCE: Record<WeatherState, number> = {
  sunny: 1,
  cloudy: 0.42,
  rain: 0,
  thunderstorm: 0,
  fog: 0,
  snow: 0,
};

/** Cloud density factor per weather (cloudy = 3× sunny). */
export const CLOUD_PRESENCE: Record<WeatherState, number> = {
  sunny: 1 / 3,
  cloudy: 1,
  rain: 0.85,
  thunderstorm: 1,
  fog: 0.7,
  snow: 0.9,
};

export const RAIN_PRESENCE: Record<WeatherState, number> = {
  sunny: 0,
  cloudy: 0,
  rain: 1,
  thunderstorm: 1,
  fog: 0,
  snow: 0,
};

export const SNOW_PRESENCE: Record<WeatherState, number> = {
  sunny: 0,
  cloudy: 0,
  rain: 0,
  thunderstorm: 0,
  fog: 0,
  snow: 1,
};

/** Mountain snow-cap opacity during winter — always visible, stronger in colder weather. */
export const MOUNTAIN_SNOW_PRESENCE: Record<WeatherState, number> = {
  sunny: 0.32,
  cloudy: 0.58,
  rain: 0.75,
  thunderstorm: 0.7,
  fog: 0.48,
  snow: 1,
};

/** Ground snow depth in pixel-grid blocks (1 block = PIXEL px tall). */
export const GROUND_SNOW_DEPTH_BLOCKS: Record<WeatherState, number> = {
  sunny: 1,
  cloudy: 2,
  rain: 2,
  thunderstorm: 2,
  fog: 2,
  snow: 3,
};

export const LIGHTNING_PRESENCE: Record<WeatherState, number> = {
  sunny: 0,
  cloudy: 0,
  rain: 0,
  thunderstorm: 1,
  fog: 0,
  snow: 0,
};

export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function blendScalar(from: number, to: number, t: number): number {
  const eased = smoothstep(t);
  return from + (to - from) * eased;
}

function presenceFor(
  map: Record<WeatherState, number>,
  weather: WeatherState
): number {
  return map[weather] ?? 0;
}

export function blendCloudPresence(from: WeatherState, to: WeatherState, t: number): number {
  return blendScalar(presenceFor(CLOUD_PRESENCE, from), presenceFor(CLOUD_PRESENCE, to), t);
}

export function blendRainPresence(from: WeatherState, to: WeatherState, t: number): number {
  return blendScalar(presenceFor(RAIN_PRESENCE, from), presenceFor(RAIN_PRESENCE, to), t);
}

export function blendSnowPresence(from: WeatherState, to: WeatherState, t: number): number {
  return blendScalar(presenceFor(SNOW_PRESENCE, from), presenceFor(SNOW_PRESENCE, to), t);
}

export function blendMountainSnowPresence(from: WeatherState, to: WeatherState, t: number): number {
  return blendScalar(
    presenceFor(MOUNTAIN_SNOW_PRESENCE, from),
    presenceFor(MOUNTAIN_SNOW_PRESENCE, to),
    t
  );
}

export function blendGroundSnowDepth(from: WeatherState, to: WeatherState, t: number): number {
  return Math.round(
    blendScalar(
      presenceFor(GROUND_SNOW_DEPTH_BLOCKS, from),
      presenceFor(GROUND_SNOW_DEPTH_BLOCKS, to),
      t
    )
  );
}

export function blendLightningPresence(from: WeatherState, to: WeatherState, t: number): number {
  return blendScalar(
    presenceFor(LIGHTNING_PRESENCE, from),
    presenceFor(LIGHTNING_PRESENCE, to),
    t
  );
}

export function blendCelestialAlpha(from: WeatherState, to: WeatherState, t: number): number {
  return blendScalar(presenceFor(CELESTIAL_ALPHA, from), presenceFor(CELESTIAL_ALPHA, to), t);
}

export function blendSunGlowPresence(from: WeatherState, to: WeatherState, t: number): number {
  return blendScalar(presenceFor(SUN_GLOW_PRESENCE, from), presenceFor(SUN_GLOW_PRESENCE, to), t);
}

export function shouldShowRainbow(
  fromDisplay: WeatherState,
  toDisplay: WeatherState,
  fromRaw?: WeatherState,
  toRaw?: WeatherState,
  snowSeason = false
): boolean {
  if (snowSeason) {
    return false;
  }
  const toSunny = toDisplay === 'sunny' || toRaw === 'sunny';
  if (!toSunny) {
    return false;
  }
  const wetFromRaw =
    fromRaw === 'rain' || fromRaw === 'thunderstorm' || fromRaw === 'snow';
  const wetFromDisplay =
    fromDisplay === 'rain' || fromDisplay === 'thunderstorm' || fromDisplay === 'snow';
  return wetFromRaw || wetFromDisplay;
}
