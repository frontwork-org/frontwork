//import { Document } from "https://deno.land/x/deno_dom@v0.1.31-alpha/deno-dom-wasm.ts";
import { Document } from "https://deno.land/x/deno_dom@v0.1.34-alpha/deno-dom-wasm.ts";

// Deno Server Side Rendering
// @ts-ignore: hack so that we can use the same codebase on both client and server
globalThis.document = new Document();