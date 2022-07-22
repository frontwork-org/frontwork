import { FrontworkFront } from "../frontwork-front.ts";
import { init } from "./test.routes.ts";


new FrontworkFront(init, {
    build_on_page_load: false
});