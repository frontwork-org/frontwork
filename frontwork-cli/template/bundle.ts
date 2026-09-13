import { APP_CONFIG } from './src/environments/environment.ts';
import { frontwork_bundler } from "jsr:@frontwork-org/frontwork@^0.4.12/bundler";

const distdir = Deno.args[0] || "dist/development-web";
const distdir_js = distdir + "/js/";

await frontwork_bundler(APP_CONFIG, ["src/main.client.ts"], distdir_js);
