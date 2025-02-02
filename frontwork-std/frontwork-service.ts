import {} from "./dom.ts";
import {
    Frontwork,
    FrontworkRequest,
    PostScope,
    FrontworkInit,
    EnvironmentStage,
    LogType,
    FW,
    FrontworkResponseRedirect,
    FrontworkContext,
} from "./frontwork.ts";


export class Asset {
    absolute_path: string;
    relative_path: string;
    content_type: string;
    etag: string;

    constructor(absolute_path: string, relative_file_path: string, content_type: string|null) {
        this.absolute_path = absolute_path;
        this.relative_path = relative_file_path;
        this.content_type = content_type === null? this.guess_content_type() : content_type;
        this.etag = this.create_etag(absolute_path);
    }

    private guess_content_type() {
        const file_dot_split = this.relative_path.split(".");
        const file_extention = file_dot_split[file_dot_split.length - 1];
        switch (file_extention) {
            case "js": return "text/javascript; charset=utf-8";
            case "css": return "text/css; charset=utf-8";
            case "txt": return "text/txt; charset=utf-8";
            case "csv": return "text/csv; charset=utf-8";

            case "xml": return "application/xml";
            case "json": return "application/json";

            case "webp": return "image/webp";
            case "ico": return "image/x-icon";
            case "png": return "image/png";
            case "jpg": return "image/jpeg";
            case "jpeg": return "image/jpeg";
            case "gif": return "image/gif";

            case "otf": return "font/otf";
            case "ttf": return "font/ttf";
            case "woff": return "font/woff";
            case "woff2": return "font/woff2";
            case "eot": return "application/vnd.ms-fontobject";

            case "weba": return "audio/webm";
            case "opus": return "audio/x-opus";
            case "flac": return "audio/x-flac";
            case "m4a": return "audio/x-m4a";
            case "wav": return "audio/x-wav";
            case "mp3": return "audio/mp3";
            case "aac": return "audio/aac";

            case "webm": return "video/webm";
            case "mp4": return "video/mp4";
            case "m4v": return "video/x-m4v";
            case "mkv": return "video/x-matroska";
            case "mk3d": return "video/x-matroska";
            case "mks": return "video/x-matroska";
            case "avi": return "video/x-msvideo";
        }

        FW.reporter(
            LogType.Warn,
            "ASSET",
            "Unknown mime type for file extention '" +
                file_extention +
                "'. Please use only compatible and efficient file types for the web.",
            null,
            null,
        );
        return "unknown";
    }

    private create_etag(absolute_path: string) {
        const fileInfo = Deno.statSync(absolute_path);
        return `W/"${fileInfo.size}-${fileInfo.mtime?.getTime() || ''}"`;
    }

    create_file_response(request: FrontworkRequest, cache_max_age: number) {
        // Caching implementation:
        const headers: HeadersInit = {
            "content-type": this.content_type,
            "Cache-Control": "public, max-age="+cache_max_age.toString()+", must-revalidate",
            "ETag": this.etag,
        };
        const cache_header = request.headers.get("if-none-match");
        if (this.etag === cache_header) {
            return new Response(null, {
                status: 304,
                headers: headers,
            });
        }

        const file = Deno.readFileSync(this.absolute_path);
        return new Response(file, {
            status: 200,
            headers: headers,
        });
    }
}

//TODO: Consider: FrontworkSubservice
export interface FrontworkSubservice { (_req: Request, _req_extras: Deno.ServeHandlerInfo<Deno.NetAddr>): Response|null };

const abort_controller = new AbortController();

export class FrontworkWebservice extends Frontwork {
    private style_css!: Asset;
    private main_js!: Asset;
    private cache_max_age = 0;
    private api_path_prefixes = ["/api/"];

    private assets_folder_path = "";
    private assets: Asset[] = [];

    constructor(init: FrontworkInit) {
        super(init);
    }

    start() {
        console.info(
            "Deno started webservice on http://localhost:" + this.port,
        );

        try {
            if (this.stage === EnvironmentStage.Development) {
                const service_started_timestamp = new Date()
                    .getTime()
                    .toString();

                Deno.serve(
                    { port: this.port, signal: abort_controller.signal },
                    (_req: Request, _req_extras) => {
                        return this.handler_dev(_req, _req_extras, service_started_timestamp);
                    },
                );
            } else {
                Deno.serve(
                    { port: this.port, signal: abort_controller.signal },
                    (_req: Request, _req_extras) => {
                        return this.handler(_req, _req_extras);
                    },
                );
            }
        } catch (error) {
            console.error(error);
            console.error("");
            console.error("");
            console.error(
                "An error accoured while trying to start the Deno Webservice.",
            );

            // CAP_NET_BIND_SERVICE error message
            if (this.port < 1024) {
                console.error(
                    "Please note: Ports lower than 1024 can be only opened by root.",
                );
            }
            console.error("");
        }

        globalThis.addEventListener("unload", () => abort_controller.abort());
    }

    setup_assets_resolver(assets_folder_path: string) {
        // add last slash if not exists
        if (assets_folder_path.slice(-1) !== "/") assets_folder_path += "/";
        this.assets_folder_path = assets_folder_path;

        const scan_directory = (dir_path: string, relative_path: string) => {
            for (const dirEntry of Deno.readDirSync(dir_path)) {
                if (dirEntry.isFile) {
                    this.assets.push(
                        new Asset(
                            dir_path + dirEntry.name,
                            relative_path + dirEntry.name,
                            null
                        ),
                    );
                } else if (dirEntry.isDirectory) {
                    scan_directory(
                        dir_path + dirEntry.name + "/",
                        relative_path + dirEntry.name + "/",
                    );
                }
            }
        };

        scan_directory(this.assets_folder_path, "/");
        return this;
    }

    setup_style_css(style_css_absolute_path: string) {
        this.style_css = new Asset(style_css_absolute_path, "/css/style.css", "text/css; charset=utf-8");
        return this;
    }
    
    setup_main_js(main_js_absolute_path: string) {
        this.main_js = new Asset(main_js_absolute_path, "/js/main.js", "text/javascript; charset=utf-8");
        return this;
    }
    
    set_cache_max_age(cache_max_age: number) {
        this.cache_max_age = cache_max_age;
        return this;
    }
    
    set_api_path_prefixes(api_path_prefixes: string[]) {
        this.api_path_prefixes = api_path_prefixes;
        return this;
    }

    private async assets_resolver(request: FrontworkRequest): Promise<Response | null> {
        if (request.path === this.style_css.relative_path) {
            try {
                return this.style_css.create_file_response(request, this.cache_max_age);
                // deno-lint-ignore no-explicit-any
            } catch (error: any) {
                FW.reporter(
                    LogType.Error,
                    "ASSET",
                    "ERROR can not load style.css from '"
                        + this.style_css.absolute_path + "'\n",
                    null,
                    error,
                );
                return null;
            }
        } else if (request.path === this.main_js.relative_path) {
            try {
                return this.main_js.create_file_response(request, this.cache_max_age);
                // deno-lint-ignore no-explicit-any
            } catch (error: any) {
                FW.reporter(
                    LogType.Error,
                    "ASSET",
                    "ERROR can not load main.js from '"
                        + this.main_js.absolute_path + "'\n",
                    null,
                    error,
                );
                return null;
            }
        }

        for (const asset of this.assets) {
            if (asset.relative_path === request.path) {
                try {
                    return asset.create_file_response(request, this.cache_max_age);
                    // deno-lint-ignore no-explicit-any
                } catch (error: any) {
                    FW.reporter(
                        LogType.Error,
                        "ASSET",
                        "ERROR can not load asset from '" +
                            asset.absolute_path +
                            "'\n",
                        null,
                        error,
                    );
                    return null;
                }
            }
        }

        return null;
    }

    private async handler(_req: Request, _req_extras: Deno.ServeHandlerInfo<Deno.NetAddr>): Promise<Response> {
        const POST = await new PostScope({}).from_request(_req);
        const request = new FrontworkRequest(
            _req.method,
            _req.url,
            _req.headers,
            POST,
        );

        try {
            // Assets resolver
            const resolved_asset = await this.assets_resolver(request);
            if (resolved_asset !== null) {
                if (FW.verbose_logging) request.log("ASSET", null);
                return resolved_asset;
            }

            // Middleware: redirect lonely slash
            if (
                this.middleware.redirect_lonely_slash &&
                request.path_dirs.length > 2 &&
                request.path_dirs[request.path_dirs.length - 1] === ""
            ) {
                let new_path = "";
                for (let i = 0; i < request.path_dirs.length - 1; i++) {
                    if (request.path_dirs[i] !== "") {
                        new_path += "/" + request.path_dirs[i];
                    }
                }

                if (FW.verbose_logging)
                    request.log("LONELY_SLASH_REDIRECT", null);
                return new FrontworkResponseRedirect(new_path, 301).into_response();
            }

            const client_ip = _req.headers.get("x-forwarded-for") || _req.headers.get("x-real-ip") || _req_extras.remoteAddr.hostname;

            const context = new FrontworkContext(
                this.platform,
                this.stage,
                client_ip,
                this.api_protocol_address,
                this.api_protocol_address_ssr,
                this.i18n,
                request,
                true,
            );
            const route = await this.route_resolver(context);

            // Middleware: before Route
            try {

                await this.middleware.before_route.build(context);
                // deno-lint-ignore no-explicit-any
            } catch (error: any) {
                context.request.error("before_route", context, error);
            }

            // Route or Not found
            const reb_result = await this.route_execute_build(context, route);
            const reb_response = reb_result.response.into_response();

            // set-cookie headers from the API
            for (let i = 0; i < context.set_cookies.length; i++) {
                reb_response.headers.append('set-cookie',
                    context.set_cookies[i]
                        .replace(" Secure;", "")
                );
            }

            return reb_response;
        } catch (error) {
            console.error("ERROR in middleware.error_handler", error);
        }

        return new Response("ERROR in error_handler", { status: 500 });
    }

    private async handler_dev(
        _req: Request,
        _req_extras: Deno.ServeHandlerInfo<Deno.NetAddr>,
        service_started_timestamp: string,
    ): Promise<Response> {
        const url = new URL(_req.url);

        if (url.pathname === "//ws") {
            let response, socket: WebSocket;
            try {
                await ({ response, socket } = Deno.upgradeWebSocket(_req));
            } catch {
                return new Response(
                    "request isn't trying to upgrade to websocket.",
                );
            }

            // sent client service_started_timestamp
            socket.onmessage = () => {
                socket.send(service_started_timestamp);
            };
            return response;
        } else if (url.pathname === "//dr") {
            const POST = await new PostScope({}).from_request(_req);
            const report_text = POST.get("report_text");
            if (report_text === null)
                return new Response("POST.report_text is null");

            console.log("[LOG_FROM_CLIENT]", report_text);
            return new Response("Browser FW.reporter => Dev Server reported");
        }

        for (let i = 0; i < this.api_path_prefixes.length; i++) {
            const api_path_prefix = this.api_path_prefixes[i];
            if (url.pathname.substring(0, api_path_prefix.length) === api_path_prefix) {
                // forward_request_to_api
                console.log("[forward_request_to_api]", _req.method, url.pathname);
    
                return await this.forward_request_to_api(_req, _req_extras);
            }
        }

        return this.handler(_req, _req_extras);
    }

    private async forward_request_to_api(
        _req: Request,
        _req_extras: Deno.ServeHandlerInfo<Deno.NetAddr>
      ): Promise<Response> {
        try {
            const client_ip = _req.headers.get("x-forwarded-for") || _req.headers.get("x-real-ip") || _req_extras.remoteAddr.hostname;
            const url = new URL(_req.url);

            // Construct new URL for the backend
            const apiUrl = new URL(url.pathname, this.api_protocol_address_ssr);
            url.searchParams.forEach((value, key) => {
                apiUrl.searchParams.append(key, value);
            });

            // Forward original headers and add some extra information
            const headers = new Headers(_req.headers);
            headers.append('X-Forwarded-For', client_ip);
            headers.append('X-Forwarded-Host', url.host);
            headers.append('X-Original-URL', url.toString());

            // Prepare request options
            const requestOptions: RequestInit = {
                method: _req.method,
                headers: headers,
                body: _req.body,
            };

            // Make the request to backend
            const response = await fetch(apiUrl.toString(), requestOptions);

            return response;
        } catch (error) {
            console.error('Error forwarding request:', error);
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

}
