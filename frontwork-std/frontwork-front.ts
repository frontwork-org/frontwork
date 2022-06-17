// deno-lint-ignore-file

import { Frontwork, FrontworkMiddleware, Route } from "./frontwork.ts";


class FrontworkFront extends Frontwork {
    constructor(routes: Route[], frontwork_middleware: FrontworkMiddleware) {
        super(routes, frontwork_middleware);
    }
}

// TODO: add handler for page switching
//          - implement function for window.location

function on_page_change() {
    
}