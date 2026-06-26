# Pixel Weather

**Turn an unused terminal into a living artwork.**

A procedural pixel landscape in your editor panel. 

Clouds, rain, storms, mountains, and seasonal snow that follow your local time and calendar. 

Unique events to spice things up

**Customizable** -- **Free** -- **Open Source**.

## Screenshots

**In IDE**

![In IDE](https://raw.githubusercontent.com/Quin10o5/Pixel-Weather/main/media/screenshots/full-ide.png)

**Rain and sun**

![Rain and sun](https://raw.githubusercontent.com/Quin10o5/Pixel-Weather/main/media/screenshots/rain-sun.png)

**Snowy night — moon, mountains, and birds**

![Snowy night with moon and birds](https://raw.githubusercontent.com/Quin10o5/Pixel-Weather/main/media/screenshots/snow-moon.png)

**Cloudy dusk**

![Cloudy dusk with sun and birds](https://raw.githubusercontent.com/Quin10o5/Pixel-Weather/main/media/screenshots/cloudy-dusk.png)

Screenshots use a transparent background so you can see how the strip sits over a theme.

## Getting started

1. Install **Pixel Weather** from the marketplace.
2. On first launch, the extension opens the **Panel** (default: top of the window).
3. Resize the panel to **120–200 px** — enough height for mountains, sky, and weather along the bottom edge.

The scene lives in the editor panel area (VS Code does not allow drawing over code itself). Rain and snow settle along the bottom of the strip, like a window sill.

Use the **☰** menu in the panel for quick settings, or open full extension settings from the command palette.

**Tip:** If your terminal used to live in that panel, move Pixel Weather to the slot you ignore. **Settings → Panel position** can place it top or bottom.

## Settings

**Settings → Extensions → Pixel Weather**, or run **Pixel Weather: Open Extension Settings**.

Most options are also in the in-panel **☰** menu. Winter dates appear when snow season is **Auto**; night hours appear when **Day & night** is on.

| Setting | Default | Description |
|---------|---------|-------------|
| `weather.enabled` | `true` | Show the scene |
| `weather.showOnStartup` | `true` | Open the panel when the editor starts |
| `weather.panelPosition` | `top` | Panel above or below the editor |
| `weather.intensity` | `1.0` | Effect strength (0–2) |
| `weather.dayNight` | `true` | Sun, moon, and stars from local time |
| `weather.nightEndHour` | `6.5` | When night ends / day begins (sunrise). Decimals = half hours (`6.5` = 6:30 AM) |
| `weather.nightStartHour` | `19.5` | When night begins / day ends (sunset). `19.5` = 7:30 PM |
| `weather.birds` | `true` | Occasional bird flocks |
| `weather.mountains` | `true` | Pixel mountains along the horizon |
| `weather.lightning` | `true` | Lightning during storms |
| `weather.snowSeason` | `auto` | When snow can appear: `auto`, `always`, or `never` |
| `weather.winterStartMonth` | `12` | Winter start month (1–12) for `auto` snow |
| `weather.winterStartDay` | `1` | Winter start day |
| `weather.winterEndMonth` | `2` | Winter end month |
| `weather.winterEndDay` | `28` | Winter end day. Ranges can wrap the year (e.g. Dec 1 – Feb 28) |
| `weather.cycleIntervalMin` | `5` | Earliest minutes before weather may change |
| `weather.cycleIntervalMax` | `15` | Latest minutes before weather may change |
| `weather.pauseWhenHidden` | `true` | Pause animation when the panel is collapsed |
| `weather.uiMode` | `normal` | In-panel menu: `normal` or `dev` |

Switch the in-panel menu with **Pixel Weather: Use Normal Settings Mode** / **Pixel Weather: Use Developer Mode**. Developer mode adds live overrides for testing weather, time, and wind.

## Commands

| Command | Description |
|---------|-------------|
| **Pixel Weather: Show Panel** | Move panel to your chosen position and open the scene |
| **Pixel Weather: Open Extension Settings** | Open settings |
| **Pixel Weather: Toggle Settings Menu** | Open the in-panel ☰ menu |

## Development

```bash
npm install
npm run build
npm run screenshot    # hero image → media/screenshot.png
npm run screenshots   # marketplace gallery → media/screenshots/
```

Press **F5** to launch the Extension Development Host.

## License / Source

MIT
