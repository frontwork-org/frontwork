import { EnvironmentPlatform, EnvironmentStage, FrontworkInit } from "../dependencies.ts";
import { i18n } from "../i18n.ts";
import { domain_routes, middleware } from "../components/routes.ts";

export const APP_CONFIG: FrontworkInit = {
	platform: EnvironmentPlatform.WEB, 
	stage: EnvironmentStage.PRODUCTION,
	port: 80,
	domain_routes: domain_routes,
	middleware: middleware,
	i18n: i18n,
	build_on_page_load: false
};
