import { parse_url, key_value_list_to_array } from "./utils.ts";
import { FrontworkClient } from './frontwork-client.ts'

// TODO: https://tsdoc.org/

export enum LogType {
    Info,
    Warn,
    Error,
}

export const FW =  {
    /**
     * Is false if dom.ts / frontwork-service.ts / frontwork-testworker.ts has been imported
     */
    is_client_side: true,
    
    /**
     * IF true FW.reporter will not be be called on LogType.Info.
     * Warn and Error messages will always be reported.
     */
    verbose_logging: false,
    
    /**
     * To enable a bug reporter for staging and production you can modify FW.reporter, that it sents a request to the backend
     * @param log_type: LogType 
     * @param category: string 
     * @param text: string
     * //TODO: Add Context
    */
    reporter: function(log_type: LogType, category: string, text: string, error: Error|null) {
        if (FW.verbose_logging && FW.is_client_side) {
            fetch(location.protocol+"//"+location.host+"//dr", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                  },
                body: JSON.stringify({ report_text: text })
            });
        }

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
        if(FW.verbose_logging) FW.reporter(LogType.Info, "I18n", "   Setting locale to \"" + locale + "\"", null);
        const locale_found = this.locales.find(l => l.locale === locale);

        if(locale_found === undefined) {
            FW.reporter(LogType.Error, "I18n", "Locale '"+locale+"' does not exist", null);
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
    translations: I18nLocaleTranslation;

    constructor(locale: string, translations: I18nLocaleTranslation) {
        this.locale = locale;
        this.translations = translations;
    }

    get_translation(id: string): string {
        const translation = this.translations[id];

        if(translation === undefined) {
            FW.reporter(LogType.Error, "I18n", "    Missing translation for the locale '"+this.locale+"': ,\""+id+"\": \"translated_text\"", null);
            return "";
        }

        return translation;
    }
}

export type I18nLocaleTranslation = { [key: string]: string };

export type ScopeItems = { [key: string]: string };

class Scope {
    items: ScopeItems;
    constructor(items: ScopeItems) {
        this.items = items;
    }

    get(key: string): string|null {
        const value = this.items[key]
        if(value === undefined) return null;
        // for (let i = 0; i < this.items.length; i++) {
        //     const item = this.items[i];
        //     if(item.key === key) {
        //         return item.value;
        //     }
        // }
        return value;
    }
}

export class GetScope extends Scope { constructor(items: ScopeItems) { super(items); } }
export class PostScope extends Scope {
    constructor(items: ScopeItems) { super(items); }
	
    /** Retrieve the POST data from a Request object and set it to PostScope.items */
    async from_request(_request: Request) {
        let content_type = _request.headers.get("content-type");
        if (content_type !== null) {
            content_type = content_type.split(";")[0];
            
            if (_request.body !== null) {
                if (content_type === "application/x-www-form-urlencoded") {
                    const reader = _request.body.getReader();
                    if (reader !== null) {
                        await reader.read().then((body) => {
                            if (body.value !== null) {
                                const body_string = new TextDecoder().decode(body.value);
                                this.items = key_value_list_to_array(body_string, "&", "=");
                            }
                        });
                    }
                } else if(content_type === "application/json") {
                    const reader = _request.body.getReader();
                    if (reader !== null) {
                        await reader.read().then((body) => {
                            if (body.value !== null) {
                                const body_string = new TextDecoder().decode(body.value);
                                this.items = JSON.parse(body_string);
                            }
                        });
                    }
                }
            }
        }

        return this;
	}
}
export class CookiesScope extends Scope { constructor(items: ScopeItems) { super(items); } }


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
            cookies_string === null ? {} : key_value_list_to_array(cookies_string, "; ", "=")
        );
    }

    __request_text(category: string) {
        let text = this.method + " " + this.path;
        if(this.query_string !== "") text += "?" + this.query_string;
        text += " [" + category + "]";

        const keys = Object.keys(this.POST.items);
        if (keys.length !== 0) {
            text += "\n    Scope POST: ";
            keys.forEach((key) => {
                text += "\n        " + key + " = \"" + this.POST.items[key] + "\"";
            })
        }
        return text;
    }

    log(category: string) {
        if(FW.verbose_logging) FW.reporter(LogType.Info, category, this.__request_text(category), null);
    }
    
    error(category: string, error: Error) {
        FW.reporter(LogType.Error, category, this.__request_text(category), error);
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
    

    constructor(context: FrontworkContext) {
        this.context = context;
        this.doctype = "<!DOCTYPE html>";
        this.set_html_lang(context.i18n.selected_locale.locale);
    }

    //
    // Head methods
    //

    head_append_tag(tag: string, attributes?: { [key: string]: string }) {
        const element = document.createElement(tag);
        if (attributes) {
            for (const key in attributes) {
                element.setAttribute(key, attributes[key]);
            }
        }
        this.context.document_head.append(element);
        return this;
    }

    add_head_meta_data(title: string, description: string, robots: string): DocumentBuilder {
        const meta_chatset = this.context.document_head.appendChild( document.createElement("meta") );
        meta_chatset.setAttribute("charset", "UTF-8");
        const meta_viewport = this.context.document_head.appendChild( document.createElement("meta") );
        meta_viewport.setAttribute("name", "viewport");
        meta_viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
        
        const meta_title = this.context.document_head.appendChild( document.createElement("title") );
        meta_title.innerHTML = title;
        
        const meta_description = this.context.document_head.appendChild( document.createElement("meta") );
        meta_description.setAttribute("name", "description");
        meta_description.setAttribute("content", description);
        
        const meta_robots = this.context.document_head.appendChild( document.createElement("meta") );
        meta_robots.setAttribute("name", "robots");
        meta_robots.setAttribute("content", robots);
        return this;
    }

    add_head_meta_opengraph_website(title: string, description: string, url: string, image_url: string): DocumentBuilder {
        const meta_og_type = this.context.document_head.appendChild( document.createElement("meta") );
        meta_og_type.setAttribute("property", "og:type");
        meta_og_type.setAttribute("content", "website");

        const meta_og_url = this.context.document_head.appendChild( document.createElement("meta") );
        meta_og_url.setAttribute("property", "og:url");
        meta_og_url.setAttribute("content", url);

        const meta_og_title = this.context.document_head.appendChild( document.createElement("meta") );
        meta_og_title.setAttribute("property", "og:title");
        meta_og_title.setAttribute("content", title);

        const meta_og_description = this.context.document_head.appendChild( document.createElement("meta") );
        meta_og_description.setAttribute("property", "og:description");
        meta_og_description.setAttribute("content", description);

        const meta_og_image = this.context.document_head.appendChild( document.createElement("meta") );
        meta_og_image.setAttribute("property", "og:image");
        meta_og_image.setAttribute("content", image_url);

        return this;
    }

    //
    // Body methods
    //

    set_html_lang(code: string): DocumentBuilder {
        this.context.document_html.setAttribute("lang", code);
        return this;
    }

    body_append(wr: HTMLElementWrapper<HTMLElement>) {
        this.context.document_body.append(wr.element);
        return wr;
    }

    //
    // Build methods
    //

    html() {
        // force adding style.css to the end of the head
        const style_css = this.context.document_head.appendChild( document.createElement("link") );
        style_css.setAttribute("rel", "stylesheet");
        style_css.setAttribute("href", "/assets/style.css");
        style_css.setAttribute("type", "text/css");

        // force adding main.js to the end of the body
        const main_js = this.context.document_body.appendChild( document.createElement("script") );
        main_js.setAttribute("src", "/assets/main.js");
        main_js.setAttribute("type", "text/javascript");

        return this.context.document_html;
    }

    toString() {
        const html_response = this.html();

        return this.doctype + '\n' 
            + html_response.outerHTML;
    }
}

export class FrontworkResponseRedirect extends FrontworkResponse {
    constructor(redirect_path: string) {
        if(FW.verbose_logging) FW.reporter(LogType.Info, "REDIRECT", "    [REDIRECT]-> "+redirect_path, null);
        
        super(301, "redirecting...");
        this.add_header("Location", redirect_path);
    }
}

export interface BuildEvent {
    (context: FrontworkContext): FrontworkResponse
}

export interface DomReadyEvent {
    (context: FrontworkContext, client: FrontworkClient): void
}

export declare interface Component {
    build: BuildEvent;
    dom_ready: DomReadyEvent;
}

export interface ErrorHandler {
    (context: FrontworkContext): FrontworkResponse;
}

export declare interface BeforeRouteEvent {
    build(context: FrontworkContext): void;
    dom_ready: DomReadyEvent;
}


let previous_route_id = 0;
export class Route {
    public id: number;
    public path: string;
    public component: new (context: FrontworkContext) => Component;

    constructor(path: string, component: new (context: FrontworkContext) => Component) {
        this.path = path;
        this.component = component;
        this.id = previous_route_id;
        previous_route_id += 1;
    }
}

export interface DomainToRouteSelector {
    (context: FrontworkContext): Route[]
}

export class FrontworkContext {
    readonly platform: EnvironmentPlatform;
    readonly stage: EnvironmentStage;
    readonly i18n: I18n;
    readonly request: FrontworkRequest;
    readonly do_building: boolean;

    readonly document_html: HTMLHtmlElement;
    readonly document_head: HTMLHeadElement;
    readonly document_body: HTMLBodyElement;

    constructor(platform: EnvironmentPlatform, stage: EnvironmentStage, i18n: I18n,request: FrontworkRequest, do_building: boolean) {
        this.platform = platform;
        this.stage = stage;
        this.i18n = i18n;
        this.request = request;
        this.do_building = do_building;

        this.document_html = document.createElement("html");
        this.document_head = this.document_html.appendChild( document.createElement("head") );
        this.document_body = this.document_html.appendChild( document.createElement("body") );
    }


    /**
     * Creates an HTML element.
     * @param tag The tag name of the element to create if it doesn't exist.
     * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
     * @returns HTMLElementWrapper
     */
    create_element<K extends keyof HTMLElementTagNameMap>(tag: K, attributes?: { [key: string]: string }): HTMLElementWrapper<HTMLElementTagNameMap[K]> {
        const element = document.createElement(tag);
        if (attributes) {
            for (const key in attributes) {
                element.setAttribute(key, attributes[key]);
            }
        }
        return new HTMLElementWrapper(element);
    }

    /**
     * Ensures the existence of an HTML element by ID. Creates a new element if it doesn't exist.
     * @param tag The tag name of the element to create if it doesn't exist.
     * @param id The ID of the element to search for or create. Must be unique!
     * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
     * @returns The HTML element with the specified ID.
     */
    ensure_element<K extends keyof HTMLElementTagNameMap>(tag: K, id: string, attributes?: { [key: string]: string }): HTMLElementWrapper<HTMLElementTagNameMap[K]> {
        const elem = this.do_building? this.document_html.querySelector("#"+id) : document.getElementById(id);
        if(elem !== null) return new HTMLElementWrapper<HTMLElementTagNameMap[K]>(elem as HTMLElementTagNameMap[K]);
        
        const elem2 = this.create_element(tag, attributes);
        elem2.element.id = id;
        return elem2;
    }

    /**
     * Ensures the existence of an HTML element by ID. Creates a new element and appends I18n text if it doesn't exist
     * @param tag The tag name of the element.
     * @param id The ID of the element to search for or create. Must be unique!
     * @param text The text content of the element.     
     * @param attributes Optional. Example: { class: "container", "data-role": "content" }
     * @returns The newly created HTML element.
     */
    ensure_text_element<K extends keyof HTMLElementTagNameMap>(tag: K, id: string, attributes?: { [key: string]: string }): HTMLElementWrapper<HTMLElementTagNameMap[K]> {
        const elem = this.do_building? this.document_html.querySelector("#"+id) : document.getElementById(id);
        if(elem !== null) return new HTMLElementWrapper<HTMLElementTagNameMap[K]>(elem as HTMLElementTagNameMap[K]);
        
        const elem2 = this.create_element(tag, attributes);
        elem2.element.id = id;
        elem2.element.innerText = this.i18n.get_translation(id);
        return elem2;
    }

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
        if(this.stage === EnvironmentStage.Development) FW.verbose_logging = true;
	}

	protected route_resolver(context: FrontworkContext): Route|null {
        // Routes
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
                            if(FW.verbose_logging) context.request.log("ROUTE #" + route.id + " ("+route.path+")");
                            return route;
                        }
                    }
                }
            }
        }

        return null;
	}

	protected route_execute_build(context: FrontworkContext, route: Route|null): {reponse: FrontworkResponse, dom_ready: DomReadyEvent} {
        // Route
        if (route) {
            try {
                const component = new route.component(context);
                return { reponse: component.build(context), dom_ready: component.dom_ready };
            } catch (error) {
                context.request.error("ROUTE #" + route.id + " ("+route.path+")", error);
                return { reponse: this.middleware.error_handler_component.build(context), dom_ready: this.middleware.error_handler_component.dom_ready };
            }
        }

        // Middleware: Not found
        if(FW.verbose_logging) context.request.log("NOT_FOUND");
        try {
            const component = new this.middleware.not_found_handler(context);
            return { reponse: component.build(context), dom_ready: component.dom_ready };
        } catch (error) {
            context.request.error("NOT_FOUND", error);
            return { reponse: this.middleware.error_handler_component.build(context), dom_ready: this.middleware.error_handler_component.dom_ready };
        }
	}

}

export interface FrontworkMiddlewareInit {
    error_handler: ErrorHandler;
	not_found_handler: new (context: FrontworkContext) => Component;
	before_route: BeforeRouteEvent;
    redirect_lonely_slash?: boolean;
}

export class FrontworkMiddleware {
    protected error_handler: ErrorHandler;
    /** The error handler should only have a response. The Component is only for internal use. */
    readonly error_handler_component: Component;
	readonly not_found_handler: new (context: FrontworkContext) => Component;
	readonly before_route: BeforeRouteEvent;
    readonly redirect_lonely_slash: boolean;

	constructor(init: FrontworkMiddlewareInit) {
        this.error_handler = init.error_handler
        this.error_handler_component = {
            build(context: FrontworkContext) { return init.error_handler(context); },
            dom_ready() {}
        }
        this.not_found_handler = init.not_found_handler;
        this.before_route = init.before_route;
        this.redirect_lonely_slash = init && init.redirect_lonely_slash? init.redirect_lonely_slash : true;
	}
}
