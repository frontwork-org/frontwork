import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9";

let outfile = Deno.args[0] || "dist/development-web/main.client.js";

esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ["src/main.client.ts"],
  outfile: outfile,
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "esnext",
  minify: true,
  sourcemap: false,
  treeShaking: true,
});
await esbuild.stop();
