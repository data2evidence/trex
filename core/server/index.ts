import { Hono } from "npm:hono";
import { logger as hlogger } from "npm:hono/logger";
import {env, logger} from "./env.ts"
import {addPortalRoute} from "./routes/portal.ts"
import {Plugins} from "./plugin/plugin.ts"
import { addPluginRoutes} from "./routes/plugin.ts"
import { addBaseRoutes } from "./routes/base.ts";

logger.log('🦖 TREX initializing 🦖');

const app = new Hono();
app.use(hlogger())

addBaseRoutes(app);
addPortalRoute(app);

logger.log("Add plugins");
await Plugins.initPluginsEnv(app);
if(env.NODE_ENV === 'development') {
	await Plugins.initPluginsDev(app);
}

addPluginRoutes(app);

logger.log("Added plugins");
logger.log('🦖 TREX started 🦖');
Deno.serve(app.fetch);
