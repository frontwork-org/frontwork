import { FrontworkTestworker } from "https://deno.land/x/frontwork@0.3.1/frontwork-testworker.ts";
import { APP_CONFIG } from "./environments/environment.ts";


const worker = new FrontworkTestworker(APP_CONFIG)
await worker.test_routes(["localhost"]);
worker.print_summary();
worker.exit();