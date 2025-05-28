import { Frontwork, FrontworkRequest, PostScope, DocumentBuilder, FrontworkInit, EnvironmentStage, LogType, FW, Route, FrontworkContext, Component } from "./frontwork.ts";
import { html_element_set_attributes, Observer } from "./utils.ts";


export class FrontworkClient extends Frontwork {
    private build_on_page_load: boolean;
    private readonly client_observers: {[key: string]: Observer<any>} = {};

    /** page_change() behaviour: 
        It kills the previous Promise so that it will not execute its Component build function since it is not needed because the user already clicked to the next page.
        But we should wait for page_change_form because we want ensure that the data is transmitted. */
    private page_change_ready = true;
    private page_change_previous_abort_controller: AbortController|null = null;
    public is_page_change_ready(): boolean { return this.page_change_ready }
    previous_component: Component|null = null;
    previous_context: FrontworkContext|null = null;

    private get_headers(): Headers {
        return new Headers([["Cookie", document.cookie]]);
    }

    constructor(init: FrontworkInit) {
        super(init);

        if (typeof init.build_on_page_load === "boolean") this.build_on_page_load = init.build_on_page_load;
        else this.build_on_page_load = false;

        // DOM Ready
        document.addEventListener("DOMContentLoaded", () => {
            const request = new FrontworkRequest("GET", location.toString(), this.get_headers(), new PostScope({}));
            this.page_change(request, this.build_on_page_load, false);
        });

        // add event listener for page change on link click
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLAnchorElement;
            if (target.href === "") {
                // do nothing on empty href
                event.preventDefault();
            } else if (target.tagName === 'A' && (target.target === "" || target.target === "_self")) {
                // Create a URL object to easily access hostname
                const url = new URL(target.href);
                
                // Check if hostname exists and is different from current hostname
                if (url.hostname !== '' && url.hostname !== window.location.hostname) {
                    // External link - let it proceed normally
                    return;
                }
                
                event.preventDefault();

                if (this.page_change_ready) {
                    this.page_change_to(target.href, false);
                }
            }
        }, false);

        // FrontworkForm halt sending data to the server and let the client handle it instead
        document.addEventListener('submit', async (event) => {
            const target = event.target as HTMLFormElement;
            
            if (target.tagName === "FORM" && target.getAttribute("fw-form") !== null) {
                // Prevent the form from submitting
                event.preventDefault();

                if (target.ariaDisabled === "true") {
                    console.log("fw-form is ariaDisabled. Because it already has been submitted.", target);
                } else {
                    target.ariaDisabled = "true";
                    
                    let submit_button = event.submitter as HTMLButtonElement|null;
                    submit_button = submit_button && submit_button.name? submit_button : null;
                    
                    const result = await this.page_change_form(target, submit_button);
                    console.log("page_change_form result", result);
                    target.ariaDisabled = "false";
                }
            }
        });

        // PopState Event: history back/forward; this event is needed to update the content
        addEventListener('popstate', (event) => {
            if (this.page_change_ready) {
                // validate event.state; it could be a different value if the state has been set by another script
                const savestate: PageChangeSavestate = event.state;
                if (savestate && savestate.url) {
                    const request = new FrontworkRequest("GET", savestate.url, this.get_headers(), new PostScope({}));
                    this.page_change(request, true, true);
                }
            } else {
                // Page is still processing form data. Prevent go back/forward
                history.pushState(null, "", window.location.pathname);
            }
        });

        // websocket for hot-reload check
        if (this.stage === EnvironmentStage.Development) {
            console.info("hot-reloading is enabled; Make sure this is the development environment");
            // location.reload() after noticing the disconnect and reconnect is successful
            let state = 0;

            const connect = () => {
                const ws = new WebSocket("ws://"+location.host+"//ws");
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
              }
              
              connect();
              
        }
    }

    
    private async page_change(request: FrontworkRequest, do_building: boolean, ignore_not_ready: boolean): Promise<PageChangeSavestate | null> {
        if (this.page_change_ready || ignore_not_ready) {
            if (this.page_change_previous_abort_controller !== null) {
                this.page_change_previous_abort_controller.abort();
            }
            const abort_controller = new AbortController();
            this.page_change_previous_abort_controller = abort_controller;

            // Page changed, so we trigger the on_destroy method from the previous route. Uses the context of the previous component.
            if(this.previous_component !== null && this.previous_context !== null ) await this.previous_component.on_destroy(this.previous_context, this);

            const context = new FrontworkContext(this.platform, this.stage, "127.0.0.1", this.api_protocol_address, this.api_protocol_address_ssr, this.api_error_event, this.i18n, request, do_building, this);
            this.previous_context = context;
            let route;
            try {
                route = await this.route_resolver(context);
            // deno-lint-ignore no-explicit-any
            } catch (error: any) {
                context.request.error("ERROR in route_resolver", context, error);
                return null;
            }
            
            
            // Middleware: before Route
            try {
                this.middleware.before_route.build(context);
                this.middleware.before_route.dom_ready(context, this);
            // deno-lint-ignore no-explicit-any
            } catch (error: any) {
                context.request.error("before_route", context, error);
            }


            if (do_building) {
                const reb_result = await this.route_execute_build(context, route);
                if (abort_controller.signal.aborted) {
                    this.page_change_ready = true;
                    return null;
                }
                
                for (let i = 0; i < reb_result.response.cookies.length; i++) {
                    const cookie = reb_result.response.cookies[i];
                    if (cookie.http_only === false) {
                        document.cookie = cookie.toString();
                    }
                }

                if (reb_result.response.status_code === 301 || reb_result.response.status_code === 302) {
                    // redirect
                    const redirect_url = reb_result.response.get_header("Location");
                    if (redirect_url === null) {
                        FW.reporter(LogType.Error, "REDIRECT", "Tried to redirect: Status Code is 301, but Location header is null", context, null);
                        this.page_change_ready = true;
                        return null;
                    } else {
                        if(FW.verbose_logging) FW.reporter(LogType.Info, "REDIRECT", "Redirect to: " + redirect_url, context, null);
                        this.page_change_to(redirect_url, true);
                        this.page_change_ready = true;
                        return { method: request.method, url: context.request.url, is_redirect: true, status_code: reb_result.response.status_code };
                    }
                }
        

                const resolved_content = <DocumentBuilder> reb_result.response.content;
                if (typeof resolved_content.context.html !== "undefined") {
                    resolved_content.html();

                    html_element_set_attributes(document.children[0] as HTMLElement, resolved_content.context.html.elem.attributes);
                    html_element_set_attributes(document.head, resolved_content.context.head.elem.attributes);
                    document.head.innerHTML = resolved_content.context.head.elem.innerHTML;

                    const html = document.body.parentElement;
                    if(document.body !== null) document.body.remove();

                    // Add all elements except script to the body
                    if(html !== null) {
                        for (let i = 0; i < context.body.elem.children.length; i++) {
                            const child = context.body.elem.children[i];
                            if (child.tagName === "SCRIPT") {
                                child.remove();
                            }
                        }
                        html.append(context.body.elem);
                    }
                    
                    reb_result.component.dom_ready(context, this);
                    this.previous_component = reb_result.component;
                    this.page_change_ready = true;
                    return { method: request.method, url: request.url, is_redirect: false, status_code: reb_result.response.status_code };
                }
            } else {
                if (route !== null) {
                    const route_component = new route.component(context);
                    route_component.dom_ready(context, this);
                    this.previous_component = route_component;
                } else {
                    const not_found_component = new this.middleware.not_found_handler(context);
                    not_found_component.dom_ready(context, this);
                    this.previous_component = not_found_component;
                }
            }

            this.page_change_ready = true;
        }

        return null;
    }
    
    // function replacement for window.location; accessible for the Component method dom_ready */
    public async page_change_to(url_or_path: string, ignore_not_ready?: boolean) {
        if(FW.verbose_logging) FW.reporter(LogType.Info, "PageChange", "    page_change_to: " + url_or_path, null, null);
        let url;
        const test = url_or_path.indexOf("//");
        if (test === 0 || test === 5 || test === 6) { // if "//" OR "http://" OR "https://"
            url = url_or_path
        } else {
            url = location.protocol+"//"+location.host+url_or_path
        }

        const request = new FrontworkRequest("GET", url, this.get_headers(), new PostScope({}));
        const result = await this.page_change(request, true, ignore_not_ready === true);
        if(result !== null) {
            if(result.is_redirect) return true;
            history.pushState(result, document.title, url);
            return true;
        }
        return false;
    }
    
    /** function to handle Form submits being handled in client */
    public async page_change_form(form: HTMLFormElement, submit_button: HTMLButtonElement|null): Promise<boolean> {
        this.page_change_ready = false;
        if(FW.verbose_logging) FW.reporter(LogType.Info, "PageChange", "page_change_form", null, null);
        let method = form.getAttribute("method");
        if(method === null) method = "POST";// In Web Browsers, if a form's method attribute is empty, it defaults to "POST".
        const IS_METHOD_GET = method === "GET";
        if(submit_button) submit_button.disabled = true;
        
        let url: string;
        const action = form.getAttribute("action");
        if (action === "") {
            if (this.previous_context) {
                if (IS_METHOD_GET) {
                    url = this.previous_context.request.protocol+"//"+this.previous_context.request.host+this.previous_context.request.path;
                } else {
                    url = this.previous_context.request.url;
                }
            } else {
                url = location.protocol+"//"+location.host+window.location.pathname.toString();
                if (IS_METHOD_GET && location.search !== "") url += location.search;
            }
        } else {
            url = location.protocol+"//"+location.host+action;
        }

        // Delete lonely slash
        if (this.middleware.redirect_lonely_slash && url.substring(url.length-1) === "/") {
            url = url.substring(0, url.length-1);
        }

        // Get FormData from form
        const form_data = new FormData(form);
        
        const POST = new PostScope({});
        if (IS_METHOD_GET) {
            let first = true;
            form_data.forEach((value, key) => {
                if (first) {
                    first = false;
                    url += "?";
                } else {
                    url += "&";
                }
                url += key+"="+encodeURIComponent(value.toString());
            });

            // Include submit button name and value
            if (submit_button !== null) {
                url += (first? "?" : "&") + submit_button.name+"="+submit_button.value;
            }
        } else {
            form_data.forEach((value, key) => POST.items[key] = value.toString());
            // Include submit button name and value
            if (submit_button !== null) {
                POST.items[submit_button.name] = submit_button.value;
            }
        }

        const request = new FrontworkRequest(method, url, this.get_headers(), POST);
        const result = await this.page_change(request, true, true);
        console.log("page_change_form result inner", result);
        
        if(result !== null) {
            if(result.is_redirect) return true;
            history.pushState(result, document.title, url);
            return true;
        }

        if(submit_button) submit_button.disabled = true;
        return false;
    }

    public refresh() {
        return this.page_change_to(window.location.toString(), true);
    }
}


class PageChangeSavestate {
    method: string;
    url: string;
    is_redirect: boolean;
    status_code: number;
    constructor(method: string, url: string, is_redirect: boolean, status_code: number) {
        this.method = method;
        this.url = url;
        this.is_redirect = is_redirect;
        this.status_code = status_code;
    }
}