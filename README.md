# Pixel Weather

**Turn an unused terminal into a living artwork.**

That empty panel above or below your editor — the one you never open — is perfect canvas. Pixel Weather fills it with a small, hand-tuned pixel landscape: mountains on the horizon, clouds that drift, weather that changes on its own, and a sky that follows your local time. It uses your editor background color, so it reads as part of the workspace instead of a widget bolted on top.

A quiet strip of atmosphere while you work. Not a dashboard. Not a forecast app. Just scenery.

## Why put this in your panel?

Most setups have a terminal panel that sits collapsed or half-forgotten. Pixel Weather gives that space a purpose: **ambient art that happens to be weather.** No notifications, no data overload — only motion, mood, and the occasional bird.

- **Living, not looping** — conditions shift every few minutes with smooth transitions between sun, cloud, rain, fog, thunder, and winter snow.
- **Theme-native** — draws on your editor background so light and dark themes both feel right.
- **Time-aware** — optional sun, moon, stars, and dusk from your local clock.
- **Horizon detail** — layered pixel mountains with seasonal snow caps; toggle off if you prefer open sky.
- **Small surprises** — birds, fireflies, rainbows after storms, and rare visitors along the ground.
- **Respectful of focus** — pauses when hidden; tunable intensity; no sound.

## Screenshots

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

The scene lives in the editor panel area (VS Code does not allow drawing over code itself). Rain and snow settle along the bottom of the strip, right where it meets your editor — like a window sill.

Use the **☰** menu in the panel for quick settings, or open full extension settings from the command palette.

**Tip:** If your terminal used to live in that panel, move Pixel Weather to the slot you ignore. **Settings → Panel position** can place it top or bottom.

## Settings

**Settings → Extensions → Pixel Weather**, or run **Pixel Weather: Open Extension Settings**.

| Setting | Default | Description |
|---------|---------|-------------|
| `weather.enabled` | `true` | Show the scene |
| `weather.showOnStartup` | `true` | Open the panel when the editor starts |
| `weather.panelPosition` | `top` | Panel above or below the editor |
| `weather.intensity` | `1.0` | Effect strength (0–2) |
| `weather.dayNight` | `true` | Sun/moon cycle from local time |
| `weather.birds` | `true` | Occasional bird flocks |
| `weather.mountains` | `true` | Pixel mountains along the horizon |
| `weather.lightning` | `true` | Lightning during storms |
| `weather.snowSeason` | `auto` | When snow can appear (`auto` / `always` / `never`) |
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

## License

MIT
