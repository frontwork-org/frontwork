import { Frontwork, FrontworkRequest, PostScope, DocumentBuilder, FrontworkInit, EnvironmentStage, LogType, FW, BeforeRouteEvent, Route, DomReadyEvent, BuildEvent, FrontworkContext } from "./frontwork.ts";
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
                    // only prevent default if page_change_to fails. It fails if the link is external or unknown.
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
        
        const request = new FrontworkRequest("GET", this.request_url, new Headers(), new PostScope({}));
        const context = new FrontworkContext(this.platform, this.stage, this.i18n, request, do_building);
        const route: Route|null = this.route_resolver(context);


        // Middleware: before Route
        try {
            this.middleware.before_route.build(context);
            this.middleware.before_route.dom_ready(context, this);
        } catch (error) {
            context.request.error("before_route", error);
        }


        if (do_building) {
            const reb_result = this.route_execute_build(context, this.route_resolver(context));
            const response = reb_result.reponse;
            
            response.cookies.forEach(cookie => {
                if (cookie.http_only === false) {
                    document.cookie = cookie.toString();
                }
            });

            if (response.status_code === 301 || response.status_code === 302) {
                // redirect
                const redirect_url = response.get_header("Location");
                if (redirect_url === null) {
                    FW.reporter(LogType.Error, "REDIRECT", "Tried to redirect: Status Code is 301, but Location header is null", null);
                    return null;
                } else {
                    if(FW.verbose_logging) FW.reporter(LogType.Info, "REDIRECT", "Redirect to: " + redirect_url, null);
                    this.page_change_to(redirect_url);
                    return { url: this.request_url, is_redirect: true, status_code: response.status_code };
                }
            }
    

            const resolved_content = <DocumentBuilder> response.content;
            if (typeof resolved_content.context.document_html !== "undefined") {
                resolved_content.html();

                html_element_set_attributes(document.children[0] as HTMLElement, resolved_content.context.document_html.attributes);
                html_element_set_attributes(document.head, resolved_content.context.document_head.attributes);
                html_element_set_attributes(document.body, resolved_content.context.document_body.attributes);
            
                document.head.innerHTML = resolved_content.context.document_head.innerHTML;
                document.body.innerHTML = resolved_content.context.document_body.innerHTML;
            
                reb_result.dom_ready(context, this);
                return { url: this.request_url, is_redirect: false, status_code: response.status_code };
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
        if(FW.verbose_logging) FW.reporter(LogType.Info, "PageChange", "page_change_to url_or_path: " + url_or_path, null);
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