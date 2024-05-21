import { } from "./dom.ts";
import { Frontwork, FrontworkRequest, PostScope, FrontworkResponse, FrontworkInit, EnvironmentStage } from "./frontwork.ts";
import { key_value_list_to_array } from "./utils.ts";


export class FrontworkWebservice extends Frontwork {
    private assets_folder_path = "";
    private assets_relative_path_files: string[] = [];
    private style_css_absolute_path = "";
    private main_js_absolute_path = "";

    constructor (init: FrontworkInit) {
        super(init);
    }
    
    start() {
        console.log("Deno started webservice on http://localhost:" + this.port);
        const abortController = new AbortController();

        if (this.stage === EnvironmentStage.Development) {
            const service_started_timestamp = new Date().getTime().toString();

            Deno.serve({ port: this.port, signal: abortController.signal }, (_request: Request) => { return this.handler_dev(_request, service_started_timestamp); });
        } else {
            Deno.serve({ port: this.port, signal: abortController.signal }, this.handler);
        }

        globalThis.addEventListener("unload", () => abortController.abort());
    }

    setup_assets_resolver(assets_folder_path: string) {
        this.assets_folder_path = assets_folder_path;
        // remove last slash if exists
        if (this.assets_folder_path.charAt(this.assets_folder_path.length -1) === '/') {
            this.assets_folder_path.substring(0, this.assets_folder_path.length -2)
        }

        for (const dirEntry of Deno.readDirSync(assets_folder_path)) {
            if (dirEntry.isFile) {
                this.assets_relative_path_files.push('/' + dirEntry.name.replace(this.assets_folder_path, ""));
            }
        }
        return this;
    }

    setup_style_css(style_css_absolute_path: string) {
        this.style_css_absolute_path = style_css_absolute_path;
        return this;
    }

    setup_main_js(main_js_absolute_path: string) {
        this.main_js_absolute_path = main_js_absolute_path;
        return this;
    }

    private assets_resolver(request: FrontworkRequest): Response|null {
        if(request.path === "/assets/style.css") {
            try {
                const file = Deno.readFileSync(this.style_css_absolute_path);
                return new Response(file);
            } catch (error) {
                console.log("ERROR can not load style.css from '" + this.style_css_absolute_path + "'\n", error);
                return null;
            }
        } else if(request.path === "/assets/main.js") {
            try {
                const file = Deno.readFileSync(this.main_js_absolute_path);
                return new Response(file);
            } catch (error) {
                console.log("ERROR can not load main.js from '" + this.main_js_absolute_path + "'\n", error);
                return null;
            }
        }

        for (const relative_file_path of this.assets_relative_path_files) {
            if (relative_file_path === request.path) {
                const file = Deno.readFileSync(this.assets_folder_path + request.path);
                return new Response(file);
            }
        }
        return null;
    }
    
    private async handler(_request: Request): Promise<Response> {
        // FormData is too complicated, so we decode it here and put it into PostScope
        let post_data: { key: string, value: string }[] = [];


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
                                post_data = key_value_list_to_array(body_string, "&", "=");
                            }
                        });
                    }
                } else if(content_type === "multipart/form-data") {
                    // _TODO: supporting multipart/form-data
                }
            }
        }
        
        const POST = new PostScope(post_data)
        const request = new FrontworkRequest(_request.method, _request.url, _request.headers, POST);

        try {
            // Assets resolver
            const resolved_asset = this.assets_resolver(request);
            if(resolved_asset !== null) {
                this.log(request, "[ASSET]");
                return resolved_asset;
            }

            // Route
            const context = { request: request, i18n: this.i18n, platform: this.platform, stage: this.stage };
            const resolved_component = this.routes_resolver(context);
            
            if(resolved_component !== null) {
                const resolved_response = resolved_component;
                if(resolved_response.response !== null) {
                    return resolved_response.response.into_response();
                }
            }
    
            this.log(request, "[NOT FOUND]");
            const not_found_response = <FrontworkResponse> this.middleware.not_found_handler.build(context, this);
            return not_found_response.into_response();
        } catch (error) {
            console.error(error);
            
            try {
                return this.middleware.error_handler(request, error).into_response();
            } catch (error) {
                console.error("ERROR in middleware.error_handler", error);
            }
        }

        return new Response("ERROR in error_handler", { status: 500 });
    }
    
    private async handler_dev(_request: Request, service_started_timestamp: string): Promise<Response> {
        const url = _request.url;
        const url_sub = url.substring(url.length -4, url.length);
        if (url_sub === "//ws") {
            let response, socket: WebSocket;
            try {
                await ({ response, socket } = Deno.upgradeWebSocket(_request));
            } catch {
                return new Response("request isn't trying to upgrade to websocket.");
            }

            // sent client service_started_timestamp
            socket.onmessage = () => {
                socket.send(service_started_timestamp);
            };
            return response;
        } else {
            return this.handler(_request);
        }
    }
}

