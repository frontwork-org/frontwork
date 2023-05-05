import { Component, Route, FrontworkMiddleware, FrontworkResponse, DocumentBuilder, FrontworkResponseRedirect, DomainRoutes, FrontworkContext, FrontworkInit, EnvironmentPlatform, EnvironmentStage } from "../frontwork.ts";
import { FrontworkClient } from "../frontwork-client.ts";
import { i18n } from "./test.i18n.ts";

function render_header(): HTMLElement {
	const header = document.createElement("header");
	const link1 = header.appendChild(document.createElement("a"));
	link1.innerText = "Home";
	link1.setAttribute("href", "/");
	link1.setAttribute("style", "margin-right: 10px;");

	const link2 = header.appendChild(document.createElement("a"));
	link2.innerText = "Test 2";
	link2.setAttribute("href", "/test2");
	link2.setAttribute("style", "margin-right: 10px;");

	const link3 = header.appendChild(document.createElement("a"));
	link3.innerText = "Test 3";
	link3.setAttribute("href", "/test3");
	link3.setAttribute("style", "margin-right: 10px;");

	const link_german = header.appendChild(document.createElement("a"));
	link_german.innerText = "German";
	link_german.setAttribute("href", "/german");
	link_german.setAttribute("style", "margin-right: 10px;");

	const link_crash = header.appendChild(document.createElement("a"));
	link_crash.innerText = "Crash";
	link_crash.setAttribute("href", "/crash");
	link_crash.setAttribute("style", "margin-right: 10px;");
	
	return header;
}

class TestComponent implements Component {
    build(context: FrontworkContext) {
		const document_builder = new DocumentBuilder();
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
				.set_html_lang(context.i18n.selected_locale.locale)
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
    build() {
		const document_builder = new DocumentBuilder();
		document_builder.document_body.appendChild( render_header() );
		const main = document_builder.document_body.appendChild( document.createElement("main") );

		const title1 = main.appendChild( document.createElement("h1") );
		title1.innerText = "Test Page 2";
		const description = main.appendChild( document.createElement("p") );
		description.innerHTML = "This is a test page <b>2</b> for the Frontwork framework. I will redirect you with js to the home page in 1 second.";
		
		return new FrontworkResponse(200, 
			document_builder
				.set_html_lang("en")
				.add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow")
		);
	}
    dom_ready(context: FrontworkContext, frontwork: FrontworkClient): void {
		console.log("FrontworkContext", context);
		console.log("frontwork", frontwork);
		setTimeout(() => {
			frontwork.page_change_to("/")
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
    build() {
		const document_builder = new DocumentBuilder();
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
