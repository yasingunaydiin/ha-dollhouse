# House Twin

An interactive 3D dollhouse of your home that shows the live state of your Home Assistant devices. Lights glow, climate and cameras open their own dialogs, and the sun and moon follow the real sky. You build the house yourself in the browser: draw walls, add doors and windows, and place furniture from a catalog.

Built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/). No Home Assistant? A built-in simulation fakes the devices and the time of day.

## Features

- **Isometric 3D view** of every floor. Select a floor to lift the ones above it away and cut the walls open on the side facing you.
- **Live mode** mirrors your real Home Assistant entities. Lights follow their on/off state and brightness, and the sun and moon follow `sun.sun`.
- **Simulated mode** works without Home Assistant. It has a time-of-day slider, and entities that don't exist are faked.
- **Floor-plan editor** (Plan) for rooms, walls, doors, windows and furniture, with multi-select, undo/redo and a 3D pane beside the plan.
- **3D edit mode** (Edit): drag, rotate and remove objects directly in the scene.
- **Furniture catalog** with a large set of built-in procedural models. You can also use your own `.glb` files.
- **Control dialogs** for climate and cameras.
- **Export / Import** the whole house (layout, furniture and entity links) as a single JSON file.

## Getting started

Requires a current Node.js (Vite 8 needs 20.19 or newer).

```sh
npm install
npm run dev
```

Open the URL Vite prints. On first start the app copies the empty templates from `templates/` into `data/`. Your house is saved there and is not part of the repo. Set `HOUSE_DATA_DIR` to keep it somewhere else.

To build a production bundle, run `npm run build`. `npm run preview` serves it.

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
