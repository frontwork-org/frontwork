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
class I18n {
    locales;
    selected_locale;
    constructor(locales){
        if (locales.length === 0) throw new Error("I18n: No locales provided");
        this.locales = locales;
        this.selected_locale = locales[0];
    }
    set_locale(locale) {
        const locale_found = this.locales.find((l)=>l.locale === locale);
        if (locale_found === undefined) throw new Error("I18nLocale " + locale + " does not exist");
        this.selected_locale = locale_found;
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
        if (translation === undefined) throw new Error("I18nLocale.get_translation(\"" + key + "\"): can not get translation, because the specific key does not exist.");
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
        this.GET = new CookiesScope(key_value_list_to_array(parsed_url.query_string, "&", "="));
        this.POST = post;
        const cookies_string = this.headers.get("cookie");
        this.COOKIES = new CookiesScope(cookies_string === null ? [] : key_value_list_to_array(cookies_string, "; ", "="));
    }
}
class DocumentBuilder {
    doctype;
    document_html;
    document_head;
    document_body;
    constructor(doctype){
        this.doctype = doctype || "<!DOCTYPE html>";
        this.document_html = document.createElement("html");
        this.document_head = this.document_html.appendChild(document.createElement("head"));
        this.document_body = this.document_html.appendChild(document.createElement("body"));
    }
    createElement(tagName) {
        return document.createElement(tagName);
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
        const main_js = this.document_body.appendChild(document.createElement("script"));
        main_js.setAttribute("src", "/assets/main.js");
        main_js.setAttribute("type", "text/javascript");
        return this.document_html;
    }
    toString() {
        const html_response = this.html_response();
        let content = this.doctype + '\n';
        content += html_response.outerHTML;
        return content;
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
        for(let i1 = 0; i1 < this.cookies.length; i1++){
            const cookie = this.cookies[i1];
            response.headers.append('set-cookie', cookie.to_string());
        }
        return response;
    }
}
class FrontworkResponseRedirect extends FrontworkResponse {
    constructor(redirect_path){
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
class DomainRoutes {
    domain;
    routes = [];
    constructor(domain, routes){
        this.domain = domain;
        this.routes = routes;
    }
}
class Frontwork {
    platform;
    stage;
    port;
    domain_routes;
    middleware;
    i18n;
    constructor(init1){
        this.platform = init1.platform;
        this.stage = init1.stage;
        this.port = init1.port;
        this.domain_routes = init1.domain_routes;
        this.middleware = init1.middleware;
        this.i18n = init1.i18n;
    }
    routes_resolver(request) {
        if (this.middleware.redirect_lonely_slash && request.path_dirs.length > 2 && request.path_dirs[request.path_dirs.length - 1] === "") {
            let new_path = "";
            for(let i = 0; i < request.path_dirs.length - 1; i++){
                if (request.path_dirs[i] !== "") {
                    new_path += "/" + request.path_dirs[i];
                }
            }
            this.log(request, "[REDIRECT] -> " + new_path);
            const redirect_component = {
                build: ()=>{
                    return new FrontworkResponseRedirect(new_path);
                },
                dom_ready: ()=>{}
            };
            return redirect_component;
        }
        if (this.middleware.before_routes !== null) {
            this.log(request, "[BEFORE_ROUTES]");
            return this.middleware.before_routes;
        }
        for(let i = 0; i < this.domain_routes.length; i++){
            const domain_routes1 = this.domain_routes[i];
            if (domain_routes1.domain.test(request.host)) {
                for(let i = 0; i < domain_routes1.routes.length; i++){
                    const route = domain_routes1.routes[i];
                    const route_path_dirs = route.path.split("/");
                    if (request.path_dirs.length === route_path_dirs.length) {
                        let found = true;
                        for(let i = 0; i < route_path_dirs.length; i++){
                            const route_path_dir = route_path_dirs[i];
                            if (route_path_dir !== "*" && route_path_dir !== request.path_dirs[i]) {
                                found = false;
                                break;
                            }
                        }
                        if (found) {
                            this.log(request, "[ROUTE #" + route.id + " (" + route.path + ")]");
                            return route.component;
                        }
                    }
                }
            }
        }
        if (this.middleware.after_routes !== null) {
            this.log(request, "[AFTER_ROUTES]");
            return this.middleware.after_routes;
        }
        return null;
    }
    log(request, extra) {
        this.middleware.log(request, extra);
    }
}
class FrontworkMiddleware {
    error_handler;
    not_found_handler;
    before_routes;
    after_routes;
    redirect_lonely_slash;
    constructor(init2){
        if (init2 && init2.error_handler) {
            const init_error_handler = init2.error_handler;
            this.error_handler = (request, error)=>{
                this.log(request, "[ERROR]");
                return init_error_handler(request, error);
            };
        } else {
            this.error_handler = (request)=>{
                this.log(request, "[ERROR]");
                return new FrontworkResponse(500, "ERROR");
            };
        }
        if (init2 && init2.not_found_handler) {
            this.not_found_handler = init2.not_found_handler;
        } else {
            this.not_found_handler = {
                build: ()=>{
                    return new FrontworkResponse(404, "ERROR 404 - Page not found");
                },
                dom_ready: ()=>{}
            };
        }
        this.before_routes = init2 && init2.before_routes ? init2.before_routes : null;
        this.after_routes = init2 && init2.after_routes ? init2.after_routes : null;
        this.redirect_lonely_slash = init2 && init2.redirect_lonely_slash ? init2.redirect_lonely_slash : true;
    }
    log(request, extra) {
        let path_with_query_string = request.path;
        if (request.query_string !== "") path_with_query_string += "?" + request.query_string;
        console.log(request.method + " " + path_with_query_string + " " + extra);
        if (request.POST.items.length > 0) console.log(" Scope POST: ", request.POST.items);
    }
}
class FrontworkFront extends Frontwork {
    request_url;
    build_on_page_load;
    constructor(init3, front_init){
        super(init3);
        this.request_url = location.toString();
        if (typeof front_init.build_on_page_load === "boolean") this.build_on_page_load = front_init.build_on_page_load;
        else this.build_on_page_load = false;
        document.addEventListener("DOMContentLoaded", ()=>{
            this.page_change({
                url: location.toString(),
                is_redirect: false
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
            const resolved_component = this.routes_resolver(request);
            if (resolved_component) {
                result = {
                    response: resolved_component.build(context, this),
                    dom_ready: resolved_component.dom_ready
                };
            } else {
                result = {
                    response: this.middleware.not_found_handler.build(context, this),
                    dom_ready: this.middleware.not_found_handler.dom_ready
                };
            }
        } catch (error) {
            console.error(error);
            const error_handler_result = this.middleware.error_handler(request, error);
            result = {
                response: error_handler_result,
                dom_ready: null
            };
        }
        if (result.response !== null) {
            if (result.response.status_code === 301) {
                const redirect_url = result.response.get_header("Location");
                if (redirect_url === null) {
                    console.error("Tried to redirect: Status Code is 301, but Location header is null");
                    return null;
                } else {
                    console.log("Redirect to:", redirect_url);
                    this.page_change_to(redirect_url);
                    return {
                        url: this.request_url,
                        is_redirect: true
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
                    html_element_set_attributes(document.children[0], resolved_content.document_html.attributes);
                    html_element_set_attributes(document.head, resolved_content.document_head.attributes);
                    html_element_set_attributes(document.body, resolved_content.document_body.attributes);
                    document.head.innerHTML = resolved_content.document_head.innerHTML;
                    document.body.innerHTML = resolved_content.document_body.innerHTML;
                }
                if (result.dom_ready !== null) result.dom_ready(context, this);
                return {
                    url: this.request_url,
                    is_redirect: false
                };
            }
        }
        return null;
    }
    page_change_to(url_or_path) {
        console.log("page_change_to url_or_path:", url_or_path);
        let url;
        const test = url_or_path.indexOf("//");
        if (test === 0 || test === 5 || test === 6) {
            url = url_or_path;
        } else {
            url = location.protocol + "//" + location.host + url_or_path;
        }
        const result = this.page_change({
            url: url,
            is_redirect: false
        }, true);
        if (result !== null) {
            if (result.is_redirect) return true;
            console.log("history.pushState result", result);
            history.pushState(result, document.title, this.request_url);
            return true;
        }
        return false;
    }
}
var EnvironmentPlatform;
(function(EnvironmentPlatform1) {
    EnvironmentPlatform1[EnvironmentPlatform1["WEB"] = 0] = "WEB";
    EnvironmentPlatform1[EnvironmentPlatform1["DESKTOP"] = 1] = "DESKTOP";
    EnvironmentPlatform1[EnvironmentPlatform1["ANDROID"] = 2] = "ANDROID";
})(EnvironmentPlatform || (EnvironmentPlatform = {}));
var EnvironmentStage;
(function(EnvironmentStage1) {
    EnvironmentStage1[EnvironmentStage1["DEVELOPMENT"] = 0] = "DEVELOPMENT";
    EnvironmentStage1[EnvironmentStage1["STAGING"] = 1] = "STAGING";
    EnvironmentStage1[EnvironmentStage1["PRODUCTION"] = 2] = "PRODUCTION";
})(EnvironmentStage || (EnvironmentStage = {}));
const __default = JSON.parse(`[
    { "key": "title1", "translation": "Frontwork Test Page" }
    ,{ "key": "text1", "translation": "This is a test page for the Frontwork framework." }
    ,{ "key": "title2", "translation": "Test Form" }
]`);
const __default1 = JSON.parse(`[
    { "key": "title1", "translation": "Frontwork Test Seite" }
    ,{ "key": "text1", "translation": "Dies ist eine deutsche Test Seite für das Frontwork framework." }
    ,{ "key": "title2", "translation": "Test Formular" }
]`);
const i18n = new I18n([
    new I18nLocale("en", __default),
    new I18nLocale("de", __default1), 
]);
function render_header() {
    const header = document.createElement("header");
    const link1 = header.appendChild(document.createElement("a"));
    link1.innerText = "Home";
    link1.setAttribute("href", "/");
    link1.setAttribute("style", "margin-right: 10px;");
    const link2 = header.appendChild(document.createElement("a"));
    link2.innerText = "Test 2";
    link2.setAttribute("href", "/test2");
    link2.setAttribute("style", "margin-right: 10px;");
    const link3 = header.appendChild(document.createElement("a"));
    link3.innerText = "Test 3";
    link3.setAttribute("href", "/test3");
    link3.setAttribute("style", "margin-right: 10px;");
    const link_german = header.appendChild(document.createElement("a"));
    link_german.innerText = "German";
    link_german.setAttribute("href", "/german");
    link_german.setAttribute("style", "margin-right: 10px;");
    const link_crash = header.appendChild(document.createElement("a"));
    link_crash.innerText = "Crash";
    link_crash.setAttribute("href", "/crash");
    link_crash.setAttribute("style", "margin-right: 10px;");
    return header;
}
class TestComponent {
    build(context) {
        const document_builder = new DocumentBuilder();
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
        return new FrontworkResponse(200, document_builder.set_html_lang(context.i18n.selected_locale.locale).add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow"));
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
    build() {
        const document_builder = new DocumentBuilder();
        document_builder.document_body.appendChild(render_header());
        const main = document_builder.document_body.appendChild(document.createElement("main"));
        const title1 = main.appendChild(document.createElement("h1"));
        title1.innerText = "Test Page 2";
        const description = main.appendChild(document.createElement("p"));
        description.innerHTML = "This is a test page <b>2</b> for the Frontwork framework. I will redirect you with js to the home page in 1 second.";
        return new FrontworkResponse(200, document_builder.set_html_lang("en").add_head_meta_data(title1.innerText, description.innerText, "noindex,nofollow"));
    }
    dom_ready(context, frontwork) {
        console.log("FrontworkContext", context);
        console.log("frontwork", frontwork);
        setTimeout(()=>{
            frontwork.page_change_to("/");
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
    build() {
        const document_builder = new DocumentBuilder();
        return new FrontworkResponse(200, document_builder.set_html_lang("en").add_head_meta_data("element_test", "element_test", "noindex,nofollow"));
    }
    dom_ready() {}
}
class HelloWorldComponent {
    build(context) {
        const content = "hello " + context.request.path_dirs[2];
        return new FrontworkResponse(200, content);
    }
    dom_ready() {}
}
class CrashComponent {
    build() {
        throw new Error("Crash Test");
        return new FrontworkResponse(200, "this text shall never be seen in the browser");
    }
    dom_ready() {}
}
const domain_routes = [
    new DomainRoutes(/.*/, [
        new Route("/", new TestComponent()),
        new Route("/test2", new Test2Component()),
        new Route("/test3", new Test3Component()),
        new Route("/german", new TestGerman()),
        new Route("/crash", new CrashComponent()),
        new Route("/element_test", new ElementTestComponent()),
        new Route("/hello/22222222", new HelloWorldComponent()),
        new Route("/hello/*", new HelloWorldComponent()), 
    ])
];
const middleware = new FrontworkMiddleware();
const init = {
    platform: EnvironmentPlatform.WEB,
    stage: EnvironmentStage.DEVELOPMENT,
    port: 8080,
    domain_routes: domain_routes,
    middleware: middleware,
    i18n: i18n
};
new FrontworkFront(init, {
    build_on_page_load: false
});
