import { FrontworkWebservice } from "https://deno.land/x/frontwork@0.0.11/frontwork-service.ts";
import { APP_CONFIG } from "./environments/environment.ts";

const __FILE_PATH = new URL(import.meta.url).pathname;
const DENO_MAINMODULE_PATH = new URL(Deno.mainModule).pathname;


const main_module_split = DENO_MAINMODULE_PATH.split("/");
main_module_split.pop();
const EXEC_DIR = main_module_split.join("/");


let assets_dir, style_css_path, main_js_path;
if (__FILE_PATH === DENO_MAINMODULE_PATH) {
    // DEVELOPMENT: we are in the src directory
    main_module_split.pop();
    const PROJECT_DIR = 
        (main_module_split.length === 0)?
            "/" : main_module_split.join("/")
    ;

    assets_dir = EXEC_DIR + '/assets';
    style_css_path = PROJECT_DIR + '/dist/web/style.css';
    main_js_path = PROJECT_DIR + '/dist/web/main.client.js';
} else {
    // PRODUCTION: we are in the dist directory
    assets_dir = EXEC_DIR + '/assets';
    style_css_path = EXEC_DIR + '/style.css';
    main_js_path = EXEC_DIR + '/main.client.js';
}


new FrontworkWebservice(APP_CONFIG)
    .setup_assets_resolver(assets_dir)
    .setup_style_css(style_css_path)
    .setup_main_js(main_js_path)
    .start()
;