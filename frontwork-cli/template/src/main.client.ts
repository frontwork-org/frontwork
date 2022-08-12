import { FrontworkClient } from "./dependencies.ts";
import { APP_CONFIG } from "./environments/environment.ts";


new FrontworkClient(APP_CONFIG, {
    build_on_page_load: false
});