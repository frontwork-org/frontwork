import { Frontwork, FrontworkRequest, PostScope, DocumentBuilder, FrontworkInit, EnvironmentStage, LogType, FW, Route, FrontworkContext } from "./frontwork.ts";
import { html_element_set_attributes } from "./utils.ts";


export class FrontworkClient extends Frontwork {
    private build_on_page_load: boolean;

    constructor(init: FrontworkInit) {
        super(init);

        if (typeof init.build_on_page_load === "boolean") this.build_on_page_load = init.build_on_page_load;
        else this.build_on_page_load = false;

        // DOM Ready
        document.addEventListener("DOMContentLoaded", () => {
            const request = new FrontworkRequest("GET", location.toString(), new Headers(), new PostScope({}));
            this.page_change(request, this.build_on_page_load);
        });

        // add event listener for page change on link click
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLAnchorElement;
            if (target.tagName === 'A') {
                if (this.page_change_to(target.href)) {
                    // only prevent default if page_change_to fails. It fails if the link is external or unknown.
                    event.preventDefault();
                }
            }
        }, false);

        // FrontworkForm halt sending data to the server and let the client handle it instead
        document.addEventListener('submit', (event) => {
            const target = event.target as HTMLFormElement;
            if (target.tagName === 'FORM' && target.getAttribute("fw-form")) {
                // Prevent the form from submitting
                let submit_button = event.submitter as HTMLButtonElement|null;
                submit_button = submit_button && submit_button.name? submit_button : null;
                if(this.page_change_form(target, submit_button)) event.preventDefault();
                
            }
        });

        // PopState Event: history back/forward; this event is needed to update the content
        addEventListener('popstate', (event) => {
            // validate event.state; it could be a different value if the state has been set by another script
            const savestate: PageChangeSavestate = event.state;
            if (savestate && savestate.url) {
                const request = new FrontworkRequest("GET", savestate.url, new Headers(), new PostScope({}));
                this.page_change(request, true);
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

    
    private page_change(request: FrontworkRequest, do_building: boolean): PageChangeSavestate|null {
        const context = new FrontworkContext(this.platform, this.stage, this.i18n, request, do_building);
        const route: Route|null = this.route_resolver(context);
        
        // Middleware: before Route
        try {
            this.middleware.before_route.build(context);
            this.middleware.before_route.dom_ready(context, this);
        } catch (error) {
            context.request.error("before_route", context, error);
        }


        if (do_building) {
            const reb_result = this.route_execute_build(context, route);
            
            reb_result.reponse.cookies.forEach(cookie => {
                if (cookie.http_only === false) {
                    document.cookie = cookie.toString();
                }
            });

            if (reb_result.reponse.status_code === 301 || reb_result.reponse.status_code === 302) {
                // redirect
                const redirect_url = reb_result.reponse.get_header("Location");
                if (redirect_url === null) {
                    FW.reporter(LogType.Error, "REDIRECT", "Tried to redirect: Status Code is 301, but Location header is null", context, null);
                    return null;
                } else {
                    if(FW.verbose_logging) FW.reporter(LogType.Info, "REDIRECT", "Redirect to: " + redirect_url, context, null);
                    this.page_change_to(redirect_url);
                    return { method: request.method, url: context.request.url, is_redirect: true, status_code: reb_result.reponse.status_code };
                }
            }
    

            const resolved_content = <DocumentBuilder> reb_result.reponse.content;
            if (typeof resolved_content.context.document_html !== "undefined") {
                resolved_content.html();

                html_element_set_attributes(document.children[0] as HTMLElement, resolved_content.context.document_html.attributes);
                html_element_set_attributes(document.head, resolved_content.context.document_head.attributes);
                html_element_set_attributes(document.body, resolved_content.context.document_body.attributes);
            
                document.head.innerHTML = resolved_content.context.document_head.innerHTML;

                const html = document.body.parentElement;
                if(document.body !== null) document.body.remove();

                // Add all elements except script to the body
                if(html !== null) {
                    for (let i = 0; i < context.document_body.children.length; i++) {
                        const child = context.document_body.children[i];
                        if (child.tagName === "SCRIPT") {
                            child.remove();
                        }
                    }
                    html.append(context.document_body);
                }
                
                reb_result.component.dom_ready(context, this);
                return { method: request.method, url: request.url, is_redirect: false, status_code: reb_result.reponse.status_code };
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
    
    // function replacement for window.location; accessible for the Component method dom_ready
    public page_change_to(url_or_path: string) {
        if(FW.verbose_logging) FW.reporter(LogType.Info, "PageChange", "    page_change_to: " + url_or_path, null, null);
        let url;
        const test = url_or_path.indexOf("//");
        if (test === 0 || test === 5 || test === 6) { // if "//" OR "http://" OR "https://"
            url = url_or_path
        } else {
            url = location.protocol+"//"+location.host+url_or_path
        }

        const request = new FrontworkRequest("GET", url, new Headers(), new PostScope({}));
        const result = this.page_change(request, true);
        if(result !== null) {
            if(result.is_redirect) return true;

            history.pushState(result, document.title, url);
            return true;
        }
        return false;
    }
    
    // function to handle Form submits being handled in client
    public page_change_form(form: HTMLFormElement, submit_button: HTMLButtonElement|null) {
        if(FW.verbose_logging) FW.reporter(LogType.Info, "PageChange", "page_change_form", null, null);
        let method = form.getAttribute("method");
        if(method === null) method = "POST";// In Web Browsers, if a form's method attribute is empty, it defaults to "POST".
        
        let url: string;
        const action = form.getAttribute("action");
        if (action === "") {
            url = location.protocol+"//"+location.host+window.location.pathname.toString();
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
        if (method === "GET") {
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

        const request = new FrontworkRequest(method, url, new Headers(), POST);
        const result = this.page_change(request, true);
        if(result !== null) {
            if(result.is_redirect) return true;

            
            history.pushState(result, document.title, url);
            return true;
        }
        return false;
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