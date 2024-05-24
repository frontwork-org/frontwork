import { parse_url, key_value_list_to_array } from "./utils.ts";
import { FrontworkClient } from './frontwork-client.ts'

// TODO: https://tsdoc.org/

export enum LogType {
    Info,
    Warn,
    Error,
}

class Debug {
    /**
     * Choose on which DebugMode should the function debug.reporter be called.
     * Error messages will always be reported
     */
    verbose_logging: boolean = false;
    
    /**
     * To enable a bug reporter for staging and production you can modify debug.reporter, that it sents a request to the backend
     * @param log_type: LogType 
     * @param category: string 
     * @param text: string
    */
    reporter = (log_type: LogType, category: string, text: string) => { 
        if (log_type === LogType.Error) {
            console.error(text); 
        } else {
            console.log(text); 
        }
    };
}
export const debug = new Debug();


export enum EnvironmentPlatform {
    Web,
    Desktop,
    Android,
}

export enum EnvironmentStage {
    Development,
    Staging,
    Production,
}

export class I18n {
    locales: I18nLocale[];
    selected_locale: I18nLocale;

    constructor(locales: I18nLocale[]) {
        if(locales.length === 0) throw new Error("I18n: No locales provided");
        
        this.locales = locales;
        this.selected_locale = locales[0];
    }

    set_locale(locale: string) {
        if(debug.verbose_logging) console.log("I18n: Setting locale to " + locale);
        const locale_found = this.locales.find(l => l.locale === locale);

        if(locale_found === undefined) {
            debug.reporter(LogType.Error, "I18n", "Locale '"+locale+"' does not exist");
            return false;
        }
        
        this.selected_locale = locale_found;
        return true;
    }

    get_translation(key: string): string {
        return this.selected_locale.get_translation(key);
    }
    
}

export class I18nLocale {
    locale: string;
    translations: I18nLocaleTranslation[];

    constructor(locale: string, translations: I18nLocaleTranslation[]) {
        this.locale = locale;
        this.translations = translations;
    }

    get_translation(key: string): string {
        const translation = this.translations.find(t => t.key === key);

        if(translation === undefined) {
            debug.reporter(LogType.Error, "I18n", "The translation can not be retrieved because the specific key '"+key+"' for the locale '"+this.locale+"' does not exist.");
            return "";
        }

        return translation.translation;
    }
}

export class I18nLocaleTranslation {
    key: string;
    translation: string;

    constructor(key: string, translation: string) {
        this.key = key;
        this.translation = translation;
    }
}



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
    value: string;
    expires: number|null = null;
    max_age: number|null = null;
    domain: string|null = null;
    path = "/";
    secure = false;
    http_only = false;
    same_site: string|null = null;

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
        this.path_dirs = decodeURIComponent(parsed_url.path.replace(/\+/g, '%20')).split("/");
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

export class DocumentBuilder {
    readonly doctype: string;
    readonly document_html: HTMLHtmlElement;
    readonly document_head: HTMLHeadElement;
    readonly document_body: HTMLBodyElement;

    constructor(doctype?: string) {
        this.doctype = doctype || "<!DOCTYPE html>";
        this.document_html = <HTMLHtmlElement> document.createElement("html");
        this.document_head = <HTMLHeadElement> this.document_html.appendChild( document.createElement("head") );
        this.document_body = <HTMLBodyElement> this.document_html.appendChild( document.createElement("body") );
    }

    set_html_lang(code: string): DocumentBuilder {
        this.document_html.setAttribute("lang", code);
        return this;
    }

    add_head_meta_data(title: string, description: string, robots: string): DocumentBuilder {
        const meta_chatset = this.document_head.appendChild( document.createElement("meta") );
        meta_chatset.setAttribute("charset", "UTF-8");
        const meta_viewport = this.document_head.appendChild( document.createElement("meta") );
        meta_viewport.setAttribute("name", "viewport");
        meta_viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
        
        const meta_title = this.document_head.appendChild( document.createElement("title") );
        meta_title.innerHTML = title;
        
        const meta_description = this.document_head.appendChild( document.createElement("meta") );
        meta_description.setAttribute("name", "description");
        meta_description.setAttribute("content", description);
        
        const meta_robots = this.document_head.appendChild( document.createElement("meta") );
        meta_robots.setAttribute("name", "robots");
        meta_robots.setAttribute("content", robots);
        return this;
    }

    add_head_meta_opengraph_website(title: string, description: string, url: string, image_url: string): DocumentBuilder {
        const meta_og_type = this.document_head.appendChild( document.createElement("meta") );
        meta_og_type.setAttribute("property", "og:type");
        meta_og_type.setAttribute("content", "website");

        const meta_og_url = this.document_head.appendChild( document.createElement("meta") );
        meta_og_url.setAttribute("property", "og:url");
        meta_og_url.setAttribute("content", url);

        const meta_og_title = this.document_head.appendChild( document.createElement("meta") );
        meta_og_title.setAttribute("property", "og:title");
        meta_og_title.setAttribute("content", title);

        const meta_og_description = this.document_head.appendChild( document.createElement("meta") );
        meta_og_description.setAttribute("property", "og:description");
        meta_og_description.setAttribute("content", description);

        const meta_og_image = this.document_head.appendChild( document.createElement("meta") );
        meta_og_image.setAttribute("property", "og:image");
        meta_og_image.setAttribute("content", image_url);

        return this;
    }

    html_response() {
        // force adding style.css to the end of the head
        const style_css = this.document_head.appendChild( document.createElement("link") );
        style_css.setAttribute("rel", "stylesheet");
        style_css.setAttribute("href", "/assets/style.css");
        style_css.setAttribute("type", "text/css");

        // force adding main.js to the end of the body
        const main_js = this.document_body.appendChild( document.createElement("script") );
        main_js.setAttribute("src", "/assets/main.js");
        main_js.setAttribute("type", "text/javascript");

        return this.document_html;
    }

    toString() {
        const html_response = <HTMLElement> this.html_response();

        let content = this.doctype + '\n';
        content += html_response.outerHTML;
        return content;
    }
}

export class FrontworkResponse {
    status_code: number;
    mime_type = "text/html";
    content: DocumentBuilder|Blob|string;
    headers: string[][] = [];
    cookies: Cookie[] = [];

    constructor(status_code: number, content: DocumentBuilder|Blob|string) {
        this.status_code = status_code;
        this.content = content;
    }

    add_header(name: string, value: string) {
        this.headers.push([name, value]);
        return this;
    }

    get_header(name: string) {
        for (const header of this.headers) {
            if (header[0] === name) {
                return header[1];
            }
        }
        return null;
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

export interface FrontworkErrorResponseEvent {
    (request: FrontworkRequest, error: Error): FrontworkResponse
}

export interface DomReadyEvent {
    (context: FrontworkContext, frontwork: FrontworkClient): void
}

export declare interface Component {
    build(context: FrontworkContext, frontwork: Frontwork): FrontworkResponse|null;
    dom_ready(context: FrontworkContext, frontwork: FrontworkClient): void;
}

let previous_route_id = 0;
export class Route {
    public id: number;
    public path: string;
    component: Component;

    constructor(path: string, component: Component) {
        this.path = path;
        this.component = component;

        this.id = previous_route_id;
        previous_route_id += 1;
    }
}

export class DomainRoutes {
    public domain: RegExp;
    public routes: Route[] = [];

    constructor(domain: RegExp, routes: Route[]) {
        this.domain = domain;
        this.routes = routes;
    }
}

export interface FrontworkContext {
    readonly platform: EnvironmentPlatform;
    readonly stage: EnvironmentStage;
    readonly i18n: I18n;
    readonly request: FrontworkRequest;
}

export interface RoutesResolverResult {
    response: FrontworkResponse|null;
    dom_ready(context: FrontworkContext, frontwork: FrontworkClient): void;
}

/**
 *   @param {boolean} build_on_page_load - Enable or Disable Client-Side-Rendering on DOM Ready
 */
export interface FrontworkInit {
    platform: EnvironmentPlatform, stage: EnvironmentStage, port: number, domain_routes: DomainRoutes[], middleware: FrontworkMiddleware, i18n: I18n, build_on_page_load: boolean
}

export class Frontwork {
    protected platform: EnvironmentPlatform;
    protected stage: EnvironmentStage
    protected port: number;
	protected domain_routes: DomainRoutes[];
	protected middleware: FrontworkMiddleware;
    protected i18n: I18n

	constructor(init: FrontworkInit) {
		this.platform = init.platform;
		this.stage = init.stage;
		this.port = init.port;
		this.domain_routes = init.domain_routes;
		this.middleware = init.middleware;
		this.i18n = init.i18n;
        if(this.stage === EnvironmentStage.Development) debug.verbose_logging = true;
	}

	protected routes_resolver(context: FrontworkContext): RoutesResolverResult|null {
        // Middleware: redirect lonely slash
        if (this.middleware.redirect_lonely_slash && context.request.path_dirs.length > 2 && context.request.path_dirs[context.request.path_dirs.length -1] === "") {
            let new_path = "";
            for (let i = 0; i < context.request.path_dirs.length - 1; i++) {
                if (context.request.path_dirs[i] !== "") {
                    new_path += "/" + context.request.path_dirs[i];
                }
            }
            
            this.log(context.request, "[REDIRECT] -> " + new_path);
            const redirect_component: RoutesResolverResult = {
                response: new FrontworkResponseRedirect(new_path),
                dom_ready: () => {}
            };
            return redirect_component;
        }

		// Middleware: before Routes
        if (this.middleware.before_routes !== null) {
            this.log(context.request, "BEFORE_ROUTES");
            const response = this.middleware.before_routes.build(context, this);
            if(response !== null) return { response: response, dom_ready: this.middleware.before_routes.dom_ready };
        }

        // Routes
        for (let i = 0; i < this.domain_routes.length; i++) {
            const domain_routes = this.domain_routes[i];
            if (domain_routes.domain.test(context.request.host)) {
                for (let i = 0; i < domain_routes.routes.length; i++) {
                    const route = domain_routes.routes[i];
                    const route_path_dirs = route.path.split("/");

                    if (context.request.path_dirs.length === route_path_dirs.length) {
                        let found = true;
                        for (let i = 0; i < route_path_dirs.length; i++) {
                            const route_path_dir = route_path_dirs[i];
                            if (route_path_dir !== "*" && route_path_dir !== context.request.path_dirs[i]) {
                                found = false;
                                break;
                            }
                        }

                        if (found) {
                            this.log(context.request, "ROUTE #" + route.id + " ("+route.path+")");
                            const response = route.component.build(context, this);
                            if(response !== null) return { response: response, dom_ready: route.component.dom_ready };
                        }
                    }
                }
            }
        }

        // Middleware: after Routes
        if (this.middleware.after_routes !== null) {
            this.log(context.request, "AFTER_ROUTES");
            const response = this.middleware.after_routes.build(context, this);
            if(response !== null) return { response: response, dom_ready: this.middleware.after_routes.dom_ready };
        }

        return null;
	}

    protected log(request: FrontworkRequest, category: string) {
        this.middleware.log(request, category);
    }
}

export interface FrontworkMiddlewareInit {
    error_handler?: FrontworkErrorResponseEvent|null;
	not_found_handler?: Component|null;
	before_routes?: Component|null;
	after_routes?: Component|null;
    redirect_lonely_slash?: boolean;
}

export class FrontworkMiddleware {
    error_handler: FrontworkErrorResponseEvent;
	not_found_handler: Component;
	before_routes: Component|null;
	after_routes: Component|null;
    redirect_lonely_slash: boolean;

	constructor(init?: FrontworkMiddlewareInit) {
        // Middleware: error
        if (init && init.error_handler) {
            const init_error_handler = init.error_handler;
            this.error_handler = (request: FrontworkRequest, error: Error): FrontworkResponse => {
                this.error(request, "Userspace", error);
                return init_error_handler(request, error);
            }
        } else {
            this.error_handler = (request: FrontworkRequest, error: Error): FrontworkResponse => {
                this.error(request, "Userspace", error);
                return new FrontworkResponse(500, "ERROR");
            }
        }

        // Middleware: not found
        if (init && init.not_found_handler) {
            this.not_found_handler = init.not_found_handler;
        } else {
            this.not_found_handler = {
                build: (): FrontworkResponse => {
                    return new FrontworkResponse(404, "ERROR 404 - Page not found");
                },
                dom_ready: () => {}
            }
        }
        
        this.before_routes = init && init.before_routes? init.before_routes : null;
        this.after_routes = init && init.after_routes? init.after_routes : null;
        this.redirect_lonely_slash = init && init.redirect_lonely_slash? init.redirect_lonely_slash : true;
	}

    __request_text(request: FrontworkRequest, called_from: string) {
        let text = request.method + " " + request.path;
        if(request.query_string !== "") text += "?" + request.query_string;
        text += " [" + called_from + "]";
        if (request.POST.items.length > 0) {
            text += "\n    Scope POST: ";
            for (let i = 0; i < request.POST.items.length; i++) {
                const item = request.POST.items[i];
                text += "\n        " + item.key + " = \"" + item.value + "\"";
            }
        }
        return text;
    }

    log(request: FrontworkRequest, category: string) {
        debug.reporter(LogType.Info, category, this.__request_text(request, category));
    }
    
    error(request: FrontworkRequest, category: string, error: Error) {
        debug.reporter(LogType.Info, category, this.__request_text(request, category));
        console.error(error)
    }
}
