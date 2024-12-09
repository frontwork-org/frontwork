import { FrontworkTestworker } from "../frontwork-testworker.ts";
import { APP_CONFIG } from "./test.routes.ts";


const worker = new FrontworkTestworker(APP_CONFIG)
await worker.test_routes(["localhost"]);
worker.print_summary();
worker.exit();