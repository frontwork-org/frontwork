import { Route, FrontworkMiddleware, FrontworkContext, Component, DocumentBuilder, FrontworkResponse, DomainToRouteSelector, HTMLElementWrapper } from "../dependencies.ts";
import { StartpageComponent } from "./startpage/startpage.ts";


export class MainDocumentBuilder extends DocumentBuilder {
	main: HTMLElementWrapper<HTMLElement>;

	constructor(context: FrontworkContext) {
		super(context);
		const header = this.body_append( context.create_element("header") );
		context.ensure_text_element("a", "a-home", { href: "/" }).append_to(header);
		this.main = this.body_append(context.create_element("main"));
	}
}


class NotFoundComponent implements Component {
    async build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder(context);
		const h1 = context.document_body.appendChild(document.createElement("h1"));
		h1.innerText = "ERROR 404 - Not found";

		return new FrontworkResponse(404,
			document_builder
				.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow")
		);
	}
    async dom_ready() {}
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
	error_handler: async (context: FrontworkContext) => {
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

export const domain_to_route_selector: DomainToRouteSelector = async (context: FrontworkContext) => {
	return routes;
}