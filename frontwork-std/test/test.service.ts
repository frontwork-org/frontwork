import { FrontworkWebservice } from "../frontwork-service.ts";
import { routes, middleware } from "./test.routes.ts";

const __dirname = new URL('.', import.meta.url).pathname;

new FrontworkWebservice(routes, middleware, 8080)
    .setup_assets_resolver(__dirname + 'assets')
    .start();