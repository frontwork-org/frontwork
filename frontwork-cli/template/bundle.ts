import * as esbuild from "https://deno.land/x/esbuild@v0.25.2/mod.js";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";
import { APP_CONFIG } from './src/environments/environment.ts';
import { EnvironmentStage } from './src/dependencies.ts';

const distdir = Deno.args[0] || "dist/development-web";
const distdir_js = distdir + "/js/";
const is_development = APP_CONFIG.stage === EnvironmentStage.Development;

await esbuild.build({
	plugins: [...denoPlugins()],
	entryPoints: ["src/main.client.ts"],
	outdir: distdir_js,
	bundle: true,
	splitting: true,
	platform: "browser",
	format: "esm",
	target: "esnext",
	minify: !is_development,
	sourcemap: is_development,
	treeShaking: true,
});
await esbuild.stop();
