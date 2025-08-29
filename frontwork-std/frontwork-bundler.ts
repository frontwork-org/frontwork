import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@0.11.1";
import * as esbuild from "npm:esbuild@0.20.2";
import { EnvironmentStage, FrontworkInit } from './frontwork.ts';



export async function frontwork_bundler(init: FrontworkInit, entryPoints: string[], distdir_js: string) {
    const is_dev = init.stage === EnvironmentStage.Development;

    // Delete in outdir all files that end with ".js" or  ".js.map"
    for await (const entry of Deno.readDir(distdir_js)) {
        if (entry.isFile && (entry.name.endsWith(".js") || entry.name.endsWith(".js.map"))) {
            await Deno.remove(`${distdir_js}/${entry.name}`);
        }
    }

    await esbuild.build({
        plugins: [...denoPlugins()],
        entryPoints: entryPoints,
        outdir: distdir_js,
        bundle: true,
        platform: "browser",
        splitting: init.module_splitting,
        format: init.module_splitting? "esm" : "iife",
        target: "esnext",
        minify: !is_dev,
        sourcemap: is_dev,
        treeShaking: true,
    });
    await esbuild.stop();
}