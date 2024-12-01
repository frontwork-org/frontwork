import { FrontworkWebservice } from "https://deno.land/x/frontwork@0.0.16/frontwork-service.ts";
import { APP_CONFIG } from "./environments/environment.ts";
import { EnvironmentStage } from './dependencies.ts';


// let assets_dir, style_css_path, main_js_path;
// if (APP_CONFIG.stage === EnvironmentStage.Development) {
//     // DEVELOPMENT: we are in the src directory
//     console.log("  // DEVELOPMENT: we are in the src directory")
//     const DENO_MAINMODULE_PATH = new URL(Deno.mainModule).pathname;
//     const main_module_split = DENO_MAINMODULE_PATH.split("/");
//     main_module_split.pop();
//     const EXEC_DIR = main_module_split.join("/");
//     main_module_split.pop();
//     const PROJECT_DIR =
//     main_module_split.length === 0 ? "/" : main_module_split.join("/");

//     assets_dir = EXEC_DIR + "/assets";
//     style_css_path = PROJECT_DIR + "/dist/development-web/style.css";
//     main_js_path = PROJECT_DIR + "/dist/development-web/main.client.js";
// } else {
//     // PRODUCTION: we are in the dist directory
//     console.log("  // PRODUCTION: we are in the dist directory")
//     const EXEC_DIR = Deno.execPath().split("/").slice(0, -1).join("/");
//     console.log("EXEC_DIR", EXEC_DIR)
//     assets_dir = EXEC_DIR + "/assets";
//     style_css_path = EXEC_DIR + "/style.css";
//     main_js_path = EXEC_DIR + "/main.client.js";
// }

// new FrontworkWebservice(APP_CONFIG)
//   .setup_assets_resolver(assets_dir)
//   .setup_style_css(style_css_path)
//   .setup_main_js(main_js_path)
//   .start();

  ///////////////////////////
let __dir = new URL('.', import.meta.url).pathname.replace("/C:", "C:");
if(Deno.build.os === "windows" && __dir.charAt(0) === "/") __dir.substring(1, __dir.length);

// Required for binary run.
if (APP_CONFIG.stage !== EnvironmentStage.Development || __dir.includes("/tmp/") || __dir.includes("temp")) {
    __dir = Deno.execPath().split("/").slice(0, -1).join("/");
}

new FrontworkWebservice(APP_CONFIG)
    .setup_assets_resolver(__dir + '/assets')
    .setup_style_css(__dir + '/style.css')
    .setup_main_js(__dir + '/main.client.js')
    .start();