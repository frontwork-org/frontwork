import { FrontworkWebservice } from "../frontwork-service.ts";
import { routes, middleware } from "./test.routes.ts";


new FrontworkWebservice(routes, middleware, 8080).start();