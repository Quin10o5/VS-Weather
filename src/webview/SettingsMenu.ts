import { DevControls } from './DevControls';
import { DevControlsBridge } from './DevControlsBridge';
import { NormalControls, NormalSettingsBridge } from './NormalControls';
import { WeatherSettings, WeatherUiMode } from '../shared/types';

export class SettingsMenu {
  private menuOpen = false;
  private mode: WeatherUiMode = 'normal';
  private menu: HTMLElement | null;
  private normalPanel: HTMLElement | null;
  private devPanel: HTMLElement | null;
  private titleEl: HTMLElement | null;
  private normalControls: NormalControls;

  constructor(
    normalBridge: NormalSettingsBridge,
    devBridge: DevControlsBridge,
    initialSettings?: WeatherSettings
  ) {
    this.menu = document.getElementById('settings-menu');
    this.normalPanel = document.getElementById('normal-panel');
    this.devPanel = document.getElementById('dev-panel');
    this.titleEl = document.getElementById('settings-menu-title');

    this.normalControls = new NormalControls(normalBridge);
    new DevControls(devBridge);

    document.getElementById('settings-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    this.menu?.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.setMenuOpen(false);
      }
    });

    if (initialSettings) {
      this.applySettings(initialSettings);
    }
  }

  toggleMenu(): void {
    this.setMenuOpen(!this.menuOpen);
  }

  applySettings(settings: WeatherSettings): void {
    this.mode = settings.uiMode;
    this.updateModeDisplay();
    this.normalControls.sync(settings);
  }

  onSettingsChange(settings: WeatherSettings): void {
    this.applySettings(settings);
  }

  private updateModeDisplay(): void {
    const isDev = this.mode === 'dev';
    if (this.normalPanel) {
      this.normalPanel.hidden = isDev;
    }
    if (this.devPanel) {
      this.devPanel.hidden = !isDev;
    }
    if (this.titleEl) {
      this.titleEl.textContent = isDev ? 'Developer' : 'Settings';
    }
  }

  private setMenuOpen(open: boolean): void {
    this.menuOpen = open;
    if (this.menu) {
      this.menu.hidden = !open;
    }
    document.getElementById('settings-btn')?.setAttribute('aria-expanded', String(open));
  }
}
