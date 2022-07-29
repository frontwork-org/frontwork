import { Document } from "https://deno.land/x/deno_dom@v0.1.31-alpha/deno-dom-wasm.ts";
"https://deno.land/x/frontwork-std@0.0.1/frontwork.ts";

const doc = new Document();

export class FrontworkDocument {
    createElement = doc.createElement;
}


const IS_DENO_SERVERSIDE = typeof document === "undefined";

if (IS_DENO_SERVERSIDE) {
    // Deno Server Side Rendering
    // @ts-ignore: hack so that we can use the same codebase on both client and server
    globalThis.document = new FrontworkDocument();
}