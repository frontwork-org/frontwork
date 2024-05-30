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
const FW = {
    is_client_side: true,
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
class HTMLElementWrapper {
    element;
    constructor(element){
        this.element = element;
    }
    append_to(parent) {
        parent.element.appendChild(this.element);
        return this;
    }
}
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
        if (FW.verbose_logging) FW.reporter(LogType.Info, "I18n", "   Setting locale to \"" + locale + "\"", null);
        const locale_found = this.locales.find((l)=>l.locale === locale);
        if (locale_found === undefined) {
            FW.reporter(LogType.Error, "I18n", "Locale '" + locale + "' does not exist", null);
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
    get_translation(id) {
        const translation = this.translations[id];
        if (translation === undefined) {
            FW.reporter(LogType.Error, "I18n", "    Missing translation (id: '" + id + "') for the locale '" + this.locale + "'.", null);
            return "";
        }
        return translation;
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
        if (FW.verbose_logging) FW.reporter(LogType.Info, category, this.__request_text(category), null);
    }
    error(category, error) {
        FW.reporter(LogType.Error, category, this.__request_text(category), error);
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
        const response = new Response(this.content.toString(), {
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
class DocumentBuilder {
    context;
    doctype;
    constructor(context){
        this.context = context;
        this.doctype = "<!DOCTYPE html>";
        this.set_html_lang(context.i18n.selected_locale.locale);
    }
    head_append_tag(tag, attributes) {
        const element = document.createElement(tag);
        if (attributes) {
            for(const key in attributes){
                element.setAttribute(key, attributes[key]);
            }
        }
        this.context.document_head.append(element);
        return this;
    }
    add_head_meta_data(title, description, robots) {
        const meta_chatset = this.context.document_head.appendChild(document.createElement("meta"));
        meta_chatset.setAttribute("charset", "UTF-8");
        const meta_viewport = this.context.document_head.appendChild(document.createElement("meta"));
        meta_viewport.setAttribute("name", "viewport");
        meta_viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1");
        const meta_title = this.context.document_head.appendChild(document.createElement("title"));
        meta_title.innerHTML = title;
        const meta_description = this.context.document_head.appendChild(document.createElement("meta"));
        meta_description.setAttribute("name", "description");
        meta_description.setAttribute("content", description);
        const meta_robots = this.context.document_head.appendChild(document.createElement("meta"));
        meta_robots.setAttribute("name", "robots");
        meta_robots.setAttribute("content", robots);
        return this;
    }
    add_head_meta_opengraph_website(title, description, url, image_url) {
        const meta_og_type = this.context.document_head.appendChild(document.createElement("meta"));
        meta_og_type.setAttribute("property", "og:type");
        meta_og_type.setAttribute("content", "website");
        const meta_og_url = this.context.document_head.appendChild(document.createElement("meta"));
        meta_og_url.setAttribute("property", "og:url");
        meta_og_url.setAttribute("content", url);
        const meta_og_title = this.context.document_head.appendChild(document.createElement("meta"));
        meta_og_title.setAttribute("property", "og:title");
        meta_og_title.setAttribute("content", title);
        const meta_og_description = this.context.document_head.appendChild(document.createElement("meta"));
        meta_og_description.setAttribute("property", "og:description");
        meta_og_description.setAttribute("content", description);
        const meta_og_image = this.context.document_head.appendChild(document.createElement("meta"));
        meta_og_image.setAttribute("property", "og:image");
        meta_og_image.setAttribute("content", image_url);
        return this;
    }
    set_html_lang(code) {
        this.context.document_html.setAttribute("lang", code);
        return this;
    }
    body_append(wr) {
        this.context.document_body.append(wr.element);
        return wr;
    }
    html() {
        const style_css = this.context.document_head.appendChild(document.createElement("link"));
        style_css.setAttribute("rel", "stylesheet");
        style_css.setAttribute("href", "/assets/style.css");
        style_css.setAttribute("type", "text/css");
        const main_js = this.context.document_body.appendChild(document.createElement("script"));
        main_js.setAttribute("src", "/assets/main.js");
        main_js.setAttribute("type", "text/javascript");
        return this.context.document_html;
    }
    toString() {
        const html_response = this.html();
        return this.doctype + '\n' + html_response.outerHTML;
    }
}
class FrontworkResponseRedirect extends FrontworkResponse {
    constructor(redirect_path){
        if (FW.verbose_logging) FW.reporter(LogType.Info, "REDIRECT", "    [REDIRECT]-> " + redirect_path, null);
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
class FrontworkContext {
    platform;
    stage;
    i18n;
    request;
    do_building;
    document_html;
    document_head;
    document_body;
    constructor(platform, stage, i18n, request, do_building){
        this.platform = platform;
        this.stage = stage;
        this.i18n = i18n;
        this.request = request;
        this.do_building = do_building;
        this.document_html = document.createElement("html");
        this.document_head = this.document_html.appendChild(document.createElement("head"));
        this.document_body = this.document_html.appendChild(document.createElement("body"));
    }
    create_element(tag, attributes) {
        const element = document.createElement(tag);
        if (attributes) {
            for(const key in attributes){
                element.setAttribute(key, attributes[key]);
            }
        }
        return new HTMLElementWrapper(element);
    }
    ensure_element(tag, id, attributes) {
        console.log(this);
        const elem = this.do_building ? document.getElementById(id) : this.document_html.ownerDocument.getElementById(id);
        if (elem !== null) return new HTMLElementWrapper(elem);
        const elem2 = this.create_element(tag, attributes);
        elem2.element.id = id;
        return elem2;
    }
    ensure_element_with_text(tag, id, text, attributes) {
        const elem = document.getElementById(id);
        if (elem !== null) return new HTMLElementWrapper(elem);
        const elem2 = this.create_element(tag, attributes);
        elem2.element.id = id;
        elem2.element.innerText = text;
        return elem2;
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
        if (this.stage === EnvironmentStage.Development) FW.verbose_logging = true;
    }
    route_resolver(context) {
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
                            if (FW.verbose_logging) context.request.log("ROUTE #" + route.id + " (" + route.path + ")");
                            return route;
                        }
                    }
                }
            }
        }
        return null;
    }
    route_execute_build(context, route) {
        if (route) {
            try {
                const component = new route.component(context);
                return {
                    reponse: component.build(context),
                    dom_ready: component.dom_ready
                };
            } catch (error) {
                context.request.error("ROUTE #" + route.id + " (" + route.path + ")", error);
                return {
                    reponse: this.middleware.error_handler_component.build(context),
                    dom_ready: this.middleware.error_handler_component.dom_ready
                };
            }
        }
        if (FW.verbose_logging) context.request.log("NOT_FOUND");
        try {
            const component = new this.middleware.not_found_handler(context);
            return {
                reponse: component.build(context),
                dom_ready: component.dom_ready
            };
        } catch (error) {
            context.request.error("NOT_FOUND", error);
            return {
                reponse: this.middleware.error_handler_component.build(context),
                dom_ready: this.middleware.error_handler_component.dom_ready
            };
        }
    }
}
class FrontworkMiddleware {
    error_handler;
    error_handler_component;
    not_found_handler;
    before_route;
    redirect_lonely_slash;
    constructor(init){
        this.error_handler = init.error_handler;
        this.error_handler_component = {
            build (context) {
                return init.error_handler(context);
            },
            dom_ready () {}
        };
        this.not_found_handler = init.not_found_handler;
        this.before_route = init.before_route;
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
        const context = new FrontworkContext(this.platform, this.stage, this.i18n, request, do_building);
        const route = this.route_resolver(context);
        try {
            this.middleware.before_route.build(context);
            this.middleware.before_route.dom_ready(context, this);
        } catch (error) {
            context.request.error("before_route", error);
        }
        if (do_building) {
            const reb_result = this.route_execute_build(context, this.route_resolver(context));
            const response = reb_result.reponse;
            response.cookies.forEach((cookie)=>{
                if (cookie.http_only === false) {
                    document.cookie = cookie.toString();
                }
            });
            if (response.status_code === 301 || response.status_code === 302) {
                const redirect_url = response.get_header("Location");
                if (redirect_url === null) {
                    FW.reporter(LogType.Error, "REDIRECT", "Tried to redirect: Status Code is 301, but Location header is null", null);
                    return null;
                } else {
                    if (FW.verbose_logging) FW.reporter(LogType.Info, "REDIRECT", "Redirect to: " + redirect_url, null);
                    this.page_change_to(redirect_url);
                    return {
                        url: this.request_url,
                        is_redirect: true,
                        status_code: response.status_code
                    };
                }
            }
            const resolved_content = response.content;
            if (typeof resolved_content.context.document_html !== "undefined") {
                resolved_content.html();
                html_element_set_attributes(document.children[0], resolved_content.context.document_html.attributes);
                html_element_set_attributes(document.head, resolved_content.context.document_head.attributes);
                html_element_set_attributes(document.body, resolved_content.context.document_body.attributes);
                document.head.innerHTML = resolved_content.context.document_head.innerHTML;
                document.body.innerHTML = resolved_content.context.document_body.innerHTML;
                reb_result.dom_ready(context, this);
                return {
                    url: this.request_url,
                    is_redirect: false,
                    status_code: response.status_code
                };
            }
        } else {
            if (route) {
                const route_component = new route.component(context);
                route_component.dom_ready(context, this);
            } else {
                new this.middleware.not_found_handler(context).dom_ready(context, this);
            }
        }
        return null;
    }
    page_change_to(url_or_path) {
        if (FW.verbose_logging) FW.reporter(LogType.Info, "PageChange", "page_change_to url_or_path: " + url_or_path, null);
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
const __default = JSON.parse("{\n     \"title1\": \"Frontwork Test Page\"\n    ,\"text1\": \"This is a test page for the Frontwork framework.\"\n    ,\"title2\": \"Test Form\"\n    ,\"another_title1\": \"Hello from 127.0.0.1\"\n    ,\"another_text1\": \"Yes you can have different domains :)\"\n}");
const __default1 = JSON.parse("{\n    \"title1\": \"Frontwork Test Seite\"\n   ,\"text1\": \"Dies ist eine deutsche Test Seite für das Frontwork framework.\"\n   ,\"title2\": \"Test Formular\"\n}");
const i18n = new I18n([
    new I18nLocale("en", __default),
    new I18nLocale("de", __default1)
]);
class MyMainDocumentBuilder extends DocumentBuilder {
    main;
    constructor(context){
        super(context);
        const header = this.body_append(context.create_element("header"));
        context.ensure_element_with_text("a", "a-home", "Home", {
            href: "/"
        }).append_to(header);
        context.ensure_element_with_text("a", "a-test2", "Test 2", {
            href: "/test2"
        }).append_to(header);
        context.ensure_element_with_text("a", "a-test3", "Test 3", {
            href: "/test3"
        }).append_to(header);
        context.ensure_element_with_text("a", "a-german", "German", {
            href: "/german"
        }).append_to(header);
        context.ensure_element_with_text("a", "a-crash", "Crash", {
            href: "/crash"
        }).append_to(header);
        this.main = this.body_append(context.create_element("main"));
    }
}
class AnotherComponent {
    build(context) {
        const document_builder = new DocumentBuilder(context);
        const main = document_builder.body_append(context.create_element("main"));
        context.ensure_element_with_text("h1", "another_title1", context.i18n.get_translation("another_title1")).append_to(main);
        context.ensure_element_with_text("p", "another_text1", context.i18n.get_translation("another_text1")).append_to(main);
        return new FrontworkResponse(200, document_builder);
    }
    dom_ready() {}
}
class TestComponent {
    build(context) {
        const document_builder = new MyMainDocumentBuilder(context);
        const title = context.ensure_element_with_text("h1", "title1", context.i18n.get_translation("title1")).append_to(document_builder.main);
        const description = context.ensure_element_with_text("p", "description", context.i18n.get_translation("text1")).append_to(document_builder.main);
        const section_form = context.create_element("section").append_to(document_builder.main);
        context.ensure_element_with_text("h2", "h1", context.i18n.get_translation("title2")).append_to(section_form);
        const form = context.ensure_element("form", "test_form", {
            action: "",
            method: "post"
        }).append_to(section_form);
        for(let i = 0; i < 3; i++){
            context.ensure_element("input", "input" + i, {
                type: "text",
                name: "text" + i,
                value: "asdsad"
            }).append_to(form);
        }
        context.ensure_element_with_text("button", "submit_button", "Submit", {
            type: "submit",
            name: "action",
            value: "sent"
        }).append_to(form);
        return new FrontworkResponse(200, document_builder.add_head_meta_data(title.element.innerText, description.element.innerText, "noindex,nofollow"));
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
        const document_builder = new MyMainDocumentBuilder(context);
        const title1 = context.ensure_element_with_text("h1", "h1", "Test Page 2").append_to(document_builder.main);
        const description = context.ensure_element("p", "description").append_to(document_builder.main);
        description.element.innerHTML = "This is a test page <b>2</b> for the Frontwork framework. I will redirect you with js to the home page in 1 second.";
        FW.reporter(LogType.Warn, "TEST", "Warn counter test for Testworker", null);
        return new FrontworkResponse(200, document_builder.add_head_meta_data(title1.element.innerText, description.element.innerText, "noindex,nofollow"));
    }
    dom_ready(context, client) {
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
        const document_builder = new MyMainDocumentBuilder(context);
        return new FrontworkResponse(200, document_builder.add_head_meta_data("element_test", "element_test", "noindex,nofollow"));
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
class NotFoundComponent {
    build(context) {
        const document_builder = new MyMainDocumentBuilder(context);
        const h1 = context.document_body.appendChild(document.createElement("h1"));
        h1.innerText = "ERROR 404 - Not found";
        return new FrontworkResponse(404, document_builder.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow"));
    }
    dom_ready() {}
}
const default_routes = [
    new Route("/", TestComponent),
    new Route("/test2", Test2Component),
    new Route("/test3", Test3Component),
    new Route("/german", TestGerman),
    new Route("/crash", CrashComponent),
    new Route("/element_test", ElementTestComponent),
    new Route("/hello/first-come-first-served", HelloWorldPrioTestComponent),
    new Route("/hello/*", HelloWorldComponent),
    new Route("/hi/*", CollisionHandlerComponent)
];
const another_routes = [
    new Route("/", AnotherComponent)
];
const middleware = new FrontworkMiddleware({
    before_route: {
        build: (context)=>{
            context.i18n.set_locale("en");
        },
        dom_ready: ()=>{}
    },
    error_handler: (context)=>{
        const document_builder = new MyMainDocumentBuilder(context);
        const h1 = context.document_body.appendChild(document.createElement("h1"));
        h1.innerText = "ERROR 500 - Internal server error";
        return new FrontworkResponse(500, document_builder.add_head_meta_data(h1.innerText, h1.innerText, "noindex,nofollow"));
    },
    not_found_handler: NotFoundComponent
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
