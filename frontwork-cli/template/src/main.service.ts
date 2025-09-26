import { FrontworkWebservice } from "https://deno.land/x/frontwork@0.4.3/frontwork-service.ts";
import { APP_CONFIG } from "./environments/environment.ts";
import { EnvironmentStage } from './dependencies.ts';


let __dir = new URL('.', import.meta.url).pathname.replace("/C:", "C:");
// Remove last slash if exist
if (__dir.slice(-1) === "/") __dir = __dir.slice(0, -1);
let __dir_dist = __dir;
if(Deno.build.os === "windows" && __dir.charAt(0) === "/") __dir.substring(1, __dir.length);

// Required for binary run.
if (APP_CONFIG.stage !== EnvironmentStage.Development || __dir.includes("/tmp/") || __dir.includes("/temp/")) {
    __dir = Deno.execPath().split("/").slice(0, -1).join("/");
} else {
    __dir_dist = __dir.substring(0, __dir.length - "/src".length) + "/dist/development-web"
}

const __dir_dist_style_css = __dir_dist+"/css/style.css";
const __dir_dist_client_main_js = __dir_dist+"/js/main.client.js";

new FrontworkWebservice(APP_CONFIG, __dir_dist, __dir_dist_style_css, __dir_dist_client_main_js)
    .setup_assets_resolver(__dir + '/assets')
    .set_api_path_prefixes(["/api/", "/files/"])
    .start();