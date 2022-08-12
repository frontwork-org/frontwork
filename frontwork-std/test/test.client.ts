import { FrontworkClient } from "../frontwork-client.ts";
import { init } from "./test.routes.ts";


new FrontworkClient(init, {
    build_on_page_load: false
});