import { FrontworkTestworker } from "https://deno.land/x/frontwork@0.0.9/frontwork-testworker.ts";
import { APP_CONFIG } from "./environments/environment.ts";


new FrontworkTestworker(APP_CONFIG)
    .test_routes()
    .print_summary()
    .exit()
;