import { config } from "./config.js";
import { createApp } from "./server/app.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port}`);
});
