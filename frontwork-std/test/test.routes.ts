import { Component, Route, FrontworkRequest, FrontworkMiddleware, FrontworkResponse, DocumentBuilder } from "../frontwork.ts";

function render_header(document_builder: DocumentBuilder): HTMLElement {
	const header = document.createElement("header");
	const link1 = header.appendChild(document.createElement("a"));
	link1.innerText = "Home";
	link1.setAttribute("href", "/");
	link1.setAttribute("style", "margin-right: 10px;");
	
	const link2 = header.appendChild(document.createElement("a"));
	link2.innerText = "Test 2";
	link2.setAttribute("href", "/test2");
	link2.setAttribute("style", "margin-right: 10px;");
	
	return header;
}

class TestComponent implements Component {
    build(_request: FrontworkRequest) {
		const document_builder = new DocumentBuilder();
		document_builder.document_body.appendChild( render_header(document_builder) );
		const main = document_builder.document_body.appendChild( document.createElement("main") );

		const title1 = main.appendChild( document.createElement("h1") );
		title1.innerText = "HTML5 Test Page";
		const description = main.appendChild( document.createElement("p") );
		description.innerText = "This is a test page for the Frontwork framework.";
		
		const section_form = main.appendChild( document.createElement("section") );
		const section_form_title = section_form.appendChild( document.createElement("h2") );
		section_form_title.innerText = "Test Form";
		
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
				.set_html_lang("en")
				.set_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow")
		);
	}
    on_dom_ready(): void {}
}

class Test2Component implements Component {
    build(_request: FrontworkRequest) {
		const document_builder = new DocumentBuilder();
		document_builder.document_body.appendChild( render_header(document_builder) );
		const main = document_builder.document_body.appendChild( document.createElement("main") );

		const title1 = main.appendChild( document.createElement("h1") );
		title1.innerText = "Test Page 2";
		const description = main.appendChild( document.createElement("p") );
		description.innerHTML = "This is a test page <b>2</b> for the Frontwork framework.";
		
		return new FrontworkResponse(200, 
			document_builder
				.set_html_lang("en")
				.set_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow")
		);
	}
    on_dom_ready(): void {}
}

class ElementTestComponent implements Component {
    build(request: FrontworkRequest) {
		const document_builder = new DocumentBuilder();
		return new FrontworkResponse(200, 
			document_builder
				.set_html_lang("en")
				.set_head_meta_data("element_test", "element_test", "noindex,nofollow")
		);
	}
    on_dom_ready(): void {}
}

class HelloWorldComponent implements Component {
    build(request: FrontworkRequest) {
		const content = "hello "+request.path.split("/")[2];
		return new FrontworkResponse(200, content);
	}
    on_dom_ready(): void {}
}


export const routes: Route[] = [
	new Route("/", 100, new TestComponent()),
	new Route("/test2", 100, new Test2Component()),
	new Route("/element_test", 100, new ElementTestComponent()),
	new Route("/hello/22222222", 1, new HelloWorldComponent()),
	new Route("/hello/*", 501111, new HelloWorldComponent()),
];


export const middleware = new FrontworkMiddleware();
