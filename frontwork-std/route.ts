import { parse_url, keyValueArrayFromList } from "./utils.ts";

class Scope {
    items: { key: string, value: string }[];
    constructor(items: { key: string, value: string }[]) {
        this.items = items;
    }

    get(key: string): string|null {
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            if(item.key === key) {
                return item.value;
            }
        }
        return null;
    }
}

export class GetScope extends Scope { constructor(items: { key: string, value: string }[]) { super(items); } }
export class PostScope extends Scope { constructor(items: { key: string, value: string }[]) { super(items); } }
export class CookiesScope extends Scope { constructor(items: { key: string, value: string }[]) { super(items); } }



export class FrontworkRequest {
    public headers: Headers;
    public method: string;
    public url: string;
    public protocol: string;
    public hostname: string;
    public path: string;
    public fragment: string;
    public readonly GET: GetScope;
    public readonly POST: PostScope;
    public readonly COOKIES: CookiesScope;

    constructor(method: string, url: string, headers: Headers, post: PostScope) {
        const parsed_url = parse_url(url);

        this.headers = headers;
        this.method = method;
        this.url = url;
        this.protocol = parsed_url.protocol;
        this.hostname = parsed_url.hostname;
        this.path = parsed_url.path;
        this.fragment = parsed_url.fragment;

        this.GET = new CookiesScope(
            keyValueArrayFromList(parsed_url.query_string, "&", "=")
        );

        this.POST = post;

        const cookies_string = this.headers.get("cookie");
        this.COOKIES = new CookiesScope(
            cookies_string === null ? [] : keyValueArrayFromList(cookies_string, "; ", "=")
        );
    }
}


let previous_route_id = 0;
export class Route {
    public id: number;
    public path: string;
    public handler: (request: FrontworkRequest) => Response;

    constructor(path: string, handler: (request: FrontworkRequest) => Response) {
        this.path = path;
        this.handler = handler;

        previous_route_id += 1;
        this.id = previous_route_id;
    }
}