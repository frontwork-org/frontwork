import { FrontworkWebservice } from "https://deno.land/x/frontwork@0.0.20/frontwork-service.ts";
import { APP_CONFIG } from "./environments/environment.ts";
import { EnvironmentStage } from './dependencies.ts';


let __dir = new URL('.', import.meta.url).pathname.replace("/C:", "C:");
if(Deno.build.os === "windows" && __dir.charAt(0) === "/") __dir.substring(1, __dir.length);

// Required for binary run.
if (APP_CONFIG.stage !== EnvironmentStage.Development || __dir.includes("/tmp/") || __dir.includes("/temp/")) {
    __dir = Deno.execPath().split("/").slice(0, -1).join("/");
}

new FrontworkWebservice(APP_CONFIG)
    .setup_assets_resolver(__dir + '/assets')
    .setup_style_css(__dir + '/style.css')
    .setup_main_js(__dir + '/main.client.js')
    .start();