import { FrontworkTestworker } from "jsr:@frontwork-org/frontwork@^0.4.12/testworker";
import { APP_CONFIG } from "./environments/environment.ts";


const worker = new FrontworkTestworker(APP_CONFIG)
await worker.test_routes(["localhost"]);
worker.print_summary();
worker.exit();