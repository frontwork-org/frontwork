import * as esbuild from "https://deno.land/x/esbuild@v0.20.1/mod.js";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.9";


esbuild.build({
  plugins: [...denoPlugins()],
  entryPoints: ["test/test.client.ts"],
  outdir: "test/dist/js/",
  bundle: true,
  splitting: true,
  platform: "browser",
  format: "esm",
  target: "esnext",
  minify: false,
  sourcemap: true,
  treeShaking: true,
});
await esbuild.stop();
