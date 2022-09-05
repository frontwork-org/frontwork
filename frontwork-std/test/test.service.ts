import { FrontworkWebservice } from "../frontwork-service.ts";
import { APP_CONFIG } from "./test.routes.ts";

const __dirname = new URL('.', import.meta.url).pathname;

new FrontworkWebservice(APP_CONFIG)
    .setup_assets_resolver(__dirname + 'assets')
    .setup_style_css(__dirname + '/dist/style.css')
    .setup_main_js(__dirname + '/dist/main.js')
    .start();