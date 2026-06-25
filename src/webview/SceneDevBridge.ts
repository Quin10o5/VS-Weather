import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { DevOverrides, WeatherState, WebviewMessage } from '../shared/types';
import { DevControlsBridge } from './DevControlsBridge';
import { PerformanceMonitor } from './PerformanceMonitor';

export class SceneDevBridge implements DevControlsBridge {
  constructor(
    private renderer: CanvasRenderer,
    private vscode: { postMessage(message: WebviewMessage): void },
    private perf: PerformanceMonitor,
    private runBench: () => Promise<string>,
    private onDevOverrides: (overrides: DevOverrides) => void
  ) {}

  setDevOverrides(overrides: DevOverrides): void {
    this.onDevOverrides(overrides);
    this.renderer.setDevOverrides(overrides);
  }

  applyWeather(state: WeatherState): void {
    this.renderer.handleMessage({ type: 'weather', weather: state });
    this.vscode.postMessage({ type: 'setWeather', weather: state });
  }

  cycleNow(): void {
    this.vscode.postMessage({ type: 'cycleNow' });
  }

  triggerLightning(): void {
    this.renderer.getLightningSystem().triggerLightning();
  }

  triggerBirds(): void {
    this.renderer.getBirdSystem().triggerFlock();
  }

  triggerInchworm(): void {
    this.renderer.getInchwormSystem().triggerInchworm();
  }

  triggerFireflies(): void {
    this.renderer.getFireflySystem().triggerFireflies();
  }

  triggerRainbow(): void {
    this.renderer.getRainbowSystem().triggerRainbow();
  }

  setShowFps(visible: boolean): void {
    this.perf.visible = visible;
  }

  runBenchmark(): Promise<string> {
    return this.runBench();
  }
}
