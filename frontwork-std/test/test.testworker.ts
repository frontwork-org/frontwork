import { FrontworkTestworker } from "../frontwork-testworker.ts";
import { APP_CONFIG } from "./test.routes.ts";


new FrontworkTestworker(APP_CONFIG)
    .test_routes()
    .print_summary()
    .exit()
;