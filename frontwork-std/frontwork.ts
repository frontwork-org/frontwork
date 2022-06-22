import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.31-alpha/deno-dom-wasm.ts";
import { parse_url, key_value_list_to_array } from "./utils.ts";

const IS_DENO_SERVERSIDE = typeof document === "undefined";


class Scope {
    items: { key: string, value: string }[];
    constructor(items: { key: string, value: string }[]) {
        this.items = items;
    }

    get(key: string): string|null {
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if(item.key === key) {
                return item.value;
            }
        }
        return null;
    }
}

export class GetScope extends Scope { constructor(items: { key: string, value: string }[]) { super(items); } }
export class PostScope extends Scope { constructor(items: { key: string, value: string }[]) { super(items); } }
export class CookiesScope extends Scope { constructor(items: { key: string, value: string }[]) { super(items); } }


export class Cookie {
    name: string;
    private value: string;
    private expires: number|null = null;
    private max_age: number|null = null;
    private domain: string|null = null;
    private path = "/";
    private secure = false;
    private http_only = false;
    private same_site: string|null = null;

    constructor(name: string, value: string) {
        this.name = name;
        this.value = value;
    }

    set_expires(expires: number): Cookie { this.expires = expires; return this; }
    set_max_age(max_age: number): Cookie { this.max_age = max_age; return this; }
    set_domain(domain: string): Cookie { this.domain = domain; return this; }
    set_path(path: string): Cookie { this.path = path; return this; }
    set_secure(secure: boolean): Cookie { this.secure = secure; return this; }
    set_http_only(http_only: boolean): Cookie { this.http_only = http_only; return this; }
    set_same_site(same_site: string): Cookie { this.same_site = same_site; return this; }

    to_string(): string {
        let result = this.name + "=" + this.value;
        if(this.expires !== null) {
            result += "; Expires=" + new Date(this.expires).toUTCString();
        }
        if(this.max_age !== null) {
            result += "; Max-Age=" + this.max_age;
        }
        if(this.domain !== null) {
            result += "; Domain=" + this.domain;
        }
        if(this.path !== "") {
            result += "; Path=" + this.path;
        }
        if(this.secure) {
            result += "; Secure";
        }
        if(this.http_only) {
            result += "; HttpOnly";
        }
        if(this.same_site !== null) {
            result += "; SameSite=" + this.same_site;
        }
        return result;
    }
}


export class FrontworkRequest {
    public headers: Headers;
    public method: string;
    public url: string;
    public protocol: string;
    public host: string;
    public path: string;
    public path_dirs: string[];
    public query_string: string;
    public fragment: string;
    public readonly GET: GetScope;
    public readonly POST: PostScope;
    public readonly COOKIES: CookiesScope;

    constructor(method: string, url: string, headers: Headers, post: PostScope) {
        const parsed_url = parse_url(url);

        this.headers = headers;
        this.method = method;
        this.url = url;
        this.protocol = parsed_url.protocol;
        this.host = parsed_url.host;
        this.path = parsed_url.path;
        this.path_dirs = parsed_url.path.split("/");
        this.query_string = parsed_url.query_string;
        this.fragment = parsed_url.fragment;

        this.GET = new CookiesScope(
            key_value_list_to_array(parsed_url.query_string, "&", "=")
        );

        this.POST = post;

        const cookies_string = this.headers.get("cookie");
        this.COOKIES = new CookiesScope(
            cookies_string === null ? [] : key_value_list_to_array(cookies_string, "; ", "=")
        );
    }
}

export class DocumentBuilderConfig {
    doctype = "<!DOCTYPE html>";

    constructor() {}
}

export class DocumentBuilder {
    readonly config: DocumentBuilderConfig;
    readonly document: globalThis.Document;
    readonly document_html: HTMLHtmlElement;
    readonly document_head: HTMLHeadElement;
    readonly document_body: HTMLBodyElement;

    constructor(document_builder_config?: DocumentBuilderConfig) {
        this.config = typeof document_builder_config === "undefined"? new DocumentBuilderConfig() : document_builder_config;
        
        if (IS_DENO_SERVERSIDE) {
            // Deno Server Side Rendering
            this.document = <globalThis.Document> <unknown> new DOMParser().parseFromString('', "text/html", );

            // @ts-ignore: hack so that we can use the same codebase on both client and server
            globalThis.document = {
                createElement: this.document.createElement,
            }

            //this.document_html = <HTMLHtmlElement> this.document.appendChild( this.document.createElement("html") );
            //this.document_head = <HTMLHeadElement> this.document_html.appendChild( this.document.createElement("head") );
            //this.document_body = <HTMLBodyElement> this.document_html.appendChild( this.document.createElement("body") );
        } else {
            this.document = document;
            this.document.head.innerHTML = "";
            this.document.body.innerHTML = "";
        }


        this.document_html = <HTMLHtmlElement> this.document.documentElement.children[0];
        this.document_head = <HTMLHeadElement> this.document.head;
        this.document_body = <HTMLBodyElement> this.document.body;
    }

    createElement(tagName: string): HTMLElement {
        return <HTMLElement> <unknown> this.document.createElement(tagName);
    }

    set_html_lang(code: string): DocumentBuilder {
        const html_element = this.document.documentElement.children[0];
        html_element.setAttribute("lang", code);
        return this;
    }

    set_head_meta_data(title: string, description: string, robots: string): DocumentBuilder {
        const meta_chatset = this.document.head.appendChild( this.createElement("meta") );
        meta_chatset.setAttribute("charset", "UTF-8");
        const meta_viewport = this.document.head.appendChild( this.createElement("meta") );
        meta_viewport.setAttribute("name", "viewport");
        meta_viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
        
        const meta_title = this.document.head.appendChild( this.createElement("title") );
        meta_title.innerHTML = title;
        
        const meta_description = this.document.head.appendChild( this.createElement("meta") );
        meta_description.setAttribute("name", "description");
        meta_description.setAttribute("content", description);
        
        const meta_robots = this.document.head.appendChild( this.createElement("meta") );
        meta_robots.setAttribute("name", "robots");
        meta_robots.setAttribute("content", robots);
        return this;
    }

    set_head_meta_opengraph_website(title: string, description: string, url: string, image_url: string): DocumentBuilder {
        const meta_og_type = this.document.head.appendChild( this.createElement("meta") );
        meta_og_type.setAttribute("property", "og:type");
        meta_og_type.setAttribute("content", "website");

        const meta_og_url = this.document.head.appendChild( this.createElement("meta") );
        meta_og_url.setAttribute("property", "og:url");
        meta_og_url.setAttribute("content", url);

        const meta_og_title = this.document.head.appendChild( this.createElement("meta") );
        meta_og_title.setAttribute("property", "og:title");
        meta_og_title.setAttribute("content", title);

        const meta_og_description = this.document.head.appendChild( this.createElement("meta") );
        meta_og_description.setAttribute("property", "og:description");
        meta_og_description.setAttribute("content", description);

        const meta_og_image = this.document.head.appendChild( this.createElement("meta") );
        meta_og_image.setAttribute("property", "og:image");
        meta_og_image.setAttribute("content", image_url);

        return this;
    }

    toString() {
        let content = this.config.doctype + '\n';
        if(this.document.documentElement !== null) content += this.document.documentElement.outerHTML;
        return content;
    }
}

export class FrontworkResponse {
    status_code: number;
    mime_type = "text/html";
    content: DocumentBuilder|Blob|string;
    private headers: string[][] = [];
    private cookies: Cookie[] = [];

    constructor(status_code: number, content: DocumentBuilder|Blob|string) {
        this.status_code = status_code;
        this.content = content;
    }

    add_header(name: string, value: string) {
        this.headers.push([name, value]);
        return this;
    }

    set_cookie(cookie: Cookie) {
        for (let i = 0; i < this.cookies.length; i++) {
            if (this.cookies[i].name === cookie.name) {
                this.cookies[i] = cookie;
                return this;
            }
        }
        this.cookies.push(cookie);
        return this;
    }

    into_response(): Response {
        const content_text = typeof this.content === "object" ? this.content.toString() : this.content;
        const response = new Response(content_text, { status: this.status_code });
        response.headers.set('content-type', this.mime_type);

        for (let i = 0; i < this.headers.length; i++) {
            const header = this.headers[i];
            response.headers.set(header[0], header[1]);
        }

        for (let i = 0; i < this.cookies.length; i++) {
            const cookie = this.cookies[i];
            response.headers.append('set-cookie', cookie.to_string());
        }

        return response;
    }
}

export class FrontworkResponseRedirect extends FrontworkResponse {
    constructor(redirect_path: string) {
        super(301, "redirecting...");
        this.add_header("Location", redirect_path);
    }
}

export interface FrontworkResponseEvent {
    (request: FrontworkRequest): FrontworkResponse
}

export interface FrontworkResponseEventNullable {
    (request: FrontworkRequest): FrontworkResponse|null
}

export declare interface Component {
    build(request: FrontworkRequest): FrontworkResponse;
    on_dom_ready(): void;
}


let previous_route_id = 0;
export class Route {
    public id: number;
    public path: string;
    component: Component;
    public priority: number;

    constructor(path: string, priority: number, component: Component) {
        this.path = path;
        this.component = component;
        this.priority = priority;

        this.id = previous_route_id;
        previous_route_id += 1;
    }
}


export class Frontwork {
	private routes: Route[];
	private middleware: FrontworkMiddleware;

	constructor(routes: Route[], frontwork_middleware: FrontworkMiddleware) {
		this.routes = routes.sort(function(a: Route, b: Route)  {
            return a.priority < b.priority? 1 : -1;
        });
        
		this.middleware = frontwork_middleware;
	}

	protected async routes_resolver(request: FrontworkRequest): Promise<FrontworkResponse> {
        // Middleware: error
		const error_handler: FrontworkResponseEvent = (request: FrontworkRequest): FrontworkResponse => {
            this.log(request, "[ERROR]");

            if (this.middleware.error_handler === null) {
                return new FrontworkResponse(500, "ERROR");
            } else {
                return this.middleware.error_handler(request);
            }
		}

        // Middleware: redirect lonely slash
        if (this.middleware.redirect_lonely_slash && request.path_dirs.length > 2 && request.path_dirs[request.path_dirs.length -1] === "") {
            let new_path = "";
            for (let i = 0; i < request.path_dirs.length - 1; i++) {
                if (request.path_dirs[i] !== "") {
                    new_path += "/" + request.path_dirs[i];
                }
            }
            
            this.log(request, "[REDIRECT] -> " + new_path);
            return new FrontworkResponseRedirect(new_path);
        }

		// Middleware: before Routes
        if (this.middleware.before_routes !== null) {
            const after_routes_result = this.middleware.before_routes(request);
            if(after_routes_result !== null) {
                this.log(request, "[BEFORE_ROUTES]");
                return <FrontworkResponse> after_routes_result;
            }
        }

        // Routes
        for (let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];
            const route_path_dirs = route.path.split("/");

            if (request.path_dirs.length === route_path_dirs.length) {
                let found = true;
                for (let i = 0; i < route_path_dirs.length; i++) {
                    const route_path_dir = route_path_dirs[i];
                    if (route_path_dir !== "*" && route_path_dir !== request.path_dirs[i]) {
                        found = false;
                        break;
                    }
                }

                if (found) {
                    this.log(request, "[ROUTE #" + route.id + " ("+route.path+")]");
                    try {
                        return await route.component.build(request);
                    } catch (error) {
                        console.error(error);
                        return error_handler(request);
                    }
                }
            }
        }

        // Middleware: after Routes
        if (this.middleware.after_routes !== null) {
            const after_routes_result = this.middleware.after_routes(request);
            if(after_routes_result !== null) {
                this.log(request, "[AFTER_ROUTES]");
                return <FrontworkResponse> after_routes_result;
            }
        }

        // Middleware: not found
        if (this.middleware.not_found_handler === null) {
            return new FrontworkResponse(404, "ERROR 404 - Page not found");
        } else {
            return this.middleware.not_found_handler(request);
        }
	}

    protected log(request: FrontworkRequest, extra: string) {
        let path_with_query_string = request.path;
        if(request.query_string !== "") path_with_query_string += "?" + request.query_string;
        console.log(request.method + " " + path_with_query_string + " " + extra);
        if (request.POST.items.length > 0) console.log(" Scope POST: ", request.POST.items);
    }
}

export interface FrontworkMiddlewareInit {
    error_handler?: FrontworkResponseEvent|null;
	not_found_handler?: FrontworkResponseEvent|null;
	before_routes?: FrontworkResponseEventNullable|null;
	after_routes?: FrontworkResponseEventNullable|null;
    redirect_lonely_slash?: boolean;
}

export class FrontworkMiddleware {
    error_handler: FrontworkResponseEvent|null;
	not_found_handler: FrontworkResponseEvent|null;
	before_routes: FrontworkResponseEventNullable|null;
	after_routes: FrontworkResponseEventNullable|null;
    redirect_lonely_slash: boolean;

	constructor(init?: FrontworkMiddlewareInit) {
        if (init && init.error_handler) this.error_handler = init.error_handler;
        else this.error_handler = null;

        if (init && init.not_found_handler) this.not_found_handler = init.not_found_handler;
        else this.not_found_handler = null;
        
        if (init && init.before_routes) this.before_routes = init.before_routes;
        else this.before_routes = null;
        
        if (init && init.after_routes) this.after_routes = init.after_routes;
        else this.after_routes = null;
        
        if (init && init.redirect_lonely_slash) this.redirect_lonely_slash = init.redirect_lonely_slash;
        else this.redirect_lonely_slash = true;
	}
}
