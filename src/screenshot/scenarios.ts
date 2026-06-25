import {
  DayPhase,
  DEFAULT_SETTINGS,
  DevOverrides,
  SnowSeasonMode,
  WeatherSettings,
  WeatherState,
} from '../shared/types';

export interface CaptureScenario {
  id: string;
  label: string;
  weather: WeatherState;
  dayPhase?: DayPhase;
  seed: number;
  frames: number;
  birdDirection: 1 | -1;
  settings?: Partial<WeatherSettings>;
  devOverrides: DevOverrides;
  /** Simulation frame to trigger a lightning flash (thunder only). */
  lightningFrame?: number;
  /** Skip editor-background fill so PNG alpha shows through (marketplace previews). */
  transparentBackground?: boolean;
  /** Spawn a bird flock for this capture (default true). */
  birds?: boolean;
}

/** Marketplace / README gallery — keep in sync with scripts/capture-screenshots.mjs */
export const MARKETPLACE_SCENARIO_IDS = ['snow-moon', 'rain-sun', 'cloudy-dusk'] as const;

export const CAPTURE_SCENARIOS: CaptureScenario[] = [
  {
    id: 'snow-moon',
    label: 'Snowy night — moon and birds',
    weather: 'snow',
    dayPhase: 'night',
    seed: 0x2f8a55cc,
    frames: 225,
    birdDirection: 1,
    settings: { ...DEFAULT_SETTINGS, snowSeason: 'always' as SnowSeasonMode },
    devOverrides: {
      timeOverride: 22.5,
      useTimeOverride: true,
      cloudCount: 8,
      cloudOpacity: 1,
      intensity: 1,
      windDirection: 1,
      windStrength: 0.22,
    },
  },
  {
    id: 'rain-sun',
    label: 'Rain — sun',
    weather: 'rain',
    dayPhase: 'day',
    seed: 0x44bd7011,
    frames: 215,
    birdDirection: 1,
    birds: false,
    devOverrides: {
      timeOverride: 11.25,
      useTimeOverride: true,
      cloudCount: 8,
      cloudOpacity: 1,
      intensity: 1,
      rainDensity: 1,
      windDirection: 1,
      windStrength: 0.38,
    },
  },
  {
    id: 'cloudy-dusk',
    label: 'Cloudy dusk — sun and birds',
    weather: 'cloudy',
    dayPhase: 'day',
    seed: 0xbb0044ef,
    frames: 172,
    birdDirection: 1,
    devOverrides: {
      timeOverride: 18.5,
      useTimeOverride: true,
      cloudCount: 10,
      cloudOpacity: 1,
      intensity: 1,
      windDirection: 1,
      windStrength: 0.2,
    },
  },
];

export function getScenarioById(id: string): CaptureScenario {
  const trimmed = id.trim() || MARKETPLACE_SCENARIO_IDS[1];
  return CAPTURE_SCENARIOS.find((s) => s.id === trimmed) ?? CAPTURE_SCENARIOS[1];
}

export function getScenarioFromLocation(): CaptureScenario {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('scene');
  const fromHash = window.location.hash.replace(/^#/, '').trim();
  return getScenarioById(fromQuery ?? fromHash ?? MARKETPLACE_SCENARIO_IDS[1]);
}
