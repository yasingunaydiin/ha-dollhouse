# HA Dollhouse

An interactive 3D dollhouse of your home that shows the live state of your Home Assistant devices. Lights glow, climate and cameras open their own dialogs, and the sun and moon follow the real sky. You build the house yourself in the browser: draw walls, add doors and windows, and place furniture from a catalog.

Built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/). No Home Assistant? A built-in simulation fakes the devices and the time of day.

## Features

- **Isometric 3D view** of every floor. Select a floor to lift the ones above it away and cut the walls open on the side facing you.
- **Live mode** mirrors your real Home Assistant entities. Lights follow their on/off state and brightness, and the sun and moon follow `sun.sun`.
- **Real-time weather** over the plot: rain, snow, cloud cover that dims the sun, wind and lightning. It comes from a Home Assistant `weather.*` entity, or from [Open-Meteo](https://open-meteo.com/) for your coordinates (`location` in `house.yaml`, or Home Assistant's home zone). Simulated mode has a weather picker.
- **Simulated mode** works without Home Assistant. It has a time-of-day slider, and entities that don't exist are faked. The **Now** button makes the simulation follow the real time, sun and weather at your location.
- **Floor-plan editor** (Plan) with tools for rooms and ground areas, walls, doors, windows, paint and furniture. It has multi-select, undo/redo and a live 3D pane beside the plan that updates as you draw.
- **3D edit mode** (Edit): drag, rotate and remove objects directly in the scene. A panel lets you turn, raise (for example onto a desk) and resize an object, or reset it to its original size.
- **Furniture catalog** with a large set of built-in procedural models: furniture, decor, tech, shelving, outdoor items and more. You can also use your own `.glb` files.
- **Smart rendering.** Lamp lights are pooled, so a house with many lamps stays fast. Raised walls stay clear of doors and out of the camera's way.
- **Control dialogs** for climate and cameras.
- **Export / Import** the whole house (layout, furniture and entity links) as a single JSON file.
- **Static hosting.** The app also runs as a plain static site (for example on GitHub Pages) with no server. Edits are kept in your browser, and Export / Import still work. See below.

## Getting started

### 1. Install the tools

You need [Node.js](https://nodejs.org/) 20.19 or newer (it includes `npm`) and [Git](https://git-scm.com/). To check, run `node -v` and `git -v` in a terminal.

### 2. Get the code

```sh
git clone https://github.com/yasingunaydiin/ha-dollhouse.git
cd ha-dollhouse
```

### 3. Install and start it

```sh
npm install
npm run dev
```

`npm install` downloads the dependencies and only needs to run once. `npm run dev` starts the app and prints a local address, usually `http://localhost:5173`. Open it in your browser.

### 4. Try it

The app starts in **Simulated** mode, so it works without Home Assistant. Use the time-of-day slider and the weather picker in the top bar, click **Plan** to draw walls and place furniture, or click **Edit** to move things around in 3D.

On first start the app copies the empty templates from `templates/` into `data/`. Your house is saved there and is not part of the repo. Set `HOUSE_DATA_DIR` to keep it somewhere else.

### 5. Connect your Home Assistant (optional)

To see your real devices, follow [Connecting Home Assistant](#connecting-home-assistant) below, then restart `npm run dev`.

### Building for production

`npm run build` makes a production bundle in `dist/`, and `npm run preview` serves it locally.

## Deploying as a static site

A workflow in [.github/workflows/](.github/workflows/) builds the app and publishes it to GitHub Pages on every push to `main`. It sets `VITE_BASE` to the repository path, so assets load from the right place. Set the same variable if you host it under a sub-path elsewhere:

```sh
VITE_BASE=/ha-dollhouse/ npm run build
```

With no server there is no Home Assistant gateway and no `data/` folder, so the site runs in simulated mode. Your edits are saved in the browser's local storage. Use Export to back them up or move them to another device.

## Connecting Home Assistant

Create a `.env.local` file in the project root:

```sh
HA_URL=http://homeassistant.local:8123
HA_TOKEN=<long-lived access token>
# Optional
HA_READ_ONLY=true              # default; set to false to allow commands
HA_CONTROL_DOMAINS=climate     # domains that may be commanded even while read-only
```

Create the token in Home Assistant under your profile, in the Security tab, as a long-lived access token.

The token stays on the server. A small gateway ([server/gateway.js](server/gateway.js)) holds it, keeps a live copy of all entity states over Home Assistant's WebSocket API and passes them to the browser as server-sent events. The browser never sees the token. Service calls are refused unless you allow them.

Use the **Real / Simulated** button in the top bar to switch modes. If Home Assistant can't be reached, the app falls back to the simulation.

## Linking objects to entities

`data/links.yaml` (started from [templates/links.yaml](templates/links.yaml)) maps an object id from your house to a Home Assistant entity:

```yaml
_sun: sun.sun
living_ceiling: light.living_room
living_tv: media_player.living_room_tv
```

Objects with a linked entity get behavior (lights glow and light the room, thermostats open a climate dialog, cameras show their picture). Objects without a link stay static, and lamps with no entity stay lit.

## Project layout

| Path | What it holds |
| --- | --- |
| `src/main.js` | App startup, top bar, picking and the render loop |
| `src/scene.js` | Renderer, isometric camera, sun, moon and backdrop |
| `src/house/builder.js` | Turns `house.yaml` into 3D floors, walls and objects |
| `src/models/` | Procedural furniture and device models, plus the model registry |
| `src/behaviors.js` | What linked entities do in the scene |
| `src/planner.js`, `src/editor.js`, `src/catalog.js` | Floor-plan editor, 3D edit mode and furniture catalog |
| `src/state/` | Entity store, Home Assistant source and simulation source |
| `server/` | Home Assistant gateway and the store that saves your house |
| `templates/` | The empty house and links every new copy starts from |

Dimensions are in metres. Floor-plan coordinates are `[x, z]`, with y pointing up. The format is documented in the comments at the top of [templates/house.yaml](templates/house.yaml).

## Custom models

Put a `.glb` file in `public/house/models/` and reference it from an object in `house.yaml`:

```yaml
model: models/sofa.glb
```

Built-in model names are registered in `src/models/`.
