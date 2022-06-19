import { Frontwork, FrontworkRequest, FrontworkMiddleware, Route, PostScope } from "./frontwork.ts";
import { key_value_list_to_array } from "./utils.ts";

export class FrontworkWebservice extends Frontwork {
    private service: Deno.Listener;
    private assets_folder_path = "";
    private assets_relative_path_files: string[] = [];

    constructor (routes: Route[], frontwork_middleware: FrontworkMiddleware, port: number) {
        super(routes, frontwork_middleware);
        console.log("Deno started webservice on http://localhost:" + port);
        this.service = Deno.listen({ port: port });
    }

    setup_assets_resolver (assets_folder_path: string) {
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

    async start() {
        for await (const connection of this.service) {
            const httpConnection = Deno.serveHttp(connection);
            for await (const requestEvent of httpConnection) {
                this.handler(requestEvent);
            }
        }
    }

    private assets_resolver (request: FrontworkRequest): Response|null {
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

        const resolved_route = (await this.routes_resolver(request));
        if(resolved_route.status_code === 404) {
            // IF route not found, check assets resolver
            const resolved_asset = this.assets_resolver(request);
            if(resolved_asset !== null) {
                this.log(request, "[ASSET]");
                await request_event.respondWith(resolved_asset);
                return;    
            }

            this.log(request, "[NOT FOUND]");
        }

        await request_event.respondWith(resolved_route.into_response());
    }
}

