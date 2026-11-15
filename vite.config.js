import { defineConfig, loadEnv } from 'vite';
import { createGateway } from './server/gateway.js';
import { createHouseStore } from './server/house-store.js';

export default defineConfig(({ mode }) => {
  // HA_* variables stay on the server; they are never sent to the browser
  const env = loadEnv(mode, process.cwd(), 'HA_');
  const use = (server) => {
    server.middlewares.use(
      createGateway({ url: env.HA_URL, token: env.HA_TOKEN, readOnly: env.HA_READ_ONLY !== 'false', control: (env.HA_CONTROL_DOMAINS ?? '').split(',').map((d) => d.trim()).filter(Boolean) })
    );
    // your house lives in data/ (not in the repo); HOUSE_DATA_DIR moves it elsewhere
    server.middlewares.use(createHouseStore({ dir: process.env.HOUSE_DATA_DIR ?? 'data' }));
  };
  return {
    // GitHub Pages serves the site from /<repo>/; the workflow sets VITE_BASE for that
    base: process.env.VITE_BASE ?? '/',
    // edit mode rewrites data/house.yaml; don't reload the page every time it does
    server: { watch: { ignored: ['**/data/**'] } },
    plugins: [{ name: 'house-twin', configureServer: use, configurePreviewServer: use }],
  };
});
