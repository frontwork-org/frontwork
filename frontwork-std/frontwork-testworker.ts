import { } from "./dom.ts";
import { Frontwork, FrontworkInit, FrontworkRequest, PostScope } from "./frontwork.ts";
import { green, red } from "https://deno.land/std@0.149.0/fmt/colors.ts";

// TODO: automated tests for the frontwork framework. Iterate over all routes and test them.
export class FrontworkTestworker extends Frontwork {
    test_count = 0;
    fail_count = 0;
    time_start = new Date().getTime();

    constructor(init: FrontworkInit) {
        super(init);
        console.log("Test worker started\n");
    }

    // deno-lint-ignore no-explicit-any
    assert_equals(actual: any, expected: any) {
        this.test_count++;
        
        if (actual === expected) {
            console.error("Test "+this.test_count+": passed");
        } else {
            this.fail_count++;
            console.error("Test "+this.test_count+": expected " + expected + " but got " + actual);
        }
        return this;
    }

    // deno-lint-ignore no-explicit-any
    assert_not_equals(actual: any, expected: any) {
        this.test_count++;
        
        if (actual === expected) {
            this.fail_count++;
            console.error("Test "+this.test_count+": expected " + expected + " but got " + actual);
        } else {
            console.error("Test "+this.test_count+": passed");
        }
        return this;
    }

    // deno-lint-ignore ban-types
    assert_function(fn: Function) {
        this.test_count++;
        
        try {
            fn();
            console.error("Test "+this.test_count+": passed");
        } catch (error) {
            this.fail_count++;
            console.error("Test "+this.test_count+": failed.", error);
        }

        return this;
    }

    test_routes() {
        this.assert_not_equals(this.domain_routes.length, 0);
        for (let d = 0; d < this.domain_routes.length; d++) {
            const domain_route = this.domain_routes[d];
            for (let r = 0; r < domain_route.routes.length; r++) {
                const route = domain_route.routes[r];
                const url = "http://172.0.0.1:"+this.port+route.path;
                const request = new FrontworkRequest("GET", url, new Headers(), new PostScope([]));
                const context = { request: request, i18n: this.i18n, platform: this.platform, stage: this.stage };

                this.assert_function(() => {
                    route.component.build(context, this);
                    // TODO: route.component.dom_ready(context, this);
                });
            }
        }
        return this;
    }

    print_summary() {
        let status_text, status_color;
        if (this.fail_count === 0) {
            status_text = green("ok");
            status_color = "color: green";
        } else {
            status_text = red("failed");
            status_color = "color: red";
        }

        const time_finished = new Date().getTime();
        const time_taken = (time_finished - this.time_start) / 1000;
        console.log("\n"+"test result:", status_text, this.fail_count + " failures / " + this.test_count + " tests; finished in "+time_taken.toFixed(2)+"s"+"\n");
        return this;
    }

    exit() {
        Deno.exit(this.fail_count);
    }
}