import { } from "./dom.ts";
import { Frontwork, FrontworkRequest, PostScope, FrontworkResponse, FrontworkInit, EnvironmentStage, LogType, DEBUG, FW, HTMLElementWrapper, FrontworkResponseRedirect } from "./frontwork.ts";
import { key_value_list_to_array } from "./utils.ts";


class Asset {
    absolute_path: string;
    relative_path: string;
    content_type: string;

    constructor(absolute_path: string, relative_file_path: string) {
        this.absolute_path = absolute_path;
        this.relative_path = relative_file_path;

        const file_dot_split = relative_file_path.split(".");
        const file_extention = file_dot_split[file_dot_split.length -1];
        switch (file_extention) {
            case "js": this.content_type = "text/javascript; charset=utf-8"; break;
            case "css": this.content_type = "text/css; charset=utf-8"; break;
            case "txt": this.content_type = "text/txt; charset=utf-8"; break;
            case "csv": this.content_type = "text/csv; charset=utf-8"; break;

            case "xml": this.content_type = "application/xml"; break;
            case "json": this.content_type = "application/json"; break;

            case "webp": this.content_type = "image/webp"; break;
            case "ico": this.content_type = "image/x-icon"; break;
            case "png": this.content_type = "image/png"; break;
            case "jpg": this.content_type = "image/jpeg"; break;
            case "jpeg": this.content_type = "image/jpeg"; break;
            case "gif": this.content_type = "image/gif"; break;

            case "otf": this.content_type = "font/otf"; break;
            case "ttf": this.content_type = "font/ttf"; break;
            case "woff": this.content_type = "font/woff"; break;
            case "woff2": this.content_type = "font/woff2"; break;
            case "eot": this.content_type = "application/vnd.ms-fontobject"; break;

            case "weba": this.content_type = "audio/webm"; break;
            case "opus": this.content_type = "audio/x-opus"; break;
            case "flac": this.content_type = "audio/x-flac"; break;
            case "m4a": this.content_type = "audio/x-m4a"; break;
            case "wav": this.content_type = "audio/x-wav"; break;
            case "mp3": this.content_type = "audio/mp3"; break;
            case "aac": this.content_type = "audio/aac"; break;
            
            case "webm": this.content_type = "video/webm"; break;
            case "mp4": this.content_type = "video/mp4"; break;
            case "m4v": this.content_type = "video/x-m4v"; break;
            case "mkv": this.content_type = "video/x-matroska"; break;
            case "mk3d": this.content_type = "video/x-matroska"; break;
            case "mks": this.content_type = "video/x-matroska"; break;
            case "avi": this.content_type = "video/x-msvideo"; break;

            
            default: 
                this.content_type = "unknown";
                DEBUG.reporter(LogType.Warn, "ASSET", "Unknown mime type for file extention '"+file_extention+"'. Please use only compatible and efficient file types for the web.", null) 
                break;
        }

    }
}


export class FrontworkWebservice extends Frontwork {
    private style_css_absolute_path = "";
    private main_js_absolute_path = "";

    private assets_folder_path = "";
    private assets: Asset[] = [];

    constructor (init: FrontworkInit) {
        super(init);
    }
    
    start() {
        console.info("Deno started webservice on http://localhost:" + this.port);
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
        // add last slash if not exists
        if (assets_folder_path.slice(-1) !== '/') assets_folder_path += "/"
        this.assets_folder_path = assets_folder_path;

        for (const dirEntry of Deno.readDirSync(assets_folder_path)) {
            if (dirEntry.isFile) {
                this.assets.push(new Asset(
                    this.assets_folder_path + dirEntry.name, 
                    '/' + dirEntry.name
                ));
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
                const response = new Response(file);
                response.headers.append("content-type", "text/css; charset=utf-8")
                return response;
            } catch (error) {
                DEBUG.reporter(LogType.Error, "ASSET", "ERROR can not load style.css from '" + this.style_css_absolute_path + "'\n", error);
                return null;
            }
        } else if(request.path === "/assets/main.js") {
            try {
                const file = Deno.readFileSync(this.main_js_absolute_path);
                const response = new Response(file);
                response.headers.append("content-type", "text/javascript; charset=utf-8")
                return response;
            } catch (error) {
                DEBUG.reporter(LogType.Error, "ASSET", "ERROR can not load main.js from '" + this.main_js_absolute_path + "'\n", error);
                return null;
            }
        }

        for (const asset of this.assets) {
            if (asset.relative_path === request.path) {
                try {
                    const file = Deno.readFileSync(asset.absolute_path);
                    const response = new Response(file);
                    response.headers.append("content-type", asset.content_type)
                    return response;
                } catch (error) {
                    DEBUG.reporter(LogType.Error, "ASSET", "ERROR can not load asset from '" + asset.absolute_path + "'\n", error);
                    return null;
                }
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
                if(DEBUG.verbose_logging) request.log("ASSET");
                return resolved_asset;
            }

            
            // Middleware: redirect lonely slash
            if (this.middleware.redirect_lonely_slash && request.path_dirs.length > 2 && request.path_dirs[request.path_dirs.length -1] === "") {
                let new_path = "";
                for (let i = 0; i < request.path_dirs.length - 1; i++) {
                    if (request.path_dirs[i] !== "") {
                        new_path += "/" + request.path_dirs[i];
                    }
                }
                
                if(DEBUG.verbose_logging) request.log("LONELY_SLASH_REDIRECT");
                return new FrontworkResponseRedirect(new_path).into_response();
            }

            const context = { request: request, i18n: this.i18n, platform: this.platform, stage: this.stage };
            const route = this.route_resolver(context);
            
            // Before Route

            // Route or Not found
            return this.route_execute_build(context, route).reponse.into_response();
        } catch (error) {
            console.error("ERROR in middleware.error_handler", error);
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

