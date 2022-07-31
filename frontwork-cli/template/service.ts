import { FrontworkWebservice } from "./env.ts";
import { init } from "./routes.ts";

const __dirname = new URL('.', import.meta.url).pathname;

new FrontworkWebservice(init)
    .setup_assets_resolver(__dirname + 'assets')
    .setup_main_js(__dirname + 'dist/main.js')
    .start();