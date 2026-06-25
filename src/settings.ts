import * as vscode from 'vscode';
import { DEFAULT_SETTINGS, PanelPosition, SnowSeasonMode, WeatherSettings, WeatherUiMode } from './shared/types';

export async function applyPanelPosition(position: PanelPosition): Promise<void> {
  const command =
    position === 'top'
      ? 'workbench.action.positionPanelTop'
      : 'workbench.action.positionPanelBottom';
  await vscode.commands.executeCommand(command);
}

export function readSettings(): WeatherSettings {
  const config = vscode.workspace.getConfiguration('weather');
  let cycleIntervalMin = config.get<number>('cycleIntervalMin', DEFAULT_SETTINGS.cycleIntervalMin);
  let cycleIntervalMax = config.get<number>('cycleIntervalMax', DEFAULT_SETTINGS.cycleIntervalMax);
  if (cycleIntervalMax < cycleIntervalMin) {
    cycleIntervalMax = cycleIntervalMin;
  }

  return {
    enabled: config.get<boolean>('enabled', DEFAULT_SETTINGS.enabled),
    showOnStartup: config.get<boolean>('showOnStartup', DEFAULT_SETTINGS.showOnStartup),
    panelPosition: config.get<PanelPosition>('panelPosition', DEFAULT_SETTINGS.panelPosition),
    intensity: config.get<number>('intensity', DEFAULT_SETTINGS.intensity),
    birds: config.get<boolean>('birds', DEFAULT_SETTINGS.birds),
    mountains: config.get<boolean>('mountains', DEFAULT_SETTINGS.mountains),
    dayNight: config.get<boolean>('dayNight', DEFAULT_SETTINGS.dayNight),
    lightning: config.get<boolean>('lightning', DEFAULT_SETTINGS.lightning),
    snowSeason: config.get<SnowSeasonMode>('snowSeason', DEFAULT_SETTINGS.snowSeason),
    cycleIntervalMin,
    cycleIntervalMax,
    pauseWhenHidden: config.get<boolean>('pauseWhenHidden', DEFAULT_SETTINGS.pauseWhenHidden),
    uiMode: config.get<WeatherUiMode>('uiMode', DEFAULT_SETTINGS.uiMode),
  };
}

export async function writeSetting<K extends keyof WeatherSettings>(
  key: K,
  value: WeatherSettings[K]
): Promise<void> {
  const config = vscode.workspace.getConfiguration('weather');
  await config.update(key, value, vscode.ConfigurationTarget.Global);
}

export async function setUiMode(mode: WeatherUiMode): Promise<void> {
  await writeSetting('uiMode', mode);
}

export const EXTENSION_SETTINGS_FILTER = '@ext:quin10o5.pixel-weather';

function isCursor(): boolean {
  return vscode.env.appName.toLowerCase().includes('cursor');
}

export function openExtensionSettings(): Thenable<unknown> {
  // Cursor hangs when openSettings is called with a search/filter query.
  // https://forum.cursor.com/t/workbench-action-opensettings-with-a-query-hangs-the-settings-page-in-cursor-works-in-vs-code/163463
  if (isCursor()) {
    return vscode.commands.executeCommand('workbench.action.openSettings', { focusSearch: true });
  }
  return vscode.commands.executeCommand('workbench.action.openSettings', EXTENSION_SETTINGS_FILTER);
}
