import { FrontworkWebservice } from "../frontwork-service.ts";
import { APP_CONFIG } from "./test.routes.ts";

const __DIRNAME = new URL('.', import.meta.url).pathname.replace("/C:", "C:");
if(Deno.build.os === "windows" && __DIRNAME.charAt(0) === "/") __DIRNAME.substring(1, __DIRNAME.length);

new FrontworkWebservice(APP_CONFIG)
    .setup_assets_resolver(__DIRNAME + 'assets')
    .setup_style_css(__DIRNAME + '/dist/style.css')
    .setup_main_js(__DIRNAME + '/dist/main.js')
    .start();