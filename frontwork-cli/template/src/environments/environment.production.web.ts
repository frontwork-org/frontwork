import { EnvironmentPlatform, EnvironmentStage, FrontworkInit } from "../dependencies.ts";
import { i18n } from "../i18n.ts";
import { domain_to_route_selector, middleware } from "../components/routes.ts";

export const APP_CONFIG: FrontworkInit = {
	platform: EnvironmentPlatform.Web, 
	stage: EnvironmentStage.Production,
	port: 80,
	domain_to_route_selector: domain_to_route_selector,
	middleware: middleware,
	i18n: i18n,
	build_on_page_load: false
};
