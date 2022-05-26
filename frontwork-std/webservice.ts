import { Route, Request, Middleware } from "./route.ts";

export const Webservice = {
    start: async function(port: number, routes: Route[]) {
        //TODO: config for tls
        const server = Deno.listen({ port: port });
        
        for await (const conn of server) {
            const httpConn = Deno.serveHttp(conn);
            for await (const requestEvent of httpConn) {
                this.handler(requestEvent);
            }
        }
    },
    
    handler: async function (requestEvent: Deno.RequestEvent) {
        const url = requestEvent.request.url;
        const url_protocol_split = url.split("://");
        const protocol = url_protocol_split[0];

        const url_querystring_split = url_protocol_split[1].split("?");
        const url_host_path_split = url_querystring_split[0].split("/");
        const hostname = url_host_path_split[0].split(":")[0];

        let path;
        if (url_host_path_split.length < 2) {
            path = "/";
        } else {
            path = "";
            for (let i = 1; i < url_host_path_split.length; i++) {
                path += "/" + url_host_path_split[i];
            }
        }

        const query_string = url_querystring_split.length > 1 ? url_querystring_split[1] : "";

        const request = new Request(protocol, hostname, requestEvent.request.headers, requestEvent.request.method, path, query_string);
        console.log("request: ", request);

        // middleware (a function that takes a request and returns a response)
        const any_handler_result = Middleware.anyHandler();
        if(any_handler_result !== null) return any_handler_result;

        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            if (route.path === request.path) {
                await requestEvent.respondWith(
                    route.handler(request)
                );
                return;
            }
        }

        await requestEvent.respondWith(
            Middleware.notFoundHandler()
        );
    }
}



const routes: Route[] = [
    new Route("/", (_req: Request) => {
        return new Response("hello world", {
            status: 200,
        });
    })
];


Webservice.start(8080, routes);