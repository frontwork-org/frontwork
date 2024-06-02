import { FrontworkTestworker } from "../frontwork-testworker.ts";
import { APP_CONFIG } from "./test.routes.ts";


new FrontworkTestworker(APP_CONFIG)
    .test_routes(["localhost", "127.0.0.1"])
    .print_summary()
    .exit()
;