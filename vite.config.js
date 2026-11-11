import { defineConfig, loadEnv } from 'vite';
import { createGateway } from './server/gateway.js';
import { createHouseEditor } from './server/house-editor.js';

export default defineConfig(({ mode }) => {
  // HA_* variables stay on the server; they are never sent to the browser
  const env = loadEnv(mode, process.cwd(), 'HA_');
  const use = (server) => {
    server.middlewares.use(
      createGateway({ url: env.HA_URL, token: env.HA_TOKEN, readOnly: env.HA_READ_ONLY !== 'false', control: (env.HA_CONTROL_DOMAINS ?? '').split(',').map((d) => d.trim()).filter(Boolean) })
    );
    server.middlewares.use(createHouseEditor('public/house/house.yaml'));
  };
  return {
    // edit mode rewrites house.yaml; don't reload the page every time it does
    server: { watch: { ignored: ['**/public/house/**'] } },
    plugins: [{ name: 'house-twin', configureServer: use, configurePreviewServer: use }],
  };
});
