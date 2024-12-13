import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9";


esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ["frontwork-std/test/test.client.ts"],
  outfile: "frontwork-std/test/dist/main.js",
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "esnext",
  minify: true,
  sourcemap: false,
  treeShaking: true,
});
await esbuild.stop();
