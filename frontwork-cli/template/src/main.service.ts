import { FrontworkWebservice } from "./dependencies.ts";
import { APP_CONFIG } from "./environments/environment.ts";

const __dirname = new URL('.', import.meta.url).pathname;

new FrontworkWebservice(APP_CONFIG)
    .setup_assets_resolver(__dirname + 'assets')
    .setup_main_js(__dirname + 'dist/main.js')
    .start()
;