import { FrontworkTestworker } from "../frontwork-testworker.ts";
import { init } from "./test.routes.ts";


new FrontworkTestworker(init)
    .test_routes()
    .print_summary()
    .exit()
;