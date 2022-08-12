import { FrontworkTestworker } from "./dependencies.ts";
import { APP_CONFIG } from "./environments/environment.ts";


new FrontworkTestworker(APP_CONFIG)
    .test_routes()
    .print_summary()
    .exit()
;