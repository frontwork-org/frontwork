import { FrontworkSubservice, FrontworkWebservice } from "../frontwork-service.ts";
import { EnvironmentStage, FrontworkRequest } from '../frontwork.ts';
import { APP_CONFIG } from "./test.routes.ts";


let __dir = new URL('.', import.meta.url).pathname.replace("/C:", "C:");
if(Deno.build.os === "windows" && __dir.charAt(0) === "/") __dir.substring(1, __dir.length);

// Required for binary run.
if (APP_CONFIG.stage !== EnvironmentStage.Development || __dir.includes("/tmp/") || __dir.includes("/temp/")) {
    __dir = Deno.execPath().split("/").slice(0, -1).join("/");
}

// Remove last slash if exist
if (__dir.slice(-1) === "/") __dir = __dir.slice(0, -1);


interface WebsitePublicData {
    w: {
        website_id: number,
        domain: string,
        file_id_favicon: number,
    },
    favicon_url: string
}

let websites_data: WebsitePublicData[] = [];
fetch(APP_CONFIG.api_protocol_address_ssr+"/api/v1/website/list_favicons").then(async (data) => {
    websites_data = await data.json()
});

const favicon_subservice: FrontworkSubservice = async (request, _req, _req_extras) => {
    const domain = request.get_domain();
    for (let d = 0; d < websites_data.length; d++) {
        const wdata = websites_data[d];
        if (wdata.w.domain === domain) {
            return await webservice.create_forward_request(wdata.favicon_url, _req, _req_extras);
        }
    }
    return null;
}

const webservice = new FrontworkWebservice(APP_CONFIG)
    .setup_assets_resolver(__dir + '/assets')
    .setup_style_css(__dir + '/dist/style.css')
    .setup_main_js(__dir + '/dist/main.client.js')
    .set_api_path_prefixes(["/api/", "/files/"])
    .add_subservice(favicon_subservice);
webservice.start();