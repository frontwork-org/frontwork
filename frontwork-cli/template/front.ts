import { FrontworkFront } from "./env.ts";
import { init } from "./routes.ts";


new FrontworkFront(init, {
    build_on_page_load: false
});