import { parse_url, key_value_list_to_object, Observer, Result, ObserverRetrieverFunction } from "./utils.ts";
import { FrontworkClient } from './frontwork-client.ts'


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
     * If true the default reporter will sent some client logs to the dev server
     */
    reporter_client_to_server: true,
    
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
    */
    // deno-lint-ignore no-unused-vars
    reporter: function(log_type: LogType, category: string, text: string, context: FrontworkContext|null, error: Error|string|null) {
        if (FW.reporter_client_to_server && FW.is_client_side) {
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
 * Some methods will only execute if do_building is true
 */
export class ElemKit<T extends HTMLElement> {
    readonly elem: T;
    readonly created_element: boolean; // true if element was created; Otherwise false the element already exists

    constructor(element: T, created_element: boolean) {
        this.elem = element;
        this.created_element = created_element;
    }

    prepend_to(parent: ElemKit<HTMLElement>): this {
        if(this.created_element) parent.elem.prepend(this.elem);
        return this;
    }

    append_to(parent: ElemKit<HTMLElement>): this {
        if(this.created_element) parent.elem.append(this.elem);
        return this;
    }

    replace_text(search: string, replace: string) {
        this.elem.innerText = this.elem.innerText.split(search).join(replace);
    }

    replace_html(search: string, replace: string) {
        this.elem.innerHTML = this.elem.innerHTML.split(search).join(replace);
    }

    then(runnable: () => void) {
        if(this.created_element) runnable();
    }

    show() {
        const attr_value = this.elem.getAttribute("style");
        if (attr_value) this.elem.setAttribute("style", attr_value.replace("display: none;", ""));
    }

    hide() {
        const current_style = this.elem.getAttribute("style");
        if (current_style === null) {
            this.elem.setAttribute("style", "display: none;");
        } else {
            if(!current_style.includes("display: none;")) this.elem.setAttribute("style", current_style + " display: none;");
        }
    }
}

/**
 * Importent: action must be "" or beginn with a slash
 */
export class FrontworkForm extends ElemKit<HTMLFormElement> {
    constructor(context: FrontworkContext, id: string, action: string, method: string) {
        super(context.ensure_element("form", id, { action: action, method: method }).elem, context.do_building);
        this.elem.setAttribute("fw-form", "1");
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

export type I18n = I18nLocale[];

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
            FW.reporter(LogType.Error, "I18n", "    Missing translation for the locale '"+this.locale+"': ,\""+id+"\": \"translated_text\"", null, null);
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
        return value;
    }

    forEach(callback: (key: string, value: string) => void): void {
        Object.entries(this.items).forEach(([key, value]) => {
            callback(key, value);
        });
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
                                this.items = key_value_list_to_object(body_string, "&", "=");
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
            key_value_list_to_object(parsed_url.query_string, "&", "=")
        );

        this.POST = post;

        const cookies_string = this.headers.get("cookie");
        this.COOKIES = new CookiesScope(
            cookies_string === null ? {} : key_value_list_to_object(cookies_string, "; ", "=")
        );
    }

    get_domain(): string {
        return this.host.split(":")[0];
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

    log(category: string, context: FrontworkContext|null) {
        if(FW.verbose_logging) FW.reporter(LogType.Info, category, this.__request_text(category), context, null);
    }
    
    error(category: string, context: FrontworkContext, error: Error) {
        FW.reporter(LogType.Error, category, this.__request_text(category), context, error);
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
    body_append(wr: ElemKit<HTMLElement>): void;
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
        this.set_html_lang(context.selected_locale.locale);
    }

    //
    // Head methods
    //

    head_append_tag(tag: string, attributes?: { [key: string]: string }) {
        if (this.context.do_building) {
            const element = document.createElement(tag);
            if (attributes) {
                for (const key in attributes) {
                    element.setAttribute(key, attributes[key]);
                }
            }
            this.context.head.elem.append(element);
        }
        return this;
    }

    add_head_meta_data(title: string, description: string, robots: string): DocumentBuilder {
        if (this.context.do_building) {
            const meta_chatset = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_chatset.setAttribute("charset", "UTF-8");
            
            const meta_compatible = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_compatible.setAttribute("http-equiv", "X-UA-Compatible");
            meta_compatible.setAttribute("content", "IE=edge");
            
            const meta_viewport = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_viewport.setAttribute("name", "viewport");
            meta_viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
            
            const meta_title = this.context.head.elem.appendChild( document.createElement("title") );
            meta_title.innerHTML = title;
            
            const meta_description = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_description.setAttribute("name", "description");
            meta_description.setAttribute("content", description);
            
            const meta_robots = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_robots.setAttribute("name", "robots");
            meta_robots.setAttribute("content", robots);
        }
        return this;
    }

    add_head_meta_opengraph_website(title: string, description: string, url: string, image_url: string): DocumentBuilder {
        if (this.context.do_building) {
            const meta_og_type = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_og_type.setAttribute("property", "og:type");
            meta_og_type.setAttribute("content", "website");

            const meta_og_url = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_og_url.setAttribute("property", "og:url");
            meta_og_url.setAttribute("content", url);

            const meta_og_title = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_og_title.setAttribute("property", "og:title");
            meta_og_title.setAttribute("content", title);

            const meta_og_description = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_og_description.setAttribute("property", "og:description");
            meta_og_description.setAttribute("content", description);

            const meta_og_image = this.context.head.elem.appendChild( document.createElement("meta") );
            meta_og_image.setAttribute("property", "og:image");
            meta_og_image.setAttribute("content", image_url);
        }

        return this;
    }

    //
    // Body methods
    //

    set_html_lang(code: string): DocumentBuilder {
        this.context.html.elem.setAttribute("lang", code);
        return this;
    }

    body_append(wr: ElemKit<HTMLElement>) {
        this.context.body.elem.append(wr.elem);
        return wr;
    }

    //
    // Build methods
    //

    html() {
        if (this.context.do_building) {
            // force adding style.css to the end of the head
            const style_css = this.context.head.elem.appendChild( document.createElement("link") );
            style_css.setAttribute("id", "fw-style");
            style_css.setAttribute("rel", "stylesheet");
            style_css.setAttribute("href", "/css/style.css");
            style_css.setAttribute("type", "text/css");
    
            // force adding main.client.js to the end of the body
            const main_js = this.context.body.elem.appendChild( document.createElement("script") );
            main_js.setAttribute("id", "fw-script");
            main_js.setAttribute("src", "/js/main.client.js");
            main_js.setAttribute("type", "text/javascript");
        }

        return this.context.html;
    }

    toString() {
        const html_response = this.html();

        return this.doctype + '\n' 
            + html_response.elem.outerHTML;
    }
}

// Generally you use 301 for redirects, but you use 302 for things that should not be cached like redirects after logins.
export class FrontworkResponseRedirect extends FrontworkResponse {
    constructor(redirect_path: string, status_code: number) {
        if(FW.verbose_logging) FW.reporter(LogType.Info, "REDIRECT", "    ["+status_code+" REDIRECT]-> "+redirect_path, null, null);
        
        super(status_code, "redirecting...");
        this.add_header("Location", redirect_path);
    }
}

export interface BuildEvent {
    (context: FrontworkContext): Promise<FrontworkResponse>
}

export interface DomReadyEvent {
    (context: FrontworkContext, client: FrontworkClient): void
}

export declare interface Component {
    build: BuildEvent;
    dom_ready: DomReadyEvent;
    on_destroy: (context: FrontworkContext, client: FrontworkClient) => void;
}

export interface ErrorHandler {
    (context: FrontworkContext): Promise<FrontworkResponse>
}

export declare interface BeforeRouteEvent {
    build(context: FrontworkContext): Promise<void>;
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
    (context: FrontworkContext): Promise<Route[]>
}

export interface ApiRequestExtras {
    /** A string indicating how the request will interact with the browser's cache to set request's cache. */
    cache?: RequestCache;
    /** RequestCredentials is a string that specifies how the browser should handle credentials (cookies, HTTP authentication, and client-side SSL certificates) for cross-origin requests.. */
    // credentials?: RequestCredentials;
    /** A Headers object, an object literal, or an array of two-item arrays to set request's headers. */
    headers?: Headers;
    /** A cryptographic hash of the resource to be fetched by request. Sets request's integrity. */
    // integrity?: string;
    /** A boolean to set request's keepalive. */
    // keepalive?: boolean;
    /** A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode. */
    // mode?: RequestMode;
    // priority?: RequestPriority;
    /** A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect. */
    redirect?: RequestRedirect;
    /** A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer. */
    // referrer?: string;
    /** A referrer policy to set request's referrerPolicy. */
    // referrerPolicy?: ReferrerPolicy;
    /** An AbortSignal to set request's signal. */
    signal?: AbortSignal | null;
}

export interface ApiErrorResponse {
    status: number;
    error_message: string
}

export interface ApiErrorEvent {
    ( context: FrontworkContext, client: FrontworkClient|null, method: "GET"|"POST", path: string, params: { [key: string]: string|number|boolean | string[]|number[]|boolean[] }, error: ApiErrorResponse ): void
}

export enum PageloadType { Serverside, ClientAfterServerside, ClientDefault }

const client_observers: {[key: string]: Observer<any>} = {};

export class FrontworkContext {
    readonly platform: EnvironmentPlatform;
    readonly stage: EnvironmentStage;
    readonly client_ip: string; // For Deno side use only. On Client side it will be always 127.0.0.1
    readonly api_protocol_address: string; // API Address Browser should use
    readonly api_protocol_address_ssr: string; // API Address Deno should use
    readonly i18n: I18n;
    readonly request: FrontworkRequest;
    readonly do_building: boolean;

    readonly html: ElemKit<HTMLHtmlElement>;
    readonly head: ElemKit<HTMLHeadElement>;
    readonly body: ElemKit<HTMLBodyElement>;

    private api_error_event: ApiErrorEvent;
    private client: FrontworkClient|null;

    /**
     * Set-Cookie headers for deno side rendering. Deno should retrieve Cookies from the API and pass them to the browser. Should not be used to manually set Cookies. Use the FrontworkResponse.set_cookie method instead
     */
    set_cookies: string[] = [];
    selected_locale: I18nLocale;

    constructor(platform: EnvironmentPlatform, stage: EnvironmentStage, client_ip: string, api_protocol_address: string, api_protocol_address_ssr: string, api_error_event: ApiErrorEvent, i18n: I18n, request: FrontworkRequest, do_building: boolean, client: FrontworkClient|null) {
        this.platform = platform;
        this.stage = stage;
        this.client_ip = client_ip;
        this.api_protocol_address = api_protocol_address;
        this.api_protocol_address_ssr = api_protocol_address_ssr;
        this.api_error_event = api_error_event;
        this.request = request;
        this.do_building = do_building;
        this.client = client;

        if (do_building) {
            this.html = new ElemKit(document.createElement("html"), true);
            this.head = new ElemKit(this.html.elem.appendChild(document.createElement("head")), true);
            this.body = new ElemKit(this.html.elem.appendChild(document.createElement("body")), true);
        } else {
            this.html = new ElemKit(document.querySelector("html") as HTMLHtmlElement, false);
            this.head = new ElemKit(document.querySelector("head") as HTMLHeadElement, false);
            this.body = new ElemKit(document.querySelector("body") as HTMLBodyElement, false);
        }
        
        // I18n
        if(i18n.length === 0) throw new Error("I18n: No locales provided");
        this.i18n = i18n;
        this.selected_locale = i18n[0];
    }

    set_locale(locale: string) {
        if(FW.verbose_logging) FW.reporter(LogType.Info, "I18n", "    Setting locale to \"" + locale + "\"", null, null);
        const locale_found = this.i18n.find(l => l.locale === locale);

        if(locale_found === undefined) {
            FW.reporter(LogType.Error, "I18n", "Locale '"+locale+"' does not exist", null, null);
            return false;
        }
        
        this.selected_locale = locale_found;
        return true;
    }

    get_translation(key: string): string {
        return this.selected_locale.get_translation(key);
    }

    get_translation_replace(key: string, search: string, replace: string): string {
        return this.selected_locale.get_translation(key).split(search).join(replace);
    }

    get_translation_replace_number(key: string, search: string, number: number): string {
        if (number === 1) return this.selected_locale.get_translation(key+"_one");
        return this.selected_locale.get_translation(key).split(search).join(number.toString());
    }


    private readonly server_observers: {[key: string]: Observer<any>} = {};

    get_observer<T>(key: string): Observer<T> {
        if (FW.is_client_side) {
            // Client: Reuse existing observer or create new one
            if (!client_observers[key]) {
                client_observers[key] = new Observer<T>();
            }
            return client_observers[key];
        } else {
            // Deno Server: Reuse existing observer or create new one
            if (!this.server_observers[key]) {
                this.server_observers[key] = new Observer<T>();
            }
            return this.server_observers[key];
        }
    }


    /**
     * Creates an HTML element. DOES NOT CHECK IF ALREADY EXIST.
     * @param tag The tag name of the element to create.
     * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
     * @returns ElemKit
     */
    create_element<K extends keyof HTMLElementTagNameMap>(tag: K, attributes?: { [key: string]: string }): ElemKit<HTMLElementTagNameMap[K]> {
        const elem = document.createElement(tag);
        if (attributes) {
            for (const key in attributes) {
                elem.setAttribute(key, attributes[key]);
            }
        }
        return new ElemKit(elem, true);
    }

    /**
     * Creates a new element and appends I18n text. DOES NOT CHECK IF ALREADY EXIST.
     * @param tag The tag name of the element to create.
     * @param i18n_key The keyword specified in the english.json. Uses innerText to set the translated text.
     * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
     * @returns ElemKit
     */
    create_text_element<K extends keyof HTMLElementTagNameMap>(tag: K, i18n_key: string, attributes?: { [key: string]: string }): ElemKit<HTMLElementTagNameMap[K]> {
        const elem = document.createElement(tag);
        elem.innerText = this.get_translation(i18n_key);
        if (attributes) {
            for (const key in attributes) {
                elem.setAttribute(key, attributes[key]);
            }
        }
        return new ElemKit(elem, true);
    }

    /**
     * Ensures the existence of an HTML element by ID. Creates a new element if it doesn't exist.
     * @param tag The tag name of the element to create if it doesn't exist.
     * @param id The ID of the element to search for or create. Must be unique!
     * @param attributes Optional. Attributes will be only added if it is created. Example: { class: "container", "data-role": "content" }
     * @returns The HTML element with the specified ID.
     */
    ensure_element<K extends keyof HTMLElementTagNameMap>(tag: K, id: string, attributes?: { [key: string]: string }): ElemKit<HTMLElementTagNameMap[K]> {
        const elem = this.do_building? this.html.elem.querySelector("#"+id) : document.getElementById(id);
        if(elem !== null) return new ElemKit<HTMLElementTagNameMap[K]>(elem as HTMLElementTagNameMap[K], false);
        
        const elem2 = document.createElement(tag);
        elem2.id = id;
        if (attributes) {
            for (const key in attributes) {
                elem2.setAttribute(key, attributes[key]);
            }
        }
        return new ElemKit(elem2, true);
    }

    /**
     * Ensures the existence of an HTML element by ID. Creates a new element and appends I18n text if it doesn't exist
     * @param tag The tag name of the element.
     * @param id The ID of the element to search for or create. Must be unique!
     * @param text The text content of the element.     
     * @param attributes Optional. Example: { class: "container", "data-role": "content" }
     * @returns The newly created HTML element.
     */
    ensure_text_element<K extends keyof HTMLElementTagNameMap>(tag: K, id: string, attributes?: { [key: string]: string }): ElemKit<HTMLElementTagNameMap[K]> {
        const elem = this.do_building? this.html.elem.querySelector("#"+id) : document.getElementById(id);
        if(elem !== null) return new ElemKit<HTMLElementTagNameMap[K]>(elem as HTMLElementTagNameMap[K], false);
        
        const elem2 = document.createElement(tag);
        elem2.id = id;
        elem2.innerText = this.get_translation(id);
        if (attributes) {
            for (const key in attributes) {
                elem2.setAttribute(key, attributes[key]);
            }
        }
        return new ElemKit(elem2, true);
    }


    async api_request<T>(method: "GET"|"POST", path: string, params: { [key: string]: string|number|boolean | string[]|number[]|boolean[] }, extras: ApiRequestExtras = {}): Promise<Result<T, ApiErrorResponse>> {
        let url = (FW.is_client_side? this.api_protocol_address : this.api_protocol_address_ssr) + path;
        
        // Prepare request options
        const options: RequestInit = extras; 
        options.method = method;
        options.headers = extras.headers? extras.headers : new Headers();
        
        // Add parameters
        let params_string = "";
        const params_array = Object.entries(params);
        if(params_array.length > 0) {
            params_string += params_array[0][0]+"="+ params_array[0][1];
            for (let a = 1; a < params_array.length; a++) {
                params_string += "&"+params_array[a][0]+"="+ params_array[a][1];
            }
        }

        if (method === "GET") {
            if(params_string.length > 0) url += "?"+params_string;
        } else {
            options.body = params_string;
            options.headers.set("Content-Type", "application/x-www-form-urlencoded");
        }
        
        
        if (!FW.is_client_side) {
            // Deno should pass Cookies from the browser to the API
            let cookies_string = "";
            this.request.COOKIES.forEach((key, name) => {
                cookies_string += key+"="+name+"; ";
            });
            options.headers.set("Cookie", cookies_string);

            // Deno should pass the browser IP to the API
            options.headers.set("X-Forwarded-For", this.client_ip);
        }

        try {
            const response = await fetch(url, options);
            const response_text = await response.text();
            
            // retrieve set-cookie headers from the API and pass them to the browser
            if (!FW.is_client_side) {
                const set_cookies = response.headers.getSetCookie();
                set_cookies.forEach(item => this.set_cookies.push(item));
            }
            
            try {
                if (!response.ok) {
                    let api_error_response: ApiErrorResponse = JSON.parse(response_text);
                    api_error_response.status = response.status;

                    FW.reporter(LogType.Error, "api_request", "ERROR executing api_request( "+method+" "+path+" )", this, null);
                    console.error(response);
                    
                    this.api_error_event(this, this.client, method, path, params, api_error_response);
                    
                    return {
                        ok: false,
                        err: api_error_response
                    };
                }

                const data = JSON.parse(response_text);
                return {
                    ok: true,
                    val: data as T
                };
            } catch (error: any) {
                let error_message = "API did not returned parsable JSON. Response: `";
                if (response_text.length > 100) {
                    error_message += response_text.substring(0, 100) + "...";
                } else {
                    error_message += response_text;
                }
                error_message += "`";
                FW.reporter(LogType.Error, "api_request", "ERROR executing api_request( "+method+" "+path+" ) API did not returned parsable JSON", this, error_message+"\n\n"+error);
                console.error(response, error);
                let api_error_response: ApiErrorResponse = { status: 501, error_message: "API did not returned parsable JSON" }
                this.api_error_event(this, this.client, method, path, params, api_error_response);

                return {
                    ok: false,
                    err: api_error_response
                };
            }
        } catch (error: any) {
            FW.reporter(LogType.Error, "api_request", "ERROR executing api_request( "+method+" "+path+" )", this, error);
            let api_error_response: ApiErrorResponse = { status: 503, error_message: error }
            this.api_error_event(this, this.client, method, path, params, api_error_response);

            return {
                ok: false,
                err: api_error_response
            };
        }
    }

    /* Set the retriever of an Observer to be a specified api_request */
    api_request_observer<T>(observer: Observer<T>, method: "GET"|"POST", path: string, params: { [key: string]: string|number|boolean | string[]|number[]|boolean[] }, extras: ApiRequestExtras = {}): void {
        const retriever: ObserverRetrieverFunction<T> = async () => {
            const result = await this.api_request<T>(method, path, params, extras);
            if (result.ok) {
                return { ok: true, val: result.val };
            } else {
                return { ok: false, err: new Error(result.err.error_message) };
            }
        }
            
        observer.define_retriever(retriever);
        observer.renew().catch(_error => {});
    }

}


/**
 *   @param {EnvironmentPlatform} platform - Web, Desktop or Android
 *   @param {EnvironmentStage} stage - Development, Staging or Production
 *   @param {number} port - Which port should Deno start the webservice
 *   @param {string} api_protocol_address - The protocol and address for FrontworkContext.api_request. Example: http://localhost:40201. Should use https for staging and production. 
 *   @param {DomainToRouteSelector[]} domain_to_route_selector - Function that selects which routes should work under a domain 
 *   @param {FrontworkMiddleware} middleware - Handler for every edge case like 404er, 500er. You can also execute code before a route executes.
 *   @param {i18n} I18n - Prepare always translations before hand to save time later. For every static string please use the context.get_translation() method.
 *   @param {boolean} build_on_page_load - Enable or Disable Client-Side-Rendering on DOM Ready
 */
export interface FrontworkInit {
    platform: EnvironmentPlatform, stage: EnvironmentStage, port: number, api_protocol_address: string, api_protocol_address_ssr: string, 
    domain_to_route_selector: DomainToRouteSelector, middleware: FrontworkMiddleware, i18n: I18n, build_on_page_load: boolean, api_error_event?: ApiErrorEvent;
}

export class Frontwork {
    protected platform: EnvironmentPlatform;
    protected stage: EnvironmentStage
    protected port: number;
    protected api_protocol_address: string;
    protected api_protocol_address_ssr: string;
	protected domain_to_route_selector: DomainToRouteSelector;
	protected middleware: FrontworkMiddleware;
    protected i18n: I18n
    protected api_error_event: ApiErrorEvent;

	constructor(init: FrontworkInit) {
		this.platform = init.platform;
		this.stage = init.stage;
		this.port = init.port;
		this.api_protocol_address = init.api_protocol_address;
		this.api_protocol_address_ssr = init.api_protocol_address_ssr;
		this.domain_to_route_selector = init.domain_to_route_selector;
		this.middleware = init.middleware;
		this.i18n = init.i18n;
		this.api_error_event = init.api_error_event === undefined? ()=>{} : init.api_error_event;
        if(this.stage === EnvironmentStage.Development) FW.verbose_logging = true;
	}

    protected async route_resolver(context: FrontworkContext): Promise<Route | null> {
        const routes = await this.domain_to_route_selector(context);
        const request_dirs = context.request.path_dirs;
    
        for (let r = 0; r < routes.length; r++) {
            const route = routes[r];
            const route_dirs = route.path.split("/");
            let matches = true;
    
            for (let i = 0; i < Math.max(route_dirs.length, request_dirs.length); i++) {
                // If we hit ** in route, it's a match (remaining path is caught by **)
                if (route_dirs[i] === "**") {
                    if(FW.verbose_logging) context.request.log("ROUTE #" + route.id + " ("+route.path+")", context);
                    return route;
                }
    
                // If either path ends and the other doesn't (and we haven't hit **), no match
                if (i >= route_dirs.length || i >= request_dirs.length) {
                    matches = false;
                    break;
                }
    
                // If segment doesn't match and isn't wildcard, no match
                if (route_dirs[i] !== "*" && route_dirs[i] !== request_dirs[i]) {
                    matches = false;
                    break;
                }
            }
    
            if (matches) {
                if(FW.verbose_logging) context.request.log("ROUTE #" + route.id + " ("+route.path+")", context);
                return route;
            }
        }
    
        return null;
    }

	protected async route_execute_build(context: FrontworkContext, route: Route|null): Promise<{ response: FrontworkResponse; component: Component; }> {
        // Route
        if (route) {
            try {
                const component = new route.component(context);
                return { response: await component.build(context), component: component };
            // deno-lint-ignore no-explicit-any
            } catch (error: any) {
                context.request.error("ROUTE #" + route.id + " ("+route.path+")", context, error);
                return { response: await this.middleware.error_handler_component.build(context), component: this.middleware.error_handler_component };
            }
        }

        // Middleware: Not found
        if(FW.verbose_logging) context.request.log("NOT_FOUND", context);
        try {
            const component = new this.middleware.not_found_handler(context);
            return { response: await component.build(context), component: component };
        // deno-lint-ignore no-explicit-any
        } catch (error: any) {
            context.request.error("NOT_FOUND", context, error);
            return { response: await this.middleware.error_handler_component.build(context), component: this.middleware.error_handler_component };
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
            async build(context: FrontworkContext) {
                context.head.elem.innerHTML = "";
                context.body.elem.innerHTML = "";
                return init.error_handler(context); 
            },
            dom_ready() {},
            on_destroy() {},
        }
        this.not_found_handler = init.not_found_handler;
        this.before_route = init.before_route;
        this.redirect_lonely_slash = init && init.redirect_lonely_slash? init.redirect_lonely_slash : true;
	}
}
