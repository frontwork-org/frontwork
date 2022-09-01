import { Route, FrontworkMiddleware, DomainRoutes, FrontworkContext } from "../dependencies.ts";
import { StartpageComponent } from "./startpage/startpage.ts";



export const domain_routes: DomainRoutes[] = [
	new DomainRoutes(/.*/, [
		new Route("/", new StartpageComponent()),
	])
];

export const middleware = new FrontworkMiddleware({
	before_routes: {
		build: (context: FrontworkContext) => {
			context.i18n.set_locale("en");
			return null;
		},
		dom_ready: () => {}
	}
});