import * as vscode from 'vscode';
import { openExtensionSettings, writeSetting } from './settings';
import { WeatherManager } from './WeatherManager';
import { HostMessage, WebviewMessage } from './shared/types';

export class WeatherWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'weather.scene';

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly weatherManager: WeatherManager
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    let subscribed = false;

    const onManagerMessage = (msg: HostMessage) => {
      webviewView.webview.postMessage(msg);
    };

    webviewView.webview.onDidReceiveMessage((msg: WebviewMessage) => {
      if (msg.type === 'ready' && !subscribed) {
        subscribed = true;
        this.weatherManager.subscribe(onManagerMessage);
      }
      if (msg.type === 'setWeather' && msg.weather) {
        this.weatherManager.setWeather(msg.weather);
      }
      if (msg.type === 'cycleNow') {
        this.weatherManager.cycleNow();
      }
      if (msg.type === 'updateSetting' && msg.setting !== undefined && msg.value !== undefined) {
        void writeSetting(msg.setting, msg.value);
      }
      if (msg.type === 'openExtensionSettings') {
        setImmediate(() => void openExtensionSettings());
      }
    });

    webviewView.onDidDispose(() => {
      if (subscribed) {
        this.weatherManager.unsubscribe(onManagerMessage);
        subscribed = false;
      }
      if (this.view === webviewView) {
        this.view = undefined;
      }
    });

    webviewView.onDidChangeVisibility(() => {
      webviewView.webview.postMessage({
        type: 'visibility',
        visible: webviewView.visible,
      });
    });
  }

  postMessage(msg: HostMessage): void {
    this.view?.webview.postMessage(msg);
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #ccc);
      font-family: var(--vscode-font-family, system-ui);
      font-size: 11px;
    }
    #scene {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: auto;
      cursor: default;
    }
    #ui-layer {
      position: fixed;
      inset: 0;
      z-index: 100;
      pointer-events: none;
    }
    #settings-btn {
      position: fixed;
      top: 5px;
      right: 5px;
      z-index: 102;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.38);
      line-height: 0;
      transition: color 0.15s ease;
    }
    #settings-btn:hover,
    #settings-btn[aria-expanded="true"] {
      color: rgba(255, 255, 255, 0.72);
    }
    #settings-btn svg {
      width: 13px;
      height: 13px;
      fill: currentColor;
    }
    #settings-menu {
      position: fixed;
      inset: 0;
      z-index: 101;
      pointer-events: auto;
      width: 100%;
      height: 100%;
      max-height: none;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px 16px 16px;
      border-radius: 0;
      border: none;
      box-shadow: none;
      background: var(--vscode-editorWidget-background, rgba(30, 30, 30, 0.98));
    }
    #settings-menu[hidden] { display: none !important; }
    #settings-menu .menu-header {
      flex-shrink: 0;
    }
    #settings-menu .menu-title {
      font-weight: 600;
      font-size: 14px;
      opacity: 0.95;
    }
    #settings-menu .menu-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }
    #settings-menu .menu-section {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    #settings-menu .menu-section + .menu-section {
      padding-top: 10px;
      border-top: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.25));
    }
    #settings-menu .section-label {
      flex: 1 1 100%;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.7;
      margin-bottom: 2px;
    }
    #settings-menu .menu-hint {
      flex: 1 1 100%;
      font-size: 11px;
      opacity: 0.6;
      line-height: 1.4;
    }
    #settings-menu .check-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 100%;
      font-size: 12px;
    }
    #settings-menu .check-row input[type="checkbox"] {
      width: 14px;
      height: 14px;
    }
    #settings-menu button {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #fff);
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    #settings-menu button:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    #settings-menu .slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 100%;
      font-size: 12px;
    }
    #settings-menu .slider-row > span:first-child {
      min-width: 7.5em;
    }
    #settings-menu .winter-dates-panel {
      margin-top: 0.35em;
      flex: 1 1 100%;
    }
    #settings-menu .winter-dates-panel input[type="number"] {
      width: 3.2em;
    }
    #settings-menu .night-hours-panel {
      margin-top: 0.35em;
      flex: 1 1 100%;
    }
    #settings-menu .night-hours-panel input[type="number"] {
      width: 4.5em;
    }
    #settings-menu input[type="range"] {
      flex: 1;
      min-width: 80px;
      accent-color: var(--vscode-focusBorder, #007acc);
    }
    #settings-menu select,
    #settings-menu input[type="number"] {
      background: var(--vscode-dropdown-background, #3c3c3c);
      color: var(--vscode-dropdown-foreground, #ccc);
      border: 1px solid var(--vscode-dropdown-border, #3c3c3c);
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 12px;
    }
    #settings-menu select {
      flex: 1 1 100%;
    }
    #settings-menu input[type="number"] {
      width: 72px;
    }
    #benchmark-result {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      line-height: 1.35;
      white-space: pre-wrap;
      opacity: 0.9;
      flex: 1 1 100%;
    }
    #fps-overlay {
      position: fixed;
      top: 8px;
      left: 8px;
      z-index: 99;
      pointer-events: none;
      padding: 6px 8px;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10px;
      line-height: 1.35;
      white-space: pre;
      background: rgba(0, 0, 0, 0.55);
      color: #b8f0b8;
      border: 1px solid rgba(128, 128, 128, 0.35);
    }
    #fps-overlay[hidden] { display: none !important; }
  </style>
</head>
<body>
  <canvas id="scene"></canvas>
  <div id="ui-layer">
    <button id="settings-btn" type="button" title="Settings" aria-label="Settings" aria-expanded="false">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1" y="3" width="14" height="1.4" rx="0.7"/>
        <rect x="1" y="7.3" width="14" height="1.4" rx="0.7"/>
        <rect x="1" y="11.6" width="14" height="1.4" rx="0.7"/>
      </svg>
    </button>
    <div id="settings-menu" hidden role="dialog" aria-label="Settings">
      <div class="menu-header">
        <div id="settings-menu-title" class="menu-title">Settings</div>
      </div>
      <div class="menu-body">
      <div id="normal-panel">
        <div class="menu-section">
          <span class="section-label">Scene</span>
          <label class="check-row">
            <input id="chk-enabled" type="checkbox" checked />
            <span>Show weather</span>
          </label>
          <p class="menu-hint">Turn the animated sky on or off.</p>
        </div>
        <div class="menu-section">
          <span class="section-label">Panel</span>
          <label class="check-row">
            <input id="chk-show-on-startup" type="checkbox" checked />
            <span>Open on startup</span>
          </label>
          <div class="slider-row">
            <span>Position</span>
            <select id="sel-panel-position" aria-label="Panel position">
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
          <label class="check-row">
            <input id="chk-pause-hidden" type="checkbox" checked />
            <span>Pause when hidden</span>
          </label>
          <p class="menu-hint">Place the weather bar above or below the editor. Pause animation when the panel is collapsed.</p>
        </div>
        <div class="menu-section">
          <span class="section-label">Look</span>
          <div class="slider-row">
            <span>Strength</span>
            <input id="slider-strength" type="range" min="0" max="2" step="0.1" value="1" />
            <span id="val-strength">Balanced</span>
          </div>
          <p class="menu-hint">How strong rain, clouds, snow, and other effects appear.</p>
        </div>
        <div class="menu-section">
          <span class="section-label">Details</span>
          <label class="check-row">
            <input id="chk-birds" type="checkbox" checked />
            <span>Birds</span>
          </label>
          <label class="check-row">
            <input id="chk-mountains" type="checkbox" checked />
            <span>Mountains</span>
          </label>
          <label class="check-row">
            <input id="chk-day-night" type="checkbox" checked />
            <span>Day &amp; night</span>
          </label>
          <div id="night-hours-panel" class="night-hours-panel">
            <div class="slider-row">
              <span>Night ends</span>
              <input id="input-night-end-hour" type="number" min="0" max="23.75" step="0.25" value="6.5" aria-label="Night end hour (sunrise)" />
            </div>
            <div class="slider-row">
              <span>Night starts</span>
              <input id="input-night-start-hour" type="number" min="0" max="23.75" step="0.25" value="19.5" aria-label="Night start hour (sunset)" />
            </div>
            <p class="menu-hint">Local hours with decimals for half hours (6.5 = 6:30 AM).</p>
          </div>
          <label class="check-row">
            <input id="chk-lightning" type="checkbox" checked />
            <span>Storm lightning</span>
          </label>
          <div class="slider-row">
            <span>Snow season</span>
            <select id="sel-snow-season" aria-label="Snow season">
              <option value="auto">Auto (winter)</option>
              <option value="always">Always</option>
              <option value="never">Never</option>
            </select>
          </div>
          <div id="winter-dates-panel" class="winter-dates-panel">
            <div class="slider-row">
              <span>Winter start</span>
              <input id="input-winter-start-month" type="number" min="1" max="12" step="1" value="12" aria-label="Winter start month" />
              <span>/</span>
              <input id="input-winter-start-day" type="number" min="1" max="31" step="1" value="1" aria-label="Winter start day" />
            </div>
            <div class="slider-row">
              <span>Winter end</span>
              <input id="input-winter-end-month" type="number" min="1" max="12" step="1" value="2" aria-label="Winter end month" />
              <span>/</span>
              <input id="input-winter-end-day" type="number" min="1" max="31" step="1" value="28" aria-label="Winter end day" />
            </div>
          </div>
          <p class="menu-hint">Birds, mountains, celestial cycle, lightning, and when snow can appear. Winter dates apply when snow season is Auto.</p>
        </div>
        <div class="menu-section">
          <span class="section-label">Weather cycling</span>
          <div class="slider-row">
            <span>Min interval</span>
            <input id="input-cycle-min" type="number" min="3" max="120" step="1" value="5" />
            <span>minutes</span>
          </div>
          <div class="slider-row">
            <span>Max interval</span>
            <input id="input-cycle-max" type="number" min="5" max="180" step="1" value="15" />
            <span>minutes</span>
          </div>
          <p class="menu-hint">How long before weather may change on its own.</p>
        </div>
      </div>
      <div id="dev-panel" hidden>
      <div class="menu-section">
        <span class="section-label">Weather</span>
        <button id="btn-sunny" type="button">Sunny</button>
        <button id="btn-cloudy" type="button">Cloudy</button>
        <button id="btn-rain" type="button">Rain</button>
        <button id="btn-thunder" type="button">Thunder</button>
        <button id="btn-cycle" type="button">Cycle</button>
      </div>
      <div class="menu-section">
        <span class="section-label">Effects</span>
        <button id="btn-lightning" type="button">Flash</button>
        <button id="btn-birds" type="button">Birds</button>
        <button id="btn-inchworm" type="button">Inchworm</button>
        <button id="btn-fireflies" type="button">Fireflies</button>
        <button id="btn-rainbow" type="button">Rainbow</button>
        <button id="btn-benchmark" type="button">Benchmark</button>
        <label class="check-row">
          <input id="chk-show-fps" type="checkbox" />
          <span>Show FPS</span>
        </label>
        <div id="benchmark-result"></div>
      </div>
      <div class="menu-section">
        <span class="section-label">Sliders</span>
        <div class="slider-row">
          <span>Intensity</span>
          <input id="slider-intensity" type="range" min="0" max="2" step="0.1" value="1" />
          <span id="val-intensity">1.0</span>
        </div>
        <div class="slider-row">
          <span>Wind</span>
          <input id="slider-wind" type="range" min="0" max="1" step="0.05" value="0.5" />
          <span id="val-wind">0.5</span>
        </div>
        <div class="slider-row">
          <span>Rain</span>
          <input id="slider-rain" type="range" min="0.2" max="2" step="0.1" value="1" />
          <span id="val-rain">1.0</span>
        </div>
        <div class="slider-row">
          <span>Clouds</span>
          <input id="slider-clouds" type="range" min="1" max="16" step="1" value="8" />
          <span id="val-clouds">4</span>
        </div>
        <div class="slider-row">
          <span>Cloud α</span>
          <input id="slider-cloud-opacity" type="range" min="0.2" max="1" step="0.05" value="1" />
          <span id="val-cloud-opacity">1.0</span>
        </div>
        <select id="wind-dir" aria-label="Wind direction">
          <option value="right">Wind →</option>
          <option value="left">Wind ←</option>
        </select>
      </div>
      <div class="menu-section">
        <span class="section-label">Time &amp; date</span>
        <div class="slider-row">
          <span>Time</span>
          <input id="slider-time" type="range" min="0" max="24" step="0.25" value="12" />
          <span id="val-time">12:00</span>
        </div>
        <label class="check-row">
          <input id="chk-time-override" type="checkbox" />
          <span>Override time</span>
        </label>
        <div class="slider-row">
          <span>Date</span>
          <input id="slider-date" type="range" min="1" max="365" step="1" value="1" />
          <span id="val-date">Jan 1</span>
        </div>
        <label class="check-row">
          <input id="chk-date-override" type="checkbox" />
          <span>Override date</span>
        </label>
      </div>
      </div>
    </div>
    <pre id="fps-overlay" hidden aria-live="polite"></pre>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
