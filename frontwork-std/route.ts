export class Request {
    public protocol: string;
    public hostname: string;
    public headers: Headers;
    public method: string;
    public path: string;
    public query_string: string;

    //TODO: add URL scope like Headers
    //TODO: add FORM scope like Headers
    //TODO: add COOKIES scope like Headers

    constructor(protocol: string, host: string, headers: Headers, method: string, path: string, query_string: string) {
        this.protocol = protocol;
        this.hostname = host;
        this.headers = headers;
        this.method = method;
        this.path = path;
        this.query_string = query_string;
    }
}

// TODO: allow custom errorHandler, middleware, and 404 handler
export const Middleware =  {
    errorHandler: function(): Response {
        return new Response("ERROR", {
            status: 500,
        });
    },

    anyHandler: function(): Response|null {
        return null;
    },

    notFoundHandler: function(): Response {
        return new Response("ERROR 404 - Page not found", {
            status: 404,
        });
    },
}

let previous_route_id = 0;
export class Route {
    public id: number;
    public path: string;
    public handler: (req: Request) => Response;

    constructor(path: string, handler: (req: Request) => Response) {
        this.path = path;
        this.handler = (req) => {
            try {
                return handler(req);
            } catch (error) {
                console.error(error);
                return Middleware.errorHandler();
            }
        };

        previous_route_id += 1;
        this.id = previous_route_id;
    }
}