import { PanelPosition, SnowSeasonMode, WeatherSettings } from '../shared/types';

export interface NormalSettingsBridge {
  updateSetting<K extends keyof WeatherSettings>(key: K, value: WeatherSettings[K]): void;
}

function intensityLabel(value: number): string {
  if (value < 0.75) {
    return 'Subtle';
  }
  if (value <= 1.25) {
    return 'Balanced';
  }
  return 'Vivid';
}

export class NormalControls {
  constructor(private bridge: NormalSettingsBridge) {
    this.bindControls();
  }

  sync(settings: WeatherSettings): void {
    this.setChecked('chk-enabled', settings.enabled);
    this.setChecked('chk-show-on-startup', settings.showOnStartup);
    this.setChecked('chk-pause-hidden', settings.pauseWhenHidden);
    this.setChecked('chk-birds', settings.birds);
    this.setChecked('chk-mountains', settings.mountains);
    this.setChecked('chk-day-night', settings.dayNight);
    this.setChecked('chk-lightning', settings.lightning);

    const panelPosition = document.getElementById('sel-panel-position') as HTMLSelectElement | null;
    if (panelPosition) {
      panelPosition.value = settings.panelPosition;
    }

    const snowSeason = document.getElementById('sel-snow-season') as HTMLSelectElement | null;
    if (snowSeason) {
      snowSeason.value = settings.snowSeason;
    }

    const slider = document.getElementById('slider-strength') as HTMLInputElement | null;
    const label = document.getElementById('val-strength');
    if (slider) {
      slider.value = String(settings.intensity);
    }
    if (label) {
      label.textContent = intensityLabel(settings.intensity);
    }

    this.setNumberInput('input-cycle-min', settings.cycleIntervalMin);
    this.setNumberInput('input-cycle-max', settings.cycleIntervalMax);
  }

  private bindControls(): void {
    this.bindCheckbox('chk-enabled', 'enabled');
    this.bindCheckbox('chk-show-on-startup', 'showOnStartup');
    this.bindCheckbox('chk-pause-hidden', 'pauseWhenHidden');
    this.bindCheckbox('chk-birds', 'birds');
    this.bindCheckbox('chk-mountains', 'mountains');
    this.bindCheckbox('chk-day-night', 'dayNight');
    this.bindCheckbox('chk-lightning', 'lightning');

    const panelPosition = document.getElementById('sel-panel-position') as HTMLSelectElement | null;
    panelPosition?.addEventListener('change', () => {
      this.bridge.updateSetting('panelPosition', panelPosition.value as PanelPosition);
    });

    const snowSeason = document.getElementById('sel-snow-season') as HTMLSelectElement | null;
    snowSeason?.addEventListener('change', () => {
      this.bridge.updateSetting('snowSeason', snowSeason.value as SnowSeasonMode);
    });

    const slider = document.getElementById('slider-strength') as HTMLInputElement | null;
    const label = document.getElementById('val-strength');
    slider?.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      if (label) {
        label.textContent = intensityLabel(value);
      }
      this.bridge.updateSetting('intensity', value);
    });

    this.bindNumberInput('input-cycle-min', 'cycleIntervalMin', 3, 120);
    this.bindNumberInput('input-cycle-max', 'cycleIntervalMax', 5, 180);
  }

  private bindCheckbox(id: string, key: keyof WeatherSettings): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.addEventListener('change', () => {
      this.bridge.updateSetting(key, input.checked as WeatherSettings[typeof key]);
    });
  }

  private bindNumberInput(
    id: string,
    key: 'cycleIntervalMin' | 'cycleIntervalMax',
    min: number,
    max: number
  ): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.addEventListener('change', () => {
      const value = Math.min(max, Math.max(min, parseInt(input.value, 10) || min));
      input.value = String(value);
      this.bridge.updateSetting(key, value);
    });
  }

  private setChecked(id: string, checked: boolean): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) {
      input.checked = checked;
    }
  }

  private setNumberInput(id: string, value: number): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) {
      input.value = String(value);
    }
  }
}
