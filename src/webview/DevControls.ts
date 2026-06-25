import {
  DEFAULT_DEV_OVERRIDES,
  DevOverrides,
  formatDayOfYear,
  getDayOfYear,
  WeatherState,
} from '../shared/types';
import { DevControlsBridge } from './DevControlsBridge';

function formatHour(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export class DevControls {
  private overrides: DevOverrides = {
    ...DEFAULT_DEV_OVERRIDES,
    dateOverrideDayOfYear: getDayOfYear(),
  };

  constructor(private bridge: DevControlsBridge) {
    this.bindControls();
    this.bridge.setDevOverrides(this.overrides);
  }

  private bindControls(): void {
    const weatherButtons: { state: WeatherState; id: string }[] = [
      { state: 'sunny', id: 'btn-sunny' },
      { state: 'cloudy', id: 'btn-cloudy' },
      { state: 'rain', id: 'btn-rain' },
      { state: 'thunderstorm', id: 'btn-thunder' },
    ];

    for (const { state, id } of weatherButtons) {
      document.getElementById(id)?.addEventListener('click', () => {
        this.bridge.applyWeather(state);
      });
    }

    document.getElementById('btn-cycle')?.addEventListener('click', () => {
      this.bridge.cycleNow();
    });

    document.getElementById('btn-lightning')?.addEventListener('click', () => {
      this.bridge.triggerLightning();
    });

    document.getElementById('btn-birds')?.addEventListener('click', () => {
      this.bridge.triggerBirds();
    });

    document.getElementById('btn-inchworm')?.addEventListener('click', () => {
      this.bridge.triggerInchworm();
    });

    document.getElementById('btn-fireflies')?.addEventListener('click', () => {
      this.bridge.triggerFireflies();
    });

    document.getElementById('btn-rainbow')?.addEventListener('click', () => {
      this.bridge.triggerRainbow();
    });

    document.getElementById('btn-benchmark')?.addEventListener('click', () => {
      void this.runBenchmark();
    });

    const showFps = document.getElementById('chk-show-fps') as HTMLInputElement | null;
    showFps?.addEventListener('change', () => {
      this.bridge.setShowFps(showFps.checked);
    });

    const timeOverride = document.getElementById('chk-time-override') as HTMLInputElement | null;
    timeOverride?.addEventListener('change', () => {
      this.overrides.useTimeOverride = timeOverride.checked;
      this.bridge.setDevOverrides(this.overrides);
    });

    const dateOverride = document.getElementById('chk-date-override') as HTMLInputElement | null;
    dateOverride?.addEventListener('change', () => {
      this.overrides.useDateOverride = dateOverride.checked;
      this.bridge.setDevOverrides(this.overrides);
    });

    this.bindSlider('slider-intensity', 'val-intensity', (v) => {
      this.overrides.intensity = v;
    });
    this.bindSlider('slider-wind', 'val-wind', (v) => {
      this.overrides.windStrength = v;
    });
    this.bindSlider('slider-rain', 'val-rain', (v) => {
      this.overrides.rainDensity = v;
    });
    this.bindSlider('slider-clouds', 'val-clouds', (v) => {
      this.overrides.cloudCount = Math.round(v);
    });
    this.bindSlider('slider-cloud-opacity', 'val-cloud-opacity', (v) => {
      this.overrides.cloudOpacity = v;
    });

    const timeSlider = document.getElementById('slider-time') as HTMLInputElement | null;
    const timeLabel = document.getElementById('val-time');
    if (timeSlider) {
      timeSlider.addEventListener('input', () => {
        const value = parseFloat(timeSlider.value);
        this.overrides.timeOverride = value;
        if (timeLabel) {
          timeLabel.textContent = formatHour(value);
        }
        this.bridge.setDevOverrides(this.overrides);
      });
    }

    const dateSlider = document.getElementById('slider-date') as HTMLInputElement | null;
    const dateLabel = document.getElementById('val-date');
    const todayDoy = getDayOfYear();
    if (dateSlider) {
      dateSlider.value = String(this.overrides.dateOverrideDayOfYear ?? todayDoy);
      if (dateLabel) {
        dateLabel.textContent = formatDayOfYear(parseInt(dateSlider.value, 10));
      }
      dateSlider.addEventListener('input', () => {
        const value = parseInt(dateSlider.value, 10);
        this.overrides.dateOverrideDayOfYear = value;
        if (dateLabel) {
          dateLabel.textContent = formatDayOfYear(value);
        }
        this.bridge.setDevOverrides(this.overrides);
      });
    }

    const windDir = document.getElementById('wind-dir') as HTMLSelectElement | null;
    windDir?.addEventListener('change', () => {
      this.overrides.windDirection = windDir.value === 'left' ? -1 : 1;
      this.bridge.setDevOverrides(this.overrides);
    });
  }

  private async runBenchmark(): Promise<void> {
    const resultEl = document.getElementById('benchmark-result');
    const showFps = document.getElementById('chk-show-fps') as HTMLInputElement | null;

    if (resultEl) {
      resultEl.textContent = 'Benchmark running (5s max load)…';
    }

    if (showFps) {
      showFps.checked = true;
    }
    this.bridge.setShowFps(true);

    const text = await this.bridge.runBenchmark();

    if (resultEl) {
      resultEl.textContent = text;
    }
  }

  private bindSlider(
    sliderId: string,
    labelId: string,
    apply: (value: number) => void
  ): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement | null;
    const label = document.getElementById(labelId);
    if (!slider) {
      return;
    }
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      apply(value);
      if (label) {
        label.textContent = slider.step === '1' ? String(Math.round(value)) : value.toFixed(1);
      }
      this.bridge.setDevOverrides(this.overrides);
    });
  }
}
