import { } from "./dom.ts";
import { Frontwork, FrontworkInit, FrontworkRequest, LogType, PostScope, FW, FrontworkContext } from "./frontwork.ts";
import { green, red, yellow } from "https://deno.land/std@0.224.0/fmt/colors.ts";


export class FrontworkTestworker extends Frontwork {
    test_count = 0;
    fail_count = 0;
    warn_count = 0;
    time_start = new Date().getTime();

    constructor(init: FrontworkInit) {
        super(init);
        console.info("Test worker started\n");
        FW.verbose_logging = true;
        FW.reporter = (log_type: LogType, category: string, text: string, context: FrontworkContext|null, error: Error|null) => {
            if (log_type === LogType.Error) {
                this.fail_count++;
                if(error === null) console.error(text);
                else console.error(text, error);
            } else if (log_type === LogType.Warn) {
                this.warn_count++;
                console.warn(text); 
            }
        };
    }

    // deno-lint-ignore no-explicit-any
    assert_equals(actual: any, expected: any) {
        this.test_count++;
        
        if (actual === expected) {
            console.info("Test "+this.test_count+": passed");
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
            console.error("Test "+this.test_count+": expected not" + expected + " but got " + actual);
        } else {
            console.info("Test "+this.test_count+": passed");
        }
        return this;
    }

    // deno-lint-ignore ban-types
    assert_function(fn: Function) {
        this.test_count++;
        
        try {
            fn();
            console.info("Test "+this.test_count+": passed");
        } catch (error) {
            this.fail_count++;
            console.error("Test "+this.test_count+": failed.", error);
        }

        return this;
    }

    async test_routes(domains: string[]) {
        for (let d = 0; d < domains.length; d++) {
            const domain_url = "http://"+domains[d]+":"+this.port;
            const domain_request = new FrontworkRequest("GET", domain_url, new Headers(), new PostScope({}));
            const domain_context = new FrontworkContext(this.platform, this.stage, this.api_protocol_address, this.i18n, domain_request, true);

            const routes = this.domain_to_route_selector(domain_context);
            

            for (let r = 0; r < routes.length; r++) {
                const route = routes[r];
                if (route.path.indexOf('*') === -1) {
                    // Test only if the path is static

                    const route_url = domain_url+route.path;
                    const route_request = new FrontworkRequest("GET", route_url, new Headers(), new PostScope({}));
                    const route_context = new FrontworkContext(this.platform, this.stage, this.api_protocol_address, this.i18n, route_request, true);

    
                    await this.assert_function(async () => {
                        // Middleware: before Routes
                        await this.middleware.before_route.build(route_context);

                        // Route
                        await new route.component(route_context).build(route_context);
                    });
                }
            }
        }
        return this;
    }

    print_summary() {
        let status_text;
        if (this.fail_count === 0) {
            status_text = green("ok");
        } else {
            status_text = red("failed");
        }

        const time_finished = new Date().getTime();
        const time_taken = (time_finished - this.time_start) / 1000;
        console.info("\n"+"test result:", status_text, this.fail_count + " failures / " + this.test_count + " tests; finished in "+time_taken.toFixed(2)+"s"+"\n");
        if (this.warn_count > 0) {
            console.info("Please note that there are ", yellow(this.warn_count.toString()) + " warnings.\n");
        }
        return this;
    }

    exit() {
        Deno.exit(this.fail_count);
    }
}