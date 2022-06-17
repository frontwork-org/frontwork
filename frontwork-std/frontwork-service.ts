import { Frontwork, FrontworkRequest, FrontworkMiddleware, Route, PostScope } from "./frontwork.ts";
import { key_value_list_to_array } from "./utils.ts";

export class FrontworkWebservice extends Frontwork {
    service: Deno.Listener;

    constructor (routes: Route[], frontwork_middleware: FrontworkMiddleware, port: number) {
        super(routes, frontwork_middleware);
        console.log("Deno started webservice on http://localhost:" + port);
        this.service = Deno.listen({ port: port });
    }

    async start() {
        for await (const connection of this.service) {
            const httpConnection = Deno.serveHttp(connection);
            for await (const requestEvent of httpConnection) {
                this.handler(requestEvent);
            }
        }
    }
    
    async handler (request_event: Deno.RequestEvent) {
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

        await request_event.respondWith(
            (await this.routes_resolver(request)).into_response()
        );
    }
}

