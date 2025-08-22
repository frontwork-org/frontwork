import { FrontworkSubservice, FrontworkWebservice } from "../frontwork-service.ts";
import { EnvironmentStage, FrontworkRequest } from '../frontwork.ts';
import { APP_CONFIG } from "./test.routes.ts";


export let __dir = new URL('.', import.meta.url).pathname.replace("/C:", "C:");
if(Deno.build.os === "windows" && __dir.charAt(0) === "/") __dir.substring(1, __dir.length);

// Required for binary run.
if (APP_CONFIG.stage !== EnvironmentStage.Development || __dir.includes("/tmp/") || __dir.includes("/temp/")) {
    __dir = Deno.execPath().split("/").slice(0, -1).join("/");
}

// Remove last slash if exist
if (__dir.slice(-1) === "/") __dir = __dir.slice(0, -1);

const __dir_dist = __dir + '/dist';
const __dir_dist_style_css = __dir_dist+"/css/style.css";
const __dir_dist_client_main_js = __dir_dist+"/js/test.client.js";

new FrontworkWebservice(APP_CONFIG, __dir_dist, __dir_dist_style_css, __dir_dist_client_main_js)
    .setup_assets_resolver(__dir + '/assets')
    .set_api_path_prefixes(["/api/", "/files/"])
    .start();