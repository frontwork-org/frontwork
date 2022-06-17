import { parse_url, key_value_list_to_array } from "./utils.ts";

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

export class FrontworkResponse {
    status_code: number;
    content: string;
    private headers: string[][] = [];

    constructor(status_code: number, content: string) {
        this.status_code = status_code;
        this.content = content;
    }

    add_header(name: string, value: string) {
        this.headers.push([name, value]);
        return this;
    }

    into_response(): Response {
        const response = new Response(this.content, { status: this.status_code });
        response.headers.set('content-type', 'text/html');
        for (let i = 0; i < this.headers.length; i++) {
            const header = this.headers[i];
            response.headers.set(header[0], header[1]);
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


let previous_route_id = 0;
export class Route {
    public id: number;
    public path: string;
    public handler: FrontworkResponseEvent;
    public priority: number;

    constructor(path: string, priority: number, handler: FrontworkResponseEvent) {
        this.path = path;
        this.handler = handler;
        this.priority = priority;

        this.id = previous_route_id;
        previous_route_id += 1;
    }
}


export class Frontwork {
	routes: Route[];
	middleware: FrontworkMiddleware;

	constructor(routes: Route[], frontwork_middleware: FrontworkMiddleware) {
		this.routes = routes.sort(function(a: Route, b: Route)  {
            return a.priority < b.priority? 1 : -1;
        });
        
		this.middleware = frontwork_middleware;
	}

	async routes_resolver(request: FrontworkRequest): Promise<FrontworkResponse> {
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
                        return await route.handler(request);
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
        this.log(request, "[NOT FOUND]");
        if (this.middleware.not_found_handler === null) {
            return new FrontworkResponse(404, "ERROR 404 - Page not found");
        } else {
            return this.middleware.not_found_handler(request);
        }
	}

    log(request: FrontworkRequest, extra: string) {
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

// TODO: assets folder and favicon.ico
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





