import { Route, FrontworkMiddleware, FrontworkContext, Component, DocumentBuilder, FrontworkResponse, DomainToRouteSelector, ElemKit } from "../dependencies.ts";
import { StartpageComponent } from "./startpage/startpage.ts";


export class MainDocumentBuilder extends DocumentBuilder {
	main: ElemKit<HTMLElement>;

	constructor(context: FrontworkContext) {
		super(context);
		const header = this.body_append( context.create_element("header") );
		context.ensure_text_element("a", "a-home", { href: "/" }).append_to(header);
		this.main = this.body_append(context.create_element("main"));
	}
}


class NotFoundComponent implements Component {
    // deno-lint-ignore require-await
    async build(context: FrontworkContext) {
		const document_builder = new MainDocumentBuilder(context);
		const h1 = context.ensure_element("h1", "not_found_title").append_to(document_builder.main);
		h1.elem.innerText = "ERROR 404 - Not found";

		return new FrontworkResponse(404,
			document_builder
				.add_head_meta_data(h1.elem.innerText, h1.elem.innerText, "noindex,nofollow")
		);
	}
    async dom_ready() {}
	async on_destroy() {}
}


export const routes: Route[] = [
	new Route("/", StartpageComponent),
];

export const middleware = new FrontworkMiddleware({
	before_route: {
		build: async (context: FrontworkContext) => {
			context.set_locale("en");
		},
		dom_ready: async () => { }
	},
	error_handler: async (context: FrontworkContext) => {
		const document_builder = new MainDocumentBuilder(context);
		const h1 = context.ensure_element("h1", "not_found_title").append_to(document_builder.main);
		h1.elem.innerText = "ERROR 500 - Internal server error";

		return new FrontworkResponse(500,
			document_builder
				.add_head_meta_data(h1.elem.innerText, h1.elem.innerText, "noindex,nofollow")
		);
	},
	not_found_handler: NotFoundComponent,
});

export const domain_to_route_selector: DomainToRouteSelector = async (context: FrontworkContext) => {
	return routes;
}