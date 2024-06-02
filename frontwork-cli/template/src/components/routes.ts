import { Route, FrontworkMiddleware, FrontworkContext, Component, DocumentBuilder, FrontworkResponse, DomainToRouteSelector } from "../dependencies.ts";
import { StartpageComponent } from "./startpage/startpage.ts";


class NotFoundComponent implements Component {
    build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder(context);
		const h1 = context.document_body.appendChild(document.createElement("h1"));
		h1.innerText = "ERROR 404 - Not found";

		return new FrontworkResponse(404,
			document_builder
				.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow")
		);
	}
    dom_ready(): void {}
}


export const routes: Route[] = [
	new Route("/", StartpageComponent),
];

export const middleware = new FrontworkMiddleware({
	before_route: {
		build: (context: FrontworkContext) => {
			context.i18n.set_locale("en");
		},
		dom_ready: () => { }
	},
	error_handler: (context: FrontworkContext): FrontworkResponse => {
		const document_builder = new DocumentBuilder(context);
		const h1 = context.document_body.appendChild(document.createElement("h1"));
		h1.innerText = "ERROR 500 - Internal server error";

		return new FrontworkResponse(500,
			document_builder
				.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow")
		);
	},
	not_found_handler: NotFoundComponent,
});

export const domain_to_route_selector: DomainToRouteSelector = (context: FrontworkContext) => {
	return routes;
}