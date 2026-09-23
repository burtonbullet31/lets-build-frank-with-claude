import { createApp, hasConsole } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Frank ${config.version} listening on :${config.port}`);
  console.log(`  MCP     POST /mcp`);
  console.log(`  health  GET  /healthz`);
  console.log(`  console ${hasConsole() ? 'GET  /' : 'not built into this image (ADR-003)'}`);
});
