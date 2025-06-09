// https://jsr.io/@b-fuze/deno-dom/versions
// import { Document } from "https://deno.land/x/deno_dom@v0.1.34-alpha/deno-dom-wasm.ts";
import { Document } from "jsr:@b-fuze/deno-dom@0.1.49";
import { FW } from './frontwork.ts';

// Deno Server Side Rendering
// @ts-ignore: hack so that we can use the same codebase on both client and server
globalThis.document = new Document();
FW.is_client_side = false;