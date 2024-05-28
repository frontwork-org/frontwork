import { parse_url, key_value_list_to_array } from "./utils.ts";
import { FrontworkClient } from './frontwork-client.ts'

// TODO: https://tsdoc.org/

export enum LogType {
    Info,
    Warn,
    Error,
}

export const DEBUG =  {
    /**
     * IF true DEBUG.reporter will not be be called on LogType.Info.
     * Warn and Error messages will always be reported.
     */
    verbose_logging: false,
    
    /**
     * To enable a bug reporter for staging and production you can modify DEBUG.reporter, that it sents a request to the backend
     * @param log_type: LogType 
     * @param category: string 
     * @param text: string
    */
    reporter: function(log_type: LogType, category: string, text: string, error: Error|null) { 
        if (log_type === LogType.Error) {
            if(error === null) console.error(text);
            else console.error(text, error);
        } else if(log_type === LogType.Warn) {
            console.warn(text);
        } else if(log_type === LogType.Info) {
            console.log(text);
        }
    }
}


/**
 * Utility functions for DOM element manipulation.
 */
export class HTMLElementWrapper<T extends HTMLElement> {
    public element: T;

    constructor(element: T) {
        this.element = element;
    }

    append_to(parent: HTMLElementWrapper<HTMLElement>): this {
        parent.element.appendChild(this.element);
        return this;
    }
}

export const FW = {
    /**
     * Ensures the existence of an HTML element by ID. Creates a new element if it doesn't exist.
     * @param tag The tag name of the element to create if it doesn't exist.
     * @param id The ID of the element to search for or create. Must be unique!
     * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
     * @returns The HTML element with the specified ID.
     */
    create_element<T extends HTMLElement>(tag: string, attributes?: { [key: string]: string }): HTMLElementWrapper<T> {
        const element = document.createElement(tag);
        if (attributes) {
            for (const key in attributes) {
                element.setAttribute(key, attributes[key]);
            }
        }
        return new HTMLElementWrapper<T>(element as T);
    },

    /**
     * Ensures the existence of an HTML element by ID. Creates a new element if it doesn't exist.
     * @param tag The tag name of the element to create if it doesn't exist.
     * @param id The ID of the element to search for or create. Must be unique!
     * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
     * @returns The HTML element with the specified ID.
     */
    ensure_element<T extends HTMLElement>(tag: string, id: string, attributes?: { [key: string]: string }): HTMLElementWrapper<T> {
        let element = document.getElementById(id);
        if (!element) {
            element = document.createElement(tag);
            element.id = id;
            if (attributes) {
                for (const key in attributes) {
                    element.setAttribute(key, attributes[key]);
                }
            }
        }
        return new HTMLElementWrapper<T>(element as T);
    },

    /**
     * Creates a new HTML element with text content and optional attributes.
     * @param tag The tag name of the element.
     * @param id The ID of the element to search for or create. Must be unique!
     * @param text The text content of the element.     
     * @param attributes Optional. Example: { class: "container", "data-role": "content" }
     * @returns The newly created HTML element.
     */
    ensure_element_with_text<T extends HTMLElement>(tag: string, id: string, text: string, attributes?: { [key: string]: string }): HTMLElementWrapper<T> {
        let element = document.getElementById(id);
        if (!element) {
            element = document.createElement(tag);
            element.id = id;
            if (attributes) {
                for (const key in attributes) {
                    element.setAttribute(key, attributes[key]);
                }
            }
        }
        element.innerText = text;
        return new HTMLElementWrapper<T>(element as T);
    },

};


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
        if(DEBUG.verbose_logging) DEBUG.reporter(LogType.Info, "I18n", "   Setting locale to \"" + locale + "\"", null);
        const locale_found = this.locales.find(l => l.locale === locale);

        if(locale_found === undefined) {
            DEBUG.reporter(LogType.Error, "I18n", "Locale '"+locale+"' does not exist", null);
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
            DEBUG.reporter(LogType.Error, "I18n", "    Missing translation (key: '"+key+"') for the locale '"+this.locale+"'.", null);
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

        this.GET = new GetScope(
            key_value_list_to_array(parsed_url.query_string, "&", "=")
        );

        this.POST = post;

        const cookies_string = this.headers.get("cookie");
        this.COOKIES = new CookiesScope(
            cookies_string === null ? [] : key_value_list_to_array(cookies_string, "; ", "=")
        );
    }

    __request_text(category: string) {
        let text = this.method + " " + this.path;
        if(this.query_string !== "") text += "?" + this.query_string;
        text += " [" + category + "]";
        if (this.POST.items.length > 0) {
            text += "\n    Scope POST: ";
            for (let i = 0; i < this.POST.items.length; i++) {
                const item = this.POST.items[i];
                text += "\n        " + item.key + " = \"" + item.value + "\"";
            }
        }
        return text;
    }

    log(category: string) {
        if(DEBUG.verbose_logging) DEBUG.reporter(LogType.Info, category, this.__request_text(category), null);
    }
    
    error(category: string, error: Error) {
        DEBUG.reporter(LogType.Error, category, this.__request_text(category), error);
    }
}


export class FrontworkResponse {
    status_code: number;
    mime_type = "text/html";
    // content: DocumentBuilderInterface|Blob|string;
    content: DocumentBuilderInterface|string;
    headers: string[][] = [];
    cookies: Cookie[] = [];

    constructor(status_code: number, content: DocumentBuilderInterface|string) {
        this.status_code = status_code;
        this.content = content;
    }

    set_mime_type(mime_type: string) {
        this.mime_type = mime_type;
        return this;
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
        const response = new Response(this.content.toString(), { status: this.status_code });
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

export interface DocumentBuilderInterface {
    readonly context: FrontworkContext;
    readonly doctype: string;
    readonly document_html: HTMLHtmlElement;
    readonly document_head: HTMLHeadElement;
    readonly document_body: HTMLBodyElement;
    build(context: FrontworkContext): FrontworkResponse;
    dom_ready(context: FrontworkContext, client: FrontworkClient): void;
    head_append_tag(tag: string, attributes?: { [key: string]: string }): void;
    add_head_meta_data(title: string, description: string, robots: string): DocumentBuilder;
    body_append(wr: HTMLElementWrapper<HTMLElement>): void;
    set_html_lang(code: string): DocumentBuilder;
    html(): void;
    toString(): string;
}

export class DocumentBuilder implements DocumentBuilderInterface {
    readonly context: FrontworkContext;
    readonly doctype: string;
    readonly document_html: HTMLHtmlElement;
    readonly document_head: HTMLHeadElement;
    readonly document_body: HTMLBodyElement;

    constructor(context: FrontworkContext) {
        this.context = context;
        this.doctype = "<!DOCTYPE html>";
        this.document_html = <HTMLHtmlElement> document.createElement("html");
        this.document_head = <HTMLHeadElement> this.document_html.appendChild( document.createElement("head") );
        this.document_body = <HTMLBodyElement> this.document_html.appendChild( document.createElement("body") );
        this.set_html_lang(context.i18n.selected_locale.locale);
    }
    
	build(context: FrontworkContext): FrontworkResponse {
        return new FrontworkResponse(500, this);
	}
	dom_ready(context: FrontworkContext, client: FrontworkClient): void {
		throw new Error('Method not implemented.');
	}

    head_append_tag(tag: string, attributes?: { [key: string]: string }) {
        const element = document.createElement(tag);
        if (attributes) {
            for (const key in attributes) {
                element.setAttribute(key, attributes[key]);
            }
        }
        this.document_head.append(element);
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

    body_append(wr: HTMLElementWrapper<HTMLElement>) {
        this.document_body.append(wr.element);
    }

    set_html_lang(code: string): DocumentBuilder {
        this.document_html.setAttribute("lang", code);
        return this;
    }

    html() {
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
        const html_response = <HTMLElement> this.html();

        return this.doctype + '\n' 
            + html_response.outerHTML;
    }
}

export class FrontworkResponseRedirect extends FrontworkResponse {
    constructor(redirect_path: string) {
        if(DEBUG.verbose_logging) DEBUG.reporter(LogType.Info, "REDIRECT", "    [REDIRECT]-> "+redirect_path, null);
        
        super(301, "redirecting...");
        this.add_header("Location", redirect_path);
    }
}

export interface FrontworkResponseEvent {
    (request: FrontworkRequest): FrontworkResponse
}

export interface DomReadyEvent {
    (context: FrontworkContext, client: FrontworkClient): void
}

export declare interface Component {
    build(context: FrontworkContext): FrontworkResponse;
    dom_ready(context: FrontworkContext, client: FrontworkClient): void;
}

export declare interface ErrorHandler {
    build(context: FrontworkContext): FrontworkResponse;
    dom_ready(context: FrontworkContext, client: FrontworkClient): void;
}

export declare interface BeforeRoutes {
    build(context: FrontworkContext): FrontworkResponse|null;
    dom_ready(context: FrontworkContext, client: FrontworkClient): void;
}

export declare interface AfterRoutes {
    build(context: FrontworkContext, route_result: RoutesResolverResult|null): FrontworkResponse|null;
    dom_ready(context: FrontworkContext, client: FrontworkClient): void;
}



let previous_route_id = 0;
export class Route {
    public id: number;
    public path: string;
    public document_builder: new (context: FrontworkContext) => DocumentBuilder;

    constructor(path: string, document_builder: new (context: FrontworkContext) => DocumentBuilder) {
        this.path = path;
        this.document_builder = document_builder;
        this.id = previous_route_id;
        previous_route_id += 1;
    }
}

export interface DomainToRouteSelector {
    (context: FrontworkContext): Route[]
}

export interface FrontworkContext {
    readonly platform: EnvironmentPlatform;
    readonly stage: EnvironmentStage;
    readonly i18n: I18n;
    readonly request: FrontworkRequest;
}

export interface RoutesResolverResult {
    response: FrontworkResponse;
    dom_ready(context: FrontworkContext, client: FrontworkClient): void;
}

/**
 *   @param {EnvironmentPlatform} platform - Web, Desktop or Android
 *   @param {EnvironmentStage} stage - Development, Staging or Production
 *   @param {number} port - Which port should Deno start the webservice
 *   @param {DomainToRouteSelector[]} domain_to_route_selector - Function that selects which routes should work under a domain 
 *   @param {FrontworkMiddleware} middleware - Handler for every edge case like 404er, 500er. You can also execute code before a route executes.
 *   @param {i18n} I18n - Prepare always translations before hand to save time later. For every static string please use the context.i18n.get_translation() method.
 *   @param {boolean} build_on_page_load - Enable or Disable Client-Side-Rendering on DOM Ready
 */
export interface FrontworkInit {
    platform: EnvironmentPlatform, stage: EnvironmentStage, port: number, domain_to_route_selector: DomainToRouteSelector, middleware: FrontworkMiddleware, i18n: I18n, build_on_page_load: boolean
}

export class Frontwork {
    protected platform: EnvironmentPlatform;
    protected stage: EnvironmentStage
    protected port: number;
	protected domain_to_route_selector: DomainToRouteSelector;
	protected middleware: FrontworkMiddleware;
    protected i18n: I18n

	constructor(init: FrontworkInit) {
		this.platform = init.platform;
		this.stage = init.stage;
		this.port = init.port;
		this.domain_to_route_selector = init.domain_to_route_selector;
		this.middleware = init.middleware;
		this.i18n = init.i18n;
        if(this.stage === EnvironmentStage.Development) DEBUG.verbose_logging = true;
	}

	protected routes_resolver(context: FrontworkContext): RoutesResolverResult|null {
        const routes = this.domain_to_route_selector(context);
        for (let b = 0; b < routes.length; b++) {
            const route = routes[b];
            const route_path_dirs = route.path.split("/");

            if (context.request.path_dirs.length === route_path_dirs.length) {
                for (let c = 0; c < route_path_dirs.length; c++) {
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
                            try {
                                if(DEBUG.verbose_logging) context.request.log("ROUTE #" + route.id + " ("+route.path+")");
                                const cdata = new route.document_builder(context);
                                return { response: cdata.build(context), dom_ready: cdata.dom_ready };
                            } catch (error) {
                                context.request.error("ROUTE #" + route.id + " ("+route.path+")", error);
                                return { response: this.middleware.error_handler.build(context), dom_ready: this.middleware.error_handler.dom_ready };
                            }
                        }
                    }
                }
            }
        }

        return null;
	}

	protected routes_resolver_with_middleware(context: FrontworkContext): RoutesResolverResult {
        // Middleware: redirect lonely slash
        if (this.middleware.redirect_lonely_slash && context.request.path_dirs.length > 2 && context.request.path_dirs[context.request.path_dirs.length -1] === "") {
            let new_path = "";
            for (let i = 0; i < context.request.path_dirs.length - 1; i++) {
                if (context.request.path_dirs[i] !== "") {
                    new_path += "/" + context.request.path_dirs[i];
                }
            }
            
            if(DEBUG.verbose_logging) context.request.log("LONELY_SLASH_REDIRECT");
            const redirect_component: RoutesResolverResult = {
                response: new FrontworkResponseRedirect(new_path),
                dom_ready: () => {}
            };
            return redirect_component;
        }

		// Middleware: before Routes
        if (this.middleware.before_routes !== null) {
            if(DEBUG.verbose_logging) context.request.log("BEFORE_ROUTES");
            try {
                const response = this.middleware.before_routes.build(context);
                if(response !== null) return { response: response, dom_ready: this.middleware.before_routes.dom_ready };
            } catch (error) {
                context.request.error("BEFORE_ROUTES", error);
                return { response: this.middleware.error_handler.build(context), dom_ready: this.middleware.error_handler.dom_ready };
            }
        }

        // Routes
        const route_result = this.routes_resolver(context);

        // Middleware: after Routes
        if (this.middleware.after_routes !== null) {
            if(DEBUG.verbose_logging) context.request.log("AFTER_ROUTES");
            try {
                const response = this.middleware.after_routes.build(context, route_result);
                if(response !== null) return { response: response, dom_ready: this.middleware.after_routes.dom_ready };
            } catch (error) {
                context.request.error("AFTER_ROUTES", error);
                return { response: this.middleware.error_handler.build(context), dom_ready: this.middleware.error_handler.dom_ready };
            }
        }
        
        if (route_result === null) {
            if(DEBUG.verbose_logging) context.request.log("NOT_FOUND");
            const response = this.middleware.not_found_handler.build(context);
            if (response === null) {
                return { response: new FrontworkResponse(404, "Page not found"), dom_ready: this.middleware.not_found_handler.dom_ready };
            }
            return { response: response, dom_ready: this.middleware.not_found_handler.dom_ready };
        }
        return route_result;
	}
}

export interface FrontworkMiddlewareInit {
    error_handler: ErrorHandler;
	not_found_handler: Component;
	before_routes?: BeforeRoutes|null;
	after_routes?: AfterRoutes|null;
    redirect_lonely_slash?: boolean;
}

export class FrontworkMiddleware {
    error_handler: ErrorHandler;
	not_found_handler: Component;
	before_routes: BeforeRoutes|null;
	after_routes: AfterRoutes|null;
    redirect_lonely_slash: boolean;

	constructor(init: FrontworkMiddlewareInit) {
        this.error_handler = init.error_handler
        this.not_found_handler = init.not_found_handler;
        this.before_routes = init && init.before_routes? init.before_routes : null;
        this.after_routes = init && init.after_routes? init.after_routes : null;
        this.redirect_lonely_slash = init && init.redirect_lonely_slash? init.redirect_lonely_slash : true;
	}
}
