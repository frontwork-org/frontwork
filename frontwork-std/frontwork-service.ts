import { } from "./dom.ts";
import { Frontwork, FrontworkRequest, FrontworkMiddleware, Route, PostScope, FrontworkResponse, DomainRoutes, FrontworkInit } from "./frontwork.ts";
import { key_value_list_to_array } from "./utils.ts";

export class FrontworkWebservice extends Frontwork {
    private service: Deno.Listener;
    private assets_folder_path = "";
    private assets_relative_path_files: string[] = [];
    private main_js_absolute_path = "";

    constructor (init: FrontworkInit) {
        super(init);
        console.log("Deno started webservice on http://localhost:" + this.port);
        this.service = Deno.listen({ port: this.port });
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

    setup_main_js(main_js_absolute_path: string) {
        this.main_js_absolute_path = main_js_absolute_path;
        return this;
    }

    async start() {
        for await (const connection of this.service) {
            const httpConnection = Deno.serveHttp(connection);
            for await (const requestEvent of httpConnection) {
                this.handler(requestEvent);
            }
        }
    }

    private assets_resolver (request: FrontworkRequest): Response|null {
        if(request.path === "/assets/main.js") {
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
    
    private async handler (request_event: Deno.RequestEvent) {
        // FormData is too complicated, so we decode it here and put it into PostScope
        let post_data: { key: string, value: string }[] = [];


        let content_type = request_event.request.headers.get("content-type");
        if (content_type !== null) {
            content_type = content_type.split(";")[0];
            
            if (request_event.request.body !== null) {
                if (content_type === "application/x-www-form-urlencoded") {
                    const reader = request_event.request.body.getReader();
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
        const request = new FrontworkRequest(request_event.request.method, request_event.request.url, request_event.request.headers, POST);

        try {
            const context = { request: request, i18n: this.i18n, platform: this.platform, stage: this.stage };
            const resolved_component = this.routes_resolver(context);
            
            if(resolved_component !== null) {
                const resolved_response = resolved_component;
                if(resolved_response.response !== null) {
                    request_event.respondWith(resolved_response.response.into_response());
                    return;
                }
            }
    
            // IF route not found, check assets resolver
            const resolved_asset = this.assets_resolver(request);
            if(resolved_asset !== null) {
                this.log(request, "[ASSET]");
                request_event.respondWith(resolved_asset);
                return;    
            }
    
            this.log(request, "[NOT FOUND]");
            const not_found_response = <FrontworkResponse> this.middleware.not_found_handler.build(context, this);
            request_event.respondWith(not_found_response.into_response());
        } catch (error) {
            console.error(error);
            request_event.respondWith(this.middleware.error_handler(request, error).into_response());
        }
    }
}

