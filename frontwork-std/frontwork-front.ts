import { Frontwork, FrontworkRequest, PostScope, DocumentBuilder, FrontworkResponse, DomReadyEvent, FrontworkInit } from "./frontwork.ts";
import { html_element_set_attributes } from "./utils.ts";


/**
 *   @param {boolean} build_on_page_load - Enable or Disable Client-Side-Rendering on DOM Ready
 */
export interface FrontworkFrontInit {
    build_on_page_load?: boolean;
}

export class FrontworkFront extends Frontwork {
    private request_url: string;
    private build_on_page_load: boolean;

    constructor(init: FrontworkInit, front_init: FrontworkFrontInit) {
        super(init);
        this.request_url = location.toString();

        if (typeof front_init.build_on_page_load === "boolean") this.build_on_page_load = front_init.build_on_page_load;
        else this.build_on_page_load = false;

        // DOM Ready
        document.addEventListener("DOMContentLoaded", () => {
            this.page_change({url: location.toString(), is_redirect: false}, this.build_on_page_load);
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
    }

    
    private page_change(savestate: PageChangeSavestate, do_building: boolean): PageChangeSavestate|null {
        this.request_url = savestate.url;
        
        const request = new FrontworkRequest("GET", this.request_url, new Headers(), new PostScope([]));
        const context =  { request: request, i18n: this.i18n, platform: this.platform, stage: this.stage };

        let result: PageChangeResult;
        try {
            const resolved_component = this.routes_resolver(request);
            if (resolved_component) {
                result = { response: resolved_component.build(context, this), dom_ready: resolved_component.dom_ready };
            } else {
                result = { response: this.middleware.not_found_handler.build(context, this), dom_ready: this.middleware.not_found_handler.dom_ready };
            }
        } catch (error) {
            console.error(error);
            const error_handler_result = this.middleware.error_handler(request, error);
            result = { response: error_handler_result, dom_ready: null };
        }

        
        if (result.response !== null) {
            if (result.response.status_code === 301) {
                // redirect
                const redirect_url = result.response.get_header("Location");
                if (redirect_url === null) {
                    console.error("Tried to redirect: Status Code is 301, but Location header is null");
                    return null;
                } else {
                    console.log("Redirect to:", redirect_url);
                    this.page_change_to(redirect_url);
                    return { url: this.request_url, is_redirect: true };
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

                    html_element_set_attributes(document.children[0] as HTMLElement, resolved_content.document_html.attributes);
                    html_element_set_attributes(document.head, resolved_content.document_head.attributes);
                    html_element_set_attributes(document.body, resolved_content.document_body.attributes);
                
                    document.head.innerHTML = resolved_content.document_head.innerHTML;
                    document.body.innerHTML = resolved_content.document_body.innerHTML;
                }
            
                if(result.dom_ready !== null) result.dom_ready(context, this);
                return { url: this.request_url, is_redirect: false };
            }
        }

        return null;
    }
    
    // function replacement for window.location; accessible for the Component method dom_ready
    public page_change_to(url_or_path: string) {
        console.log("page_change_to url_or_path:", url_or_path);
        let url;
        const test = url_or_path.indexOf("//");
        if (test === 0 || test === 5 || test === 6) { // if "//" OR "http://" OR "https://"
            url = url_or_path
        } else {
            url = location.protocol+"//"+location.host+url_or_path
        }

        const result = this.page_change({url: url, is_redirect: false}, true);
        if(result !== null) {
            if(result.is_redirect) return true;

            console.log("history.pushState result", result)
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
    url: string
    is_redirect: boolean
    constructor(url: string, is_redirect: boolean) {
        this.url = url;
        this.is_redirect = is_redirect;
    }
}