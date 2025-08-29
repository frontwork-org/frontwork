// deno-lint-ignore-file no-unused-vars
import { Component, Route, FrontworkMiddleware, FrontworkResponse, DocumentBuilder, FrontworkResponseRedirect, FrontworkContext, FrontworkInit, EnvironmentPlatform, EnvironmentStage, FW, LogType, ElemKit, FrontworkForm, ApiErrorResponse } from "../frontwork.ts";
import { FrontworkClient } from "../frontwork-client.ts";
import { i18n } from "./test.i18n.ts";


class MyMainDocumentBuilder extends DocumentBuilder {
	main: ElemKit<HTMLElement>;

	constructor(context: FrontworkContext) {
		super(context);
		const header = this.body_append( context.create_element("header") );
		context.ensure_text_element("a", "a-home", { href: "/" }).append_to(header);
		context.ensure_text_element("a", "a-test2",{ href: "/test2" }).append_to(header);
		context.ensure_text_element("a", "a-test3",{ href: "/test3" }).append_to(header);
		context.ensure_text_element("a", "a-german", { href: "/german" }).append_to(header);
		context.ensure_text_element("a", "a-crash", { href: "/crash" }).append_to(header);
		this.main = this.body_append(context.create_element("main"));
	}
}


class AnotherComponent implements Component {
    async build(context: FrontworkContext): Promise<FrontworkResponse> {
		const document_builder = new DocumentBuilder(context);
		const main = document_builder.body_append( context.create_element("main") );
		context.ensure_text_element("h1", "another_title1").append_to(main);
		context.ensure_text_element("p", "another_text1").append_to(main);
		return new FrontworkResponse(200, document_builder);
	}
    async dom_ready() {}
    async on_destroy() {}
}

class TestComponent implements Component {
	button_event: ElemKit<HTMLButtonElement>;
	
	constructor(context: FrontworkContext) {
		this.button_event = context.ensure_text_element("button", "event_button_tester", { type: "button" });
	}

    async build(context: FrontworkContext) {
		const user = await context.get_observer<User>("user").get();
		console.log("The User is", user);
		

		const document_builder = new MyMainDocumentBuilder(context);

		const title = context.ensure_text_element("h1", "title1").append_to(document_builder.main)
		const description = context.ensure_text_element("p", "text1").append_to(document_builder.main)
		
		this.button_event.append_to(document_builder.main);
		
		const section = context.create_element("section").append_to(document_builder.main);
		context.ensure_text_element("h2", "title2").append_to(section);

		// Test forms
		const action = context.request.GET.get("action");
		if (action !== null) {
			context.ensure_text_element("h3", "formtest_title_"+(FW.is_client_side? "ok" : "fail")).append_to(section);
			for (let i = 0; i < 3; i++) {
				const div = context.create_element("div").append_to(section);
				div.elem.innerHTML = "text"+i+": "+context.request.GET.get("text"+i);
			}

		}

		const form = new FrontworkForm(context, "test_form", "", "GET").append_to(section);

		for (let i = 0; i < 3; i++) {
			context.ensure_element("input", "input"+i, { type: "text", name: "text"+i, value: "asdsad"+i }).append_to(form);
		}
		
		context.ensure_text_element("button", "submit_button", { type: "submit", name: "action", value: "sent" }).append_to(form);

		return new FrontworkResponse(200, 
			document_builder
				.add_head_meta_data(title.elem.innerText, description.elem.innerText, "noindex,nofollow")
		);
	}
	
    async dom_ready(context: FrontworkContext, client: FrontworkClient) {
		try {
			let times = 0;
			this.button_event.elem.addEventListener("click", () => {
				times++;
				this.button_event.elem.innerHTML = "Changed "+times+" times";
			})
		} catch (error) {
			console.error(error);
		}
	}
	async on_destroy() {}
}

class TestGerman extends TestComponent {
    constructor(context: FrontworkContext) {
		context.set_locale("de");
		super(context);
	}
    override async build(context: FrontworkContext) {
		return await super.build(context);
	}
    override async dom_ready(context: FrontworkContext, client: FrontworkClient) { super.dom_ready(context, client); }
}

class Test2Component implements Component {
    async build(context: FrontworkContext) {
		const document_builder = new MyMainDocumentBuilder(context);

		const title1 = context.ensure_text_element("h1", "test-page2").append_to(document_builder.main);
		const description = context.ensure_element("p", "description").append_to(document_builder.main);
		description.elem.innerHTML = "This is a test page <b>2</b> for the Frontwork framework. I will redirect you with js to the home page in 1 second.";
		
		FW.reporter(LogType.Warn, "TEST", "Warn counter test for Testworker", context, null);
		return new FrontworkResponse(200, 
			document_builder
				.add_head_meta_data(title1.elem.innerText, description.elem.innerText, "noindex,nofollow")
		);
	}
    async dom_ready(context: FrontworkContext, client: FrontworkClient) {
		setTimeout(() => {
			client.page_change_to("/", false);
		}, 1000);
	}
	async on_destroy() {console.log("on_destroy test");}
}

class Test3Component implements Component {
    async build() {
		return new FrontworkResponseRedirect("/", 301);
	}
    async dom_ready() {}
	async on_destroy() {}
}


class ElementTestComponent implements Component {
    async build(context: FrontworkContext) {
		const document_builder = new MyMainDocumentBuilder(context);
		return new FrontworkResponse(200, 
			document_builder
				.add_head_meta_data("element_test", "element_test", "noindex,nofollow")
		);
	}
    async dom_ready() {}
	async on_destroy() {}
}

class HelloWorldPrioTestComponent implements Component {
    async build(context: FrontworkContext) {
		const content = "Hello this is indeed first come, first served basis";
		return new FrontworkResponse(200, content);
	}
    async dom_ready(context: FrontworkContext) {}
	async on_destroy() {}
}

class HelloWorldComponent implements Component {
    async build(context: FrontworkContext) {
		const content = "Hello "+context.request.path_dirs[2];
		return new FrontworkResponse(200, content);
	}
    async dom_ready(context: FrontworkContext) {}
    async on_destroy(context: FrontworkContext) {}
}

class CollisionHandlerComponent implements Component {
	component: Component

	constructor(context: FrontworkContext) {
		if (context.request.path_dirs[2] === "first-come-first-served") {
			this.component = new HelloWorldPrioTestComponent();
		}
		this.component = new HelloWorldComponent();
	}

    async build(context: FrontworkContext) {
		return this.component.build(context);
	}
    async dom_ready(context: FrontworkContext, client: FrontworkClient) {
		return this.component.dom_ready(context, client);
	}
	async on_destroy() {}
}

class CrashComponent implements Component {
    async build() {
		throw new Error("Crash Test");
		// deno-lint-ignore no-unreachable
		return new FrontworkResponse(200, "this text shall never be seen in the browser");
	}
    async dom_ready() {}
	async on_destroy() {}
}

class NotFoundComponent implements Component {
    async build(context: FrontworkContext) {
		const document_builder = new MyMainDocumentBuilder(context);
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

export interface User {
    user_id: number,
    username: string,
    status: number,
}


export function login_check(context: FrontworkContext): Promise<User> {
	return new Promise(function (resolve, reject) {
		context.api_request<User>("POST", "/api/v1/user/session", {})
		.then(function(result) {
			if (result.ok) {
				console.log("Welcome, " + result.val.username);
                resolve(result.val);
			} else {
				reject(new Error("login_check() NON-OK: "+result.err.status));
			}
		})
		.catch(function(err) { reject(err); });
	});
}

const middleware = new FrontworkMiddleware({
	before_route: {
		build: async (context: FrontworkContext) => {
			console.log("context.request.COOKIES", context.request.COOKIES);
			
			context.set_locale("en");
			const observer = context.get_observer<User>("user");
			if(observer.is_null()) context.api_request_observer<User>(observer, "POST", "/api/v1/user/session", {});
			// context.api_request("POST", "/api/v1/user/set_storage_quota", {})
		},
		dom_ready: async () => {  console.log("ASDAAAAAAAAA"); import("./test.second_module.ts") }
	},
	error_handler: async (context: FrontworkContext) => {
		const document_builder = new MyMainDocumentBuilder(context);
		const h1 = context.body.elem.appendChild(document.createElement("h1"));
		h1.innerText = "ERROR 500 - Internal server error";

		return new FrontworkResponse(500,
			document_builder
				.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow")
		);
	},
	not_found_handler: NotFoundComponent,
});



export const APP_CONFIG: FrontworkInit = {
	platform: EnvironmentPlatform.Web, 
	stage: EnvironmentStage.Development,
	port: 8080,
	api_protocol_address: "",
	api_protocol_address_ssr: "http://localhost:40201",
	domain_to_route_selector: async (context: FrontworkContext) => {
		const domain = context.request.host.split(":")[0];
		
		if (domain === "127.0.0.1") return another_routes;
		return default_routes;
	},
	middleware: middleware,
	i18n: i18n,
	build_on_page_load: false,
	module_splitting: true,
	api_error_event: (context: FrontworkContext, client: FrontworkClient|null, method: "GET"|"POST", path: string, params: { [key: string]: string|number|boolean | string[]|number[]|boolean[] }, error: ApiErrorResponse) => {
		if (context.request.path !== "/" && client !== null && error.status === 401) {
			client.page_change_to("/", true);
		}
	}
};
