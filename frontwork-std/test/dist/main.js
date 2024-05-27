// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

function parse_url(url) {
    const url_protocol_split = url.split("://");
    if (url_protocol_split.length < 2) throw new Error("Invalid URL: " + url);
    const protocol = url_protocol_split[0];
    const url_querystring_split = url_protocol_split[1].split("?");
    const url_host_path_split = url_querystring_split[0].split("/");
    const host = url_host_path_split[0];
    let path;
    if (url_host_path_split.length < 2) {
        path = "/";
    } else {
        path = "";
        for(let i = 1; i < url_host_path_split.length; i++){
            path += "/" + url_host_path_split[i];
        }
    }
    let query_string;
    let fragment;
    if (url_querystring_split.length > 1) {
        const query_string_fragment_split = url_querystring_split[1].split("#");
        query_string = query_string_fragment_split[0];
        fragment = query_string_fragment_split.length > 1 ? query_string_fragment_split[1] : "";
    } else {
        query_string = "";
        fragment = "";
    }
    return {
        protocol: protocol,
        host: host,
        path: path,
        query_string: query_string,
        fragment: fragment
    };
}
function key_value_list_to_array(list, list_delimiter, key_value_delimiter) {
    const result = [];
    const list_split = list.split(list_delimiter);
    for(let i = 0; i < list_split.length; i++){
        const item = list_split[i];
        const item_split = item.split(key_value_delimiter);
        if (item_split.length === 2 && item_split[0] !== "") {
            result.push({
                key: item_split[0],
                value: item_split[1]
            });
        }
    }
    return result;
}
function html_element_set_attributes(html_element, attributes) {
    for(let i = 0; i < attributes.length; i++){
        const attribute = attributes[i];
        html_element.setAttribute(attribute.name, attribute.value);
    }
}
var LogType;
(function(LogType) {
    LogType[LogType["Info"] = 0] = "Info";
    LogType[LogType["Warn"] = 1] = "Warn";
    LogType[LogType["Error"] = 2] = "Error";
})(LogType || (LogType = {}));
const DEBUG = {
    verbose_logging: false,
    reporter: function(log_type, category, text, error) {
        if (log_type === LogType.Error) {
            if (error === null) console.error(text);
            else console.error(text, error);
        } else if (log_type === LogType.Warn) {
            console.warn(text);
        } else if (log_type === LogType.Info) {
            console.log(text);
        }
    }
};
var EnvironmentPlatform;
(function(EnvironmentPlatform) {
    EnvironmentPlatform[EnvironmentPlatform["Web"] = 0] = "Web";
    EnvironmentPlatform[EnvironmentPlatform["Desktop"] = 1] = "Desktop";
    EnvironmentPlatform[EnvironmentPlatform["Android"] = 2] = "Android";
})(EnvironmentPlatform || (EnvironmentPlatform = {}));
var EnvironmentStage;
(function(EnvironmentStage) {
    EnvironmentStage[EnvironmentStage["Development"] = 0] = "Development";
    EnvironmentStage[EnvironmentStage["Staging"] = 1] = "Staging";
    EnvironmentStage[EnvironmentStage["Production"] = 2] = "Production";
})(EnvironmentStage || (EnvironmentStage = {}));
class I18n {
    locales;
    selected_locale;
    constructor(locales){
        if (locales.length === 0) throw new Error("I18n: No locales provided");
        this.locales = locales;
        this.selected_locale = locales[0];
    }
    set_locale(locale) {
        if (DEBUG.verbose_logging) DEBUG.reporter(LogType.Info, "I18n", "   Setting locale to \"" + locale + "\"", null);
        const locale_found = this.locales.find((l)=>l.locale === locale);
        if (locale_found === undefined) {
            DEBUG.reporter(LogType.Error, "I18n", "Locale '" + locale + "' does not exist", null);
            return false;
        }
        this.selected_locale = locale_found;
        return true;
    }
    get_translation(key) {
        return this.selected_locale.get_translation(key);
    }
}
class I18nLocale {
    locale;
    translations;
    constructor(locale, translations){
        this.locale = locale;
        this.translations = translations;
    }
    get_translation(key) {
        const translation = this.translations.find((t)=>t.key === key);
        if (translation === undefined) {
            DEBUG.reporter(LogType.Error, "I18n", "The translation can not be retrieved because the specific key '" + key + "' for the locale '" + this.locale + "' does not exist.", null);
            return "";
        }
        return translation.translation;
    }
}
class Scope {
    items;
    constructor(items){
        this.items = items;
    }
    get(key) {
        for(let i = 0; i < this.items.length; i++){
            const item = this.items[i];
            if (item.key === key) {
                return item.value;
            }
        }
        return null;
    }
}
class GetScope extends Scope {
    constructor(items){
        super(items);
    }
}
class PostScope extends Scope {
    constructor(items){
        super(items);
    }
}
class CookiesScope extends Scope {
    constructor(items){
        super(items);
    }
}
class FrontworkRequest {
    headers;
    method;
    url;
    protocol;
    host;
    path;
    path_dirs;
    query_string;
    fragment;
    GET;
    POST;
    COOKIES;
    constructor(method, url, headers, post){
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
        this.GET = new GetScope(key_value_list_to_array(parsed_url.query_string, "&", "="));
        this.POST = post;
        const cookies_string = this.headers.get("cookie");
        this.COOKIES = new CookiesScope(cookies_string === null ? [] : key_value_list_to_array(cookies_string, "; ", "="));
    }
    __request_text(category) {
        let text = this.method + " " + this.path;
        if (this.query_string !== "") text += "?" + this.query_string;
        text += " [" + category + "]";
        if (this.POST.items.length > 0) {
            text += "\n    Scope POST: ";
            for(let i = 0; i < this.POST.items.length; i++){
                const item = this.POST.items[i];
                text += "\n        " + item.key + " = \"" + item.value + "\"";
            }
        }
        return text;
    }
    log(category) {
        if (DEBUG.verbose_logging) DEBUG.reporter(LogType.Info, category, this.__request_text(category), null);
    }
    error(category, error) {
        DEBUG.reporter(LogType.Error, category, this.__request_text(category), error);
    }
}
class DocumentBuilder {
    context;
    doctype;
    document_html;
    document_head;
    document_body;
    constructor(context){
        this.context = context;
        this.doctype = "<!DOCTYPE html>";
        this.document_html = document.createElement("html");
        this.document_head = this.document_html.appendChild(document.createElement("head"));
        this.document_body = this.document_html.appendChild(document.createElement("body"));
        this.set_html_lang(context.i18n.selected_locale.locale);
    }
    set_html_lang(code) {
        this.document_html.setAttribute("lang", code);
        return this;
    }
    add_head_meta_data(title, description, robots) {
        const meta_chatset = this.document_head.appendChild(document.createElement("meta"));
        meta_chatset.setAttribute("charset", "UTF-8");
        const meta_viewport = this.document_head.appendChild(document.createElement("meta"));
        meta_viewport.setAttribute("name", "viewport");
        meta_viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
        const meta_title = this.document_head.appendChild(document.createElement("title"));
        meta_title.innerHTML = title;
        const meta_description = this.document_head.appendChild(document.createElement("meta"));
        meta_description.setAttribute("name", "description");
        meta_description.setAttribute("content", description);
        const meta_robots = this.document_head.appendChild(document.createElement("meta"));
        meta_robots.setAttribute("name", "robots");
        meta_robots.setAttribute("content", robots);
        return this;
    }
    add_head_meta_opengraph_website(title, description, url, image_url) {
        const meta_og_type = this.document_head.appendChild(document.createElement("meta"));
        meta_og_type.setAttribute("property", "og:type");
        meta_og_type.setAttribute("content", "website");
        const meta_og_url = this.document_head.appendChild(document.createElement("meta"));
        meta_og_url.setAttribute("property", "og:url");
        meta_og_url.setAttribute("content", url);
        const meta_og_title = this.document_head.appendChild(document.createElement("meta"));
        meta_og_title.setAttribute("property", "og:title");
        meta_og_title.setAttribute("content", title);
        const meta_og_description = this.document_head.appendChild(document.createElement("meta"));
        meta_og_description.setAttribute("property", "og:description");
        meta_og_description.setAttribute("content", description);
        const meta_og_image = this.document_head.appendChild(document.createElement("meta"));
        meta_og_image.setAttribute("property", "og:image");
        meta_og_image.setAttribute("content", image_url);
        return this;
    }
    html_response() {
        const style_css = this.document_head.appendChild(document.createElement("link"));
        style_css.setAttribute("rel", "stylesheet");
        style_css.setAttribute("href", "/assets/style.css");
        style_css.setAttribute("type", "text/css");
        const main_js = this.document_body.appendChild(document.createElement("script"));
        main_js.setAttribute("src", "/assets/main.js");
        main_js.setAttribute("type", "text/javascript");
        return this.document_html;
    }
    toString() {
        const html_response = this.html_response();
        return this.doctype + '\n' + html_response.outerHTML;
    }
}
class FrontworkResponse {
    status_code;
    mime_type = "text/html";
    content;
    headers = [];
    cookies = [];
    constructor(status_code, content){
        this.status_code = status_code;
        this.content = content;
    }
    set_mime_type(mime_type) {
        this.mime_type = mime_type;
        return this;
    }
    add_header(name, value) {
        this.headers.push([
            name,
            value
        ]);
        return this;
    }
    get_header(name) {
        for (const header of this.headers){
            if (header[0] === name) {
                return header[1];
            }
        }
        return null;
    }
    set_cookie(cookie) {
        for(let i = 0; i < this.cookies.length; i++){
            if (this.cookies[i].name === cookie.name) {
                this.cookies[i] = cookie;
                return this;
            }
        }
        this.cookies.push(cookie);
        return this;
    }
    into_response() {
        const content_text = typeof this.content === "object" ? this.content.toString() : this.content;
        const response = new Response(content_text, {
            status: this.status_code
        });
        response.headers.set('content-type', this.mime_type);
        for(let i = 0; i < this.headers.length; i++){
            const header = this.headers[i];
            response.headers.set(header[0], header[1]);
        }
        for(let i = 0; i < this.cookies.length; i++){
            const cookie = this.cookies[i];
            response.headers.append('set-cookie', cookie.to_string());
        }
        return response;
    }
}
class FrontworkResponseRedirect extends FrontworkResponse {
    constructor(redirect_path){
        if (DEBUG.verbose_logging) DEBUG.reporter(LogType.Info, "REDIRECT", "    [REDIRECT]-> " + redirect_path, null);
        super(301, "redirecting...");
        this.add_header("Location", redirect_path);
    }
}
let previous_route_id = 0;
class Route {
    id;
    path;
    component;
    constructor(path, component){
        this.path = path;
        this.component = component;
        this.id = previous_route_id;
        previous_route_id += 1;
    }
}
class Frontwork {
    platform;
    stage;
    port;
    domain_to_route_selector;
    middleware;
    i18n;
    constructor(init){
        this.platform = init.platform;
        this.stage = init.stage;
        this.port = init.port;
        this.domain_to_route_selector = init.domain_to_route_selector;
        this.middleware = init.middleware;
        this.i18n = init.i18n;
        if (this.stage === EnvironmentStage.Development) DEBUG.verbose_logging = true;
    }
    routes_resolver(context) {
        const routes = this.domain_to_route_selector(context);
        for(let b = 0; b < routes.length; b++){
            const route = routes[b];
            const route_path_dirs = route.path.split("/");
            if (context.request.path_dirs.length === route_path_dirs.length) {
                for(let c = 0; c < route_path_dirs.length; c++){
                    if (context.request.path_dirs.length === route_path_dirs.length) {
                        let found = true;
                        for(let i = 0; i < route_path_dirs.length; i++){
                            const route_path_dir = route_path_dirs[i];
                            if (route_path_dir !== "*" && route_path_dir !== context.request.path_dirs[i]) {
                                found = false;
                                break;
                            }
                        }
                        if (found) {
                            try {
                                if (DEBUG.verbose_logging) context.request.log("ROUTE #" + route.id + " (" + route.path + ")");
                                const response = route.component.build(context);
                                return {
                                    response: response,
                                    dom_ready: route.component.dom_ready
                                };
                            } catch (error) {
                                context.request.error("ROUTE #" + route.id + " (" + route.path + ")", error);
                                return {
                                    response: this.middleware.error_handler.build(context),
                                    dom_ready: this.middleware.error_handler.dom_ready
                                };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }
    routes_resolver_with_middleware(context) {
        if (this.middleware.redirect_lonely_slash && context.request.path_dirs.length > 2 && context.request.path_dirs[context.request.path_dirs.length - 1] === "") {
            let new_path = "";
            for(let i = 0; i < context.request.path_dirs.length - 1; i++){
                if (context.request.path_dirs[i] !== "") {
                    new_path += "/" + context.request.path_dirs[i];
                }
            }
            if (DEBUG.verbose_logging) context.request.log("LONELY_SLASH_REDIRECT");
            const redirect_component = {
                response: new FrontworkResponseRedirect(new_path),
                dom_ready: ()=>{}
            };
            return redirect_component;
        }
        if (this.middleware.before_routes !== null) {
            if (DEBUG.verbose_logging) context.request.log("BEFORE_ROUTES");
            try {
                const response = this.middleware.before_routes.build(context);
                if (response !== null) return {
                    response: response,
                    dom_ready: this.middleware.before_routes.dom_ready
                };
            } catch (error) {
                context.request.error("BEFORE_ROUTES", error);
                return {
                    response: this.middleware.error_handler.build(context),
                    dom_ready: this.middleware.error_handler.dom_ready
                };
            }
        }
        const route_result = this.routes_resolver(context);
        if (this.middleware.after_routes !== null) {
            if (DEBUG.verbose_logging) context.request.log("AFTER_ROUTES");
            try {
                const response = this.middleware.after_routes.build(context, route_result);
                if (response !== null) return {
                    response: response,
                    dom_ready: this.middleware.after_routes.dom_ready
                };
            } catch (error) {
                context.request.error("AFTER_ROUTES", error);
                return {
                    response: this.middleware.error_handler.build(context),
                    dom_ready: this.middleware.error_handler.dom_ready
                };
            }
        }
        if (route_result === null) {
            if (DEBUG.verbose_logging) context.request.log("NOT_FOUND");
            const response = this.middleware.not_found_handler.build(context);
            if (response === null) {
                return {
                    response: new FrontworkResponse(404, "Page not found"),
                    dom_ready: this.middleware.not_found_handler.dom_ready
                };
            }
            return {
                response: response,
                dom_ready: this.middleware.not_found_handler.dom_ready
            };
        }
        return route_result;
    }
}
class FrontworkMiddleware {
    error_handler;
    not_found_handler;
    before_routes;
    after_routes;
    redirect_lonely_slash;
    constructor(init){
        if (init && init.error_handler) {
            this.error_handler = init.error_handler;
        } else {
            this.error_handler = {
                build: (context)=>{
                    const document_builder = new DocumentBuilder(context);
                    const h1 = document_builder.document_body.appendChild(document.createElement("h1"));
                    h1.innerText = "ERROR 500 - Internal server error";
                    return new FrontworkResponse(500, document_builder.set_html_lang("en").add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow"));
                },
                dom_ready: ()=>{}
            };
        }
        if (init && init.not_found_handler) {
            this.not_found_handler = init.not_found_handler;
        } else {
            this.not_found_handler = {
                build: ()=>{
                    return new FrontworkResponse(404, "ERROR 404 - Page not found");
                },
                dom_ready: ()=>{}
            };
        }
        this.before_routes = init && init.before_routes ? init.before_routes : null;
        this.after_routes = init && init.after_routes ? init.after_routes : null;
        this.redirect_lonely_slash = init && init.redirect_lonely_slash ? init.redirect_lonely_slash : true;
    }
}
class FrontworkClient extends Frontwork {
    request_url;
    build_on_page_load;
    constructor(init){
        super(init);
        this.request_url = location.toString();
        if (typeof init.build_on_page_load === "boolean") this.build_on_page_load = init.build_on_page_load;
        else this.build_on_page_load = false;
        document.addEventListener("DOMContentLoaded", ()=>{
            this.page_change({
                url: location.toString(),
                is_redirect: false,
                status_code: 200
            }, this.build_on_page_load);
        });
        document.addEventListener('click', (event)=>{
            const target = event.target;
            if (target.tagName === 'A') {
                if (this.page_change_to(target.href)) {
                    event.preventDefault();
                }
            }
        }, false);
        addEventListener('popstate', (event)=>{
            const savestate = event.state;
            if (savestate && savestate.url) {
                this.page_change(savestate, true);
            }
        });
        if (this.stage === EnvironmentStage.Development) {
            console.info("hot-reloading is enabled; Make sure this is the development environment");
            let state = 0;
            const connect = ()=>{
                const ws = new WebSocket("ws://" + location.host + "//ws");
                ws.onopen = function() {
                    ws.send("REQUEST::SERVICE_STARTED");
                    if (state === 2) {
                        location.reload();
                    } else {
                        state = 1;
                    }
                };
                ws.onclose = function() {
                    state = 2;
                    setTimeout(connect, 1000);
                };
                ws.onerror = function() {
                    ws.close();
                };
            };
            connect();
        }
    }
    page_change(savestate, do_building) {
        this.request_url = savestate.url;
        const request = new FrontworkRequest("GET", this.request_url, new Headers(), new PostScope([]));
        const context = {
            request: request,
            i18n: this.i18n,
            platform: this.platform,
            stage: this.stage
        };
        let result;
        try {
            const resolved_component = this.routes_resolver_with_middleware(context);
            if (resolved_component) {
                result = {
                    response: resolved_component.response,
                    dom_ready: resolved_component.dom_ready
                };
            } else {
                result = {
                    response: this.middleware.not_found_handler.build(context),
                    dom_ready: this.middleware.not_found_handler.dom_ready
                };
            }
        } catch (error) {
            const error_handler_result = this.middleware.error_handler.build(context);
            result = {
                response: error_handler_result,
                dom_ready: this.middleware.error_handler.dom_ready
            };
        }
        if (result.response.status_code === 301) {
            const redirect_url = result.response.get_header("Location");
            if (redirect_url === null) {
                DEBUG.reporter(LogType.Error, "REDIRECT", "Tried to redirect: Status Code is 301, but Location header is null", null);
                return null;
            } else {
                if (DEBUG.verbose_logging) DEBUG.reporter(LogType.Info, "REDIRECT", "Redirect to: " + redirect_url, null);
                this.page_change_to(redirect_url);
                return {
                    url: this.request_url,
                    is_redirect: true,
                    status_code: result.response.status_code
                };
            }
        }
        const resolved_content = result.response.content;
        if (typeof resolved_content.document_html !== "undefined") {
            if (do_building) {
                result.response.cookies.forEach((cookie)=>{
                    if (cookie.http_only === false) {
                        document.cookie = cookie.toString();
                    }
                });
                resolved_content.html_response();
                html_element_set_attributes(document.children[0], resolved_content.document_html.attributes);
                html_element_set_attributes(document.head, resolved_content.document_head.attributes);
                html_element_set_attributes(document.body, resolved_content.document_body.attributes);
                document.head.innerHTML = resolved_content.document_head.innerHTML;
                document.body.innerHTML = resolved_content.document_body.innerHTML;
            }
            if (result.dom_ready !== null) result.dom_ready(context, this);
            return {
                url: this.request_url,
                is_redirect: false,
                status_code: result.response.status_code
            };
        }
        return null;
    }
    page_change_to(url_or_path) {
        if (DEBUG.verbose_logging) DEBUG.reporter(LogType.Info, "PageChange", "page_change_to url_or_path: " + url_or_path, null);
        let url;
        const test = url_or_path.indexOf("//");
        if (test === 0 || test === 5 || test === 6) {
            url = url_or_path;
        } else {
            url = location.protocol + "//" + location.host + url_or_path;
        }
        const result = this.page_change({
            url: url,
            is_redirect: false,
            status_code: 200
        }, true);
        if (result !== null) {
            if (result.is_redirect) return true;
            history.pushState(result, document.title, this.request_url);
            return true;
        }
        return false;
    }
}
const __default = JSON.parse("[\n    { \"key\": \"title1\", \"translation\": \"Frontwork Test Page\" }\n    ,{ \"key\": \"text1\", \"translation\": \"This is a test page for the Frontwork framework.\" }\n    ,{ \"key\": \"title2\", \"translation\": \"Test Form\" }\n    ,{ \"key\": \"another_title1\", \"translation\": \"Hello from 127.0.0.1\" }\n    ,{ \"key\": \"another_text1\", \"translation\": \"Yes you can have different domains :)\" }\n]");
const __default1 = JSON.parse("[\n    { \"key\": \"title1\", \"translation\": \"Frontwork Test Seite\" }\n    ,{ \"key\": \"text1\", \"translation\": \"Dies ist eine deutsche Test Seite für das Frontwork framework.\" }\n    ,{ \"key\": \"title2\", \"translation\": \"Test Formular\" }\n]");
const i18n = new I18n([
    new I18nLocale("en", __default),
    new I18nLocale("de", __default1)
]);
function render_header() {
    const header = document.createElement("header");
    return header;
}
class AnotherComponent {
    build(context) {
        const document_builder = new DocumentBuilder(context);
        document_builder.document_body.appendChild(render_header());
        const main = document_builder.document_body.appendChild(document.createElement("main"));
        const title1 = main.appendChild(document.createElement("h1"));
        title1.innerText = context.i18n.get_translation("another_title1");
        const description = main.appendChild(document.createElement("p"));
        description.innerText = context.i18n.get_translation("another_text1");
        return new FrontworkResponse(200, document_builder.add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow"));
    }
    dom_ready() {}
}
class TestComponent {
    build(context) {
        const document_builder = new DocumentBuilder(context);
        document_builder.document_body.appendChild(render_header());
        const main = document_builder.document_body.appendChild(document.createElement("main"));
        const title1 = main.appendChild(document.createElement("h1"));
        title1.innerText = context.i18n.get_translation("title1");
        const description = main.appendChild(document.createElement("p"));
        description.innerText = context.i18n.get_translation("text1");
        const section_form = main.appendChild(document.createElement("section"));
        const section_form_title = section_form.appendChild(document.createElement("h2"));
        section_form_title.innerText = context.i18n.get_translation("title2");
        const section_form_form = section_form.appendChild(document.createElement("form"));
        section_form_form.setAttribute("id", "test_form");
        section_form_form.setAttribute("action", "");
        section_form_form.setAttribute("method", "post");
        for(let i = 0; i < 3; i++){
            const section_form_form_input_text = section_form_form.appendChild(document.createElement("input"));
            section_form_form_input_text.setAttribute("type", "text");
            section_form_form_input_text.setAttribute("name", "text" + i);
            section_form_form_input_text.setAttribute("value", "aabbcc");
        }
        const section_form_submit_button = section_form_form.appendChild(document.createElement("button"));
        section_form_submit_button.setAttribute("type", "submit");
        section_form_submit_button.setAttribute("name", "action");
        section_form_submit_button.setAttribute("value", "sent");
        section_form_submit_button.innerHTML = "Submit";
        return new FrontworkResponse(200, document_builder.add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow"));
    }
    dom_ready() {}
}
class TestGerman extends TestComponent {
    build(context) {
        context.i18n.set_locale("de");
        return super.build(context);
    }
    dom_ready() {}
}
class Test2Component {
    build(context) {
        const document_builder = new DocumentBuilder(context);
        document_builder.document_body.appendChild(render_header());
        const main = document_builder.document_body.appendChild(document.createElement("main"));
        const title1 = main.appendChild(document.createElement("h1"));
        title1.innerText = "Test Page 2";
        const description = main.appendChild(document.createElement("p"));
        description.innerHTML = "This is a test page <b>2</b> for the Frontwork framework. I will redirect you with js to the home page in 1 second.";
        DEBUG.reporter(LogType.Warn, "TEST", "Warn counter test for Testworker", null);
        return new FrontworkResponse(200, document_builder.add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow"));
    }
    dom_ready(context, client) {
        console.log("FrontworkContext", context);
        console.log("FrontworkClient", client);
        setTimeout(()=>{
            client.page_change_to("/");
        }, 1000);
    }
}
class Test3Component {
    build() {
        return new FrontworkResponseRedirect("/");
    }
    dom_ready() {}
}
class ElementTestComponent {
    build(context) {
        const document_builder = new DocumentBuilder(context);
        return new FrontworkResponse(200, document_builder.set_html_lang("en").add_head_meta_data("element_test", "element_test", "noindex,nofollow"));
    }
    dom_ready() {}
}
class HelloWorldPrioTestComponent {
    build(context) {
        const content = "Hello this is indeed first come, first served basis";
        return new FrontworkResponse(200, content);
    }
    dom_ready(context) {}
}
class HelloWorldComponent {
    build(context) {
        const content = "Hello " + context.request.path_dirs[2];
        return new FrontworkResponse(200, content);
    }
    dom_ready(context) {}
}
class CollisionHandlerComponent {
    build(context) {
        if (context.request.path_dirs[2] === "first-come-first-served") {
            return new HelloWorldPrioTestComponent().build(context);
        }
        return new HelloWorldComponent().build(context);
    }
    dom_ready(context) {
        if (context.request.path_dirs[2] === "first-come-first-served") {
            new HelloWorldPrioTestComponent().dom_ready(context);
        }
        new HelloWorldComponent().dom_ready(context);
    }
}
class CrashComponent {
    build() {
        throw new Error("Crash Test");
        return new FrontworkResponse(200, "this text shall never be seen in the browser");
    }
    dom_ready() {}
}
const default_routes = [
    new Route("/", new TestComponent()),
    new Route("/test2", new Test2Component()),
    new Route("/test3", new Test3Component()),
    new Route("/german", new TestGerman()),
    new Route("/crash", new CrashComponent()),
    new Route("/element_test", new ElementTestComponent()),
    new Route("/hello/first-come-first-served", new HelloWorldPrioTestComponent()),
    new Route("/hello/*", new HelloWorldComponent()),
    new Route("/hi/*", new CollisionHandlerComponent())
];
const another_routes = [
    new Route("/", new AnotherComponent())
];
const middleware = new FrontworkMiddleware({
    before_routes: {
        build: (context)=>{
            context.i18n.set_locale("en");
            return null;
        },
        dom_ready: ()=>{}
    }
});
const APP_CONFIG = {
    platform: EnvironmentPlatform.Web,
    stage: EnvironmentStage.Development,
    port: 8080,
    domain_to_route_selector: (context)=>{
        const domain = context.request.host.split(":")[0];
        if (domain === "127.0.0.1") return another_routes;
        return default_routes;
    },
    middleware: middleware,
    i18n: i18n,
    build_on_page_load: false
};
new FrontworkClient(APP_CONFIG);
