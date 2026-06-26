import { CanvasRenderer } from '../renderer/CanvasRenderer';
import {
  DEFAULT_DEV_OVERRIDES,
  DEFAULT_SETTINGS,
  DevOverrides,
  HostMessage,
  WeatherSettings,
  WeatherState,
  WebviewMessage,
  celestialScheduleFromSettings,
  getDayPhase,
} from '../shared/types';
import { PerformanceMonitor } from './PerformanceMonitor';
import { SceneDevBridge } from './SceneDevBridge';
import { SettingsMenu } from './SettingsMenu';

let vscodeApi: { postMessage(message: WebviewMessage): void } | undefined;

function getVsCodeApi(): { postMessage(message: WebviewMessage): void } {
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi();
  }
  return vscodeApi;
}

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
};

function main(): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement | null;
  if (!canvas) {
    return;
  }

  const vscode = getVsCodeApi();
  const renderer = new CanvasRenderer(canvas);
  const perf = new PerformanceMonitor();
  const fpsOverlay = document.getElementById('fps-overlay');

  let devOverrides: DevOverrides = { ...DEFAULT_DEV_OVERRIDES };
  let currentWeather: WeatherState = 'sunny';
  let benchmarkRunning = false;
  let currentSettings: WeatherSettings = { ...DEFAULT_SETTINGS };
  let settingsMenu: SettingsMenu | undefined;

  function applySettingsLocally(settings: WeatherSettings): void {
    currentSettings = settings;
    renderer.handleMessage({ type: 'settings', settings });
    renderer.handleMessage({
      type: 'dayPhase',
      dayPhase: getDayPhase(new Date(), celestialScheduleFromSettings(settings)),
    });
    pauseWhenHidden = settings.pauseWhenHidden;
    updateRunningState();
    settingsMenu?.onSettingsChange(settings);
  }

  async function runBenchmark(): Promise<string> {
    if (benchmarkRunning) {
      return 'Benchmark already running…';
    }
    benchmarkRunning = true;
    const savedOverrides = { ...devOverrides };
    const savedWeather = currentWeather;

    currentWeather = 'thunderstorm';
    renderer.handleMessage({ type: 'weather', weather: 'thunderstorm' });
    vscode.postMessage({ type: 'setWeather', weather: 'thunderstorm' });

    devOverrides = {
      ...savedOverrides,
      intensity: 2,
      rainDensity: 2,
      cloudCount: 8,
      cloudOpacity: 1,
    };
    renderer.setDevOverrides(devOverrides);
    perf.visible = true;

    perf.startBenchmark();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const result = perf.stopBenchmark();

    devOverrides = { ...savedOverrides };
    renderer.setDevOverrides(devOverrides);
    currentWeather = savedWeather;
    renderer.handleMessage({ type: 'weather', weather: savedWeather });

    benchmarkRunning = false;
    return perf.formatBenchmark(result);
  }

  const devBridge = new SceneDevBridge(
    renderer,
    vscode,
    perf,
    runBenchmark,
    (overrides) => {
      devOverrides = overrides;
    }
  );

  settingsMenu = new SettingsMenu(
    {
      updateSetting(key, value) {
        applySettingsLocally({ ...currentSettings, [key]: value });
        vscode.postMessage({ type: 'updateSetting', setting: key, value });
      },
    },
    devBridge,
    { ...DEFAULT_SETTINGS }
  );

  let pauseWhenHidden = DEFAULT_SETTINGS.pauseWhenHidden;
  let panelVisible = true;
  let last = performance.now();
  let running = true;

  function updateRunningState(): void {
    if (!pauseWhenHidden) {
      running = true;
      return;
    }
    running = !document.hidden && panelVisible;
    if (running) {
      last = performance.now();
    }
  }

  function resize(): void {
    const w = document.body.clientWidth || window.innerWidth;
    const h = document.body.clientHeight || window.innerHeight;
    renderer.resize(w, h);
  }

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(document.body);
  window.addEventListener('resize', resize);
  resize();

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (renderer.handleClick(x, y)) {
      e.stopPropagation();
    }
  });

  document.addEventListener('visibilitychange', () => {
    updateRunningState();
  });

  window.addEventListener('message', (event) => {
    const msg = event.data as HostMessage;
    if (!msg?.type) {
      return;
    }

    if (msg.type === 'toggleSettingsMenu') {
      settingsMenu?.toggleMenu();
      return;
    }

    if (msg.type === 'weather' && msg.weather) {
      currentWeather = msg.weather;
      renderer.handleMessage(msg);
      return;
    }

    if (msg.type === 'devOverrides' && msg.devOverrides) {
      devOverrides = { ...devOverrides, ...msg.devOverrides };
      renderer.setDevOverrides(devOverrides);
      return;
    }

    if (msg.type === 'triggerLightning') {
      renderer.getLightningSystem().triggerLightning();
      return;
    }

    if (msg.type === 'triggerBirds') {
      renderer.getBirdSystem().triggerFlock();
      return;
    }

    if (msg.type === 'triggerInchworm') {
      renderer.getInchwormSystem().triggerInchworm();
      return;
    }

    if (msg.type === 'triggerFireflies') {
      renderer.getFireflySystem().triggerFireflies();
      return;
    }

    if (msg.type === 'triggerRainbow') {
      renderer.getRainbowSystem().triggerRainbow();
      return;
    }

    if (msg.type === 'showFps') {
      perf.visible = msg.visible ?? false;
      return;
    }

    if (msg.type === 'visibility') {
      panelVisible = msg.visible ?? true;
      renderer.handleMessage(msg);
      updateRunningState();
      return;
    }

    renderer.handleMessage(msg);

    if ((msg.type === 'settings' || msg.type === 'init') && msg.settings) {
      currentSettings = msg.settings;
      pauseWhenHidden = msg.settings.pauseWhenHidden;
      updateRunningState();
      settingsMenu?.onSettingsChange(msg.settings);
    }
  });

  vscode.postMessage({ type: 'ready' });

  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (running) {
      const t0 = performance.now();
      renderer.update(dt);
      const t1 = performance.now();
      renderer.draw();
      const t2 = performance.now();
      perf.recordFrame(t1 - t0, t2 - t1, now);

      if (fpsOverlay && perf.visible) {
        fpsOverlay.hidden = false;
        fpsOverlay.textContent = perf.getOverlayText();
      } else if (fpsOverlay) {
        fpsOverlay.hidden = true;
      }
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

main();
