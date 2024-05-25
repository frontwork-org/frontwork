import { Frontwork, FrontworkRequest, PostScope, DocumentBuilder, FrontworkResponse, DomReadyEvent, FrontworkInit, EnvironmentStage, LogType, debug } from "./frontwork.ts";
import { html_element_set_attributes } from "./utils.ts";


export class FrontworkClient extends Frontwork {
    private request_url: string;
    private build_on_page_load: boolean;

    constructor(init: FrontworkInit) {
        super(init);
        this.request_url = location.toString();

        if (typeof init.build_on_page_load === "boolean") this.build_on_page_load = init.build_on_page_load;
        else this.build_on_page_load = false;

        // DOM Ready
        document.addEventListener("DOMContentLoaded", () => {
            this.page_change({url: location.toString(), is_redirect: false, status_code: 200}, this.build_on_page_load);
        });

        // add event listener for page change on link click
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLAnchorElement;
            if (target.tagName === 'A') {
                if (this.page_change_to(target.href)) {
                    // only prevent default if page_change_to fails. It fails if the link is external or unkown.
                    event.preventDefault();
                }
            }
        }, false);

        // PopState Event: history back/forward; this event is needed to update the content
        addEventListener('popstate', (event) => {
            // validate event.state; it could be a different value if the state has been set by another script
            const savestate: PageChangeSavestate = event.state;
            if (savestate && savestate.url) {
                this.page_change(savestate, true);
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

    
    private page_change(savestate: PageChangeSavestate, do_building: boolean): PageChangeSavestate|null {
        this.request_url = savestate.url;
        
        const request = new FrontworkRequest("GET", this.request_url, new Headers(), new PostScope([]));
        const context =  { request: request, i18n: this.i18n, platform: this.platform, stage: this.stage };

        let result: PageChangeResult;
        try {
            const resolved_component = this.routes_resolver_with_middleware(context);
            if (resolved_component) {
                result = { response: resolved_component.response, dom_ready: resolved_component.dom_ready };
            } else {
                result = { response: this.middleware.not_found_handler.build(context), dom_ready: this.middleware.not_found_handler.dom_ready };
            }
        } catch (error) {
            const error_handler_result = this.middleware.error_handler.build(context);
            result = { response: error_handler_result, dom_ready: this.middleware.error_handler.dom_ready };
        }

        
        if (result.response !== null) {
            if (result.response.status_code === 301) {
                // redirect
                const redirect_url = result.response.get_header("Location");
                if (redirect_url === null) {
                    debug.reporter(LogType.Error, "REDIRECT", "Tried to redirect: Status Code is 301, but Location header is null", null);
                    return null;
                } else {
                    debug.reporter(LogType.Info, "REDIRECT", "Redirect to: " + redirect_url, null);
                    this.page_change_to(redirect_url);
                    return { url: this.request_url, is_redirect: true, status_code: result.response.status_code };
                }
            }

            const resolved_content = <DocumentBuilder> result.response.content;
            if (typeof resolved_content.document_html !== "undefined") {
    
                if (do_building) {
                    result.response.cookies.forEach(cookie => {
                        if (cookie.http_only === false) {
                            document.cookie = cookie.toString();
                        }
                    });

                    resolved_content.html_response();

                    html_element_set_attributes(document.children[0] as HTMLElement, resolved_content.document_html.attributes);
                    html_element_set_attributes(document.head, resolved_content.document_head.attributes);
                    html_element_set_attributes(document.body, resolved_content.document_body.attributes);
                
                    document.head.innerHTML = resolved_content.document_head.innerHTML;
                    document.body.innerHTML = resolved_content.document_body.innerHTML;
                }
            
                if(result.dom_ready !== null) result.dom_ready(context, this);
                return { url: this.request_url, is_redirect: false, status_code: result.response.status_code };
            }
        }

        return null;
    }
    
    // function replacement for window.location; accessible for the Component method dom_ready
    public page_change_to(url_or_path: string) {
        debug.reporter(LogType.Info, "PageChange", "page_change_to url_or_path: " + url_or_path, null);
        let url;
        const test = url_or_path.indexOf("//");
        if (test === 0 || test === 5 || test === 6) { // if "//" OR "http://" OR "https://"
            url = url_or_path
        } else {
            url = location.protocol+"//"+location.host+url_or_path
        }

        const result = this.page_change({url: url, is_redirect: false, status_code: 200}, true);
        if(result !== null) {
            if(result.is_redirect) return true;

            history.pushState(result, document.title, this.request_url);
            return true;
        }
        return false;
    }
}


interface PageChangeResult {
    response: FrontworkResponse | null;
    dom_ready: DomReadyEvent | null;
}

class PageChangeSavestate {
    url: string;
    is_redirect: boolean;
    status_code: number;
    constructor(url: string, is_redirect: boolean, status_code: number) {
        this.url = url;
        this.is_redirect = is_redirect;
        this.status_code = status_code;
    }
}