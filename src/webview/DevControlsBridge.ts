import { DevOverrides, WeatherState } from '../shared/types';

export interface DevControlsBridge {
  setDevOverrides(overrides: DevOverrides): void;
  applyWeather(state: WeatherState): void;
  cycleNow(): void;
  triggerLightning(): void;
  triggerBirds(): void;
  triggerInchworm(): void;
  triggerFireflies(): void;
  triggerRainbow(): void;
  setShowFps(visible: boolean): void;
  runBenchmark(): Promise<string>;
}
