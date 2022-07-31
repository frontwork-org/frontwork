import { FrontworkTestworker } from "./env.ts";
import { init } from "./routes.ts";


new FrontworkTestworker(init)
    .test_routes()
    .print_summary()
    .exit()
;