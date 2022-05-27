import { Route, FrontworkRequest, PostScope } from "./route.ts";
import { routes, Middleware } from "./frontwork.ts";
import { keyValueArrayFromList } from "./utils.ts";

export const Webservice = {
    start: async function(port: number, routes: Route[]) {
        //TODO: config for tls
        console.log("Deno started webservice on http://localhost:" + port);
        const server = Deno.listen({ port: port });
        
        for await (const conn of server) {
            const httpConn = Deno.serveHttp(conn);
            for await (const requestEvent of httpConn) {
                this.handler(requestEvent, routes);
            }
        }
    },
    
    handler: async function (requestEvent: Deno.RequestEvent, routes: Route[]) {
		// FormData is too complicated, so we decode it here and put it into PostScope
        let postData: { key: string, value: string }[] = [];


        let content_type = requestEvent.request.headers.get("content-type");
        if (content_type !== null) {
            content_type = content_type.split(";")[0];
            
            if (requestEvent.request.body !== null) {
                if (content_type === "application/x-www-form-urlencoded") {
                    const reader = requestEvent.request.body.getReader();
                    if (reader !== null) {
                        await reader.read().then((body) => {
                            if (body.value !== null) {
                                const body_string = new TextDecoder().decode(body.value);
                                postData = keyValueArrayFromList(body_string, "&", "=");
                            }
                        });
                    }
                } else if(content_type === "multipart/form-data") {
                    // TODO: supporting multipart/form-data
                }
            }
        }
            
		const POST = new PostScope(postData)
        console.log("requestEvent.request.body !== null", requestEvent.request.headers.get("content-type"))
        const request = new FrontworkRequest(requestEvent.request.method, requestEvent.request.url, requestEvent.request.headers, POST);
		



        // middleware (a function that takes a request and returns a response)
        const any_handler_result = Middleware.before_routes(request);
        if(any_handler_result !== null) return any_handler_result;

        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            if (route.path === request.path) {
				try {
					await requestEvent.respondWith(
						route.handler(request)
					);
				} catch (error) {
					console.error(error);
					await requestEvent.respondWith(
						Middleware.error_handler(request)
					);
				}
				
                return;
            }
        }

        await requestEvent.respondWith(
            Middleware.not_found_handler(request)
        );
    }
}


Webservice.start(8080, routes);
