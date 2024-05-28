import { Component, Route, FrontworkMiddleware, FrontworkResponse, DocumentBuilder, FrontworkResponseRedirect, FrontworkContext, FrontworkInit, EnvironmentPlatform, EnvironmentStage, DEBUG, LogType, FW, HTMLElementWrapper, DocumentBuilderInterface } from "../frontwork.ts";
import { FrontworkClient } from "../frontwork-client.ts";
import { i18n } from "./test.i18n.ts";

// TODO:: improve DOM Capabilities
class MyMainDocumentBuilder extends DocumentBuilder {
	build(_context: FrontworkContext): FrontworkResponse {
		const header = FW.create_element<HTMLElement>("header");
		FW.ensure_element_with_text("a", "a-home", "Home", { href: "/" }).append_to(header);
		FW.ensure_element_with_text("a", "a-test2", "Test 2", { href: "/test2" }).append_to(header);
		FW.ensure_element_with_text("a", "a-test3", "Test 3", { href: "/test3" }).append_to(header);
		FW.ensure_element_with_text("a", "a-german", "German", { href: "/german" }).append_to(header);
		FW.ensure_element_with_text("a", "a-crash", "Crash", { href: "/crash" }).append_to(header);
		return new FrontworkResponse(500, this);
	}
	dom_ready(context: FrontworkContext, client: FrontworkClient) {}
}


function render_header(): HTMLElementWrapper<HTMLElement> {
	const header = FW.create_element("header");
	FW.ensure_element_with_text("a", "a-home", "Home", { href: "/" }).append_to(header);
	FW.ensure_element_with_text("a", "a-test2", "Test 2", { href: "/test2" }).append_to(header);
	FW.ensure_element_with_text("a", "a-test3", "Test 3", { href: "/test3" }).append_to(header);
	FW.ensure_element_with_text("a", "a-german", "German", { href: "/german" }).append_to(header);
	FW.ensure_element_with_text("a", "a-crash", "Crash", { href: "/crash" }).append_to(header);
	return header;
}

class AnotherComponent extends DocumentBuilder {
    build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder(context);
		document_builder.document_body.appendChild( render_header().element );
		const main = document_builder.document_body.appendChild( document.createElement("main") );

		const title1 = main.appendChild( document.createElement("h1") );
		title1.innerText = context.i18n.get_translation("another_title1");
		const description = main.appendChild( document.createElement("p") );
		description.innerText = context.i18n.get_translation("another_text1");

		return new FrontworkResponse(200, 
			document_builder
				.add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow")
		);
	}
    dom_ready(): void {}
}

class TestComponent extends DocumentBuilder {
    build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder(context);
		document_builder.document_body.appendChild( render_header().element );
		const main = document_builder.document_body.appendChild( document.createElement("main") );

		const title1 = main.appendChild( document.createElement("h1") );
		title1.innerText = context.i18n.get_translation("title1");
		const description = main.appendChild( document.createElement("p") );
		description.innerText = context.i18n.get_translation("text1");
		
		const section_form = main.appendChild( document.createElement("section") );
		const section_form_title = section_form.appendChild( document.createElement("h2") );
		section_form_title.innerText = context.i18n.get_translation("title2");
		
		const section_form_form = section_form.appendChild( document.createElement("form") );
		section_form_form.setAttribute("id", "test_form");
		section_form_form.setAttribute("action", "");
		section_form_form.setAttribute("method", "post");

		for (let i = 0; i < 3; i++) {
			const section_form_form_input_text = section_form_form.appendChild( document.createElement("input") );
			section_form_form_input_text.setAttribute("type", "text");
			section_form_form_input_text.setAttribute("name", "text"+i);
			section_form_form_input_text.setAttribute("value", "aabbcc");
		}
		
		const section_form_submit_button = section_form_form.appendChild( document.createElement("button") );
		section_form_submit_button.setAttribute("type", "submit");
		section_form_submit_button.setAttribute("name", "action");
		section_form_submit_button.setAttribute("value", "sent");
		section_form_submit_button.innerHTML = "Submit";

		return new FrontworkResponse(200, 
			document_builder
				.add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow")
		);
	}
    dom_ready(): void {}
}

class TestGerman extends TestComponent {
    build(context: FrontworkContext) {
		context.i18n.set_locale("de");
		return super.build(context);
	}
    dom_ready(): void {}
}

class Test2Component extends DocumentBuilder {
    build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder(context);
		document_builder.document_body.appendChild( render_header().element );
		const main = document_builder.document_body.appendChild( document.createElement("main") );

		const title1 = main.appendChild( document.createElement("h1") );
		title1.innerText = "Test Page 2";
		const description = main.appendChild( document.createElement("p") );
		description.innerHTML = "This is a test page <b>2</b> for the Frontwork framework. I will redirect you with js to the home page in 1 second.";
		
		DEBUG.reporter(LogType.Warn, "TEST", "Warn counter test for Testworker", null);
		return new FrontworkResponse(200, 
			document_builder
				.add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow")
		);
	}
    dom_ready(context: FrontworkContext, client: FrontworkClient): void {
		console.log("FrontworkContext", context);
		console.log("FrontworkClient", client);
		setTimeout(() => {
			client.page_change_to("/")
		}, 1000);
	}
}

class Test3Component extends DocumentBuilder {
    build() {
		return new FrontworkResponseRedirect("/");	
	}
    dom_ready(): void {}
}


class ElementTestComponent extends DocumentBuilder {
    build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder(context);
		return new FrontworkResponse(200, 
			document_builder
				.set_html_lang("en")
				.add_head_meta_data("element_test", "element_test", "noindex,nofollow")
		);
	}
    dom_ready(): void {}
}

class HelloWorldPrioTestComponent extends DocumentBuilder {
    build(context: FrontworkContext) {
		const content = "Hello this is indeed first come, first served basis";
		return new FrontworkResponse(200, content);
	}
    dom_ready(context: FrontworkContext): void {}
}

class HelloWorldComponent extends DocumentBuilder {
    build(context: FrontworkContext) {
		const content = "Hello "+context.request.path_dirs[2];
		return new FrontworkResponse(200, content);
	}
    dom_ready(context: FrontworkContext): void {}
}

class CollisionHandlerComponent extends DocumentBuilder {
    build(context: FrontworkContext) {
		if (context.request.path_dirs[2] === "first-come-first-served") {
			return new HelloWorldPrioTestComponent(context).build(context);
		}
		return new HelloWorldComponent(context).build(context);
	}
    dom_ready(context: FrontworkContext): void {
		if (context.request.path_dirs[2] === "first-come-first-served") {
			new HelloWorldPrioTestComponent(context).dom_ready(context);
		}
		new HelloWorldComponent(context).dom_ready(context);
	}
}

class CrashComponent extends DocumentBuilder {
    build() {
		throw new Error("Crash Test");
		// deno-lint-ignore no-unreachable
		return new FrontworkResponse(200, "this text shall never be seen in the browser");
	}
    dom_ready(): void {}
}

//TODO: Benchmark current vs () => new TestComponent()
const default_routes: Route[] = [
	new Route("/", TestComponent),
	new Route("/test2", Test2Component),
	new Route("/test3", Test3Component),
	new Route("/german", TestGerman),
	new Route("/crash", CrashComponent),
	new Route("/element_test", ElementTestComponent),
	new Route("/hello/first-come-first-served", HelloWorldPrioTestComponent),
	new Route("/hello/*", HelloWorldComponent),
	new Route("/hi/*", CollisionHandlerComponent),
];

const another_routes: Route[] = [
	new Route("/", AnotherComponent),
];

const middleware = new FrontworkMiddleware({
	before_routes: {
		build: (context: FrontworkContext) => {
			context.i18n.set_locale("en");
			return null;
		},
		dom_ready: () => { }
	},
	error_handler: {
		build: (context: FrontworkContext): FrontworkResponse => {
			const document_builder = new DocumentBuilder(context);
			const h1 = document_builder.document_body.appendChild(document.createElement("h1"));
			h1.innerText = "ERROR 500 - Internal server error";

			return new FrontworkResponse(500,
				document_builder
					.set_html_lang("en")
					.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow")
			);
		},
		dom_ready: () => {}
	},
	not_found_handler: {
		build: (context: FrontworkContext): FrontworkResponse => {
			const document_builder = new DocumentBuilder(context);
			const h1 = document_builder.document_body.appendChild(document.createElement("h1"));
			h1.innerText = "ERROR 404 - Not found";

			return new FrontworkResponse(500,
				document_builder
					.set_html_lang("en")
					.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow")
			);
		},
		dom_ready: () => {}
	},
});



export const APP_CONFIG: FrontworkInit = {
	platform: EnvironmentPlatform.Web, 
	stage: EnvironmentStage.Development,
	port: 8080,
	domain_to_route_selector: (context: FrontworkContext) => {
		const domain = context.request.host.split(":")[0];
		
		if (domain === "127.0.0.1") return another_routes;
		return default_routes;
	},
	middleware: middleware,
	i18n: i18n,
	build_on_page_load: false
};
