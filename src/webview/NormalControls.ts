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

type WinterDateKey =
  | 'winterStartMonth'
  | 'winterStartDay'
  | 'winterEndMonth'
  | 'winterEndDay';

type NightHourKey = 'nightEndHour' | 'nightStartHour';

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
    this.syncNightHoursVisibility(settings.dayNight);
    this.setChecked('chk-lightning', settings.lightning);

    const panelPosition = document.getElementById('sel-panel-position') as HTMLSelectElement | null;
    if (panelPosition) {
      panelPosition.value = settings.panelPosition;
    }

    const snowSeason = document.getElementById('sel-snow-season') as HTMLSelectElement | null;
    if (snowSeason) {
      snowSeason.value = settings.snowSeason;
    }
    this.syncWinterDatesVisibility(settings.snowSeason);

    this.setNumberInput('input-winter-start-month', settings.winterStartMonth);
    this.setNumberInput('input-winter-start-day', settings.winterStartDay);
    this.setNumberInput('input-winter-end-month', settings.winterEndMonth);
    this.setNumberInput('input-winter-end-day', settings.winterEndDay);

    this.setDecimalInput('input-night-end-hour', settings.nightEndHour);
    this.setDecimalInput('input-night-start-hour', settings.nightStartHour);

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
    this.bindCheckbox('chk-lightning', 'lightning');

    const dayNight = document.getElementById('chk-day-night') as HTMLInputElement | null;
    dayNight?.addEventListener('change', () => {
      this.syncNightHoursVisibility(dayNight.checked);
      this.bridge.updateSetting('dayNight', dayNight.checked);
    });

    const panelPosition = document.getElementById('sel-panel-position') as HTMLSelectElement | null;
    panelPosition?.addEventListener('change', () => {
      this.bridge.updateSetting('panelPosition', panelPosition.value as PanelPosition);
    });

    const snowSeason = document.getElementById('sel-snow-season') as HTMLSelectElement | null;
    snowSeason?.addEventListener('change', () => {
      const mode = snowSeason.value as SnowSeasonMode;
      this.syncWinterDatesVisibility(mode);
      this.bridge.updateSetting('snowSeason', mode);
    });

    this.bindWinterDateInput('input-winter-start-month', 'winterStartMonth', 1, 12);
    this.bindWinterDateInput('input-winter-start-day', 'winterStartDay', 1, 31);
    this.bindWinterDateInput('input-winter-end-month', 'winterEndMonth', 1, 12);
    this.bindWinterDateInput('input-winter-end-day', 'winterEndDay', 1, 31);

    this.bindNightHourInput('input-night-end-hour', 'nightEndHour');
    this.bindNightHourInput('input-night-start-hour', 'nightStartHour');

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

  private syncNightHoursVisibility(enabled: boolean): void {
    const panel = document.getElementById('night-hours-panel');
    if (panel) {
      panel.hidden = !enabled;
    }
  }

  private snapQuarterHour(value: number): number {
    return Math.min(23.75, Math.max(0, Math.round(value * 4) / 4));
  }

  private bindNightHourInput(id: string, key: NightHourKey): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.addEventListener('change', () => {
      const value = this.snapQuarterHour(parseFloat(input.value) || 0);
      input.value = String(value);
      this.bridge.updateSetting(key, value);
    });
  }

  private syncWinterDatesVisibility(mode: SnowSeasonMode): void {
    const panel = document.getElementById('winter-dates-panel');
    if (panel) {
      panel.hidden = mode !== 'auto';
    }
  }

  private bindWinterDateInput(
    id: string,
    key: WinterDateKey,
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

  private setDecimalInput(id: string, value: number): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) {
      input.value = String(this.snapQuarterHour(value));
    }
  }

  private setNumberInput(id: string, value: number): void {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) {
      input.value = String(value);
    }
  }
}
