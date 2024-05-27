import { Component, Route, FrontworkMiddleware, FrontworkResponse, DocumentBuilder, FrontworkResponseRedirect, DomainRoutes, FrontworkContext, FrontworkInit, EnvironmentPlatform, EnvironmentStage, Frontwork, DEBUG, LogType, FW } from "../frontwork.ts";
import { FrontworkClient } from "../frontwork-client.ts";
import { i18n } from "./test.i18n.ts";

// TODO:: improve DOM Capabilities
// class HeaderComponent implements Component {
// 	build(context: FrontworkContext): FrontworkResponse {
// 		const header = document.createElement("header");
// 		FW.ensure_element_with_text("a", "a-home", "Home", { href: "/" }).append_to(header);
// 		FW.ensure_element_with_text("a", "a-test2", "Test 2", { href: "/test2" }).append_to(header);
// 		FW.ensure_element_with_text("a", "a-test3", "Test 3", { href: "/test3" }).append_to(header);
// 		FW.ensure_element_with_text("a", "a-german", "German", { href: "/german" }).append_to(header);
// 		FW.ensure_element_with_text("a", "a-crash", "Crash", { href: "/crash" }).append_to(header);
// 	}
// 	dom_ready() {}
// }


function render_header(): HTMLElement {
	const header = document.createElement("header");
	FW.ensure_element_with_text("a", "a-home", "Home", { href: "/" }).append_to(header);
	FW.ensure_element_with_text("a", "a-test2", "Test 2", { href: "/test2" }).append_to(header);
	FW.ensure_element_with_text("a", "a-test3", "Test 3", { href: "/test3" }).append_to(header);
	FW.ensure_element_with_text("a", "a-german", "German", { href: "/german" }).append_to(header);
	FW.ensure_element_with_text("a", "a-crash", "Crash", { href: "/crash" }).append_to(header);
	return header;
}

class TestComponent implements Component {
    build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder(context);
		document_builder.document_body.appendChild( render_header() );
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

class TestGerman extends TestComponent implements Component {
    build(context: FrontworkContext) {
		context.i18n.set_locale("de");
		return super.build(context);
	}
    dom_ready(): void {}
}

class Test2Component implements Component {
    build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder(context);
		document_builder.document_body.appendChild( render_header() );
		// TODO: Add helper functions to create elements
		// Generel helper
		// document getelementbyid === null? create element
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

class Test3Component implements Component {
    build() {
		return new FrontworkResponseRedirect("/");	
	}
    dom_ready(): void {}
}


class ElementTestComponent implements Component {
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

class HelloWorldComponent implements Component {
    build(context: FrontworkContext) {
		const content = "hello "+context.request.path_dirs[2];
		return new FrontworkResponse(200, content);
	}
    dom_ready(): void {}
}

class CrashComponent implements Component {
    build() {
		throw new Error("Crash Test");
		// deno-lint-ignore no-unreachable
		return new FrontworkResponse(200, "this text shall never be seen in the browser");
	}
    dom_ready(): void {}
}


const domain_routes: DomainRoutes[] = [
	new DomainRoutes(/.*/, [
		new Route("/", new TestComponent()),
		new Route("/test2", new Test2Component()),
		new Route("/test3", new Test3Component()),
		new Route("/german", new TestGerman()),
		new Route("/crash", new CrashComponent()),
		new Route("/element_test", new ElementTestComponent()),
		new Route("/hello/22222222", new HelloWorldComponent()),
		new Route("/hello/*", new HelloWorldComponent()),
	])
];

const middleware = new FrontworkMiddleware({
	before_routes: {
		build: (context: FrontworkContext) => {
			context.i18n.set_locale("en");
			return null;
		},
		dom_ready: () => {}
	}
});



export const APP_CONFIG: FrontworkInit = {
	platform: EnvironmentPlatform.Web, 
	stage: EnvironmentStage.Development,
	port: 8080,
	domain_routes: domain_routes,
	middleware: middleware,
	i18n: i18n,
	build_on_page_load: false
};
