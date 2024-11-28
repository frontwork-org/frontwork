import { FrontworkWebservice } from "../frontwork-service.ts";
import { APP_CONFIG } from "./test.routes.ts";

let __dir = new URL('.', import.meta.url).pathname.replace("/C:", "C:");
if(Deno.build.os === "windows" && __dir.charAt(0) === "/") __dir.substring(1, __dir.length);

// Required for binary run. See: std_binary_run.sh
if (__dir.includes("/tmp/") || __dir.includes("temp")) {
    __dir = Deno.execPath().split("/").slice(0, -1).join("/");
}

new FrontworkWebservice(APP_CONFIG)
    .setup_assets_resolver(__dir + '/assets')
    .setup_style_css(__dir + '/dist/style.css')
    .setup_main_js(__dir + '/dist/main.js')
    .start();